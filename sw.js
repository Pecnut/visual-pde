// The service worker has been retired. This stub replaces it so that browsers
// with the old worker installed pick up this version, clear its cache, and
// unregister it. Keep this file deployed so existing installs are cleaned up.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
    })(),
  );
});
