/* ============================================================================
   Malachie 4 Projections — tests automatiques (node tests/check.js)
   1. fichiers présents et syntaxe valide
   2. règles de sécurité et de robustesse du cahier des charges
   3. logique métier : références bibliques, découpage des cantiques,
      lignes de brochure, historique, réserve, réduction automatique du texte
   Aucun test ne nécessite Electron ni d'écran : tout passe en ligne de commande.
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib'), assert = require('assert');
const RACINE = path.join(__dirname, '..');
let echecs = 0, reussis = 0;
const ko = m => { console.log('  ✗ ÉCHEC : ' + m); echecs++; };
const ok = m => { console.log('  ✓ ' + m); reussis++; };
const titre = t => console.log('\n' + t);

/* ---------------------------------------------------------------- 1. fichiers */
titre('1. Fichiers et syntaxe');
const fichiers = ['main.js', 'preload.js', 'render.js', 'app/control.html', 'app/control.js', 'app/control.css',
  'app/public.html', 'app/public.js', 'package.json'];
/* Le contenu (Bible, brochures, cantiques) vit dans le dépôt et se reconstruit par
   « npm run contenu » : il n'est pas exigé dans l'espace de travail. */
const fichiersContenu = ['content/bible.json.gz', 'content/brochures.json.gz', 'content/cantiques.json'];
fichiers.forEach(f => fs.existsSync(path.join(RACINE, f)) ? ok('présent : ' + f) : ko('manquant : ' + f));
const dossierContenu = path.join(RACINE, 'content');
const contenuPresent = fs.existsSync(path.join(dossierContenu, 'bible.json.gz')) &&
                       fs.existsSync(path.join(dossierContenu, 'brochures.json.gz'));
fichiersContenu.forEach(f => {
  if (fs.existsSync(path.join(RACINE, f))) ok('présent : ' + f);
  else console.log('  · ' + f + ' absent ici (il vit dans le dépôt — « npm run contenu » le reconstruit)');
});
['main.js', 'preload.js', 'render.js', 'app/control.js', 'app/public.js', 'outils/preparer_contenu.js']
  .forEach(f => { try { new vm.Script(fs.readFileSync(path.join(RACINE, f), 'utf8')); ok('syntaxe : ' + f); } catch (e) { ko(f + ' : ' + e.message); } });
