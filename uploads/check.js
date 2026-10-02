// Vérifications automatiques : fichiers présents, syntaxe, règles de sécurité
const fs = require('fs'), vm = require('vm');
let bad = 0; const ko = m => { console.log('ECHEC :', m); bad++; };
['main.js','preload.js','render.js','public.html','control.html','data.js','package.json'].forEach(f => fs.existsSync(f) || ko('fichier manquant ' + f));
['main.js','preload.js','render.js','data.js'].forEach(f => { try { new vm.Script(fs.readFileSync(f, 'utf8')); } catch (e) { ko(f + ' : ' + e.message); } });
['control.html','public.html'].forEach(f => {
  const h = fs.readFileSync(f, 'utf8');
  [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(m => { try { new vm.Script(m[1]); } catch (e) { ko(f + ' script : ' + e.message); } });
});
const main = fs.readFileSync('main.js', 'utf8');
if (!/contextIsolation: true/.test(main)) ko('contextIsolation doit être actif');
if (/nodeIntegration: true/.test(main)) ko('nodeIntegration doit rester désactivé');
if (!/setIgnoreMouseEvents\(true\)/.test(main)) ko('la fenêtre publique doit ignorer la souris');
if (!/unresponsive/.test(main) || !/render-process-gone/.test(main)) ko('relance automatique absente');
console.log(bad ? bad + ' problème(s)' : 'Tous les contrôles sont réussis');
process.exit(bad ? 1 : 0);
