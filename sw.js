const CACHE_VERSION = "__BUILD_VERSION__79"; // Replace during deploy (e.g. with timestamp or git hash)
const CACHE_NAME = `static-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
    "./AudioPlayer.html",
    "./AudioPlayer.css",
    "./AudioLogin.css",
    "./AudioPlayer.js",
    "./testlogin.js",
    "./testAudioPlayer.js",
    "./AudioList.js",
    "./AudioLogin.js",
    "./SystemImages/192px-Logo.png",
    "./SystemImages/512px-Logo.png",
    "./Assets/css/all.css",
    "./Assets/fonts/MaterialIcons-Regular.ttf",
    "./Assets/webfonts/fa-brands-400.ttf",
    "./Assets/webfonts/fa-brands-400.woff2",
    "./Assets/webfonts/fa-regular-400.ttf",
    "./Assets/webfonts/fa-regular-400.woff2",
    "./Assets/webfonts/fa-solid-900.ttf",
    "./Assets/webfonts/fa-solid-900.woff2",
    "./Assets/webfonts/fa-v4compatibility.ttf",
    "./Assets/webfonts/fa-v4compatibility.woff2"
];

const OFFLINE_FALLBACK_PAGE = "./AudioPlayer.html"; // Optional: fallback page for offline navigation

// INSTALL: Pre-cache assets
self.addEventListener("install", event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// ACTIVATE: Clean up old caches
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// FETCH: Serve from cache, fallback to network, then fallback page if offline
self.addEventListener("fetch", event => {
    const isNavigational = event.request.mode === "navigate";

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return (
                cachedResponse ||
                fetch(event.request).catch(() => {
                    if (isNavigational) {
                        return caches.match(OFFLINE_FALLBACK_PAGE);
                    }
                })
            );
        })
    );
});
