"use strict";
const { contextBridge, ipcRenderer } = require('electron');

// This is the ONLY API available to the web page. The raw ipcRenderer,
// arbitrary channel names, Node.js globals and credentials are not exposed.
// All Electron events are stripped of the native IpcRendererEvent object.
function subscribe(channel, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Callback must be a function');
  }
  const listener = (_event, data) => callback(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('bpal', Object.freeze({
  getChatContext: () => ipcRenderer.invoke('get-chat-context'),
  getChatStatus: () => ipcRenderer.invoke('chat-status'),
  assistantLaunchReady: () => ipcRenderer.invoke('assistant-launch-ready'),
  askChat: ({ message, history = [] } = {}) => {
    if (typeof message !== 'string' || !message.trim() || message.length > 8000) {
      return Promise.reject(new TypeError('Invalid chat message'));
    }
    if (!Array.isArray(history)) {
      return Promise.reject(new TypeError('Invalid chat history'));
    }
    return ipcRenderer.invoke('chat-ask-stream', { message, history });
  },
  saveMessage: ({ text, sender, language } = {}) => {
    if (typeof text !== 'string' || text.length > 100000 ||
        !['assistant', 'user'].includes(sender) ||
        !['en', 'fr'].includes(language)) {
      return Promise.reject(new TypeError('Invalid message log payload'));
    }
    return ipcRenderer.invoke('save-message', { text, sender, language });
  },
  getHelpCenterData: () => ipcRenderer.invoke('get-help-center-data'),
  createSupportEmail: () => ipcRenderer.invoke('create-email-file'),
  onLaunchQuestion: (callback) => subscribe('assistant-launch-question', callback),
  onChatChunk: (callback) => subscribe('chat-chunk', callback),
  onCmsMediaReady: (callback) => subscribe('cms-media-ready', callback),
}));
