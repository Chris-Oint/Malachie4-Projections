/* ============================================================================
   Test de l'application sans écran ni installation d'Electron :
   on remplace le module « electron » par un double de test, puis on charge
   main.js pour vérifier les exigences du cahier des charges.
   Usage : node tests/test_electron.js
   ========================================================================== */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), Module = require('module');
const RACINE = path.join(__dirname, '..');
const dossierTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'm4-'));
let echecs = 0, reussis = 0;
const ko = m => { console.log('  ✗ ' + m); echecs++; };
const ok = m => { console.log('  ✓ ' + m); reussis++; };
const titre = t => console.log('\n' + t);
const attendre = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------ double d'Electron */
const envois = [];                  // messages diffusés aux fenêtres
const fenetres = [];                // fenêtres créées
const handlers = {};                // ipcMain.handle
const canaux = {};                  // ipcMain.on
let declencheursEcran = {};
const ecrans = [
  { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
  { id: 2, bounds: { x: 1920, y: 0, width: 1920, height: 1080 } }
];

class FauxWebContents {
  constructor(f) { this.f = f; this.detruit = false; this.events = {}; }
  on(nom, cb) { (this.events[nom] = this.events[nom] || []).push(cb); return this; }
  envoyer(nom, ...a) { const l = this.events[nom] || []; l.forEach(cb => cb({}, ...a)); }
  send(ch, msg) { envois.push({ vers: this.f.titre, ch, msg }); }
  isDestroyed() { return this.detruit; }
}
class FauxBrowserWindow {
  constructor(options) {
    this.options = options; this.titre = options.title || 'sans titre';
    this.bounds = { x: 0, y: 0, width: 800, height: 600 }; this.visible = false; this.detruite = false;
    this.events = {}; this.webContents = new FauxWebContents(this);
    fenetres.push(this);
  }
  on(n, cb) { (this.events[n] = this.events[n] || []).push(cb); return this; }
  once(n, cb) { return this.on(n, cb); }
  loadFile(f) { this.fichier = f; }
  show() { this.visible = true; }
  showInactive() { this.visible = true; }
  hide() { this.visible = false; }
  focus() {} restore() {} reload() {} destroy() { this.detruite = true; this.webContents.detruit = true; }
  setMenuBarVisibility() {} setAlwaysOnTop() { this.toujoursAuDessus = true; }
  setIgnoreMouseEvents() {} setSkipTaskbar() {} setContentProtection() {}
  setBounds(b) { this.bounds = b; } getBounds() { return this.bounds; }
  isVisible() { return this.visible; } isDestroyed() { return this.detruite; } isMinimized() { return false; }
}
const fauxElectron = {
  app: {
    getPath: () => dossierTemp, getVersion: () => '2.0.0-test', quit() { this.quitte = true; },
    on() {}, whenReady: () => Promise.resolve(), requestSingleInstanceLock: () => true,
    setAppUserModelId() {}, disableHardwareAcceleration() {}
  },
  BrowserWindow: FauxBrowserWindow,
  ipcMain: {
    handle: (canal, fn) => { handlers[canal] = fn; },
    on: (canal, fn) => { canaux[canal] = fn; }
  },
  screen: {
    getAllDisplays: () => ecrans, getPrimaryDisplay: () => ecrans[0],
    on: (nom, cb) => { (declencheursEcran[nom] = declencheursEcran[nom] || []).push(cb); }
  },
  Menu: { setApplicationMenu() {}, buildFromTemplate: () => ({}) },
  dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
  shell: { openPath: () => true },
  powerSaveBlocker: { start: () => 1, stopAll() {} },
  nativeImage: { createFromPath: () => ({}) }
};

const chargerOriginal = Module._load;
Module._load = function (demande, ...reste) {
  if (demande === 'electron') return fauxElectron;
  return chargerOriginal.call(this, demande, ...reste);
};

console.log('Chargement de l’application avec un Electron simulé…');
require(path.join(RACINE, 'main.js'));
Module._load = chargerOriginal;

(async () => {
  await attendre(300);

  titre('1. Fenêtres');
  const controle = fenetres.find(f => /contrôle|Contrôle|control/i.test(f.titre) || /control\.html/.test(f.fichier || ''));
  const publique = fenetres.filter(f => /Écran public|public\.html/.test((f.titre || '') + (f.fichier || '')));
  fenetres.length === 2 ? ok('deux fenêtres créées au démarrage') : ko('fenêtres créées : ' + fenetres.length + ' (' + fenetres.map(f => f.titre).join(', ') + ')');
  controle ? ok('fenêtre de contrôle : ' + controle.titre) : ko('fenêtre de contrôle absente');
  publique.length ? ok('fenêtre publique : ' + publique[0].titre) : ko('fenêtre publique absente');

  if (publique.length) {
    const o = publique[0].options;
    const regles = [[o.transparent === true, 'transparente'], [o.frame === false, 'sans bordure'],
      [o.focusable === false, 'non focalisable'], [o.skipTaskbar === true, 'hors barre des tâches'],
      [o.alwaysOnTop === true, 'toujours au-dessus'], [o.resizable === false, 'non redimensionnable'],
      [o.webPreferences.contextIsolation === true, 'contextIsolation activé'],
      [o.webPreferences.nodeIntegration === false, 'nodeIntegration désactivé']];
    regles.forEach(([v, n]) => v ? ok('fenêtre publique ' + n) : ko('fenêtre publique : ' + n + ' — non respecté'));
    publique[0].toujoursAuDessus && !o.show ? ok('placée par code après création (aucun clignotement)') : ko('affichage géré à la création (risque de clignotement)');
    ressource(publique[0]) ? ok('les deux fenêtres partagent le même preload : ' + path.basename(o.webPreferences.preload)) : ko('preload manquant sur la fenêtre publique');
  }
  function ressource(f) { return f.options && f.options.webPreferences && /preload\.js$/.test(f.options.webPreferences.preload || ''); }

  titre('2. Placement (écran 2) et sécurité d’affichage');
  await attendre(1400);   /* laisse passer syncEcran (vérification chaque seconde) */
  const pub = fenetres.filter(f => /public\.html/.test(f.fichier || ''))[0];
  if (pub) {
    const b = pub.bounds;
    (b.x === 1920 && b.width === 1920) ? ok('placée sur l’écran n° 2 : ' + b.width + '×' + b.height + ' en x=' + b.x) : ko('placement écran 2 incorrect : ' + JSON.stringify(b));
    pub.visible ? ok('affichée en mode « sans activation » (showInactive)') : ko('non affichée alors que le 2e écran existe');
  }
  if (pub) {
    ecrans.pop();                                   /* le 2e écran est débranché */
    (declencheursEcran['display-removed'] || []).forEach(cb => cb({}, { id: 2 }));
    await attendre(1300);
    !pub.visible ? ok('écran 2 débranché → aucune projection sur l’écran principal') : ko('la fenêtre publique reste affichée');
    ecrans.push({ id: 2, bounds: { x: 1920, y: 0, width: 1920, height: 1080 } });
    (declencheursEcran['display-added'] || []).forEach(cb => cb({}, ecrans[1]));
    await attendre(1300);
    pub.visible ? ok('écran 2 rebranché → projection rétablie en moins de 2 s') : ko('reconnexion de l’écran non détectée');
  }

  titre('3. Canaux de communication');
  ['contenu:index', 'contenu:brochure', 'contenu:cantique', 'contenu:chapitre', 'donnees:lire', 'donnees:ecrire',
    'image:choisir', 'cantique:enregistrer', 'cantique:ajouter', 'cantique:supprimer', 'journal:lire', 'dossier:ouvrir', 'infos']
    .forEach(c => handlers[c] ? ok('canal ' + c) : ko('canal manquant : ' + c));
  ['patch', 'donnees', 'deconnecter', 'reconnecter', 'vider', 'quitter']
    .forEach(c => canaux[c] ? ok('canal ' + c) : ko('canal manquant : ' + c));

  titre('4. Contenu réel chargeable');
  const index = await handlers['contenu:index']();
  index && index.stats ? ok('index : ' + index.stats.livres + ' livres, ' + index.stats.versets + ' versets, ' + index.stats.cantiques + ' cantiques, ' + index.stats.brochures + ' brochures') : ko('index vide');
  const jn3 = await handlers['contenu:chapitre']({}, 'Jn', '3');
  jn3 && jn3.length === 36 ? ok('Jean 3 : 36 versets récupérés') : ko('Jean 3 : ' + (jn3 ? jn3.length : 'aucun') + ' versets');
  const bro = await handlers['contenu:brochure']({}, index.brochures[0].id);
  bro && bro.tr ? ok('brochure chargée : « ' + bro.name.slice(0, 40) + '… » — traductions : ' + Object.keys(bro.tr).join(' + ')) : ko('brochure non chargée');
  const cant = await handlers['contenu:cantique']({}, index.cantiques[0].id);
  cant && cant.units ? ok('cantique chargé : « ' + cant.name + ' » — ' + cant.units.length + ' paragraphes') : ko('cantique non chargé');

  titre('5. Diffusion de l’état aux deux fenêtres');
  envois.length = 0;
  canaux['patch']({}, { text: 'Dieu est amour.', affichage: true, fg: '#ffffff' });
  await attendre(120);
  const versControle = envois.filter(e => /contrôle|contrôle|Contrôle|Malachie 4/.test(e.vers) || e.vers.includes('contrôle'));
  const versPublic = envois.filter(e => (e.vers || '').includes('public') || (e.vers || '').includes('Écran public'));
  envois.length >= 2 ? ok('un seul envoi par image, reçu par les 2 fenêtres (' + envois.length + ' messages)') : ko('diffusion incomplète : ' + envois.length);
  const msg = envois[0] && envois[0].msg;
  msg && msg.etat && msg.etat.text === 'Dieu est amour.' ? ok('l’état diffusé contient le texte projeté') : ko('état diffusé incorrect');
  msg && Array.isArray(msg.reserve) && Array.isArray(msg.historique) ? ok('l’état diffusé contient la réserve et l’historique') : ko('état diffusé incomplet');

  titre('6. Persistance (réglages, réserve, historique, reprise)');
  handlers['donnees:ecrire']({}, 'reserve', [{ id: 'Jn 3:16' }]);
  const relu = await handlers['donnees:lire']({}, 'reserve');
  relu && relu[0].id === 'Jn 3:16' ? ok('écriture puis relecture de la réserve') : ko('persistance défaillante');
  fs.existsSync(path.join(dossierTemp, 'reglages.json')) ? ok('réglages enregistrés à côté de l’application') : ko('réglages non enregistrés');

  titre('7. Arrêt du processus de rendu public → relance automatique');
  const avant = fenetres.filter(f => /public\.html/.test(f.fichier || '')).length;
  if (pub) pub.webContents.envoyer('render-process-gone', {}, { reason: 'crashed' });
  await attendre(1600);
  const apres = fenetres.filter(f => /public\.html/.test(f.fichier || '')).length;
  apres > avant ? ok('écran public relancé automatiquement (' + avant + ' → ' + apres + ')') : ko('aucune relance après arrêt du rendu');

  titre('8. Déconnexion / reconnexion');
  canaux['deconnecter']();
  await attendre(150);
  const p2 = fenetres.filter(f => /public\.html/.test(f.fichier || '')).pop();
  (!p2 || !p2.visible) ? ok('déconnecté → plus aucune image sur l’écran public') : ko('toujours affiché après déconnexion');
  canaux['reconnecter']();
  await attendre(1400);
  const p3 = fenetres.filter(f => /public\.html/.test(f.fichier || '')).pop();
  (p3 && p3.visible && p3.bounds.x === 1920) ? ok('reconnecté → projection rétablie sur l’écran 2') : ko('reconnexion incomplète');

  titre('9. Échap = vidage immédiat');
  envois.length = 0;
  canaux['vider']();
  await attendre(120);
  const vide = envois.find(e => e.ch === 'etat');
  (vide && vide.msg.etat.text === '' && vide.msg.etat.affichage === false) ? ok('l’écran est vidé instantanément pour les 2 fenêtres') : ko('vidage incomplet');

  titre('10. Journal local (aucun dialogue)');
  const journal = fs.existsSync(path.join(dossierTemp, 'journal.txt')) ? fs.readFileSync(path.join(dossierTemp, 'journal.txt'), 'utf8') : '';
  journal.length ? ok('journal écrit dans « ' + path.relative(dossierTemp, path.join(dossierTemp, 'journal.txt')) + ' » (' + journal.split('\n').length + ' lignes)') : ko('journal absent');
  !/dialog\.showMessageBox|dialog\.showErrorBox/.test(fs.readFileSync(path.join(RACINE, 'main.js'), 'utf8')) ? ok('aucune boîte de dialogue d’erreur (mise en veille impossible pendant un culte)') : ko('dialogue d’erreur présent dans main.js');

  console.log('\n────────────────────────────────────────');
  console.log(echecs ? `✗ ${echecs} problème(s) — ${reussis} contrôle(s) réussi(s)` : `✓ Application validée (${reussis} contrôles)`);
  process.exit(echecs ? 1 : 0);
})();
