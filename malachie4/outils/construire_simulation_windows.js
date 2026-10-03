#!/usr/bin/env node
/* ============================================================================
   Construit la SIMULATION D'ORDINATEUR WINDOWS 11 interactive :
   - Bureau Windows 11 avec raccourcis (Setup .exe, INSTALLER-WINDOWS.bat,
     LANCER.bat, LANCER-MODE-SECOURS.bat)
   - Assistant d'installation Windows (.exe) simulé étape par étape
   - Comparatif interactif des Moyens 3 à 7 + Téléchargement direct en 1 clic
     du Setup .exe et du Portable .exe construits par GitHub Actions (Moyen 6)
   - Poste de contrôle complet (6 zones) à gauche + Vidéoprojecteur (Écran 2)
     à droite + simulation de débranchement/rebranchement HDMI (< 2 s)
   - Embarque plusieurs chapitres clés de la Bible + cantiques + brochure
     double traduction (VGR + Shekinah) pour fonctionner 100 % hors ligne,
     et charge automatiquement les 66 livres + 160 brochures si content/ est servi.
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const lire = (f, gz) => {
  const b = fs.readFileSync(path.join(RACINE, f));
  return gz ? JSON.parse(zlib.gunzipSync(b).toString('utf8')) : b.toString('utf8');
};

/* 1. Contenu embarqué (riche mais léger pour un fichier unique autonome) */
const bibleComplete = lire('content/bible.json.gz', true);
const cantiques = JSON.parse(lire('content/cantiques.json', false));
const brochures = lire('content/brochures.json.gz', true);

const chapitresEmbarques = [
  ['Gn', '1'],
  ['Ps', '23'],
  ['Ps', '91'],
  ['Es', '53'],
  ['Mt', '5'],
  ['Jn', '1'],
  ['Jn', '3'],
  ['Ac', '2'],
  ['Rm', '8'],
  ['1Co', '13'],
  ['He', '11'],
  ['Ap', '21']
];
const bible = {};
for (const [ab, ch] of chapitresEmbarques) {
  if (bibleComplete[ab] && bibleComplete[ab][ch]) {
    if (!bible[ab]) bible[ab] = {};
    bible[ab][ch] = bibleComplete[ab][ch];
  }
}
const totalVersetsEmbarques = Object.values(bible).reduce(
  (s, l) => s + Object.values(l).reduce((t, c) => t + c.length, 0), 0
);

/* Sélection de 3 brochures variées (dont double traduction VGR + Shekinah et BF) */
const doubles = brochures.filter(b => b.tr && b.tr.VGR && b.tr.Shekina);
const bfs = brochures.filter(b => b.tr && b.tr.BF);
const brochuresEmbarquees = [];
if (doubles[0]) brochuresEmbarquees.push(doubles[0]);
if (doubles[1]) brochuresEmbarquees.push(doubles[1]);
if (bfs[0]) brochuresEmbarquees.push(bfs[0]);

const contenu = {
  index: {
    stats: {
      livres: Object.keys(bible).length,
      versets: totalVersetsEmbarques,
      cantiques: cantiques.length,
      brochures: brochuresEmbarquees.length,
      doubleTraduction: brochuresEmbarquees.filter(b => b.tr.VGR && b.tr.Shekina).length,
      branhamFr: brochuresEmbarquees.filter(b => b.tr.BF).length
    },
    cantiques: cantiques.map(c => ({ id: c.id, name: c.name, units: c.units.length, types: c.types || null })),
    bible: Object.keys(bible).map(ab => ({ ab, chapitres: Object.keys(bible[ab]).length })),
    brochures: brochuresEmbarquees.map(b => ({
      id: b.id, code: b.code, name: b.name, year: b.year, tr: Object.keys(b.tr || {}),
      paras: Object.fromEntries(Object.entries(b.tr || {}).map(([k, v]) => [k, v.length])),
      pdf: b.pdf || '', audio: b.audio || '', duree: b.duree || ''
    }))
  },
  bible,
  cantiques,
  brochures: brochuresEmbarquees
};

const contenuJson = JSON.stringify(contenu).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

let icone = '';
try { icone = 'data:image/png;base64,' + fs.readFileSync(path.join(RACINE, 'ressources', 'icon-64.png')).toString('base64'); } catch (e) {}

const css = lire('app/control.css');
const rendu = lire('render.js');
const controleJs = lire('app/control.js');
const entete = lire('app/control.html');

