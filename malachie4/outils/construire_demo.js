#!/usr/bin/env node
/* ============================================================================
   Construit la DÉMO « type ordinateur » : un seul fichier HTML qui s'ouvre par
   double-clic et se présente comme un vrai poste de travail —
      à gauche : la fenêtre « Poste de contrôle » (le logiciel tel quel)
      à droite : la fenêtre « Écran public » (ce que voit l'assemblée)
      en bas   : la barre des tâches
   Contenu volontairement réduit (comme demandé) :
      UN SEUL chapitre de la Bible (Jean 3) · UNE SEULE brochure · les cantiques du recueil.
   Usage : node outils/construire_demo.js  [--brochure=ID] [--chapitre=Jn:3]
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const RACINE = path.join(__dirname, '..');
const lire = (f, gz) => { const b = fs.readFileSync(path.join(RACINE, f)); return gz ? JSON.parse(zlib.gunzipSync(b).toString('utf8')) : b.toString('utf8'); };

const args = {};
process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) args[m[1]] = m[2]; });

/* Règle absolue : dans ce fichier, .replace() ne reçoit JAMAIS une chaîne en
   remplacement (les « $$ » du code source seraient transformés en « $ »). */

/* ---------------------------------------------------------------- 1. contenu réduit */
const bibleComplete = lire('content/bible.json.gz', true);
const cantiques = JSON.parse(lire('content/cantiques.json', false));
const brochures = lire('content/brochures.json.gz', true);

const [livreChoisi, chapitreChoisi] = (args.chapitre || 'Jn:3').split(':');
const bible = {};
if (bibleComplete[livreChoisi] && bibleComplete[livreChoisi][chapitreChoisi]) {
  bible[livreChoisi] = { [chapitreChoisi]: bibleComplete[livreChoisi][chapitreChoisi] };
} else {
  console.error('Chapitre introuvable : ' + args.chapitre);
  process.exit(1);
}

/* la brochure : la première en double traduction VGR + Shekinah, ou celle demandée */
const doubles = brochures.filter(b => b.tr.VGR && b.tr.Shekina);
const brochure = (args.brochure ? brochures.find(b => b.id === args.brochure) : null) || doubles[0] || brochures[0];
if (!brochure) { console.error('Aucune brochure disponible.'); process.exit(1); }

const versets = bible[livreChoisi][chapitreChoisi].length;
console.log('Contenu de la démo : ' + livreChoisi + ' ' + chapitreChoisi + ' (' + versets + ' versets) · « ' +
  brochure.name + ' » (' + Object.keys(brochure.tr).join(' + ') + ') · ' + cantiques.length + ' cantiques');

/* ---------------------------------------------------------------- 2. code de l'application, tel quel */
const css = lire('app/control.css');
const rendu = lire('render.js');
const controleJs = lire('app/control.js');

