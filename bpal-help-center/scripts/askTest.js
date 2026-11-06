// Usage: node scripts/askTest.js CDCMTL en "your question here"
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const OkfKnowledgeBase = require('../okfKnowledgeBase');
const { askQuestionStreaming } = require('../chatPipeline');

const [database = 'CDCCOMMON', language = 'en', ...questionParts] = process.argv.slice(2);
const question = questionParts.join(' ');

if (!question) {
  console.log('Usage: node scripts/askTest.js CDCMTL en "your question here"');
  process.exit(1);
}

const kb = new OkfKnowledgeBase({
  resolveBundleRoot: (db, lang) => path.join(__dirname, '..', 'okf', db, lang.toUpperCase()),
});

const started = Date.now();
let firstChunkAt = null;

console.log('\n--- ANSWER ---\n');

askQuestionStreaming(
  { knowledgeBase: kb, database, language, message: question, userName: 'Tester', userId: 'TEST01' },
  (chunk) => {
    if (firstChunkAt === null) firstChunkAt = Date.now();
    process.stdout.write(chunk);
  }
)
  .then((r) => {
    console.log('\n\n--- DEBUG ---');
    console.log(r.debug);
    console.log('Needs support:', r.needsSupport);
    console.log(`First text after: ${((firstChunkAt - started) / 1000).toFixed(2)}s`);
  })
  .catch((e) => console.error('\nERROR:', e.message));