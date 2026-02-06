const CACHE_NAME = "lsd-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/JavaScript.js",
  "/img/Avatar.svg",
  "/img/menu-icon.svg"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())
    ))
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Network First for HTML/JS/CSS to ensure updates are seen
  if (url.pathname === "/" || url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache First for Images
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});