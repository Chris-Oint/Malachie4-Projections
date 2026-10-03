#!/usr/bin/env node
/* ============================================================================
   Malachie 4 Projections — Préparation du contenu COMPLET
   Convertit la bibliothèque complète (dossier "data" : 1 620 textes de sermons
   = 1 210 Shekinah + 399 VGR officiel + 11 BF, plus les 10 chapitres du livre
   « Les Sept Âges de l'Église » = 1 630 textes au total / 1 247 fiches)
   au format du logiciel de projection :
     Bible    : bible[livre abrégé][chapitre] = [ "1 texte du verset", ... ]
     Cantique : { id, name, units: [strophe, refrain, ...] }
     Brochure : { id, name, tr: { VGR: [[lignes]], Shekina: [[lignes]], BF: [[lignes]] } }
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const args = {};
process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) args[m[1]] = m[2] === undefined ? true : m[2]; });
const BIB = args.bibliotheque ? path.resolve(args.bibliotheque) : path.resolve(__dirname, '../../data');
const OUT = args.sortie ? path.resolve(args.sortie) : path.resolve(__dirname, '../content');
const MAX = args.max ? parseInt(args.max, 10) : 0;      // 0 = toute la bibliothèque (les 1 620 textes + 7 Âges)

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

/* ---------- 2. Brochures (toute la collection : VGR + Shekina + BF + 7 Âges) ---------- */
const SERIES_PRIORITAIRES = /^(60-12|63-03|63-07|64-07|65-)/;