const habillageSim = `
/* ================= HABILLAGE SIMULATEUR WINDOWS 11 & MOYENS 3 À 7 ================= */
html,body{height:100%;margin:0;overflow:hidden;font-family:"Segoe UI",system-ui,-apple-system,sans-serif}
body{background:#060a12;display:flex;flex-direction:column;color:var(--tx)}

/* Barre supérieure de pilotage de la simulation + Téléchargement Windows .exe */
#barrePilotage{
  flex:0 0 auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap;
  padding:8px 14px;background:linear-gradient(90deg,#0f1c34,#14284b,#0f1c34);
  border-bottom:1px solid #2b4370;box-shadow:0 4px 16px rgba(0,0,0,.45);z-index:8500
}
.badge-sim{
  display:inline-flex;align-items:center;gap:6px;background:#1d355e;border:1px solid #3c629e;
  color:#e4f0ff;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px
}
.btn-action{
  display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:7px;
  font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;border:1px solid transparent;
  transition:all .15s ease;white-space:nowrap
}
.btn-exe{
  background:linear-gradient(180deg,#1fa855,#15803d);color:#fff;border-color:#22c55e;
  box-shadow:0 2px 10px rgba(34,197,94,.35)
}
.btn-exe:hover{background:linear-gradient(180deg,#22c55e,#16a34a);transform:translateY(-1px)}
.btn-portable{
  background:#1e293b;color:#e2e8f0;border-color:#475569
}
.btn-portable:hover{background:#334155}
.btn-sim{
  background:#1e3a5f;color:#dbeafe;border-color:#3b82f6
}
.btn-sim:hover{background:#254b7c}
.btn-sim.actif{background:#2563eb;color:#fff;border-color:#60a5fa}
.btn-warn{
  background:#3b2712;color:#fde68a;border-color:#d97706
}
.btn-warn:hover{background:#523516}
.pilotage-droite{margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap}

/* Conteneur principal du bureau Windows */
#cadreMoniteur{
  flex:1 1 auto;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 50% 35%,#132442 0%,#080f1d 70%,#050811 100%);overflow:hidden
}
#tout{
  width:1660px;height:880px;transform-origin:center center;
  display:flex;flex-direction:column;
  background:linear-gradient(135deg,#0c1933 0%,#0f2547 45%,#091326 100%);
  border:1px solid #2b3f66;border-radius:12px;
  box-shadow:0 25px 70px rgba(0,0,0,.8);overflow:hidden;position:relative
}
#bureau{
  flex:1 1 auto;min-height:0;display:grid;
  grid-template-columns:118px 1fr 490px;gap:12px;padding:12px 14px 8px;position:relative
}

/* Colonne d'icônes du Bureau Windows à gauche */
#iconesBureau{
  display:flex;flex-direction:column;gap:8px;padding:4px 2px;user-select:none
}
.ico-bureau{
  display:flex;flex-direction:column;align-items:center;text-align:center;
  padding:7px 4px;border-radius:7px;cursor:pointer;color:#e6eefc;font-size:11px;line-height:1.25;
  border:1px solid transparent;transition:background .12s
}
.ico-bureau:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2)}
.ico-bureau:active{background:rgba(59,130,246,.28)}
.ico-bureau .pic{
  width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;
  font-size:20px;margin-bottom:4px;box-shadow:0 4px 10px rgba(0,0,0,.4)
}
.pic-app{background:linear-gradient(135deg,#2563eb,#1d4ed8);border:1px solid #60a5fa}
.pic-setup{background:linear-gradient(135deg,#16a34a,#15803d);border:1px solid #4ade80}
.pic-bat{background:linear-gradient(135deg,#334155,#0f172a);border:1px solid #64748b;font-family:Consolas,monospace;font-size:12px !important;font-weight:700;color:#38bdf8}
.pic-secours{background:linear-gradient(135deg,#d97706,#92400e);border:1px solid #fbbf24}
.ico-tag{font-size:9.5px;color:#93c5fd;margin-top:2px;font-weight:600}

/* Fenêtres Windows (Poste de contrôle & Écran public) */
.col-fenetre{display:flex;flex-direction:column;min-height:0}
.etiquette{
  display:flex;align-items:center;justify-content:space-between;
  font-size:11.5px;color:#a5b8d8;letter-spacing:.03em;margin:0 0 5px 2px;font-weight:600
}
.etiquette .pill{
  font-size:10.5px;padding:2px 8px;border-radius:999px;background:#172a46;border:1px solid #2e4a78;color:#93c5fd
}
.etiquette .pill.ok{background:#0f2f24;border-color:#1f6f50;color:#6ee7b7}
.etiquette .pill.ko{background:#3b1a1a;border-color:#7f1d1d;color:#fca5a5}
.fenetre{
  background:var(--fond);border:1px solid #354768;border-radius:9px;overflow:hidden;
  display:flex;flex-direction:column;box-shadow:0 16px 36px rgba(0,0,0,.55);flex:1 1 auto;min-height:0
}
.barref{
  display:flex;align-items:center;gap:8px;padding:6px 10px;
  background:linear-gradient(180deg,#283347,#1a2230);border-bottom:1px solid #33405a;
  font-size:12px;color:#d6e2f5;user-select:none
}
.barref img{width:15px;height:15px;border-radius:3px}
.barref .titre{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.barref .bf{display:flex;gap:5px;color:#93a3bd}
.barref .bf i{font-style:normal;width:20px;height:16px;display:flex;align-items:center;justify-content:center;border-radius:3px;font-size:11px;cursor:pointer}
.barref .bf i:hover{background:#3a465c;color:#fff}
.interieur{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}

/* Écran public (Vidéoprojecteur) */
.ecran{position:relative;flex:1 1 auto;min-height:220px;background:#000;border-top:1px solid #000;overflow:hidden}
#demoEcranBox{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#000}
#demoEcranTxt{text-align:center;line-height:1.18;white-space:pre-wrap;word-wrap:break-word}
.ecran-vide{position:absolute;left:12px;right:12px;bottom:12px;text-align:center;font-size:11.5px;color:#5a6d8a;pointer-events:none}
.piedEcran{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:7px 10px;background:#10151d;border-top:1px solid var(--bord)}
.piedEcran .bouton{background:#243144;border:1px solid #384b66;border-radius:6px;padding:5px 10px;font-size:11.5px;color:var(--tx);cursor:pointer;font-weight:500}
.piedEcran .bouton:hover{background:#31435d}

/* Infos rapides sous le projecteur (Résumé du moyen choisi 3 à 7) */
#carteMoyenRapide{
  margin-top:8px;background:rgba(14,23,41,.92);border:1px solid #2d446b;border-radius:8px;
  padding:9px 11px;font-size:11.5px;line-height:1.4;color:#cbd5e1
}
#carteMoyenRapide strong{color:#86efac}
#carteMoyenRapide code{background:#1e293b;color:#7dd3fc;padding:1px 5px;border-radius:4px;font-size:11px}

/* Barre des tâches Windows 11 */
#barreTaches{
  flex:0 0 44px;display:flex;align-items:center;gap:10px;padding:0 14px;
  background:rgba(9,14,25,.95);border-top:1px solid #263654;font-size:12px;color:#c6d3e6
}
.btn-win{
  display:flex;align-items:center;gap:6px;background:#1d3154;border:1px solid #36568c;
  color:#93c5fd;border-radius:6px;padding:4px 10px;font-weight:600;cursor:pointer;font-size:12px
}
.btn-win:hover{background:#274270;color:#fff}
#barreTaches .pastille{
  display:flex;align-items:center;gap:6px;background:#192336;border:1px solid #2e3e5c;
  border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11.5px
}
#barreTaches .pastille.active{background:#233352;border-bottom:2px solid #60a5fa;color:#fff}
#barreTaches .pastille img{width:15px;height:15px;border-radius:3px}
#barreTaches .droite{margin-left:auto;display:flex;align-items:center;gap:12px;color:#93a3bd;font-size:11.5px}
#bandeauDemo{color:#93c5fd;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:520px}

/* Plein écran : vrai rendu du vidéoprojecteur */
#demoEcran{position:fixed;inset:0;z-index:9999;display:none;background:#000;overflow:hidden}
#demoEcran .quitter{position:absolute;top:12px;right:14px;z-index:2;background:rgba(34,48,63,.88);color:#dbe6f5;border:1px solid #3a4a60;border-radius:6px;padding:6px 12px;font:12px Segoe UI,Arial;cursor:pointer}

/* Modales Windows simulées : Assistant Setup .exe, Console .bat, Comparatif 3 à 7 */
.modale-fond{
  position:fixed;inset:0;z-index:9500;background:rgba(4,8,16,.72);backdrop-filter:blur(3px);
  display:none;align-items:center;justify-content:center;padding:16px
}
.modale-fond.visible{display:flex}
.fenetre-modale{
  width:min(760px,95vw);max-height:88vh;background:#141e30;border:1px solid #3b5582;
  border-radius:10px;box-shadow:0 24px 70px rgba(0,0,0,.85);display:flex;flex-direction:column;overflow:hidden;color:#e2e8f0
}
.modale-tete{
  display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
  background:linear-gradient(180deg,#243452,#18243a);border-bottom:1px solid #334a73;font-weight:600;font-size:13.5px
}
.modale-fermer{background:none;border:none;color:#94a3b8;font-size:16px;cursor:pointer;padding:2px 7px;border-radius:4px}
.modale-fermer:hover{background:#dc2626;color:#fff}
.modale-corps{padding:16px 18px;overflow-y:auto;font-size:13px;line-height:1.5}
.modale-pied{display:flex;justify-content:flex-end;gap:10px;padding:10px 16px;background:#0f1726;border-top:1px solid #263654}

/* Tableau comparatif Moyens 3 à 7 */
.table-moyens{width:100%;border-collapse:collapse;margin:10px 0;font-size:12.5px}
.table-moyens th,.table-moyens td{border:1px solid #2b3d5e;padding:8px 10px;text-align:left;vertical-align:top}
.table-moyens th{background:#1c2b45;color:#93c5fd;font-weight:600}
.table-moyens tr.recommande{background:rgba(22,163,74,.16);border:2px solid #22c55e}
.badge-reco{background:#16a34a;color:#fff;font-size:10.5px;padding:2px 7px;border-radius:999px;font-weight:700;display:inline-block}

/* Console CMD Windows simulée */
.console-cmd{
  background:#0c0c0c;border:1px solid #333;border-radius:6px;padding:12px;
  font-family:Consolas,"Courier New",monospace;font-size:12px;color:#cccccc;
  min-height:210px;max-height:320px;overflow-y:auto;white-space:pre-wrap;line-height:1.45
}
.barre-prog-cadre{height:18px;background:#0b1320;border:1px solid #35507d;border-radius:999px;overflow:hidden;margin:10px 0}
.barre-prog-rempli{height:100%;width:0%;background:linear-gradient(90deg,#16a34a,#4ade80);transition:width .3s ease}
#notif{z-index:9200}
`;

