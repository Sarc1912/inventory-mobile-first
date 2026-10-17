/* Solo el shell público y recursos estáticos. Los datos privados viven en IndexedDB. */
const CACHE = 'inventory-shell-v4';
const SHELL = '/offline';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const path of [SHELL, '/login', '/demo', '/manifest.webmanifest', '/icon.svg']) {
      const response = await fetch(new Request(path, { cache: 'reload', credentials: 'omit' }));
      if (!response.ok) throw new Error('No se pudo preparar la aplicación offline.');
      await cache.put(path, response.clone());
      if (path === SHELL || path === '/login' || path === '/demo') {
        const html = await response.text();
        const assets = new Set([...html.matchAll(/(?:src|href)="([^"]+)"/g)]
          .map(match => match[1].replaceAll('&amp;', '&'))
          .filter(url => url.startsWith('/_next/static/')));
        await Promise.all([...assets].map(async url => {
          const asset = await fetch(new Request(url, { cache: 'reload' }));
          if (!asset.ok) throw new Error('Recurso offline no disponible.');
          await cache.put(url, asset.clone());
          if (url.endsWith('.css')) {
            const css = await asset.text();
            const fonts = [...css.matchAll(/url\(["']?([^\)"']+)["']?\)/g)].map(m => new URL(m[1], new URL(url, self.location.origin)));
            await Promise.all(fonts.filter(font => font.origin === self.location.origin).map(font => cache.add(font.href)));
          }
        }));
      }
    }
    // La nueva versión espera al cierre de las pestañas anteriores.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('inventory-shell-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate' && ['/', '/inventario', '/offline', '/login', '/demo'].includes(url.pathname)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { signal: AbortSignal.timeout(5000) });
        if (response.status >= 500) throw new Error('Servidor no disponible');
        return response;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match(['/login', '/demo'].includes(url.pathname) ? url.pathname : SHELL)) || Response.error();
      }
    })());
  } else if (url.pathname.startsWith('/_next/static/') || url.pathname === '/icon.svg') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
