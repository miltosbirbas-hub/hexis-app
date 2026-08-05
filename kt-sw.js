// kt-sw.js — Service Worker για ktimatologio.html
// Αλλαγή VERSION = force update σε όλους τους browsers
const VERSION = 'kt-v2.1';
const CACHE = 'kt-cache-'+VERSION;
const PRECACHE = ['/ktimatologio.html'];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('message', e=>{
  if(e.data&&e.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e=>{
  // Network first για το HTML (πάντα φρέσκο), cache first για assets
  if(e.request.url.includes('ktimatologio.html')){
    e.respondWith(
      fetch(e.request).then(r=>{
        const clone=r.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
        return r;
      }).catch(()=>caches.match(e.request))
    );
  }
});
