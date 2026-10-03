// Small helpers shared by every demo.
window.Lab = (function () {
  // Size a canvas for crisp drawing on high-DPI screens. The canvas keeps a fixed
  // logical size (w x h) and scales with CSS width.
  function setupCanvas(canvas, w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  // Approximate visible colour for a wavelength in nanometres (380–700).
  function wavelengthToRGB(nm) {
    let r = 0, g = 0, b = 0;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
    else { r = 1; }
    // Fade at the edges of vision, but keep it visible on a dark bench.
    let f = 1;
    if (nm < 420) f = 0.45 + 0.55 * (nm - 380) / 40;
    else if (nm > 680) f = 0.45 + 0.55 * (700 - nm) / 20;
    const c = (v) => Math.round(255 * Math.pow(Math.max(0, v) * f, 0.8));
    return [c(r), c(g), c(b)];
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return { setupCanvas, wavelengthToRGB, reducedMotion };
})();

// Hooks a demo can call at any time; assets/wonders.js (loaded last) replaces
// these and replays anything called before it loaded.
//   WONDERS.challenge("id")          mark a challenge from assets/content/* done
//   WONDERS.describe("text", {now})  narrate a change to screen readers
//   WONDERS.describer(() => "text")  full description of the scene, on demand
//   WONDERS.sound("tick"|"event"|"success"|"fail", {pitch: 0..1, pan: -1..1})
(function () {
  const W = (window.WONDERS = window.WONDERS || {});
  const q = (W._queue = W._queue || []);
  for (const name of ["challenge", "describe", "describer", "sound"]) {
    if (!W[name]) W[name] = (...args) => { q.push([name, args]); };
  }
})();

