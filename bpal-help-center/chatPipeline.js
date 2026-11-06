const llm = require('./llmService');
const cache = require('./answerCache');
const { search } = require('./retrieval');

const MAX_CONCEPTS = Number(process.env.MAX_CONCEPTS || 4);
const MAX_KNOWLEDGE_CHARS = Number(process.env.MAX_KNOWLEDGE_CHARS || 12000);

const EXTRACTION = new RegExp([
  'print (your |the |all )?(documentation|docs|knowledge|instructions|prompt|rules)',
  '(repeat|show|dump|output|list) (me )?(your |the |all )?(documentation|docs|knowledge|system prompt|instructions|rules|everything)',
  'verbatim',
  'system prompt|prompt système',
  'ignore (your |all |previous )?(instructions|rules)',
  'repeat everything (above|before)',
  'what (are|is) your (instructions|rules|prompt)',
  'affiche (ta|la) documentation|ignore tes instructions',
].join('|'), 'i');

const DATABASE_NAMES = { CDCMTL: 'CDCMTL', CDCMSMTL: 'CDCMSMTL', CDCPROD: 'CDCPROD' };
const GREETING = /^\s*(hi+|hey+|hello+|yo|good (morning|afternoon|evening)|bonjour|bonsoir|salut+|coucou)[\s!.?]*$/i;
const WHICH_DB = /\b(which|what|quelle?)\b.{0,25}\b(database|base de donn)/i;

function localAnswer(text, { language, userName, database, databaseName }) {
  const fr = language === 'fr';
  const name = (userName || '').trim();

    if (EXTRACTION.test(text)) {
    return fr
      ? "Je peux répondre à vos questions sur BPAL. Posez-moi une question précise sur ce que vous essayez de faire."
      : 'I can answer questions about BPAL. Ask me about the specific task you need help with.';
  }
  
  if (GREETING.test(text)) {
    return fr
      ? `Bonjour${name ? ' ' + name : ''} ! Comment puis-je vous aider avec BPAL ?`
      : `Hello${name ? ' ' + name : ''}! How can I help you with BPAL?`;
  }
  if (WHICH_DB.test(text)) {
    const label = databaseName && databaseName !== database ? `${database} (${databaseName})` : database;
    return fr ? `Vous êtes actuellement dans la base de données ${label}.`
             : `You are currently working in the ${label} database.`;
  }
  return null;
}

function prepare({ knowledgeBase, database, language, message, userName, userId }) {
  const concepts = knowledgeBase.load(database, language);
  const index = knowledgeBase.getIndex(database, language);

  const hits = search(index, message, MAX_CONCEPTS);
  let selected = hits.map((h) => h.concept);
  let mode = 'bm25';

  if (!selected.length) {
    // Nothing matched: send the two shortest so the model has some grounding
    selected = [...concepts].sort((a, b) => a.body.length - b.body.length).slice(0, 2);
    mode = 'bm25-none';
  }

  const budgeted = [];
  let used = 0;
  for (const c of selected) {
    if (budgeted.length && used + c.body.length > MAX_KNOWLEDGE_CHARS) break;
    budgeted.push(c);
    used += c.body.length;
  }

  const dbCode = String(database).toUpperCase();
  return {
    selected: budgeted,
    mode,
    toc: knowledgeBase.buildToc(concepts),
    session: {
      database: dbCode,
      databaseName: DATABASE_NAMES[dbCode] || '',
      knowledgeSources: dbCode === 'CDCCOMMON' ? ['CDCCOMMON'] : ['CDCCOMMON', dbCode],
      language, userName, userId,
    },
  };
}

async function askQuestionStreaming(opts, onChunk) {
  const {
    knowledgeBase, database = 'CDCCOMMON', language = 'en',
    message, history = [], userName = '', userId = '',
  } = opts;

  const text = String(message || '').trim().slice(0, 2000);
  if (!text) throw new Error('Empty message');
  if (!llm.isConfigured()) throw new Error('GROQ_API_KEY is not set (check .env)');

  const started = Date.now();
    const clean = (v) => {
    const s = String(v ?? '').trim();
    return ['default', 'unknown', 'null', 'undefined'].includes(s.toLowerCase()) ? '' : s;
  };
  const safeName = clean(userName);
  const safeId = clean(userId);
  const dbCode = String(database).toUpperCase();

  // Layer 1: answer locally, no API call
  const local = localAnswer(text, { language, userName, database: dbCode, databaseName: DATABASE_NAMES[dbCode] });
  if (local) {
    onChunk(local);
    return { answer: local, needsSupport: false, debug: { mode: 'local', ms: Date.now() - started } };
  }

  const cleanHistory = (Array.isArray(history) ? history : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-4); // two exchanges is plenty and costs far less

  // Layer 2: cached answer, no API call (only when there's no context to depend on)
  if (!cleanHistory.length) {
    const hit = cache.get(dbCode, language, text);
    if (hit) {
      onChunk(hit.answer);
      return { answer: hit.answer, needsSupport: hit.needsSupport, debug: { mode: 'cache', ms: Date.now() - started } };
    }
  }

  // Layer 3: local BM25 retrieval
  const { selected, mode, toc, session } = prepare({ knowledgeBase, database: dbCode, language, message: text, userName, userId });

  // Layers 4 and 5: compact prompt, budget-scheduled streaming request
  const result = await llm.answerQuestionStream({
    message: text, history: cleanHistory, concepts: selected, toc,
    userName, uiLanguage: language, session,
  }, onChunk);

  if (!cleanHistory.length && !result.needsSupport) {
    cache.set(dbCode, language, text, { answer: result.answer, needsSupport: result.needsSupport });
  }

  return {
    answer: result.answer,
    needsSupport: result.needsSupport,
    debug: {
      mode,
      model: result.model,
      concepts: selected.map((c) => c.title),
      charsSent: selected.reduce((s, c) => s + c.body.length, 0),
      ms: Date.now() - started,
    },
  };
}

module.exports = { askQuestionStreaming };