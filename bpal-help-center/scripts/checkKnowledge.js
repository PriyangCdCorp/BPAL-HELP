// Usage: node scripts/checkKnowledge.js CDCCOMMON en
const path = require('path');
const OkfKnowledgeBase = require('../okfKnowledgeBase');

const [database = 'CDCCOMMON', language = 'en'] = process.argv.slice(2);

const kb = new OkfKnowledgeBase({
  resolveBundleRoot: (db, lang) => path.join(__dirname, '..', 'okf', db, lang.toUpperCase()),
});

const concepts = kb.load(database, language);
console.log(`Loaded ${concepts.length} concepts for ${database} / ${language}\n`);
console.log(kb.buildCatalog(concepts));

// Flag descriptions that look broken
const suspicious = concepts.filter((c) =>
  c.description.length < 40 || /\s\d+\.?$/.test(c.description) || c.body.length < 80
);
if (suspicious.length) {
  console.log(`\n⚠ ${suspicious.length} concepts worth checking:`);
  suspicious.forEach((c) => console.log(`  ${c.id} | ${c.title} | desc: "${c.description}" | body: ${c.body.length} chars`));
}
const total = concepts.reduce((sum, c) => sum + c.body.length, 0);
console.log(`\nTotal text: ${total} characters`);
concepts.forEach((c) => console.log(`  ${c.id} ${c.title}: ${c.body.length} chars`));