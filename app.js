/* ============================================================
   La Bibliothèque du Message — application hors-ligne
   Données : prédications (La Voix de Dieu / Shekinah), Bible LSG 1910,
             livre « Les Sept Âges de l'Église »
   ============================================================ */
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const DATA = 'data/';

const state = {
  cat: null,
  sermons: [],
  bible: null,
  book: null,
  sermon: null,          // prédication ouverte
  trad: null,
  year: null,
  testament: null,
  sort: 'code-asc',
  onlyAudio: false,
  query: '',
  shown: 0,
  pageSize: 60,
  fontSermon: +(localStorage.getItem('blm.font') || 17),
  fontBible: +(localStorage.getItem('blm.fontBible') || 17),
  fontBook: +(localStorage.getItem('blm.fontBook') || 17),
  currentView: 'home',
  currentBible: null,     // {book, chapter}
  currentBookChap: 1,
  deep: { running: false, stop: false },
};

/* ---------- stockage local ---------- */
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('blm.' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('blm.' + k, JSON.stringify(v)); } catch {} },
};
let favs = store.get('favs', { sermons: {}, bible: {}, book: {} });
let marks = store.get('marks', {});
let reads = store.get('reads', {});
const saveFavs = () => store.set('favs', favs);
const saveMarks = () => store.set('marks', marks);
const saveReads = () => store.set('reads', reads);

/* ---------- outils ---------- */
function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, ms);
}
function debounce(fn, ms = 180) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function norm(s) {
  return (s || '').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim();
}
function fmt(n) { return n.toLocaleString('fr-FR'); }
function absUrl(u){ if(!u) return ''; return /^https?:/i.test(u) ? u : 'https://branham.fr'+u; }
const TRAD_LABEL={ 'VGR':'La Voix de Dieu', 'VGR-OFF':'La Voix de Dieu (officiel)', 'SHP':'Shekinah', 'MS':'MS', 'BBV':'BBV' };
function tradLabel(t){ return TRAD_LABEL[(t||'').toUpperCase()] || t || ''; }

async function loadGz(url) {
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + url);
  if (typeof DecompressionStream === 'undefined') return res.json();
  return new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).json();
}

/* ---------- rendu : navigation ---------- */
const VIEWS = ['home', 'sermons', 'sermon', 'bible', 'bible-read', 'book', 'book-read', 'favorites', 'search', 'help'];
function showView(v, push = true) {
  VIEWS.forEach(id => { const el = $('#view-' + id); if (el) el.hidden = (id !== v); });
  state.currentView = v;
  $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.go === v ||
    (v === 'sermon' && b.dataset.go === 'sermons') || (v.startsWith('bible') && b.dataset.go === 'bible') ||
    (v.startsWith('book') && b.dataset.go === 'book')));
  $('#btnBack').hidden = ['home', 'sermons', 'bible', 'favorites', 'help', 'search', 'book'].includes(v) ? (v === 'home') : false;
  $('#menuPanel').hidden = true;
  if (v === 'home') renderHome();
  if (push) { try { history.pushState({ v }, '', '#' + v); } catch {} }
  window.scrollTo({ top: 0 });
}
window.addEventListener('popstate', e => { const v = (e.state && e.state.v) || 'home'; showView(v, false); });

$('#tileVgr')?.addEventListener('click', () => {
  const chip = $$('#chipsTrad .chip').find(c => c.dataset.trad === 'VGR,VGR-OFF');
  if (chip) chip.dispatchEvent(new MouseEvent('click'));
});
$$('[data-go]').forEach(b => b.addEventListener('click', () => {
  const v = b.dataset.go;
  if (v === 'sermons') { renderSermons(true); }
  if (v === 'bible') { if (!state.bible) openBible(); }
  if (v === 'book') { if (!state.book) openBook(); }
  if (v === 'favorites') renderFavorites();
  showView(v);
}));
$('#btnMenu').addEventListener('click', () => { const p = $('#menuPanel'); p.hidden = !p.hidden; });
$('#btnBack').addEventListener('click', () => history.back());
document.addEventListener('click', e => {
  const p = $('#menuPanel');
  if (!p.hidden && !p.contains(e.target) && e.target.id !== 'btnMenu') p.hidden = true;
});

/* thème */
(function theme() {
  const t = store.get('theme', null);
  if (t) document.documentElement.dataset.theme = t;
  else if (matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.dataset.theme = 'dark';
})();
$('#btnTheme').addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = cur; store.set('theme', cur);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = cur === 'dark' ? '#0b1220' : '#f6f7fb';
});

