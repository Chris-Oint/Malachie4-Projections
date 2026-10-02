/* ============================================================================
   Vérifie la règle de collection demandée :
     · trois traductions seulement — VGR (officiel), Shekinah, BF (branham.fr) ;
     · MS, BBV et le reste ont disparu de l'index ET de la bibliothèque ;
     · les textes de BF ne sont présents que s'ils sont les seuls traducteurs ;
     · l'interface propose bien les trois filtres et ouvre une brochure BF.
   Usage : node tests/test_collection.mjs   (serveur local sur le port 8080)
   ========================================================================== */
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import http from 'node:http';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://127.0.0.1:8080/';
let echecs = 0, reussis = 0;
const ko = m => { console.log('  ✗ ' + m); echecs++; };
const ok = m => { console.log('  ✓ ' + m); reussis++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function nodeFetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: opts.method || 'GET' }, res => {
      resolve(new Response(Readable.toWeb(res), { status: res.statusCode, headers: res.headers }));
    });
    req.on('error', reject); req.end();
  });
}

/* ---------------------------------------------------------- 1. l'index */
console.log('1. Contenu de la collection (data/index.json)');
const idx = JSON.parse(fs.readFileSync(join(RACINE, 'data', 'index.json'), 'utf8'));
const parTrad = {};
idx.sermons.forEach(s => parTrad[s.trad] = (parTrad[s.trad] || 0) + 1);
const total = idx.sermons.length;
console.log('   répartition :', JSON.stringify(parTrad));

total === 1620 ? ok('1 620 textes exactement') : ko('total : ' + total + ' (attendu 1 620)');
parTrad['SHP'] === 1210 ? ok('Shekinah : 1 210 (tous conservés)') : ko('Shekinah : ' + parTrad['SHP']);
parTrad['VGR-OFF'] === 399 ? ok('La Voix de Dieu (VGR officiel) : 399') : ko('VGR : ' + parTrad['VGR-OFF']);
parTrad['BF'] === 11 ? ok('BF (branham.fr) : 11 — uniquement celles traduites par cette seule source') : ko('BF : ' + parTrad['BF']);
const intruses = Object.keys(parTrad).filter(t => !['SHP', 'VGR-OFF', 'BF'].includes(t));
intruses.length === 0 ? ok('aucune autre traduction (MS, BBV… toutes retirées)') : ko('traductions présentes en trop : ' + intruses.join(', '));

const codes = {};
idx.sermons.forEach(s => (codes[s.code] = codes[s.code] || []).push(s.trad));
const bfDoublons = Object.entries(codes).filter(([, t]) => t.includes('BF') && t.some(x => x !== 'BF'));
bfDoublons.length === 0 ? ok('aucune brochure BF en double d’une autre traduction') : ko('doublons BF : ' + bfDoublons.map(([c]) => c).join(', '));
idx.nomenclature && idx.nomenclature.BF ? ok('nomenclature inscrite dans l’index : ' + idx.nomenclature.BF) : ko('nomenclature absente');
idx.vgr_officiel.count === 399 ? ok('index marque 399 brochures officielles VGR') : ko('vgr_officiel.count = ' + idx.vgr_officiel.count);

/* ---------------------------------------------------------- 2. les fichiers */
console.log('\n2. Fichiers de la bibliothèque');
let manquants = [], restes = [];
for (const s of idx.sermons) {
  const f = join(RACINE, 'data', s.dir || 'sermons', s.id + '.json.gz');
  if (!fs.existsSync(f)) manquants.push(s.id);
}
manquants.length === 0 ? ok('les 1 620 textes ont leur fichier') : ko(manquants.length + ' fichier(s) manquant(s) : ' + manquants.slice(0, 3).join(', '));
const dossierSermons = join(RACINE, 'data', 'sermons');
if (fs.existsSync(dossierSermons)) {
  const dansIndex = new Set(idx.sermons.map(s => s.id + '.json.gz'));
  fs.readdirSync(dossierSermons).forEach(f => { if (!dansIndex.has(f)) restes.push(f); });
}
restes.length === 0 ? ok('aucun fichier orphelin (MS/BBV entièrement retirés)') : ko(restes.length + ' fichier(s) en trop : ' + restes.slice(0, 3).join(', '));

