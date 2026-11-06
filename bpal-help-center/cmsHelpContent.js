'use strict';

// CMS integration lives in Electron's main process. The renderer never receives
// customer API credentials. Only published, tenant-authorized content is read.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEDIA_REF = /\/content\/media\/([0-9a-f-]{36})\b/i;
const VALID_MIME = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' };
const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

function safeCmsUrl(raw) {
  if (!raw) return null;
  try {
    const url = new URL(String(raw).trim());
    if (url.username || url.password || url.search || url.hash) return null;
    const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (!(url.protocol === 'https:' || (url.protocol === 'http:' && isLocal))) return null;
    return url.origin + url.pathname.replace(/\/$/, '');
  } catch { return null; }
}

function contentOf(item) {
  let content = item && item.content;
  if (!content || typeof content !== 'object') content = {};
  // Support old stored translation format {body: {steps: [...]}}.
  if (content.body && typeof content.body === 'object' && !Array.isArray(content.body)) content = content.body;
  return content;
}

function mediaIdFrom(input) {
  if (typeof input !== 'string') return null;
  const match = input.match(MEDIA_REF);
  return match && UUID.test(match[1]) ? match[1] : null;
}

function mapTips(items, resolveMedia = () => null) {
  const categories = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const title = String(item.title || '').trim();
    if (!title) continue;
    const cat = String(item.category || 'General').trim() || 'General';
    const body = contentOf(item);
    let steps = Array.isArray(body.steps) ? body.steps : [];
    if (!steps.length && typeof body.html === 'string' && body.html.trim()) steps = [{ text: body.html }];
    if (!steps.length) continue;
    const allowed = new Set((item.media || []).map(m => m.media_id));
    steps = steps.map(s => {
      const candidate = typeof s.imagePath === 'string' ? s.imagePath : '';
      const id = mediaIdFrom(candidate);
      const imagePath = id && allowed.has(id) ? (resolveMedia(id) || '') : '';
      return {
        text: rewriteHtmlMedia(String(s.text || ''), allowed, resolveMedia),
        imagePath,
        imageFileName: String(s.imageFileName || '')
      };
    });
    if (!categories.has(cat)) categories.set(cat, { title: cat, fileName: `cms-${cat}`, subHeadings: [] });
    categories.get(cat).subHeadings.push({ title, steps });
  }
  return [...categories.values()];
}

