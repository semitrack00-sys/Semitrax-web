const CACHE = 'semitrax-driver-shell-v2';
const ASSETS = ['./', './index.html', './style.css', './app.mjs', './api.mjs', './manifest.webmanifest'];
const urls = ASSETS.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urls))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('semitrax-driver-shell-') && key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  if (event.request.headers?.has('Authorization') || event.request.method !== 'GET' || !urls.includes(event.request.url)) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
