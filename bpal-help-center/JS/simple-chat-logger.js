// ==========================================
// SIMPLE CHAT LOGGER
// ==========================================

const fs = require('fs');
const path = require('path');

class SimpleChatLogger {
    constructor() {
        this.folderPath = RegistryHelper.getCDC_LOGS();
        this.currentDate = this.getFormattedDate();
        this.currentLanguage = 'en';
    }

    getFormattedDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getFormattedTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    getLogFileName() {
        return `${this.currentDate}_${this.currentLanguage}.txt`;
    }

    getLogFilePath() {
        if (!this.folderPath) return null;
        return path.join(this.folderPath, this.getLogFileName());
    }

    log(message, sender) {
        try {
            if (!this.folderPath || !fs.existsSync(this.folderPath)) {
                console.warn('Log folder not available');
                return false;
            }

            const timestamp = this.getFormattedTime();
            const logEntry = `[${timestamp}] ${sender.toUpperCase()}: ${message}\n`;
            const logPath = this.getLogFilePath();

            fs.appendFileSync(logPath, logEntry, 'utf8');
            return true;
        } catch (error) {
            console.error('Error logging message:', error);
            return false;
        }
    }

    setLanguage(language) {
        this.currentLanguage = language;
    }

    getLog() {
        try {
            const logPath = this.getLogFilePath();
            if (!logPath || !fs.existsSync(logPath)) {
                return null;
            }
            return fs.readFileSync(logPath, 'utf8');
        } catch (error) {
            console.error('Error reading log:', error);
            return null;
        }
    }

    deleteLog() {
        try {
            const logPath = this.getLogFilePath();
            if (logPath && fs.existsSync(logPath)) {
                fs.unlinkSync(logPath);
               //  console.log(`Log deleted: ${this.getLogFileName()}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting log:', error);
            return false;
        }
    }
}

