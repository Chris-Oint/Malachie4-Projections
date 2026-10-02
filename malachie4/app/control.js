/* ============================================================================
   Malachie 4 Projections — Poste de contrôle (zone 1 → zone 6)
   Les gestes du cahier des charges : clic sur un lien = réserve + ouverture,
   double-clic = projection immédiate, flèches = élément/ligne suivant,
   surlignage jaune de la ligne active, lecture continue des brochures.
   ========================================================================== */
'use strict';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const api = window.api;

/* ---------------------------------------------------------------- état */
const R = {
  index: null,                 // index léger du contenu (livres, cantiques, brochures)
  onglet: 'A',
  filtre: '',
  /* bibliothèque */
  livre: null, chapitre: null, verset: null,
  brochureListe: null,         // brochure affichée (résumé) dans la zone 4
  brochure: null,              // brochure chargée en zone 5 {id,name,tr}
  cantique: null,              // cantique chargé en zone 5
  trad: 'VGR',
  para: 0,                     // paragraphe actif (brochure)
  ligne: -1,                   // ligne sélectionnée (index dans la liste plate)
  referenceVue: null,          // dernière référence biblique ouverte (anti-boucle)
  /* projection */
  projete: null,               // {type, id, trad, pos, label}
  /* données persistantes */
  reserve: [], historique: [], dernier: {}, reglagesParType: {}, parType: false,
  annulable: null,             // dernière suppression, pour Ctrl+Z
  /* réglages appliqués */
  reglages: {
    font: 'Georgia, "Times New Roman", serif', size: 120, margin: 80,
    bg: '#000000', fg: '#ffffff', image: '', bold: false, italic: false, shadow: true
  },
  etat: { affichage: true, projection: true, screen: { connected: false, w: 0, h: 0 } }
};
const TYPES = { cantique: 'Cantique', bible: 'Bible', brochure: 'Brochure' };
const MAX_HISTORIQUE = 30;

