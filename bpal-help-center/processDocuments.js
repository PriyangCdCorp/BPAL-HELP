const fs = require('fs-extra');
const path = require('path');
const { pipeline } = require('@xenova/transformers');

// Improved chunking with better overlap
function createChunks(text, size = 400, overlap = 100) {
  text = text.replace(/\s+/g, ' ').trim();

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);

    if (currentLength + words.length > size && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      const overlapWords = currentChunk.slice(-overlap);
      currentChunk = [...overlapWords];
      currentLength = overlapWords.length;
    }

    currentChunk.push(...words);
    currentLength += words.length;
  }

  if (currentChunk.length > 50) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

/**
 * Process documents and generate separate JSON files per database and language
 */
async function processDocuments() {
  console.log(' Loading embedding model...\n');

  const embedder = await pipeline(
    'feature-extraction',
    'Xenova/all-mpnet-base-v2'
  );

  const docsDir = './documents';
  const dbDir = './db';

  // Ensure db directory exists
  fs.ensureDirSync(dbDir);

  // Get all database folders (CDCCOMMON, CDCMTL, CDCMSMTL, etc.)
  const databaseFolders = fs.readdirSync(docsDir).filter(item => {
    const itemPath = path.join(docsDir, item);
    return fs.statSync(itemPath).isDirectory();
  });

  console.log(` Found databases: ${databaseFolders.join(', ')}\n`);

  // Process each database folder
  for (const database of databaseFolders) {
    const databasePath = path.join(docsDir, database);

    // Get language folders (English, French)
    const languageFolders = fs.readdirSync(databasePath).filter(item => {
      const itemPath = path.join(databasePath, item);
      return fs.statSync(itemPath).isDirectory();
    });

    // Process each language
    for (const language of languageFolders) {
      const langCode = language.toLowerCase().startsWith('en') ? 'en' : 'fr';
      const languagePath = path.join(databasePath, language);

      console.log(` Processing: ${database} / ${language}`);

      const documents = [];

      // Get all files in this language folder
      const files = getFilesRecursively(languagePath);

      for (const filePath of files) {
        const relativePath = path.relative(languagePath, filePath);
        const fileName = path.basename(filePath);

        console.log(`    Reading: ${relativePath}`);

        const content = fs.readFileSync(filePath, 'utf-8');
        const chunks = createChunks(content, 400, 100);

        console.log(`      Created ${chunks.length} chunks`);

        for (let i = 0; i < chunks.length; i++) {
          documents.push({
            text: chunks[i],
            source: relativePath,
            fileName: fileName,
            database: database,
            language: langCode,
            chunkIndex: i,
            totalChunks: chunks.length
          });
        }
      }

      if (documents.length === 0) {
        console.log(`    No documents found, skipping...\n`);
        continue;
      }

      console.log(`    Creating embeddings for ${documents.length} chunks...`);

      // Create embeddings
      for (let i = 0; i < documents.length; i++) {
        if (i % 10 === 0) {
          process.stdout.write(`\r      Progress: ${i}/${documents.length}`);
        }

        // Primary embedding
        const textEmbed = await embedder(documents[i].text, {
          pooling: 'mean',
          normalize: true
        });
        documents[i].embedding = Array.from(textEmbed.data);

        // Contextual embedding with neighbors
        let contextText = documents[i].text;

        if (i > 0 && documents[i - 1].source === documents[i].source) {
          contextText = documents[i - 1].text.slice(-150) + ' ' + contextText;
        }

        if (i < documents.length - 1 && documents[i + 1].source === documents[i].source) {
          contextText = contextText + ' ' + documents[i + 1].text.slice(0, 150);
        }

        const contextEmbed = await embedder(contextText, {
          pooling: 'mean',
          normalize: true
        });
        documents[i].contextEmbedding = Array.from(contextEmbed.data);
      }

      // Save to separate JSON file
      const outputFileName = `${database}_${langCode}.json`;
      const outputPath = path.join(dbDir, outputFileName);

      fs.writeJsonSync(outputPath, documents);

      console.log(`\n   Saved: ${outputFileName} (${documents.length} chunks)\n`);
    }
  }

  console.log('\n All databases processed successfully!');
  console.log(' Output files in ./db/ folder\n');
}

/**
 * Recursively get all .txt and .md files
 */
function getFilesRecursively(dir) {
  const files = [];

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      files.push(...getFilesRecursively(itemPath));
    } else if (stat.isFile() && (item.endsWith('.txt') || item.endsWith('.md'))) {
      files.push(itemPath);
    }
  }

  return files;
}

// Run
processDocuments().catch(error => {
  console.error(' Error:', error.message);
  process.exit(1);
});