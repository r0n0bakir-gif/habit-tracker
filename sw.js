/**
 * Habit Tracker — Service Worker
 *
 * Responsibilities (Phase 2):
 *   1. Handle the "Snooze 1 hour" action on habit-reminder notifications.
 *      The action button only works when the notification was shown via
 *      registration.showNotification() (this file), not new Notification().
 *
 *   2. Cache-first serving of static assets (Phase 3 will expand this with
 *      full Workbox strategies and offline shell caching).
 *
 * PLACEMENT: This file must be served from the root of your origin so it can
 * control all pages. In a Vite project place it in /public/sw.js. When running
 * with `npx serve .` from the habit-tracker directory it is served correctly.
 */

const CACHE_NAME = "habit-tracker-v1";

// ── Install: pre-cache the app shell for instant offline loads ──
self.addEventListener("install", (event) => {
  // WHY: skipWaiting lets the new SW take over immediately without waiting for
  // all tabs to close — important for a single-page app that rarely reloads.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Pre-cache the app shell. Extend this list in Phase 3 with all
      // build-output asset filenames for full offline support.
      cache.addAll(["/", "/index.html"]).catch(() => {
        // Silently ignore — these paths may not exist in all dev setups.
      })
    )
  );
});

// ── Activate: claim clients so the SW controls the page immediately ──
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Message handler: main thread asks SW to show a scheduled notification ──
// WHY: Notifications triggered via registration.showNotification() (here) can
// have action buttons (e.g. "Snooze 1 hour"). Direct new Notification() from
// the main thread cannot. The main thread posts a SHOW_NOTIFICATION message
// when the scheduled time arrives.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, body } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || "🔥 Habit check-in!", {
        body: body || "Don't forget to log your habits today.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        actions: [{ action: "snooze", title: "Snooze 1 hour" }],
        tag: "habit-reminder",  // replaces any previous reminder notification
        renotify: false,
      })
    );
  }
});

// ── Notification click handler ──
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "snooze") {
    // WHY: Post a message back to all open app tabs so the React state can
    // update snoozedUntil without requiring a push server or background sync.
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: "SNOOZE_NOTIFICATION" })
        );
      })
    );
    return;
  }

  // Default click (no action): focus or open the app
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) return existing.focus();
        return self.clients.openWindow("/");
      })
  );
});

// ── Fetch handler: cache-first for static assets, network-first for HTML ──
// WHY: Static assets (JS, CSS, fonts) never change their URL once built, so
// serving them from cache is safe and fast. HTML (the app shell) uses
// network-first with a cache fallback so users always get the latest shell
// when online, and can still use the app offline.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  const isHTML = request.headers.get("accept")?.includes("text/html");

  if (isHTML) {
    // Network-first with 3 s timeout, fallback to cache
    event.respondWith(
      Promise.race([
        fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
      ]).catch(() => caches.match(request))
    );
  } else {
    // Cache-first for all other assets
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
  }
});
