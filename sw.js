const CACHE="sdggold-ui-v4";
const ASSETS=[
  "./","./index.html","./styles.css","./architect.css","./settings.css",
  "./app.js","./course-package.js","./architect-store.js","./course-cloud.js","./course-studio.js",
  "./settings-reference.js","./settings-ui.js","./settings-panel.html","./architect-panel.html",
  "./CHATGPT_COURSE_TEMPLATE.md","./EXAMPLE_COMPLETE_COURSE.json",
  "./EXAMPLE_BATCH_B001.jsonl","./EXAMPLE_BATCH_B002.jsonl","./EXAMPLE_BATCH_B003.jsonl",
  "./COURSE_PACKAGE_SCHEMA.json","./icon.svg","./manifest.webmanifest"
];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key.startsWith("sdggold-")&&key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;
  event.respondWith(fetch(req)
    .then(response=>{
      if(response.ok){
        const clone=response.clone();
        caches.open(CACHE).then(cache=>cache.put(req,clone)).catch(()=>{});
      }
      return response;
    })
    .catch(()=>caches.match(req)));
});
