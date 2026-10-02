#!/usr/bin/env node
/* ============================================================================
   Malachie 4 Projections — Préparation du contenu
   Convertit une bibliothèque (dossier "data" de la bibliothèque du Message)
   au format du cahier des charges (annexe F) :
     Bible    : bible[livre abrégé][chapitre] = [ "1 texte du verset", ... ]
     Cantique : { id, name, units: [strophe, refrain, ...] }
     Brochure : { id, name, tr: { VGR: [[lignes]], Shekina: [[lignes]] } }

   Usage :
     node outils/preparer_contenu.js --bibliotheque="../data" --sortie="content"
     node outils/preparer_contenu.js --bibliotheque="../data" --max=300
     node outils/preparer_contenu.js --bible-seule
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const args = {};
process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) args[m[1]] = m[2] === undefined ? true : m[2]; });
const BIB = args.bibliotheque ? path.resolve(args.bibliotheque) : path.resolve(__dirname, '../../data');
const OUT = args.sortie ? path.resolve(args.sortie) : path.resolve(__dirname, '../content');
const MAX = args.max ? parseInt(args.max, 10) : 0;      // 0 = toute la bibliothèque

const LIRE = f => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8'));
const ko = n => Math.round(n / 1024) + ' Ko';

/* ---------- 1. Bible ---------- */
const ABREV = {
  GEN:'Gn', EXO:'Ex', LEV:'Lv', NUM:'Nb', DEU:'Dt', JOS:'Jos', JDG:'Jg', RUT:'Rt', '1SA':'1S', '2SA':'2S',
  '1KI':'1R', '2KI':'2R', '1CH':'1Ch', '2CH':'2Ch', EZR:'Esd', NEH:'Ne', EST:'Est', JOB:'Jb', PSA:'Ps',
  PRO:'Pr', ECC:'Ec', SNG:'Ct', ISA:'Es', JER:'Jr', LAM:'Lm', EZK:'Ez', DAN:'Dn', HOS:'Os', JOL:'Jl',
  AMO:'Am', OBA:'Ab', JON:'Jon', MIC:'Mi', NAM:'Na', HAB:'Ha', ZEP:'So', HAG:'Ag', ZEC:'Za', MAL:'Ml',
  MAT:'Mt', MRK:'Mc', LUK:'Lc', JHN:'Jn', ACT:'Ac', ROM:'Rm', '1CO':'1Co', '2CO':'2Co', GAL:'Ga',
  EPH:'Ep', PHP:'Ph', COL:'Col', '1TH':'1Th', '2TH':'2Th', '1TI':'1Tm', '2TI':'2Tm', TIT:'Tt', PHM:'Phm',
  HEB:'He', JAS:'Jc', '1PE':'1P', '2PE':'2P', '1JN':'1Jn', '2JN':'2Jn', '3JN':'3Jn', JUD:'Jud', REV:'Ap'
};
function preparerBible() {
  const src = path.join(BIB, 'bible', 'lsg1910.json.gz');
  if (!fs.existsSync(src)) { console.log('  ! Bible absente :', src); return; }
  const d = LIRE(src), bible = {};
  for (const livre of d.books) {
    const ab = ABREV[livre.code]; if (!ab) continue;
    bible[ab] = {};
    for (const [ch, versets] of Object.entries(livre.chapters)) {
      bible[ab][ch] = Object.keys(versets).sort((a, b) => a - b).map(v => v + ' ' + versets[v]);
    }
  }
  const nv = Object.values(bible).reduce((s, l) => s + Object.values(l).reduce((t, c) => t + c.length, 0), 0);
  const dest = path.join(OUT, 'bible.json.gz');
  fs.writeFileSync(dest, zlib.gzipSync(Buffer.from(JSON.stringify(bible)), { level: 9 }));
  console.log(`  Bible : ${Object.keys(bible).length} livres · ${nv} versets · ${ko(fs.statSync(dest).size)}`);
}

/* ---------- 2. Brochures (double traduction VGR + Shekina) ---------- */
const SERIES_PRIORITAIRES = /^(60-12|63-03|63-07|64-07|65-)/;   // Sept Âges, Sept Sceaux, fin du ministère

