// Reads ./documents/<DB>/<Language>/ and creates ./okf/<DB>/<EN|FR>/
const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));

const DOCS_DIR = args[0] || './documents';
const OUT_DIR = args[1] || './okf';
// --assistant writes <out>\<DB>\Anowledge\<EN|FR> (the layout the app reads from HELPCENTERROOT)
// default writes  <out>\<DB>\<EN|FR>          (the layout bundled inside the app)
const KNOWLEDGE_LAYOUT = flags.has('--assistant');

console.log(`[build] docs=${DOCS_DIR} out=${OUT_DIR} assistant=${KNOWLEDGE_LAYOUT} flags=${[...flags].join(',') || 'none'}`);
const MAX_CONCEPT_CHARS = 6000;
const TODAY = new Date().toLocaleDateString('en-CA');
const RESERVED = new Set(['index.md', 'log.md']);

const slugify = (s) =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'concept';

function listFiles(dir, exts) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...listFiles(full, exts));
    else if (exts.some((e) => name.toLowerCase().endsWith(e))) out.push(full);
  }
  return out;
}

const GENERIC_LABELS = new Set([
  'example', 'examples', 'location', 'function', 'functionality', 'behavior', 'behaviour',
  'use when', 'note', 'notes', 'description', 'purpose', 'usage', 'tip', 'tips', 'important', 'warning',
]);

