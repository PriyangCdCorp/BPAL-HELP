const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const RESERVED = new Set(['index.md', 'log.md']);
const toISO = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v) : null);
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function listMarkdown(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...listMarkdown(full));
    else if (name.endsWith('.md') && !RESERVED.has(name)) out.push(full);
  }
  return out;
}

class OkfKnowledgeBase {
  constructor({ resolveBundleRoot }) {
    this.resolveBundleRoot = resolveBundleRoot;
    this.cache = new Map();
  }

  // Loads CDCCOMMON, then the specific database on top of it
  load(database = 'CDCCOMMON', language = 'en') {
    const key = `${database}|${language}`.toUpperCase();
    if (this.cache.has(key)) return this.cache.get(key);

    const byPath = new Map();
    const layers = database.toUpperCase() === 'CDCCOMMON' ? ['CDCCOMMON'] : ['CDCCOMMON', database];

    for (const db of layers) {
      const root = this.resolveBundleRoot(db, language);
      if (!root || !fs.existsSync(root)) continue;
      for (const file of listMarkdown(root)) {
        const concept = this._parse(file, root, db);
        if (concept) byPath.set(concept.relPath, concept);
      }
    }

    const concepts = [...byPath.values()].map((c, i) => ({ ...c, id: `c${i + 1}` }));
    const { buildIndex } = require('./retrieval');
    this.indexes = this.indexes || new Map();
    this.indexes.set(key, buildIndex(concepts));
    this.cache.set(key, concepts);
    return concepts;
  }

    getIndex(database = 'CDCCOMMON', language = 'en') {
    const key = `${database}|${language}`.toUpperCase();
    if (!this.indexes?.has(key)) this.load(database, language);
    return this.indexes.get(key);
  }

  /** One short line per concept, so the model knows what else exists. */
  buildToc(concepts) {
    return concepts.map((c) => `- ${c.title}`).join('\n');
  }
  
  _parse(file, root, database) {
    try {
      const { data, content } = matter(fs.readFileSync(file, 'utf-8'));
      if (!data?.type) return null;
      const status = String(data.status || 'active').toLowerCase();
      if (['deprecated', 'archived', 'draft'].includes(status)) return null;

      const verified = Array.isArray(data.verified) ? data.verified : [];
      const staleAfter = toISO(data.stale_after);

      return {
        relPath: path.relative(root, file).replace(/\\/g, '/'),
        database,
        type: data.type,
        title: data.title || path.basename(file, '.md'),
        description: data.description || '',
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        humanVerified: verified.some((v) => String(v?.by || '').startsWith('human:')),
        stale: !!staleAfter && new Date().toLocaleDateString('en-CA') > staleAfter,
        body: content.trim(),
      };
    } catch (e) {
      console.error(`[OKF] Skipping ${file}: ${e.message}`);
      return null;
    }
  }

  // The list of titles + descriptions the AI will read to pick topics
  buildCatalog(concepts) {
    return concepts
      .map((c) => `${c.id} | ${c.title} | ${c.description}${c.tags.length ? ` | tags: ${c.tags.join(', ')}` : ''}`)
      .join('\n');
  }

  // Backup search if the AI topic-picker fails
  pickByKeywords(concepts, query, limit = 3) {
    const terms = norm(query).split(/\W+/).filter((t) => t.length > 2);
    if (!terms.length) return [];
    return concepts
      .map((c) => {
        const head = norm(`${c.title} ${c.description} ${c.tags.join(' ')}`);
        const body = norm(c.body);
        const score = terms.reduce((s, t) => s + (head.includes(t) ? 3 : 0) + (body.includes(t) ? 1 : 0), 0);
        return { c, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.c);
  }
}

module.exports = OkfKnowledgeBase;