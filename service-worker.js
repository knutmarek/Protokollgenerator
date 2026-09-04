// ====== Cache-Version. Bei jeder Aktualisierung der App diese Zahl erhöhen! ======
const CACHE = 'protokolle-v4';

const ASSETS = [
  'index.html',
  'manifest.json',
  'icon180.png',
  'icon192.png',
  'icon512.png'
];

// Beim Installieren: alle Dateien in den Offline-Speicher legen
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){ return cache.addAll(ASSETS); })
  );
  self.skipWaiting();
});

// Beim Aktivieren: alte Caches aufräumen
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; })
                            .map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Anfragen zuerst aus dem Cache bedienen (offline-fähig), sonst aus dem Netz
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(hit){
      return hit || fetch(e.request).then(function(resp){
        return caches.open(CACHE).then(function(cache){
          try { cache.put(e.request, resp.clone()); } catch(_){}
          return resp;
        });
      }).catch(function(){ return caches.match('index.html'); });
    })
  );
});
