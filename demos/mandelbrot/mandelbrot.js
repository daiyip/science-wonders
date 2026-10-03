(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $("bench");
  const jcanvas = $("julia");
  const T = (s) => (window.I18N ? window.I18N.t(s) : s);

  // ---------- Worker: escape-time iteration, off the main thread ----------
  // Each job is split into horizontal strips. A coarse pass (every 4th pixel)
  // comes first so a usable picture appears at once, then every pixel. The
  // worker yields between strips, so a newer job replaces an older one at once.
  function workerMain() {
    let cur = null, scheduled = false;
    const ch = new MessageChannel();
    ch.port1.onmessage = tick;
    const schedule = () => { if (!scheduled) { scheduled = true; ch.port2.postMessage(0); } };
    self.onmessage = (e) => {
      cur = e.data;
      cur.s = cur.k; cur.pass = 0;
      schedule();
    };
    const LN2 = Math.log(2);
    // Smooth escape count; -1 means "did not escape" (inside, as far as we can tell).
    function iter(zx, zy, cr, ci, max, tol, mandel) {
      if (mandel) {
        const xq = cr - 0.25, q = xq * xq + ci * ci;
        if (q * (q + xq) <= 0.25 * ci * ci) return -1;          // main cardioid
        if ((cr + 1) * (cr + 1) + ci * ci <= 0.0625) return -1;   // period-2 disc
      }
      let x = zx, y = zy, x2 = x * x, y2 = y * y, px = x, py = y, k = 0, check = 8;
      for (let n = 0; n < max; n++) {
        y = 2 * x * y + ci;
        x = x2 - y2 + cr;
        x2 = x * x; y2 = y * y;
        if (x2 + y2 > 1e6) {
          const nu = n + 1 - Math.log(0.5 * Math.log(x2 + y2)) / LN2;
          return nu < 0 ? 0 : nu;
        }
        // Periodicity check: an orbit that returns exactly to a saved value is trapped.
        if (Math.abs(x - px) < tol && Math.abs(y - py) < tol) return -1;
        if (++k === check) { k = 0; check *= 2; px = x; py = y; }
      }
      return -1;
    }
    function tick() {
      scheduled = false;
      const j = cur;
      if (!j) return;
      const nStrips = Math.ceil(j.h / j.strip);
      if (j.s >= nStrips) {
        if (j.pass === 0) { j.pass = 1; j.s = j.k; }
        else { cur = null; return; }
        if (j.s >= nStrips) { cur = null; return; }
      }
      const step = j.pass === 0 ? j.coarse : 1;
      const row0 = j.s * j.strip, rows = Math.min(j.strip, j.h - row0);
      const cols = Math.ceil(j.w / step), srows = Math.ceil(rows / step);
      const out = new Float32Array(cols * srows);
      const mandel = j.kind === "m";
      const tol = Math.min(1e-10, j.dx * 1e-4);
      let i = 0;
      for (let r = 0; r < srows; r++) {
        const py = row0 + r * step + step / 2;
        const im = j.cy - (py - j.h / 2) * j.dx;
        for (let c = 0; c < cols; c++) {
          const re = j.cx + (c * step + step / 2 - j.w / 2) * j.dx;
          out[i++] = mandel ? iter(0, 0, re, im, j.max, tol, true) : iter(re, im, j.cr, j.ci, j.max, tol, false);
        }
      }
      self.postMessage({ id: j.id, pass: j.pass, s: j.s, row0, rows, data: out }, [out.buffer]);
      j.s += j.n;
      schedule();
    }
  }

  let workerURL = null;
  function makeWorker() {
    if (!workerURL) workerURL = URL.createObjectURL(new Blob(["(" + workerMain.toString() + ")()"], { type: "text/javascript" }));
    return new Worker(workerURL);
  }
  const NW = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));

  // ---------- Colour ----------
  // One cyclic gradient in the site's bench palette: navy, blue, cyan, cream, amber, rust.
  const STOPS = [[0, 7, 12, 26], [0.16, 24, 52, 128], [0.32, 58, 128, 222], [0.46, 140, 218, 255],
    [0.56, 246, 243, 232], [0.68, 240, 179, 90], [0.83, 160, 66, 40], [1, 7, 12, 26]];
  const LUT_N = 1024;
  const LUT = new Uint32Array(LUT_N);
  (function buildLut() {
    const le = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    for (let i = 0; i < LUT_N; i++) {
      const t = i / LUT_N;
      let k = 0;
      while (k < STOPS.length - 2 && t > STOPS[k + 1][0]) k++;
      const a = STOPS[k], b = STOPS[k + 1];
      let f = (t - a[0]) / (b[0] - a[0]);
      f = f * f * (3 - 2 * f);
      const r = Math.round(a[1] + (b[1] - a[1]) * f), g = Math.round(a[2] + (b[2] - a[2]) * f), bl = Math.round(a[3] + (b[3] - a[3]) * f);
      LUT[i] = le ? (255 << 24) | (bl << 16) | (g << 8) | r : (r << 24) | (g << 16) | (bl << 8) | 255;
    }
  })();
  const INSIDE = (function () {
    const le = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    return le ? (255 << 24) | (6 << 16) | (3 << 8) | 2 : (2 << 24) | (3 << 16) | (6 << 8) | 255;
  })();
  const DENS = 0.085;
  function colourOf(mu, muMin) {
    if (mu < 0) return INSIDE;
    const t = Math.sqrt(Math.max(0, mu - muMin)) * DENS;
    return LUT[Math.floor(t * LUT_N) % LUT_N];
  }

  // ---------- A progressive renderer (one per picture) ----------
  function Renderer(workers, kind) {
    this.workers = workers;
    this.kind = kind;
    this.job = null;
    this.front = document.createElement("canvas");
    this.fctx = this.front.getContext("2d");
    this.view = null;   // view of what's in `front`
    this.lastDone = null;
    for (const w of workers) w.addEventListener("message", (e) => this.onMsg(e.data));
  }
  let jobSeq = 0;
  Renderer.prototype.start = function (p) {
    const id = ++jobSeq;
    const STRIP = 16, COARSE = 4;
    const nStrips = Math.ceil(p.h / STRIP);
    const cw = Math.ceil(p.w / COARSE), chh = Math.ceil(p.h / COARSE);
    this.job = Object.assign({}, p, {
      id, STRIP, COARSE, nStrips, cw, ch: chh,
      coarse: new Float32Array(cw * chh), mu: new Float32Array(p.w * p.h),
      coarseLeft: nStrips, fineLeft: nStrips, fine: new Uint8Array(nStrips),
      shown: false, muMin: Infinity, t0: performance.now(), inside: 0, outside: 0,
    });
    const n = this.workers.length;
    this.workers.forEach((w, k) => w.postMessage({
      id, kind: this.kind, w: p.w, h: p.h, cx: p.cx, cy: p.cy, dx: 1 / p.ppu, max: p.max,
      cr: p.cr || 0, ci: p.ci || 0, k, n, strip: STRIP, coarse: COARSE,
    }));
  };
  Renderer.prototype.progress = function () {
    const j = this.job;
    if (!j) return 1;
    return (j.nStrips - j.coarseLeft) / j.nStrips * 0.12 + (j.nStrips - j.fineLeft) / j.nStrips * 0.88;
  };
  Renderer.prototype.busy = function () { return !!(this.job && this.job.fineLeft > 0); };
  Renderer.prototype.onMsg = function (m) {
    const j = this.job;
    if (!j || m.id !== j.id) return;
    if (m.pass === 0) {
      const r0 = m.row0 / j.COARSE, n = m.data.length;
      j.coarse.set(m.data, r0 * j.cw);
      for (let i = 0; i < n; i++) { const v = m.data[i]; if (v >= 0 && v < j.muMin) j.muMin = v; }
      if (--j.coarseLeft === 0) this.showCoarse();
    } else {
      j.mu.set(m.data, m.row0 * j.w);
      j.fine[m.s] = 1;
      if (j.shown) this.paintRows(m.row0, m.rows);
      if (--j.fineLeft === 0) this.finish();
    }
    dirty = true;
  };
  Renderer.prototype.showCoarse = function () {
    const j = this.job;
    if (!isFinite(j.muMin)) j.muMin = 0;
    if (this.front.width !== j.w || this.front.height !== j.h) { this.front.width = j.w; this.front.height = j.h; }
    const small = document.createElement("canvas");
    small.width = j.cw; small.height = j.ch;
    const sctx = small.getContext("2d");
    const img = sctx.createImageData(j.cw, j.ch);
    const px = new Uint32Array(img.data.buffer);
    for (let i = 0; i < j.coarse.length; i++) px[i] = colourOf(j.coarse[i], j.muMin);
    sctx.putImageData(img, 0, 0);
    this.fctx.imageSmoothingEnabled = true;
    this.fctx.clearRect(0, 0, j.w, j.h);
    this.fctx.drawImage(small, 0, 0, j.cw * j.COARSE, j.ch * j.COARSE);
    this.view = { cx: j.cx, cy: j.cy, ppu: j.ppu, w: j.w, h: j.h };
    j.shown = true;
    for (let s = 0; s < j.nStrips; s++) if (j.fine[s]) this.paintRows(s * j.STRIP, Math.min(j.STRIP, j.h - s * j.STRIP));
  };
  Renderer.prototype.paintRows = function (row0, rows) {
    const j = this.job;
    const img = this.fctx.createImageData(j.w, rows);
    const px = new Uint32Array(img.data.buffer);
    const base = row0 * j.w, n = j.w * rows;
    for (let i = 0; i < n; i++) {
      const v = j.mu[base + i];
      if (v < 0) j.inside++; else j.outside++;
      px[i] = colourOf(v, j.muMin);
    }
    this.fctx.putImageData(img, 0, row0);
  };
  Renderer.prototype.finish = function () {
    const j = this.job;
    j.ms = performance.now() - j.t0;
    this.lastDone = j;
    if (this.onDone) this.onDone(j);
  };

  // ---------- State ----------
  const ITERS = [50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 20000];
  const HOME = { cx: -0.6, cy: 0, zoom: 1 };
  const MAX_ZOOM = 1e15, MIN_ZOOM = 0.25;
  const S = {
    cx: HOME.cx, cy: HOME.cy, zoom: HOME.zoom, itersIdx: 4,
    c: { x: -0.465, y: 0.509 }, clickMode: "pick", follow: false, labels: false, showOrbit: true,
    orbit: null,
  };
  const maxIter = () => ITERS[S.itersIdx];

  // Bulb centres (hyperbolic components) and the period of their cycle.
  const BULBS = [[-0.2, 0, 1], [-1, 0, 2], [-0.1226, 0.7449, 3], [0.2823, 0.5301, 4], [0.3795, 0.3349, 5], [-0.5043, 0.5628, 5],
    [0.389, 0.2159, 6], [0.376, 0.1447, 7], [-1.3107, 0, 4], [-1.3815, 0, 8], [-1.7549, 0, 3]];

  // ---------- Layout ----------
  let dpr = 1, W = 600, H = 480, JW = 300, JH = 300, narrow = false, ctx, jctx;
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(canvas.parentElement.clientWidth || 600);
    narrow = window.innerWidth < 760;
    W = Math.max(240, cw);
    H = Math.round(W * (narrow ? 0.95 : 0.8));
    ctx = Lab.setupCanvas(canvas, W, H);
    const jw = Math.round(jcanvas.parentElement.clientWidth || 300);
    JW = Math.max(200, jw);
    JH = Math.round(narrow ? Math.min(JW * 0.8, 360) : JW);
    jctx = Lab.setupCanvas(jcanvas, JW, JH);
  }

  // Device pixels per unit of the complex plane. Zoom 1 fits the whole set.
  const ppuOf = (zoom) => zoom * Math.min(canvas.width / 3.2, canvas.height / 2.6);
  const ppu = () => ppuOf(S.zoom);
  const jppu = () => Math.min(jcanvas.width, jcanvas.height) / 3.6;
  function toComplex(dx, dy) {
    const p = ppu();
    return { x: S.cx + (dx - canvas.width / 2) / p, y: S.cy - (dy - canvas.height / 2) / p };
  }
  function toScreen(x, y) { // CSS pixels on the main canvas
    const p = ppu();
    return [(canvas.width / 2 + (x - S.cx) * p) / dpr, (canvas.height / 2 - (y - S.cy) * p) / dpr];
  }
  function toJulia(x, y) {
    const p = jppu();
    return [(jcanvas.width / 2 + x * p) / dpr, (jcanvas.height / 2 - y * p) / dpr];
  }

  // ---------- Workers ----------
  let mainR = null, juliaR = null, workersOK = true;
  try {
    const pool = []; for (let i = 0; i < NW; i++) pool.push(makeWorker());
    mainR = new Renderer(pool, "m");
    juliaR = new Renderer([makeWorker()], "j");
  } catch (e) { workersOK = false; }

  let mainQueued = false, juliaQueued = false;
  const requestMain = () => { mainQueued = true; dirty = true; };
  const requestJulia = () => { juliaQueued = true; dirty = true; };
  function startMain() {
    if (!mainR) return;
    mainR.start({ w: canvas.width, h: canvas.height, cx: S.cx, cy: S.cy, ppu: ppu(), max: maxIter() });
  }
  function startJulia() {
    if (!juliaR) return;
    juliaR.start({ w: jcanvas.width, h: jcanvas.height, cx: 0, cy: 0, ppu: jppu(), max: Math.min(maxIter(), 3000), cr: S.c.x, ci: S.c.y });
  }

  // ---------- Orbits ----------
  const ORBIT_LIMIT = 100000, DRAW_PTS = 400;
  function computeOrbit(cr, ci) {
    let x = 0, y = 0;
    const pts = [[0, 0]];
    for (let n = 1; n <= ORBIT_LIMIT; n++) {
      const nx = x * x - y * y + cr;
      y = 2 * x * y + ci; x = nx;
      if (pts.length < DRAW_PTS) pts.push([x, y]);
      if (x * x + y * y > 4) return { type: "escape", n, pts, cycle: [] };
    }
    const x0 = x, y0 = y, cyc = [[x, y]];
    const tol = 1e-9 * Math.max(1, Math.hypot(x, y));
    for (let p = 1; p <= 256; p++) {
      const nx = x * x - y * y + cr;
      y = 2 * x * y + ci; x = nx;
      if (Math.abs(x - x0) < tol && Math.abs(y - y0) < tol) return { type: "cycle", period: p, pts, cycle: cyc };
      cyc.push([x, y]);
    }
    return { type: "bounded", pts, cycle: [] };
  }

  function setC(x, y, opts) {
    opts = opts || {};
    S.c = { x, y };
    const o = computeOrbit(x, y);
    o.shown = opts.live || Lab.reducedMotion ? o.pts.length : 1;
    o.acc = 0;
    S.orbit = o;
    if (!opts.fromInput) syncCInputs();
    requestJulia();
    updateReadouts();
    if (opts.user && !opts.live) {
      WONDERS.describe(orbitSentence(true), { now: true });
      if (o.type === "escape") WONDERS.sound("event", { pitch: 0.15 });
      else WONDERS.sound("event", { pitch: 0.75 });
    }
    if (opts.user && o.type === "cycle" && o.period === 3) WONDERS.challenge("period3");
  }

  function orbitSentence(isNew) {
    const o = S.orbit;
    const a = fmtNum(S.c.x, 4), b = fmtNum(S.c.y, 4);
    const lead = isNew ? "New point c: real part " + a + ", imaginary part " + b + "."
      : "The chosen point c has real part " + a + " and imaginary part " + b + ".";
    let rest;
    if (o.type === "escape") rest = o.n > maxIter()
      ? "The orbit of 0 escapes only after " + o.n + " steps, more than the iteration limit, so the picture still shows c in black. Its Julia set is dust."
      : "The orbit of 0 escapes after " + o.n + " steps, so c is outside the Mandelbrot set and its Julia set falls apart into dust.";
    else if (o.type === "cycle" && o.period === 1) rest = "The orbit of 0 settles onto a single point, so c is inside the set and its Julia set is one connected piece.";
    else if (o.type === "cycle") rest = "The orbit of 0 settles into a cycle of " + o.period + " points, so c is inside the set and its Julia set is one connected piece.";
    else rest = "The orbit of 0 stays bounded for 100000 steps without settling, so c is in the set or extremely close to its edge.";
    return T(lead) + " " + T(rest);
  }

  // ---------- View changes ----------
  let zoomMilestone = 0, precisionWarned = false;
  function clampZoom(z) { return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)); }
  function viewChanged(user) {
    requestMain();
    scheduleViewInputs();
    updateReadouts();
    if (S.zoom >= 1000) WONDERS.challenge("zoom1000");
    const m = Math.floor(Math.log10(S.zoom) + 1e-9);
    if (user && m >= 1 && m !== zoomMilestone) {
      WONDERS.describe("Zoomed in to " + fmtZoomPlain(S.zoom) + " times.");
      WONDERS.sound("tick", { pitch: Math.min(1, m / 15) });
    }
    zoomMilestone = m;
    const dig = spareDigits();
    if (dig < 0 && !precisionWarned) {
      precisionWarned = true;
      WONDERS.describe("Double precision has run out at this zoom: neighbouring pixels now round to the same number, so the picture breaks into blocks.", { now: true });
      WONDERS.sound("fail");
    } else if (dig > 1) precisionWarned = false;
  }
  function zoomAt(dx, dy, f, user) {
    const z = toComplex(dx, dy);
    S.zoom = clampZoom(S.zoom * f);
    const p = ppu();
    S.cx = z.x - (dx - canvas.width / 2) / p;
    S.cy = z.y + (dy - canvas.height / 2) / p;
    viewChanged(user);
  }
  function panBy(ddx, ddy) {
    const p = ppu();
    S.cx -= ddx / p; S.cy += ddy / p;
    viewChanged(true);
  }
  function setView(cx, cy, zoom, user) {
    S.cx = cx; S.cy = cy; S.zoom = clampZoom(zoom);
    viewChanged(user);
  }

  // Digits of double precision left before neighbouring pixels share a value.
  function spareDigits() {
    const pix = 1 / ppu();
    const mag = Math.max(Math.abs(S.cx), Math.abs(S.cy), pix * canvas.width);
    return Math.log10(pix / (mag * Math.pow(2, -52)));
  }

  // ---------- Formatting ----------
  const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  function fmtZoomPlain(z) {
    if (z < 1e6) return z < 10 ? String(+z.toPrecision(2)) : Math.round(z).toLocaleString("en-US");
    const e = Math.floor(Math.log10(z));
    return (z / Math.pow(10, e)).toFixed(1) + " × 10" + String(e).split("").map((ch) => SUP[ch]).join("");
  }
  // Enough decimals to pin down a pixel, at least four.
  function decimals() {
    const pix = 1 / ppu();
    return Math.max(4, Math.min(20, Math.ceil(-Math.log10(pix)) + 1));
  }
  function fmtNum(v, d) { const s = v.toFixed(d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
  function fmtComplex(x, y, d) {
    const re = fmtNum(x, d).replace("-", "−");
    const im = fmtNum(Math.abs(y), d);
    return re + (y < 0 && +im !== 0 ? " − " : " + ") + im + "i";
  }

  // ---------- Readouts ----------
  let lastReadout = 0, readoutTimer = null;
  function updateReadouts() {
    const now = performance.now();
    if (now - lastReadout < 100) {
      if (!readoutTimer) readoutTimer = setTimeout(() => { readoutTimer = null; updateReadouts(); }, 110);
      return;
    }
    lastReadout = now;
    $("zoomStat").textContent = fmtZoomPlain(S.zoom) + "×";
    $("centreStat").textContent = fmtComplex(S.cx, S.cy, Math.min(decimals(), 16));
    $("itersStat").textContent = maxIter().toLocaleString("en-US");
    const dig = spareDigits();
    const pe = $("precStat");
    pe.textContent = dig >= 1 ? Math.floor(dig) + " digits to spare" : dig >= 0 ? "almost used up" : "used up, pixels repeat";
    pe.style.color = dig >= 2 ? "" : "var(--warn)";
    $("cStat").textContent = fmtComplex(S.c.x, S.c.y, 4);
    const o = S.orbit;
    if (o) {
      $("orbitStat").textContent = o.type === "escape" ? "escapes after " + o.n.toLocaleString("en-US") + " steps"
        : o.type === "bounded" ? "bounded, never settles"
        : o.period === 1 ? "settles onto one point" : "cycles through " + o.period + " points";
      $("juliaStat").textContent = o.type === "escape" ? "dust (c is outside)" : "connected (c is inside)";
      $("juliaNote").textContent = o.type === "escape"
        ? (o.n > maxIter()
          ? "This c escapes only after " + o.n.toLocaleString("en-US") + " steps, beyond the iteration limit: the main picture still paints it black, but its Julia set is already dust."
          : "This c is outside the Mandelbrot set, so its Julia set is dust: infinitely many separate specks, with no two of them joined.")
        : o.type === "bounded"
          ? "This c sits on or extremely close to the edge of the Mandelbrot set. Its Julia set is a thin, branching web that only just holds together."
          : "This c is inside the Mandelbrot set, so its Julia set is one connected piece. Black points never escape; the orbit of 0 is drawn on top.";
    }
  }
  function updateRenderStat() {
    const r = mainR;
    const el = $("renderStat");
    if (!r) { el.textContent = "–"; return; }
    if (r.busy()) el.textContent = "drawing " + Math.round(r.progress() * 100) + "%";
    else if (r.lastDone) el.textContent = (r.lastDone.ms / 1000).toFixed(2) + " s";
  }

  // Number inputs mirror the view; typed values set it.
  let viewInputsTimer = null;
  function scheduleViewInputs() {
    if (viewInputsTimer) return;
    viewInputsTimer = setTimeout(() => { viewInputsTimer = null; syncViewInputs(); }, 150);
  }
  function syncViewInputs() {
    const d = decimals();
    // Never overwrite a field the user is typing in.
    const put = (id, v) => { if (document.activeElement !== $(id)) $(id).value = v; };
    put("cx", fmtNum(S.cx, d));
    put("cy", fmtNum(S.cy, d));
    put("zoom", S.zoom < 1e6 ? String(+S.zoom.toPrecision(5)) : S.zoom.toPrecision(5).replace("e+", "e"));
  }
  function syncCInputs() {
    const d = Math.max(4, Math.min(16, decimals()));
    if (document.activeElement !== $("cRe")) $("cRe").value = fmtNum(S.c.x, d);
    if (document.activeElement !== $("cIm")) $("cIm").value = fmtNum(S.c.y, d);
  }

  // ---------- Drawing ----------
  let dirty = true, focused = false;
  const FONT = (n) => n + "px 'IBM Plex Mono', ui-monospace, monospace";

  function blitFront(r, c2, cw, chh, view) {
    if (!r || !r.view) return false;
    const v = r.view;
    const s = view.ppu / v.ppu;
    const dx = cw / 2 + (v.cx - view.cx) * view.ppu - v.w / 2 * s;
    const dy = chh / 2 - (v.cy - view.cy) * view.ppu - v.h / 2 * s;
    if (!isFinite(dx) || !isFinite(dy)) return false;
    c2.imageSmoothingEnabled = s < 4;
    c2.drawImage(r.front, dx, dy, v.w * s, v.h * s);
    return true;
  }

  function drawMain() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const shown = blitFront(mainR, ctx, canvas.width, canvas.height, { cx: S.cx, cy: S.cy, ppu: ppu() });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!shown) {
      ctx.fillStyle = "#7f8ea6"; ctx.font = FONT(12); ctx.textAlign = "center";
      ctx.fillText(workersOK ? "Drawing…" : "This browser cannot run the background workers this page needs.", W / 2, H / 2);
    }

    if (S.labels) drawBulbLabels();
    if (S.showOrbit && S.orbit) drawOrbit(ctx, toScreen, true);
    drawCMarker();

    if (focused) {
      ctx.strokeStyle = "rgba(233,238,247,0.75)";
      ctx.lineWidth = 1;
      const x = W / 2, y = H / 2;
      ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x - 3, y); ctx.moveTo(x + 3, y); ctx.lineTo(x + 10, y);
      ctx.moveTo(x, y - 10); ctx.lineTo(x, y - 3); ctx.moveTo(x, y + 3); ctx.lineTo(x, y + 10); ctx.stroke();
    }

    // Progress bar while the full-resolution pass runs.
    if (mainR && mainR.busy()) {
      ctx.fillStyle = "rgba(143,166,255,0.85)";
      ctx.fillRect(0, H - 3, W * mainR.progress(), 3);
    }

    const dig = spareDigits();
    if (dig < 0.5) {
      ctx.font = FONT(narrow ? 11 : 12);
      const msg = dig < 0 ? "Out of double precision: neighbouring pixels round to the same number" : "Nearly out of double precision";
      const tw = Math.min(W - 16, ctx.measureText(msg).width + 16);
      ctx.fillStyle = "rgba(5,8,14,0.82)";
      ctx.fillRect(8, H - 34, tw, 22);
      ctx.fillStyle = "#f08a5d"; ctx.textAlign = "left";
      fitText(msg, 16, H - 19, W - 32);
    }
  }

  function drawBulbLabels() {
    ctx.font = FONT(narrow ? 11 : 12);
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(5,8,14,0.85)";
    const seen = [];
    for (const [bx, by, p] of BULBS) {
      for (const sy of by === 0 ? [1] : [1, -1]) {
        const [x, y] = toScreen(bx, by * sy);
        if (x < 8 || x > W - 8 || y < 10 || y > H - 6) continue;
        if (seen.some(([a, b]) => Math.abs(a - x) < 16 && Math.abs(b - y) < 14)) continue;
        seen.push([x, y]);
        ctx.fillStyle = p === 1 ? "#e9eef7" : "#f0b35a";
        ctx.strokeText(String(p), x, y + 4);
        ctx.fillText(String(p), x, y + 4);
      }
    }
    ctx.lineWidth = 1;
  }

  function drawOrbit(c2, map, onMain) {
    const o = S.orbit;
    const n = Math.min(o.pts.length, Math.ceil(o.shown));
    c2.save();
    c2.lineWidth = 1.25;
    c2.lineJoin = "round";
    // Fade older steps so the path's direction stays readable.
    for (let i = 1; i < n; i++) {
      const a = map(o.pts[i - 1][0], o.pts[i - 1][1]), b = map(o.pts[i][0], o.pts[i][1]);
      const age = (n - i) / Math.max(1, Math.min(n, 60));
      const al = Math.max(0.18, 0.9 - age * 0.7);
      c2.strokeStyle = `rgba(240,179,90,${al})`;
      c2.beginPath(); c2.moveTo(a[0], a[1]); c2.lineTo(b[0], b[1]); c2.stroke();
    }
    c2.fillStyle = "#f0b35a";
    for (let i = 0; i < n; i++) {
      const p = map(o.pts[i][0], o.pts[i][1]);
      c2.beginPath(); c2.arc(p[0], p[1], i === n - 1 ? 3.2 : 1.8, 0, Math.PI * 2); c2.fill();
    }
    // Once fully drawn, ring the points of the cycle it settles into.
    if (n >= o.pts.length && o.cycle.length && o.cycle.length <= 64) {
      c2.strokeStyle = "#5cc8ff";
      c2.lineWidth = 1.6;
      for (const q of o.cycle) {
        const p = map(q[0], q[1]);
        c2.beginPath(); c2.arc(p[0], p[1], 5.5, 0, Math.PI * 2); c2.stroke();
      }
    }
    // Start point z0 = 0
    const z0 = map(0, 0);
    c2.strokeStyle = "#e9eef7"; c2.lineWidth = 1.2;
    c2.beginPath(); c2.arc(z0[0], z0[1], 3.5, 0, Math.PI * 2); c2.stroke();
    c2.restore();
  }

  function drawCMarker() {
    const [x, y] = toScreen(S.c.x, S.c.y);
    if (x < -10 || x > W + 10 || y < -10 || y > H + 10) return;
    ctx.strokeStyle = "rgba(5,8,14,0.9)"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#e48bd0"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.font = FONT(12); ctx.textAlign = "left";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(5,8,14,0.85)";
    ctx.strokeText("c", x + 10, y - 8);
    ctx.fillStyle = "#e48bd0"; ctx.fillText("c", x + 10, y - 8);
    ctx.lineWidth = 1;
  }

  function drawJulia() {
    jctx.setTransform(1, 0, 0, 1, 0, 0);
    jctx.fillStyle = "#05080e";
    jctx.fillRect(0, 0, jcanvas.width, jcanvas.height);
    blitFront(juliaR, jctx, jcanvas.width, jcanvas.height, { cx: 0, cy: 0, ppu: jppu() });
    jctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Escape circle |z| = 2: once an orbit leaves it, it never returns.
    const r2 = 2 * jppu() / dpr;
    jctx.strokeStyle = "rgba(201,212,227,0.28)";
    jctx.setLineDash([3, 5]);
    jctx.beginPath(); jctx.arc(JW / 2, JH / 2, r2, 0, Math.PI * 2); jctx.stroke();
    jctx.setLineDash([]);
    if (S.orbit) drawOrbit(jctx, toJulia, false);
    jctx.font = FONT(narrow ? 11 : 12);
    jctx.textAlign = "left";
    jctx.fillStyle = "rgba(5,8,14,0.7)";
    jctx.fillRect(6, 6, Math.min(JW - 12, jctx.measureText(T("JULIA SET FOR THIS c")).width + 12), 22);
    jctx.fillStyle = "#c9d4e3";
    fitText("JULIA SET FOR THIS c", 12, 21, JW - 24, jctx);
    jctx.fillStyle = "rgba(201,212,227,0.6)";
    jctx.textAlign = "right";
    jctx.fillText("|z| = 2", JW / 2 + r2 * 0.7 - 4, JH / 2 + r2 * 0.7 + 14 > JH - 4 ? JH - 6 : JH / 2 + r2 * 0.7 + 14);
  }

  function fitText(text, x, y, maxW, c2) {
    c2 = c2 || ctx;
    const base = c2.font;
    let size = +(/(\d+(?:\.\d+)?)px/.exec(base) || [0, 12])[1];
    while (size > 10 && c2.measureText(text).width > maxW) {
      size -= 0.5;
      c2.font = base.replace(/\d+(?:\.\d+)?px/, size + "px");
    }
    c2.fillText(text, x, y);
    c2.font = base;
  }

  // ---------- Loop ----------
  let lastT = performance.now(), lastStat = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    if (mainQueued) { mainQueued = false; startMain(); }
    if (juliaQueued) { juliaQueued = false; startJulia(); }
    const o = S.orbit;
    if (o && o.shown < o.pts.length) {
      // Trace the orbit step by step, slowly at first, then faster.
      const before = Math.floor(o.shown);
      o.shown = Math.min(o.pts.length, o.shown + dt * (4 + o.shown * 2.2));
      const after = Math.floor(o.shown);
      if (after > before && after < 40) {
        const p = o.pts[Math.min(after, o.pts.length - 1)];
        WONDERS.sound("tick", { pitch: Math.min(1, Math.hypot(p[0], p[1]) / 2), pan: Math.max(-1, Math.min(1, p[0] / 2)) });
      }
      dirty = true;
    }
    if ((mainR && mainR.busy()) || (juliaR && juliaR.busy())) dirty = true;
    if (dirty) {
      dirty = false;
      drawMain();
      drawJulia();
    }
    if (now - lastStat > 150) { lastStat = now; updateRenderStat(); }
    requestAnimationFrame(frame);
  }

  if (mainR) mainR.onDone = (j) => {
    updateRenderStat();
    // Challenge: an edge of the set rendered past the end of double precision.
    if (spareDigits() < 0 && j.inside > 0 && j.outside > 0) WONDERS.challenge("precision");
  };

  // ---------- Pointer: drag to pan, wheel/pinch to zoom, click to pick or zoom ----------
  const pointers = new Map();
  let down = null, pinch = null;
  const devPt = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height };
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button > 0) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    const p = devPt(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 1) { down = { x: p.x, y: p.y, moved: false, last: p, shift: e.shiftKey }; pinch = null; }
    else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      if (down) down.moved = true;
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = devPt(e);
    if (!pointers.has(e.pointerId)) {
      if (S.follow && e.pointerType !== "touch") { const z = toComplex(p.x, p.y); setC(z.x, z.y, { live: true, user: true }); }
      return;
    }
    pointers.set(e.pointerId, p);
    if (pointers.size >= 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (d > 0 && pinch.d > 0) {
        const pp = ppu();
        S.cx -= (m.x - pinch.m.x) / pp; S.cy += (m.y - pinch.m.y) / pp;
        zoomAt(m.x, m.y, d / pinch.d, true);
      }
      pinch = { d, m };
      return;
    }
    if (!down) return;
    const tol = 5 * dpr;
    if (!down.moved && Math.hypot(p.x - down.x, p.y - down.y) > tol) down.moved = true;
    if (down.moved) { panBy(p.x - down.last.x, p.y - down.last.y); }
    down.last = p;
  });
  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size === 1) { pinch = null; const q = [...pointers.values()][0]; if (down) down.last = q; return; }
    if (pointers.size > 0) return;
    if (down && !down.moved && e.type === "pointerup") {
      const p = devPt(e);
      if (S.clickMode === "zoom") {
        const z = toComplex(p.x, p.y);
        setView(z.x, z.y, S.zoom * (e.shiftKey ? 1 / 3 : 3), true);
      } else {
        const z = toComplex(p.x, p.y);
        setC(z.x, z.y, { user: true });
      }
    }
    down = null; pinch = null;
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("dblclick", (e) => {
    if (S.clickMode !== "pick") return;
    const p = devPt(e);
    zoomAt(p.x, p.y, e.shiftKey ? 1 / 3 : 3, true);
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const p = devPt(e);
    const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    zoomAt(p.x, p.y, Math.exp(-Math.max(-300, Math.min(300, dy)) * 0.0022), true);
  }, { passive: false });

  // ---------- Keyboard on the picture ----------
  canvas.addEventListener("focus", () => { focused = true; dirty = true; });
  canvas.addEventListener("blur", () => { focused = false; dirty = true; });
  canvas.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[k]) {
      const [ax, ay] = arrows[k];
      if (e.shiftKey) {
        const step = canvas.width / 100 / ppu();
        setC(S.c.x + ax * step, S.c.y - ay * step, { user: true, live: true });
        WONDERS.describe(orbitSentence(true));
      } else panBy(-ax * canvas.width / 8, -ay * canvas.height / 8);
    } else if (k === "+" || k === "=") zoomAt(canvas.width / 2, canvas.height / 2, 1.5, true);
    else if (k === "-" || k === "_") zoomAt(canvas.width / 2, canvas.height / 2, 1 / 1.5, true);
    else if (k === "Enter" || k === " ") setC(S.cx, S.cy, { user: true });
    else if (k === "Home") preset("presetHome");
    else return;
    e.preventDefault();
  });

  // ---------- Controls ----------
  const PRESETS = {
    presetHome: { cx: -0.6, cy: 0, zoom: 1, say: "Showing the whole Mandelbrot set." },
    presetSeahorse: { cx: -0.7453, cy: 0.1045, zoom: 60, iters: 6, say: "Showing Seahorse valley, the gap between the main cardioid and the big disc to its left." },
    presetElephant: { cx: 0.2935, cy: 0.0165, zoom: 70, iters: 6, say: "Showing Elephant valley, the gap on the right side of the main cardioid." },
    presetMini: { cx: -1.7615, cy: 0, zoom: 45, iters: 6, say: "Showing a mini-Mandelbrot on the negative real axis, a small copy of the whole set." },
    presetBulbs: { cx: -0.55, cy: 0, zoom: 1.08, labels: true, say: "Showing the bulbs around the main cardioid, each labelled with the period of its cycle." },
  };
  function preset(id) {
    const p = PRESETS[id];
    if (p.iters && S.itersIdx < p.iters) setIters(p.iters);
    if (p.labels && !S.labels) { $("labels").checked = true; S.labels = true; }
    setView(p.cx, p.cy, p.zoom, false);
    syncViewInputs();
    WONDERS.describe(p.say, { now: true });
    WONDERS.sound("event", { pitch: 0.5 });
  }
  for (const id of Object.keys(PRESETS)) $(id).addEventListener("click", () => preset(id));

  function setIters(idx) {
    S.itersIdx = Math.max(0, Math.min(ITERS.length - 1, idx));
    $("iters").value = S.itersIdx;
    $("itersOut").textContent = maxIter().toLocaleString("en-US");
    requestMain(); requestJulia(); updateReadouts();
  }
  $("iters").addEventListener("input", (e) => setIters(+e.target.value));

  function readViewInputs() {
    const x = parseFloat($("cx").value), y = parseFloat($("cy").value), z = parseFloat($("zoom").value);
    if (!isFinite(x) || !isFinite(y) || !isFinite(z) || z <= 0) { syncViewInputs(); return; }
    setView(Math.max(-4, Math.min(4, x)), Math.max(-4, Math.min(4, y)), z, true);
  }
  for (const id of ["cx", "cy", "zoom"]) $(id).addEventListener("change", readViewInputs);
  function readCInputs() {
    const x = parseFloat($("cRe").value), y = parseFloat($("cIm").value);
    if (!isFinite(x) || !isFinite(y)) { syncCInputs(); return; }
    setC(Math.max(-4, Math.min(4, x)), Math.max(-4, Math.min(4, y)), { user: true, fromInput: true });
  }
  for (const id of ["cRe", "cIm"]) $(id).addEventListener("change", readCInputs);

  function setClickMode(m) {
    S.clickMode = m;
    $("clickPick").setAttribute("aria-pressed", String(m === "pick"));
    $("clickZoom").setAttribute("aria-pressed", String(m === "zoom"));
    canvas.style.cursor = m === "zoom" ? "zoom-in" : "crosshair";
  }
  $("clickPick").addEventListener("click", () => setClickMode("pick"));
  $("clickZoom").addEventListener("click", () => setClickMode("zoom"));
  $("zoomIn").addEventListener("click", () => zoomAt(canvas.width / 2, canvas.height / 2, 3, true));
  $("zoomOut").addEventListener("click", () => zoomAt(canvas.width / 2, canvas.height / 2, 1 / 3, true));
  $("pickCentre").addEventListener("click", () => setC(S.cx, S.cy, { user: true }));
  $("follow").addEventListener("change", (e) => { S.follow = e.target.checked; });
  $("orbit").addEventListener("change", (e) => { S.showOrbit = e.target.checked; dirty = true; });
  $("labels").addEventListener("change", (e) => { S.labels = e.target.checked; dirty = true; });

  // ---------- Resize: keep the view, redraw at the new size ----------
  let lastSize = "";
  function onResize() {
    const key = canvas.parentElement.clientWidth + "x" + jcanvas.parentElement.clientWidth + "x" + (window.innerWidth < 760);
    if (key === lastSize) return;
    lastSize = key;
    layout();
    requestMain(); requestJulia();
  }
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas.parentElement); ro.observe(jcanvas.parentElement);
  } else window.addEventListener("resize", onResize);

  // ---------- Screen-reader description ----------
  WONDERS.describer(() => {
    const parts = [T("Mandelbrot set view centred at real part " + fmtNum(S.cx, Math.min(decimals(), 16)) + ", imaginary part " + fmtNum(S.cy, Math.min(decimals(), 16)) + ", zoomed " + fmtZoomPlain(S.zoom) + " times, with an iteration limit of " + maxIter() + ".")];
    const j = mainR && mainR.lastDone;
    if (j && j.inside + j.outside > 0) {
      const pct = 100 * j.inside / (j.inside + j.outside);
      parts.push(T(pct === 0 ? "None of the picture is inside the set; every pixel escapes."
        : pct < 1 ? "Less than 1% of the picture is inside the set, shown black."
        : "About " + Math.round(pct) + "% of the picture is inside the set, shown black."));
    }
    if (S.orbit) parts.push(orbitSentence(false));
    if (spareDigits() < 0) parts.push(T("At this zoom the picture has run out of double precision and breaks into blocks."));
    return parts.join(" ");
  });

  // ---------- Start ----------
  layout();
  lastSize = canvas.parentElement.clientWidth + "x" + jcanvas.parentElement.clientWidth + "x" + (window.innerWidth < 760);
  setIters(S.itersIdx);
  syncViewInputs();
  setC(S.c.x, S.c.y, {});
  viewChanged(false);
  requestAnimationFrame(frame);
})();
