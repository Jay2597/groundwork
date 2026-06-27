// Groundwork service worker — makes the installed app fully offline-capable.
// Strategy: app shell + stale-while-revalidate runtime cache for same-origin
// assets. Nothing is uploaded; this only caches our own files on the device.

const CACHE = "groundwork-v1";
// Relative to the SW scope so it works at the domain root or a sub-path.
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: serve the cached app shell so deep refreshes work offline.
  if (request.mode === "navigate") {
    const shell = new URL("./index.html", self.registration.scope).href;
    event.respondWith(fetch(request).catch(() => caches.match(shell).then((r) => r || caches.match("./"))));
    return;
  }

  // Same-origin assets: stale-while-revalidate.
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    ),
  );
});
