import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

let configuredKeys = "";

function getPushConfig() {
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = process.env;
  if (!publicKey || !privateKey || !subject) return null;

  const currentKeys = `${subject}:${publicKey}:${privateKey}`;
  if (configuredKeys !== currentKeys) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configuredKeys = currentKeys;
  }
  return { publicKey };
}

export function getPushPublicKey() {
  return getPushConfig()?.publicKey || null;
}

export function initializePushNotifications() {
  if (getPushConfig()) return;
  console.warn("Web Push is disabled. Configure VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.");
}

export async function notifyUser(userId, notification) {
  if (!getPushConfig()) return;

  const subscriptions = await PushSubscription.find({ user: userId }).lean();
  const payload = JSON.stringify(notification);

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
          payload
        );
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: subscription._id });
          return;
        }
        console.error("Could not deliver push notification:", error);
      }
    })
  );
}
