/* ============================================================================
   Test de la version web : mêmes fichiers que l'application (aucune
   duplication de code), même interface que preload.js, serveur local complet.
   Usage : node tests/test_web.js
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
let echecs = 0, reussis = 0;
const ko = m => { console.log('  ✗ ' + m); echecs++; };
const ok = m => { console.log('  ✓ ' + m); reussis++; };

console.log('1. Fichiers de la version web');
['web/index.html', 'web/ecran.html', 'web/pont.js', 'outils/serveur_web.js', 'outils/construire_web.js'].forEach(f => {
  fs.existsSync(path.join(RACINE, f)) ? ok('présent : ' + f) : ko('manquant : ' + f);
});
const index = fs.readFileSync(path.join(RACINE, 'web/index.html'), 'utf8');
const ecran = fs.readFileSync(path.join(RACINE, 'web/ecran.html'), 'utf8');
const pont = fs.readFileSync(path.join(RACINE, 'web/pont.js'), 'utf8');
const preload = fs.readFileSync(path.join(RACINE, 'preload.js'), 'utf8');

console.log('\n2. Code partagé avec l’application (aucune deuxième logique de rendu)');
index.includes('../app/control.js') ? ok('le poste de contrôle utilise le même control.js que l’application') : ko('control.js non partagé');
index.includes('../render.js') ? ok('le moteur de rendu render.js est partagé') : ko('render.js non partagé');
ecran.includes('../app/public.js') && ecran.includes('../render.js') ? ok('l’écran public web utilise le même public.js + render.js') : ko('écran public web non partagé');
index.includes('../app/control.css') ? ok('même feuille de style que l’application') : ko('feuille de style non partagée');
if (!/function paint\s*\(/.test(pont) && !/function paint\s*\(/.test(index)) ok('aucune logique de rendu réécrite dans la version web'); else ko('logique de rendu dupliquée');

console.log('\n3. Même interface que preload.js');
const extraire = src => {
  const noms = new Set();
  [...src.matchAll(/^\s{2,4}(?:async\s+)?([a-zA-ZÀ-ÿ_][\w]*)\s*[:(]/gm)].forEach(m => noms.add(m[1]));
  ['exposeInMainWorld', 'invoke', 'send', 'on'].forEach(bruit => noms.delete(bruit));
  return noms;
};
const attendus = [...extraire(preload)];
const fournis = extraire(pont);
const manquants = attendus.filter(n => !fournis.has(n));
manquants.length === 0 ? ok('les ' + attendus.length + ' fonctions du pont (' + attendus.join(', ') + ') existent à l’identique') : ko('fonctions absentes du pont web : ' + manquants.join(', '));
/patch\s*\(/.test(pont) && /deconnecter|reconnecter|vider/.test(pont) ? ok('commandes de la barre haute disponibles (patch, déconnecter, reconnecter, vider)') : ko('commandes manquantes dans le pont web');
/BroadcastChannel/.test(pont) ? ok('l’écran public est synchronisé entre les deux fenêtres du navigateur') : ko('synchronisation absente');

console.log('\n4. Aucune dépendance à Internet');
const externes = [...pont.matchAll(/https?:\/\/[^"'\s)]+/g)].map(m => m[0]).filter(u => !/localhost|127\.0\.0\.1/.test(u));
externes.length === 0 ? ok('le pont web n’appelle aucun site extérieur') : ko('appels extérieurs : ' + externes.join(', '));
[...index.matchAll(/https?:\/\/[^"'\s)]+/g)].map(m => m[0]).length === 0 ? ok('la page de contrôle ne charge rien depuis Internet') : ko('ressource externe dans index.html');
/fetch\(/.test(pont) ? ok('le contenu est lu localement (fetch relatif)') : ko('lecture du contenu absente');

console.log('\n5. Serveur local');
const code = fs.readFileSync(path.join(RACINE, 'outils/serveur_web.js'), 'utf8');
/0\.0\.0\.0/.test(code) ? ok('écoute sur toutes les interfaces (accessible depuis un autre poste)') : ko('écoute limitée à une interface');
/'Access-Control-Allow-Origin':'\*'/.test(code) ? ok('en-têtes d’accès ouverts (nécessaire si la page est encadrée)') : ko('en-têtes d’accès absents');

/* essai réel : on démarre le serveur sur un port libre et on lit les fichiers */
const PORT = 8123;
const serveur = require('child_process').spawn(process.execPath, [path.join(RACINE, 'outils', 'serveur_web.js')], {
  env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: 'ignore'
});
const lire = url => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path: url }, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res({ code: r.statusCode, entetes: r.headers, corps: d }));
  }).on('error', rej);
});
setTimeout(async () => {
  try {
    const avecContenu = fs.existsSync(path.join(RACINE, 'content', 'cantiques.json'));
    const pages = [['/web/index.html', /Poste de contrôle|Malachie 4/], ['/web/ecran.html', /Écran public|box/], ['/render.js', /Rendu/], ['/app/control.js', /ZONE 5/]];
    if (avecContenu) pages.push(['/content/cantiques.json', /Plus près de toi|name/]);
    for (const [url, motif] of pages) {
      const r = await lire(url);
      (r.code === 200 && motif.test(r.corps)) ? ok('servi : ' + url + ' (' + r.corps.length + ' o)') : ko('service incorrect : ' + url + ' → ' + r.code);
    }
    const gz = await lire('/content/bible.json.gz');
    if (gz.code === 200) ok('Bible compressée servie (' + (gz.corps.length / 1024 / 1024).toFixed(1) + ' Mo) — décompressée par le navigateur');
    else console.log('  · contenu non présent ici (il vit dans le dépôt) : contrôle du service du contenu ignoré');
    const racine = await lire('/');
    /Poste de contrôle|Malachie 4/.test(racine.corps) ? ok('l’adresse racine ouvre directement le poste de contrôle') : ko('racine non configurée');
    const c = await lire('/web/index.html');
    c.entetes['access-control-allow-origin'] === '*' ? ok('en-tête CORS présent dans la réponse réelle') : ko('en-tête CORS absent');
    const dehors = await lire('/../etc/passwd');
    (dehors.code === 403 || dehors.code === 404) ? ok('aucune sortie du dossier (sécurité)') : ko('accès hors dossier possible : ' + dehors.code);
  } catch (e) { ko('serveur injoignable : ' + e.message); }
  serveur.kill();
  console.log('\n────────────────────────────────────────');
  console.log(echecs ? `✗ ${echecs} problème(s) — ${reussis} contrôle(s) réussi(s)` : `✓ Version web validée (${reussis} contrôles)`);
  process.exit(echecs ? 1 : 0);
}, 900);
