/* ============================================================================
   Malachie 4 Projections — processus principal (Electron)
   Rôle : SEULE SOURCE DE VÉRITÉ de l'état d'affichage (exigence B).
   Flux unique : action du contrôle -> patch -> processus principal -> état diffusé
                 aux DEUX fenêtres, qui dessinent avec render.js.
   Robuste pour le direct : relance automatique, journal local, aucun dialogue.
   ========================================================================== */
'use strict';
const { app, BrowserWindow, screen, ipcMain, powerSaveBlocker, dialog, shell } = require('electron');
const path = require('path'), fs = require('fs'), zlib = require('zlib');

/* ---------------- mode portable : dossier "donnees" à côté de l'exécutable ---------------- */
const RACINE = path.join(__dirname);
const PORTABLE = fs.existsSync(path.join(RACINE, 'donnees')) || process.env.M4_PORTABLE === '1';
const MODE_SECOURS = process.env.M4_SECOURS === '1' || process.argv.includes('--mode-secours');
if (MODE_SECOURS) { try { app.disableHardwareAcceleration(); } catch (e) {} }
const DOSSIER_DONNEES = PORTABLE ? path.join(RACINE, 'donnees') : null;
const CONTENU = process.env.M4_CONTENU ? path.resolve(process.env.M4_CONTENU) : path.join(RACINE, 'content');

function dossierPersistant() {
  const d = DOSSIER_DONNEES || app.getPath('userData');
  try { fs.mkdirSync(d, { recursive: true }); } catch (e) {}
  return d;
}

/* ---------------- journal d'erreurs local (jamais de boîte de dialogue) ---------------- */
let fichierLog = null;
function journal(...a) {
  try {
    if (!fichierLog) fichierLog = path.join(dossierPersistant(), 'journal.txt');
    const ligne = new Date().toISOString() + '  ' + a.map(x => (x && x.stack) ? x.stack : String(x)).join(' ') + '\n';
    fs.appendFileSync(fichierLog, ligne);
    if (fs.existsSync(fichierLog) && fs.statSync(fichierLog).size > 512 * 1024) {
      fs.writeFileSync(fichierLog, fs.readFileSync(fichierLog).slice(-128 * 1024));
    }
  } catch (e) {}
}
process.on('uncaughtException', e => journal('MAIN uncaughtException', e));
process.on('unhandledRejection', e => journal('MAIN unhandledRejection', e));

/* ---------------- instance unique ---------------- */
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

/* ---------------- état (source de vérité) ---------------- */
const REGLAGES_DEFAUT = {
  affichage: true,          // mode Affichage (fond noir + texte) / transparent
  projection: true,         // fenêtre publique active
  text: '', label: '', mode: 'idle',
  font: 'Georgia, "Times New Roman", serif', size: 120, margin: 80,
  bg: '#000000', fg: '#ffffff', image: '', bold: false, italic: false, shadow: true
};
let etat = Object.assign({}, REGLAGES_DEFAUT, {
  screen: { w: 1920, h: 1080, connected: false, id: null },
  publicWindow: 'cherche'   // 'ok' | 'cherche' | 'deconnecte'
});

/* persistance : réglages / réserve / historique / dernier élément */
function lire(nom, def) {
  try {
    const f = path.join(dossierPersistant(), nom + '.json');
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : def;
  } catch (e) { journal('lecture ' + nom, e); return def; }
}
function ecrire(nom, val) {
  try { fs.writeFileSync(path.join(dossierPersistant(), nom + '.json'), JSON.stringify(val, null, 1)); }
  catch (e) { journal('écriture ' + nom, e); }
}
['reglages', 'reserve', 'historique', 'dernier'].forEach(n => { if (lire(n, null) === null) ecrire(n, n === 'reglages' ? REGLAGES_DEFAUT : (n === 'dernier' ? {} : [])); });
etat = Object.assign({}, lire('reglages', REGLAGES_DEFAUT), { screen: etat.screen, publicWindow: etat.publicWindow });

