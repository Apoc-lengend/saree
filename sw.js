const CACHE_NAME = 'parinay-cache-v2';
const CORE_ASSETS = [
    './',
    './index.html',
    './sarees.html',
    './bedsheets.html',
    './collections.html',
    './search.html',
    './styles.css',
    './components.js',
    './data.json',
    './language.js',
    './translations.js',
    './manifest.json'
];

// Install Event: Cache Core Assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(CORE_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch Event: Stale-While-Revalidate for data.json, Cache-First for assets
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip API requests, admin dashboard, and background pollers entirely
    if (url.pathname.includes('admin.html') || url.hostname === 'api.github.com' || url.searchParams.has('poll')) {
        return;
    }

    // Stale-While-Revalidate for JSON data so updates propagate instantly when online
    if (url.pathname.endsWith('data.json')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // Default Cache-First Strategy for HTML, CSS, JS, Images
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            
            return fetch(event.request).then(response => {
                // Optionally aggressively cache images
                if (url.pathname.startsWith('/assets/')) {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clonedResponse);
                    });
                }
                return response;
            }).catch(() => {
                // Return fallback if totally offline and un-cached
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