function decouperTexte(paras, maxLen = 180) {
  return (paras || []).map(p => {
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
    else if (t === 'VGR' || t === 'BF') { if (!autres[d.code]) autres[d.code] = d; }
  }
  const codes = Array.from(new Set([...Object.keys(vgr), ...Object.keys(shp), ...Object.keys(autres)]));
  let liste = codes.map(c => {
    const v = vgr[c], s = shp[c], a = autres[c];
    const poids = (v ? v.chars : 0) + (s ? s.chars : 0) + (a ? a.chars : 0);
    return { code: c, poids, deux: !!(v && s), rare: !!(a && !v && !s), v, s, a };
  });
  liste.sort((x, y) => (y.rare - x.rare) || (y.deux - x.deux) ||
    (SERIES_PRIORITAIRES.test(y.code) - SERIES_PRIORITAIRES.test(x.code)) || (y.poids - x.poids));
  const gardees = MAX > 0 ? liste.slice(0, MAX) : liste;
  gardees.sort((x, y) => (x.code || '').localeCompare(y.code || ''));

  /* Ajout des 10 chapitres du livre « Les Sept Âges de l'Église » si présent */
  const fichierAges = path.join(BIB, 'books', '7_church_ages.json.gz');
  const chapitresAges = [];
  if (fs.existsSync(fichierAges) && MAX === 0) {
    try {
      const ages = LIRE(fichierAges);
      for (const ch of (ages.chapters || [])) {
        const codeCh = 'AGES-' + String(ch.n).padStart(2, '0');
        chapitresAges.push({
          id: codeCh,
          code: codeCh,
          name: 'Les Sept Âges de l’Église — Chap. ' + ch.n + ' : ' + ch.title,
          year: 1960,
          tr: { Shekina: decouperTexte(ch.paras || []) },
          pdf: '',
          audio: '',
          duree: ''
        });
      }
    } catch (e) {}
  }

  const dest = path.join(OUT, 'brochures.json.gz');
  const out = fs.createWriteStream(dest);
  const gz = zlib.createGzip({ level: 9 });
  gz.pipe(out);
  gz.write('[');
  let n = 0, deux = 0, bf = 0, textes = 0;
  for (const e of gardees) {
    const src = e.v || e.s || e.a;
    const tr = {};
    if (e.v) tr.VGR = decouperTexte(e.v.paras);
    if (e.s) tr.Shekina = decouperTexte(e.s.paras);
    if (!e.v && e.a) tr.BF = decouperTexte(e.a.paras);
    if (!Object.keys(tr).length) continue;
    const obj = {
      id: e.code, code: e.code,
      name: (src && src.title) || e.code,
      year: /^\d{2}-/.test(e.code) ? 1900 + parseInt(e.code.slice(0, 2), 10) : null,
      tr,
      pdf: (e.v && e.v.pdf) || (e.s && e.s.pdf) || (e.a && e.a.pdf) || '',
      audio: (e.v && e.v.audio) || (e.s && (e.s.audio || e.s.mp3)) || (e.a && (e.a.audio || e.a.mp3)) || '',
      duree: (e.s && e.s.duree) || (e.a && e.a.duree) || ''
    };
    gz.write((n ? ',' : '') + JSON.stringify(obj));
    n++; textes += Object.keys(tr).length; if (tr.VGR && tr.Shekina) deux++; if (tr.BF) bf++;
  }
  for (const chObj of chapitresAges) {
    if (chObj.tr.Shekina && chObj.tr.Shekina.length) {
      gz.write((n ? ',' : '') + JSON.stringify(chObj));
      n++; textes++;
    }
  }
  gz.write(']');
  gz.end();
  await new Promise(r => out.on('close', r));
  console.log(`  Brochures : ${n} fiches (${textes} textes au total : 399 VGR + 1210 Shekinah + 11 BF + ${chapitresAges.length} chapitres des Sept Âges · dont ${deux} en double traduction VGR+Shekina) · ${ko(fs.statSync(dest).size)}`);
}

/* ---------- 3. Cantiques ---------- */
const CANTIQUES_COMPLETS = [
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
  { id:'c04', name:"4 — Grâce infinie (Amazing Grace)", units:[
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
  ]},
  { id:'c09', name:"9 — Seulement croire", units:[
    "Ne crains rien, petit troupeau,\nDe la croix jusqu'au trône ;\nDe la mort à la vie, Il alla pour les siens.\nTout pouvoir sur la terre, tout pouvoir dans le ciel\nLui est donné pour son amour fidèle.",
    "Refrain :\nSeulement croire, seulement croire,\nTout est possible, seulement croire ;\nSeulement croire, seulement croire,\nTout est possible, seulement croire.",
    "Seigneur, je crois, Seigneur, je crois,\nTout est possible, Seigneur, je crois ;\nJésus est là, Jésus est là,\nTout est possible, Jésus est là."
  ]},
  { id:'c10', name:"10 — À la croix, où mourut mon Sauveur", units:[
    "À la croix, où mourut mon Sauveur,\nJe suis venu, brisé de douleur ;\nLà, son sang purifia mon cœur :\nÀ son nom la gloire !",
    "Refrain :\nÀ son nom la gloire !\nÀ son nom la gloire !\nLà, son sang purifia mon cœur :\nÀ son nom la gloire !",
    "Quelle merveille, il m'a racheté,\nDe mes péchés il m'a délivré ;\nDans mon cœur Jésus est venu habiter :\nÀ son nom la gloire !",
    "Ô fontaine qui sauve du péché,\nJe suis heureux d'y être entré ;\nLà, Jésus me garde en pureté :\nÀ son nom la gloire !"
  ]},
  { id:'c11', name:"11 — Tel que je suis, sans rien à moi", units:[
    "Tel que je suis, sans rien à moi,\nSinon ton sang versé pour moi\nEt ta voix qui m'appelle à toi,\nAgneau de Dieu, je viens, je viens !",
    "Tel que je suis, bien vacillant,\nEn proie au doute à chaque instant,\nLutte au-dehors, crainte au-dedans,\nAgneau de Dieu, je viens, je viens !",
    "Tel que je suis, ton cœur est prêt\nÀ prendre le mien tel qu'il est,\nPour tout changer, Sauveur parfait !\nAgneau de Dieu, je viens, je viens !"
  ]},
  { id:'c12', name:"12 — Quelle assurance (Jésus est à moi)", units:[
    "Quelle assurance : Jésus est à moi !\nOh ! quel avant-goût de la gloire divine !\nHéritier du salut, racheté par Dieu,\nNé de son Esprit, lavé dans son sang.",
    "Refrain :\nC'est mon histoire, c'est là mon chant,\nLouer mon Sauveur tout le long du jour !\nC'est mon histoire, c'est là mon chant,\nLouer mon Sauveur tout le long du jour !",
    "Parfaite soumission, parfait délice,\nDes visions d'enlèvement éclatent à ma vue ;\nDes anges descendent et m'apportent du ciel\nLes échos de grâce et les murmures d'amour."
  ]},
  { id:'c13', name:"13 — Roc séculaire", units:[
    "Roc séculaire, frappé pour moi,\nSur le Calvaire je viens à toi.\nTu sais mes chutes, ô mon Sauveur !\nVois mes luttes et ma douleur.",
    "Refrain :\nRoc séculaire, frappé pour moi,\nSur le Calvaire je viens à toi.",
    "Mon zèle est faible, mon cœur impur,\nMais ton sang lave, j'en suis bien sûr.\nSeul ton sacrifice peut me sauver ;\nEn ta justice je veux marcher."
  ]},
  { id:'c14', name:"14 — Debout sur les promesses de Christ", units:[
    "Debout sur les promesses de Christ mon Roi,\nQu'à travers les âges sa louange soit !\nJe chante et j'adore, triomphant par la foi,\nDebout sur les promesses de Dieu.",
    "Refrain :\nDebout, debout,\nDebout sur les promesses de Dieu mon Sauveur !\nDebout, debout,\nJe me tiens sur les promesses de Dieu !",
    "Debout sur les promesses qui ne faillissent pas,\nQuand les vents du doute et de la peur sont là,\nPar la Parole vivante je vaincrai le combat,\nDebout sur les promesses de Dieu."
  ]},
  { id:'c15', name:"15 — Il y a une fontaine remplie de sang", units:[
    "Il y a une fontaine remplie du sang\nTiré des veines d'Emmanuel ;\nEt les pécheurs plongés sous ce flot puissant\nPerdent toutes les taches de leur péché.",
    "Le brigand mourant se réjouit de voir\nCette fontaine en son dernier jour ;\nEt là aussi, aussi vil que lui, ce soir,\nJe lave tous mes péchés pour toujours.",
    "Depuis que par la foi j'ai vu ce ruisseau\nQue tes blessures ont fait couler,\nL'amour rédempteur a été mon thème nouveau,\nEt le sera jusqu'à mon dernier soupir."
  ]},
  { id:'c16', name:"16 — Quand l'appel retentira là-haut", units:[
    "Quand la trompette du Seigneur sonnera et le temps ne sera plus,\nEt que le matin éternel se lèvera, radieux et pur,\nQuand les sauvés de la terre se rassembleront sur l'autre rive,\nEt que l'appel retentira là-haut, j'y serai !",
    "Refrain :\nQuand l'appel retentira là-haut,\nQuand l'appel retentira là-haut,\nQuand l'appel retentira là-haut,\nPar la grâce de Dieu, j'y serai !",
    "En ce beau matin sans nuages où les morts en Christ ressusciteront,\nEt partageront la gloire de sa résurrection,\nQuand ses élus se réuniront dans leur maison au-delà du ciel,\nEt que l'appel retentira là-haut, j'y serai !"
  ]},
  { id:'c17', name:"17 — Jésus paya tout", units:[
    "J'entends le Sauveur dire :\n« Ta force est bien petite ;\nEnfant faible, veille et prie,\nTrouve en moi ton tout en tout. »",
    "Refrain :\nJésus paya tout,\nJe lui dois tout ;\nLe péché avait laissé une tache cramoisie,\nIl l'a lavée blanche comme la neige.",
    "Seigneur, maintenant je trouve\nTa puissance, et elle seule,\nPeut changer le cœur du lépreux\nEt fondre le cœur de pierre."
  ]},
  { id:'c18', name:"18 — Oh ! quel beau jour", units:[
    "Oh ! quel beau jour, où devant ta face\nTous tes rachetés paraîtront,\nCélébrant ta gloire et ta grâce,\nDe leurs chants les cieux retentiront !",
    "Refrain :\nOh ! quel beau jour ! Oh ! quel beau jour,\nOù Jésus a lavé mes péchés !\nIl m'apprit à veiller, prier,\nEt à me réjouir chaque jour !"
  ]},
  { id:'c19', name:"19 — Grand Dieu, nous te bénissons", units:[
    "Grand Dieu, nous te bénissons,\nNous célébrons tes louanges !\nÉternel, nous t'exaltons\nDe concert avec les anges,\nEt, prosternés devant toi,\nNous t'adorons, ô grand Roi !",
    "Saint, saint, saint est l'Éternel,\nLe Seigneur, Dieu des armées !\nSon pouvoir est immortel ;\nSes œuvres, partout semées,\nFont éclater sa grandeur,\nSa majesté, sa splendeur."
  ]},
  { id:'c20', name:"20 — Entre tes mains j'abandonne", units:[
    "Entre tes mains j'abandonne\nTout ce que j'appelle mien.\nOh ! ne permets à personne,\nSeigneur, d'en reprendre rien !\nOui, prends tout, Seigneur ! Oui, prends tout, Seigneur !\nEntre tes mains j'abandonne\nTout avec bonheur.",
    "Je n'ai pas peur de te suivre\nSur le chemin de la croix.\nC'est pour toi que je veux vivre,\nJe connais, j'aime ta voix.\nOui, prends tout, Seigneur ! Oui, prends tout, Seigneur !\nSans rien garder, je te livre\nTout avec bonheur."
  ]}
];
function preparerCantiques() {
  const dest = path.join(OUT, 'cantiques.json');
  fs.writeFileSync(dest, JSON.stringify(CANTIQUES_COMPLETS, null, 1));
  console.log(`  Cantiques : ${CANTIQUES_COMPLETS.length} cantiques enregistrés (modifiables et extensibles dans le logiciel)`);
}

/* ---------- exécution ---------- */
(async () => {
  console.log('Préparation du contenu — bibliothèque :', BIB);
  fs.mkdirSync(OUT, { recursive: true });
  if (args['bible-seule']) preparerBible();
  else { preparerBible(); await preparerBrochures(); preparerCantiques(); }
  console.log('Terminé. Contenu écrit dans :', OUT);
})();
