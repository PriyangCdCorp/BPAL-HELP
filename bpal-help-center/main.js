const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
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
ipcMain.handle('assistant-launch-ready', () => {
    rendererAssistantReady = true;
    return pendingLaunchQuestions.splice(0);
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
    process.exit(0);
} else {
    // ONLY handle second-instance attempts here
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // A second EXE invocation sends its question to the existing process.
        // Do not reset the chatConversationId or create a new window.
        const { question } = extractLaunchQuestion(commandLine);
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
        deliverQuestion(question);
    });
}

function getDateFileName(sender, language) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return `/BPAL_ASSISTANT/${today}_${user.userId}_${user.userName}_${language}_BPAL_ASSISTANT_LOG.txt`;
}

function getLogFilePath() {
  const safe = (s) => String(s ?? '').trim().replace(/[^\w.-]+/g, '_') || 'unknown';
  const today = new Date().toLocaleDateString('en-CA');
  const lang = commandLineArgs?.language || 'en';
  const name = `${today}_${safe(user.userId)}_${safe(user.userName)}_${lang}_BPAL_ASSISTANT_LOG.txt`;
  return path.join(logsFolder || __dirname, 'BPAL_ASSISTANT', name);
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
            //  CRITICAL SETTINGS FOR CHAT TO WORK
            nodeIntegration: true,
            contextIsolation: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            // -------------------------------------
            preload: path.join(__dirname, 'preload.js'),
        },
        icon: path.join(__dirname, 'icon.ico')
    });



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
ipcMain.handle('get-chat-context', () => {
  const args = commandLineArgs || parseArgs();
  const data = args?.data && typeof args.data === 'object' ? args.data : {};
  return {
    language: String(args?.language || 'en').toLowerCase(),
    userId: args?.userId || 'default',
    data: { userName: data.userName || null }
  };
});
ipcMain.handle('chat-status', async () => {
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

ipcMain.handle('chat-ask-stream', async (event, { message, history = [] } = {}) => {
  try {
    const result = await chatViaBackend(message, history);
    // /chat currently returns a complete answer, not a streamed response.
    if (!event.sender.isDestroyed()) event.sender.send('chat-chunk', result.answer);
    return result;
  } catch (error) {
    console.error('[chat-ask-stream]', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chat-ask', async (_event, { message, history = [] } = {}) => {
  try { return await chatViaBackend(message, history); }
  catch (error) {
    console.error('[chat-ask]', error.message);
    return { success: false, error: error.message };
  }
});

// =========================================================
//  NEW: Email Generation Handler
// =========================================================
ipcMain.handle('create-email-file', async (event, options = {}) => {
    try {
       //  console.log('Creating email file with options:', options);

        const result = RegistryHelper.createEmailFile({
            toEmail: options.toEmail,
            subject: options.subject || 'BPAL Assistant',
            attachmentPath: options.attachmentPath
        },user.userId,user.getDetailsString());

        return result;

    } catch (error) {
        console.error('Error in create-email-file handler:', error);
        return { success: false, error: error.message };
    }
});

// Handler to get emailer configuration (useful for UI)
ipcMain.handle('get-emailer-config', async (event) => {
    try {
        const config = RegistryHelper.loadEmailerConfig();
        return { success: true, config };
    } catch (error) {
        console.error('Error getting emailer config:', error);
        return { success: false, error: error.message };
    }
});

function formatLogEntry(messageEntry, sender, language) {
    const timestamp = new Date().toLocaleString('en-CA'); // Format: YYYY-MM-DD HH:MM:SS
    const languageLabel = language === 'en' ? 'English' : 'Français';
    const senderLabel = sender === 'assistant' ? 'Assistant' : sender;

    return `${'='.repeat(80)}
[${timestamp}]
Sender: ${senderLabel}
Language: ${languageLabel}
${'='.repeat(80)}
${messageEntry}
`;
}

ipcMain.handle('save-message', async (event, messageData) => {
    try {
        const { text, sender, language } = messageData;

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
ipcMain.handle('get-help-center-data', () => {
  if (!pendingHelpCenterData) {
    pendingHelpCenterData = loadHelpCenterDataOnce().finally(() => {
      pendingHelpCenterData = null;
    });
  }
  return pendingHelpCenterData;
});

ipcMain.handle('get-user-preference', async () => {
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
ipcMain.handle('get-log-file-path', async (event) => {
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
