// Fonction de rendu UNIQUE, utilisée par l'écran public ET par la zone 3
function paint(box, txt, st) {
  box.style.background = st.affichage ? st.bg : 'transparent';
  txt.style.fontFamily = st.font; txt.style.color = st.fg;
  const show = st.affichage && st.text;
  txt.textContent = show ? st.text : '';
  if (!show) return;
  const W = box.clientWidth - 2 * st.margin, H = box.clientHeight - 2 * st.margin;
  txt.style.width = W + 'px';
  let lo = 16, hi = st.size;                  // réduction automatique : jamais de débordement
  while (lo < hi) { const m = Math.ceil((lo + hi) / 2); txt.style.fontSize = m + 'px'; txt.offsetHeight > H ? hi = m - 1 : lo = m; }
  txt.style.fontSize = lo + 'px';
}
