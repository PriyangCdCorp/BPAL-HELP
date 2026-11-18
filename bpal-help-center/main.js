const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const { fileURLToPath } = require('node:url');
const fs = require('fs');
const RegistryHelper = require('./registryHelper');
const OkfKnowledgeBase = require('./okfKnowledgeBase');
const llm = require('./llmService');
const { askQuestion, askQuestionStreaming } = require('./chatPipeline');
const { loadCmsHelpContent } = require('./cmsHelpContent');
const { apiConfig, askApi, checkApi } = require('./apiChatClient');
const { readCustomerApiConfig } = require('./customerApiConfig');
const { extractLaunchQuestion } = require('./launchQuestion');
// In a packaged app, .env and okf sit next to the exe in resources/
const RESOURCE_ROOT = app.isPackaged ? process.resourcesPath : __dirname;
require('dotenv').config({ path: path.join(RESOURCE_ROOT, '.env'), quiet: true });

// Every privileged IPC operation must come from this exact local top-level document.
// Protects against other windows, nested frames and navigated renderer pages.
function assertTrustedSender(event) {
  if (!mainWindow || mainWindow.isDestroyed() ||
      event.sender !== mainWindow.webContents ||
      !event.senderFrame ||
      event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error('Unauthorized IPC sender');
  }
  let pagePath;
  try {
    pagePath = fileURLToPath(event.senderFrame.url);
  } catch {
    throw new Error('Unauthorized IPC origin');
  }
  const expected = path.resolve(__dirname, 'index.html');
  if (path.resolve(pagePath).toLowerCase() !== expected.toLowerCase()) {
    throw new Error('Unauthorized IPC document');
  }
}

function registerTrustedIpc(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    assertTrustedSender(event);
    return handler(event, ...args);
  });
}

function validateChatPayload(payload) {
  if (!payload || typeof payload !== 'object' ||
      typeof payload.message !== 'string' ||
      !payload.message.trim() || payload.message.length > 8000) {
    throw new Error('Invalid chat message');
  }
  if (payload.history != null && !Array.isArray(payload.history)) {
    throw new Error('Invalid chat history');
  }
  const history = (payload.history || []).slice(-6).map((item) => {
    if (!item || !['user', 'assistant'].includes(item.role) ||
        typeof item.content !== 'string') {
      throw new Error('Invalid chat history item');
    }
    return { role: item.role, content: item.content.slice(0, 3000) };
  });
  return { message: payload.message.trim(), history };
}

let mainWindow;
let appConfig = null;
let commandLineArgs = null;
let cliData;
let winX = 0;
let winY = 0;
class UserDetails {
  constructor(options = {}) {
    this.userId = options.userId || 'default';
    this.userName = options.userName || 'deafult';
    this.userPhone = options.userPhone || null;
    this.userTelephone = options.userTelephone || null;
    this.userEmail = options.userEmail || null;
    this.userJobTitle = options.userJobTitle || null;
  }
  /**
   * Check if value is empty
   * @private
   */
  _isEmpty(value) {
    return value === null || value === undefined || value === '';
  }

  /**
   * Get details as formatted string (only non-empty fields)
   * @returns {string}
   */
  getDetailsString() {
    const parts = [];

    if (!this._isEmpty(this.userId)) parts.push(`User ID: ${this.userId}`);
    if (!this._isEmpty(this.userName)) parts.push(`User Name: ${this.userName}`);
    if (!this._isEmpty(this.userPhone)) parts.push(`Phone: ${this.userPhone}`);
    if (!this._isEmpty(this.userTelephone)) parts.push(`Telephone: ${this.userTelephone}`);
    if (!this._isEmpty(this.userEmail)) parts.push(`Email: ${this.userEmail}`);
    if (!this._isEmpty(this.userJobTitle)) parts.push(`Job Title: ${this.userJobTitle}`);

    if (parts.length === 0) {
      return 'No user details available';
    }

    return parts.join('\n');
}
}

const user = new UserDetails();

let helpCenterRoot; // registry lookup runs once, not per request
const getHelpCenterRoot = () => (helpCenterRoot ??= RegistryHelper.getHelpCenterFolderPath());

const knowledgeBase = new OkfKnowledgeBase({
  resolveBundleRoot: (db, lang) => {
    // Preferred: <HELPCENTERROOT>\<DB>\Assistant\<EN|FR> so docs can be updated without rebuilding
    const root = getHelpCenterRoot();
    const shared = root && path.join(root, db, 'Assistant', lang.toUpperCase());
    if (shared && fs.existsSync(shared)) return shared;
    // Fallback: the okf folder shipped with the app
    return path.join(RESOURCE_ROOT, 'okf', db, lang.toUpperCase());
  },
});