/* ---------------------------------------------------------- 3. l'interface */
console.log('\n3. Interface de consultation');
const vc = new VirtualConsole();
const erreurs = [];
vc.on('jsdomError', e => erreurs.push(e.message));
const dom = new JSDOM(fs.readFileSync(join(RACINE, 'index.html'), 'utf8'), {
  url: BASE, runScripts: 'dangerously', resources: undefined, pretendToBeVisual: true, virtualConsole: vc
});
const { window } = dom;
window.fetch = (u, o) => nodeFetch(new URL(u, BASE).href, o);
window.DecompressionStream = DecompressionStream;
window.Response = Response; window.Headers = Headers; window.Request = Request;
window.caches = { open: async () => ({ match: async () => null, put: async () => {} }), keys: async () => [], delete: async () => {} };
window.navigator.clipboard = { writeText: async () => {} };
window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
window.navigator.storage = { estimate: async () => ({ usage: 1e6, quota: 1e9 }) };
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
const sc = window.document.createElement('script');
sc.textContent = fs.readFileSync(join(RACINE, 'app.js'), 'utf8');
window.document.body.appendChild(sc);
await sleep(2500);
const $ = s => window.document.querySelector(s);
const sansEspacesFins = t => String(t || '').replace(/[\u202f\u00a0\u2009]/g, ' ');
const chips = Array.from(window.document.querySelectorAll('#chipsTrad .chip'));
const texteChips = chips.map(c => sansEspacesFins(c.textContent.trim()));

chips.length === 4 ? ok('quatre filtres : ' + texteChips.join(' | ')) : ko(chips.length + ' filtres : ' + texteChips.join(' | '));
/chip gold/.test(chips[1].className) && /399/.test(texteChips[1]) ? ok('filtre La Voix de Dieu (VGR) : 399') : ko('filtre VGR incorrect');
/1 210/.test(texteChips[2]) ? ok('filtre Shekinah : 1 210') : ko('filtre Shekinah incorrect : ' + texteChips[2]);
/BF/.test(texteChips[3]) ? ok('filtre BF présent : ' + texteChips[3]) : ko('filtre BF absent');
texteChips.some(t => /MS|BBV/.test(t)) ? ko('un filtre MS/BBV subsiste') : ok('aucun filtre MS/BBV');

chips[3].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(600);
const compte = ($('#sermonCount')?.textContent || '').replace(/\s|\u202f/g, '');
/^11/.test(compte) ? ok('le filtre BF affiche 11 résultats (' + $('#sermonCount').textContent + ')') : ko('filtre BF : ' + $('#sermonCount')?.textContent);
const premier = $('#sermonList .item');
const texteItem = premier ? premier.textContent.replace(/\s+/g, ' ').trim() : '';
/BF/.test(texteItem) ? ok('l’étiquette affichée est BF, jamais « La Voix de Dieu » : ' + texteItem.slice(0, 60)) : ko('étiquette incorrecte : ' + texteItem.slice(0, 60));
/La Voix de Dieu/.test(texteItem.replace(/\s*BF\s*branham\.fr[^·]*/g, '')) ? ko('un texte BF est étiqueté « La Voix de Dieu »') : ok('aucune étiquette « La Voix de Dieu » sur les textes BF');

/* ouverture d'une brochure BF */
if (premier) {
  premier.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(1800);
  const titre = $('#rhTitle')?.textContent || $('#readerTitle')?.textContent || '';
  const paras = window.document.querySelectorAll('#sermonBody p').length;
  (titre && paras > 0) ? ok('brochure BF ouverte : « ' + titre.slice(0, 50) + ' » (' + paras + ' paragraphes)') : ko('ouverture BF impossible (titre : ' + titre + ')');
}

console.log('\n────────────────────────────────────────');
console.log(erreurs.length ? '  (erreurs jsdom ignorées : ' + erreurs.length + ')' : '  (aucune erreur jsdom)');
console.log(echecs ? `✗ ${echecs} problème(s) — ${reussis} contrôle(s) réussi(s)` : `✓ Règle de collection respectée (${reussis} contrôles)`);
process.exit(echecs ? 1 : 0);
