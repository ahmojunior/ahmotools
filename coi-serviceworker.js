/*! coi-serviceworker v0.1.7 - Guido Zuidhof / niceness, licensed under MIT */
// This service worker intercepts all responses and adds Cross-Origin-Isolation
// headers, enabling SharedArrayBuffer without special server configuration.
// Works on GitHub Pages, any static host, or a plain python/node HTTP server.

if (typeof window === 'undefined') {
  // ── Service Worker scope ──
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

  self.addEventListener('fetch', (e) => {
    // Only intercept navigations and same-origin requests
    if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') return;

    e.respondWith(
      fetch(e.request).then((response) => {
        // Can't modify opaque responses (cross-origin no-cors)
        if (response.status === 0) return response;

        const headers = new Headers(response.headers);
        headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
        headers.set('Cross-Origin-Opener-Policy', 'same-origin');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      })
    );
  });
} else {
  // ── Window scope (register the service worker) ──
  (() => {
    // Service workers need HTTP — bail on file:// gracefully
    if (window.location.protocol === 'file:') return;

    // If already cross-origin isolated, nothing to do
    if (window.crossOriginIsolated) return;

    const register = async () => {
      const registration = await navigator.serviceWorker.register(
        window.document.currentScript.src
      );

      // If the SW is installing/waiting, reload once it activates
      if (registration.installing || registration.waiting) {
        const worker = registration.installing || registration.waiting;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') {
            window.location.reload();
          }
        });
      } else if (registration.active && !navigator.serviceWorker.controller) {
        // SW is active but not controlling this page — reload to get controlled
        window.location.reload();
      }
    };

    if (navigator.serviceWorker) {
      register().catch(console.error);
    }
  })();
}
