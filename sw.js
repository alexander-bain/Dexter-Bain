self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "DexterBain Minigames",
      body: event.data ? event.data.text() : "Your minigame has an update.",
    };
  }

  const title = payload.title || "DexterBain Minigames";
  const options = {
    body: payload.body || "Your minigame has an update.",
    tag: payload.tag || "dexterbain-minigames",
    data: payload.data || {},
  };

  if (payload.icon) {
    options.icon = payload.icon;
  }
  if (payload.badge) {
    options.badge = payload.badge;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const gameId = event.notification.data?.gameId || "";
  const roomCode = event.notification.data?.roomCode || "";
  const url = new URL("/minigames/", self.location.origin);

  if (gameId) {
    url.searchParams.set("game", gameId);
  }
  if (roomCode) {
    url.searchParams.set("room", roomCode);
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => client.url.startsWith(url.origin + "/minigames/"));
      if (matchingClient) {
        matchingClient.focus();
        return matchingClient.navigate(url.href);
      }
      return self.clients.openWindow(url.href);
    })
  );
});
