const fs = require('fs-extra');
const path = require('path');

class DocumentLoader {
  constructor(dbDir = './db') {
    this.dbDir = dbDir;
    this.cache = new Map(); // Cache loaded documents
  }

  /**
   * Load documents for a specific database and language
   * @param {string} database - Database name (e.g., 'CDCMTL')
   * @param {string} language - Language code ('en' or 'fr')
   * @returns {Array} - Document chunks
   */
  loadDatabase(database, language = 'en') {
    const cacheKey = `${database}_${language}`;

    // Return from cache if available
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const fileName = `${database}_${language}.json`;
    const filePath = path.join(this.dbDir, fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(` Database file not found: ${fileName}`);
      return [];
    }

    const documents = fs.readJsonSync(filePath);
    this.cache.set(cacheKey, documents);

    console.log(` Loaded: ${fileName} (${documents.length} chunks)`);

    return documents;
  }

  /**
   * Load combined documents: CDCCOMMON + specific database
   * @param {string} database - Specific database (e.g., 'CDCMTL')
   * @param {string} language - Language code ('en' or 'fr')
   * @returns {Array} - Combined document chunks
   */
  loadCombined(database, language = 'en') {
    const commonDocs = this.loadDatabase('CDCCOMMON', language);
    
    // If requesting CDCCOMMON itself, just return it
    if (database.toUpperCase() === 'CDCCOMMON') {
      return commonDocs;
    }

    const specificDocs = this.loadDatabase(database, language);

    // Combine both arrays
    const combined = [...commonDocs, ...specificDocs];

    console.log(` Combined: CDCCOMMON (${commonDocs.length}) + ${database} (${specificDocs.length}) = ${combined.length} total chunks`);

    return combined;
  }

  /**
   * Load multiple databases combined
   * @param {Array<string>} databases - Array of database names
   * @param {string} language - Language code
   * @returns {Array} - Combined documents
   */
  loadMultiple(databases, language = 'en') {
    const allDocs = [];

    for (const db of databases) {
      const docs = this.loadDatabase(db, language);
      allDocs.push(...docs);
    }

    console.log(` Loaded ${databases.length} databases: ${allDocs.length} total chunks`);

    return allDocs;
  }

  /**
   * Get list of available databases
   * @returns {Array<{database: string, language: string}>}
   */
  getAvailableDatabases() {
    const files = fs.readdirSync(this.dbDir)
      .filter(f => f.endsWith('.json'));

    return files.map(f => {
      const match = f.match(/^(.+)_(en|fr)\.json$/);
      if (match) {
        return { database: match[1], language: match[2] };
      }
      return null;
    }).filter(Boolean);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log(' Document cache cleared');
  }
}

module.exports = DocumentLoader;