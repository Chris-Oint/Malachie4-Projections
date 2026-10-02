#!/usr/bin/env node
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