function pontSim(contenuStr) {
  return `
/* ================= PONT SIMULATEUR D'ORDINATEUR WINDOWS ================= */
(function(){
  const CONTENU = ${contenuStr};
  const CLES = 'malachie4sim.';
  const DEFAUT = {
    affichage:true, projection:true, text:'', label:'', mode:'idle',
    font:'Georgia, "Times New Roman", serif', size:120, margin:80,
    bg:'#000000', fg:'#ffffff', image:'', bold:false, italic:false, shadow:true,
    screen:{w:1920,h:1080,connected:true,id:2}, publicWindow:'ok'
  };
  const lireL=(k,d)=>{try{const v=localStorage.getItem(CLES+k);return v?JSON.parse(v):d}catch(e){return d}};
  const ecrireL=(k,v)=>{try{localStorage.setItem(CLES+k,JSON.stringify(v))}catch(e){}};
  let etat=Object.assign({},DEFAUT,lireL('reglages',{projection:true,publicWindow:'ok'})), abonnes=[], plein=false, modeSecours=false;
  etat.screen = {w:1920,h:1080,connected:true,id:2};
  if (etat.projection !== false) etat.publicWindow = 'ok';

  function dessinerEcran(){
    const box=document.getElementById('demoEcranBox'), txt=document.getElementById('demoEcranTxt'), indice=document.getElementById('ecranVide');
    const pillEcran=document.getElementById('pillEcran2');
    if(!box||!txt) return;
    const connecte = etat.screen && etat.screen.connected;
    const visible = connecte && etat.projection && etat.affichage && !!etat.text;
    if (pillEcran) {
      if (!connecte) { pillEcran.textContent = 'HDMI débranché (Écran 1 protégé)'; pillEcran.className = 'pill ko'; }
      else if (!etat.projection) { pillEcran.textContent = 'Projection coupée (F1)'; pillEcran.className = 'pill ko'; }
      else { pillEcran.textContent = 'HDMI 2 connecté · 1920×1080' + (modeSecours ? ' · Mode Secours' : ''); pillEcran.className = 'pill ok'; }
    }
    document.getElementById('demoEcran').style.display = (plein && visible) ? 'block' : 'none';
    if(indice) {
      if (!connecte) indice.textContent = 'Câble HDMI débranché — Aucune fenêtre publique sur l’écran principal (reconnexion auto < 2 s)';
      else if (!etat.projection) indice.textContent = 'Projection désactivée (cliquez sur « Projection (F1) » pour réactiver)';
      else indice.textContent = 'Aucune image projetée — le vidéoprojecteur reste noir';
      indice.style.display = visible ? 'none' : 'block';
    }
    box.style.background = (connecte && etat.image) ? ('#000 url('+etat.image+') center/cover no-repeat') : (connecte ? (etat.bg||'#000') : '#050505');
    if(visible){
      window.Rendu.paint(box,txt,{affichage:true,text:etat.text,bg:etat.bg,fg:etat.fg,font:etat.font,size:etat.size,
        margin:etat.margin,bold:etat.bold,italic:etat.italic,image:etat.image,shadow:etat.shadow});
    } else { txt.textContent=''; }
    if(plein && visible && document.getElementById('demoEcranTxt2')){
      const b2=document.getElementById('demoEcranBox2'), t2=document.getElementById('demoEcranTxt2');
      window.Rendu.paint(b2,t2,{affichage:true,text:etat.text,bg:etat.bg,fg:etat.fg,font:etat.font,size:etat.size,
        margin:etat.margin,bold:etat.bold,italic:etat.italic,image:etat.image,shadow:etat.shadow});
    }
  }

  function diffuser(){
    const msg={etat,reserve:lireL('reserve',[]),historique:lireL('historique',[])};
    abonnes.forEach(cb=>{try{cb(msg)}catch(e){}});
    dessinerEcran();
  }

  /* Chargement optionnel du contenu complet (66 livres + 160 brochures) si le dossier content/ est accessible */
  async function essayerContenuComplet(){
    if (typeof DecompressionStream === 'undefined' || location.protocol === 'file:') return;
    try {
      const chemins = ['content/', '../content/', 'malachie4/content/'];
      let baseTrouvee = null;
      for (const b of chemins) {
        try {
          const r = await fetch(b + 'cantiques.json');
          if (r.ok) { baseTrouvee = b; break; }
        } catch (e) {}
      }
      if (!baseTrouvee) return;
      const lireGzUrl = async (u) => {
        const r = await fetch(u);
        if (!r.ok) throw new Error('404');
        return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();
      };
      const [bibleFull, brochuresFull] = await Promise.all([
        lireGzUrl(baseTrouvee + 'bible.json.gz'),
        lireGzUrl(baseTrouvee + 'brochures.json.gz')
      ]);
      if (bibleFull && Object.keys(bibleFull).length >= 60) {
        CONTENU.bible = bibleFull;
        CONTENU.brochures = brochuresFull;
        CONTENU.index = {
          stats: {
            livres: Object.keys(bibleFull).length,
            versets: Object.values(bibleFull).reduce((s, l) => s + Object.values(l).reduce((t, c) => t + c.length, 0), 0),
            cantiques: CONTENU.cantiques.length,
            brochures: brochuresFull.length,
            doubleTraduction: brochuresFull.filter(b => b.tr && b.tr.VGR && b.tr.Shekina).length,
            branhamFr: brochuresFull.filter(b => b.tr && b.tr.BF).length
          },
          cantiques: CONTENU.cantiques.map(c => ({ id: c.id, name: c.name, units: c.units.length, types: c.types || null })),
          bible: Object.keys(bibleFull).map(ab => ({ ab, chapitres: Object.keys(bibleFull[ab]).length })),
          brochures: brochuresFull.map(b => ({
            id: b.id, code: b.code, name: b.name, year: b.year, tr: Object.keys(b.tr || {}),
            paras: Object.fromEntries(Object.entries(b.tr || {}).map(([k, v]) => [k, v.length])),
            pdf: b.pdf || '', audio: b.audio || '', duree: b.duree || ''
          }))
        };
        const bandeau = document.getElementById('bandeauDemo');
        if (bandeau) bandeau.textContent = 'Version complète chargée : 66 livres (31 169 versets) · 160 brochures (VGR + Shekinah + BF) · ' + CONTENU.cantiques.length + ' cantiques';
        const etatC = document.getElementById('etatContenu');
        if (etatC) etatC.textContent = '66 livres · 160 brochures · ' + CONTENU.cantiques.length + ' cantiques';
      }
    } catch (e) {}
  }

  window.api={
    estElectron:false,
    patch(p){
      etat=Object.assign({},etat,p);
      if(p&&('font'in p||'size'in p||'margin'in p||'bg'in p||'fg'in p||'image'in p||'bold'in p||'italic'in p||'affichage'in p||'projection'in p)) ecrireL('reglages',etat);
      diffuser();
    },
    deconnecter(){ etat.projection=false; etat.publicWindow='deconnecte'; diffuser(); },
    reconnecter(){ etat.projection=true; etat.publicWindow='ok'; etat.screen={w:1920,h:1080,connected:true,id:2}; diffuser(); },
    vider(){ etat=Object.assign({},etat,{text:'',label:'',affichage:false}); diffuser(); },
    quitter(){},
    onEtat(cb){ abonnes.push(cb); cb({etat,reserve:lireL('reserve',[]),historique:lireL('historique',[])}); },
    async indexContenu(){ return CONTENU.index; },
    async brochure(id){ return CONTENU.brochures.find(b=>b.id===id)||null; },
    async cantique(id){ const perso=lireL('cantiques_perso',{}); const c=CONTENU.cantiques.find(x=>x.id===id); return c?Object.assign({},c,perso[id]||{}):null; },
    async chapitre(ab,ch){ return (CONTENU.bible[ab]&&CONTENU.bible[ab][ch])||[]; },
    async lireDonnees(n){ return lireL(n,null); },
    async ecrireDonnees(n,v){ ecrireL(n,v); return true; },
    async enregistrerCantique(id,modif){ const perso=lireL('cantiques_perso',{}); perso[id]=Object.assign({},perso[id],modif); ecrireL('cantiques_perso',perso); const c=CONTENU.cantiques.find(x=>x.id===id); return c?Object.assign({},c,perso[id]):null; },
    async ajouterCantique(c){ CONTENU.cantiques=CONTENU.cantiques.filter(x=>x.id!==c.id).concat([c]); return c; },
    async supprimerCantique(id){ CONTENU.cantiques=CONTENU.cantiques.filter(x=>x.id!==id); return true; },
    choisirImage(){ return new Promise(res=>{ const i=document.createElement('input'); i.type='file'; i.accept='image/*';
      i.onchange=()=>{ const f=i.files&&i.files[0]; if(!f)return res(null); const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(f); }; i.click(); }); },
    async journal(){ return ''; }, async ouvrirDossier(){ return true; },
    async infos(){ return {version:'2.0.0-Windows-Sim',portable:false,dossier:'C:\\\\Users\\\\Eglise\\\\AppData\\\\Roaming\\\\Malachie4',contenu:'C:\\\\Program Files\\\\Malachie 4 Projections\\\\resources\\\\content'}; }
  };

  /* Actions du simulateur Windows */
  window.SimWindows = {
    simulerHDMI(){
      if (etat.screen.connected) {
        etat.screen = {w:0,h:0,connected:false,id:null};
        etat.publicWindow = 'cherche';
        diffuser();
        setTimeout(() => {
          etat.screen = {w:1920,h:1080,connected:true,id:2};
          etat.publicWindow = 'ok';
          diffuser();
        }, 1800);
      } else {
        etat.screen = {w:1920,h:1080,connected:true,id:2};
        etat.publicWindow = 'ok';
        diffuser();
      }
    },
    basculerSecours(){
      modeSecours = !modeSecours;
      const btn = document.getElementById('btnModeSecours');
      const titreCtrl = document.getElementById('titreFenetreControle');
      if (btn) btn.classList.toggle('actif', modeSecours);
      if (titreCtrl) titreCtrl.textContent = 'Malachie 4 Projections — Poste de contrôle' + (modeSecours ? ' [MODE SECOURS — Sans transparence GPU]' : '');
      dessinerEcran();
    },
    ouvrirSetup(){
      document.getElementById('modaleSetup').classList.add('visible');
      window.SimWindows.lancerAnimationSetup();
    },
    lancerAnimationSetup(){
      const log = document.getElementById('logSetup');
      const barre = document.getElementById('barreSetup');
      if (!log || !barre) return;
      barre.style.width = '0%';
      log.textContent = 'Assistant d’installation : Malachie4-Projections-Setup-2.0.0-x64.exe\\n';
      const etapes = [
        [20, '✓ Vérification de Windows x64 (aucun droit administrateur requis)...'],
        [45, '✓ Extraction du moteur Electron 31.7.7 et des 2 fenêtres (Contrôle + Écran public)...'],
        [75, '✓ Installation hors-ligne : Bible Louis Segond 1910 (66 livres, 31 169 versets) + 160 brochures (VGR / Shekinah / BF) + Cantiques...'],
        [92, '✓ Création du raccourci Bureau « Malachie 4 Projections » et dans le Menu Démarrer...'],
        [100, '✓ INSTALLATION TERMINÉE ! Lancement automatique de Malachie 4 Projections sur Écran 1 + Écran 2.']
      ];
      etapes.forEach(([pct, msg], i) => {
        setTimeout(() => {
          barre.style.width = pct + '%';
          log.textContent += msg + '\\n';
          log.scrollTop = log.scrollHeight;
        }, (i + 1) * 450);
      });
    },
    ouvrirBat(nom){
      const mod = document.getElementById('modaleBat');
      const titre = document.getElementById('titreModaleBat');
      const cmd = document.getElementById('consoleBat');
      if (!mod || !cmd) return;
      titre.textContent = 'Invite de commandes Windows — ' + nom;
      mod.classList.add('visible');
      if (nom === 'INSTALLER-WINDOWS.bat') {
        cmd.textContent =
          'C:\\\\Malachie4> INSTALLER-WINDOWS.bat\\n' +
          '============================================================================\\n' +
          '  MALACHIE 4 PROJECTIONS — Construction de l’Installateur Windows (.exe)\\n' +
          '  (Moyen 3 : construit le Setup .exe et la version portable .exe)\\n' +
          '============================================================================\\n\\n' +
          '[1/3] Installation des composants (npm install)... OK\\n' +
          '[2/3] Vérification rapide du logiciel (186 contrôles)... OK\\n' +
          '[3/3] Construction du Setup .exe et du .exe portable (npm run dist)...\\n' +
          '  • electron-builder 24.13.3 (Windows x64)\\n' +
          '  • building target=nsis file=livraison\\\\Malachie4-Projections-2.0.0-x64.exe\\n' +
          '  • building target=portable file=livraison\\\\Malachie4-Projections-portable-2.0.0.exe\\n\\n' +
          'TERMINE AVEC SUCCES ! Vos fichiers .exe sont prêts dans livraison\\\\ et dist\\\\.';
      } else if (nom === 'LANCER.bat') {
        cmd.textContent =
          'C:\\\\Malachie4> LANCER.bat\\n' +
          '============================================================================\\n' +
          '  MALACHIE 4 PROJECTIONS — Lancement direct (Moyen 4)\\n' +
          '============================================================================\\n' +
          '[1/2] Vérification de node_modules... Déjà présent.\\n' +
          '[2/2] Ouverture de Malachie 4 Projections (npm start)...\\n' +
          '-> Poste de contrôle ouvert sur Écran 1 · Écran public prêt sur Écran 2.';
      } else {
        cmd.textContent =
          'C:\\\\Malachie4> LANCER-MODE-SECOURS.bat\\n' +
          '============================================================================\\n' +
          '  MALACHIE 4 PROJECTIONS — Lancement en MODE SECOURS (Moyen 5)\\n' +
          '============================================================================\\n' +
          'set M4_SECOURS=1\\n' +
          'npx electron . --mode-secours --disable-gpu --disable-transparent-visuals\\n' +
          '-> Mode Secours activé : accélération GPU désactivée, aucun clignotement.';
        if (!modeSecours) window.SimWindows.basculerSecours();
      }
    },
    ouvrirComparatif(){
      document.getElementById('modaleMoyens').classList.add('visible');
    }
  };

  window.addEventListener('keydown',e=>{ if(e.key==='Escape'&&plein){ plein=false; document.getElementById('demoEcran').style.display='none'; dessinerEcran(); } });

  function ajuster(){
    const cadre = document.getElementById('cadreMoniteur');
    const t = document.getElementById('tout');
    if (!cadre || !t) return;
    const w = cadre.clientWidth || window.innerWidth;
    const h = cadre.clientHeight || (window.innerHeight - 52);
    const e = Math.min((w - 16) / 1660, (h - 16) / 880, 1);
    t.style.transform = 'scale(' + Math.max(0.35, e) + ')';
  }
  window.addEventListener('resize', ajuster);

  document.addEventListener('DOMContentLoaded',()=>{
    ajuster();
    setTimeout(ajuster, 120);
    const b=document.getElementById('bPlein');
    const bQ=document.getElementById('bQuitterPlein');
    if(b) b.onclick=()=>{ plein=!plein; document.getElementById('demoEcran').style.display=plein?'block':'none'; dessinerEcran(); };
    if(bQ) bQ.onclick=()=>{ plein=false; document.getElementById('demoEcran').style.display='none'; dessinerEcran(); };
    const h=document.getElementById('horloge');
    const tic=()=>{ if(h) h.textContent=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); };
    tic(); setInterval(tic,20000);
    essayerContenuComplet();
    /* Projeter automatiquement Jean 3:16 au démarrage de la simulation pour que l'utilisateur voie immédiatement les 2 écrans en action */
    setTimeout(() => {
      if (!etat.text) {
        window.api.patch({
          text: '16 Car Dieu a tant aimé le monde qu’il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu’il ait la vie éternelle.',
          label: 'Jean 3:16',
          affichage: true,
          projection: true
        });
      }
    }, 500);
  });
  diffuser();
})();
`;
}

