const CACHE = 'safezone-v6';
const ASSETS = ['/', '/app.html', '/admin.html', '/offline.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const clone = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone)).catch(()=>{});
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/offline.html')))
  );
});
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title:'Safe Zone', body:'Update အသစ်' };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', vibrate: [200,100,200]
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/app.html'));
});