/* ---------- accueil ---------- */
function renderHome() {
  if (!state.cat) return;
  const s = state.cat.sermons;
  const trads = {}; s.forEach(r => trads[r.trad] = (trads[r.trad] || 0) + 1);
  const audio = s.filter(r => r.mp3 || r.audio).length;
  const nVgr = (trads['VGR'] || 0) + (trads['VGR-OFF'] || 0);
  $('#stats').innerHTML = `
    <div class="stat"><b>${fmt(s.length)}</b><span>prédications &amp; brochures</span></div>
    <div class="stat"><b>${fmt(nVgr)}</b><span>traduction La Voix de Dieu</span></div>
    <div class="stat"><b>66</b><span>livres de la Bible</span></div>
    <div class="stat"><b>31 169</b><span>versets (Segond 1910)</span></div>`;
  const tvs=$('#tileVgrS'); if(tvs) tvs.textContent = `${fmt(nVgr)} brochures · ${fmt(trads['VGR-OFF']||0)} officielles · ${fmt(s.filter(r=>/^VGR/i.test(r.trad)&&(r.mp3||r.audio)).length)} avec audio`;
  $('#tileSermons').textContent = `${fmt(s.length)} textes · La Voix de Dieu ${fmt(nVgr)} · Shekinah ${fmt(trads['SHP']||0)} · MS ${fmt(trads['MS']||0)} · ${fmt(audio)} avec audio`;
  const nf = Object.keys(favs.sermons).length + Object.keys(favs.bible).length;
  $('#tileFav').textContent = nf ? `${nf} enregistré(s)` : 'Aucun favori pour le moment';
  const r = reads.sermon;
  const cc = $('#continueCard');
  if (r && r.id) {
    const rec = s.find(x => x.id === r.id);
    if (rec) { $('#ccTitle').textContent = `${rec.code} — ${rec.title}`; cc.hidden = false; }
    else cc.hidden = true;
  } else cc.hidden = true;
}

/* ---------- prédications : liste + filtres ---------- */
function initSermonFilters() {
  const nVgr = state.cat.sermons.filter(r => /^VGR/i.test(r.trad)).length;
  const nOff = state.cat.sermons.filter(r => r.trad === 'VGR-OFF').length;
  const trads = Array.from(new Set(state.cat.sermons.map(r => r.trad))).filter(t => t !== 'VGR-OFF').sort();
  const label = t => t === 'VGR' ? 'La Voix de Dieu (branham.fr)' : t === 'SHP' ? 'Shekinah (Shp)' : t;
  $('#chipsTrad').innerHTML = [`<button class="chip active" data-trad="">Toutes</button>`,
      `<button class="chip gold" data-trad="VGR,VGR-OFF">★ La Voix de Dieu — tout (${fmt(nVgr)})</button>`,
      `<button class="chip" data-trad="VGR-OFF">La Voix de Dieu (officiel · ${fmt(nOff)})</button>`]
    .concat(trads.map(t => `<button class="chip" data-trad="${t}">${label(t)}</button>`)).join('');
  $$('#chipsTrad .chip').forEach(c => c.addEventListener('click', () => {
    state.trad = c.dataset.trad ? c.dataset.trad.split(',') : null;
    $$('#chipsTrad .chip').forEach(x => x.classList.toggle('active', x === c));
    renderSermons(true);
  }));
  const years = Array.from(new Set(state.cat.sermons.map(r => r.year).filter(Boolean))).sort((a, b) => b - a);
  $('#chipsYear').innerHTML = [`<button class="chip active" data-year="">Toutes les années</button>`]
    .concat(years.map(y => `<button class="chip" data-year="${y}">${y}</button>`)).join('');
  $$('#chipsYear .chip').forEach(c => c.addEventListener('click', () => {
    state.year = c.dataset.year ? +c.dataset.year : null;
    $$('#chipsYear .chip').forEach(x => x.classList.toggle('active', x === c));
    renderSermons(true);
  }));
}

function filteredSermons() {
  const q = norm(state.query);
  let list = state.cat.sermons;
  if (state.trad) list = list.filter(r => state.trad.includes(r.trad));
  if (state.year) list = list.filter(r => r.year === state.year);
  if (state.onlyAudio) list = list.filter(r => r.mp3 || r.audio);
  if (q) {
    const words = q.split(' ').filter(Boolean);
    list = list.filter(r => {
      const hay = norm(r.title + ' ' + r.code + ' ' + (r.trad || ''));
      return words.every(w => hay.includes(w));
    });
  }
  const s = state.sort;
  list = list.slice().sort((a, b) => {
    if (s === 'code-asc') return (a.code || '').localeCompare(b.code || '');
    if (s === 'code-desc') return (b.code || '').localeCompare(a.code || '');
    if (s === 'title-asc') return norm(a.title).localeCompare(norm(b.title));
    if (s === 'title-desc') return norm(b.title).localeCompare(norm(a.title));
    if (s === 'len-desc') return b.chars - a.chars;
    return 0;
  });
  return list;
}

function sermonCard(r, i) {
  const dur = r.duree ? ' · ⏱ ' + r.duree.replace('La durée est de', '').replace(/^\s*:\s*/, '') : '';
  return `<button class="item" data-idx="${i}">
    <div class="it-title">${escapeHtml(r.title)}</div>
    <div class="it-meta">
      <span class="badge">${r.code || '—'}</span>
      <span class="${/^VGR/.test(r.trad) ? 'badge gold' : 'badge grey'}">${escapeHtml(tradLabel(r.trad))}</span>
      ${(r.mp3 || r.audio) ? '<span class="badge grey">🎧 audio</span>' : ''}${r.scan ? '<span class="badge grey">PDF scanné</span>' : ''}
      <span>${fmt(Math.round(r.chars / 1000))} k caractères${dur}</span>
    </div></button>`;
}

