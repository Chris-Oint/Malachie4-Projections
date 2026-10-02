/* ============================================================================
   Écran public : dessine EXACTEMENT ce que le processus principal diffuse,
   avec le même moteur de rendu que la zone 3 (render.js).
   Rendu limité à une image par requestAnimationFrame (zéro scintillement).
   ========================================================================== */
'use strict';
(function () {
  const box = document.getElementById('box');
  const txt = document.getElementById('txt');
  let enAttente = false, dernier = null;

  function dessiner() {
    enAttente = false;
    if (!dernier) return;
    const e = dernier.etat || dernier;
    window.Rendu.paint(box, txt, {
      affichage: e.affichage !== false,
      text: e.text || '',
      bg: e.bg || '#000000',
      fg: e.fg || '#ffffff',
      font: e.font || 'Georgia, serif',
      size: e.size || 120,
      margin: e.margin == null ? 80 : e.margin,
      bold: e.bold, italic: e.italic, image: e.image, shadow: e.shadow
    });
  }
  function planifier(msg) {
    dernier = msg;
    if (enAttente) return;
    enAttente = true;
    requestAnimationFrame(dessiner);
  }

  if (window.api && window.api.onEtat) window.api.onEtat(planifier);
  window.addEventListener('resize', () => planifier(dernier || {}));
  /* l'écran public ne doit jamais afficher d'erreur : on avale tout et on continue */
  window.onerror = () => true;
  window.addEventListener('unhandledrejection', e => e.preventDefault());
})();
