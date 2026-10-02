/* les fichiers sont lus depuis CE dépôt (pas depuis un autre dossier) */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
import { JSDOM, VirtualConsole } from 'jsdom'; import fs from 'fs';
const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(fs.readFileSync(join(RACINE, 'Bible_Louis_Segond_1910.html'),'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc});
const {window}=dom; const $=s=>window.document.querySelector(s);
console.log('livres:', window.document.querySelectorAll('.grid button').length);
$('#q').value='Jean 3:16'; $('#q').dispatchEvent(new window.Event('input',{bubbles:true}));
console.log('référence ->', $('h2')?.textContent, '|', ($('.v[style]')?.textContent||'').slice(0,120));
$('#q').value='berger'; $('#q').dispatchEvent(new window.Event('input',{bubbles:true}));
console.log('recherche mot ->', window.document.querySelectorAll('.v').length, 'versets |', window.document.querySelector('.v')?.textContent.slice(0,90));
console.log('erreurs:', errs.filter(e=>!/scrollTo|not implemented/i.test(e)).length?errs.slice(0,3):'aucune');
