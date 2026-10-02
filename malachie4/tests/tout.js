#!/usr/bin/env node
/* ============================================================================
   Lance l'ensemble des tests : node tests/tout.js   (ou npm test)
   ========================================================================== */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const suites = [
  ['Contrôles généraux', 'check.js'],
  ['Version web et démo', 'test_web.js'],
  ['Application Electron', 'test_electron.js'],
  ['Démonstration (navigateur simulé)', 'test_demo.js']
];
let global = 0;
for (const [nom, fichier] of suites) {
  console.log('\n══════ ' + nom + ' — ' + fichier + ' ══════');
  try { console.log(execFileSync(process.execPath, [path.join(__dirname, fichier)], { encoding: 'utf8' })); }
  catch (e) { process.stdout.write(e.stdout || ''); process.stderr.write(e.stderr || ''); global = 1; }
}
console.log(global ? '\n✗ Des tests ont échoué.' : '\n✓ Toutes les suites de tests sont passées.');
process.exit(global);
