// Service worker: shows /offline.html when a page can't be loaded without a connection.
// It deliberately caches nothing else, so visitors never see outdated departures.
// Bump the version when offline.html changes, so browsers fetch the new copy.
const CACHE = "dresden-departures-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only page navigations; API calls and assets go straight to the network as usual.
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
