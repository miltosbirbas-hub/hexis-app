// ============================================
//  HEXIS SERVICE WORKER
//  ΑΛΛΑΖΕΙΣ ΜΟΝΟ ΤΟΝ ΑΡΙΘΜΟ VERSION ΣΕ ΚΑΘΕ ΝΕΑ ΕΚΔΟΣΗ
//  (πρέπει να ταιριάζει με την έκδοση του app.html)
// ============================================
const VERSION = 'v4.04';
const CACHE_NAME = 'hexis-' + VERSION;

// Άμεση ενεργοποίηση νέας έκδοσης
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// Σβήνει όλα τα παλιά cache μόλις ανέβει νέα έκδοση
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Μόνο same-origin requests περνάνε από εδώ.
  // Supabase, Google Maps, fonts κλπ. πάνε κατευθείαν στο δίκτυο.
  if (url.origin !== self.location.origin) return;

  // POST/PUT κλπ. δεν μπαίνουν ποτέ σε cache
  if (e.request.method !== 'GET') return;

  // ΔΙΟΡΘΩΣΗ v3.83: ΟΛΑ τα .html (app.html, login.html, index.html)
  // + navigations + sw.js -> ΠΑΝΤΑ network-first, ώστε κάθε νέα έκδοση
  // να φορτώνει αμέσως. Πριν, το app.html ήταν cache-first και το PWA
  // κολλούσε σε παλιές εκδόσεις.
  const isAppShell =
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('sw.js');

  if (isAppShell) {
    // HTML + sw.js -> ΠΑΝΤΑ φρέσκα (network-first, cache μόνο ως fallback offline)
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Όλα τα άλλα τοπικά αρχεία (εικόνες, icons κλπ.) -> cache-first (γρήγορα + offline)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return (
        cached ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
          return res;
        })
      );
    })
  );
});
