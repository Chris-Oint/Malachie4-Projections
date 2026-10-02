const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  patch: p => ipcRenderer.send('patch', p),
  send: c => ipcRenderer.send(c),
  onState: cb => ipcRenderer.on('state', (_e, s) => cb(s))
});