function renderSermons(reset = false) {
  if (reset) {
    state.shown = 0;
    $('#sermonList').innerHTML = '';
  }
  const list = filteredSermons();
  state._filtered = list;
  $('#sermonCount').textContent = `${fmt(list.length)} résultat(s)`;
  const from = state.shown, to = Math.min(list.length, state.shown + state.pageSize);
  const html = list.slice(from, to).map((r, k) => sermonCard(r, from + k)).join('');
  $('#sermonList').insertAdjacentHTML('beforeend', html || (from === 0 ? '<div class="empty">Aucune prédication ne correspond à cette recherche.</div>' : ''));
  state.shown = to;
  bindClicks('#sermonList');
}
function bindClicks(sel) {
  $$(sel + ' .item[data-idx]').forEach(el => {
    if (el._b) return; el._b = 1;
    el.addEventListener('click', () => openSermon(state._filtered[+el.dataset.idx]));
  });
}
$('#sermonList').addEventListener('scroll', () => {});
new IntersectionObserver(es => {
  if (state.currentView === 'sermons' && es[0].isIntersecting && state._filtered && state.shown < state._filtered.length) renderSermons(false);
}, { rootMargin: '600px' }).observe($('#sermonSentinel'));

$('#q').addEventListener('input', debounce(e => { state.query = e.target.value; renderSermons(true); }));
$('#sortSelect').addEventListener('change', e => { state.sort = e.target.value; renderSermons(true); });
$('#onlyAudio').addEventListener('change', e => { state.onlyAudio = e.target.checked; renderSermons(true); });

function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------- lecteur de prédication ---------- */
async function openSermon(rec, opts = {}) {
  if (!rec) return;
  state.sermon = rec;
  showView('sermon');
  $('#rhCode').textContent = rec.code || '';
  $('#rhTitle').textContent = rec.title;
  $('#rhMeta').innerHTML = `${escapeHtml(tradLabel(rec.trad))}${rec.duree ? ' · ' + escapeHtml(rec.duree) : ''} · ${fmt(rec.paras)} paragraphes${rec.scan ? ' · <b>brochure scannée : texte non extractible, ouvrez le PDF</b>' : ''}`;
  $('#sermonBody').innerHTML = '<p class="muted">Chargement du texte…</p>';
  $('#btnPdf').style.display = rec.pdf ? '' : 'none';
  if (rec.pdf) $('#btnPdf').href = absUrl(rec.pdf);
  $('#btnMp3').style.display = (rec.mp3 || rec.audio) ? '' : 'none';
  if (rec.mp3 || rec.audio) $('#btnMp3').href = absUrl(rec.mp3 || rec.audio);
  document.documentElement.style.setProperty('--reader-size', state.fontSermon + 'px');
  updateSermonFavIcon();

  try {
    const d = await loadGz(DATA + (rec.dir || 'sermons') + '/' + rec.id + '.json.gz');
    const html = d.paras.map((p, i) => {
      const m = p.match(/^(\d+)\.?\s+(.*)$/s);
      const num = m ? `<span class="para-num">${m[1]}</span>` : '';
      const txt = m ? m[2] : p;
      return `<p data-i="${i}">${num}${escapeHtml(txt)}</p>`;
    }).join('');
    $('#sermonBody').innerHTML = html;
    reads.sermon = { id: rec.id, pos: 0 }; saveReads();
    if (opts.goto != null) {
      const el = $('#sermonBody p[data-i="' + opts.goto + '"]');
      if (el) el.scrollIntoView?.({ block: 'center' });
    }
  } catch (e) {
    $('#sermonBody').innerHTML = `<p class="muted">Impossible de charger le texte (${escapeHtml(e.message)}).<br>
      Si vous avez ouvert le fichier directement (file://), lancez plutôt le petit serveur fourni : <code>./lancer_app.sh</code> ou <code>python3 -m http.server 8080</code>.</p>`;
  }
}

$('#prevSermon').addEventListener('click', () => navSermon(-1));
$('#nextSermon').addEventListener('click', () => navSermon(1));
function navSermon(dir) {
  const list = filteredSermons();
  const i = list.findIndex(r => r.id === (state.sermon || {}).id);
  const j = i + dir;
  if (j >= 0 && j < list.length) openSermon(list[j]);
  else toast('Fin de la liste');
}
$('#btnFavSermon').addEventListener('click', () => {
  const id = state.sermon.id;
  if (favs.sermons[id]) delete favs.sermons[id]; else favs.sermons[id] = true;
  saveFavs(); updateSermonFavIcon(); toast(favs.sermons[id] ? 'Ajouté aux favoris' : 'Retiré des favoris');
});
function updateSermonFavIcon() {
  const on = !!(state.sermon && favs.sermons[state.sermon.id]);
  $('#btnFavSermon').textContent = on ? '★ Favori' : '☆ Favori';
}
$('#btnMark').addEventListener('click', () => {
  if (!state.sermon) return;
  const ref = prompt('Marque-page — note (facultatif) :', marks[state.sermon.id]?.note || '');
  if (ref === null) return;
  marks[state.sermon.id] = { note: ref, code: state.sermon.code, title: state.sermon.title, at: Date.now() };
  saveMarks(); toast('Marque-page enregistré');
});
$('#btnCopySermon').addEventListener('click', async () => {
  const t = $('#sermonBody').innerText;
  try { await navigator.clipboard.writeText(t); toast('Texte copié'); } catch { toast('Copie impossible'); }
});
$('#fontPlus').addEventListener('click', () => { state.fontSermon = Math.min(30, state.fontSermon + 1); document.documentElement.style.setProperty('--reader-size', state.fontSermon + 'px'); store.set('font', state.fontSermon); });
$('#fontMinus').addEventListener('click', () => { state.fontSermon = Math.max(13, state.fontSermon - 1); document.documentElement.style.setProperty('--reader-size', state.fontSermon + 'px'); store.set('font', state.fontSermon); });

