// Offline support: precache the site, then serve from cache while refreshing it.
const CACHE = "science-wonders-v11";
const PRECACHE = [
  "./",
  "index.html",
  "about.html",
  "tours/index.html",
  "teach/index.html",
  "manifest.webmanifest",
  "assets/style.css",
  "assets/wonders.js",
  "assets/i18n.js",
  "demos/path-integral/index.html",
  "demos/path-integral/path-integral.js",
  "assets/content/path-integral.js",
  "demos/ladder-paradox/index.html",
  "demos/ladder-paradox/ladder-paradox.js",
  "assets/content/ladder-paradox.js",
  "demos/mandelbrot/index.html",
  "demos/mandelbrot/mandelbrot.js",
  "assets/content/mandelbrot.js",
  "demos/fourier/index.html",
  "demos/fourier/fourier.js",
  "assets/content/fourier.js",
  "demos/prime-spirals/index.html",
  "demos/prime-spirals/prime-spirals.js",
  "assets/content/prime-spirals.js",
  "demos/blue-sky/index.html",
  "demos/blue-sky/blue-sky.js",
  "assets/content/blue-sky.js",
  "demos/rainbow/index.html",
  "demos/rainbow/rainbow.js",
  "assets/content/rainbow.js",
  "demos/doppler/index.html",
  "demos/doppler/doppler.js",
  "assets/content/doppler.js",
  "demos/resonance/index.html",
  "demos/resonance/resonance.js",
  "assets/content/resonance.js",
  "demos/tides/index.html",
  "demos/tides/tides.js",
  "assets/content/tides.js",
  "i18n/zh-CN/common.js",
  "i18n/es/common.js",
  "assets/lab.js",
  "assets/tours.js",
  "assets/icon.svg",
  "assets/catalog.js",
  "assets/content/quantum.js",
  "assets/content/cosmos.js",
  "assets/content/math.js",
  "assets/content/complexity.js",
  "demos/benford/index.html",
  "demos/benford/benford.js",
  "demos/birthday-paradox/index.html",
  "demos/birthday-paradox/birthday-paradox.js",
  "demos/chaos/index.html",
  "demos/chaos/chaos.js",
  "demos/curved-spacetime/index.html",
  "demos/curved-spacetime/curved-spacetime.js",
  "demos/decoherence/index.html",
  "demos/decoherence/decoherence.js",
  "demos/double-slit/index.html",
  "demos/double-slit/double-slit.js",
  "demos/emergence/index.html",
  "demos/emergence/emergence.js",
  "demos/entanglement/index.html",
  "demos/entanglement/entanglement.js",
  "demos/entropy/index.html",
  "demos/entropy/entropy.js",
  "demos/epidemics/index.html",
  "demos/epidemics/epidemics.js",
  "demos/evolution/index.html",
  "demos/evolution/evolution.js",
  "demos/expanding-universe/index.html",
  "demos/expanding-universe/expanding-universe.js",
  "demos/gravitational-waves/index.html",
  "demos/gravitational-waves/gravitational-waves.js",
  "demos/infinity/index.html",
  "demos/infinity/infinity.js",
  "demos/monty-hall/index.html",
  "demos/monty-hall/monty-hall.js",
  "demos/quantum-eraser/index.html",
  "demos/quantum-eraser/quantum-eraser.js",
  "demos/speed-of-light/index.html",
  "demos/speed-of-light/speed-of-light.js",
  "demos/stern-gerlach/index.html",
  "demos/stern-gerlach/stern-gerlach.js",
  "demos/time-dilation/index.html",
  "demos/time-dilation/time-dilation.js",
  "demos/tunneling/index.html",
  "demos/tunneling/tunneling.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === location.origin;
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !fonts) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(e.request, { ignoreSearch: sameOrigin });
    const fresh = fetch(e.request).then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(e.request, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
