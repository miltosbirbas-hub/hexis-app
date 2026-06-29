// ============================================
//  HEXIS SERVICE WORKER
//  ΑΛΛΑΖΕΙΣ ΜΟΝΟ ΤΟΝ ΑΡΙΘΜΟ VERSION ΣΕ ΚΑΘΕ ΝΕΑ ΕΚΔΟΣΗ
//  (πρέπει να ταιριάζει με το v3.79 του index.html)
// ============================================
const VERSION = 'v3.79';
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

  const isAppShell =
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('sw.js');

  if (isAppShell) {
    // index.html + sw.js -> ΠΑΝΤΑ φρέσκα (network-first)
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Όλα τα άλλα τοπικά αρχεία -> cache-first (γρήγορα + offline)
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
