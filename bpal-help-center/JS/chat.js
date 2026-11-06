const ipc = window.electron?.ipcRenderer ?? null;

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
  if (!ipc) { addMessage(TEXT.en.noIpc, 'assistant'); return; }

  try {
    const config = await ipc.invoke('get-chat-context');
    uiLanguage = config?.language === 'fr' ? 'fr' : 'en';
    const PLACEHOLDERS = new Set(['default', 'unknown', 'null', 'undefined', '']);
    const clean = (v) => {
      const s = String(v ?? '').trim();
      return PLACEHOLDERS.has(s.toLowerCase()) ? '' : s;
    };
    currentUserId = clean(config?.userId);
    currentUserName = clean(config?.data?.userName);

    const status = await ipc.invoke('chat-status');
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
  if (!assistantInitialized || processingLaunchQuestions || isSending) return;
  processingLaunchQuestions = true;
  try {
    while (queuedLaunchQuestions.length) {
      const question = queuedLaunchQuestions.shift();
      if (typeof window.switchTab === 'function') window.switchTab('chat-tab');
      else document.querySelector('[data-tab="chat-tab"]')?.click();
      // The API answer for this question completes before the next queued one.
      await submitQuestion(question);
    }
  } finally {
    processingLaunchQuestions = false;
  }
}

// Register BEFORE declaring ready so incoming second-instance notifications
// cannot be missed between renderer startup and chat initialization.
if (ipc) {
  ipc.on('assistant-launch-question', (question) => {
    if (typeof question === 'string' && question.trim()) {
      queuedLaunchQuestions.push(question.trim());
      processLaunchQuestions();
    }
  });
}

async function initializeAssistant() {
  await init();
  assistantInitialized = true;
  if (ipc) {
    try {
      const initialQuestions = await ipc.invoke('assistant-launch-ready');
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

async function submitQuestion(message, { retry = false, failedBox = null } = {}) {
  if (!message || !ipc || isSending) return false;

  isSending = true;
  const startedAt = performance.now();
  setInputEnabled(false);
  if (!retry) {
    chatInput.value = '';
    hideSupportCard();
    hasUserSentMessage = true;
    addMessage(message, `${currentUserId}-${currentUserName}`);
  }
  if (failedBox) failedBox.remove();

  const bubble = document.createElement('div');
  bubble.className = 'message assistant-message';
  bubble.innerHTML = `<div class="message-content"><span class="stream-target"></span><span class="stream-cursor">▋</span></div>`;
  chatMessages.appendChild(bubble);
  const target = bubble.querySelector('.stream-target');
  chatMessages.scrollTop = chatMessages.scrollHeight;

  let streamed = '';
  const onChunk = (chunk) => {
    streamed += chunk;
    target.innerHTML = formatBotMessage(streamed);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };
  ipc.on('chat-chunk', onChunk);

  try {
    const result = await ipc.invoke('chat-ask-stream', { message, history: conversationHistory });
    bubble.querySelector('.stream-cursor')?.remove();
    if (!result?.success) throw new Error(result?.error || t().error);

    target.innerHTML = formatBotMessage(result.answer);
    // Distinguish API/IPC latency from time spent updating the UI.
    requestAnimationFrame(() => console.log(
      `[PERFORMANCE] Assistant visible in renderer: ${((performance.now() - startedAt) / 1000).toFixed(3)} seconds`
    ));
    conversationHistory.push({ role: 'user', content: message }, { role: 'assistant', content: result.answer });
    conversationHistory = conversationHistory.slice(-6);
    ipc.invoke('save-message', { text: result.answer, sender: 'assistant', language: uiLanguage })
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
    ipc.removeAllListeners?.('chat-chunk');
    // A second launch can arrive while a manually entered question is in flight.
    // Drain it when the current request finishes, keeping the same conversation.
    if (queuedLaunchQuestions.length && !processingLaunchQuestions) {
      void processLaunchQuestions();
    }
  }
}

function addMessage(text, sender, { html = false } = {}) {
  const isAssistant = sender === 'assistant';
  const div = document.createElement('div');
  div.className = `message ${isAssistant ? 'assistant' : 'user'}-message`;
  const body = html ? text : isAssistant ? formatBotMessage(text) : escapeHtml(text);
  div.innerHTML = `<div class="message-content">${body}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (hasUserSentMessage && ipc) {
    ipc.invoke('save-message', { text: html ? div.textContent : text, sender, language: uiLanguage })
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatBotMessage(text) {
  let html = escapeHtml(text);

  // Headings the model shouldn't have produced → bold line
  html = html.replace(/^#{1,6}\s*(.+)$/gm, '<b>$1</b>');
  // Horizontal rules → nothing
  html = html.replace(/^\s*([-*_]\s*){3,}$/gm, '');
  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>');
  // Bullet markers → bullet character
  html = html.replace(/^\s*[-*]\s+/gm, '• ');

  return html.replace(/\n/g, '<br>');
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
async function getLogFilePath() {
  try {
    const result = await ipc.invoke('get-log-file-path');
    return result.success ? result.path : null;
  } catch (error) {
    console.error('Error getting log path:', error);
    return null;
  }
}

async function sendEmailWithLog(logFilePath) {
  try {
    if (!hasUserSentMessage) return { success: false, error: "can't send an empty chat." };
    const result = await ipc.invoke('create-email-file', {
      subject: 'BPAL Assistant - Support Request',
      attachmentPath: logFilePath,
    });
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
    const result = await sendEmailWithLog(await getLogFilePath());
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