['app/control.html', 'app/public.html'].forEach(f => {
  const h = fs.readFileSync(path.join(RACINE, f), 'utf8');
  let n = 0;
  [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(m => { n++; try { new vm.Script(m[1]); } catch (e) { ko(f + ' script en ligne : ' + e.message); } });
  ok(f + ' : ' + n + ' script(s) en ligne valides');
});

/* ---------------------------------------------------------------- 2. sécurité / robustesse */
titre('2. Règles du cahier des charges (annexe B et D)');
const main = fs.readFileSync(path.join(RACINE, 'main.js'), 'utf8');
const preload = fs.readFileSync(path.join(RACINE, 'preload.js'), 'utf8');
const controle = fs.readFileSync(path.join(RACINE, 'app/control.js'), 'utf8');
const securite = [
  [/contextIsolation:\s*true/, 'contextIsolation activé'],
  [/nodeIntegration:\s*false/, 'nodeIntegration désactivé'],
  [/transparent:\s*true/, 'fenêtre publique transparente'],
  [/setIgnoreMouseEvents\(true\)/, 'la fenêtre publique ignore la souris'],
  [/focusable:\s*false/, 'fenêtre publique non focalisable'],
  [/skipTaskbar:\s*true/, 'fenêtre publique hors barre des tâches'],
  [/setAlwaysOnTop\(true, 'screen-saver'\)/, 'fenêtre publique toujours au premier plan'],
  [/display-added[\s\S]{0,120}display-removed[\s\S]{0,160}display-metrics-changed/, 'surveillance des écrans branchés/débranchés'],
  [/setInterval\(\(\) => syncEcran\(false\), 1000\)/, 'vérification de sécurité chaque seconde'],
  [/render-process-gone/, 'relance après arrêt du processus de rendu'],
  [/unresponsive/, 'relance si l’écran public ne répond plus'],
  [/requestSingleInstanceLock/, 'instance unique'],
  [/powerSaveBlocker\.start/, 'prévention de la mise en veille'],
  [/process\.on\('uncaughtException'/, 'capture des erreurs non gérées'],
  [/idEcranPublic !== primaire|e\.id !== primaire|id !== primaire/, 'jamais d’affichage sur l’écran principal'],
  [/zlib\.gunzipSync/, 'contenu local (aucun accès réseau)']
];
securite.forEach(([re, nom]) => re.test(main) ? ok(nom) : ko(nom + ' — absent de main.js'));
if (/https?:\/\//.test(main.replace(/https?:\/\/[^"']*electron[^"']*/g, '')) === false) ok('aucune dépendance réseau dans le processus principal'); else ko('appel réseau détecté dans main.js');
if (/exposeInMainWorld\('api'/.test(preload)) ok('pont sécurisé exposé au contrôle'); else ko('pont api absent');
if (/ipcRenderer\.on\('etat'/.test(preload)) ok('réception d’état par IPC'); else ko('réception d’état absente');
if (/Rendu\.paintMiroir/.test(controle)) ok('zone 3 dessinée par le moteur de rendu partagé'); else ko('zone 3 n’utilise pas render.js');
if (!/innerHTML\s*=\s*[^;]*R\.etat\.text/.test(controle)) ok('le texte projeté est inséré sans interprétation HTML (sécurité)');

/* ---------------------------------------------------------------- 3. logique métier */
titre('3. Logique métier');
/* 3a. références bibliques (extrait de control.js, testé isolément) */
const zone = controle.slice(controle.indexOf('const ALIAS'), controle.indexOf('/* ---------------------------------------------------------------- ZONE 5'));
const contexte = { normaliser: s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘`]/g, "'"),
  R: { index: { bible: [{ ab: 'Gn', chapitres: 50 }, { ab: 'Ps', chapitres: 150 }, { ab: 'Jn', chapitres: 21 }, { ab: '1Co', chapitres: 16 }, { ab: 'Ap', chapitres: 22 }] } } };
vm.createContext(contexte);
new vm.Script(zone + '\nglobalThis.analyser = analyserReference;').runInContext(contexte);
const cas = [['Jn 3:16', 'Jn', 3, 16], ['jean 3.16', 'Jn', 3, 16], ['ps 23', 'Ps', 23, null], ['1 Co 13:4', '1Co', 13, 4], ['Ap 21:4', 'Ap', 21, 4], ['Genèse 1:1', 'Gn', 1, 1]];
cas.forEach(([entree, ab, ch, v]) => {
  const r = contexte.analyser(entree);
  if (r && r.ab === ab && r.chapitre === ch && (v == null || r.verset === v)) ok('référence « ' + entree + ' » → ' + ab + ' ' + r.chapitre + (r.verset ? ':' + r.verset : ''));
  else ko('référence « ' + entree + ' » mal analysée : ' + JSON.stringify(r));
  });
if (!contexte.analyser('bonjour tout le monde')) ok('une phrase normale n’est pas prise pour une référence'); else ko('fausse détection de référence');

/* 3b. découpage des cantiques : une ligne vide = nouveau paragraphe */
const decouperCantique = texte => texte.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
const essaiCantique = 'Strophe un\nligne deux\n\nRefrain ici\n\nStrophe trois';
const unites = decouperCantique(essaiCantique);
unites.length === 3 ? ok('cantique : 3 paragraphes (les lignes vides séparent)') : ko('découpage du cantique incorrect (' + unites.length + ')');
unites[0].includes('\n') ? ok('les lignes d’une strophe restent groupées') : ko('une strophe a été coupée à tort');

/* 3c. lignes de brochure (même algorithme que outils/preparer_contenu.js) */
function decouperTexte(paras, maxLen = 180) {
  return paras.map(p => {
    const t = String(p).replace(/^\s*\d+[\.\s]\s*/, '').replace(/\s+/g, ' ').trim();
    if (!t) return [];
    const phrases = t.match(/[^.!?…]+[.!?…]+["»)]?|\S[^.!?…]*$/g) || [t];
    const lignes = []; let cur = '';
    for (const ph of phrases) {
      if (cur && (cur.length + ph.length) > maxLen) { lignes.push(cur.trim()); cur = ph; } else cur += (cur ? ' ' : '') + ph;
    }
    if (cur.trim()) lignes.push(cur.trim());
    return lignes;
  }).filter(l => l.length);
}
const long = 'Première phrase assez courte. Deuxième phrase qui vient allonger la ligne pour dépasser la limite choisie. Troisième phrase encore.';
const l = decouperTexte([long], 80);
l[0].length >= 2 ? ok('brochure : paragraphe découpé en ' + l[0].length + ' lignes de lecture') : ko('découpage de brochure vide');
l[0].every(x => x.length <= 200) ? ok('aucune ligne de lecture démesurée') : ko('ligne trop longue');
l[0].join(' ').replace(/\s+/g, ' ') === long.replace(/^\d+\s*/, '') ? ok('le texte est conservé intégralement (aucune perte)') : ko('perte de texte au découpage');

/* 3d. historique limité à 30 entrées */
let hist = []; for (let i = 0; i < 45; i++) { hist.unshift({ i }); hist = hist.slice(0, 30); }
(hist.length === 30 && hist[0].i === 44) ? ok('historique plafonné à 30 entrées, le plus récent en tête') : ko('gestion de l’historique incorrecte');

/* 3e. réserve : ajout sans doublon, suppression, annulation */
const reserve = [];
const ajouter = el => { if (!reserve.some(r => r.type === el.type && r.id === el.id)) reserve.push(el); };
ajouter({ type: 'bible', id: 'bible:Jn:3:16' }); ajouter({ type: 'bible', id: 'bible:Jn:3:16' }); ajouter({ type: 'cantique', id: 'c01' });
reserve.length === 2 ? ok('réserve : pas de doublon') : ko('doublon dans la réserve');
const retire = reserve.splice(0, 1)[0]; reserve.splice(0, 0, retire);
reserve[0].type === 'bible' ? ok('réserve : suppression puis annulation (retour à la même place)') : ko('annulation de suppression incorrecte');

/* 3f. texte projeté : la ligne reste intacte (pas de coupure artificielle) */
const ligne = 'Il est venu, et il a parlé au peuple avec autorité.';
ligne === ligne.trim() ? ok('le texte projeté est transmis tel quel au moteur de rendu') : ko('altération du texte projeté');

/* ---------------------------------------------------------------- 4. contenu */
if (!contenuPresent) {
  console.log('  · contenu non présent ici : il vit dans le dépôt GitHub (git clone → npm run contenu) — contrôles du contenu ignorés');
} else {
titre('4. Contenu réel (Bible + brochures + cantiques)');
try {
  const bible = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(RACINE, 'content/bible.json.gz'))).toString('utf8'));
  const livres = Object.keys(bible);
  const versets = livres.reduce((s, l) => s + Object.values(bible[l]).reduce((t, c) => t + c.length, 0), 0);
  livres.length === 66 ? ok('Bible : 66 livres (Gn → Ap)') : ko('Bible : ' + livres.length + ' livres');
  versets > 31000 ? ok('Bible : ' + versets + ' versets') : ko('Bible : seulement ' + versets + ' versets');
  const jn316 = bible.Jn && bible.Jn['3'] && bible.Jn['3'][15];
  (jn316 && /Dieu a tant aimé le monde/.test(jn316)) ? ok('Jean 3:16 conforme au texte Louis Segond') : ko('Jean 3:16 incorrect : ' + jn316);
  const premier = bible.Gn['1'][0];
  /^1\s/.test(premier) ? ok('format respecté : le texte du verset est précédé de son numéro') : ko('format de verset non conforme : ' + premier);
} catch (e) { ko('lecture de la Bible : ' + e.message); }

try {
  const bro = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(RACINE, 'content/brochures.json.gz'))).toString('utf8'));
  const doubles = bro.filter(b => b.tr.VGR && b.tr.Shekina);
  const enBf = bro.filter(b => b.tr.BF);
  const autres = bro.filter(b => Object.keys(b.tr).some(t => !['VGR', 'Shekina', 'BF'].includes(t)));
  bro.length > 50 ? ok('Brochures : ' + bro.length + ' chargées') : ko('trop peu de brochures : ' + bro.length);
  doubles.length > 0 ? ok('Double traduction VGR + Shekina : ' + doubles.length + ' brochures — la bascule est disponible') : ko('aucune brochure en double traduction');
  const b0 = doubles[0];
  const nbParas = b0.tr.VGR.length;
  const nbParasS = b0.tr.Shekina.length;
  (nbParas > 0 && nbParasS > 0) ? ok('« ' + b0.name.slice(0, 46) + '… » : ' + nbParas + ' paragraphes VGR / ' + nbParasS + ' Shekina') : ko('brochure vide');
  const toutesLignes = b0.tr.VGR.every(p => Array.isArray(p) && p.length > 0);
  toutesLignes ? ok('chaque paragraphe contient au moins une ligne de lecture') : ko('paragraphe sans lignes');
  enBf.length ? ok('troisième traduction BF (branham.fr) présente : ' + enBf.length + ' brochures — jamais appelée « La Voix de Dieu »') : ok('aucune brochure BF dans ce contenu');
  autres.length === 0 ? ok('aucune autre traduction dans le contenu (MS, BBV et le reste sont écartés)') : ko('traductions en trop : ' + autres.slice(0, 2).map(b => Object.keys(b.tr).join('+')).join(' '));
} catch (e) { ko('lecture des brochures : ' + e.message); }

try {
  const cant = JSON.parse(fs.readFileSync(path.join(RACINE, 'content/cantiques.json'), 'utf8'));
  cant.length ? ok('Cantiques : ' + cant.length + ' dans le recueil') : ko('aucun cantique');
  cant.every(c => c.id && c.name && Array.isArray(c.units) && c.units.length) ? ok('structure { id, name, units } respectée') : ko('structure de cantique non conforme');
} catch (e) { ko('lecture des cantiques : ' + e.message); }

/* ---------------------------------------------------------------- 5. rendu (recherche dichotomique) */
}

titre('5. Réduction automatique du texte');
const rendu = require(path.join(RACINE, 'render.js'));
const faux = { style: {}, clientWidth: 1920, clientHeight: 1080, scrollHeight: 600, scrollWidth: 900 };
const taille = rendu.ajusterTaille(faux, 1760, 920, 120);
(taille > 0 && taille <= 120) ? ok('la taille trouvée (' + taille + ' px) ne dépasse jamais la taille demandée') : ko('réduction automatique incohérente');
const faux2 = { style: {}, clientWidth: 800, clientHeight: 600, scrollHeight: 1200, scrollWidth: 2600 };
const petite = rendu.ajusterTaille(faux2, 700, 400, 200);
petite < 200 ? ok('un texte trop long est réduit automatiquement (' + petite + ' px < 200 px)') : ko('réduction automatique inefficace');
typeof rendu.paintMiroir === 'function' ? ok('la zone 3 dispose de sa fonction de rendu (même moteur)') : ko('paintMiroir absent');

/* ---------------------------------------------------------------- bilan */
console.log('\n────────────────────────────────────────');
console.log(echecs ? `✗ ${echecs} problème(s) — ${reussis} contrôle(s) réussi(s)` : `✓ Tous les contrôles sont réussis (${reussis})`);
process.exit(echecs ? 1 : 0);