/* ---------------------------------------------------------------- 3. habillage « ordinateur » */
const habillage = `
/* ================= habillage « ordinateur » (démo uniquement) ================= */
html,body{height:100%;overflow:hidden}
body{background:#070b14;display:block;color:var(--tx)}
#tout{position:fixed;left:50%;top:50%;width:1600px;height:900px;margin:-450px 0 0 -800px;transform-origin:center center;
  display:flex;flex-direction:column;background:linear-gradient(160deg,#0e1730,#0a1120 55%,#0b1526);border-radius:14px;
  box-shadow:0 30px 80px rgba(0,0,0,.75);overflow:hidden}
#bureau{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:1fr 520px;gap:16px;padding:16px 16px 8px}
.etiquette{font-size:11.5px;color:#8ea3c2;letter-spacing:.04em;margin:0 0 6px 2px;text-transform:uppercase}
.fenetre{background:var(--fond);border:1px solid #33405a;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;
  box-shadow:0 16px 34px rgba(0,0,0,.5);min-height:0}
.barref{display:flex;align-items:center;gap:8px;padding:6px 10px;background:linear-gradient(#2b3548,#1c2433);border-bottom:1px solid #33405a;font-size:12px;color:#cfdaea}
.barref .titre{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.barref .bf{display:flex;gap:6px;color:#93a3bd}
.barref .bf i{font-style:normal;width:16px;height:14px;display:flex;align-items:center;justify-content:center;border-radius:3px;font-size:11px}
.barref .bf i:hover{background:#3a465c}
.interieur{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
/* écran public */
.ecran{position:relative;flex:1 1 auto;min-height:200px;background:#000;border-top:1px solid #000}
#demoEcranBox{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#000}
#demoEcranTxt{text-align:center;line-height:1.18;white-space:pre-wrap;word-wrap:break-word}
.ecran-vide{position:absolute;left:0;right:0;bottom:10px;text-align:center;font-size:11.5px;color:#4b5c74}
.piedEcran{display:flex;align-items:center;gap:10px;padding:7px 10px;background:#10151d;border-top:1px solid var(--bord)}
.piedEcran .bouton{background:#26303f;border:1px solid var(--bord);border-radius:6px;padding:5px 10px;font-size:12px;color:var(--tx);cursor:pointer}
.piedEcran .bouton:hover{background:#334054}
/* barre des tâches */
#barreTaches{flex:0 0 46px;display:flex;align-items:center;gap:14px;padding:0 16px;background:rgba(10,16,28,.92);border-top:1px solid #26324a;font-size:12.5px;color:#c6d3e6}
#barreTaches .pastille{display:flex;align-items:center;gap:7px;background:#1b2537;border:1px solid #2f3d57;border-radius:7px;padding:5px 10px}
#barreTaches .pastille img{width:16px;height:16px;border-radius:3px}
#barreTaches .droite{margin-left:auto;display:flex;align-items:center;gap:16px;color:#93a3bd}
#bandeauDemo{color:#a8e6c4}
/* plein écran : le vrai rendu du vidéoprojecteur */
#demoEcran{position:fixed;inset:0;z-index:9999;display:none;background:#000;overflow:hidden}
#demoEcran .quitter{position:absolute;top:12px;right:14px;z-index:2;background:rgba(34,48,63,.85);color:#dbe6f5;border:1px solid #3a4a60;
  border-radius:6px;padding:6px 10px;font:12px Segoe UI,Arial;cursor:pointer}
/* la notifie reste lisible au-dessus du bureau */
#notif{z-index:9000}
`;

