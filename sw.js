const STATIC_CACHE='opeitica-shell-v1';
const STATIC_ASSETS=['./','./index.html','./styles.css','./app.js','./config.js','./data.js','./manifest.webmanifest','./icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==STATIC_CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);

  // Dados externos (Google Sheets etc.) nunca ficam presos no cache da PWA.
  if(url.hostname.includes('google.com')||url.hostname.includes('googleusercontent.com')||url.searchParams.has('_t')){
    event.respondWith(fetch(req,{cache:'no-store'}));
    return;
  }

  // Navegação: rede primeiro para receber versão nova do app; cache só como fallback offline.
  if(req.mode==='navigate'){
    event.respondWith(fetch(req,{cache:'no-cache'}).then(res=>{
      const copy=res.clone(); caches.open(STATIC_CACHE).then(c=>c.put('./index.html',copy)); return res;
    }).catch(()=>caches.match('./index.html')));
    return;
  }

  // Arquivos da interface: cache rápido, atualização em segundo plano.
  event.respondWith(caches.match(req).then(cached=>{
    const fresh=fetch(req).then(res=>{if(res.ok)caches.open(STATIC_CACHE).then(c=>c.put(req,res.clone()));return res;}).catch(()=>cached);
    return cached||fresh;
  }));
});