let fenetreControle = null, fenetrePublique = null, idEcranPublic = null;

/* ---------------- écrans ---------------- */
function ecranPublic() {
  const ecrans = screen.getAllDisplays();
  if (ecrans.length < 2) return null;
  if (idEcranPublic != null) {
    const d = ecrans.find(e => e.id === idEcranPublic);
    if (d) return d;
  }
  const primaire = screen.getPrimaryDisplay().id;
  const autre = ecrans.find(e => e.id !== primaire);
  idEcranPublic = autre ? autre.id : null;
  return autre || null;
}

/* ---------------- diffusion de l'état ---------------- */
let prevu = null;
function diffuser() {
  if (prevu) return;                                  /* un seul envoi par image (exigence vitesse) */
  prevu = setImmediate(() => {
    prevu = null;
    const msg = { etat: etat, reglages: etat, reserve: lire('reserve', []), historique: lire('historique', []), dernier: lire('dernier', {}) };
    for (const w of [fenetreControle, fenetrePublique]) {
      if (w && !w.isDestroyed() && !w.webContents.isDestroyed()) {
        try { w.webContents.send('etat', msg); } catch (e) { journal('diffusion', e); }
      }
    }
  });
}

/* ---------------- fenêtre publique (2e écran) ---------------- */
function creerFenetrePublique() {
  fenetrePublique = new BrowserWindow({
    show: false, frame: false, transparent: true, hasShadow: false, resizable: false,
    movable: false, minimizable: false, maximizable: false, fullscreenable: false,
    focusable: false, skipTaskbar: true, alwaysOnTop: true, acceptFirstMouse: false,
    backgroundColor: '#00000000', title: 'Malachie 4 — Écran public',
    ...(MODE_SECOURS ? { transparent: false, backgroundColor: '#000000' } : {}),
    webPreferences: {
      preload: path.join(RACINE, 'preload.js'), contextIsolation: true, nodeIntegration: false,
      backgroundThrottling: false, spellcheck: false, enableWebSQL: false, sandbox: false
    }
  });
  fenetrePublique.setAlwaysOnTop(true, 'screen-saver');
  fenetrePublique.setIgnoreMouseEvents(true);
  fenetrePublique.setSkipTaskbar(true);
  try { fenetrePublique.setContentProtection(false); } catch (e) {}
  fenetrePublique.loadFile(path.join(RACINE, 'app', 'public.html'));
  fenetrePublique.webContents.on('did-finish-load', () => { journal('écran public prêt'); diffuser(); });
  fenetrePublique.webContents.on('did-fail-load', (e, c, d) => {
    journal('échec chargement écran public', c, d);
    setTimeout(() => { if (fenetrePublique && !fenetrePublique.isDestroyed()) fenetrePublique.loadFile(path.join(RACINE, 'app', 'public.html')); }, 700);
  });
  fenetrePublique.webContents.on('render-process-gone', () => { journal('écran public : processus arrêté, relance'); relancerPublique(); });
  fenetrePublique.webContents.on('unresponsive', () => { journal('écran public bloqué, relance'); relancerPublique(); });
  fenetrePublique.webContents.on('console-message', (e, niveau, message) => { if (niveau >= 3) journal('public console', message); });
  fenetrePublique.on('closed', () => { fenetrePublique = null; if (fenetreControle && !fenetreControle.isDestroyed()) setTimeout(() => { creerFenetrePublique(); syncEcran(true); }, 300); });
  /* aucune fenêtre de dialogue possible sur l'écran public */
  fenetrePublique.webContents.on('will-prevent-unload', e => e.preventDefault());
}
function relancerPublique() {
  try { if (fenetrePublique && !fenetrePublique.isDestroyed()) fenetrePublique.destroy(); } catch (e) {}
  fenetrePublique = null;
  creerFenetrePublique();
  setTimeout(() => syncEcran(true), 500);
}

