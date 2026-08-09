// ============================================
//  HEXIS SERVICE WORKER
//  ΑΛΛΑΖΕΙΣ ΜΟΝΟ ΤΟΝ ΑΡΙΘΜΟ VERSION ΣΕ ΚΑΘΕ ΝΕΑ ΕΚΔΟΣΗ
//  (πρέπει να ταιριάζει με την έκδοση του app.html)
// ============================================
const VERSION = 'v4.37';
const CACHE_NAME = 'hexis-' + VERSION;

// Αρχεία που προ-κατεβαίνουν στο install (παίζουν και offline)
importScripts('hexis-catalog.js'); // κοινός κατάλογος εργαλείων

// Στατικά αρχεία + ΟΛΑ τα .html των εργαλείων από τον κατάλογο (αυτόματα)
const PRECACHE_STATIC = [
  'hub.html', 'tool.html', 'admin.html', 'manual.html', 'login.html',
  'hexis-catalog.js',
  'admin-manifest.json', 'admin-icon-192.png',
  'intro.mp4',
  'nomothesia-manifest.json', 'nomothesia-icon-192.png',
  'nomothesia-icon-512.png', 'nomothesia-icon-maskable.png',
  'hexis_check_my_dxf.lsp',
  // --- ΣΤΕΓΗ (v4.37) ---
  // το stegh.html ΔΕΝ μπαίνει εδώ: έρχεται αυτόματα από τον κατάλογο
  'stegh-manifest.json',
  'stegh-icon-192.png', 'stegh-icon-512.png', 'stegh-icon-maskable.png',
  'jspdf.umd.min.js', 'STEGH.lsp'
];

const PRECACHE = [...new Set([...PRECACHE_STATIC, ...(self.HEXIS_PRECACHE_HTML || [])])];

// Άμεση ενεργοποίηση νέας έκδοσης
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      // ΠΡΟΣΟΧΗ: το addAll είναι all-or-nothing. Ένα λάθος όνομα αρχείου
      // ακυρώνει ΟΛΟ το precache. Γι' αυτό κατεβάζουμε ένα-ένα και
      // αναφέρουμε όσα απέτυχαν, αντί να τα καταπίνουμε σιωπηλά.
      .then((c) =>
        Promise.all(
          PRECACHE.map((u) =>
            c.add(u).catch(() => {
              console.warn('[HEXIS SW] δεν βρέθηκε στο precache:', u);
            })
          )
        )
      )
      .catch(() => {}) // αν αποτύχει τελείως (offline install), δεν μπλοκάρει
  );
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
