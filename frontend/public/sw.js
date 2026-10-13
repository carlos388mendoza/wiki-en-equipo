/*
 * Service worker de la wiki: guarda una copia de las páginas que visitas para
 * poder abrirlas sin conexión. Las ediciones sin conexión se guardan aparte, en
 * IndexedDB (Yjs), y se suben al reconectar.
 */
// Lista de archivos de la compilación actual (la genera scripts/sw-assets.mjs al compilar).
importScripts("/sw-build.js");
const VERSION = `wiki-${self.WIKI_BUILD ?? "dev"}`;
const PAGES = `${VERSION}-paginas`;
const STATIC = `${VERSION}-estaticos`;
const OFFLINE_URL = "/sin-conexion";

async function precacheOffline() {
  const cache = await caches.open(PAGES);
  const res = await fetch(OFFLINE_URL, { credentials: "same-origin" });
  if (!res.ok || res.redirected) return;
  const html = await res.clone().text();
  await cache.put(OFFLINE_URL, res);
  // Guarda todos los archivos de la compilación (también los que se cargan después, como el editor).
  const assets = [...new Set([...(self.WIKI_ASSETS ?? []), ...(html.match(/\/_next\/static\/[^"'\s)]+\.(?:js|css)/g) ?? [])])];
  const statics = await caches.open(STATIC);
  await Promise.all(assets.map((url) => statics.add(url).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheOffline().catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  // Al cerrar sesión se borra la copia de páginas de este dispositivo.
  if (event.data === "limpiar") event.waitUntil(caches.delete(PAGES));
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    // No se guardan redirecciones (por ejemplo, al inicio de sesión) ni errores.
    if (res.ok && !res.redirected) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGES, OFFLINE_URL));
  } else if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc") || url.pathname.startsWith("/archivos/") || url.pathname.startsWith("/_next/image")) {
    event.respondWith(networkFirst(request, PAGES));
  }
});