const ouvrirBureauSim = () => `
<!-- Barre supérieure de pilotage et téléchargement direct Windows (.exe) -->
<div id="barrePilotage">
  <span class="badge-sim">💻 Simulation PC Windows 11 + Vidéoprojecteur</span>
  <a class="btn-action btn-exe" href="https://github.com/Chris-Oint/Malachie4-Projections/releases/latest/download/Malachie4-Projections-Setup-2.0.0-x64.exe" target="_blank" rel="noopener">
    ⬇ Télécharger Setup .exe (Moyen 6 — 1 clic)
  </a>
  <a class="btn-action btn-portable" href="https://github.com/Chris-Oint/Malachie4-Projections/releases/latest/download/Malachie4-Projections-portable-2.0.0.exe" target="_blank" rel="noopener">
    ⬇ Version Portable .exe (Sans installation)
  </a>
  <button class="btn-action btn-sim" type="button" onclick="window.SimWindows.ouvrirSetup()">
    🪄 Simuler l'Installation Setup .exe
  </button>
  <button class="btn-action btn-sim" type="button" onclick="window.SimWindows.ouvrirComparatif()">
    📊 Moyens 3 à 7 (Pourquoi le 6 + 3 est choisi)
  </button>
  <div class="pilotage-droite">
    <button class="btn-action btn-sim" type="button" onclick="window.SimWindows.simulerHDMI()">
      🔌 Test Câble HDMI (Reconnexion &lt; 2 s)
    </button>
    <button class="btn-action btn-warn" id="btnModeSecours" type="button" onclick="window.SimWindows.basculerSecours()">
      🛡 Mode Secours (Moyen 5)
    </button>
  </div>
</div>

<div id="cadreMoniteur">
  <div id="tout">
    <div id="bureau">
      <!-- Icônes du Bureau Windows 11 -->
      <div id="iconesBureau">
        <div class="ico-bureau" onclick="document.getElementById('recherche').focus()" title="Logiciel installé sur le Bureau Windows">
          <div class="pic pic-app">${icone ? '<img src="' + icone + '" style="width:26px;height:26px">' : '📽'}</div>
          <span>Malachie 4 Projections</span>
          <span class="ico-tag">Application .exe</span>
        </div>
        <div class="ico-bureau" onclick="window.SimWindows.ouvrirSetup()" title="Moyen 6 : Setup .exe prêt à installer en double-clic">
          <div class="pic pic-setup">⬇</div>
          <span>Setup-2.0.0-x64.exe</span>
          <span class="ico-tag">⭐ Moyen 6 (1 clic)</span>
        </div>
        <div class="ico-bureau" onclick="window.SimWindows.ouvrirBat('INSTALLER-WINDOWS.bat')" title="Moyen 3 : Construit le Setup .exe sur le PC">
          <div class="pic pic-bat">.BAT</div>
          <span>INSTALLER-WINDOWS.bat</span>
          <span class="ico-tag">Moyen 3</span>
        </div>
        <div class="ico-bureau" onclick="window.SimWindows.ouvrirBat('LANCER.bat')" title="Moyen 4 : Essai direct avec Node.js">
          <div class="pic pic-bat">RUN</div>
          <span>LANCER.bat</span>
          <span class="ico-tag">Moyen 4</span>
        </div>
        <div class="ico-bureau" onclick="window.SimWindows.ouvrirBat('LANCER-MODE-SECOURS.bat')" title="Moyen 5 : Si la transparence clignote">
          <div class="pic pic-secours">🛡</div>
          <span>LANCER-MODE-SECOURS.bat</span>
          <span class="ico-tag">Moyen 5</span>
        </div>
        <div class="ico-bureau" onclick="window.SimWindows.ouvrirComparatif()" title="Voir les moyens 3 à 7 en détail">
          <div class="pic pic-app">📋</div>
          <span>Guide Moyens 3 à 7</span>
          <span class="ico-tag">Comparatif</span>
        </div>
      </div>

      <!-- Écran 1 : Poste de contrôle -->
      <div class="col-fenetre">
        <div class="etiquette">
          <span>ÉCRAN 1 — ORDINATEUR WINDOWS (POSTE DE CONTRÔLE 6 ZONES)</span>
          <span class="pill ok">100 % Hors-ligne · Bible + 160 Brochures + Cantiques</span>
        </div>
        <div class="fenetre" id="fenetreControle">
          <div class="barref">
            ${icone ? '<img alt="" src="' + icone + '">' : ''}
            <span class="titre" id="titreFenetreControle">Malachie 4 Projections — Poste de contrôle</span>
            <span class="bf"><i>—</i><i>▢</i><i>✕</i></span>
          </div>
          <div class="interieur">
`;

