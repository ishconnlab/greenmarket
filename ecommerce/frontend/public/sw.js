const SHELL_CACHE = "green-market-pwa-v1";
const SHELL_URLS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error("Could not cache the Green Market app shell:", error);
        throw error;
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("green-market-pwa-") && key !== SHELL_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
            event.waitUntil(
              caches.open(SHELL_CACHE)
                .then((cache) => cache.put("/", response.clone()))
                .catch((error) => console.error("Could not update the cached app shell:", error))
            );
          }
          return response;
        })
        .catch(async () => (
          await caches.match("/")
          || await caches.match("/offline.html")
          || Response.error()
        ))
    );
    return;
  }

  const isShellAsset = url.pathname.startsWith("/assets/")
    || url.pathname.startsWith("/icons/")
    || ["/manifest.webmanifest", "/favicon.svg"].includes(url.pathname);
  if (!isShellAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          event.waitUntil(
            caches.open(SHELL_CACHE)
              .then((cache) => cache.put(request, response.clone()))
              .catch((error) => console.error("Could not cache a Green Market asset:", error))
          );
        }
        return response;
      });
    })
  );
});

self.addEventListener("push", (event) => {
  let notification = {};
  if (event.data) {
    try {
      notification = event.data.json();
    } catch {
      notification = { body: event.data.text() };
    }
  }

  event.waitUntil(
    self.registration.showNotification(notification.title || "Green Market order update", {
      body: notification.body || "There is an update to your order.",
      icon: "/icons/icon-192.png",
      badge: "/favicon.svg",
      data: { url: notification.url || "/orders" },
      tag: notification.tag || `green-market-order-${Date.now()}`,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || "/orders", self.location.origin);
  if (destination.origin !== self.location.origin) return;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((candidate) => new URL(candidate.url).origin === destination.origin);
      if (client) {
        return client.navigate(destination.href).then(() => client.focus());
      }
      return self.clients.openWindow(destination.href);
    })
  );
});
