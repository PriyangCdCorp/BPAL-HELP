// registryHelper.js - Windows Registry access using native commands
const { dialog } = require('electron');

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
// Registry path constant
const REGISTRY_PATH = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Circuit Design Corporation\\CDCA';
const REGISTRY_PATH_CURRENT = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Circuit Design Corporation\\CDCA';
// --- CONSTANTS FOR CDCB ---
const REGISTRY_PATH_WHATSNEW = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Circuit Design Corporation\\CDCB';
const REGISTRY_PATH_WHATSNEW_CURRENT = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Circuit Design Corporation\\CDCB';

const REGISTRY_PATH_CDCB = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Circuit Design Corporation\\CDCB';
const REGISTRY_PATH_CDCB_CURRENT = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Circuit Design Corporation\\CDCB';

const COMMON_DB_NAME = 'CDCCOMMON';

class RegistryHelper {


  /**
   * Read string value from Windows registry using REG QUERY command
   */
  static readString(registryPath, valueName) {
    try {
     // //  console.log(`Reading registry: ${registryPath} -> ${valueName}`);

      // Use REG QUERY with proper escaping
      const command = `REG QUERY "${registryPath}" /v "${valueName}"`;
     // //  console.log(`Executing: ${command}`);

      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Parse the output to extract the value
      // Output format:
      // HKEY_LOCAL_MACHINE\SOFTWARE\...
      //     ValueName    REG_SZ    C:\path\to\folder

      const lines = output.split('\n');
      for (let line of lines) {
        line = line.trim();
        if (line && !line.startsWith('HKEY')) {
          // This should be the value line
          const parts = line.split(/\s+/);
          if (parts.length >= 3) {
            // Extract the path (everything after the type)
            const pathStart = line.indexOf('REG_SZ') + 6;
            const pathValue = line.substring(pathStart).trim();
            if (pathValue) {
             // //  console.log(`Found: ${valueName} = ${pathValue}`);
              return pathValue;
            }
          }
        }
      }

      console.warn(`✗ Value not found: ${valueName}`);
      return null;

    } catch (err) {
      console.warn(`Registry read error for ${valueName}: ${err.message.split('\n')[0]}`);
      return null;
    }
  }

  /**
    * Get the LOGS FOLDER path from registry
    * Registry Value Name: "CDC_LOGS"
    */
  static getCDC_LOGS() {
   // //  console.log('\n=== Looking for CDC_LOGS in CDCB ===');

    // 1. Try HKEY_LOCAL_MACHINE first
    let pathVal = this.readString(REGISTRY_PATH_CDCB, 'CDC_LOGS');

    // 2. Fallback to HKEY_CURRENT_USER
    if (!pathVal) {
      pathVal = this.readString(REGISTRY_PATH_CDCB_CURRENT, 'CDC_LOGS');
    }

    if (pathVal) {
     // //  console.log(`Found LOGS Folder: ${pathVal}`);
    } else {
      console.warn('CDC_LOGS not found in registry.');
    }

    return pathVal;
  }


  /**
  * Get the EMAILER INI FILE path from registry
  * Registry Value Name: "CDC_EMAILER_INI_FILE"
  */
  static getCDC_EMAILER() {
   // //  console.log('\n=== Looking for CDC_EMAILER_INI_FILE in CDCB ===');

    // 1. Try HKEY_LOCAL_MACHINE first
    let pathVal = this.readString(REGISTRY_PATH_CDCB, 'CDC_EMAILER_INI_FILE');

    // 2. Fallback to HKEY_CURRENT_USER
    if (!pathVal) {
      pathVal = this.readString(REGISTRY_PATH_CDCB_CURRENT, 'CDC_EMAILER_INI_FILE');
    }

    if (pathVal) {
     // //  console.log(`Found Emailer INI File: ${pathVal}`);
    } else {
      console.warn('CDC_EMAILER_INI_FILE not found in registry.');
    }

    return pathVal;
  }