function summarize(text, docTitle) {
  // Useful bold labels (skip generic ones and duplicates)
  const labels = [...new Set(
    [...text.matchAll(/\*\*(.+?)\*\*/g)]
      .map((m) => m[1].replace(/[:：]\s*$/, '').trim())
      .filter((l) => l && !GENERIC_LABELS.has(l.toLowerCase().split(/\s+[-–]\s+/)[0]))
  )];

  // First real sentence, ignoring headings, list numbers and bullets
  const clean = text
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^\s*(#+|\d+[.)]|[-*•])\s+/gm, '')
    .replace(/[*_`>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const sentence = (clean.match(/^(.{30,200}?[.!?])(\s|$)/)?.[1] || clean.slice(0, 160)).trim();

  let desc = `${docTitle}: ${sentence}`;
  if (labels.length >= 2) desc += ` Covers: ${labels.slice(0, 8).join('; ')}`;
  return desc.length > 300 ? desc.slice(0, 297) + '...' : desc;
}

// Recognises headings by shape, so writers don't need Markdown
function detectHeading(line, nextLine, prevLine) {
  const text = line.trim();
  if (!text) return null;

  // Explicit Markdown heading (still supported)
  const md = text.match(/^#{1,2}\s+(.+?)\s*#*$/);
  if (md) return md[1];

  // Numbered section: "1. OPTION: Logout" or "3) Getting Started"
  const numbered = text.match(/^\d+[.)]\s+(.{3,80})$/);
  if (numbered && !/[.!?]$/.test(numbered[1])) return numbered[1].trim();

  // FAQ question: "Q: How do I close the BPAL program?"
  const faq = text.match(/^Q\s*[:.]\s*(.{5,120})$/i);
  if (faq) return faq[1].trim();

  // ALL CAPS line: "MENU ITEM DESCRIPTIONS & USAGE"
  if (/^[A-Z0-9][A-Z0-9 &'''/,.\-()]{3,60}$/.test(text) && /[A-Z]{2,}/.test(text)) {
    return text.replace(/\s+/g, ' ');
  }

  // Short standalone title line: no sentence punctuation, blank line after,
  // blank line or nothing before, not a list item or field line
  const looksLikeTitle =
    text.length >= 4 && text.length <= 70 &&
    !/[.!?:;]$/.test(text) &&
    !/^[-•*\d]/.test(text) &&
    !text.includes('  ') &&
    /^[A-Z]/.test(text) &&
    text.split(/\s+/).length <= 10;

  const isolated = (nextLine === undefined || nextLine.trim() === '') &&
                   (prevLine === undefined || prevLine.trim() === '');

  if (looksLikeTitle && isolated) return text;

  return null;
}

function splitIntoConcepts(content, fallbackTitle) {
  const lines = content.split(/\r?\n/);
  const sections = [];
  let current = { title: fallbackTitle, lines: [] };

  for (let i = 0; i < lines.length; i++) {
    const heading = detectHeading(lines[i], lines[i + 1], lines[i - 1]);

    if (heading) {
      if (current.lines.join('').trim()) sections.push(current);
      current = { title: heading, lines: [] };
    } else {
      // Level 3+ Markdown headings become bold (the chat window can't render headings)
      const sub = lines[i].match(/^#{3,6}\s+(.+?)\s*#*$/);
      current.lines.push(sub ? `**${sub[1]}**` : lines[i]);
    }
  }
  if (current.lines.join('').trim()) sections.push(current);

  // Merge sections that are too small to stand alone (e.g. single FAQ answers)
  const MIN_CHARS = 250;
  const merged = [];
  for (const sec of sections) {
    const text = sec.lines.join('\n').trim();
    const last = merged[merged.length - 1];
    if (last && text.length < MIN_CHARS) {
      last.lines.push('', `**${sec.title}**`, ...sec.lines);
    } else {
      merged.push({ ...sec });
    }
  }

  // Split anything still oversized, on paragraph boundaries
  const concepts = [];
  for (const { title, lines: secLines } of merged) {
    const text = secLines.join('\n').trim();
    if (text.length <= MAX_CONCEPT_CHARS) { concepts.push({ title, text }); continue; }

    let buffer = '', part = 1;
    for (const para of text.split(/\n\s*\n/)) {
      if (buffer && buffer.length + para.length > MAX_CONCEPT_CHARS) {
        concepts.push({ title: `${title} (part ${part++})`, text: buffer.trim() });
        buffer = '';
      }
      buffer += para + '\n\n';
    }
    if (buffer.trim()) concepts.push({ title: part > 1 ? `${title} (part ${part})` : title, text: buffer.trim() });
  }

  return concepts;
}

function isHandMaintained(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const { data } = matter(fs.readFileSync(filePath, 'utf-8'));
  const generatedByScript = String(data?.generated?.by || '').startsWith('script:');
  const verified = Array.isArray(data?.verified) && data.verified.length > 0;
  return !generatedByScript || verified;
}

function writeIndex(dir, heading) {
  const entries = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      entries.push(`- [${name}/](./${name}/index.md)`);
    } else if (name.endsWith('.md') && !RESERVED.has(name)) {
      const { data } = matter(fs.readFileSync(full, 'utf-8'));
      if (!data.type) continue;
      entries.push(`- [${data.title || name}](./${name})${data.description ? ` — ${data.description}` : ''}`);
    }
  }
  fs.writeFileSync(path.join(dir, 'index.md'), `# ${heading}\n\n${entries.join('\n')}\n`);
}

function build() {  
  const isDir = (p) => fs.statSync(p).isDirectory();
  for (const database of fs.readdirSync(DOCS_DIR).filter((d) => isDir(path.join(DOCS_DIR, d)))) {
    const dbPath = path.join(DOCS_DIR, database);

    for (const language of fs.readdirSync(dbPath).filter((d) => isDir(path.join(dbPath, d)))) {
      const lang = language.toLowerCase().startsWith('fr') ? 'FR' : 'EN';
           const bundleRoot = KNOWLEDGE_LAYOUT
        ? path.join(OUT_DIR, database, 'Assistant', lang)
        : path.join(OUT_DIR, database, lang);
      fs.ensureDirSync(bundleRoot);
      
      const produced = new Set();
      let written = 0, kept = 0;

      for (const file of listFiles(path.join(dbPath, language), ['.md', '.txt'])) {
        const baseName = path.basename(file, path.extname(file));
        const sourceSlug = slugify(baseName);
        const groupDir = path.join(bundleRoot, sourceSlug);
        fs.ensureDirSync(groupDir);

        const raw = fs.readFileSync(file, 'utf-8');
        const parsed = matter(raw);

        if (parsed.data?.type) {
          const target = path.join(groupDir, `${sourceSlug}.md`);
          fs.writeFileSync(target, raw);
          produced.add(path.resolve(target));
          written++;
          writeIndex(groupDir, baseName);
          continue;
        }

        const docTitle = baseName.replace(/[_-]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
        const concepts = splitIntoConcepts(parsed.content, docTitle).map((c) => ({
          ...c,
          title: c.title.toLowerCase() === docTitle.toLowerCase() ? docTitle : `${docTitle} – ${c.title}`,
        }));
        const used = new Set();
        const slugs = concepts.map((c) => {
          let s = slugify(c.title), n = 2;
          while (used.has(s)) s = `${slugify(c.title)}-${n++}`;
          used.add(s);
          return s;
        });

        concepts.forEach((concept, i) => {
          const target = path.join(groupDir, `${slugs[i]}.md`);
          produced.add(path.resolve(target));
          if (isHandMaintained(target)) { kept++; return; }

          const related = concepts
            .map((c, j) => ({ c, j }))
            .filter(({ j }) => j !== i && Math.abs(j - i) <= 2)
            .map(({ c, j }) => `- [${c.title}](./${slugs[j]}.md)`);

          const body = `# ${concept.title}\n\n${concept.text}\n` +
            (related.length ? `\n## Related\n\n${related.join('\n')}\n` : '');

          fs.writeFileSync(target, matter.stringify(body, {
            type: 'guide',
            title: concept.title,
            description: summarize(concept.text, docTitle),
            tags: [database.toLowerCase(), sourceSlug],
            status: 'active',
            generated: { by: 'script:buildOkfBundle', at: TODAY },
            sources: [{
              id: `${sourceSlug}-${i + 1}`,
              resource: path.relative(DOCS_DIR, file).replace(/\\/g, '/'),
              title: path.basename(file),
            }],
          }));
          written++;
        });

        writeIndex(groupDir, baseName);
      }

      for (const file of listFiles(bundleRoot, ['.md'])) {
        if (RESERVED.has(path.basename(file)) || produced.has(path.resolve(file))) continue;
        if (!isHandMaintained(file)) fs.removeSync(file);
      }

      writeIndex(bundleRoot, `${database} knowledge (${lang})`);
      fs.appendFileSync(path.join(bundleRoot, 'log.md'),
        `- ${TODAY}: rebuilt from ${database}/${language} (${written} written, ${kept} kept)\n`);
      console.log(`${database}/${lang}: ${written} concepts written, ${kept} kept`);
    }
  }
}

build();