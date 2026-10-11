const cachePrefix = "one-object-static-"
const cacheName = `${cachePrefix}${new URL(self.location.href).searchParams.get("build") || "1"}`
const offlineUrl = new URL("offline.html", self.location.href).href

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) =>
        cache.addAll([
          offlineUrl,
          new URL("logo.svg", self.location.href).href,
        ]),
      ),
  )
})
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith(cachePrefix) && key !== cacheName)
          await caches.delete(key)
      }
      await self.clients.claim()
    })(),
  )
})
self.addEventListener("fetch", (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname === "/callback"
  )
    return
  if (request.mode === "navigate") {
    // Never store signed-in pages or business responses.
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.open(cacheName)).match(offlineUrl),
      ),
    )
  }
})