/* ---------------------------------------------------------------- 4. pont de démonstration */
function pontDemo(contenu) {
  return `
/* ================= pont de démonstration =================
   Même interface que preload.js / pont.js, sans Electron ni serveur :
   - l'écran public est dessiné dans la 2e fenêtre (et en plein écran sur demande) ;
   - le contenu est embarqué dans ce fichier ;
   - réserve, historique et réglages sont conservés par le navigateur. */
(function(){
  const CONTENU = ${contenu};
  const CLES='malachie4demo.';
  const DEFAUT={affichage:true,projection:true,text:'',label:'',mode:'idle',
    font:'Georgia, "Times New Roman", serif',size:120,margin:80,bg:'#000000',fg:'#ffffff',image:'',
    bold:false,italic:false,shadow:true,screen:{w:1920,h:1080,connected:true,id:0},publicWindow:'ok'};
  const lireL=(k,d)=>{try{const v=localStorage.getItem(CLES+k);return v?JSON.parse(v):d}catch(e){return d}};
  const ecrireL=(k,v)=>{try{localStorage.setItem(CLES+k,JSON.stringify(v))}catch(e){}};
  let etat=Object.assign({},DEFAUT,lireL('reglages',{})), abonnes=[], plein=false;

  /* ---- le « vidéoprojecteur » : la 2e fenêtre, ou tout l'écran (bouton Plein écran) ---- */
  function cadre(){ return plein ? document.getElementById('demoEcranBox') : document.getElementById('demoEcranBox'); }
  function texte(){ return plein ? document.getElementById('demoEcranTxt2') : document.getElementById('demoEcranTxt'); }
  function dessinerEcran(){
    const box=cadre(), txt=texte(), indice=document.getElementById('ecranVide');
    if(!box||!txt) return;
    const visible = etat.projection && etat.affichage && !!etat.text;
    document.getElementById('demoEcran').style.display = (plein && visible) ? 'block' : 'none';
    if(indice) indice.style.display = visible ? 'none' : 'block';
    box.style.background = etat.image ? ('#000 url('+etat.image+') center/cover no-repeat') : (etat.bg||'#000');
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
  function diffuser(){ const msg={etat,reserve:lireL('reserve',[]),historique:lireL('historique',[])}; abonnes.forEach(cb=>{try{cb(msg)}catch(e){}}); dessinerEcran(); }

  window.api={
    estElectron:false,
    patch(p){ etat=Object.assign({},etat,p); if(p&&('font'in p||'size'in p||'margin'in p||'bg'in p||'fg'in p||'image'in p||'bold'in p||'italic'in p||'affichage'in p||'projection'in p)) ecrireL('reglages',etat); diffuser(); },
    deconnecter(){ etat.projection=false; etat.publicWindow='deconnecte'; diffuser(); },
    reconnecter(){ etat.projection=true; etat.publicWindow='ok'; diffuser(); },
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
    async infos(){ return {version:'2.0-démo',portable:false,dossier:'stockage du navigateur',contenu:'un chapitre, une brochure, les cantiques — embarqués dans ce fichier'}; }
  };

  window.addEventListener('keydown',e=>{ if(e.key==='Escape'&&plein){ plein=false; document.getElementById('demoEcran').style.display='none'; dessinerEcran(); } });
  window.addEventListener('resize',()=>{ etat.screen={w:window.innerWidth,h:window.innerHeight,connected:true,id:0}; diffuser(); });

  /* mise à l'échelle : le bureau garde exactement les proportions d'un vrai écran */
  function ajuster(){ const t=document.getElementById('tout');
    const e=Math.min(window.innerWidth/1600,window.innerHeight/900,1);
    t.style.transform='scale('+e+')';
  }
  window.addEventListener('resize',ajuster);

  document.addEventListener('DOMContentLoaded',()=>{
    ajuster();
    const b=document.getElementById('bPlein');
    if(b) b.onclick=()=>{ plein=!plein; if(plein){ document.getElementById('demoEcran').style.display='block'; } else { document.getElementById('demoEcran').style.display='none'; } dessinerEcran(); };
    const h=document.getElementById('horloge');
    const tic=()=>{ if(h) h.textContent=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); };
    tic(); setInterval(tic,20000);
  });
  diffuser();
})();`;
}

/* ---------------------------------------------------------------- 5. contenu embarqué */
const contenu = {
  index: {
    stats: {
      livres: Object.keys(bible).length, versets,
      cantiques: cantiques.length, brochures: 1,
      doubleTraduction: (brochure.tr.VGR && brochure.tr.Shekina) ? 1 : 0
    },
    cantiques: cantiques.map(c => ({ id: c.id, name: c.name, units: c.units.length, types: c.types || null })),
    bible: Object.keys(bible).map(ab => ({ ab, chapitres: Object.keys(bible[ab]).length })),
    brochures: [{
      id: brochure.id, code: brochure.code, name: brochure.name, year: brochure.year, tr: Object.keys(brochure.tr || {}),
      paras: Object.fromEntries(Object.entries(brochure.tr || {}).map(([k, v]) => [k, v.length])),
      pdf: brochure.pdf || '', audio: brochure.audio || '', duree: brochure.duree || ''
    }]
  },
  bible, cantiques, brochures: [brochure]
};
const contenuJson = JSON.stringify(contenu).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

/* icône de l'onglet, intégrée en clair (le fichier reste autonome) */
let icone = '';
try { icone = 'data:image/png;base64,' + fs.readFileSync(path.join(RACINE, 'ressources', 'icon-64.png')).toString('base64'); } catch (e) {}

/* ---------------------------------------------------------------- 6. assemblage */
const entete = lire('app/control.html');

const ouvrirBureau = () =>
  '<div id="tout">\n' +
  '  <div id="bureau">\n' +
  '    <div>\n' +
  '      <p class="etiquette">Ordinateur de la sono — poste de contrôle</p>\n' +
  '      <div class="fenetre" id="fenetreControle">\n' +
  '        <div class="barref"><span class="titre">Malachie 4 Projections — Poste de contrôle</span>' +
  '<span class="bf"><i>—</i><i>▢</i><i>✕</i></span></div>\n' +
  '        <div class="interieur">';