/* recherche dans le texte courant */
$('#btnSearchInSermon').addEventListener('click', () => { $('#searchInBox').hidden = !$('#searchInBox').hidden; if (!$('#searchInBox').hidden) $('#searchInInput').focus(); });
$('#searchInClose').addEventListener('click', () => { $('#searchInBox').hidden = true; });
$('#searchInInput').addEventListener('input', debounce(e => {
  const q = norm(e.target.value);
  $$('#sermonBody p').forEach(p => { p.querySelectorAll('mark').forEach(m => m.replaceWith(document.createTextNode(m.textContent))); });
  if (q.length < 2) { $('#searchInCount').textContent = ''; return; }
  let n = 0;
  $$('#sermonBody p').forEach(p => {
    const txt = p.textContent, nt = norm(txt);
    let idx = nt.indexOf(q);
    if (idx < 0) return;
    const frag = document.createDocumentFragment(); let last = 0;
    while (idx >= 0) {
      frag.appendChild(document.createTextNode(txt.slice(last, idx)));
      const m = document.createElement('mark'); m.textContent = txt.slice(idx, idx + q.length); frag.appendChild(m);
      last = idx + q.length; n++; idx = nt.indexOf(q, last);
    }
    frag.appendChild(document.createTextNode(txt.slice(last)));
    p.innerHTML = ''; p.appendChild(frag);
  });
  $('#searchInCount').textContent = n ? n + ' occurrence(s)' : 'aucun résultat';
  const first = $('#sermonBody mark'); if (first) first.scrollIntoView?.({ block: 'center' });
}, 260));

/* sauvegarde de la position de lecture */
let scrollSave = debounce(() => {
  if (state.currentView !== 'sermon' || !state.sermon) return;
  const y = window.scrollY;
  reads.sermon = { id: state.sermon.id, pos: y, at: Date.now() };
  saveReads();
}, 500);
window.addEventListener('scroll', scrollSave);
$('#ccOpen').addEventListener('click', () => { const r = reads.sermon; if (r) { const rec = state.cat.sermons.find(x => x.id === r.id); if (rec) { openSermon(rec); setTimeout(() => window.scrollTo({ top: r.pos || 0 }), 300); } } });
$('#ccClear').addEventListener('click', () => { delete reads.sermon; saveReads(); $('#continueCard').hidden = true; });

