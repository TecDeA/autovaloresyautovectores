/* ==================================================================
   Service Worker — Autovalores, autovectores y subespacios propios
   ------------------------------------------------------------------
   IMPORTANTE: este archivo DEBE permanecer dentro de la carpeta de la
   app (https://tecdea.github.io/autovaloresyautovectores/sw.js).

   Al estar alojado en esa subcarpeta, su alcance (scope) queda
   limitado automáticamente a /autovaloresyautovectores/, de modo que
   NO puede controlar ni interceptar ninguna página del portal raíz
   https://tecdea.github.io. Además, el gestor de peticiones ignora
   expresamente cualquier URL fuera de ese prefijo (doble seguridad).

   Para publicar una nueva versión, sube CACHE_VERSION (p. ej. v1.0.1):
   eso invalida la caché antigua de todos los visitantes.
   ================================================================== */
const CACHE_VERSION = 'autovalores-v1.0.0';

/* Recursos pre-cacheados en la instalación (rutas relativas al scope). */
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/icon-maskable-192.png',
  './img/icon-maskable-512.png',
  './img/apple-touch-icon.png',
  './img/favicon.ico',
  './img/favicon-32.png',
  './img/favicon-16.png',
  './img/og-image.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  /* Solo peticiones GET del propio origen y dentro del alcance del
     service worker; todo lo demás (portal raíz, otros dominios,
     otros métodos) se ignora por completo. */
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(self.registration.scope)) return;

  /* Navegaciones: red primero; caché como respaldo (modo offline). */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true })
            .then((hit) => hit || caches.match('./index.html'))
        )
    );
    return;
  }

  /* Recursos estáticos: caché primero, refresco en segundo plano. */
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        fetch(req)
          .then((res) => {
            if (res && res.ok && res.type === 'basic') {
              caches.open(CACHE_VERSION).then((c) => c.put(req, res));
            }
          })
          .catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copia = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copia));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