/* placement, reconnexion, suivi permanent */
function syncEcran(force) {
  if (!fenetrePublique || fenetrePublique.isDestroyed()) creerFenetrePublique();
  const d = ecranPublic();
  const w = fenetrePublique;
  if (!w || w.isDestroyed()) return;

  if (!d || !etat.projection) {                       /* jamais d'affichage sur l'écran principal */
    if (w.isVisible()) w.hide();
    const nouveau = !d ? 'cherche' : 'deconnecte';
    if (etat.publicWindow !== nouveau || etat.screen.connected) {
      etat.publicWindow = nouveau; etat.screen = { w: 0, h: 0, connected: false, id: null };
      diffuser();
    }
    return;
  }
  const b = d.bounds;
  const actuel = w.getBounds();
  const change = force || b.x !== actuel.x || b.y !== actuel.y || b.width !== actuel.width || b.height !== actuel.height;
  if (change) {
    w.setBounds({ x: b.x, y: b.y, width: b.width, height: b.height });
    if (!w.isVisible()) w.showInactive();
    w.setAlwaysOnTop(true, 'screen-saver');
    journal('écran public placé sur', d.id, b.width + 'x' + b.height);
  } else if (!w.isVisible()) {
    w.showInactive();
  }
  if (etat.publicWindow !== 'ok' || etat.screen.connected !== true || etat.screen.w !== b.width || etat.screen.h !== b.height || etat.screen.id !== d.id) {
    etat.publicWindow = 'ok';
    etat.screen = { w: b.width, h: b.height, connected: true, id: d.id };
    diffuser();
  }
}

/* ---------------- service de contenu (chargé en tâche de fond, zéro réseau) ---------------- */
const contenu = { pret: false, bible: {}, cantiques: [], brochures: [], erreur: null, stats: {} };
function lireGz(chemin) { return JSON.parse(zlib.gunzipSync(fs.readFileSync(chemin)).toString('utf8')); }

function chargerContenu() {
  const t0 = Date.now();
  try {
    const fb = path.join(CONTENU, 'bible.json.gz');
    if (fs.existsSync(fb)) contenu.bible = lireGz(fb);
    const fb2 = path.join(CONTENU, 'bible.json');
    if (!Object.keys(contenu.bible).length && fs.existsSync(fb2)) contenu.bible = JSON.parse(fs.readFileSync(fb2, 'utf8'));

    const fc = path.join(CONTENU, 'cantiques.json');
    if (fs.existsSync(fc)) contenu.cantiques = JSON.parse(fs.readFileSync(fc, 'utf8'));
    /* édition des cantiques : les modifications enregistrées dans le logiciel ont priorité */
    const perso = lire('cantiques_perso', {});
    contenu.cantiques = contenu.cantiques.map(c => perso[c.id] ? Object.assign({}, c, perso[c.id]) : c);
    /* cantiques ajoutés par l'utilisateur (importés ou créés) */
    const ajoutes = lire('cantiques_ajoutes', []);
    contenu.cantiques = contenu.cantiques.concat(ajoutes.filter(c => !contenu.cantiques.some(x => x.id === c.id)));

    const fbr = path.join(CONTENU, 'brochures.json.gz');
    if (fs.existsSync(fbr)) contenu.brochures = lireGz(fbr);
    const fbr2 = path.join(CONTENU, 'brochures.json');
    if (!contenu.brochures.length && fs.existsSync(fbr2)) contenu.brochures = JSON.parse(fs.readFileSync(fbr2, 'utf8'));

    contenu.pret = true;
    contenu.stats = {
      livres: Object.keys(contenu.bible).length,
      versets: Object.values(contenu.bible).reduce((s, l) => s + Object.values(l).reduce((t, c) => t + c.length, 0), 0),
      cantiques: contenu.cantiques.length,
      brochures: contenu.brochures.length,
      doubleTraduction: contenu.brochures.filter(b => b.tr && b.tr.VGR && b.tr.Shekina).length,
      branhamFr: contenu.brochures.filter(b => b.tr && b.tr.BF).length,
      ms: Date.now() - t0
    };
    journal('contenu chargé', JSON.stringify(contenu.stats));
  } catch (e) { contenu.erreur = String(e.message || e); journal('chargement contenu', e); }
}