/* ---------- BIBLE ---------- */
const BIBLE_ALIAS = {
  'gen': 'GEN', 'genese': 'GEN', 'ex': 'EXO', 'exo': 'EXO', 'exode': 'EXO', 'lev': 'LEV', 'levitique': 'LEV',
  'nom': 'NUM', 'nombres': 'NUM', 'deut': 'DEU', 'deuteronome': 'DEU', 'jos': 'JOS', 'josue': 'JOS', 'jug': 'JDG',
  'juges': 'JDG', 'ruth': 'RUT', '1s': '1SA', '1sam': '1SA', '1 samuel': '1SA', '2s': '2SA', '2samuel': '2SA',
  '1r': '1KI', '1rois': '1KI', '2r': '2KI', '2rois': '2KI', '1ch': '1CH', '1chroniques': '1CH', '2ch': '2CH',
  '2chroniques': '2CH', 'esd': 'EZR', 'esdras': 'EZR', 'neh': 'NEH', 'nehemie': 'NEH', 'est': 'EST', 'esther': 'EST',
  'job': 'JOB', 'ps': 'PSA', 'psaume': 'PSA', 'psaumes': 'PSA', 'pr': 'PRO', 'prov': 'PRO', 'proverbes': 'PRO',
  'ecc': 'ECC', 'ecclesiaste': 'ECC', 'ct': 'SNG', 'cantique': 'SNG', 'es': 'ISA', 'esaie': 'ISA', 'isaie': 'ISA',
  'jer': 'JER', 'jeremie': 'JER', 'lam': 'LAM', 'lamentations': 'LAM', 'ez': 'EZK', 'ezechiel': 'EZK', 'dan': 'DAN',
  'daniel': 'DAN', 'os': 'HOS', 'osee': 'HOS', 'joel': 'JOL', 'am': 'AMO', 'amos': 'AMO', 'ab': 'OBA', 'abdias': 'OBA',
  'jon': 'JON', 'jonas': 'JON', 'mic': 'MIC', 'michee': 'MIC', 'nah': 'NAM', 'nahum': 'NAM', 'hab': 'HAB',
  'habacuc': 'HAB', 'soph': 'ZEP', 'sophonie': 'ZEP', 'agg': 'HAG', 'aggee': 'HAG', 'zac': 'ZEC', 'zacharie': 'ZEC',
  'mal': 'MAL', 'malachie': 'MAL', 'mt': 'MAT', 'mat': 'MAT', 'matthieu': 'MAT', 'mc': 'MRK', 'marc': 'MRK',
  'lc': 'LUK', 'luc': 'LUK', 'jn': 'JHN', 'jean': 'JHN', 'act': 'ACT', 'actes': 'ACT', 'rom': 'ROM', 'romains': 'ROM',
  '1co': '1CO', '1corinthiens': '1CO', '2co': '2CO', '2corinthiens': '2CO', 'gal': 'GAL', 'galates': 'GAL',
  'eph': 'EPH', 'ephesiens': 'EPH', 'ph': 'PHP', 'phil': 'PHP', 'philippiens': 'PHP', 'col': 'COL', 'colossiens': 'COL',
  '1th': '1TH', '1thessaloniciens': '1TH', '2th': '2TH', '2thessaloniciens': '2TH', '1ti': '1TI', '1timothee': '1TI',
  '2ti': '2TI', '2timothee': '2TI', 'tit': 'TIT', 'tite': 'TIT', 'phm': 'PHM', 'philemon': 'PHM', 'heb': 'HEB',
  'hebreux': 'HEB', 'jc': 'JAS', 'jacques': 'JAS', '1p': '1PE', '1pierre': '1PE', '2p': '2PE', '2pierre': '2PE',
  '1jn': '1JN', '1jean': '1JN', '2jn': '2JN', '2jean': '2JN', '3jn': '3JN', '3jean': '3JN', 'jud': 'JUD', 'jude': 'JUD',
  'ap': 'REV', 'apoc': 'REV', 'apocalypse': 'REV', 'rev': 'REV'
};
async function openBible() {
  try {
    state.bible = state.bible || await loadGz(DATA + 'bible/lsg1910.json.gz');
    renderBibleHome();
  } catch (e) { $('#booksGrid').innerHTML = '<div class="empty">Bible non chargée : ' + escapeHtml(e.message) + '</div>'; }
}
function findBook(x) {
  x = norm(x).replace(/^(1er|2eme|2e|1ere|1re)\s+/, m => ({ '1er': '1', '1ere': '1re', '1re': '1', '2e': '2', '2eme': '2' }[m.trim()] + ' '));
  x = x.replace(/\s+/g, ' ').trim();
  if (BIBLE_ALIAS[x]) return state.bible.books.find(b => b.code === BIBLE_ALIAS[x]);
  const b = state.bible.books.find(b => norm(b.name) === x || norm(b.code) === x);
  if (b) return b;
  return state.bible.books.find(b => norm(b.name).startsWith(x) && x.length > 2) || null;
}
function renderBibleHome() {
  const chips = $('#chipsTestament');
  chips.innerHTML = `<button class="chip active" data-t="">Toute la Bible</button>
    <button class="chip" data-t="AT">Ancien Testament</button><button class="chip" data-t="NT">Nouveau Testament</button>`;
  $$('#chipsTestament .chip').forEach(c => c.addEventListener('click', () => {
    state.testament = c.dataset.t || null;
    $$('#chipsTestament .chip').forEach(x => x.classList.toggle('active', x === c));
    drawBooks();
  }));
  drawBooks();
}
function drawBooks() {
  let books = state.bible.books;
  if (state.testament === 'AT') books = books.slice(0, 39);
  if (state.testament === 'NT') books = books.slice(39);
  $('#booksGrid').innerHTML = books.map(b => {
    const nv = Object.values(b.chapters).reduce((a, c) => a + Object.keys(c).length, 0);
    return `<button class="book-btn" data-code="${b.code}">${escapeHtml(b.name)}<small>${Object.keys(b.chapters).length} chapitres · ${fmt(nv)} v.</small></button>`;
  }).join('');
  $$('#booksGrid .book-btn').forEach(el => el.addEventListener('click', () => {
    const b = state.bible.books.find(x => x.code === el.dataset.code);
    pickChapter(b);
  }));
  $('#chapterPicker').hidden = true;
  $('#bibleCount').textContent = `${books.length} livre(s)`;
}
function pickChapter(book) {
  $('#chapterPicker').hidden = false;
  $('#chapterPicker').innerHTML = `<div class="hero small"><h1>${escapeHtml(book.name)}</h1></div>
    <div class="chapters-grid">${Object.keys(book.chapters).sort((a, b) => a - b).map(c => `<button class="chap-btn" data-c="${c}">${c}</button>`).join('')}</div>`;
  $$('#chapterPicker .chap-btn').forEach(el => el.addEventListener('click', () => openBibleChapter(book.code, +el.dataset.c)));
  $('#chapterPicker').scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}
