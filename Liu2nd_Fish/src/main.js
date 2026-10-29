'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, WebContentsView, ipcMain, dialog, nativeImage, Menu, Tray, globalShortcut, screen } = require('electron');
const { normalizeConfig, normalizeUrl, mergePatch } = require('./core/config');
const { layoutFor } = require('./core/layout');
const { DEFAULT_SHORTCUTS, applyShortcut } = require('./core/shortcuts');

let mainWindow;
let editorWindow;
let browserView;
let tray;
let settings;
let saveTimer;
let quitting = false;
let latestBrowserUrl = '';
let recordingShortcuts = false;
let shortcutStatus = {};
const SHORTCUT_CALLBACKS = { toggleWindow: toggleMain, toggleMute, openSettings };
const statePath = () => path.join(app.getPath('userData'), 'settings.json');
const defaultSkinPath = () => path.join(__dirname, '..', 'assets', 'default-skin.png');

function writeSettingsSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(statePath(), JSON.stringify(settings, null, 2), 'utf8');
  }, 250);
}
function readSettings() {
  try { return normalizeConfig(JSON.parse(fs.readFileSync(statePath(), 'utf8'))); }
  catch { return normalizeConfig(); }
}
function windowState() {
  return { ...settings, currentUrl: latestBrowserUrl || settings.url, shortcutStatus };
}
function sendAll(topic, payload) {
  for (const win of [mainWindow, editorWindow]) {
    if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.send(topic, payload);
  }
}
function broadcastState() { sendAll('fish:state', windowState()); }
function isTrusted(event) {
  return !![mainWindow, editorWindow].find(win => win && !win.isDestroyed() && event.sender === win.webContents);
}
function updateLayout() {
  if (!mainWindow || mainWindow.isDestroyed() || !browserView) return;
  const [width, height] = mainWindow.getContentSize();
  const layout = layoutFor(width, height, settings);
  browserView.setBounds(layout.browser);
  mainWindow.webContents.send('fish:layout', layout);
}
function applyWindowSettings() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setAlwaysOnTop(settings.window.alwaysOnTop);
  try { mainWindow.setOpacity(settings.window.opacity); } catch { /* platform may not support opacity */ }
  updateLayout();
  setMuted(mainWindow.isVisible() ? settings.muted : (settings.muted || settings.muteOnHide));
}
function setMuted(muted) {
  if (browserView && !browserView.webContents.isDestroyed()) browserView.webContents.setAudioMuted(muted);
}
function showMain() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show();
  mainWindow.focus();
  setMuted(settings.muted);
}
function hideMain() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (settings.muteOnHide) setMuted(true);
  mainWindow.hide();
}
function toggleMain() { mainWindow && mainWindow.isVisible() ? hideMain() : showMain(); }
function toggleMute() {
  settings = mergePatch(settings, { muted: !settings.muted });
  if (browserView && !browserView.webContents.isDestroyed()) {
    setMuted(settings.muted || (mainWindow && !mainWindow.isVisible() && settings.muteOnHide));
  }
  writeSettingsSoon(); broadcastState(); updateTray();
}
function shortcutText(action) { return settings.shortcuts[action] || '未设置'; }
function updateTray() {
  if (!tray || tray.isDestroyed()) return;
  tray.setToolTip('Liu2nd_Fish · ' + shortcutText('toggleWindow') + ' 显示/隐藏');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 / 隐藏 (' + shortcutText('toggleWindow') + ')', click: toggleMain },
    { label: (settings.muted ? '取消静音' : '网页静音') + ' (' + shortcutText('toggleMute') + ')', click: toggleMute },
    { label: '皮肤、网页及快捷键设置 (' + shortcutText('openSettings') + ')', click: openEditor },
    { type: 'separator' },
    { label: '退出 Liu2nd_Fish', click: () => { quitting = true; app.quit(); } }
  ]));
}
function registerShortcuts() {
  // Electron returns false if another application owns a key combination.
  globalShortcut.unregisterAll();
  shortcutStatus = {};
  for (const action of Object.keys(DEFAULT_SHORTCUTS)) {
    const value = settings.shortcuts[action];
    if (!value) { shortcutStatus[action] = { registered:false, message:'已停用' }; continue; }
    let ok = false;
    try { ok = globalShortcut.register(value, SHORTCUT_CALLBACKS[action]); }
    catch (error) { console.warn('Shortcut error:', action, error.message); }
    shortcutStatus[action] = { registered:ok, message:ok ? '已生效' : '被系统或其他软件占用' };
  }
  updateTray(); broadcastState();
}
function stopRecordingShortcuts() {
  if (!recordingShortcuts) return;
  recordingShortcuts = false;
  registerShortcuts();
}