/* ---------------------------------------------------------------- utilitaires */
function defiler(el, bloc) { if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: bloc || 'nearest' }); }
function normaliser(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘`]/g, "'");
}
function notifier(message, action) {
  const n = $('#notif');
  n.innerHTML = '';
  n.append(document.createTextNode(message));
  if (action) { const b = document.createElement('button'); b.textContent = action.texte; b.onclick = () => { action.faire(); n.classList.remove('visible'); }; n.append(b); }
  n.classList.add('visible');
  clearTimeout(notifier._t);
  notifier._t = setTimeout(() => n.classList.remove('visible'), action ? 5200 : 2400);
}
function enregistrer(nom, valeur) { try { api.ecrireDonnees(nom, valeur); } catch (e) {} }

/* ---------------------------------------------------------------- projection */
function patch(p) { api.patch(p); }

function projeter(texte, label, mode, position) {
  /* l'élément précédent passe en zone 6 (historique) */
  if (R.projete && (R.projete.label !== label || (position && R.projete.pos !== position))) {
    R.historique.unshift(Object.assign({}, R.projete, { quand: Date.now() }));
    R.historique = R.historique.slice(0, MAX_HISTORIQUE);
    enregistrer('historique', R.historique);
    dessinerHistorique();
  }
  R.projete = { type: mode, id: label, label: label, trad: R.brochure ? R.trad : null, pos: position || 0, texte: texte };
  enregistrer('dernier', { type: mode, id: label, trad: R.trad, pos: position || 0 });
  patch({ text: texte || '', label: label || '', mode: mode });
  dessinerGestion();
}
function viderEcran() {
  R.projete = null;
  patch({ text: '', label: '', mode: 'idle', affichage: false });
}

/* ---------------------------------------------------------------- RÉSERVE (zone 1) */
function ajouterReserve(element) {
  if (!element || !element.id) return;
  if (R.reserve.some(r => r.type === element.type && r.id === element.id)) return;
  R.reserve.push(element);
  enregistrer('reserve', R.reserve);
  dessinerReserve();
}
function supprimerReserve(i) {
  const [retire] = R.reserve.splice(i, 1);
  enregistrer('reserve', R.reserve);
  dessinerReserve();
  if (!retire) return;
  R.annulable = { index: i, element: retire };
  notifier('« ' + retire.label + ' » retiré de la réserve.', { texte: 'Annuler', faire: annulerSuppression });
}
/* Ctrl+Z (ou le bouton « Annuler ») remet l'élément à sa place exacte */
function annulerSuppression() {
  if (!R.annulable) { notifier('Rien à annuler.'); return; }
  const { index, element } = R.annulable;
  R.annulable = null;
  R.reserve.splice(Math.min(index, R.reserve.length), 0, element);
  enregistrer('reserve', R.reserve);
  dessinerReserve();
  notifier('« ' + element.label + ' » remis dans la réserve.');
}
function dessinerReserve() {
  $('#cptReserve').textContent = R.reserve.length ? '(' + R.reserve.length + ')' : '';
  const c = $('#listeReserve');
  if (!R.reserve.length) { c.innerHTML = '<p class="vide">La réserve se remplit automatiquement : chaque lien cliqué en zone 4 vient ici.<br>Le ＋ rappelle l’élément et le projette aussitôt.</p>'; return; }
  c.innerHTML = '';
  R.reserve.forEach((r, i) => {
    const d = document.createElement('div');
    d.className = 'it';
    d.draggable = true;
    d.dataset.index = i;
    d.innerHTML = '<span class="type">' + (r.type === 'bible' ? '📖' : r.type === 'cantique' ? '🎵' : '📄') + '</span>' +
      '<span class="nom" title="' + escapeAttr(r.label) + '">' + escapeHtml(r.label) + '</span>' +
      '<span class="plus" data-plus="' + i + '" title="Rappeler et projeter immédiatement">＋</span>' +
      '<span class="x" data-x="' + i + '" title="Supprimer">✕</span>';
    d.onclick = e => {
      if (e.target.dataset.x !== undefined) { supprimerReserve(+e.target.dataset.x); return; }
      if (e.target.dataset.plus !== undefined) { rappeler(r, true); return; }
      rappeler(r, false);
    };
    d.ondragstart = e => { e.dataTransfer.setData('text/plain', String(i)); d.classList.add('glisse'); };
    d.ondragend = () => d.classList.remove('glisse');
    d.ondragover = e => { e.preventDefault(); d.classList.add('survol'); };
    d.ondragleave = () => d.classList.remove('survol');
    d.ondrop = e => {
      e.preventDefault(); d.classList.remove('survol');
      const de = +e.dataTransfer.getData('text/plain'), vers = i;
      if (de === vers) return;
      const [m] = R.reserve.splice(de, 1);
      R.reserve.splice(vers, 0, m);
      enregistrer('reserve', R.reserve); dessinerReserve();
    };
    c.append(d);
  });
}
async function rappeler(r, projeterAussitot) {
  if (r.type === 'cantique') { await ouvrirCantique(r.id, r.pos, projeterAussitot); }
  else if (r.type === 'bible') { await ouvrirChapitre(r.livre || r.ab, r.chapitre, r.verset, projeterAussitot); }
  else if (r.type === 'brochure') { await ouvrirBrochure(r.id, r.trad || R.trad, r.para || 0, r.ligne, projeterAussitot); }
}

/* ---------------------------------------------------------------- HISTORIQUE (zone 6) */
function dessinerHistorique() {
  $('#cptHistorique').textContent = R.historique.length ? '(' + R.historique.length + '/' + MAX_HISTORIQUE + ')' : '';
  const c = $('#listeHistorique');
  if (!R.historique.length) { c.innerHTML = '<p class="vide">Chaque élément remplacé au projecteur vient ici.<br>Un clic ramène immédiatement à sa position.</p>'; return; }
  c.innerHTML = '';
  R.historique.forEach((h, i) => {
    const d = document.createElement('div');
    d.className = 'it';
    d.innerHTML = '<span class="nom">' + escapeHtml(h.label || '') + (h.pos ? ' <span class="sous">#' + h.pos + '</span>' : '') + '</span>' +
      '<span class="sous">' + (h.trad ? h.trad + ' · ' : '') + (h.quand ? new Date(h.quand).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '') + '</span>' +
      '<span class="x" data-hx="' + i + '" title="Supprimer">✕</span>';
    d.onclick = e => {
      if (e.target.dataset.hx !== undefined) { R.historique.splice(+e.target.dataset.hx, 1); enregistrer('historique', R.historique); dessinerHistorique(); return; }
      revenir(h);
    };
    c.append(d);
  });
}
async function revenir(h) {
  if (!h) return;
  if (h.type === 'brochure') await ouvrirBrochure(h.id, h.trad || R.trad, h.repara != null ? h.repara : 0, h.religne, true);
  else if (h.type === 'cantique') await ouvrirCantique(h.id, h.pos, true);
  else if (h.type === 'bible') await ouvrirChapitre(h.livre, h.chapitre, h.verset, true);
}

/* ---------------------------------------------------------------- ZONE 4 : bibliothèque */
function dessinerBiblio() {
  const c = $('#listeBiblio');
  const q = R.filtre.trim();
  $('#filAriane').textContent = '';
  c.innerHTML = '';

  if (R.onglet === 'A') {                                   /* ---- cantiques ---- */
    const liste = (R.index.cantiques || []).filter(x => !q || normaliser(x.name).includes(normaliser(q)));
    if (!liste.length) { c.innerHTML = '<p class="vide">Aucun cantique ne correspond.</p>'; return; }
    liste.forEach(x => c.append(ligneSimple('🎵', x.name, x.units + ' paragraphe' + (x.units > 1 ? 's' : ''), () => ouvrirCantique(x.id))));
    return;
  }

  if (R.onglet === 'B') {                                   /* ---- Bible ---- */
    const cible = analyserReference(q);
    if (cible) {
      /* la référence est utilisée telle quelle : on vide la recherche pour ne pas
         rappeler l'ouverture en boucle (garde-fou supplémentaire ci-dessous) */
      if (R.referenceVue === cible.texte) { c.innerHTML = '<p class="vide">' + escapeHtml(cible.texte) + ' est ouvert en zone 5.</p>'; return; }
      R.referenceVue = cible.texte;
      R.filtre = ''; $('#recherche').value = '';
      c.innerHTML = '<p class="vide">Ouverture de ' + escapeHtml(cible.texte) + '…</p>';
      ouvrirChapitre(cible.ab, cible.chapitre, cible.verset);
      return;
    }
    R.referenceVue = null;
    if (!R.livre) {
      /* grille 3 colonnes de Genèse à Apocalypse */
      const g = document.createElement('div'); g.className = 'grilleLivres';
      (R.index.bible || []).forEach(l => {
        const b = document.createElement('button'); b.className = 'livre'; b.textContent = l.ab;
        b.title = l.ab + ' — ' + l.chapitres + ' chapitres';
        b.onclick = () => { R.livre = l.ab; R.chapitre = null; R.verset = null; ajouterReserve({ type: 'bible', id: 'bible:' + l.ab, label: 'Livre : ' + l.ab, livre: l.ab, chapitre: null, verset: null }); dessinerBiblio(); };
        g.append(b);
      });
      c.append(g);
      c.append(blocVersets());
      return;
    }
    /* livre choisi : la grille des livres rétrécit, les chapitres apparaissent */
    const g = document.createElement('div'); g.className = 'grilleLivres reduite';
    (R.index.bible || []).forEach(l => {
      const b = document.createElement('button'); b.className = 'livre' + (l.ab === R.livre ? ' actif' : '');
      b.textContent = l.ab;
      b.onclick = () => { R.livre = l.ab; R.chapitre = null; R.verset = null; ajouterReserve({ type: 'bible', id: 'bible:' + l.ab, label: 'Livre : ' + l.ab, livre: l.ab }); dessinerBiblio(); };
      g.append(b);
    });
    c.append(g);
    const nb = (R.index.bible.find(l => l.ab === R.livre) || {}).chapitres || 0;
    const gc = document.createElement('div'); gc.className = 'grilleChapitres';
    /* 1, 2 ou 3 lignes selon leur nombre ; au-delà : défilement (jamais de 4e ligne) */
    const lignesMax = nb <= 8 ? 1 : nb <= 16 ? 2 : 3;
    const largeurCellule = 44;
    const parLigne = Math.max(1, Math.floor((c.clientWidth - 12) / largeurCellule));
    gc.style.maxHeight = (lignesMax * 32) + 'px';
    for (let i = 1; i <= nb; i++) {
      const b = document.createElement('button'); b.className = 'chap' + (i === R.chapitre ? ' actif' : ''); b.textContent = i;
      b.onclick = () => { R.chapitre = i; R.verset = null; ajouterReserve({ type: 'bible', id: 'bible:' + R.livre + ':' + i, label: R.livre + ' ' + i, livre: R.livre, chapitre: i }); ouvrirChapitre(R.livre, i); };
      gc.append(b);
    }
    c.append(gc);
    c.append(blocVersets());
    return;
  }

  /* ---- brochures ---- */
  if (R.brochureListe && R.brochure && R.brochure.id === R.brochureListe.id) {
    /* liste des paragraphes de la brochure ouverte (clic = aller au paragraphe) */
    $('#filAriane').textContent = R.brochure.name + ' · ' + R.trad;
    const retour = document.createElement('div'); retour.className = 'it';
    retour.innerHTML = '<span class="nom">← Retour aux brochures</span>';
    retour.onclick = () => { R.brochureListe = null; R.brochure = null; dessinerBiblio(); };
    c.append(retour);
    const paras = R.brochure.tr[R.trad] || [];
    paras.forEach((lignes, pi) => {
      const d = document.createElement('div');
      d.className = 'it' + (pi === R.para ? ' sel' : '');
      d.innerHTML = '<span class="type">§' + (pi + 1) + '</span><span class="nom">' + escapeHtml((lignes[0] || '').slice(0, 70)) + '…</span>';
      d.onclick = () => allerParagraphe(pi);
      d.ondblclick = () => { allerParagraphe(pi); projeterLigne(0, true); };
      c.append(d);
    });
    return;
  }
  const liste = (R.index.brochures || []).filter(b => !q || normaliser(b.name + ' ' + b.code).includes(normaliser(q)));
  if (!liste.length) { c.innerHTML = '<p class="vide">Aucune brochure ne correspond.</p>'; return; }
  if (q.length > 2 && liste.length <= 12) { /* recherche dans le texte de la brochure ouverte non nécessaire ici */ }
  c.innerHTML = '<p class="vide">' + liste.length + ' brochure(s) — cliquez pour voir les traductions disponibles.</p>';
  liste.slice(0, 400).forEach(b => {
    const d = document.createElement('div');
    d.className = 'it' + (R.brochureListe && R.brochureListe.id === b.id ? ' sel' : '');
    d.innerHTML = '<span class="type">' + (b.code || '') + '</span><span class="nom">' + escapeHtml(b.name) + '</span>' +
      '<span class="sous">' + b.tr.join(' · ') + '</span>';
    d.onclick = () => {
      R.brochureListe = b;
      ajouterReserve({ type: 'brochure', id: b.id, label: b.name, trad: R.trad, para: 0 });
      const tr = b.tr.indexOf(R.trad) >= 0 ? R.trad : b.tr[0];
      ouvrirBrochure(b.id, tr, 0, null, false);
    };
    c.append(d);
  });
}

function blocVersets() {
  /* versets du chapitre choisi : petits carreaux numérotés, au plus 5 lignes, défilement au-delà */
  const wrap = document.createElement('div');
  if (!R.livre || !R.chapitre) return wrap;
  wrap.className = 'grilleVersets';
  wrap.id = 'grilleVersets';
  wrap.style.maxHeight = (5 * 26) + 'px';
  api.chapitre(R.livre, R.chapitre).then(versets => {
    versets.forEach((v, i) => {
      const n = i + 1;
      const b = document.createElement('button');
      b.className = 'verset-mini' + (n === R.verset ? ' actif' : '');
      b.textContent = n;
      b.onclick = () => { R.verset = n; ajouterReserve({ type: 'bible', id: 'bible:' + R.livre + ':' + R.chapitre + ':' + n, label: R.livre + ' ' + R.chapitre + ':' + n, livre: R.livre, chapitre: R.chapitre, verset: n }); dessinerBiblio(); dessinerGestion(); };
      b.ondblclick = () => { R.verset = n; dessinerGestion(); projeterVerset(true); };
      wrap.append(b);
    });
  });
  return wrap;
}
function ligneSimple(icone, titre, sous, action, boutonPlus) {
  const d = document.createElement('div'); d.className = 'it';
  d.innerHTML = '<span class="type">' + icone + '</span><span class="nom" title="' + escapeAttr(titre) + '">' + escapeHtml(titre) + '</span>' +
    (sous ? '<span class="sous">' + escapeHtml(sous) + '</span>' : '') + (boutonPlus ? '<span class="plus" title="Ajouter à la réserve">＋</span>' : '');
  d.onclick = e => {
    if (boutonPlus && e.target.classList.contains('plus')) { ajouterReserve(boutonPlus); notifier('Ajouté à la réserve.'); return; }
    action();
  };
  d.ondblclick = () => { action(); setTimeout(() => projeterSelection(), 220); };
  return d;
}

/* ---------------------------------------------------------------- références bibliques */
const ALIAS = {
  gn: 'Gn', gen: 'Gn', genese: 'Gn', ex: 'Ex', exode: 'Ex', lv: 'Lv', lev: 'Lv', levitique: 'Lv', nb: 'Nb', nom: 'Nb', nombres: 'Nb',
  dt: 'Dt', deut: 'Dt', deuteronome: 'Dt', jos: 'Jos', josue: 'Jos', jg: 'Jg', jug: 'Jg', juges: 'Jg', rt: 'Rt', ruth: 'Rt',
  '1s': '1S', '1sa': '1S', '1samuel': '1S', '2s': '2S', '2samuel': '2S', '1r': '1R', '1rois': '1R', '2r': '2R', '2rois': '2R',
  '1ch': '1Ch', '2ch': '2Ch', esd: 'Esd', ne: 'Ne', nehemie: 'Ne', est: 'Est', esther: 'Est', jb: 'Jb', job: 'Jb',
  ps: 'Ps', psaume: 'Ps', psaumes: 'Ps', pr: 'Pr', prov: 'Pr', proverbes: 'Pr', ec: 'Ec', eclesiaste: 'Ec', ct: 'Ct', cantique: 'Ct',
  es: 'Es', esaie: 'Es', isaie: 'Es', jr: 'Jr', jeremie: 'Jr', lm: 'Lm', lamentations: 'Lm', ez: 'Ez', ezechiel: 'Ez', dn: 'Dn', daniel: 'Dn',
  os: 'Os', osee: 'Os', jl: 'Jl', joel: 'Jl', am: 'Am', amos: 'Am', ab: 'Ab', abdias: 'Ab', jon: 'Jon', jonas: 'Jon',
  mi: 'Mi', michee: 'Mi', na: 'Na', nahum: 'Na', ha: 'Ha', hab: 'Ha', habacuc: 'Ha', so: 'So', sophonie: 'So', ag: 'Ag', aggee: 'Ag',
  za: 'Za', zacharie: 'Za', ml: 'Ml', malachie: 'Ml', mt: 'Mt', mat: 'Mt', matthieu: 'Mt', mc: 'Mc', marc: 'Mc', lc: 'Lc', luc: 'Lc',
  jn: 'Jn', jean: 'Jn', ac: 'Ac', actes: 'Ac', rm: 'Rm', rom: 'Rm', romains: 'Rm', '1co': '1Co', '2co': '2Co', ga: 'Ga', gal: 'Ga', galates: 'Ga',
  ep: 'Ep', eph: 'Ep', ephesiens: 'Ep', ph: 'Ph', phil: 'Ph', philippiens: 'Ph', col: 'Col', colossiens: 'Col',
  '1th': '1Th', '2th': '2Th', '1tm': '1Tm', '2tm': '2Tm', '1ti': '1Tm', '2ti': '2Tm', tt: 'Tt', tite: 'Tt', phm: 'Phm', philemon: 'Phm',
  he: 'He', heb: 'He', hebreux: 'He', jc: 'Jc', jacques: 'Jc', '1p': '1P', '1pi': '1P', '1pierre': '1P', '2p': '2P', '2pierre': '2P',
  '1jn': '1Jn', '2jn': '2Jn', '3jn': '3Jn', jud: 'Jud', jude: 'Jud', ap: 'Ap', apoc: 'Ap', apocalypse: 'Ap'
};
function analyserReference(q) {
  if (!q || !R.index) return null;
  const m = normaliser(q).replace(/\s+/g, ' ').trim().match(/^((?:[1-3]\s?)?[a-z.]+)\s*(\d+)?\s*[:.,]?\s*(\d+)?$/);
  if (!m) return null;
  const cle = m[1].replace(/[.\s]/g, '');
  const ab = ALIAS[cle] || (R.index.bible.find(l => normaliser(l.ab) === cle) || {}).ab;
  if (!ab) return null;
  /* La demande est respectée telle quelle : on ne remplace jamais « Jn 3 » par un autre
     chapitre. Un chapitre qui n'existe pas est signalé franchement (voir ouvrirChapitre). */
  const chapitre = m[2] ? +m[2] : 1;
  const verset = m[3] ? +m[3] : null;
  return { ab, chapitre, verset, texte: ab + ' ' + chapitre + (verset ? ':' + verset : '') };
}

/* ---------------------------------------------------------------- ZONE 5 : gestion */
function dessinerGestion() {
  const corps = $('#corpsGestion'), outils = $('#outilsGestion');
  outils.innerHTML = '';
  if (R.brochure) {                                       /* ---- brochure ---- */
    $('#titreGestion').textContent = R.brochure.name + ' — ' + R.trad;
    outils.innerHTML = '<button class="mini" data-trad="VGR">VGR</button><button class="mini" data-trad="Shekina">Shekina</button>' +
      '<button class="mini" id="bCopierBrochure">Copier</button>';
    $$('#outilsGestion .mini[data-trad]').forEach(b => {
      b.classList.toggle('actif', b.dataset.trad === R.trad);
      if (!R.brochure.tr[b.dataset.trad]) b.disabled = true;
      b.onclick = () => changerTraduction(b.dataset.trad);
    });
    const copier = $('#bCopierBrochure'); if (copier) copier.onclick = () => copierTexte(corps.innerText, 'Brochure copiée.');
    corps.innerHTML = '';
    const paras = R.brochure.tr[R.trad] || [];
    paras.forEach((lignes, pi) => {
      const d = document.createElement('div');
      d.className = 'para' + (pi === R.para ? ' actif' : '');
      d.dataset.para = pi;
      const t = document.createElement('div');
      d.append(t);
      lignes.forEach((txt, li) => {
        const l = document.createElement('div');
        l.className = 'lig' + (estSelection(pi, li) ? ' sel' : '') + (estProjete(pi, li) ? ' proj' : '');
        l.dataset.para = pi; l.dataset.lig = li;
        l.innerHTML = '<span class="para-num">' + (li === 0 ? '§' + (pi + 1) : '') + '</span>' + escapeHtml(txt);
        l.onclick = () => { R.para = pi; R.ligne = li; dessinerGestion(); dessinerBiblio(); };
        l.ondblclick = () => { R.para = pi; R.ligne = li; projeterLigne(li, true); };
        t.append(l);
      });
      corps.append(d);
    });
    const actif = corps.querySelector('.para.actif');
    defiler(actif, 'nearest');
    return;
  }
  if (R.cantique) {                                       /* ---- cantique ---- */
    $('#titreGestion').textContent = R.cantique.name;
    outils.innerHTML = '<button class="mini" id="bEditer">Éditer</button><button class="mini" id="bType">Marquer couplet/refrain</button>' +
      '<button class="mini" id="bProjeterTout">Projeter tout</button>';
    $('#bEditer').onclick = () => ouvrirEdition();
    $('#bType').onclick = () => marquerType();
    $('#bProjeterTout').onclick = () => projeter(R.cantique.units.join('\n\n'), R.cantique.name + ' (entier)', 'cantique', -1);
    corps.innerHTML = '';
    R.cantique.units.forEach((u, i) => {
      const d = document.createElement('div');
      d.className = 'unite' + (i === R.ligne ? ' sel' : '') + (R.projete && R.projete.id === R.cantique.name && R.projete.pos === i ? ' live' : '');
      const type = (R.cantique.types || [])[i];
      d.innerHTML = '<span class="etiquette">' + (type === 'refrain' ? 'Refrain' : type === 'couplet' ? 'Couplet' : 'Paragraphe ' + (i + 1)) + '</span>' + escapeHtml(u);
      d.onclick = () => { R.ligne = i; dessinerGestion(); };
      d.ondblclick = () => { R.ligne = i; projeterUnite(i, true); };
      corps.append(d);
    });
    return;
  }
  if (R.livre && R.chapitre) {                            /* ---- Bible ---- */
    $('#titreGestion').textContent = R.livre + ' ' + R.chapitre;
    outils.innerHTML = '<button class="mini" id="bChapitrePrec">◀ chapitre</button><button class="mini" id="bChapitreSuiv">chapitre ▶</button>' +
      '<button class="mini" id="bProjeterChapitre">Projeter le chapitre</button>';
    $('#bChapitrePrec').onclick = () => naviguerChapitre(-1);
    $('#bChapitreSuiv').onclick = () => naviguerChapitre(1);
    $('#bProjeterChapitre').onclick = () => projeterChapitre(true);
    corps.innerHTML = '<p class="vide">Chargement…</p>';
    api.chapitre(R.livre, R.chapitre).then(versets => {
      corps.innerHTML = '';
      versets.forEach((v, i) => {
        const n = i + 1;
        const d = document.createElement('div');
        d.className = 'verset-ligne' + (n === R.verset ? ' sel' : '') + (R.projete && R.projete.id === R.livre + ' ' + R.chapitre + ':' + n ? ' proj' : '');
        d.innerHTML = '<span class="num">' + n + '</span><span>' + escapeHtml(String(v).replace(/^\d+\s/, '')) + '</span>';
        d.onclick = () => { R.verset = n; ajouterReserve({ type: 'bible', id: 'bible:' + R.livre + ':' + R.chapitre + ':' + n, label: R.livre + ' ' + R.chapitre + ':' + n, livre: R.livre, chapitre: R.chapitre, verset: n }); dessinerGestion(); dessinerBiblio(); };
        d.ondblclick = () => { R.verset = n; projeterVerset(true); };
        corps.append(d);
      });
      const sel = corps.querySelector('.verset-ligne.sel');
      defiler(sel, 'nearest');
    });
    return;
  }
  $('#titreGestion').textContent = 'Gestion';
  corps.innerHTML = '<p class="vide">Choisissez un cantique, un passage de la Bible ou une brochure en zone 4.<br>' +
    'Double-clic = projection immédiate · Flèches = élément ou ligne suivant.</p>';
}
function estSelection(pi, li) { return R.para === pi && R.ligne === li; }
function estProjete(pi, li) { return R.projete && R.projete.id === R.brochure.name && R.projete.repara === pi && R.projete.religne === li; }

/* ---- actions par type ---- */
function projeterUnite(i, immediat) {
  if (!R.cantique) return;
  R.ligne = i;
  const type = (R.cantique.types || [])[i];
  const label = R.cantique.name + ' — ' + (type === 'refrain' ? 'Refrain' : type === 'couplet' ? 'Couplet ' + (i + 1) : 'Paragraphe ' + (i + 1));
  projeter(R.cantique.units[i], label, 'cantique', i);
  R.projete.id = R.cantique.name; R.projete.pos = i;
  dessinerGestion();
}
function projeterVerset(immediat) {
  if (!R.livre || !R.chapitre || !R.verset) return;
  api.chapitre(R.livre, R.chapitre).then(versets => {
    const texte = versets[R.verset - 1]; if (!texte) return;
    const label = R.livre + ' ' + R.chapitre + ':' + R.verset;
    projeter(texte, label, 'bible', R.verset);
    dessinerGestion();
  });
}
function projeterChapitre(immediat) {
  if (!R.livre || !R.chapitre) return;
  api.chapitre(R.livre, R.chapitre).then(versets => {
    projeter(versets.join('\n'), R.livre + ' ' + R.chapitre + ' (entier)', 'bible', R.chapitre);
    dessinerGestion();
  });
}
function projeterLigne(li, immediat) {
  if (!R.brochure) return;
  const paras = R.brochure.tr[R.trad] || [];
  const lignes = paras[R.para] || [];
  const texte = lignes[li == null ? R.ligne : li];
  if (!texte) return;
  const label = R.brochure.name.slice(0, 34) + ' — §' + (R.para + 1) + ', ligne ' + ((li == null ? R.ligne : li) + 1);
  projeter(texte, label, 'brochure', R.para);
  R.projete.id = R.brochure.name; R.projete.repara = R.para; R.projete.religne = (li == null ? R.ligne : li); R.projete.trad = R.trad;
  enregistrer('dernier_brochure', { id: R.brochure.id, trad: R.trad, para: R.para, ligne: R.projete.religne });
  dessinerGestion();
}
function projeterSelection() {
  if (R.brochure) projeterLigne(R.ligne, true);
  else if (R.cantique) projeterUnite(R.ligne >= 0 ? R.ligne : 0, true);
  else if (R.livre && R.chapitre && R.verset) projeterVerset(true);
}

/* ---- navigation (flèches) ---- */
function suivant() {
  if (R.brochure) {
    const paras = R.brochure.tr[R.trad] || [];
    let li = R.ligne < 0 ? 0 : R.ligne + 1;
    if (li >= (paras[R.para] || []).length) { if (R.para + 1 < paras.length) { R.para++; li = 0; } else { li = (paras[R.para] || []).length - 1; notifier('Fin de la brochure.'); } }
    R.ligne = li; projeterLigne(li, true);
  } else if (R.cantique) {
    const i = Math.min(R.cantique.units.length - 1, (R.ligne < 0 ? -1 : R.ligne) + 1);
    projeterUnite(i, true);
  } else if (R.livre && R.chapitre) {
    const suivant = Math.min((R.verset || 0) + 1, 200);
    if (R.verset && R.verset >= 176) { naviguerChapitre(1); return; }
    R.verset = suivant; projeterVerset(true);
  } else notifier('Choisissez d’abord un élément en zone 4.');
}
function precedent() {
  if (R.brochure) {
    const paras = R.brochure.tr[R.trad] || [];
    let li = R.ligne <= 0 ? 0 : R.ligne - 1;
    if (R.ligne <= 0 && R.para > 0) { R.para--; li = (paras[R.para] || []).length - 1; }
    R.ligne = li; projeterLigne(li, true);
  } else if (R.cantique) projeterUnite(Math.max(0, (R.ligne < 0 ? 0 : R.ligne) - 1), true);
  else if (R.livre && R.chapitre) { R.verset = Math.max(1, (R.verset || 1) - 1); projeterVerset(true); }
  else notifier('Choisissez d’abord un élément en zone 4.');
}
function naviguerChapitre(d) {
  if (!R.livre) return;
  const nb = (R.index.bible.find(l => l.ab === R.livre) || {}).chapitres || 1;
  let ch = (R.chapitre || 1) + d;
  if (ch < 1) { const i = R.index.bible.findIndex(l => l.ab === R.livre); if (i > 0) { R.livre = R.index.bible[i - 1].ab; ch = R.index.bible[i - 1].chapitres; } else ch = 1; }
  else if (ch > nb) { const i = R.index.bible.findIndex(l => l.ab === R.livre); if (i < R.index.bible.length - 1) { R.livre = R.index.bible[i + 1].ab; ch = 1; } else ch = nb; }
  R.chapitre = ch; R.verset = null;
  ouvrirChapitre(R.livre, ch);
}

/* ---------------------------------------------------------------- ouvertures */
async function ouvrirCantique(id, position, projeterAussitot) {
  const c = await api.cantique(id);
  if (!c) { notifier('Cantique introuvable.'); return; }
  R.cantique = c; R.brochure = null; R.brochureListe = null; R.ligne = position == null ? -1 : position;
  ajouterReserve({ type: 'cantique', id: c.id, label: c.name, pos: R.ligne });
  dessinerGestion(); dessinerBiblio();
  if (projeterAussitot) projeterUnite(R.ligne < 0 ? 0 : R.ligne, true);
}
async function ouvrirBrochure(id, trad, para, ligne, projeterAussitot) {
  const b = await api.brochure(id);
  if (!b) { notifier('Brochure introuvable.'); return; }
  R.brochure = b; R.cantique = null;
  R.brochureListe = (R.index.brochures || []).find(x => x.id === id) || { id, name: b.name, tr: Object.keys(b.tr), code: b.code };
  R.trad = (b.tr[trad] ? trad : Object.keys(b.tr)[0]);
  R.para = para || 0;
  R.ligne = ligne == null ? 0 : ligne;
  ajouterReserve({ type: 'brochure', id: b.id, label: b.name, trad: R.trad, para: R.para, ligne: R.ligne });
  dessinerGestion(); dessinerBiblio();
  if (projeterAussitot) projeterLigne(R.ligne, true);
}
async function ouvrirChapitre(ab, chapitre, verset, projeterAussitot) {
  const dispo = await api.chapitre(ab, chapitre);
  if (!dispo || !dispo.length) { notifier(ab + ' ' + chapitre + ' n’est pas disponible dans cette bibliothèque.'); return; }
  R.livre = ab; R.chapitre = chapitre; R.verset = verset || null;
  R.brochure = null; R.cantique = null; R.brochureListe = null;
  ajouterReserve({ type: 'bible', id: 'bible:' + ab + ':' + chapitre + (verset ? ':' + verset : ''), label: ab + ' ' + chapitre + (verset ? ':' + verset : ''), livre: ab, chapitre, verset: verset || null });
  R.onglet = 'B';
  $$('.onglet').forEach(o => o.classList.toggle('actif', o.dataset.onglet === 'B'));
  dessinerGestion(); dessinerBiblio();
  if (projeterAussitot) { if (verset) projeterVerset(true); else projeterChapitre(true); }
}
function allerParagraphe(pi) {
  R.para = pi; R.ligne = 0;
  const paras = (R.brochure && R.brochure.tr[R.trad]) || [];
  if (!paras[pi]) return;
  dessinerGestion(); dessinerBiblio();
  /* la zone 5 monte aussitôt à ce paragraphe et surligne sa première ligne */ 
  setTimeout(() => defiler($('#corpsGestion .para.actif'), 'center'), 30);
}
function changerTraduction(t) {
  if (!R.brochure || !R.brochure.tr[t]) return;
  const para = R.para, ligne = R.ligne;
  R.trad = t;
  const paras = R.brochure.tr[t];
  R.para = Math.min(para, paras.length - 1);
  R.ligne = Math.min(ligne, (paras[R.para] || []).length - 1);
  if (R.projete && R.projete.id === R.brochure.name) projeterLigne(R.ligne, true);   /* la ligne projetée est remplacée */
  else { dessinerGestion(); dessinerBiblio(); }
}

/* ---------------------------------------------------------------- cantiques : édition */
function ouvrirEdition() {
  if (!R.cantique) return;
  $('#titreEdition').textContent = 'Éditer — ' + R.cantique.name;
  $('#texteEdition').value = R.cantique.units.join('\n\n');
  $('#boiteEdition').showModal();
}
$('#bAnnulerEdition').onclick = () => $('#boiteEdition').close();
$('#bEnregistrerEdition').onclick = async () => {
  const unites = $('#texteEdition').value.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  if (!unites.length) { notifier('Le cantique est vide.'); return; }
  /* une ligne vide crée un nouveau paragraphe : jamais collé au précédent */
  R.cantique.units = unites;
  const modif = await api.enregistrerCantique(R.cantique.id, { units: unites, types: R.cantique.types });
  if (modif) R.cantique = modif;
  const dansIndex = (R.index.cantiques || []).find(c => c.id === R.cantique.id);
  if (dansIndex) dansIndex.units = unites.length;
  $('#boiteEdition').close();
  dessinerGestion(); dessinerBiblio();
  notifier('Cantique enregistré (' + unites.length + ' paragraphes).');
};
function marquerType() {
  if (!R.cantique) return;
  const i = R.ligne >= 0 ? R.ligne : 0;
  R.cantique.types = R.cantique.types || [];
  const actuel = R.cantique.types[i];
  R.cantique.types[i] = actuel === 'couplet' ? 'refrain' : actuel === 'refrain' ? undefined : 'couplet';
  api.enregistrerCantique(R.cantique.id, { types: R.cantique.types });
  dessinerGestion();
  notifier('Paragraphe ' + (i + 1) + ' : ' + (R.cantique.types[i] || 'normal'));
}

/* ---------------------------------------------------------------- ZONE 3 : écran-retour */
function dessinerMiroir() {
  const st = {
    affichage: R.etat.affichage, text: R.etat.text, bg: R.reglages.bg, fg: R.reglages.fg,
    font: R.reglages.font, size: R.reglages.size, margin: R.reglages.margin,
    bold: R.reglages.bold, italic: R.reglages.italic, image: R.reglages.image, shadow: R.reglages.shadow
  };
  const w = (R.etat.screen && R.etat.screen.w) || 1920, h = (R.etat.screen && R.etat.screen.h) || 1080;
  window.Rendu.paintMiroir($('#miroir'), st, w, h);
  $('#infoEcran').textContent = R.etat.screen && R.etat.screen.connected ? '· ' + R.etat.screen.w + '×' + R.etat.screen.h : '· 2e écran absent';
}

/* ---------------------------------------------------------------- ZONE 2 : réglages */
function appliquerReglages(patchReglages) {
  Object.assign(R.reglages, patchReglages);
  api.patch(R.reglages);
  majReglagesUI();
  if (R.parType && R.brochure) R.reglagesParType.brochure = Object.assign({}, R.reglages);
  if (R.parType && R.cantique) R.reglagesParType.cantique = Object.assign({}, R.reglages);
  if (R.parType && R.livre) R.reglagesParType.bible = Object.assign({}, R.reglages);
  if (R.parType) enregistrer('reglages_types', R.reglagesParType);
}
function majReglagesUI() {
  $('#rPolice').value = R.reglages.font;
  $('#vTaille').textContent = R.reglages.size;
  $('#vMarge').textContent = R.reglages.margin;
  $('#rFond').value = /^#[0-9a-f]{6}$/i.test(R.reglages.bg) ? R.reglages.bg : '#000000';
  $('#rTexte').value = /^#[0-9a-f]{6}$/i.test(R.reglages.fg) ? R.reglages.fg : '#ffffff';
  $('#bGras').classList.toggle('actif', !!R.reglages.bold);
  $('#bItalique').classList.toggle('actif', !!R.reglages.italic);
  $('#bOmbre').classList.toggle('actif', R.reglages.shadow !== false);
  $('#infoReglages').textContent = (R.reglages.image ? 'Arrière-plan : image · ' : '') + 'Réduction automatique active (le texte ne dépasse jamais la marge).';
}

/* ---------------------------------------------------------------- clavier */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    if (e.key === 'Escape') e.target.blur();
    return;
  }
  if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); $('#recherche').focus(); $('#recherche').select(); return; }
  if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); annulerSuppression(); return; }
  if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); appliquerReglages({ bold: !R.reglages.bold }); return; }
  if (e.ctrlKey && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); appliquerReglages({ italic: !R.reglages.italic }); return; }
  switch (e.key) {
    case 'ArrowRight': case 'ArrowDown': e.preventDefault(); suivant(); break;
    case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); precedent(); break;
    case 'Enter': e.preventDefault(); projeterSelection(); break;
    case 'F1': e.preventDefault(); basculerProjection(); break;
    case 'F2': e.preventDefault(); basculerAffichage(); break;
    case 'Escape': e.preventDefault(); viderEcran(); notifier('Écran public vidé (Échap).'); break;
  }
});

/* ---------------------------------------------------------------- barre haute */
function basculerProjection() {
  const actif = !R.etat.projection;
  R.etat.projection = actif;
  if (actif) api.reconnecter(); else api.deconnecter();
  $('#bProjection').classList.toggle('on', actif);
  notifier(actif ? 'Projection activée.' : 'Projection désactivée — la fenêtre publique est libérée.');
}
function basculerAffichage() {
  const actif = !R.etat.affichage;
  R.etat.affichage = actif;
  patch({ affichage: actif });
  $('#bAffichage').classList.toggle('on', actif);
}
$('#bProjection').onclick = basculerProjection;
$('#bAffichage').onclick = basculerAffichage;
$('#bDeconnecter').onclick = () => { R.etat.projection = false; $('#bProjection').classList.remove('on'); api.deconnecter(); notifier('Écran 2 libéré. « Projection » pour le reprendre.'); };
$('#bUrgence').onclick = () => { viderEcran(); notifier('Écran public vidé.'); };
$('#bAide').onclick = () => $('#boiteAide').showModal();
$('#bFermerAide').onclick = () => $('#boiteAide').close();
$('#bDossierDonnees').onclick = () => { api.ouvrirDossier(); notifier('Dossier des données ouvert.'); };
$('#bVoirJournal').onclick = async () => {
  const zone = $('#vueJournal');
  const texte = await api.journal();
  zone.textContent = (texte && texte.trim()) ? texte : 'Aucun incident enregistré.';
  zone.style.display = zone.style.display === 'none' ? 'block' : 'none';
};

/* zone 1 / 6 : boutons de vidage */
$('#bReserveVider').onclick = () => { if (!R.reserve.length) return; R.reserve = []; enregistrer('reserve', R.reserve); dessinerReserve(); notifier('Réserve vidée.'); };
$('#bHistVider').onclick = () => { R.historique = []; enregistrer('historique', R.historique); dessinerHistorique(); notifier('Historique vidé.'); };

/* zone 2 : contrôles */
$('#rPolice').onchange = e => appliquerReglages({ font: e.target.value });
$$('[data-regle]').forEach(b => b.onclick = () => {
  const k = b.dataset.regle, pas = +b.dataset.pas;
  const v = Math.max(k === 'size' ? 20 : 0, Math.min(k === 'size' ? 400 : 400, R.reglages[k] + pas));
  appliquerReglages({ [k]: v });
});
$('#bGras').onclick = () => appliquerReglages({ bold: !R.reglages.bold });
$('#bItalique').onclick = () => appliquerReglages({ italic: !R.reglages.italic });
$('#bOmbre').onclick = () => appliquerReglages({ shadow: R.reglages.shadow === false });
$('#rFond').oninput = e => appliquerReglages({ bg: e.target.value, image: '' });
$('#rTexte').oninput = e => appliquerReglages({ fg: e.target.value });
$('#bImage').onclick = async () => { const img = await api.choisirImage(); if (img) { appliquerReglages({ image: img }); notifier('Image d’arrière-plan appliquée.'); } };
$('#bImageOff').onclick = () => appliquerReglages({ image: '', bg: '#000000' });
$('#rParType').onchange = e => { R.parType = e.target.checked; notifier(R.parType ? 'Réglages mémorisés par type.' : 'Réglages mémorisés globalement.'); };

/* zone 4 : onglets et recherche */
$$('.onglet').forEach(o => o.onclick = () => {
  R.onglet = o.dataset.onglet;
  R.brochureListe = null;
  $$('.onglet').forEach(x => x.classList.toggle('actif', x === o));
  dessinerBiblio();
});
$('#recherche').oninput = e => { R.filtre = e.target.value; dessinerBiblio(); };
$('#bEffacerRecherche').onclick = () => { $('#recherche').value = ''; R.filtre = ''; dessinerBiblio(); };

/* ---------------------------------------------------------------- utilitaires texte */
function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
async function copierTexte(t, message) { try { await navigator.clipboard.writeText(t); notifier(message || 'Copié.'); } catch (e) { notifier('Copie impossible.'); } }

/* ---------------------------------------------------------------- état venant du processus principal */
api.onEtat(msg => {
  const e = msg.etat || msg;
  R.etat = Object.assign(R.etat, e);
  if (msg.reserve) R.reserve = msg.reserve;
  if (msg.historique) R.historique = msg.historique;
  const ecran = $('#etatEcran');
  const etat = e.publicWindow;
  ecran.className = 'etat ' + (etat === 'ok' ? 'ok' : etat === 'deconnecte' ? 'dec' : 'cherche');
  ecran.innerHTML = etat === 'ok' ? '● Écran 2 connecté — ' + e.screen.w + '×' + e.screen.h
    : etat === 'deconnecte' ? '○ Écran 2 libéré (Déconnecter)' : '◌ Recherche du 2ᵉ écran…';
  $('#bAffichage').classList.toggle('on', !!e.affichage);
  $('#bProjection').classList.toggle('on', !!e.projection);
  dessinerMiroir();
});

/* ---------------------------------------------------------------- démarrage */
(async function demarrer() {
  try {
    R.index = await api.indexContenu();
    if (R.index.erreur) notifier('Contenu : ' + R.index.erreur);
    const s = R.index.stats || {};
    $('#etatContenu').textContent = '· ' + (s.brochures || 0) + ' brochures · ' + (s.cantiques || 0) + ' cantiques · ' +
      (s.livres || 0) + ' livres (' + (s.versets || 0) + ' versets)' + (s.doubleTraduction ? ' · ' + s.doubleTraduction + ' en VGR+Shekina' : '');
    $('#aideInfos').textContent = 'Contenu chargé en mémoire : aucune connexion internet n’est nécessaire. Dossier des données : ' + (await api.infos()).dossier;
    R.reserve = (await api.lireDonnees('reserve')) || [];
    R.historique = (await api.lireDonnees('historique')) || [];
    R.reglagesParType = (await api.lireDonnees('reglages_types')) || {};
    R.parType = !!(await api.lireDonnees('reglages_par_type'));
    $('#rParType').checked = R.parType;
    const reg = (await api.lireDonnees('reglages')) || null;
    if (reg) Object.assign(R.reglages, {
      font: reg.font || R.reglages.font, size: reg.size || R.reglages.size, margin: reg.margin != null ? reg.margin : R.reglages.margin,
      bg: reg.bg || R.reglages.bg, fg: reg.fg || R.reglages.fg, image: reg.image || '', bold: !!reg.bold, italic: !!reg.italic,
      shadow: reg.shadow !== false
    });
    appliquerReglages({});
    dessinerReserve(); dessinerHistorique(); dessinerBiblio(); dessinerGestion(); majReglagesUI();
    /* reprise au même endroit (annexe D) */
    const d = (await api.lireDonnees('dernier')) || {};
    if (d.type === 'bible' && d.id) { const m = String(d.id).match(/^([1-3]?[A-Za-zé]+)\s+(\d+)(?::(\d+))?/); if (m) ouvrirChapitre(m[1], +m[2], m[3] ? +m[3] : null); }
  } catch (e) {
    document.body.insertAdjacentHTML('beforeend', '<p class="vide">Erreur au démarrage : ' + escapeHtml(e.message) + '</p>');
  }
})();
