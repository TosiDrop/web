self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function safeDestination(value, fallback) {
  try {
    const url = new URL(typeof value === 'string' ? value : fallback, self.location.origin);
    return url.origin === self.location.origin && /^https?:$/.test(url.protocol)
      ? url.href : new URL(fallback, self.location.origin).href;
  } catch { return new URL(fallback, self.location.origin).href; }
}

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data?.json() ?? {}; } catch { /* Show a safe, useful reminder for malformed payloads. */ }
  if (!payload || typeof payload !== 'object') payload = {};
  const title = typeof payload.title === 'string' && payload.title.trim() ? payload.title.slice(0, 140) : 'Reward reminder';
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 500) : 'Open your reward calendar to review this date.';
  const tag = typeof payload.tag === 'string' ? payload.tag.slice(0, 160) : 'tosidrop-calendar';
  event.waitUntil(self.registration.showNotification(title, {
    body, tag, icon: '/favicon.svg', data: { url: safeDestination(payload.url, '/calendar') },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = safeDestination(event.notification.data?.url, '/claim');
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const window = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (window) {
      await window.navigate(url);
      await window.focus();
    } else {
      await self.clients.openWindow(url);
    }
  })());
});