function decouperTexte(paras, maxLen = 180) {
  /* Découpe chaque paragraphe en « lignes de lecture » : phrases regroupées,
     jamais de coupure au milieu d'une phrase (lecture continue du cahier des charges). */
  return paras.map(p => {
    const t = String(p).replace(/^\s*\d+[\.\s]\s*/, '').replace(/\s+/g, ' ').trim();
    if (!t) return [];
    const phrases = t.match(/[^.!?…]+[.!?…]+["»)]?|\S[^.!?…]*$/g) || [t];
    const lignes = []; let cur = '';
    for (const ph of phrases) {
      if (cur && (cur.length + ph.length) > maxLen) { lignes.push(cur.trim()); cur = ph; }
      else cur += (cur ? ' ' : '') + ph;
    }
    if (cur.trim()) lignes.push(cur.trim());
    return lignes;
  }).filter(l => l.length);
}

async function preparerBrochures() {
  const dirVgr = path.join(BIB, 'vgr'), dirSer = path.join(BIB, 'sermons');
  if (!fs.existsSync(dirVgr) || !fs.existsSync(dirSer)) { console.log('  ! Bibliothèque brochures absente'); return; }
  const vgr = {}, shp = {}, autres = {};
  for (const f of fs.readdirSync(dirVgr)) if (f.endsWith('.json.gz')) { const d = LIRE(path.join(dirVgr, f)); vgr[d.code] = d; }
  for (const f of fs.readdirSync(dirSer)) {
    if (!f.endsWith('.json.gz')) continue;
    const d = LIRE(path.join(dirSer, f)); const t = (d.trad || '').toUpperCase();
    if (t === 'SHP') { if (!shp[d.code]) shp[d.code] = d; }
    else if (!autres[d.code]) autres[d.code] = d;
  }
  const codes = Array.from(new Set([...Object.keys(vgr), ...Object.keys(shp), ...Object.keys(autres)]));
  let liste = codes.map(c => {
    const v = vgr[c], s = shp[c], a = autres[c];
    const poids = (v ? v.chars : 0) + (s ? s.chars : 0) + (a ? a.chars : 0);
    return { code: c, poids, deux: !!(v && s), v, s, a };
  });
  liste.sort((x, y) => (y.deux - x.deux) || (SERIES_PRIORITAIRES.test(y.code) - SERIES_PRIORITAIRES.test(x.code)) || (y.poids - x.poids));
  const gardees = MAX > 0 ? liste.slice(0, MAX) : liste;
  gardees.sort((x, y) => (x.code || '').localeCompare(y.code || ''));

  const dest = path.join(OUT, 'brochures.json.gz');
  const out = fs.createWriteStream(dest);
  const gz = zlib.createGzip({ level: 9 });
  gz.pipe(out);
  gz.write('[');
  let n = 0, deux = 0, textes = 0;
  for (const e of gardees) {
    const src = e.v || e.a;
    const tr = {};
    if (e.v) tr.VGR = decouperTexte(e.v.paras);
    if (e.s) tr.Shekina = decouperTexte(e.s.paras);
    if (!e.v && e.a) tr[(e.a.trad || 'MS').toUpperCase()] = decouperTexte(e.a.paras);
    if (!Object.keys(tr).length) continue;
    const obj = {
      id: e.code, code: e.code,
      name: (src && src.title) || e.code,
      year: /^\d{2}-/.test(e.code) ? 1900 + parseInt(e.code.slice(0, 2), 10) : null,
      tr,
      pdf: (e.v && e.v.pdf) || (e.a && e.a.pdf) || '',
      audio: (e.v && e.v.audio) || (e.a && (e.a.audio || e.a.mp3)) || '',
      duree: (e.a && e.a.duree) || ''
    };
    gz.write((n ? ',' : '') + JSON.stringify(obj));
    n++; textes += Object.keys(tr).length; if (tr.VGR && tr.Shekina) deux++;
  }
  gz.write(']');
  gz.end();
  await new Promise(r => out.on('close', r));
  console.log(`  Brochures : ${n} (dont ${deux} en double traduction VGR+Shekina · ${textes} textes) · ${ko(fs.statSync(dest).size)}`);
}

/* ---------- 3. Cantiques (recueil de démonstration, domaine public) ---------- */
const CANTIQUES_DEMO = [
  { id:'c01', name:"1 — Plus près de toi, mon Dieu", units:[
    "Plus près de toi, mon Dieu, plus près de toi !\nMême si c'est la croix qui m'élève vers toi,\nMon chant sera toujours : plus près de toi,\nPlus près de toi, mon Dieu, plus près de toi !",
    "Refrain :\nPlus près de toi, plus près de toi,\nPlus près de toi, mon Dieu, plus près de toi !",
    "Si, cheminant au ciel, un doux rayon d'espoir\nMe montre le chemin qui mène jusqu'à toi,\nAlors mon cœur joyeux chantera : plus près,\nPlus près de toi, mon Dieu, plus près de toi !"
  ]},
  { id:'c02', name:"2 — Quel ami fidèle et tendre", units:[
    "Quel ami fidèle et tendre nous avons en Jésus-Christ !\nToujours prêt à nous entendre, à répondre à notre cri.\nIl connaît nos faiblesses, nos chagrins et nos douleurs ;\nNulle part ailleurs qu'en lui nous ne trouvons le repos.",
    "Refrain :\nJésus est notre ami, le plus tendre et le plus sûr,\nIl nous conduit, il nous console, il nous garde jour et nuit.",
    "Il connaît toutes nos peines, il a porté nos douleurs ;\nIl sait bien ce que nous sommes, il nous soutient de sa main.\nQue ta main, Seigneur, nous garde jusqu'à la fin du chemin,\nEt que ta grâce nous conduise au pays des bienheureux."
  ]},
  { id:'c03', name:"3 — Sainte nuit", units:[
    "Sainte nuit ! Cette nuit si belle,\nCelle où le Sauveur nous est né.\nLe monde est dans l'attente et le silence,\nDevant l'enfant qui vient nous sauver.",
    "Refrain :\nÔ nuit de grâce, ô nuit d'amour,\nLe Fils de Dieu nous est donné !"
  ]},
  { id:'c04', name:"4 — Grâce infinie", units:[
    "Grâce infinie ! Que ta douceur est grande,\nPour moi qui étais perdu, errant loin du chemin.\nJ'étais aveugle et sans force, tu m'as sauvé,\nEt je puis dire enfin : grâce infinie !",
    "Refrain :\nGrâce, grâce, grâce infinie,\nTa grâce m'a trouvé, m'a sauvé et m'a gardé."
  ]},
  { id:'c05', name:"5 — Vers toi, Seigneur, s'élève notre chant", units:[
    "Vers toi, Seigneur, s'élève notre chant,\nToi qui veilles sur ton peuple avec bonté.\nDans la nuit comme dans la lumière du jour,\nTa main fidèle nous conduit toujours."
  ]},
  { id:'c06', name:"6 — Ô viens, Emmanuel", units:[
    "Ô viens, Emmanuel ! Tu viens sauver ton peuple,\nQui gémit dans l'attente et l'obscurité.\nRéjouis-toi, et chante, ô Israël :\nLe Fils de Dieu s'approche, il vient à toi."
  ]},
  { id:'c07', name:"7 — Le Seigneur est mon berger", units:[
    "Le Seigneur est mon berger, je ne manquerai de rien.\nIl me fait reposer dans de verts pâturages,\nIl me conduit près des eaux paisibles,\nEt il restaure mon âme.",
    "Quand je marche dans la vallée de l'ombre de la mort,\nJe ne crains aucun mal, car tu es avec moi.\nTa houlette et ton bâton me rassurent,\nEt ta bonté me suivra tous les jours de ma vie."
  ]},
  { id:'c08', name:"8 — Nous t'adorons, Seigneur", units:[
    "Nous t'adorons, Seigneur, Roi de gloire,\nNous te bénissons pour ta grande bonté.\nQue ton nom soit loué dans toute la terre,\nQue ton règne vienne dans nos cœurs.",
    "Refrain :\nLoué sois-tu, loué sois-tu,\nSeigneur Jésus, pour l'éternité !"
  ]}
];
function preparerCantiques() {
  const dest = path.join(OUT, 'cantiques.json');
  if (fs.existsSync(dest) && !args.force) { console.log('  Cantiques : recueil existant conservé'); return; }
  fs.writeFileSync(dest, JSON.stringify(CANTIQUES_DEMO, null, 1));
  console.log(`  Cantiques : ${CANTIQUES_DEMO.length} cantiques de démonstration (remplaçables par vos recueils)`);
}

/* ---------- exécution ---------- */
(async () => {
  console.log('Préparation du contenu — bibliothèque :', BIB);
  fs.mkdirSync(OUT, { recursive: true });
  if (args['bible-seule']) preparerBible();
  else { preparerBible(); await preparerBrochures(); preparerCantiques(); }
  console.log('Terminé. Contenu écrit dans :', OUT);
})();