function openBibleChapter(code, chap, verse) {
  const b = state.bible.books.find(x => x.code === code);
  if (!b) return;
  state.currentBible = { code, chapter: chap };
  const ch = b.chapters[String(chap)];
  if (!ch) { toast('Chapitre introuvable'); return; }
  $('#brRef').textContent = `${b.name} ${chap}`;
  const favOn = favs.bible[code + '.' + chap];
  $('#brFav').textContent = favOn ? '★ Chapitre' : '☆ Favori';
  $('#bibleBody').innerHTML = Object.keys(ch).sort((a, b2) => a - b2).map(v =>
    `<div class="verse" data-v="${v}"><span class="vn">${v}</span><p>${escapeHtml(ch[v])}</p></div>`).join('');
  document.documentElement.style.setProperty('--reader-size', state.fontBible + 'px');
  showView('bible-read');
  if (verse) { const el = $(`#bibleBody .verse[data-v="${verse}"]`); if (el) { el.classList.add('fav'); el.scrollIntoView?.({ block: 'center' }); } }
  reads.bible = { code, chapter: chap }; saveReads();
}
$('#brPrev').addEventListener('click', () => navChapter(-1));
$('#brNext').addEventListener('click', () => navChapter(1));
function navChapter(d) {
  if (!state.currentBible) return;
  const { code, chapter } = state.currentBible;
  const bi = state.bible.books.findIndex(b => b.code === code);
  const b = state.bible.books[bi];
  const chs = Object.keys(b.chapters).map(Number).sort((a, c) => a - c);
  let ci = chs.indexOf(chapter) + d;
  if (ci < 0) { if (bi === 0) return toast('Début de la Bible'); const pb = state.bible.books[bi - 1]; const pcs = Object.keys(pb.chapters).map(Number).sort((a, c) => a - c); return openBibleChapter(pb.code, pcs[pcs.length - 1]); }
  if (ci >= chs.length) { if (bi === state.bible.books.length - 1) return toast('Fin de la Bible'); const nb = state.bible.books[bi + 1]; return openBibleChapter(nb.code, Math.min(...Object.keys(nb.chapters).map(Number))); }
  openBibleChapter(code, chs[ci]);
}
$('#brFav').addEventListener('click', () => {
  if (!state.currentBible) return;
  const k = state.currentBible.code + '.' + state.currentBible.chapter;
  if (favs.bible[k]) delete favs.bible[k]; else favs.bible[k] = Date.now();
  saveFavs(); $('#brFav').textContent = favs.bible[k] ? '★ Chapitre' : '☆ Favori';
});
$('#brCopy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#brRef').textContent + '\n' + $('#bibleBody').innerText); toast('Chapitre copié'); } catch { toast('Copie impossible'); }
});
$('#brFontPlus').addEventListener('click', () => { state.fontBible = Math.min(30, state.fontBible + 1); document.documentElement.style.setProperty('--reader-size', state.fontBible + 'px'); store.set('fontBible', state.fontBible); });
$('#brFontMinus').addEventListener('click', () => { state.fontBible = Math.max(13, state.fontBible - 1); document.documentElement.style.setProperty('--reader-size', state.fontBible + 'px'); store.set('fontBible', state.fontBible); });

/* recherche biblique : référence ou mot-clé (chapitre courant / livre entier) */
$('#bibleQ').addEventListener('input', debounce(async e => {
  const q = e.target.value.trim();
  const box = $('#bibleSearchResults');
  if (q.length < 2) { box.hidden = true; box.innerHTML = ''; $('#booksGrid').style.display = ''; $('#chapterPicker').hidden = true; return; }
  if (!state.bible) await openBible();
  if (!state.bible) { box.hidden = false; box.innerHTML = '<div class="empty">La Bible n’a pas pu être chargée : ouvrez l’application depuis le serveur local (voir Aide).</div>'; $('#booksGrid').style.display = 'none'; return; }
  const m = q.match(/^((?:\d\s*)?[A-Za-zÀ-ÿ.]+)\s*(\d+)?\s*[:.,]?\s*(\d+)?$/);
  if (m) {
    const b = findBook(m[1]);
    if (b && m[2]) { box.hidden = true; box.innerHTML = ''; $('#booksGrid').style.display = 'none'; openBibleChapter(b.code, +m[2], m[3] ? +m[3] : null); return; }
    if (b && !m[2]) { $('#booksGrid').style.display = 'none'; box.hidden = true; pickChapter(b); return; }
  }
  // recherche plein texte dans la Bible
  const nq = norm(q); const out = [];
  for (const b of state.bible.books) {
    for (const [c, vs] of Object.entries(b.chapters)) {
      for (const [v, t] of Object.entries(vs)) {
        if (norm(t).includes(nq)) {
          out.push(`<button class="item" data-code="${b.code}" data-c="${c}" data-v="${v}">
            <div class="it-title">${escapeHtml(b.name)} ${c}:${v}</div>
            <div class="it-meta"><span>…${escapeHtml(t.slice(Math.max(0, norm(t).indexOf(nq) - 40), norm(t).indexOf(nq) + 120))}…</span></div></button>`);
          if (out.length >= 120) break;
        }
      }
      if (out.length >= 120) break;
    }
    if (out.length >= 120) break;
  }
  $('#booksGrid').style.display = 'none'; $('#chapterPicker').hidden = true;
  box.hidden = false;
  box.innerHTML = out.join('') || '<div class="empty">Aucun verset trouvé.</div>';
  $$('#bibleSearchResults .item').forEach(el => el.addEventListener('click', () => openBibleChapter(el.dataset.code, +el.dataset.c, +el.dataset.v)));
}, 320));

