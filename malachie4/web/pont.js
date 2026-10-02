/* ============================================================================
   Malachie 4 Projections — pont navigateur (version web)
   Même interface que preload.js, mais sans Electron :
     - état partagé entre l'onglet « contrôle » et l'onglet « écran public »
       par BroadcastChannel (aucun serveur, aucune connexion internet) ;
     - contenu lu depuis les fichiers du dossier content/ ;
     - réglages, réserve et historique conservés dans le navigateur.
   ========================================================================== */
'use strict';
(function () {
  if (window.api && window.api.estElectron) return;

  let CANAL = null;
  try { CANAL = ('BroadcastChannel' in window) ? new BroadcastChannel('malachie4') : null; } catch (e) { CANAL = null; }
  const CLES = 'malachie4.';
  const DEFAUT = {
    affichage: true, projection: true, text: '', label: '', mode: 'idle',
    font: 'Georgia, "Times New Roman", serif', size: 120, margin: 80,
    bg: '#000000', fg: '#ffffff', image: '', bold: false, italic: false, shadow: true,
    screen: { w: window.innerWidth, h: window.innerHeight, connected: true, id: 1 },
    publicWindow: 'ok'
  };
  let etat = Object.assign({}, DEFAUT, lire('reglages', {}));
  const abonnes = [];

  function lire(cle, defaut) { try { const v = localStorage.getItem(CLES + cle); return v ? JSON.parse(v) : defaut; } catch (e) { return defaut; } }
  function ecrireLocal(cle, v) { try { localStorage.setItem(CLES + cle, JSON.stringify(v)); } catch (e) {} }

  function diffuser() {
    const msg = { etat, reserve: lire('reserve', []), historique: lire('historique', []) };
    abonnes.forEach(cb => { try { cb(msg); } catch (e) {} });
    if (CANAL) CANAL.postMessage(msg);
  }
  if (CANAL) CANAL.onmessage = e => { if (e.data && e.data.etat) abonnes.forEach(cb => { try { cb(e.data); } catch (err) {} }); };

  /* ---------------- contenu ---------------- */
  const cache = { bible: null, cantiques: null, brochures: null, index: null };

  async function lireFichier(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('fichier introuvable : ' + url);
    if (url.endsWith('.gz')) {
      if (typeof DecompressionStream === 'undefined') throw new Error('ce navigateur ne sait pas décompresser les .gz (utilisez Chrome, Edge ou Firefox récent)');
      return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();
    }
    return r.json();
  }

  async function chargerTout() {
    const base = '../content/';
    if (!cache.bible) cache.bible = await lireFichier(base + 'bible.json.gz');
    if (!cache.cantiques) cache.cantiques = await lireFichier(base + 'cantiques.json');
    if (!cache.brochures) cache.brochures = await lireFichier(base + 'brochures.json.gz');
    cache.index = {
      stats: {
        livres: Object.keys(cache.bible).length,
        versets: Object.values(cache.bible).reduce((s, l) => s + Object.values(l).reduce((t, c) => t + c.length, 0), 0),
        cantiques: cache.cantiques.length,
        brochures: cache.brochures.length,
        doubleTraduction: cache.brochures.filter(b => b.tr && b.tr.VGR && b.tr.Shekina).length,
        branhamFr: cache.brochures.filter(b => b.tr && b.tr.BF).length
      },
      cantiques: cache.cantiques.map(c => ({ id: c.id, name: c.name, units: c.units.length, types: c.types || null })),
      bible: Object.keys(cache.bible).map(ab => ({ ab, chapitres: Object.keys(cache.bible[ab]).length })),
      brochures: cache.brochures.map(b => ({
        id: b.id, code: b.code, name: b.name, year: b.year, tr: Object.keys(b.tr || {}),
        paras: Object.fromEntries(Object.entries(b.tr || {}).map(([k, v]) => [k, v.length])),
        pdf: b.pdf || '', audio: b.audio || '', duree: b.duree || ''
      }))
    };
    return cache.index;
  }

  /* ---------------- écran public (onglet séparé) ---------------- */
  let fenetrePublique = null;
  function lienEcranPublic() {
    const url = new URL('ecran.html', location.href).href;
    let el = document.getElementById('lienEcranPublic');
    if (!el) {
      el = document.createElement('a');
      el.id = 'lienEcranPublic'; el.target = '_blank'; el.rel = 'noopener';
      el.href = url; el.textContent = 'Ouvrir l’écran public dans une 2ᵉ fenêtre';
      el.style.cssText = 'position:fixed;left:12px;bottom:10px;z-index:5000;background:#22303f;color:#dbe6f5;' +
        'border:1px solid #3a4a60;border-radius:6px;padding:6px 10px;font:12px Segoe UI,Arial;text-decoration:none';
      document.body.append(el);
    }
    return el;
  }
  function ouvrirEcranPublic() {
    const url = new URL('ecran.html', location.href).href;
    if (fenetrePublique && !fenetrePublique.closed) { try { fenetrePublique.focus(); } catch (e) {} return; }
    try { fenetrePublique = window.open(url, 'malachie4-public', 'width=960,height=540,menubar=no,toolbar=no,location=no,status=no'); } catch (e) { fenetrePublique = null; }
    /* si le navigateur refuse la 2e fenêtre (blocage des fenêtres surgissantes ou cadre
       restreint), on affiche un lien : la zone 3 sert de retour visuel permanent */
    if (!fenetrePublique) { const el = lienEcranPublic(); el.style.display = 'block'; }
    else { const el = document.getElementById('lienEcranPublic'); if (el) el.style.display = 'none'; }
  }

  window.api = {
    estElectron: false,
    patch(p) {
      etat = Object.assign({}, etat, p);
      if (p && ('font' in p || 'size' in p || 'margin' in p || 'bg' in p || 'fg' in p || 'image' in p || 'bold' in p || 'italic' in p || 'affichage' in p || 'projection' in p)) {
        ecrireLocal('reglages', etat);
      }
      diffuser();
    },
    deconnecter() { etat.projection = false; if (fenetrePublique && !fenetrePublique.closed) fenetrePublique.close(); diffuser(); },
    reconnecter() { etat.projection = true; etat.publicWindow = 'ok'; ouvrirEcranPublic(); diffuser(); },
    vider() { etat = Object.assign({}, etat, { text: '', label: '', affichage: false }); diffuser(); },
    quitter() { window.close(); },
    onEtat(cb) { abonnes.push(cb); cb({ etat, reserve: lire('reserve', []), historique: lire('historique', []) }); },
    async indexContenu() { return cache.index || await chargerTout(); },
    async brochure(id) { if (!cache.brochures) await chargerTout(); return cache.brochures.find(b => b.id === id) || null; },
    async cantique(id) { if (!cache.cantiques) { await chargerTout(); } const perso = lire('cantiques_perso', {}); const c = cache.cantiques.find(x => x.id === id); return c ? Object.assign({}, c, perso[id] || {}) : null; },
    async chapitre(ab, ch) { if (!cache.bible) await chargerTout(); return (cache.bible[ab] && cache.bible[ab][ch]) || []; },
    async lireDonnees(nom) { return lire(nom, null); },
    async ecrireDonnees(nom, v) { ecrireLocal(nom, v); return true; },
    async enregistrerCantique(id, modif) {
      const perso = lire('cantiques_perso', {});
      perso[id] = Object.assign({}, perso[id], modif);
      ecrireLocal('cantiques_perso', perso);
      const c = cache.cantiques.find(x => x.id === id);
      return c ? Object.assign({}, c, perso[id]) : null;
    },
    async ajouterCantique(c) { cache.cantiques = (cache.cantiques || []).filter(x => x.id !== c.id).concat([c]); return c; },
    async supprimerCantique(id) { cache.cantiques = (cache.cantiques || []).filter(x => x.id !== id); return true; },
    choisirImage() {
      return new Promise(res => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => {
          const f = inp.files && inp.files[0]; if (!f) return res(null);
          const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(f);
        };
        inp.click();
      });
    },
    async journal() { return ''; },
    async ouvrirDossier() { return true; },
    async infos() { return { version: '2.0-web', portable: false, dossier: 'stockage du navigateur', contenu: 'content/' }; }
  };

  window.addEventListener('resize', () => { etat.screen = { w: window.innerWidth, h: window.innerHeight, connected: true, id: 1 }; diffuser(); });
  diffuser();
})();
