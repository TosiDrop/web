self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL('/claim', self.location.origin).href;
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
