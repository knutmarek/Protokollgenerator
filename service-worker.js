// ====== Cache-Version. Bei jeder Aktualisierung der App diese Zahl erhöhen! ======
const CACHE = 'protokolle-v8';

const ASSETS = [
  'index.html',
  'manifest.json',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png'
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

// index.html / Seitenaufrufe: zuerst aus dem Netz (immer neueste Version), offline aus dem Cache.
// Netz-Timeout 4 s, damit schlechter Empfang die App nicht blockiert.
function istSeite(req){
  return req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname);
}
function netzZuerst(req){
  return new Promise(function(resolve, reject){
    var fertig=false;
    var timer=setTimeout(function(){
      if(fertig) return;
      caches.match(req, {ignoreSearch:true}).then(function(hit){
        if(hit && !fertig){ fertig=true; resolve(hit); }
      });
    }, 4000);
    fetch(req.url, {cache:'no-store', credentials:'same-origin'}).then(function(resp){
      if(resp && resp.ok){
        var kopie=resp.clone();
        caches.open(CACHE).then(function(c){ c.put('index.html', kopie); });
      }
      if(!fertig){ fertig=true; clearTimeout(timer); resolve(resp); }
    }).catch(function(){
      caches.match(req, {ignoreSearch:true}).then(function(hit){
        return hit || caches.match('index.html');
      }).then(function(hit){
        if(!fertig){ fertig=true; clearTimeout(timer); hit ? resolve(hit) : reject(new Error('offline')); }
      });
    });
  });
}

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  if(new URL(e.request.url).origin !== self.location.origin) return;
  if(istSeite(e.request)){ e.respondWith(netzZuerst(e.request)); return; }
  // übrige Dateien (Icons, Manifest): zuerst aus dem Cache, sonst aus dem Netz
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
