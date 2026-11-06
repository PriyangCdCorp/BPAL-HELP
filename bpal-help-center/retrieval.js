const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const STOPWORDS = new Set([
  'the','and','for','you','how','what','where','when','why','can','does','with','from','this','that',
  'are','was','has','have','its','into','out','but','not','all','any','use','using','about','get','got',
  'les','des','une','pour','dans','avec','comment','quoi','est','sont','vous','que','qui','sur','par','mon','ma',
]);

// Maps words users type to words the documentation uses
const SYNONYMS = {
  save: ['apply', 'ok', 'commit'],
  discard: ['cancel', 'undo', 'revert'],
  close: ['cancel', 'exit', 'quit'],
  edit: ['modify', 'change', 'update', 'entry'],
  search: ['lookup', 'find', 'magnifying'],
  dropdown: ['lookup', 'list'],
  greyed: ['closed', 'gray', 'grey', 'readonly'],
  logout: ['logoff', 'signout', 'session'],
  screen: ['notebook', 'window', 'tab'],
  field: ['box', 'input'],
};

function tokenize(text) {
  return norm(text).split(/\W+/).filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function expand(terms) {
  const out = new Set(terms);
  for (const t of terms) {
    for (const s of SYNONYMS[t] || []) out.add(s);
    for (const [key, values] of Object.entries(SYNONYMS)) {
      if (values.includes(t)) out.add(key);
    }
  }
  return [...out];
}

/** Builds the search index once per knowledge base load. */
function buildIndex(concepts) {
  const docs = concepts.map((c) => {
    // Title, description and tags matter more, so they're repeated
    const headText = `${c.title} ${c.title} ${c.title} ${c.description} ${c.description} ${c.tags.join(' ')} ${c.tags.join(' ')}`;
    const tokens = [...tokenize(headText), ...tokenize(c.body)];
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    return { concept: c, tf, length: tokens.length };
  });

  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);

  const avgLength = docs.reduce((s, d) => s + d.length, 0) / (docs.length || 1);
  return { docs, df, avgLength, total: docs.length };
}

function titleMatch(index, query) {
  const def = query.match(/^\s*(what|what's|whats|define|meaning of|c'est quoi|qu'est[- ]ce que)\s+(is\s+|are\s+)?(an?\s+|the\s+|le\s+|la\s+|un\s+|une\s+)?(.{2,40}?)\s*\??\s*$/i);
  if (!def) return [];
  const term = norm(def[4]);
  return index.docs
    .filter((d) => norm(d.concept.title).includes(term))
    .map((d) => ({ concept: d.concept, score: 100 }));
}

/** BM25 ranking. Returns [{ concept, score }] sorted best first. */
function search(index, query, limit = 4) {
  const terms = expand(tokenize(query));
  if (!terms.length) return [];

    const exact = titleMatch(index, query);
  if (exact.length) return exact.slice(0, limit);

  const k1 = 1.5, b = 0.75;
  const scored = index.docs.map((d) => {
    let score = 0;
    for (const t of terms) {
      const f = d.tf.get(t);
      if (!f) continue;
      const n = index.df.get(t) || 0;
            const idf = Math.max(0.25, Math.log(1 + (index.total - n + 0.5) / (n + 0.5)));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (d.length / index.avgLength))));
    }
    return { concept: d.concept, score };
  }).filter((x) => x.score > 0).sort((a, b2) => b2.score - a.score);

  if (!scored.length) return [];

  // Drop weak matches so the prompt doesn't get padded with near-misses
  const best = scored[0].score;
    return scored.filter((x) => x.score >= best * 0.25).slice(0, limit);
}

module.exports = { buildIndex, search, tokenize };