/* ---------- LIVRE : Sept Âges ---------- */
async function openBook() {
  try {
    state.book = state.book || await loadGz(DATA + 'books/7_church_ages.json.gz');
    $('#bookToc').innerHTML = state.book.chapters.map(c =>
      `<button class="item" data-n="${c.n}"><div class="it-title">Chapitre ${c.n}</div>
       <div class="it-meta"><span>${escapeHtml(c.title || '')} · ${fmt(Math.round(c.paras.join(' ').length / 1000))} k caractères</span></div></button>`).join('');
    $$('#bookToc .item').forEach(el => el.addEventListener('click', () => openBookChapter(+el.dataset.n)));
  } catch (e) { $('#bookToc').innerHTML = '<div class="empty">Livre non chargé : ' + escapeHtml(e.message) + '</div>'; }
}
function openBookChapter(n) {
  const c = state.book.chapters.find(x => x.n === n); if (!c) return;
  state.currentBookChap = n;
  $('#bkcTitle').textContent = `Les Sept Âges de l'Église — Chapitre ${n}`;
  $('#bookBody').innerHTML = `<p class="muted" style="text-align:center">${escapeHtml(c.title || '')}</p>` +
    c.paras.map(p => `<p>${escapeHtml(p)}</p>`).join('');
  document.documentElement.style.setProperty('--reader-size', state.fontBook + 'px');
  showView('book-read');
}
$('#bkPrev').addEventListener('click', () => { if (state.currentBookChap > 1) openBookChapter(state.currentBookChap - 1); });
$('#bkNext').addEventListener('click', () => { if (state.currentBookChap < state.book.chapters.length) openBookChapter(state.currentBookChap + 1); });
$('#bkFontPlus').addEventListener('click', () => { state.fontBook = Math.min(30, state.fontBook + 1); document.documentElement.style.setProperty('--reader-size', state.fontBook + 'px'); store.set('fontBook', state.fontBook); });
$('#bkFontMinus').addEventListener('click', () => { state.fontBook = Math.max(13, state.fontBook - 1); document.documentElement.style.setProperty('--reader-size', state.fontBook + 'px'); store.set('fontBook', state.fontBook); });

/* ---------- FAVORIS ---------- */
function renderFavorites() {
  const box = $('#favList');
  const parts = [];
  const sIds = Object.keys(favs.sermons);
  if (sIds.length) {
    parts.push('<h3 style="margin:16px 0 8px">Prédications favorites</h3><div class="list">' +
      sIds.map(id => { const r = state.cat.sermons.find(x => x.id === id); if (!r) return ''; return `<button class="item" data-fav-s="${id}"><div class="it-title">${escapeHtml(r.title)}</div><div class="it-meta"><span class="badge">${r.code}</span><span>${r.trad}</span></div></button>`; }).join('') + '</div>');
  }
  const bIds = Object.keys(favs.bible);
  if (bIds.length) {
    parts.push('<h3 style="margin:16px 0 8px">Chapitres de la Bible</h3><div class="list">' +
      bIds.map(k => { const [code, c] = k.split('.'); const b = state.bible ? state.bible.books.find(x => x.code === code) : null; return `<div style="display:flex;gap:6px"><button class="item" data-fav-b="${k}"><div class="it-title">${b ? escapeHtml(b.name) : code} ${c}</div></button><button class="btn small" data-del-b="${k}">✕</button></div>`; }).join('') + '</div>');
  }
  const mIds = Object.keys(marks);
  if (mIds.length) {
    parts.push('<h3 style="margin:16px 0 8px">Marque-pages</h3><div class="list">' +
      mIds.map(id => `<button class="item" data-fav-s="${id}"><div class="it-title">${escapeHtml(marks[id].title || id)}</div><div class="it-meta"><span class="badge">${escapeHtml(marks[id].code || '')}</span><span>${escapeHtml(marks[id].note || '')}</span></div></button>`).join('') + '</div>');
  }
  box.innerHTML = parts.join('') || '<div class="empty">Rien dans vos favoris pour le moment.<br>Appuyez sur ☆ pendant une lecture pour enregistrer.</div>';
  $$('[data-fav-s]').forEach(el => el.addEventListener('click', async () => {
    const id = el.dataset.favS;
    let r = state.cat.sermons.find(x => x.id === id);
    if (!r) r = (state.cat.sermons.find(x => x.code === (marks[id] || {}).code));
    if (r) openSermon(r);
  }));
  $$('[data-fav-b]').forEach(el => el.addEventListener('click', async () => {
    if (!state.bible) await openBible();
    const [code, c] = el.dataset.favB.split('.');
    openBibleChapter(code, +c);
  }));
  $$('[data-del-b]').forEach(el => el.addEventListener('click', ev => {
    ev.stopPropagation(); delete favs.bible[el.dataset.delB]; saveFavs(); renderFavorites();
  }));
}

