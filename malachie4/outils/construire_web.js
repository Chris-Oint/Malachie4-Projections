#!/usr/bin/env node
/* ============================================================================
   Génère la version WEB à partir des mêmes fichiers que l'application
   (aucune duplication de code) :
       web/index.html  → poste de contrôle
       web/ecran.html  → écran public (à ouvrir sur le 2e écran, ou 2e fenêtre)
   Usage : node outils/construire_web.js
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const ecrire = (f, c) => { fs.mkdirSync(path.dirname(path.join(RACINE, f)), { recursive: true }); fs.writeFileSync(path.join(RACINE, f), c); };

/* --- contrôle --- */
let controle = lire('app/control.html');
controle = controle
  .replace('<link rel="stylesheet" href="control.css">', '<link rel="stylesheet" href="../app/control.css">')
  .replace('<script src="../render.js"></script>\n<script src="control.js"></script>',
           '<script src="../render.js"></script>\n<script src="pont.js"></script>\n<script src="../app/control.js"></script>')
  .replace('<title>', '<title>Version web — ');
ecrire('web/index.html', controle);

/* --- écran public --- */
let ecran = lire('app/public.html');
ecran = ecran
  .replace('<script src="../render.js"></script>\n<script src="public.js"></script>',
           '<script src="../render.js"></script>\n<script src="pont.js"></script>\n<script src="../app/public.js"></script>');
ecrire('web/ecran.html', ecran);

/* --- petit serveur local (obligatoire : les navigateurs bloquent file://) --- */
const serveur = `#!/usr/bin/env node
/* Serveur local de la version web — node outils/serveur_web.js   (port 8090 ou PORT) */
const http=require('http'),fs=require('fs'),path=require('path');
const RACINE=path.join(__dirname,'..');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.json':'application/json; charset=utf-8','.gz':'application/gzip','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon',
 '.webmanifest':'application/manifest+json','.mp3':'audio/mpeg','.pdf':'application/pdf'};
const PORT=process.env.PORT||8090;
const tete=(extra)=>Object.assign({'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*',
  'Cross-Origin-Resource-Policy':'cross-origin','Cache-Control':'no-cache'},extra||{});
const SERVEUR=http.createServer((req,res)=>{
  const url=decodeURIComponent(req.url.split('?')[0]);
  if(req.method==='OPTIONS'){res.writeHead(204,tete()).end();return;}
  let f=path.join(RACINE,url==='/'?'web/index.html':url);
  if(!f.startsWith(RACINE)){res.writeHead(403,tete({'Content-Type':'text/plain; charset=utf-8'})).end('interdit');return;}
  fs.readFile(f,(e,d)=>{
    if(e){res.writeHead(404,tete({'Content-Type':'text/plain; charset=utf-8'})).end('introuvable : '+url);return;}
    res.writeHead(200,tete({'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'}));
    res.end(d);
  });
});
SERVEUR.listen(PORT,'0.0.0.0',()=>{
  console.log('Malachie 4 — version web prête :');
  console.log('   Poste de contrôle : http://localhost:'+PORT+'/web/index.html');
  console.log('   Écran public      : bouton « Projection » (ou http://localhost:'+PORT+'/web/ecran.html)');
  console.log('   (accessible aussi depuis un autre poste du même réseau, via l adresse IP de cet ordinateur)');
});
`;
ecrire('outils/serveur_web.js', serveur);
console.log('Version web générée :');
console.log('  web/index.html  — poste de contrôle');
console.log('  web/ecran.html  — écran public (2e fenêtre ou 2e écran)');
console.log('  Lancement : npm run web  →  http://localhost:8090/web/index.html');
