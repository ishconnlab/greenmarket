import api from "../api.js";

function decodeApplicationServerKey(value) {
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function supportsOrderNotifications() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getSavedPushSubscription() {
  if (!supportsOrderNotifications()) return null;
  const registration = await navigator.serviceWorker.register("/sw.js");
  return registration.pushManager.getSubscription();
}

export async function enableOrderNotifications() {
  if (!supportsOrderNotifications()) {
    throw new Error("This browser does not support order notifications.");
  }
  if (Notification.permission === "denied") {
    throw new Error("Notifications are blocked in browser settings. Allow them for this site, then try again.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Allow notifications to receive order updates on this device.");
  }

  const [{ data }, registration] = await Promise.all([
    api.get("/notifications/public-key"),
    navigator.serviceWorker.register("/sw.js"),
  ]);
  await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription()
    || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeApplicationServerKey(data.publicKey),
    });
  await api.post("/notifications/subscribe", subscription.toJSON());
  return subscription;
}

export async function disableOrderNotifications(subscription) {
  if (!subscription) return;
  await api.delete("/notifications/subscribe", {
    data: { endpoint: subscription.endpoint },
  });
  await subscription.unsubscribe();
}