  /**
 * Parse INI file and return key-value pairs
 * @param {string} filePath - Path to the INI file
 * @returns {Object} - Parsed configuration object
 */
  static parseIniFile(filePath) {
    const config = {};

    if (!filePath || !fs.existsSync(filePath)) {
      console.warn(`INI file does not exist: ${filePath}`);
      return config;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach(line => {
        // Trim whitespace
        line = line.trim();

        // Skip empty lines and comments
        if (!line || line.startsWith('#') || line.startsWith(';')) {
          return;
        }

        // Split by first '=' only
        const equalsIndex = line.indexOf('=');
        if (equalsIndex > 0) {
          const key = line.substring(0, equalsIndex).trim();
          const value = line.substring(equalsIndex + 1).trim();
          config[key] = value;
        }
      });

     // //  console.log('Parsed INI file successfully:', Object.keys(config));
      return config;

    } catch (err) {
      console.error(`Error parsing INI file ${filePath}: ${err.message}`);
      return config;
    }
  }

  /**
   * Load emailer configuration from INI file
   * @returns {Object|null} - Emailer configuration or null if not found
   */
  static loadEmailerConfig() {
    const iniFilePath = this.getCDC_EMAILER();

    if (!iniFilePath) {
      console.error('Emailer INI file path not found in registry');
      return null;
    }

    const config = this.parseIniFile(iniFilePath);

    if (Object.keys(config).length === 0) {
      console.error('Failed to parse emailer configuration');
      return null;
    }

    return {
      userId: config.userId || '',
      usermail: config.USERMAIL || '',
      password: config.PASSWORD || '',
      smtpServer: config.SMTPSERVER || '',
      smtpPort: config.SMTPPORT || '587',
      cdcSupport: config.CDCSUPPORT || '',
      subjectClient: config.SUBJECT_CLIENT || '',
      outbox: config.OUTBOX || '',
      attachments: config.ATTACHMENTS || '',
      sentbox: config.SENTBOX || '',
      errorbox: config.ERRORBOX || '',
      logfiles: config.LOGFILES || '',
      dailyLimit: config.DAILYLIMIT || '100'
    };
  }

  /**
   * Extract display name from email address
   * e.g., "Priyang.Patel@cdcorp.ca" -> "Priyang"
   * @param {string} email - Email address
   * @returns {string} - Display name (first part before dot or @)
   */
  static extractDisplayName(email) {
    if (!email) return 'User';

    // Get the local part (before @)
    const localPart = email.split('@')[0];

    // Get the first name (before first dot)
    const firstName = localPart.split('.')[0];

    // Capitalize first letter
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }

  /**
   * Generate email filename with format: YYYYMMDD_userId_BPAL_Assistant.IMH
   * @param {string} userId - userId for the filename
   * @returns {string} - Generated filename
   */
  static generateEmailFilename(userId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Clean userId for filename (remove special chars, use first part of email)
    let cleanuserId = userId || 'unknown';
    if (cleanuserId.includes('@')) {
      cleanuserId = cleanuserId.split('@')[0];
    }
    // Replace dots and special chars with underscores
    cleanuserId = cleanuserId.replace(/[^a-zA-Z0-9]/g, '_');

    return `${dateStr}_${cleanuserId}_BPAL_Assistant.IMH`;
  }

/**
 * Generate email content in IMH format
 * @param {Object} options - Email options
 * @param {string} options.fromEmail - Sender email address
 * @param {string} options.toEmail - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.attachmentPath - Path to attachment file
 * @param {string} options.body - Email body text
 * @returns {string} - Formatted email content
 */
static generateEmailContent(options,body) {
  const { fromEmail, toEmail, subject, attachmentPath } = options;

  const displayName = this.extractDisplayName(fromEmail);

  let content = `From:${displayName} <${fromEmail}>\r\n`;
  content += `To:<${toEmail}>\r\n`;
  content += `Subject:${subject}\r\n`;

  if (attachmentPath) {
    content += `Attach:${attachmentPath}\r\n`;
  }


  // Add blank line then body text
  if (body && body.trim() !== '') {
    content += `\r\n`;
    content += `-------User details are-------`;
    content += `\r\n`;
    content += `\r\n`;
    content += `${body}`;
  }


  return content;
}

