/**
 * Service Worker for LSD
 * Offline support, caching, push notifications
 */

const CACHE_NAME = "lsd-cache-v1";
const RUNTIME_CACHE = "lsd-runtime-v1";
const API_CACHE = "lsd-api-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/JavaScript.js",
  "/style.css",
  "/modules/utils.module.js",
  "/modules/storage.module.js",
  "/modules/api.module.js",
  "/modules/chat.module.js",
  "/modules/tasks.module.js",
  "/modules/error.module.js",
];

/**
 * Install event - кешируем статические файлы
 */
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Some assets failed to cache:", err);
      });
    })
  );

  self.skipWaiting();
});

/**
 * Activate event - удаляем старые кеши
 */
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  self.clients.claim();
});

/**
 * Fetch event - network first для API, cache first для статики
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API запросы - network first с fallback на кеш
  if (url.origin === "https://lsd-server-ml3z.onrender.com") {
    return event.respondWith(networkFirstStrategy(request));
  }

  // Статические файлы - cache first
  if (STATIC_ASSETS.some((asset) => url.pathname.endsWith(asset))) {
    return event.respondWith(cacheFirstStrategy(request));
  }

  // Остальное - network first
  event.respondWith(networkFirstStrategy(request));
});

/**
 * Network First Strategy
 * Пробует сеть, если не работает - кеш
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    // Кешируем успешные ответы
    if (response.ok && request.method === "GET") {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log("[SW] Network failed, using cache:", request.url);
    
    // Fallback на кеш
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Fallback для offline
    if (request.destination === "document") {
      return caches.match("/index.html") || 
        new Response("Offline - please check your connection", {
          status: 503,
          statusText: "Service Unavailable",
        });
    }

    throw error;
  }
}

/**
 * Cache First Strategy
 * Сначала кеш, потом сеть
 */
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log("[SW] Cache miss and network failed:", request.url);
    throw error;
  }
}

/**
 * Message handling (для общения с клиентом)
 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.delete(API_CACHE).then(() => {
      console.log("[SW] API cache cleared");
    });
  }
});

/**
 * Background Sync для отправки сообщений offline
 */
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "BACKGROUND_SYNC",
            tag: "sync-messages",
          });
        });
      })
    );
  }
});

/**
 * Push notifications (если понадобятся)
 */
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    badge: "/img/icon-192.png",
    icon: "/img/icon-192.png",
    title: data.title || "LSD",
    body: data.body || "Новое сообщение",
    tag: "lsd-notification",
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(options.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Если окно открыто - сфокируемся на нем
      for (let client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      // Иначе откроем новое
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});
