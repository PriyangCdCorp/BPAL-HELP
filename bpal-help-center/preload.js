const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use the ipcRenderer
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, args) => {
      ipcRenderer.send(channel, args);
    },
    on: (channel, func) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    invoke: (channel, args) => {
      return ipcRenderer.invoke(channel, args);
    }
    ,
        removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});