/* envoi au contrôle par morceaux : l'interface s'ouvre tout de suite */
function indexLeger() {
  return {
    stats: contenu.stats, erreur: contenu.erreur,
    cantiques: contenu.cantiques.map(c => ({ id: c.id, name: c.name, units: c.units.length, types: c.types || null })),
    bible: Object.keys(contenu.bible).map(ab => ({ ab, chapitres: Object.keys(contenu.bible[ab]).length })),
    brochures: contenu.brochures.map(b => ({
      id: b.id, code: b.code, name: b.name, year: b.year, tr: Object.keys(b.tr || {}),
      paras: Object.fromEntries(Object.entries(b.tr || {}).map(([k, v]) => [k, v.length])),
      pdf: b.pdf || '', audio: b.audio || '', duree: b.duree || ''
    }))
  };
}

/* ---------------- fenêtre de contrôle ---------------- */
function creerControle() {
  const icone = path.join(RACINE, 'ressources', 'icon.png');
  fenetreControle = new BrowserWindow({
    width: 1480, height: 900, minWidth: 1100, minHeight: 700,
    title: 'Malachie 4 Projections — Poste de contrôle',
    backgroundColor: '#141922', show: false,
    ...(fs.existsSync(icone) ? { icon: icone } : {}),
    webPreferences: { preload: path.join(RACINE, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  fenetreControle.setMenuBarVisibility(false);
  fenetreControle.loadFile(path.join(RACINE, 'app', 'control.html'));
  fenetreControle.once('ready-to-show', () => fenetreControle.show());
  fenetreControle.webContents.on('did-finish-load', () => diffuser());
  fenetreControle.webContents.on('render-process-gone', () => { journal('contrôle : rechargement'); fenetreControle.reload(); });
  fenetreControle.webContents.on('console-message', (e, niveau, message) => { if (niveau >= 3) journal('contrôle console', message); });
  fenetreControle.on('closed', () => { fenetreControle = null; app.quit(); });
}

/* ---------------- messages du contrôle ---------------- */
ipcMain.handle('contenu:index', () => { if (!contenu.pret) chargerContenu(); return indexLeger(); });
ipcMain.handle('contenu:brochure', (e, id) => contenu.brochures.find(b => b.id === id) || null);
ipcMain.handle('contenu:cantique', (e, id) => contenu.cantiques.find(c => c.id === id) || null);
ipcMain.handle('contenu:chapitre', (e, ab, ch) => (contenu.bible[ab] && contenu.bible[ab][ch]) || []);
ipcMain.handle('donnees:lire', (e, nom) => lire(nom, null));
ipcMain.handle('donnees:ecrire', (e, nom, valeur) => { ecrire(nom, valeur); return true; });
ipcMain.handle('image:choisir', async () => {
  const r = await dialog.showOpenDialog({ title: 'Image d’arrière-plan pour la projection', properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] }] });
  if (r.canceled || !r.filePaths.length) return null;
  try {
    const f = r.filePaths[0];
    const ext = path.extname(f).slice(1).toLowerCase().replace('jpg', 'jpeg');
    const b64 = fs.readFileSync(f).toString('base64');
    return 'data:image/' + ext + ';base64,' + b64;
  } catch (e) { journal('image choisie', e); return null; }
});
ipcMain.handle('cantique:enregistrer', (e, id, modif) => {
  const i = contenu.cantiques.findIndex(c => c.id === id);
  if (i >= 0) contenu.cantiques[i] = Object.assign({}, contenu.cantiques[i], modif);
  const perso = lire('cantiques_perso', {});
  perso[id] = Object.assign({}, perso[id], modif);
  ecrire('cantiques_perso', perso);
  return contenu.cantiques[i] || null;
});
ipcMain.handle('cantique:ajouter', (e, cantique) => {
  if (!cantique || !cantique.id) return null;
  const ajoutes = lire('cantiques_ajoutes', []).filter(c => c.id !== cantique.id);
  ajoutes.push(cantique); ecrire('cantiques_ajoutes', ajoutes);
  contenu.cantiques = contenu.cantiques.filter(c => c.id !== cantique.id).concat([cantique]);
  return cantique;
});
ipcMain.handle('cantique:supprimer', (e, id) => {
  ecrire('cantiques_ajoutes', lire('cantiques_ajoutes', []).filter(c => c.id !== id));
  const perso = lire('cantiques_perso', {}); delete perso[id]; ecrire('cantiques_perso', perso);
  contenu.cantiques = contenu.cantiques.filter(c => c.id !== id);
  return true;
});
ipcMain.handle('journal:lire', () => { try { const f = path.join(dossierPersistant(), 'journal.txt'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').slice(-20000) : ''; } catch (e) { return ''; } });
ipcMain.handle('dossier:ouvrir', () => { shell.openPath(dossierPersistant()); return true; });
ipcMain.handle('infos', () => ({ version: app.getVersion(), portable: PORTABLE, dossier: dossierPersistant(), contenu: CONTENU }));

ipcMain.on('patch', (e, p) => {
  const avant = etat;
  etat = Object.assign({}, etat, p);
  if (p && ('font' in p || 'size' in p || 'margin' in p || 'bg' in p || 'fg' in p || 'image' in p || 'bold' in p || 'italic' in p || 'affichage' in p || 'projection' in p)) {
    ecrire('reglages', {
      affichage: etat.affichage, projection: etat.projection, font: etat.font, size: etat.size,
      margin: etat.margin, bg: etat.bg, fg: etat.fg, image: etat.image, bold: etat.bold, italic: etat.italic, shadow: etat.shadow
    });
  }
  if (p && 'projection' in p && p.projection !== avant.projection) syncEcran(true);
  diffuser();
});
ipcMain.on('donnees', (e, nom, valeur) => { ecrire(nom, valeur); });
ipcMain.on('deconnecter', () => { etat.projection = false; ecrire('reglages', Object.assign({}, etat, { screen: undefined })); if (fenetrePublique && !fenetrePublique.isDestroyed()) fenetrePublique.hide(); etat.publicWindow = 'deconnecte'; diffuser(); });
ipcMain.on('reconnecter', () => { etat.projection = true; idEcranPublic = null; syncEcran(true); diffuser(); });
ipcMain.on('vider', () => { etat.text = ''; etat.label = ''; etat.mode = 'idle'; etat.affichage = false; diffuser(); });
ipcMain.on('quitter', () => app.quit());

/* ---------------- démarrage ---------------- */
app.whenReady().then(() => {
  powerSaveBlocker.start('prevent-display-sleep');    // jamais de veille pendant le culte
  try { powerSaveBlocker.start('prevent-app-suspension'); } catch (e) {}
  chargerContenu();                                   // jamais sur le thread de rendu
  creerControle();
  creerFenetrePublique();
  syncEcran(true);
  ['display-added', 'display-removed', 'display-metrics-changed'].forEach(ev => screen.on(ev, () => { idEcranPublic = null; syncEcran(true); }));
  setInterval(() => syncEcran(false), 1000);          // vérification de sécurité chaque seconde
  setInterval(() => { diffuser(); }, 5000);           // filet de sécurité : état toujours à jour
  app.on('second-instance', () => { if (fenetreControle) { if (fenetreControle.isMinimized()) fenetreControle.restore(); fenetreControle.focus(); } });
  app.on('window-all-closed', () => app.quit());
});
app.on('before-quit', () => { try { powerSaveBlocker.stopAll ? null : null; } catch (e) {} });