// Get logs folder from registry
const logsFolder = RegistryHelper.getCDC_LOGS();
const MESSAGES_FILE = logsFolder ? path.join(logsFolder, getDateFileName()) : path.join(__dirname, getDateFileName());

// A launched question must be delivered once, after the renderer's chat is ready.
let rendererAssistantReady = false;
const pendingLaunchQuestions = [];
function deliverQuestion(question) {
    if (!question) return;
    if (mainWindow && !mainWindow.isDestroyed() && rendererAssistantReady) {
        mainWindow.webContents.send('assistant-launch-question', question);
    } else {
        pendingLaunchQuestions.push(question);
    }
}
registerTrustedIpc('assistant-launch-ready', () => {
    rendererAssistantReady = true;
    return pendingLaunchQuestions.splice(0);
});



const startupLaunch = extractLaunchQuestion(process.argv);

const gotTheLock = app.requestSingleInstanceLock({
    launchQuestion: startupLaunch.question || null
});

if (!gotTheLock) {
    app.quit();
} else {
    app.on(
        "second-instance",
        (event, commandLine, workingDirectory, additionalData) => {

            // Prefer the structured question sent by the new process.
            // Fall back to command-line extraction for compatibility.
            const question =
                typeof additionalData?.launchQuestion === "string"
                    ? additionalData.launchQuestion
                    : extractLaunchQuestion(commandLine).question;

            if (mainWindow && !mainWindow.isDestroyed()) {
                if (mainWindow.isMinimized()) {
                    mainWindow.restore();
                }

                mainWindow.show();
                mainWindow.focus();
            }

            if (question && question.trim()) {
                deliverQuestion(question.trim());
            }
        }
    );
}


function getDateFileName(sender, language) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return `/BPAL_ASSISTANT/${today}_${user.userId}_${user.userName}_${language}_BPAL_ASSISTANT_LOG.txt`;
}

function setupChatContextMenu(win) {
    win.webContents.on('context-menu', (event, params) => {
        const isEditable = params.isEditable;
        const hasSelection = Boolean(params.selectionText?.trim());

        const menuItems = [];

        if (isEditable) {
            menuItems.push(
                {
                    label: 'Cut',
                    role: 'cut',
                    enabled: hasSelection
                },
                {
                    label: 'Copy',
                    role: 'copy',
                    enabled: hasSelection
                },
                {
                    label: 'Paste',
                    role: 'paste'
                },
                { type: 'separator' },
                {
                    label: 'Select All',
                    role: 'selectAll'
                }
            );
        } else {
            menuItems.push(
                {
                    label: 'Copy',
                    role: 'copy',
                    enabled: hasSelection
                },
                {
                    label: 'Select All',
                    role: 'selectAll'
                }
            );
        }

        Menu.buildFromTemplate(menuItems).popup({
            window: win
        });
    });
}

function getLogFilePath() {
  // Use the identity parsed at startup. It is available BEFORE the renderer
  // submits --ask questions and does not change when CMS content loads.
  const args = commandLineArgs || {};
  const launchData = args.data && typeof args.data === 'object' ? args.data : {};
  const safe = (value) => String(value ?? '').trim().replace(/[^\w.-]+/g, '_') || 'unknown';
  const today = new Date().toLocaleDateString('en-CA');
  const userId = safe(args.userId || 'default');
  const userName = safe(launchData.userName || 'unknown');
  const lang = String(args.language || 'en').toLowerCase() === 'fr' ? 'fr' : 'en';
  const filename = `${today}_${userId}_${userName}_${lang}_BPAL_ASSISTANT_LOG.txt`;
  return path.join(logsFolder || __dirname, 'BPAL_ASSISTANT', filename);
}

// Parse command line arguments
function parseArgs() {
    const { legacyArgs } = extractLaunchQuestion(process.argv.slice(1));
    // Preserve the original parser and its accepted parameters.
    // The legacy parser supports argv arrays. Preserve quoted -data values and
    // other parameters exactly instead of losing quoting via join/split.
    return RegistryHelper.parseCommandLine(legacyArgs);
}

