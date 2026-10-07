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
      icon: "/favicon.svg",
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
