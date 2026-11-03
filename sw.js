// Service Worker: hält die App-Dateien auf dem Gerät bereit, damit der Planer auch ohne Netz startet.
// Eigene Dateien: erst aus dem Netz (damit Updates sofort ankommen), ohne Netz aus dem Speicher.
// Firebase-Bibliothek: feste Version, daher direkt aus dem Speicher.
const CACHE = 'shk-planer-v1';
const FILES = [
  './', './index.html', './app.js', './store.js', './firebase-config.js', './manifest.webmanifest',
  './logo.svg', './icon-180.png', './icon-192.png', './icon-512.png',
  './fonts/montserrat-latin.woff2', './fonts/montserrat-latin-ext.woff2',
  './fonts/opensans-latin.woff2', './fonts/opensans-latin-ext.woff2',
];
const FIREBASE = 'https://www.gstatic.com/firebasejs/';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.url.startsWith(FIREBASE)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  if (url.origin !== location.origin) return; // Datenbank, Karten usw. nicht anfassen

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Bei schlechtem Empfang nicht ewig warten
      const res = await Promise.race([
        fetch(req),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
      ]);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return cache.match('./index.html');
      throw err;
    }
  })());
});