function openEditor() {
  if (editorWindow && !editorWindow.isDestroyed()) { editorWindow.show(); editorWindow.focus(); return; }
  editorWindow = new BrowserWindow({
    title: 'Liu2nd_Fish · 软件设置', width: 930, height: 820,
    minWidth: 740, minHeight: 640,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true }
  });
  editorWindow.setMenuBarVisibility(false);
  editorWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  editorWindow.webContents.on('will-navigate', (e) => e.preventDefault());
  editorWindow.loadFile(path.join(__dirname, 'ui', 'editor.html'));
  editorWindow.webContents.on('did-finish-load', () => {
    editorWindow && !editorWindow.isDestroyed() && editorWindow.webContents.send('fish:state', windowState());
  });
  editorWindow.on('closed', () => { editorWindow = null; stopRecordingShortcuts(); });
}
function installTray() {
  try {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon.png')));
    updateTray();
    tray.on('double-click', toggleMain);
  } catch (error) {
    console.error('System tray unavailable:', error.message);
    tray = null;
  }
}
function createBrowserView() {
  browserView = new WebContentsView({
    webPreferences: {
      partition: 'persist:liu2nd-fish-browser',
      nodeIntegration: false, contextIsolation: true, sandbox: true,
      webSecurity: true, allowRunningInsecureContent: false
    }
  });
  mainWindow.contentView.addChildView(browserView);
  const wc = browserView.webContents;
  const ses = wc.session;
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  wc.setWindowOpenHandler(({ url }) => {
    try { const safeUrl = normalizeUrl(url); wc.loadURL(safeUrl).catch(() => {}); }
    catch { /* deny non-HTTP popup URLs */ }
    return { action: 'deny' };
  });
  wc.on('will-navigate', (event, navigation) => {
    try { normalizeUrl(navigation.url); } catch { event.preventDefault(); }
  });
  wc.on('did-navigate', (_event, url) => { latestBrowserUrl = url; sendAll('fish:browser', { url, status:'完成' }); });
  wc.on('did-navigate-in-page', (_event, url, isMainFrame) => {
    if (isMainFrame) { latestBrowserUrl = url; sendAll('fish:browser', { url, status:'完成' }); }
  });
  wc.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.control && input.key.toLowerCase() === 'l') {
      event.preventDefault();
      mainWindow.webContents.send('fish:focus-address');
    }
  });
  wc.on('did-start-loading', () => sendAll('fish:browser', { status:'正在加载…' }));
  wc.on('did-stop-loading', () => sendAll('fish:browser', { status:'完成', url:wc.getURL() }));
  wc.on('did-fail-load', (_event, errorCode, description, url, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) sendAll('fish:browser', { status:`加载失败：${description}`, url });
  });
  wc.loadURL(settings.url).catch(err => sendAll('fish:browser', { status:'无法加载：' + err.message }));
}
function createMainWindow() {
  const opts = {
    title:'Liu2nd_Fish', width:settings.window.width, height:settings.window.height,
    minWidth:290, minHeight:290, frame:false, resizable:true, show:false,
    backgroundColor:'#f5f5f5', autoHideMenuBar:true,
    icon:path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload:path.join(__dirname, 'preload.js'),
      nodeIntegration:false, contextIsolation:true, sandbox:true, webSecurity:true
    }
  };
  if (settings.window.x !== null && settings.window.y !== null) {
    const bounds = { x:settings.window.x, y:settings.window.y, width:opts.width, height:opts.height };
    const visible = screen.getAllDisplays().some(d => {
      const b = d.workArea;
      return bounds.x + bounds.width >= b.x + 80 && bounds.x <= b.x + b.width - 80 &&
             bounds.y + bounds.height >= b.y + 80 && bounds.y <= b.y + b.height - 80;
    });
    if (visible) { opts.x = bounds.x; opts.y = bounds.y; }
  }
  mainWindow = new BrowserWindow(opts);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault());
  mainWindow.loadFile(path.join(__dirname, 'ui', 'main.html'));
  createBrowserView();
  mainWindow.once('ready-to-show', () => { mainWindow.show(); applyWindowSettings(); });
  mainWindow.webContents.on('did-finish-load', () => {
    broadcastState(); updateLayout();
  });
  mainWindow.on('resize', () => {
    updateLayout();
    const [width, height] = mainWindow.getSize();
    settings.window.width = width; settings.window.height = height; writeSettingsSoon();
  });
  mainWindow.on('move', () => {
    const [x, y] = mainWindow.getPosition();
    settings.window.x = x; settings.window.y = y; writeSettingsSoon();
  });
  mainWindow.on('close', (event) => {
    if (!quitting && tray) { event.preventDefault(); hideMain(); }
  });
  mainWindow.on('closed', () => { mainWindow = null; browserView = null; });
}
function readSkinData() {
  const p = settings.skinPath || defaultSkinPath();
  try {
    const stat = fs.statSync(p);
    if (stat.size > 15*1024*1024) throw new Error('图片不能超过 15 MB');
    const ext = path.extname(p).toLowerCase();
    const mime = { '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp' }[ext];
    if (!mime) throw new Error('请使用 PNG/JPG/WebP');
    return { data:`data:${mime};base64,${fs.readFileSync(p).toString('base64')}`, name:path.basename(p) };
  } catch {
    const p2 = defaultSkinPath();
    return { data:`data:image/png;base64,${fs.readFileSync(p2).toString('base64')}`, name:'默认皮肤' };
  }
}
function registerIPC() {
  ipcMain.handle('fish:get-state', (event) => {
    if (!isTrusted(event)) throw new Error('非法界面请求');
    return windowState();
  });
  ipcMain.handle('fish:get-skin', (event) => {
    if (!isTrusted(event)) throw new Error('非法界面请求');
    return readSkinData();
  });
  ipcMain.handle('fish:pick-skin', async (event) => {
    if (!isTrusted(event)) throw new Error('非法界面请求');
    const owner = editorWindow && !editorWindow.isDestroyed() ? editorWindow : mainWindow;
    const choice = await dialog.showOpenDialog(owner, {
      title:'选择弹窗广告皮肤', properties:['openFile'],
      filters:[{ name:'图片文件', extensions:['png','jpg','jpeg','webp'] }]
    });
    if (choice.canceled || !choice.filePaths?.[0]) return { cancelled:true };
    const file = choice.filePaths[0];
    if (fs.statSync(file).size > 15*1024*1024) throw new Error('图片大小不能超过 15 MB');
    const picture = nativeImage.createFromPath(file);
    if (picture.isEmpty()) throw new Error('图片无法解码，请换一张 PNG/JPG/WebP');
    const { width, height } = picture.getSize();
    if (!width || !height || width > 4096 || height > 4096) throw new Error('图片长宽须在 1 至 4096 像素之间');
    // Copy user-selected skin to app data so moving/deleting the source file is safe.
    const ext = path.extname(file).toLowerCase();
    const targetDir = path.join(app.getPath('userData'), 'skins');
    fs.mkdirSync(targetDir, { recursive:true });
    const target = path.join(targetDir, 'custom-skin' + ext);
    if (path.resolve(file) !== path.resolve(target)) fs.copyFileSync(file, target);
    const oldWidth = settings.designWidth, oldHeight = settings.designHeight;
    const resizedBrowser = {
      x:Math.round(settings.browser.x * width/oldWidth),
      y:Math.round(settings.browser.y * height/oldHeight),
      width:Math.round(settings.browser.width * width/oldWidth),
      height:Math.round(settings.browser.height * height/oldHeight)
    };
    settings = mergePatch(settings, { skinPath:target, designWidth:width, designHeight:height, browser:resizedBrowser });
    applyWindowSettings(); writeSettingsSoon(); broadcastState();
    return { cancelled:false, ...readSkinData() };
  });
  ipcMain.handle('fish:navigate', async (event, url) => {
    if (!isTrusted(event)) throw new Error('非法界面请求');
    const address = normalizeUrl(url);
    settings = mergePatch(settings, { url:address });
    writeSettingsSoon(); broadcastState();
    try { await browserView.webContents.loadURL(address); return { ok:true, url:address }; }
    catch (error) { return { ok:false, error:error.message }; }
  });
  ipcMain.handle('fish:patch', (event, patch) => {
    if (!isTrusted(event)) throw new Error('非法界面请求');
    settings = mergePatch(settings, patch);
    if (patch && patch.window && (patch.window.width !== undefined || patch.window.height !== undefined)) {
      mainWindow.setSize(settings.window.width, settings.window.height);
    }
    applyWindowSettings(); writeSettingsSoon(); broadcastState(); updateTray();
    return windowState();
  });
  ipcMain.handle('fish:shortcut-capture', (event, active) => {
    if (!editorWindow || event.sender !== editorWindow.webContents) throw new Error('只能在设置窗口修改快捷键');
    if (typeof active !== 'boolean') throw new Error('录制状态错误');
    if (active && !recordingShortcuts) {
      recordingShortcuts = true;
      globalShortcut.unregisterAll();
    } else if (!active) stopRecordingShortcuts();
    return { recording:recordingShortcuts };
  });
  ipcMain.handle('fish:set-shortcut', (event, action, value) => {
    if (!editorWindow || event.sender !== editorWindow.webContents) throw new Error('只能在设置窗口修改快捷键');
    const updated = applyShortcut(settings, action, value);
    const shortcut = updated[action];
    if (shortcut !== settings.shortcuts[action] && shortcut) {
      // Probe first. If occupied, keep the old saved binding unchanged.
      let available = false;
      try { available = globalShortcut.register(shortcut, SHORTCUT_CALLBACKS[action]); }
      catch { /* unavailable binding */ }
      if (!available) {
        stopRecordingShortcuts();
        throw new Error('快捷键 ' + shortcut + ' 已被系统或其他应用占用，请换一个');
      }
      globalShortcut.unregister(shortcut);
    }
    settings.shortcuts = updated;
    recordingShortcuts = false;
    registerShortcuts();
    writeSettingsSoon();
    const status = shortcutStatus[action];
    return { state: windowState(), ok:(!shortcut || status.registered), message:status.message };
  });
  ipcMain.handle('fish:action', (event, action) => {
    if (!isTrusted(event)) throw new Error('非法界面请求');
    if (action === 'settings') openEditor();
    else if (action === 'mute') toggleMute();
    else if (action === 'hide' || action === 'close') hideMain();
    else if (action === 'minimize') mainWindow.minimize();
    else if (action === 'show') showMain();
    else if (action === 'back' && browserView.webContents.navigationHistory.canGoBack()) browserView.webContents.navigationHistory.goBack();
    else if (action === 'forward' && browserView.webContents.navigationHistory.canGoForward()) browserView.webContents.navigationHistory.goForward();
    else if (action === 'reload') browserView.webContents.reload();
    else if (action === 'quit') { quitting = true; app.quit(); }
    return true;
  });
}
app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('com.liu2nd.fish');
  settings = readSettings();
  registerIPC(); createMainWindow(); installTray(); registerShortcuts();
  app.on('activate', () => { if (mainWindow) showMain(); else createMainWindow(); });
});
app.on('before-quit', () => {
  quitting = true;
  if (saveTimer) clearTimeout(saveTimer);
  if (settings) {
    try { fs.mkdirSync(app.getPath('userData'), { recursive:true }); fs.writeFileSync(statePath(), JSON.stringify(settings,null,2)); }
    catch (error) { console.error('Config save failed:', error); }
  }
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin' && !tray) app.quit(); });