const fermerBureau = () =>
  '        </div>\n' +
  '      </div>\n' +
  '    </div>\n' +
  '    <div>\n' +
  '      <p class="etiquette">Vidéoprojecteur — écran 2</p>\n' +
  '      <div class="fenetre">\n' +
  '        <div class="barref"><span class="titre">Malachie 4 — Écran public</span><span class="bf"><i>—</i><i>▢</i><i>✕</i></span></div>\n' +
  '        <div class="ecran">\n' +
  '          <div id="demoEcranBox"><div id="demoEcranTxt"></div></div>\n' +
  '          <div class="ecran-vide" id="ecranVide">Aucune image — le vidéoprojecteur reste noir</div>\n' +
  '        </div>\n' +
  '        <div class="piedEcran">\n' +
  '          <button class="bouton" id="bPlein">Plein écran</button>\n' +
  '          <span class="discret">Ce que voit l’assemblée (Échap pour quitter)</span>\n' +
  '        </div>\n' +
  '      </div>\n' +
  '    </div>\n' +
  '  </div>\n' +
  '  <div id="barreTaches">\n' +
  '    <span class="pastille"><img alt="" id="iconeTache"> Malachie 4 Projections</span>\n' +
  '    <span class="pastille">Écran public</span>\n' +
  '    <span id="bandeauDemo">Démonstration : Jean 3 (' + versets + ' versets) · une brochure · ' + cantiques.length + ' cantiques' +
  ' — la version complète contient les 66 livres et 160 brochures</span>\n' +
  '    <span class="droite"><span id="horloge">--:--</span></span>\n' +
  '  </div>\n' +
  '</div>\n' +
  '<div id="demoEcran"><button class="quitter" id="bQuitterPlein">Quitter le plein écran (Échap)</button>' +
  '<div id="demoEcranBox2" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">' +
  '<div id="demoEcranTxt2" style="text-align:center;line-height:1.18;white-space:pre-wrap;word-wrap:break-word"></div></div></div>\n';

const html = entete
  .replace('<link rel="icon" href="../ressources/icon-64.png">\n', '')
  .replace('<link rel="stylesheet" href="control.css">', () => '<style>\n' + css + '\n' + habillage + '\n</style>')
  .replace('<body>', () => '<body>\n' + ouvrirBureau())
  .replace('</body>', () => fermerBureau() + '</body>')
  .replace('<script src="../render.js"></script>\n<script src="control.js"></script>',
    () => '<script>\n' + rendu + '\n</script>\n<script>\n' + pontDemo(contenuJson) + '\n</script>\n<script>\n' + controleJs + '\n</script>')
  .replace('<title>', () => (icone ? '<link rel="icon" href="' + icone + '">\n' : '') + '<title>Démonstration — ');

/* ---------------------------------------------------------------- 7. garde-fous */
const vm = require('vm');
const morceaux = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let souci = null;
morceaux.forEach((m, i) => { try { new vm.Script(m); } catch (e) { souci = 'script ' + (i + 1) + ' : ' + e.message; } });
if (souci) { console.error('ERREUR — démo invalide : ' + souci); process.exit(1); }
if (!html.includes('const $$ = s => Array.from')) { console.error('ERREUR — le code inliné a été altéré (les « $$ » ont disparu).'); process.exit(1); }
['id="demoEcranBox"', 'id="demoEcranTxt"', 'id="barreTaches"', 'id="bPlein"', 'id="tout"'].forEach(id => {
  if (!html.includes(id)) { console.error('ERREUR — élément manquant dans la démo : ' + id); process.exit(1); }
});

fs.writeFileSync(path.join(RACINE, 'demo.html'), html);
const taille = fs.statSync(path.join(RACINE, 'demo.html')).size;
console.log('Démo « type ordinateur » construite : demo.html · ' + (taille / 1024).toFixed(0) + ' Ko (fichier unique, rien d’autre à installer)');