function rewriteHtmlMedia(html, allowed, resolveMedia) {
  // Only rewrite authenticated media IDs attached to this published article.
  // Leave other content unchanged; never substitute arbitrary external URLs.
  return html.replace(/(<img\b[^>]*?\bsrc\s*=\s*)(["'])([^"']*)\2/gi, (whole, prefix, quote, src) => {
    const id = mediaIdFrom(src);
    if (!id || !allowed.has(id)) return whole;
    const local = resolveMedia(id);
    return local ? `${prefix}${quote}${local}${quote}` : whole;
  });
}

function dateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function selectWhatsNewSource(cmsItems, localItems) {
  return Array.isArray(cmsItems) ? { items: cmsItems, source: 'cms' } :
    { items: Array.isArray(localItems) ? localItems : [], source: 'local' };
}

function isVisibleOnDate(item, todayISO) {
  // The published API already filters status, tenant and visibility. Filter again
  // locally to preserve the existing Help Center's date-only, inclusive semantics.
  const from = dateOnly(item.visible_from || item.visibleFrom);
  const to = dateOnly(item.visible_to || item.visibleTo);
  return (!from || todayISO >= from) && (!to || todayISO <= to);
}

function mapWhatsNew(items, resolveMedia = () => null, todayISO = new Date().toLocaleDateString('en-CA')) {
  // Normalize a reliable YYYY-MM-DD; en-CA formatting can vary by runtime.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayISO)) {
    const d = new Date();
    todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  return (Array.isArray(items) ? items : []).filter(x => x && x.title && isVisibleOnDate(x, todayISO)).map(item => {
    const body = contentOf(item);
    const allowed = new Set((item.media || []).map(m => m.media_id));
    const html = typeof body.html === 'string' ? body.html :
      typeof body.body === 'string' ? body.body : '';
    let changes = Array.isArray(body.changes) ? body.changes : [];
    if (!changes.length && html.trim()) changes = [{ text: html }];
    changes = changes.map(c => ({
      text: rewriteHtmlMedia(typeof c === 'string' ? c : String(c?.text || ''), allowed, resolveMedia)
    }));
    return {
      version: String(item.target_bpal_version || body.version || 'CMS'),
      title: String(item.title),
      date: dateOnly(body.release_date || item.published_at || item.visible_from),
      visibleFrom: dateOnly(item.visible_from),
      visibleTo: dateOnly(item.visible_to),
      majorUpdate: body.major_update === true || body.majorUpdate === true || item.major_update === true || item.majorUpdate === true,
      changes,
      source: 'cms'
    };
  }).sort((a, b) => (b.visibleFrom || '').localeCompare(a.visibleFrom || ''));
}

async function fetchJson(baseUrl, apiKey, endpoint, fetchImpl, timeout = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetchImpl(`${baseUrl}${endpoint}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: controller.signal,
      redirect: 'error'
    });
    if (!response.ok) throw Error(`CMS ${endpoint} returned HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw Error(`CMS ${endpoint} returned unexpected content`);
    return data;
  } finally { clearTimeout(timer); }
}

async function fetchMedia(baseUrl, apiKey, mediaId, destination, fetchImpl) {
  if (!UUID.test(mediaId)) return null;
  // Content lists are always revalidated against the server. Only IDs in the
  // current authenticated response reach this function. Media files are keyed
  // by customer API key partition and by UUID, and refreshed after five minutes.
  for (const ext of Object.values(VALID_MIME)) {
    const file = path.join(destination, `${mediaId}${ext}`);
    try {
      const stat = await fs.stat(file);
      if (stat.isFile() && stat.size > 0 && stat.size <= MAX_MEDIA_BYTES &&
          Date.now() - stat.mtimeMs < 5 * 60 * 1000) {
        return pathToFileURL(file).href;
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetchImpl(`${baseUrl}/content/media/${mediaId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }, signal: controller.signal, redirect: 'error'
    });
    if (!response.ok) throw Error(`media ${mediaId}: HTTP ${response.status} (publish and attach media first)`);
    const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const ext = VALID_MIME[mime];
    if (!ext) throw Error(`media ${mediaId}: disallowed MIME ${mime}`);
    const size = Number(response.headers.get('content-length'));
    if (size > MAX_MEDIA_BYTES) throw Error('Image exceeds size limit');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_MEDIA_BYTES) throw Error('Image empty or too large');
    const file = path.join(destination, `${mediaId}${ext}`);
    await fs.mkdir(destination, { recursive: true });
    await fs.writeFile(file, bytes);
    return pathToFileURL(file).href;
  } finally { clearTimeout(timer); }
}

async function loadCmsHelpContent({ apiUrl, apiKey, language, cacheRoot, fetchImpl = global.fetch, logger = console, onMediaReady = null, deferMedia = false }) {
  const validatedUrl = safeCmsUrl(apiUrl);
  if (!validatedUrl || !apiKey || !cacheRoot) return { configured: false };
  // The Registry stores the chat endpoint (/chat), but CMS routes live at
  // the origin (/content/*). Never append /content to /chat.
  const baseUrl = new URL(validatedUrl).origin;
  const lang = String(language || 'en').toLowerCase() === 'fr' ? 'fr' : 'en';
  // Isolate caches by customer key; no credentials written to files.
  const partition = crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 20);
  const dir = path.join(cacheRoot, 'cms-media', partition);
  const [tipResult, whatsNewResult] = await Promise.allSettled([
    fetchJson(baseUrl, apiKey, `/content/tips?language=${lang}`, fetchImpl),
    fetchJson(baseUrl, apiKey, `/content/whats-new?language=${lang}`, fetchImpl)
  ]);
  let tips = tipResult.status === 'fulfilled' ? tipResult.value : null;
  let whatsNew = whatsNewResult.status === 'fulfilled' ? whatsNewResult.value : null;
  if (tipResult.status === 'rejected') logger.warn('[CMS] Tips unavailable:', tipResult.reason?.message);
  if (whatsNewResult.status === 'rejected') logger.warn('[CMS] What\'s New unavailable:', whatsNewResult.reason?.message);
  const ids = new Set();
  for (const item of [...(tips || []), ...(whatsNew || [])]) {
    for (const m of item.media || []) if (UUID.test(m.media_id)) ids.add(m.media_id);
  }
  // Render text immediately: only inspect the local cache before returning.
  // Network image downloads happen in the background; the renderer is notified
  // once so it can redraw using authenticated local file URLs.
  const downloaded = new Map();
  const missing = [];
  for (const id of ids) {
    let cached = null;
    for (const ext of Object.values(VALID_MIME)) {
      const file = path.join(dir, `${id}${ext}`);
      try {
        const stat = await fs.stat(file);
        if (stat.isFile() && stat.size > 0 && stat.size <= MAX_MEDIA_BYTES) {
          cached = pathToFileURL(file).href;
          break;
        }
      } catch (err) {
        if (err.code !== 'ENOENT') logger.warn(`[CMS] Cache check failed: ${err.message}`);
      }
    }
    if (cached) downloaded.set(id, cached);
    else missing.push(id);
  }
  if (missing.length) {
    const mediaJob = Promise.all(missing.map(async id => {
      try {
        const file = await fetchMedia(baseUrl, apiKey, id, dir, fetchImpl);
        if (file) downloaded.set(id, file);
      } catch (err) {
        logger.warn(`[CMS] Could not load image ${id}: ${err.message}`);
      }
    }));
    if (deferMedia) {
      // The UI displays text now; notify it once images are locally cached.
      void mediaJob.then(() => {
        if (typeof onMediaReady === 'function') onMediaReady();
      }).catch(err => logger.warn('[CMS] Background media failed:', err.message));
    } else {
      await mediaJob;
    }
  }
  const resolveMedia = id => downloaded.get(id) || null;
  return {
    configured: true,
    tips: tips === null ? null : mapTips(tips, resolveMedia),
    whatsNew: whatsNew === null ? null : mapWhatsNew(whatsNew, resolveMedia),
    tipCount: tips?.length ?? null,
    whatsNewCount: whatsNew?.length ?? null,
    mediaCount: downloaded.size
  };
}

module.exports = { safeCmsUrl, contentOf, mediaIdFrom, mapTips, mapWhatsNew, selectWhatsNewSource, loadCmsHelpContent };
