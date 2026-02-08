// Hanab Push Notification Service Worker

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Hanab", body: event.data.text() };
  }

  const targetUrl = data.url || "/";

  // Suppress notification if the user already has the target page open and focused
  const showIfNeeded = clients
    .matchAll({ type: "window", includeUncontrolled: false })
    .then((windowClients) => {
      const isViewingPage = windowClients.some(
        (client) => client.focused && new URL(client.url).pathname === targetUrl
      );
      if (isViewingPage) return;

      const title = data.title || "Hanab";
      const options = {
        body: data.body || "",
        icon: "/static/hanab-192.png",
        badge: "/static/hanab-192.png",
        data: {
          url: targetUrl,
        },
        tag: data.tag || "hanab-notification",
        renotify: true,
      };

      return self.registration.showNotification(title, options);
    });

  event.waitUntil(showIfNeeded);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