/* ---------- RECHERCHE APPROFONDIE ---------- */
$('#deepGo').addEventListener('click', runDeep);
async function runDeep() {
  const q = norm($('#deepQ').value);
  if (q.length < 3) return toast('Entrez au moins 3 caractères');
  if (state.deep.running) return;
  state.deep = { running: true, stop: false };
  $('#deepResults').innerHTML = ''; $('#deepStop').disabled = false;
  const list = state.cat.sermons;
  const CONC = 5;
  let i = 0, done = 0, found = 0;
  const MAX = 300;
  async function worker() {
    while (!state.deep.stop && i < list.length && found < MAX) {
      const rec = list[i++];
      try {
        const d = await loadGz(DATA + (rec.dir || 'sermons') + '/' + rec.id + '.json.gz');
        const hits = [];
        d.paras.forEach((p, k) => { if (norm(p).includes(q) && hits.length < 3) hits.push({ k, t: p }); });
        if (hits.length) {
          found++;
          const html = `<button class="item" data-fav-s="${rec.id}">
            <div class="it-title">${escapeHtml(rec.title)}</div>
            <div class="it-meta"><span class="badge">${rec.code}</span><span>${rec.trad}</span><span>${hits.length} extrait(s)</span></div>
            ${hits.map(h => `<div class="muted" style="margin-top:6px;font-size:13px">…${escapeHtml(surround(h.t, q))}…</div>`).join('')}
          </button>`;
          $('#deepResults').insertAdjacentHTML('beforeend', html);
          const el = $('#deepResults').lastElementChild;
          el.addEventListener('click', () => openSermon(rec, { goto: hits[0].k }));
        }
      } catch (e) { /* ignore */ }
      done++;
      if (done % 10 === 0) {
        $('#deepBar').style.width = (done / list.length * 100).toFixed(1) + '%';
        $('#deepStatus').textContent = `${fmt(done)} / ${fmt(list.length)} textes lus · ${found} prédication(s) trouvée(s)`;
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  state.deep.running = false; $('#deepStop').disabled = true;
  $('#deepBar').style.width = '100%';
  $('#deepStatus').textContent = state.deep.stop ? `Interrompu après ${fmt(done)} textes · ${found} résultat(s)` : `${fmt(done)} textes lus · ${found} prédication(s) contenant « ${$('#deepQ').value} »`;
  if (!found) $('#deepResults').innerHTML = '<div class="empty">Aucun résultat.</div>';
}
function surround(text, q) {
  const nt = norm(text); const idx = nt.indexOf(q);
  if (idx < 0) return text.slice(0, 160);
  const a = Math.max(0, idx - 70), b = Math.min(text.length, idx + q.length + 110);
  return text.slice(a, b);
}
$('#deepStop').addEventListener('click', () => { state.deep.stop = true; });

/* ---------- HORS-LIGNE ---------- */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; $('#btnInstall').hidden = false; });
$('#btnInstall').addEventListener('click', async () => { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; $('#btnInstall').hidden = true; } });

$('#btnOfflineAll').addEventListener('click', async () => {
  const files = state.cat.sermons.map(r => (r.dir || 'sermons') + '/' + r.id + '.json.gz')
    .concat(['books/7_church_ages.json.gz', 'bible/lsg1910.json.gz', 'index.json']);
  let done = 0, fail = 0;
  const CONC = 6; let i = 0;
  async function worker() {
    while (i < files.length) {
      const f = files[i++];
      try {
        const url = DATA + f;
        const cache = await caches.open('blm-data-v1');
        if (!(await cache.match(url))) { const res = await fetch(url); if (res.ok) await cache.put(url, res.clone()); else fail++; }
      } catch { fail++; }
      done++;
      if (done % 10 === 0) {
        $('#offBar').style.width = (done / files.length * 100).toFixed(1) + '%';
        $('#offStatus').textContent = `${fmt(done)} / ${fmt(files.length)} fichiers enregistrés (${fail} échec(s))`;
      }
    }
  }
  $('#offStatus').textContent = 'Téléchargement en cours… vous pouvez continuer à lire.';
  await Promise.all(Array.from({ length: CONC }, worker));
  $('#offBar').style.width = '100%';
  $('#offStatus').textContent = `Terminé : ${fmt(done - fail)} fichiers hors-ligne (${fail} échec(s)).`;
  updateStorageInfo();
});
$('#btnOfflineClear').addEventListener('click', async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  $('#offStatus').textContent = 'Cache vidé.'; $('#offBar').style.width = '0%';
  updateStorageInfo();
});
async function updateStorageInfo() {
  try {
    const est = await navigator.storage.estimate();
    $('#storageInfo').textContent = `Stockage utilisé : ${(est.usage / 1048576).toFixed(1)} Mo sur ${(est.quota / 1048576 / 1024).toFixed(1)} Go disponibles.`;
  } catch {}
}

/* ---------- démarrage ---------- */
(async function boot() {
  try {
    const r = await fetch(DATA + 'index.json');
    state.cat = await r.json();
    state.sermons = state.cat.sermons;
    initSermonFilters();
    renderSermons(true);
    renderHome();
    updateStorageInfo();
    if (reads.bible && state.bible) {}
  } catch (e) {
    document.body.insertAdjacentHTML('afterbegin',
      `<div class="card" style="margin:12px">⚠️ Catalogue non chargé (${escapeHtml(e.message)}).<br>
       Ouvrez l'application via le petit serveur local : <code>python3 -m http.server 8080</code> puis <code>http://localhost:8080</code>.</div>`);
  }
})();
