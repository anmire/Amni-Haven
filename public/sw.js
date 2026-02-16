const CACHE_NAME = 'haven-v1';
const PRECACHE = ['/', '/app', '/app.html', '/css/style.css', '/js/app.js', '/favicon.svg', '/icon-192.svg', '/icon-512.svg'];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: 'Haven', body: event.data.text() }; }
  const title = payload.title || 'Haven';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: payload.tag || 'haven-message',
    renotify: true,
    data: { channelCode: payload.channelCode || null, url: payload.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/app';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('/app')) {
          client.focus();
          if (event.notification.data?.channelCode) {
            client.postMessage({ type: 'push-notification-click', channelCode: event.notification.data.channelCode });
          }
          return;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    )).then(() => clients.claim())
  );
});