function createWindow() {
    if(commandLineArgs.coordinates){
        winX = commandLineArgs.coordinates.x;
        winY = commandLineArgs.coordinates.y;
    }
    
    mainWindow = new BrowserWindow({
        x: winX,
        y: winY,
        width: 1250,
        height: 800,
        alwaysOnTop: true,
        webPreferences: {
            // UI has no Node.js access. Only the approved preload bridge can use IPC.
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            preload: path.join(__dirname, 'preload.js'),
        },
        icon: path.join(__dirname, 'icon.ico')
    });


    setupChatContextMenu(mainWindow);

    // Customer HTML stays on the original local page; it cannot navigate
    // into a remote site with our privileged preload bridge attached.
    mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    rendererAssistantReady = false;
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  

   // mainWindow.webContents.openDevTools();  
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// The employee EXE only calls our FastAPI server. The Groq provider key and RAG
// pipeline stay server-side; the renderer receives neither key.
function customerApiConfig() {
  return readCustomerApiConfig();
}

let chatConversationId = null;
// The chat tab needs only user identity; it must not block on CMS lists/images.
registerTrustedIpc('get-chat-context', () => {
  const args = commandLineArgs || parseArgs();
  const data = args?.data && typeof args.data === 'object' ? args.data : {};
  return {
    language: String(args?.language || 'en').toLowerCase(),
    userId: args?.userId || 'default',
    data: { userName: data.userName || null }
  };
});
registerTrustedIpc('chat-status', async () => {
  const config = customerApiConfig();
  if (!config.configured) {
    return { configured: false, provider: 'fastapi', conceptCount: null, reason: config.reason };
  }
  // Startup should not make a Groq chat request just to show the input box.
  // A real chat request will validate the client key and report auth errors.
  return { configured: true, provider: 'fastapi', conceptCount: null, reason: '' };
});

async function chatViaBackend(message, history) {
  const config = customerApiConfig();
  if (!config.configured) throw new Error(config.reason);
  const started = performance.now();
  const result = await askApi(config, { question: message, conversation_id: chatConversationId, history });
  console.log(`[PERFORMANCE] Assistant API response: ${((performance.now() - started) / 1000).toFixed(3)} seconds`);
  chatConversationId = result.conversation_id;
  return { success: true, answer: result.answer,
    needsSupport: !!result.needs_support || !!result.needsSupport,
    conversationId: result.conversation_id,
    retrievalCount: result.retrieval_count, modelProvider: result.model_provider };
}

registerTrustedIpc('chat-ask-stream', async (event, { message, history = [] } = {}) => {
  try {
    ({ message, history } = validateChatPayload({ message, history }));
    const result = await chatViaBackend(message, history);
    // /chat currently returns a complete answer, not a streamed response.
    if (!event.sender.isDestroyed()) event.sender.send('chat-chunk', result.answer);
    return result;
  } catch (error) {
    console.error('[chat-ask-stream]', error.message);
    return { success: false, error: error.message };
  }
});

registerTrustedIpc('chat-ask', async (_event, { message, history = [] } = {}) => {
  try {
    ({ message, history } = validateChatPayload({ message, history }));
    return await chatViaBackend(message, history);
  }
  catch (error) {
    console.error('[chat-ask]', error.message);
    return { success: false, error: error.message };
  }
});

// =========================================================
//  NEW: Email Generation Handler
// =========================================================
// The renderer can request a support email, but cannot choose a recipient,
// arbitrary attachment or SMTP configuration. The existing emailer INI remains
// a main-process-only dependency.
registerTrustedIpc('create-email-file', async () => {
  try {
    const logFilePath = getLogFilePath();
    const result = RegistryHelper.createEmailFile({
      subject: 'BPAL Assistant - Support Request',
      attachmentPath: fs.existsSync(logFilePath) ? logFilePath : '',
    }, user.userId, user.getDetailsString());
    // RegistryHelper.createEmailFile returns emailerConfig internally.
    // NEVER forward it: it includes the emailer's SMTP password.
    return {
      success: result.success === true,
      filePath: result.success ? result.filePath : undefined,
      filename: result.success ? result.filename : undefined,
      error: result.success ? undefined : result.error,
    };
  } catch (error) {
    console.error('Error creating support email:', error);
    return { success: false, error: error.message };
  }
});

function formatLogEntry(messageEntry, sender, language) {
    const timestamp = new Date().toLocaleString('en-CA'); // Format: YYYY-MM-DD HH:MM:SS
    const languageLabel = language === 'en' ? 'English' : 'Français';
    const senderLabel = sender === 'assistant' ? 'Assistant' : sender === 'user' ? 'User' : sender;

    return `${'='.repeat(80)}
[${timestamp}]
Sender: ${senderLabel}
Language: ${languageLabel}
${'='.repeat(80)}
${messageEntry}
`;
}

registerTrustedIpc('save-message', async (event, messageData) => {
    try {
        const { text, sender, language } = messageData || {};
        if (typeof text !== 'string' || text.length > 100000 ||
            !['assistant', 'user'].includes(sender) ||
            !['en', 'fr'].includes(language)) {
          throw new Error('Invalid message log payload');
        }

        const currentFilePath = getLogFilePath();
        // Ensure directory exists
        const dir = path.dirname(currentFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
       //  console.log(sender);
        // Format and append to file
        const formattedEntry = formatLogEntry(text, sender, language);
        fs.appendFileSync(currentFilePath, formattedEntry);

        return { success: true };
    } catch (error) {
        console.error('Error saving message:', error);
        return { success: false, error: error.message };
    }
});

// =========================================================
//  EXISTING: Registry & Help Center Logic
// =========================================================
let pendingHelpCenterData = null;
async function loadHelpCenterDataOnce() {

  try {
    // Reuse sanitized startup args: never reparse --ask or Chromium switches.
    cliData = commandLineArgs || parseArgs();
    const lang = (cliData.language || commandLineArgs?.language || 'en').toLowerCase();
    const db = (cliData.database || commandLineArgs?.database || 'CDCCOMMON').toUpperCase();

    // CMS ONLY: no reading or merging of CDCCOMMON/local JSON for either tab.
    // An empty API response must show an empty tab, not stale local content.
    const mainHeadings = [];
    let tipsSuccess = false;
    let whatsNewData = [];

    // -----------------------------
    // CMS ONLY: an authenticated response is authoritative, even when empty.
    // If API is unreachable, do not display old local JSON.
    // -----------------------------
    let cmsSource = { tips: 'unavailable', whatsNew: 'unavailable' };
    try {
      const config = customerApiConfig();
      console.log('[CMS] API:', config.apiUrl || '(unconfigured)', 'configured:', config.configured);
      if (config.configured) {
        const cms = await loadCmsHelpContent({
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          language: lang,
          cacheRoot: app.getPath('userData'),
          deferMedia: true,
          onMediaReady: () => {
            for (const wc of BrowserWindow.getAllWindows().map(w => w.webContents)) {
              if (!wc.isDestroyed()) wc.send('cms-media-ready');
            }
          }
        });
        if (Array.isArray(cms.tips)) {
          mainHeadings.push(...cms.tips);
          tipsSuccess = mainHeadings.length > 0;
          cmsSource.tips = 'cms';
        }
        if (Array.isArray(cms.whatsNew)) {
          whatsNewData = cms.whatsNew;
          cmsSource.whatsNew = 'cms';
        }
        console.log('[CMS] Sources:', cmsSource,
          'API Tips entries:', cms.tipCount,
          'Visible Tips headings:', mainHeadings.length,
          'API What\'s New entries:', cms.whatsNewCount,
          'Visible What\'s New entries:', whatsNewData.length,
          'Images:', cms.mediaCount);
      } else {
        console.warn('[CMS] Customer API is not configured; no local content will be shown.');
      }
    } catch (err) {
      console.warn('[CMS] CMS unavailable; showing no local content:', err.message);
    }

    // -----------------------------
    // User object (safe)
    // -----------------------------
    const safeData = (cliData && typeof cliData.data === 'object' && cliData.data) ? cliData.data : {};

    user.userId = cliData.userId || 'default';
    user.userName = safeData.userName || null;
    user.userPhone = safeData.userPhone || null;
    user.userTelephone = safeData.userTelephone || null;
    user.userEmail = safeData.userEmail || null;
    user.userJobTitle = safeData.userJobTitle || null;

    return {
      success: true,
      tipsSuccess,
      cmsSource,
      userId: cliData.userId || 'default',
      database: cliData.database || 'CDCCOMMON',
      language: lang,
      queryMode: !!cliData.queryMode,
      jsonData: JSON.stringify({ mainHeadings }),
      whatsNewData,
      data: safeData
    };

  } catch (error) {
    console.error('Error in get-help-center-data:', error);
    return {
      success: false,
      error: error.message,
      jsonData: JSON.stringify({ mainHeadings: [] }),
      whatsNewData: [],
      data: {}
    };
  }
}
// Share simultaneous requests from the Tips and other renderer widgets.
// Clear immediately on completion so later explicit reloads still get fresh CMS data.
registerTrustedIpc('get-help-center-data', () => {
  if (!pendingHelpCenterData) {
    pendingHelpCenterData = loadHelpCenterDataOnce().finally(() => {
      pendingHelpCenterData = null;
    });
  }
  return pendingHelpCenterData;
});

registerTrustedIpc('get-user-preference', async () => {
    // Kept your existing stub
    return { success: true, prefKey: 'stub_pref_key' };
});



async function initializeApp() {
    try {
       //  console.log('Parsing args...');
        commandLineArgs = parseArgs();

       //  console.log('Loading registry config...');
        appConfig = await RegistryHelper.loadConfig(commandLineArgs.database);

        // Query mode: exit silently if config loading failed
        if (!appConfig && commandLineArgs.queryMode) {
           //  console.log('Query mode: exiting due to missing config');
            app.exit(0); // Exit code 0 for query mode (silent failure)
            return;
        }

        // Normal mode: show error dialog if config loading failed
        if (!appConfig && !commandLineArgs.queryMode) {
            let errorMsg = 'Failed to load configuration from registry.\n\n';
            errorMsg += 'Registry Location:\n';
            errorMsg += 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Circuit Design Corporation\\CDCA\n\n';
            errorMsg += 'Required Values (CDCCOMMON):\n';
            errorMsg += '- CDCCOMMON_TIPS_AND_TRICKS_JSON_FOLDER_EN (REG_SZ)\n';
            errorMsg += '- CDCCOMMON_TIPS_AND_TRICKS_JSON_FOLDER_FR (REG_SZ)\n\n';

            if (commandLineArgs.database && commandLineArgs.database !== 'CDCCOMMON') {
                errorMsg += `Database-Specific Values (Optional for ${commandLineArgs.database}):\n`;
                errorMsg += `- ${commandLineArgs.database}_TIPS_AND_TRICKS_JSON_FOLDER_EN (REG_SZ)\n`;
                errorMsg += `- ${commandLineArgs.database}_TIPS_AND_TRICKS_JSON_FOLDER_FR (REG_SZ)\n\n`;
            }

            errorMsg += 'Please configure these registry entries using the provided installer or manually.';

            dialog.showErrorBox('Configuration Error', errorMsg);
            app.exit(1); // Exit code 1 for configuration error
            return;
        }

        // A missing customer API key is an installation/support issue, not a
        // reason to open a Help Center with a non-functional Assistant.
        // Keep this user-facing message short; do not display credentials or
        // internal Registry paths. Query mode already exits above if needed.
        const customerConfig = customerApiConfig();
        if (!customerConfig.apiKey) {
            dialog.showMessageBoxSync({
                type: 'warning',
                title: 'BPAL Help Center',
                message: 'The Help Center is not configured.',
                detail: 'Please contact support.',
                buttons: ['OK'],
                defaultId: 0,
                noLink: true
            });
            app.exit(1);
            return;
        }

        const launch = extractLaunchQuestion(process.argv);
        if (launch.question) pendingLaunchQuestions.push(launch.question);
        createWindow();

    } catch (error) {
        console.error('Initialization error:', error);

        // In query mode, exit silently on any error
        if (commandLineArgs && commandLineArgs.queryMode) {
           //  console.log('Query mode: exiting due to error');
            app.exit(1);
            return;
        }

        // In normal mode, show error and exit
        dialog.showErrorBox('Initialization Error', `Failed to initialize application:\n\n${error.message}`);
        app.exit(1);
    }
}


// =========================================================
//  Get Current Log File Path
// =========================================================
registerTrustedIpc('get-log-file-path', async (event) => {
    try {
        const language = commandLineArgs?.language || 'en';
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const usrname= user.userName || ' ';
        const fileName = `${today}_${user.userId}_${usrname}_${language}_BPAL_ASSISTANT_LOG.txt`;
        
               const logFilePath = getLogFilePath();

       //  console.log('Log file path:', logFilePath);

        return {
            success: true,
            path: logFilePath,
            exists: fs.existsSync(logFilePath)
        };

    } catch (error) {
        console.error('Error getting log file path:', error);
        return { success: false, error: error.message };
    }
});

app.on('ready', initializeApp);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});

// Remove menu bar
Menu.setApplicationMenu(null);
module.exports = UserDetails;
