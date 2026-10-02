/* Service worker — La Bibliothèque du Message
   Stratégie :
   - coquille (HTML/CSS/JS) : cache-first, mise à jour en arrière-plan
   - données (data/**) : cache-first (elles ne changent pas)
*/
const SHELL = 'blm-shell-v1';
const DATA_CACHE = 'blm-data-v1';
const SHELL_FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icon.svg', 'data/index.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL && k !== DATA_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;      // les liens PDF/MP3 en ligne passent directement
  const isData = url.pathname.includes('/data/');
  e.respondWith((async () => {
    const cache = await caches.open(isData ? DATA_CACHE : SHELL);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) {
      if (!isData) fetch(req).then(r => r.ok && cache.put(req, r.clone())).catch(() => {});
      return hit;
    }
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      return new Response('Hors-ligne : cette page n’est pas encore enregistrée.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
