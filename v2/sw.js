/* Offline support: keeps a copy of the app, Bruv and the fonts so it opens without signal.
   The page itself is fetched fresh when there's a connection (so updates arrive), everything else is served from the copy
   and refreshed in the background. Your progress and songs are stored separately and never touched by this. */
const CACHE="guitar-os-v1";
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);if(r.method!=="GET")return;
  const mine=u.origin===location.origin&&u.pathname.includes("/guitar-gym/")||u.hostname==="localhost",font=/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);if(!mine&&!font)return;
  if(r.mode==="navigate"){e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c));return res}).catch(()=>caches.match(r).then(m=>m||caches.match("./"))));return}
  e.respondWith(caches.match(r).then(hit=>{const net=fetch(r).then(res=>{if(res.ok||res.type==="opaque"){const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c))}return res}).catch(()=>hit);return hit||net}))});
