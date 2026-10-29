'use strict';
const { contextBridge, ipcRenderer } = require('electron');
function listen(name, callback) {
  if (typeof callback !== 'function') return () => {};
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(name, listener);
  return () => ipcRenderer.removeListener(name, listener);
}
contextBridge.exposeInMainWorld('fish', {
  getState: () => ipcRenderer.invoke('fish:get-state'),
  getSkin: () => ipcRenderer.invoke('fish:get-skin'),
  navigate: (url) => ipcRenderer.invoke('fish:navigate', url),
  patch: (patch) => ipcRenderer.invoke('fish:patch', patch),
  pickSkin: () => ipcRenderer.invoke('fish:pick-skin'),
  setShortcut: (action, shortcut) => ipcRenderer.invoke('fish:set-shortcut', action, shortcut),
  captureShortcuts: (active) => ipcRenderer.invoke('fish:shortcut-capture', active),
  action: (action) => ipcRenderer.invoke('fish:action', action),
  onState: (cb) => listen('fish:state', cb),
  onLayout: (cb) => listen('fish:layout', cb),
  onBrowser: (cb) => listen('fish:browser', cb),
  onFocusAddress: (cb) => listen('fish:focus-address', cb)
});
