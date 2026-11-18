// The existing Help Center index.html does not link CSS/chat.css.
// Load it here so the answer styles actually apply, without changing index.html.
(function ensureChatStyles() {
  const alreadyLoaded = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .some((link) => /(?:^|\/)chat\.css(?:[?#]|$)/i.test(link.getAttribute('href') || ''));
  if (!alreadyLoaded) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './CSS/chat.css';
    link.dataset.bpalChatStyle = 'true';
    document.head.appendChild(link);
  }
})();

const api = window.bpal ?? null;

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.querySelector('.send-button');
let unansweredStreak = 0;
const TEXT = {
  en: {
    noIpc: 'Assistant unavailable: backend connection missing.',
    noKey: 'The assistant is not configured (missing API key). Please contact your administrator.',
    emptyKb: 'No knowledge base was found for this database, so answers may be limited.',
    welcome: (who) => `<b>Hello${who ? ' ' + who : ''}!</b><br>Ask me any question about BPAL.`,
    thinking: 'Thinking…',
    error: 'Sorry, I could not reach the assistant. Please try again.',
  },
  fr: {
    noIpc: 'Assistant indisponible : connexion au système manquante.',
    noKey: "L'assistant n'est pas configuré (clé API manquante). Veuillez contacter votre administrateur.",
    emptyKb: "Aucune base de connaissances trouvée pour cette base de données; les réponses peuvent être limitées.",
    welcome: (who) => `<b>Bonjour${who ? ' ' + who : ''} !</b><br>Posez-moi toutes vos questions sur BPAL.`,
    thinking: 'Réflexion…',
    error: "Désolé, impossible de joindre l'assistant. Veuillez réessayer.",
  },
};

let uiLanguage = 'en';
let currentUserId = '';
let currentUserName = '';
let conversationHistory = [];
let hasUserSentMessage = false;
let isSending = false;

const t = () => TEXT[uiLanguage] || TEXT.en;

function setInputEnabled(enabled) {
  if (chatInput) chatInput.disabled = !enabled;
  if (sendBtn) sendBtn.disabled = !enabled;
}

async function init() {
  setInputEnabled(false);
  if (!api) { addMessage(TEXT.en.noIpc, 'assistant'); return; }

  try {
    const config = await api.getChatContext();
    uiLanguage = config?.language === 'fr' ? 'fr' : 'en';
    const PLACEHOLDERS = new Set(['default', 'unknown', 'null', 'undefined', '']);
    const clean = (v) => {
      const s = String(v ?? '').trim();
      return PLACEHOLDERS.has(s.toLowerCase()) ? '' : s;
    };
    currentUserId = clean(config?.userId);
    currentUserName = clean(config?.data?.userName);

    const status = await api.getChatStatus();
    chatMessages.innerHTML = '';

    if (!status.configured) { addMessage(status.reason || t().noKey, 'assistant'); return; }
    if (status.conceptCount === 0) addMessage(t().emptyKb, 'assistant');

    const who = [currentUserName, currentUserId].filter(Boolean).map(escapeHtml).join(' - ');
    addMessage(t().welcome(who), 'assistant', { html: true });
    setInputEnabled(true);
  } catch (err) {
    console.error(err);
    addMessage(t().error, 'assistant');
  }
}

// New startup / second-instance requests are processed in order on the SAME chat.
// The main process owns the existing conversation_id; retry never creates a new chat.
let assistantInitialized = false;
const queuedLaunchQuestions = [];
let processingLaunchQuestions = false;


async function processLaunchQuestions() {
    if (
        !assistantInitialized ||
        processingLaunchQuestions ||
        isSending
    ) {
        return;
    }

    processingLaunchQuestions = true;

    try {
        while (queuedLaunchQuestions.length > 0) {
            const question = queuedLaunchQuestions.shift();

            if (typeof question !== "string" || !question.trim()) {
                continue;
            }

            if (typeof window.switchTab === "function") {
                window.switchTab("chat-tab");
            } else {
                document.querySelector('[data-tab="chat-tab"]')?.click();
            }

            await submitQuestion(question.trim(), { fromLaunch: true });
        }
    } finally {
        processingLaunchQuestions = false;
    }
}


// Register BEFORE declaring ready so incoming second-instance notifications
// cannot be missed between renderer startup and chat initialization.
if (api) {
  api.onLaunchQuestion((question) => {
    if (typeof question === 'string' && question.trim()) {
      queuedLaunchQuestions.push(question.trim());
      processLaunchQuestions();
    }
  });
}

async function initializeAssistant() {
  await init();
  assistantInitialized = true;
  if (api) {
    try {
      const initialQuestions = await api.assistantLaunchReady();
      if (Array.isArray(initialQuestions)) {
        queuedLaunchQuestions.unshift(...initialQuestions.filter(q => typeof q === 'string' && q.trim()));
      }
    } catch (error) { console.error('Launch-question registration failed:', error); }
  }
  await processLaunchQuestions();
}
initializeAssistant();

window.sendMessage = function () {
  return submitQuestion(chatInput?.value?.trim());
};

async function submitQuestion(message, { retry = false, failedBox = null, fromLaunch = false } = {}) {
  if (!message || !api || isSending) return false;

  isSending = true;
  const startedAt = performance.now();
  setInputEnabled(false);
  if (!retry) {
    chatInput.value = '';
    hideSupportCard();
    hasUserSentMessage = true;
    addMessage(message, 'user', { fromLaunch });
  }
  if (failedBox) failedBox.remove();

  const bubble = document.createElement('div');
  bubble.className = 'message assistant-message assistant-response';
  bubble.innerHTML = `
    <div class="message-content">
      <div class="assistant-answer-toolbar">
        <span class="assistant-answer-label">BPAL Assistant</span>
        <div class="assistant-answer-actions">
          <button type="button" class="chat-expand-button" hidden></button>
        </div>
      </div>
      <div class="chat-markdown stream-target"></div>
      <span class="stream-cursor" aria-hidden="true">▋</span>
    </div>`;
  chatMessages.appendChild(bubble);
  const target = bubble.querySelector('.stream-target');
  attachAnswerActions(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  let streamed = '';
  const onChunk = (chunk) => {
    streamed += chunk;
    renderAssistantMarkdown(target, streamed);
    updateExpandButton(bubble);
    scrollAnswerToReadablePosition(bubble);
  };
  const unsubscribeChunk = api.onChatChunk(onChunk);

  try {
    const result = await api.askChat({ message, history: conversationHistory });
    bubble.querySelector('.stream-cursor')?.remove();
    if (!result?.success) throw new Error(result?.error || t().error);

    renderAssistantMarkdown(target, result.answer);
    updateExpandButton(bubble);
    // A comprehensive answer should begin at its heading, not auto-jump to
    // its last paragraph after receiving one large API chunk.
    requestAnimationFrame(() => scrollAnswerToReadablePosition(bubble));
    // Distinguish API/IPC latency from time spent updating the UI.
    requestAnimationFrame(() => console.log(
      `[PERFORMANCE] Assistant visible in renderer: ${((performance.now() - startedAt) / 1000).toFixed(3)} seconds`
    ));
    conversationHistory.push({ role: 'user', content: message }, { role: 'assistant', content: result.answer });
    conversationHistory = conversationHistory.slice(-6);
    api.saveMessage({ text: result.answer, sender: 'assistant', language: uiLanguage })
      .catch((e) => console.warn('Could not save message:', e));
    if (result.needsSupport) {
      unansweredStreak++;
      if (unansweredStreak >= 2) showSupportCard();
    } else {
      unansweredStreak = 0;
    }
    return true;
  } catch (error) {
    console.error('Chat request failed:', error);
    bubble.remove();
    const errorBox = document.createElement('div');
    errorBox.className = 'message assistant-message';
    const content = document.createElement('div');
    content.className = 'message-content';
    // Escape dynamic text: errors from a remote service are never HTML.
    const status = /\b(502|503|504|429|408)\b/.exec(error?.message || '');
    const label = document.createElement('span');
    label.textContent = status ? `${t().error} (HTTP ${status[1]}) ` : `${t().error} `;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-retry-button';
    button.textContent = uiLanguage === 'fr' ? 'Réessayer' : 'Try again';
    button.addEventListener('click', () => submitQuestion(message, { retry: true, failedBox: errorBox }));
    content.append(label, button);
    errorBox.append(content);
    chatMessages.append(errorBox);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return false;
  } finally {
    isSending = false;
    setInputEnabled(true);
    chatInput?.focus();
    unsubscribeChunk();
    // A second launch can arrive while a manually entered question is in flight.
    // Drain it when the current request finishes, keeping the same conversation.
    if (queuedLaunchQuestions.length && !processingLaunchQuestions) {
      void processLaunchQuestions();
    }
  }
}

function addMessage(text, sender, { html = false, fromLaunch = false } = {}) {
  const isAssistant = sender === 'assistant';
  const div = document.createElement('div');
  div.className = `message ${isAssistant ? 'assistant' : 'user'}-message`;
  const body = html ? text : isAssistant ? formatBotMessage(text) : escapeHtml(text);
  div.innerHTML = `<div class="message-content">${isAssistant && !html ? `<div class="chat-markdown">${body}</div>` : body}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (hasUserSentMessage && api) {
    api.saveMessage({ text: fromLaunch ? `[Source: BPAL Help Center --ask]\n${text}` : (html ? div.textContent : text), sender, language: uiLanguage })
      .catch((e) => console.warn('Could not save message:', e));
  }
}

function addTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'message assistant-message typing';
  div.innerHTML = `<div class="message-content">${t().thinking}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

// Keep Expand all / Collapse all for multi-control answers.
// The top Copy button was removed at the user's request. Native text selection
// and the Electron right-click Copy menu continue to work.
function attachAnswerActions(bubble) {
  const expand = bubble.querySelector('.chat-expand-button');
  if (expand) {
    expand.addEventListener('click', () => {
      const details = Array.from(bubble.querySelectorAll('details.chat-feature'));
      const shouldExpand = details.some((item) => !item.open);
      details.forEach((item) => { item.open = shouldExpand; });
      updateExpandButton(bubble);
    });
    bubble.addEventListener('toggle', () => updateExpandButton(bubble), true);
  }
}

function updateExpandButton(bubble) {
  const btn = bubble.querySelector('.chat-expand-button');
  if (!btn) return;
  const items = Array.from(bubble.querySelectorAll('details.chat-feature'));
  btn.hidden = items.length < 2;
  const allOpen = items.length > 0 && items.every((item) => item.open);
  btn.textContent = allOpen
    ? (uiLanguage === 'fr' ? 'Tout réduire' : 'Collapse all')
    : (uiLanguage === 'fr' ? 'Tout développer' : 'Expand all');
}

function scrollAnswerToReadablePosition(bubble) {
  if (!chatMessages || !bubble?.isConnected) return;
  const frame = chatMessages.getBoundingClientRect();
  const rect = bubble.getBoundingClientRect();
  if (rect.height > frame.height * 0.78) {
    chatMessages.scrollTop = Math.max(0, chatMessages.scrollTop + rect.top - frame.top - 14);
  } else {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function renderAssistantMarkdown(container, markdown) {
  // Text is escaped by formatBotMessage before any markup is created.
  container.innerHTML = formatBotMessage(markdown);
  // Group long answers into visual sections with readable spacing.
  let section = null;
  let currentToolbar = false;
  let featureCount = 0;
  const nodes = Array.from(container.childNodes);
  for (const node of nodes) {
    if (node.nodeType === 1 && node.tagName === 'H2') {
      section = document.createElement('section');
      section.className = 'chat-answer-section';
      container.insertBefore(section, node);
      currentToolbar = /toolbar|functions|actions|buttons|boutons|barre d.outils|commandes/i.test(node.textContent);
      featureCount = 0;
    }
    if (section) section.appendChild(node);

    if (currentToolbar && section && node.nodeType === 1 && node.tagName === 'H3') {
      const feature = document.createElement('details');
      feature.className = 'chat-feature';
      feature.open = featureCount < 2;
      featureCount++;
      const summary = document.createElement('summary');
      summary.textContent = node.textContent;
      const body = document.createElement('div');
      body.className = 'chat-feature-body';
      // Append the accordion immediately after the heading being replaced.
      section.replaceChild(feature, node);
      feature.append(summary, body);
    } else if (currentToolbar && section && node.nodeType === 1 && node.tagName !== 'H2') {
      const features = section.querySelectorAll(':scope > details.chat-feature');
      const last = features[features.length - 1];
      if (last && node.parentElement === section) last.querySelector('.chat-feature-body').appendChild(node);
    }
  }
  // Compact consecutive lists of simple field names (e.g., Product Code,
  // Category), even when the model includes explanatory bullets around them.
  container.querySelectorAll('ul').forEach((list) => {
    const children = Array.from(list.children);
    const simple = (item) => item.tagName === 'LI'
      && !item.querySelector('strong, code, ul, ol')
      && item.textContent.trim().length <= 45;
    if (children.length >= 6 && children.every(simple)) {
      list.classList.add('chat-compact-list');
      return;
    }
    const groups = [];
    for (let i = 0; i < children.length;) {
      const type = simple(children[i]);
      let j = i + 1;
      while (j < children.length && simple(children[j]) === type) j++;
      groups.push({ items: children.slice(i, j), compact: type && j - i >= 5 });
      i = j;
    }
    if (!groups.some((g) => g.compact)) return;
    const fragment = document.createDocumentFragment();
    for (const group of groups) {
      const part = document.createElement('ul');
      if (group.compact) part.className = 'chat-compact-list';
      group.items.forEach((item) => part.appendChild(item));
      fragment.appendChild(part);
    }
    list.replaceWith(fragment);
  });
}

// A small, dependency-free renderer for the Markdown formatting used by the BPAL assistant.
// All model-supplied content is HTML-escaped BEFORE adding our own fixed markup.
// It intentionally never executes HTML supplied by the model.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderChatInline(value) {
  // Keep inline code literal; do not interpret markdown inside backticks.
  const pieces = String(value ?? '').split(/(`[^`\n]+`)/g);
  return pieces.map((piece) => {
    if (/^`[^`\n]+`$/.test(piece)) {
      return `<code>${escapeHtml(piece.slice(1, -1))}</code>`;
    }
    return escapeHtml(piece)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  }).join('');
}

function readChatTableCells(line) {
  const value = String(line ?? '').trim();
  if (!value.includes('|')) return null;
  const stripped = value.replace(/^\|/, '').replace(/\|$/, '');
  const cells = stripped.split('|').map((part) => part.trim());
  return cells.length >= 2 ? cells : null;
}

function isChatTableDivider(line) {
  const cells = readChatTableCells(line);
  return !!cells && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isChatBlockStart(lines, index) {
  const line = lines[index] || '';
  return /^\s{0,3}(#{1,6})\s+/.test(line)
    || /^\s*```/.test(line)
    || /^\s*([-*_]\s*){3,}$/.test(line)
    || /^\s{0,3}>\s?/.test(line)
    || /^\s*[-*+]\s+\S/.test(line)
    || /^\s*\d+[.)]\s+\S/.test(line)
    || (index + 1 < lines.length && readChatTableCells(line) && isChatTableDivider(lines[index + 1]));
}

function renderChatTableCards(headers, rows) {
  // BPAL API replies previously generated tables that the chat could not display.
  // Render those as readable labeled cards instead of a narrow pipe-delimited grid.
  return `<div class="chat-table-cards">${rows.map((cells) => {
    if (headers.length === 2) {
      return `<div class="chat-table-card"><div class="chat-table-title">${renderChatInline(cells[0] || '')}</div>`
        + `<div class="chat-table-description">${renderChatInline(cells[1] || '')}</div></div>`;
    }
    return `<div class="chat-table-card">${headers.map((heading, n) => (
      `<div class="chat-table-field"><strong>${renderChatInline(heading)}:</strong> ${renderChatInline(cells[n] || '')}</div>`
    )).join('')}</div>`;
  }).join('')}</div>`;
}

function formatBotMessage(value) {
  const lines = String(value ?? '').replace(/\r\n?/g, '\n').split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    // Fenced code blocks.
    if (/^\s*```/.test(line)) {
      const language = line.trim().slice(3).trim().replace(/[^\w-]/g, '');
      const content = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) content.push(lines[i++]);
      if (i < lines.length) i++;
      result.push(`<pre><code${language ? ` class="language-${language}"` : ''}>${escapeHtml(content.join('\n'))}</code></pre>`);
      continue;
    }

    // Markdown tables become vertically readable label/value cards.
    const headers = readChatTableCells(line);
    if (headers && i + 1 < lines.length && isChatTableDivider(lines[i + 1])) {
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim()) {
        const cells = readChatTableCells(lines[i]);
        if (!cells) break;
        rows.push(cells);
        i++;
      }
      if (rows.length) result.push(renderChatTableCards(headers, rows));
      continue;
    }

    const heading = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const level = Math.min(Math.max(heading[1].length, 2), 4);
      result.push(`<h${level}>${renderChatInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*([-*_]\s*){3,}$/.test(line)) {
      result.push('<hr>');
      i++;
      continue;
    }

    const listMarker = /^\s*(?:([-*+])|(\d+)[.)])\s+(.+)$/.exec(line);
    if (listMarker) {
      const ordered = !!listMarker[2];
      const tag = ordered ? 'ol' : 'ul';
      const entries = [];
      while (i < lines.length) {
        const current = /^\s*(?:([-*+])|(\d+)[.)])\s+(.+)$/.exec(lines[i]);
        if (!current || !!current[2] !== ordered) break;
        entries.push(`<li>${renderChatInline(current[3])}</li>`);
        i++;
      }
      result.push(`<${tag}>${entries.join('')}</${tag}>`);
      continue;
    }

    if (/^\s{0,3}>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s{0,3}>\s?/.test(lines[i])) {
        quote.push(lines[i++].replace(/^\s{0,3}>\s?/, '').trim());
      }
      result.push(`<blockquote>${renderChatInline(quote.join(' '))}</blockquote>`);
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && (paragraph.length === 0 || !isChatBlockStart(lines, i))) {
      paragraph.push(lines[i++].trim());
    }
    if (paragraph.length) result.push(`<p>${renderChatInline(paragraph.join(' '))}</p>`);
    else i++; // Always advance on unfamiliar input.
  }

  return result.join('\n');
}

if (chatInput) {
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      window.sendMessage();
    }
  });
}

// ===== Support card and email (unchanged behaviour) =====
async function sendEmailWithLog() {
  try {
    if (!hasUserSentMessage) {
      return { success: false, error: "can't send an empty chat." };
    }
    const result = await api.createSupportEmail();
    return result.success
      ? { success: true, filePath: result.filePath, filename: result.filename }
      : { success: false, error: result.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleSendEmail() {
  const supportButton = document.querySelector('.support-card-button');
  if (supportButton) {
    supportButton.disabled = true;
    supportButton.innerHTML = '<span class="button-icon">...</span><span>Sending...</span>';
  }
  try {
    const result = await sendEmailWithLog();
    if (result.success) {
      showEmailNotification('Support request sent! Our team will review your conversation and get back to you.', 'success');
      hideSupportCard();
    } else {
      showEmailNotification('Failed to send: ' + result.error, 'error');
    }
  } catch (error) {
    showEmailNotification('Error: ' + error.message, 'error');
  } finally {
    if (supportButton) {
      supportButton.disabled = false;
      supportButton.innerHTML = '<span class="button-icon"></span><span>Contact Support</span>';
    }
  }
}

function showSupportCard() {
  const card = document.getElementById('supportCard');
  if (card) {
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function hideSupportCard() {
  const card = document.getElementById('supportCard');
  if (card) card.style.display = 'none';
}

function showEmailNotification(message, type = 'info') {
  document.querySelector('.email-notification')?.remove();
  const notification = document.createElement('div');
  notification.className = `email-notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

window.handleSendEmail = handleSendEmail;
window.showSupportCard = showSupportCard;
window.hideSupportCard = hideSupportCard;