  /**
   * Create email file in OUTBOX folder
   * @param {Object} options - Options for email generation
   * @param {string} options.toEmail - Recipient email (optional, defaults to USERMAIL from config)
   * @param {string} options.subject - Email subject (optional, defaults to 'BPAL Assistant')
   * @param {string} options.attachmentPath - Path to attachment file
   * @returns {Object} - Result with success status and file path
   */
  static createEmailFile(options = {},userId,user) {
    try {
     // //  console.log('\n=== Creating Email File ===');

      // 1. Load emailer configuration
      const emailerConfig = this.loadEmailerConfig();
      if (!emailerConfig) {
        return { success: false, error: 'Failed to load emailer configuration' };
      }

      // 2. Validate OUTBOX path
      if (!emailerConfig.outbox) {
        return { success: false, error: 'OUTBOX path not configured in emailer INI' };
      }

      // Ensure OUTBOX directory exists
      if (!fs.existsSync(emailerConfig.outbox)) {
        fs.mkdirSync(emailerConfig.outbox, { recursive: true });
       // //  console.log(`Created OUTBOX directory: ${emailerConfig.outbox}`);
      }

      // 3. Set email parameters
      const fromEmail = emailerConfig.usermail;
      const toEmail = options.toEmail || emailerConfig.cdcSupport;
      const subject = options.subject || 'BPAL Assistant';
      const attachmentPath = options.attachmentPath || '';

      if (!fromEmail) {
        return { success: false, error: 'USERMAIL not configured in emailer INI' };
      }

  
                
      // 4. Generate filename
      const filename = this.generateEmailFilename(userId);
      const fullPath = path.join(emailerConfig.outbox, filename);

      // 5. Generate email content
      const emailContent = this.generateEmailContent({
        fromEmail,
        toEmail,
        subject,
        attachmentPath,
        
      },user);

     // //  console.log('Email content:');
     // //  console.log(emailContent);

      // 6. Write file
      fs.writeFileSync(fullPath, emailContent, 'utf-8');
     // //  console.log(`Email file created: ${fullPath}`);

      return {
        success: true,
        filePath: fullPath,
        filename: filename,
        emailerConfig: emailerConfig
      };

    } catch (err) {
      console.error('Error creating email file:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get the What's New FOLDER path from registry
   * Registry Value Name: "HELPCENTERROOT"
   */
  static getHelpCenterFolderPath() {
   // //  console.log('\n=== Looking for HELPCENTERROOT in CDCB ===');

    // 1. Try HKEY_LOCAL_MACHINE first
    let pathVal = this.readString(REGISTRY_PATH_WHATSNEW, 'HELPCENTERROOT');

    // 2. Fallback to HKEY_CURRENT_USER
    if (!pathVal) {
      pathVal = this.readString(REGISTRY_PATH_WHATSNEW_CURRENT, 'HELPCENTERROOT');
    }

    if (pathVal) {
     // //  console.log(`Found What's New Folder: ${pathVal}`);
    } else {
dialog.showErrorBox('BPAL Help Center', 
`Press Win + R, type 'regedit' and press Enter.

Navigate to or create this path:
Computer\\HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Circuit Design Corporation\\CDCB

Steps:
1. Right-click in the right panel → New → String Value
2. Name it: HELPCENTERROOT
3. Double-click it and set the value to your desired help path
4. Click OK

Example value: C:\\Program Files\\CDC\\HelpCenter`);    
    }

    return pathVal;
  }

  
  /**
   * Build TipsAndTricks path for a database and language
   */
  static buildTipsAndTricksPath(rootPath, databaseName, language) {
    if (!rootPath) return null;
    return path.join(rootPath, databaseName, 'TipsAndTricks', language.toUpperCase());
  }

  /**
   * Load JSON files from a folder
   */
  static loadJsonFilesFromFolder(folderPath, sourceDb) {
    const jsonFiles = [];

    if (!folderPath || !fs.existsSync(folderPath)) {
      console.warn(`Folder does not exist: ${folderPath}`);
      return jsonFiles;
    }

    try {
      const files = fs.readdirSync(folderPath);

      files.forEach(file => {
        if (file.endsWith('.json')) {
          const fullPath = path.join(folderPath, file);
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const baseName = path.basename(file, '.json');

            jsonFiles.push({
              fileName: file,
              baseName: baseName,
              fullPath: fullPath,
              content: content,
              sourceDb: sourceDb
            });

           // //  console.log(`  Loaded: ${file} (${sourceDb})`);
          } catch (err) {
            console.error(`Error reading JSON file ${file}: ${err.message}`);
          }
        }
      });
    } catch (err) {
      console.error(`Error loading JSON files from ${folderPath}: ${err.message}`);
    }

    return jsonFiles;
  }

  /**
   * Load configuration using single root path (SIMPLIFIED)
   */
  static loadConfig(databaseName) {
    const config = {
      databaseName: databaseName,
      commonFolderPathEn: null,
      commonFolderPathFr: null,
      dbFolderPathEn: null,
      dbFolderPathFr: null,
      htmlPath: null,
      jsonFilesEn: [],
      jsonFilesFr: []
    };

    try {
      const rootPath = this.getHelpCenterFolderPath();
      if (!rootPath) {
        console.error('CDCSoft root path not found. Set CDCSOFTPATH in registry.');
        return null;
      }

      // Build paths from root
      config.commonFolderPathEn = this.buildTipsAndTricksPath(rootPath, 'CDCCOMMON', 'EN');
      config.commonFolderPathFr = this.buildTipsAndTricksPath(rootPath, 'CDCCOMMON', 'FR');

      if (databaseName && databaseName.toUpperCase() !== 'CDCCOMMON') {
        config.dbFolderPathEn = this.buildTipsAndTricksPath(rootPath, databaseName, 'EN');
        config.dbFolderPathFr = this.buildTipsAndTricksPath(rootPath, databaseName, 'FR');
      }

      // Validate
      const validationError = this.validateConfig(config);
      if (validationError) {
        console.error('Config validation failed:', validationError);
        return null;
      }

      // Load files
      config.jsonFilesEn = this.loadJsonFilesFromFolder(config.commonFolderPathEn, COMMON_DB_NAME);
      config.jsonFilesFr = this.loadJsonFilesFromFolder(config.commonFolderPathFr, COMMON_DB_NAME);

      if (config.jsonFilesEn.length === 0 || config.jsonFilesFr.length === 0) {
        console.error('No JSON files found in CDCCOMMON folders');
        return {};
      }

      // Load DB-specific if available
      if (databaseName && config.dbFolderPathEn && fs.existsSync(config.dbFolderPathEn)) {
        const dbFilesEn = this.loadJsonFilesFromFolder(config.dbFolderPathEn, databaseName);
        config.jsonFilesEn = [...config.jsonFilesEn, ...dbFilesEn];
      }
      if (databaseName && config.dbFolderPathFr && fs.existsSync(config.dbFolderPathFr)) {
        const dbFilesFr = this.loadJsonFilesFromFolder(config.dbFolderPathFr, databaseName);
        config.jsonFilesFr = [...config.jsonFilesFr, ...dbFilesFr];
      }

      return config;

    } catch (err) {
      console.error('Error loading config:', err.message);
      return null;
    }
  }

  /**
   * Validate configuration
   */
  static validateConfig(config) {
    // Check CDCCOMMON English folder
    if (!config.commonFolderPathEn || !fs.existsSync(config.commonFolderPathEn)) {
      return `CDCCOMMON English JSON folder not found: ${config.commonFolderPathEn}`;
    }

    // Check CDCCOMMON French folder
    if (!config.commonFolderPathFr || !fs.existsSync(config.commonFolderPathFr)) {
      return `CDCCOMMON French JSON folder not found: ${config.commonFolderPathFr}`;
    }

    return null;
  }

  /**
   * Get user preference key for localStorage
   */
  static getUserPreferenceKey(userId, database) {
    return `${userId}_${database}_showTips`;
  }

static parseCommandLine(input) {
  const result = {
    language: 'en',
    userId: 'default',
    database: 'CDCCOMMON',
    queryMode: false,
    data: null,
    coordinates: null 
  };

  if (!input) return result;

  let args = Array.isArray(input) ? input : input.split(/\s+/);

 // //  console.log('[parseCommandLine] Processing args:', args);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    const lower = arg.toLowerCase();

    // Skip garbage
    if (arg === '.' || arg === '..') continue;

    // Language
    if (lower === '-fr' || lower === '/fr') {
      result.language = 'fr';
    }
    else if (lower === '-en' || lower === '/en') {
      result.language = 'en';
    }

    // Query Mode
    else if (lower === '-query' || lower === '/query') {
      result.queryMode = true;
    }

    // ============ DATABASE ============
    else if (lower.startsWith('-db:') || lower.startsWith('/db:')) {
      let val = arg.substring(4);
      
      // FIX: If value is empty, check next argument
      if (val.trim() === '' && i + 1 < args.length && !args[i + 1].startsWith('-')) {
        val = args[++i];
      }
      
      if (val.trim() !== '') {
        result.database = val;
       // //  console.log('[parseCommandLine] Found database:', result.database);
      }
    }
    else if (lower === '-db' || lower === '/db') {
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        result.database = args[++i];
       // //  console.log('[parseCommandLine] Found database:', result.database);
      }
    }

    // ============ DATA ============
    else if (lower.startsWith('-data:') || lower.startsWith('/data:')) {
      let val = arg.substring(6);
      
      // FIX: If value is empty, check next argument
      if (val.trim() === '' && i + 1 < args.length && !args[i + 1].startsWith('-')) {
        val = args[++i];
      }
      
     // //  console.log('[parseCommandLine] Found -data: raw value =', val);
      if (val.trim() !== '') {
        result.data = this._parseDataArg(val);
       // //  console.log('[parseCommandLine] Parsed data:', result.data);
      }
    }
    else if (lower === '-data' || lower === '/data') {
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        const val = args[++i];
       // //  console.log('[parseCommandLine] Found -data (separate) raw value =', val);
        result.data = this._parseDataArg(val);
       // //  console.log('[parseCommandLine] Parsed data:', result.data);
      }
    }

    // ============ COORDINATES (NEW LOGIC) ============
    // Expecting format: -coordinates:x,y (e.g., -coordinates:1920,0)
    else if (lower.startsWith('-coordinates:') || lower.startsWith('/coordinates:')) {
      let val = arg.substring(13); // Length of "-coordinates:"

      // Handle space separation: "-coordinates: 100,100"
      if (val.trim() === '' && i + 1 < args.length && !args[i + 1].startsWith('-')) {
        val = args[++i];
      }

      if (val.trim() !== '') {
        const parts = val.split(','); // Split by comma
        if (parts.length >= 2) {
          result.coordinates = {
            x: parseInt(parts[0], 10),
            y: parseInt(parts[1], 10)
          };
          // // console.log('[parseCommandLine] Found Coordinates:', result.coordinates);
        }
      }
    }

    // ============ MULTIPLE -d FLAGS ============
    else if (lower.startsWith('-d:') || lower.startsWith('/d:')) {
      if (!result.data) result.data = {};
      let val = arg.substring(3);
      
      // FIX: If value is empty, check next argument
      if (val.trim() === '' && i + 1 < args.length && !args[i + 1].startsWith('-')) {
        val = args[++i];
      }
      
      const idx = val.indexOf('=');
      if (idx > 0) {
        const key = val.substring(0, idx);
        const value = val.substring(idx + 1);
        result.data[key] = this._autoConvert(value);
      }
    }
    else if (lower === '-d' || lower === '/d') {
      if (!result.data) result.data = {};
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        const pair = args[++i];
        const idx = pair.indexOf('=');
        if (idx > 0) {
          const key = pair.substring(0, idx);
          const value = pair.substring(idx + 1);
          result.data[key] = this._autoConvert(value);
        }
      }
    }

