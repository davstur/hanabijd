import firebase from "firebase/app";
import "firebase/database";

function database() {
  return firebase.database();
}

function getPlayerName(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("name");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return stored;
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js");
    return registration;
  } catch (err) {
    console.error("Service worker registration failed:", err);
    return null;
  }
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export async function isPushSubscribed(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await registerServiceWorker();
    if (!registration) return false;

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    // Get the VAPID public key from env
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn("VAPID public key not configured");
      return false;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });

    // Store the subscription in Firebase
    const playerName = getPlayerName();
    if (playerName && subscription) {
      await savePushSubscription(playerName, subscription);
    }

    return true;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return false;
  }
}

export async function savePushSubscription(playerName: string, subscription: PushSubscription) {
  const subscriptionData = subscription.toJSON();
  await database().ref(`/pushSubscriptions/${playerName}`).set({
    endpoint: subscriptionData.endpoint,
    keys: subscriptionData.keys,
    createdAt: Date.now(),
  });
}

export async function removePushSubscription(playerName: string) {
  await database().ref(`/pushSubscriptions/${playerName}`).remove();
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    const playerName = getPlayerName();
    if (playerName) {
      await removePushSubscription(playerName);
    }

    return true;
  } catch (err) {
    console.error("Push unsubscription failed:", err);
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
