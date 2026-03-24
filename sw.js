// Catcher's Log — Service Worker
// Handles offline caching so the app works without internet

const CACHE_NAME = "catchers-log-v1";

// Files to cache for offline use
const STATIC_ASSETS = [
  "/catchers-log/",
  "/catchers-log/index.html",
  "/catchers-log/manifest.json",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"
];

// Install — cache all static assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn("Some assets failed to cache:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener("fetch", event => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip YouTube / external video requests — always need network
  const url = new URL(event.request.url);
  if (
    url.hostname.includes("youtube.com") ||
    url.hostname.includes("ytimg.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("sheets.googleapis.com")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          // Cache successful responses
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // If completely offline and not cached, return offline page
          if (event.request.destination === "document") {
            return caches.match("/catchers-log/index.html");
          }
        });
    })
  );
});
