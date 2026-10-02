const { app, BrowserWindow, screen, ipcMain, powerSaveBlocker } = require('electron');
const path = require('path'), fs = require('fs');
const log = (...a) => { try { fs.appendFileSync(path.join(app.getPath('userData'), 'log.txt'), new Date().toISOString() + ' ' + a.join(' ') + '\n'); } catch {} };
process.on('uncaughtException', e => log('main', e.stack));
if (!app.requestSingleInstanceLock()) app.quit();

let control, pub;
const state = { text: '', label: '', affichage: true, font: 'Arial', size: 120, margin: 80, bg: '#000000', fg: '#ffffff', screen: { w: 1920, h: 1080, connected: false } };

function publicDisplay() {
  const prim = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().find(d => d.id !== prim) || null;
}
function broadcast() {
  for (const w of [control, pub]) if (w && !w.isDestroyed()) w.webContents.send('state', state);
}
function createPublic() {
  pub = new BrowserWindow({ show: false, frame: false, transparent: true, hasShadow: false, resizable: false, movable: false,
    focusable: false, skipTaskbar: true, alwaysOnTop: true, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  pub.setAlwaysOnTop(true, 'screen-saver');
  pub.setIgnoreMouseEvents(true);
  pub.loadFile('public.html');
  pub.webContents.on('did-finish-load', broadcast);
  pub.webContents.on('did-fail-load', () => setTimeout(() => !pub.isDestroyed() && pub.loadFile('public.html'), 500));
  pub.on('unresponsive', () => { log('public bloquée, relance'); pub.destroy(); createPublic(); syncScreen(true); });
  pub.webContents.on('console-message', (_e, lvl, msg) => lvl >= 3 && log('public', msg));
  pub.webContents.on('render-process-gone', () => { log('public crash, relance'); pub.destroy(); createPublic(); syncScreen(true); });
}
function syncScreen(force) {
  const d = publicDisplay();
  if (!pub || pub.isDestroyed()) createPublic();
  if (!d) {                                   // jamais d'affichage sur l'écran principal
    if (state.screen.connected || force) { state.screen.connected = false; pub.hide(); broadcast(); }
    return;
  }
  const b = d.bounds, cur = pub.getBounds();
  const changed = b.x !== cur.x || b.y !== cur.y || b.width !== cur.width || b.height !== cur.height;
  if (changed || !pub.isVisible() || force) { pub.setBounds(b); pub.showInactive(); pub.setAlwaysOnTop(true, 'screen-saver'); }
  if (!state.screen.connected || state.screen.w !== b.width || state.screen.h !== b.height) {
    state.screen = { w: b.width, h: b.height, connected: true }; broadcast();
  }
}
app.whenReady().then(() => {
  powerSaveBlocker.start('prevent-display-sleep');
  control = new BrowserWindow({ width: 1400, height: 850, title: 'Malachie 4 Projections', backgroundColor: '#1b1f27',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  control.setMenuBarVisibility(false);
  control.loadFile('control.html');
  control.webContents.on('did-finish-load', broadcast);
  control.on('closed', () => app.quit());
  control.webContents.on('render-process-gone', () => { log('contrôle crash, rechargement'); control.reload(); });
  control.webContents.on('console-message', (_e, lvl, msg) => lvl >= 3 && log('controle', msg));
  app.on('second-instance', () => { if (control.isMinimized()) control.restore(); control.focus(); });
  createPublic(); syncScreen(true);
  ['display-added', 'display-removed', 'display-metrics-changed'].forEach(e => screen.on(e, () => syncScreen()));
  setInterval(syncScreen, 1000);              // vérification de sécurité
  ipcMain.on('patch', (_e, p) => { Object.assign(state, p); broadcast(); });
  ipcMain.on('disconnect', () => { if (pub && !pub.isDestroyed()) pub.hide(); state.screen.connected = false; broadcast(); });
  ipcMain.on('reconnect', () => syncScreen(true));
});