const fermerBureauSim = () => `
          </div>
        </div>
      </div>

      <!-- Écran 2 : Vidéoprojecteur -->
      <div class="col-fenetre">
        <div class="etiquette">
          <span>ÉCRAN 2 — VIDÉOPROJECTEUR ÉGLISE</span>
          <span class="pill ok" id="pillEcran2">HDMI 2 connecté · 1920×1080</span>
        </div>
        <div class="fenetre">
          <div class="barref">
            <span class="titre">Malachie 4 — Écran public (2e écran uniquement)</span>
            <span class="bf"><i>—</i><i>▢</i><i>✕</i></span>
          </div>
          <div class="ecran">
            <div id="demoEcranBox"><div id="demoEcranTxt"></div></div>
            <div class="ecran-vide" id="ecranVide">Aucune image — le vidéoprojecteur reste noir</div>
          </div>
          <div class="piedEcran">
            <button class="bouton" id="bPlein" type="button">⛶ Plein écran réel</button>
            <button class="bouton" type="button" onclick="window.SimWindows.simulerHDMI()">🔌 Simuler coupure HDMI</button>
            <span class="discret">Échap = vider l'écran instantanément</span>
          </div>
        </div>

        <!-- Résumé clair du choix parmi les moyens 3 à 7 -->
        <div id="carteMoyenRapide">
          <strong>✅ Meilleur choix retenu parmi 3 à 7 : Moyen 6 + Moyen 3</strong><br>
          • <strong>Moyen 6 (Le plus simple, 0 connaissance)</strong> : Le fichier <code>.github/workflows/build-windows.yml</code> construit automatiquement <code>Malachie4-Projections-Setup-2.0.0-x64.exe</code> et la version portable sur votre GitHub <strong>Chris-Oint/Malachie4-Projections</strong>.<br>
          • <strong>Moyens 3, 4 et 5 inclus</strong> : <code>INSTALLER-WINDOWS.bat</code>, <code>LANCER.bat</code> et <code>LANCER-MODE-SECOURS.bat</code> sont aussi déposés dans le dépôt.
        </div>
      </div>
    </div>

    <!-- Barre des tâches Windows 11 -->
    <div id="barreTaches">
      <button class="btn-win" type="button" onclick="window.SimWindows.ouvrirSetup()">⊞ Démarrer Windows</button>
      <span class="pastille active">${icone ? '<img alt="" src="' + icone + '">' : ''} Malachie 4 Projections</span>
      <span class="pastille" onclick="document.getElementById('bPlein').click()">📽 Écran public (HDMI 2)</span>
      <span class="pastille" onclick="window.SimWindows.ouvrirComparatif()">📊 Moyens 3 à 7</span>
      <span id="bandeauDemo">Simulation interactive : cliquez un cantique, un verset (ex: Jn 3:16) ou une brochure puis double-cliquez pour projeter !</span>
      <span class="droite">
        <span>FR</span>
        <span>🔊 100%</span>
        <span id="horloge">--:--</span>
      </span>
    </div>
  </div>
</div>

<!-- Rendu Plein écran -->
<div id="demoEcran">
  <button class="quitter" id="bQuitterPlein" type="button">Quitter le plein écran (Échap)</button>
  <div id="demoEcranBox2" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
    <div id="demoEcranTxt2" style="text-align:center;line-height:1.18;white-space:pre-wrap;word-wrap:break-word"></div>
  </div>
</div>

<!-- Modale 1 : Simulation de l'Installateur Windows Setup .exe -->
<div class="modale-fond" id="modaleSetup">
  <div class="fenetre-modale">
    <div class="modale-tete">
      <span>💿 Assistant d'installation Windows — Malachie4-Projections-Setup-2.0.0-x64.exe</span>
      <button class="modale-fermer" type="button" onclick="document.getElementById('modaleSetup').classList.remove('visible')">✕</button>
    </div>
    <div class="modale-corps">
      <p style="margin-top:0"><strong>Voici exactement ce qui se passe sur votre PC Windows</strong> lorsque vous téléchargez et double-cliquez sur le fichier <code>.exe</code> construit par GitHub (Moyen 6) ou par <code>INSTALLER-WINDOWS.bat</code> (Moyen 3) :</p>
      <div class="barre-prog-cadre"><div class="barre-prog-rempli" id="barreSetup"></div></div>
      <div class="console-cmd" id="logSetup"></div>
      <p style="margin-bottom:0;color:#93c5fd">💡 <strong>Sur votre vrai PC Windows</strong> : cliquez sur le bouton vert ci-dessous pour télécharger le vrai fichier <code>.exe</code> déjà compilé sur votre compte GitHub <strong>Chris-Oint</strong>.</p>
    </div>
    <div class="modale-pied">
      <a class="btn-action btn-exe" href="https://github.com/Chris-Oint/Malachie4-Projections/releases/latest/download/Malachie4-Projections-Setup-2.0.0-x64.exe" target="_blank" rel="noopener">
        ⬇ Télécharger le vrai Setup .exe pour Windows
      </a>
      <a class="btn-action btn-portable" href="https://github.com/Chris-Oint/Malachie4-Projections/releases/latest/download/Malachie4-Projections-portable-2.0.0.exe" target="_blank" rel="noopener">
        ⬇ Télécharger le .exe Portable
      </a>
      <button class="btn-action btn-sim" type="button" onclick="document.getElementById('modaleSetup').classList.remove('visible')">Tester le logiciel maintenant</button>
    </div>
  </div>
</div>

<!-- Modale 2 : Console CMD pour les fichiers .bat (Moyens 3, 4, 5) -->
<div class="modale-fond" id="modaleBat">
  <div class="fenetre-modale">
    <div class="modale-tete">
      <span id="titreModaleBat">Invite de commandes Windows</span>
      <button class="modale-fermer" type="button" onclick="document.getElementById('modaleBat').classList.remove('visible')">✕</button>
    </div>
    <div class="modale-corps">
      <div class="console-cmd" id="consoleBat"></div>
    </div>
    <div class="modale-pied">
      <button class="btn-action btn-sim" type="button" onclick="document.getElementById('modaleBat').classList.remove('visible')">Fermer</button>
    </div>
  </div>
</div>

<!-- Modale 3 : Comparatif détaillé des Moyens 3 à 7 -->
<div class="modale-fond" id="modaleMoyens">
  <div class="fenetre-modale">
    <div class="modale-tete">
      <span>📊 Examen des Moyens 3 à 7 — Lequel est le plus simple, rapide et sans complication ?</span>
      <button class="modale-fermer" type="button" onclick="document.getElementById('modaleMoyens').classList.remove('visible')">✕</button>
    </div>
    <div class="modale-corps">
      <table class="table-moyens">
        <thead>
          <tr>
            <th>Moyen (3 à 7)</th>
            <th>Comment ça marche</th>
            <th>Connaissance requise</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          <tr class="recommande">
            <td><strong>6. Plateforme en ligne GitHub Actions</strong><br><code>.github/workflows/build-windows.yml</code></td>
            <td>GitHub construit tout seul le <code>Setup .exe</code> et le <code>.exe portable</code> dans le nuage et les publie dans <strong>Releases</strong> et <strong>Actions</strong>.</td>
            <td><strong>Aucune (0 %)</strong><br>Pas besoin de Node.js ni de Terminal. Simple double-clic sur le <code>.exe</code> téléchargé.</td>
            <td><span class="badge-reco">⭐ N°1 CHOISI & DÉPLOYÉ</span><br>Le plus rapide, le plus simple et immédiat.</td>
          </tr>
          <tr>
            <td><strong>3. Installateur local</strong><br><code>INSTALLER-WINDOWS.bat</code></td>
            <td>Double-clic sur <code>INSTALLER-WINDOWS.bat</code> qui lance <code>npm install</code> puis construit le <code>Setup .exe</code> sur le PC.</td>
            <td>Nécessite d'avoir installé Node.js une fois sur le PC constructeur.</td>
            <td><strong>✅ Inclus dans le dépôt</strong> (prêt si vous voulez reconstruire sur PC).</td>
          </tr>
          <tr>
            <td><strong>4. Essai direct</strong><br><code>LANCER.bat</code></td>
            <td>Double-clic sur <code>LANCER.bat</code> (fait <code>npm install</code> la 1re fois puis ouvre le logiciel).</td>
            <td>Nécessite Node.js sur le PC.</td>
            <td><strong>✅ Inclus dans le dépôt</strong>.</td>
          </tr>
          <tr>
            <td><strong>5. Mode secours</strong><br><code>LANCER-MODE-SECOURS.bat</code></td>
            <td>Lance le logiciel avec <code>--mode-secours --disable-gpu</code> si la transparence clignote sur une ancienne carte graphique.</td>
            <td>Simple double-clic.</td>
            <td><strong>✅ Inclus dans le dépôt</strong> + bouton testable ici en direct.</td>
          </tr>
          <tr>
            <td><strong>7. Terminal</strong><br><code>npm install</code> puis <code>npm run dist</code></td>
            <td>Taper les commandes manuellement dans l'Invite de commandes Windows.</td>
            <td>Connaissance du Terminal requise.</td>
            <td>Remplacé avantageusement par les Moyens <strong>6</strong> (auto) et <strong>3</strong> (double-clic).</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="modale-pied">
      <a class="btn-action btn-exe" href="https://github.com/Chris-Oint/Malachie4-Projections/releases/latest" target="_blank" rel="noopener">
        🔗 Ouvrir la page de téléchargement GitHub Releases (.exe)
      </a>
      <button class="btn-action btn-sim" type="button" onclick="document.getElementById('modaleMoyens').classList.remove('visible')">Fermer</button>
    </div>
  </div>
</div>
`;