    // ============ userId ============
    else if (!arg.startsWith('-') && !arg.startsWith('/')) {
      const isPath = arg.includes('\\') || arg.includes('/') || 
                     lower.endsWith('.exe') || lower.endsWith('.js');
      if (!isPath && result.userId === 'default') {
        result.userId = arg;
      }
    }
  }

  return result;
}

/**
 * Smart parser - auto-detects format
 */
static _parseDataArg(str) {
  if (!str || str.trim() === '') {
    return null;
  }

  // 1. JSON (starts with { or [)
  if (str.startsWith('{') || str.startsWith('[')) {
    try {
      return JSON.parse(str);
    } catch (e) { /* continue */ }
  }

  // 2. Base64
  if (/^[A-Za-z0-9+/]+=*$/.test(str) && str.length > 10) {
    try {
      const decoded = Buffer.from(str, 'base64').toString('utf8');
      if (decoded.startsWith('{') || decoded.startsWith('[')) {
        return JSON.parse(decoded);
      }
    } catch (e) { /* continue */ }
  }

  // 3. Query string (has &)
  if (str.includes('&')) {
    return this._parseQueryStringArg(str);
  }

  // 4. Key-Value pairs (default)
  return this._parseKeyValueArg(str);
}

static _parseKeyValueArg(str) {
  const result = {};
  const pairs = str.split(',');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const key = pair.substring(0, idx);
      const value = pair.substring(idx + 1);
      result[key] = this._autoConvert(value);
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

static _parseQueryStringArg(str) {
  const result = {};
  const params = new URLSearchParams(str);
  for (const [key, value] of params) {
    result[key] = this._autoConvert(value);
  }
  return Object.keys(result).length > 0 ? result : null;
}

static _autoConvert(value) {
  if (value === undefined || value === null) return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (!isNaN(value) && value !== '') return Number(value);
  return value;
}
}

module.exports = RegistryHelper;