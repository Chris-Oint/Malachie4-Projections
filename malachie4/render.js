/* ============================================================================
   Malachie 4 Projections — render.js
   MOTEUR DE RENDU UNIQUE (exigence B du cahier des charges) :
   la même fonction dessine l'écran public ET la zone 3 (écran-retour).
   Aucun autre endroit du logiciel ne doit calculer un rendu.
   ========================================================================== */
(function (root) {
  'use strict';

  /* Réduction automatique par recherche dichotomique : le texte ne dépasse JAMAIS la marge. */
  function ajusterTaille(txt, largeur, hauteur, tailleMax) {
    let lo = 10, hi = Math.max(12, Math.round(tailleMax));
    txt.style.fontSize = hi + 'px';
    if (txt.scrollHeight <= hauteur && txt.scrollWidth <= largeur) return hi;
    while (lo < hi) {
      const m = Math.ceil((lo + hi) / 2);
      txt.style.fontSize = m + 'px';
      if (txt.scrollHeight <= hauteur && txt.scrollWidth <= largeur) lo = m; else hi = m - 1;
    }
    return lo;
  }

  /* Dessine l'état st dans le conteneur box (texte = txt).
     st = { affichage, text, bg, fg, font, size, margin, bold, italic, image, shadow, align } */
  function paint(box, txt, st) {
    st = st || {};
    const affichage = st.affichage !== false;
    const marges = Math.max(0, st.margin == null ? 80 : st.margin);

    /* fond */
    if (affichage) {
      if (st.image) {
        box.style.background = '#000 url("' + st.image + '") center/cover no-repeat';
      } else {
        box.style.background = st.bg || '#000000';
      }
    } else {
      box.style.background = 'transparent';
    }

    /* texte */
    const texte = affichage && st.text ? String(st.text) : '';
    txt.textContent = texte;
    if (!texte) { txt.style.fontSize = '1px'; return 0; }

    txt.style.fontFamily = st.font || 'Georgia, serif';
    txt.style.fontWeight = st.bold ? '700' : '400';
    txt.style.fontStyle = st.italic ? 'italic' : 'normal';
    txt.style.color = (st.fg || '#ffffff');
    txt.style.textAlign = 'center';
    txt.style.textShadow = st.shadow === false ? 'none' : '0 2px 6px rgba(0,0,0,.55)';
    txt.style.whiteSpace = 'pre-wrap';
    txt.style.wordWrap = 'break-word';
    txt.style.lineHeight = '1.18';

    const L = Math.max(20, box.clientWidth - 2 * marges);
    const H = Math.max(20, box.clientHeight - 2 * marges);
    txt.style.width = L + 'px';
    txt.style.maxWidth = L + 'px';

    const taille = ajusterTaille(txt, L, H, st.size || 120);
    box.style.padding = '0';
    txt.style.margin = '0';
    return taille;
  }

  /* Écran-retour (zone 3) : même rendu, dessiné à la résolution réelle de l'écran public
     puis mis à l'échelle par CSS (exigence B). */
  function paintMiroir(conteneur, st, largeur, hauteur) {
    let cadre = conteneur.querySelector('.miroir-cadre');
    if (!cadre) {
      conteneur.innerHTML = '<div class="miroir-cadre"><div class="miroir-box"><div class="miroir-txt"></div></div></div>';
      cadre = conteneur.querySelector('.miroir-cadre');
    }
    const box = cadre.querySelector('.miroir-box');
    const txt = cadre.querySelector('.miroir-txt');
    const w = largeur || 1920, h = hauteur || 1080;
    box.style.width = w + 'px';
    box.style.height = h + 'px';
    box.style.position = 'absolute';
    box.style.left = '0'; box.style.top = '0';
    box.style.display = 'flex';
    box.style.alignItems = 'center';
    box.style.justifyContent = 'center';
    txt.style.display = 'block';

    const k = conteneur.clientWidth / w;
    cadre.style.transform = 'scale(' + k + ')';
    cadre.style.transformOrigin = '0 0';
    conteneur.style.height = Math.round(h * k) + 'px';

    /* l'écran-retour montre toujours ce qui serait projeté, même quand l'affichage est coupé */
    const st2 = Object.assign({}, st, { affichage: true, bg: st.affichage ? (st.bg || '#000') : '#15181f' });
    paint(box, txt, st2);
    return k;
  }

  const API = { paint: paint, paintMiroir: paintMiroir, ajusterTaille: ajusterTaille };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.Rendu = API;
})(typeof window !== 'undefined' ? window : globalThis);