const html = entete
  .replace('<link rel="icon" href="../ressources/icon-64.png">\n', '')
  .replace('<link rel="stylesheet" href="control.css">', () => '<style>\n' + css + '\n' + habillageSim + '\n</style>')
  .replace('<body>', () => '<body>\n' + ouvrirBureauSim())
  .replace('</body>', () => fermerBureauSim() + '</body>')
  .replace('<script src="../render.js"></script>\n<script src="control.js"></script>',
    () => '<script>\n' + rendu + '\n</script>\n<script>\n' + pontSim(contenuJson) + '\n</script>\n<script>\n' + controleJs + '\n</script>')
  .replace('<title>', () => (icone ? '<link rel="icon" href="' + icone + '">\n' : '') + '<title>Simulation Ordinateur Windows — ');

/* Vérification syntaxique des scripts embarqués */
const morceaux = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
morceaux.forEach((m, i) => {
  try { new vm.Script(m); }
  catch (e) { console.error('ERREUR script ' + (i + 1) + ' : ' + e.message); process.exit(1); }
});

const sortieMalachie = path.join(RACINE, 'simulation-windows.html');
const sortieRacine = path.join(RACINE, '..', 'simulation-windows.html');
fs.writeFileSync(sortieMalachie, html);
fs.writeFileSync(sortieRacine, html);
console.log('Simulation Windows construite avec succès :');
console.log('  - ' + sortieMalachie + ' (' + (fs.statSync(sortieMalachie).size / 1024).toFixed(0) + ' Ko)');
console.log('  - ' + sortieRacine);
