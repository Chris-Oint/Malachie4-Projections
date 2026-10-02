import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import http from 'node:http';
import { Readable } from 'node:stream';

function nodeFetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: opts.method || 'GET' }, res => {
      const body = Readable.toWeb(res);
      resolve(new Response(body, { status: res.statusCode, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

const BASE = 'http://127.0.0.1:8080/';
const html = fs.readFileSync('/home/user/index.html', 'utf8');
const vc = new VirtualConsole();
const errors = [];
vc.on('jsdomError', e => errors.push('jsdomError: ' + e.message));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  url: BASE, runScripts: 'dangerously', resources: undefined, pretendToBeVisual: true, virtualConsole: vc
});
const { window } = dom;
// shims réseau + API navigateur
window.fetch = (u, o) => nodeFetch(new URL(u, BASE).href, o);
window.DecompressionStream = DecompressionStream;
window.Response = Response;
window.Headers = Headers;
window.Request = Request;
window.caches = { open: async () => ({ match: async () => null, put: async () => {} }), keys: async () => [], delete: async () => {} };
window.navigator.clipboard = { writeText: async () => {} };
window.IntersectionObserver = class { constructor(cb){ this.cb=cb; } observe(){} unobserve(){} disconnect(){} };
window.navigator.storage = { estimate: async () => ({ usage: 1e6, quota: 1e9 }) };
window.matchMedia = window.matchMedia || (() => ({ matches:false, addListener(){}, removeListener(){} }));

const appJs = fs.readFileSync('/home/user/app.js', 'utf8');
const s = window.document.createElement('script');
s.textContent = appJs;
window.document.body.appendChild(s);

const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(2500);

const $ = sel => window.document.querySelector(sel);
const log = (...a) => console.log(...a);

log('— Accueil —');
log(' stats:', $('#stats')?.textContent.replace(/\s+/g,' ').trim().slice(0,120));
log(' liste prédications rendue:', window.document.querySelectorAll('#sermonList .item').length, 'items');
log(' compteur:', $('#sermonCount')?.textContent);
log(' premier item:', window.document.querySelector('#sermonList .item')?.textContent.replace(/\s+/g,' ').trim().slice(0,90));

// filtrer (Shekinah)
const chipShp = Array.from(window.document.querySelectorAll('#chipsTrad .chip')).find(c=>/Shekinah/.test(c.textContent));
chipShp.dispatchEvent(new window.MouseEvent('click', {bubbles:true}));
await sleep(300);
log(' filtre Shekinah ->', $('#sermonCount')?.textContent, '| chips actif:', chipShp.classList.contains('active'));

// ouvrir une prédication
const first = window.document.querySelector('#sermonList .item');
first.dispatchEvent(new window.MouseEvent('click', {bubbles:true}));
await sleep(2000);
log('— Lecteur —');
log(' titre:', $('#rhTitle')?.textContent);
log(' code:', $('#rhCode')?.textContent);
log(' paragraphes affichés:', window.document.querySelectorAll('#sermonBody p').length);
log(' extrait:', $('#sermonBody p')?.textContent.slice(0,110));
log(' lien PDF:', $('#btnPdf')?.getAttribute('href')?.slice(0,60), '| audio:', $('#btnMp3')?.getAttribute('href')?.slice(0,45));
log(' vue visible sermon:', !$('#view-sermon').hidden, '| liste cachée:', $('#view-sermons').hidden);

// recherche dans le texte
$('#searchInInput').value = 'Dieu';
$('#searchInInput').dispatchEvent(new window.Event('input', {bubbles:true}));
await sleep(600);
log(' recherche "Dieu" dans le texte ->', $('#searchInCount')?.textContent, '| <mark>:', window.document.querySelectorAll('#sermonBody mark').length);

// Bible
log('— Bible —');
const bibleTab = Array.from(window.document.querySelectorAll('[data-go]')).find(b=>b.dataset.go==='bible');
bibleTab.dispatchEvent(new window.MouseEvent('click', {bubbles:true}));
await sleep(2500);
log(' livres affichés:', window.document.querySelectorAll('#booksGrid .book-btn').length, '| compteur:', $('#bibleCount')?.textContent);
// recherche d'une référence
const bq = $('#bibleQ');
bq.value = 'Jean 3:16';
bq.dispatchEvent(new window.Event('input', {bubbles:true}));
await sleep(2200);
log(' vue lecture:', !$('#view-bible-read').hidden, '| référence:', $('#brRef')?.textContent);
log(' versets affichés:', window.document.querySelectorAll('#bibleBody .verse').length);
log(' Jean 3:16 =>', (window.document.querySelector('#bibleBody .verse[data-v="16"] p')?.textContent||'').slice(0,110));
// recherche plein texte bible
bq.value = 'berger';
bq.dispatchEvent(new window.Event('input', {bubbles:true}));
await sleep(1800);
log(' recherche "berger" =>', window.document.querySelectorAll('#bibleSearchResults .item').length, 'versets | premier:', window.document.querySelector('#bibleSearchResults .item')?.textContent.replace(/\s+/g,' ').trim().slice(0,80));

// Livre Sept Âges
log('— Livre —');
const bookTab = Array.from(window.document.querySelectorAll('[data-go]')).find(b=>b.dataset.go==='book');
bookTab.dispatchEvent(new window.MouseEvent('click', {bubbles:true}));
await sleep(2000);
log(' chapitres listés:', window.document.querySelectorAll('#bookToc .item').length);
window.document.querySelector('#bookToc .item').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
await sleep(1000);
log(' titre chapitre:', $('#bkcTitle')?.textContent, '| paragraphes:', window.document.querySelectorAll('#bookBody p').length);
log(' extrait:', window.document.querySelector('#bookBody p:nth-child(3)')?.textContent.slice(0,110));

log('— Erreurs JS capturées:', errors.length ? errors.slice(0,6) : 'aucune');
