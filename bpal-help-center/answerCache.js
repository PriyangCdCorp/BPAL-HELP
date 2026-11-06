const MAX_ENTRIES = 200;
const TTL_MS = 60 * 60 * 1000; // 1 hour

const cache = new Map(); // key -> { answer, needsSupport, at }

const keyFor = (database, language, message) =>
  `${database}|${language}|${String(message).toLowerCase().replace(/\s+/g, ' ').replace(/[?!.,]+$/g, '').trim()}`;

function get(database, language, message) {
  const key = keyFor(database, language, message);
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) { cache.delete(key); return null; }
  cache.delete(key); cache.set(key, hit); // refresh recency
  return hit;
}

function set(database, language, message, value) {
  const key = keyFor(database, language, message);
  cache.set(key, { ...value, at: Date.now() });
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
}

function clear() { cache.clear(); }

module.exports = { get, set, clear };