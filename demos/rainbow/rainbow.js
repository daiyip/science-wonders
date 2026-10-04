(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const canvas = $("bench"), skyCanvas = $("sky");
  const W_ = window.WONDERS;
  const T = (s) => (window.I18N ? window.I18N.t(s) : s);
  const DEG = Math.PI / 180;
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";

  // ---------- Optics of one spherical drop (radius 1) ----------
  // Water: Cauchy fit n = A + B / λ², λ in micrometres (1.343 at 400 nm, 1.330 at 700 nm).
  const nWater = (nm) => 1.3240 + 0.00309 / ((nm / 1000) * (nm / 1000));
  // Total turn of a ray with k internal reflections, in radians.
  function devRad(b, n, k) {
    const i = Math.asin(b), r = Math.asin(b / n);
    return 2 * (i - r) + k * (Math.PI - 2 * r);
  }
  // Angle between the outgoing ray and the direction back toward the sun,
  // which is the ray's angle from the antisolar point as seen by an observer.
  const exitAngle = (b, n, k) => Math.acos(-Math.cos(devRad(b, n, k))) / DEG;
  const descartesB = (n, k) => Math.sqrt(1 - (n * n - 1) / (k * k + 2 * k));
  const bowAngle = (n, k) => exitAngle(descartesB(n, k), n, k);
  // Share of the ray's power that leaves after k internal reflections (unpolarised Fresnel).
  function fresnelRs(ci, cr, n) {
    const rs = (ci - n * cr) / (ci + n * cr), rp = (n * ci - cr) / (n * ci + cr);
    return [rs * rs, rp * rp];
  }
  function power(b, n, k) {
    const ci = Math.sqrt(1 - b * b), sr = b / n, cr = Math.sqrt(1 - sr * sr);
    const [Rs, Rp] = fresnelRs(ci, cr, n);
    return 0.5 * ((1 - Rs) * (1 - Rs) * Math.pow(Rs, k) + (1 - Rp) * (1 - Rp) * Math.pow(Rp, k));
  }

  // ---------- Histograms of exit angle, per colour ----------
  // 0.1° bins over 0–180°. Rays are traced uniformly in incidence angle i and weighted
  // by b·db = b cos i di (the area of the ring they hit) times the Fresnel share,
  // then blurred by the sun's 0.53° disc.
  const NB = 1800, NI = 20000;
  const SUN_KERNEL = (() => {
    const R = 2.65, k = [];
    let s = 0;
    for (let d = -3; d <= 3; d++) { const w = Math.sqrt(Math.max(0, 1 - (d / R) * (d / R))); k.push(w); s += w; }
    return k.map((w) => w / s);
  })();
  function smooth(h) {
    const out = new Float32Array(NB);
    for (let t = 0; t < NB; t++) {
      let v = 0;
      for (let d = -3; d <= 3; d++) {
        let u = t + d;
        if (u < 0) u = -u - 1; else if (u >= NB) u = 2 * NB - u - 1;
        v += h[u] * SUN_KERNEL[d + 3];
      }
      out[t] = v;
    }
    return out;
  }
  function spectrumHist(n) {
    const h1 = new Float64Array(NB), h2 = new Float64Array(NB);
    const di = (Math.PI / 2) / NI;
    for (let j = 0; j < NI; j++) {
      const i = (j + 0.5) * di, b = Math.sin(i), ci = Math.cos(i);
      const sr = b / n, r = Math.asin(sr), cr = Math.sqrt(1 - sr * sr);
      const [Rs, Rp] = fresnelRs(ci, cr, n);
      const ts = (1 - Rs) * (1 - Rs), tp = (1 - Rp) * (1 - Rp);
      const wt = b * ci * di;
      const D1 = 2 * (i - r) + (Math.PI - 2 * r), D2 = D1 + (Math.PI - 2 * r);
      const a1 = Math.acos(-Math.cos(D1)) / DEG, a2 = Math.acos(-Math.cos(D2)) / DEG;
      h1[Math.min(NB - 1, (a1 * 10) | 0)] += wt * 0.5 * (ts * Rs + tp * Rp);
      h2[Math.min(NB - 1, (a2 * 10) | 0)] += wt * 0.5 * (ts * Rs * Rs + tp * Rp * Rp);
    }
    return [smooth(h1), smooth(h2)];
  }

  // CIE 1931 colour matching functions (Wyman, Sloan and Shirley's analytic fit).
  const gs = (x, mu, s1, s2) => { const t = (x - mu) / (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
  const cmf = (l) => [
    1.056 * gs(l, 599.8, 37.9, 31.0) + 0.362 * gs(l, 442.0, 16.0, 26.7) - 0.065 * gs(l, 501.1, 20.4, 26.2),
    0.821 * gs(l, 568.8, 46.9, 40.5) + 0.286 * gs(l, 530.9, 16.3, 31.1),
    1.217 * gs(l, 437.0, 11.8, 36.0) + 0.681 * gs(l, 459.0, 26.0, 13.8),
  ];
  const xyz2rgb = (X, Y, Z) => [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z];

  const LAMS = [];
  for (let l = 400; l <= 700; l += 10) LAMS.push(l);
  const CMF = LAMS.map(cmf);
  // White balance: equal-energy sunlight maps to neutral white.
  const WB = (() => {
    let X = 0, Y = 0, Z = 0;
    for (const c of CMF) { X += c[0]; Y += c[1]; Z += c[2]; }
    const rgb = xyz2rgb(X, Y, Z);
    return [1 / rgb[0], 1 / rgb[1], 1 / rgb[2]];
  })();
  const LUM = [0.2126, 0.7152, 0.0722];

  // Precomputed once (about 0.6 million rays); per-colour histograms for white light.
  let HW = null;
  function ensureWhite() {
    if (!HW) HW = LAMS.map((l) => spectrumHist(nWater(l)));
    return HW;
  }
  const monoCache = new Map();
  function monoHist(nm) {
    if (!monoCache.has(nm)) { if (monoCache.size > 40) monoCache.clear(); monoCache.set(nm, spectrumHist(nWater(nm))); }
    return monoCache.get(nm);
  }
  const linRGB = (nm) => Lab.wavelengthToRGB(nm).map((c) => Math.pow(c / 255, 2.2));

  // ---------- State ----------
  const state = {
    white: false, nm: 650, fan: true, b: 0.5, refl: 3, // refl bit 1 = primary, bit 2 = secondary
    sun: 10, skyMono: false, running: !Lab.reducedMotion,
  };
  const show1 = () => (state.refl & 1) !== 0;
  const show2 = () => (state.refl & 2) !== 0;
  const RED = 700, VIOLET = 400;
  const WHITE_SET = [410, 450, 490, 530, 570, 610, 660];

  // ---------- Layout ----------
  let W = 960, H = 540, narrow = false, ctx;
  let L = {};
  let SW = 960, SH = 420, sctx;
  let S = {};
  const fpx = (n) => (narrow ? Math.max(10, n) : n) + "px";

  function layout() {
    const cw = Math.round(canvas.clientWidth || canvas.parentElement.clientWidth || 960);
    narrow = cw < 640;
    if (!narrow) {
      W = 960; H = 540;
      L = {
        drop: { x0: 0, x1: 500, y0: 40, y1: H - 12, cx: 272, cy: 288, R: 186 },
        plot: { x: 562, y: 58, w: 250, h: 420 },
        hist: { x: 828, y: 58, w: 112, h: 420 },
        titleY: 26, divider: true,
      };
      SW = 960; SH = 420;
      S = {
        side: { x: 8, y: 36, w: 292, h: 364 },
        view: { x: 322, y: 36, w: 624, h: 364 },
        scale: 624 / 120, elMin: -12, titleY: 24,
      };
    } else {
      W = Math.max(280, cw);
      const R = Math.min(150, Math.round((W - 70) / 2));
      const dropH = 2 * R + 70;
      const histW = Math.round((W - 60) * 0.3);
      const plotY = 40 + dropH + 34;
      const plotW = W - 44 - histW - 22;
      L = {
        drop: { x0: 0, x1: W, y0: 30, y1: 30 + dropH, cx: Math.round(W * 0.57), cy: 30 + Math.round(dropH / 2) + 4, R },
        plot: { x: 44, y: plotY, w: plotW, h: 260 },
        hist: { x: 44 + plotW + 12, y: plotY, w: histW, h: 260 },
        titleY: 18, plotTitleY: plotY - 14, divider: false,
      };
      H = plotY + 260 + 52;
      SW = W;
      const sideH = 190;
      const viewW = W - 16;
      const scale = viewW / 90;
      const viewH = Math.round(scale * 68);
      S = {
        side: { x: 8, y: 28, w: W - 16, h: sideH },
        view: { x: 8, y: 28 + sideH + 34, w: viewW, h: viewH },
        scale, elMin: -11, titleY: 18,
      };
      SH = S.view.y + viewH + 10;
    }
    ctx = Lab.setupCanvas(canvas, W, H);
    sctx = Lab.setupCanvas(skyCanvas, SW, SH);
    setupSkyBuffer();
    dirty = true;
  }

  // ---------- Sky: the view facing away from the sun ----------
  // A coarse buffer (2 logical px per cell). Every cell above the horizon is a patch of
  // falling rain; random drops land in cells and each landing is counted. A cell's light
  // is its share of drops times the brightness that drops at its angle send to the eye.
  let buf = null;
  function setupSkyBuffer() {
    const V = S.view;
    const bw = Math.ceil(V.w / 2), bh = Math.ceil(V.h / 2);
    const horizonY = V.h + S.elMin * S.scale; // local y of the horizon
    const counts = new Float32Array(bw * bh);
    const idx = [];
    for (let v = 0; v < bh; v++) {
      const el = (horizonY - (v + 0.5) * 2) / S.scale;
      if (el <= 0) continue;
      for (let u = 0; u < bw; u++) idx.push(v * bw + u);
    }
    const off = document.createElement("canvas");
    off.width = bw; off.height = bh;
    const octx = off.getContext("2d");
    // Keep drops already counted if only the size changed slightly: start afresh is simpler.
    buf = { bw, bh, horizonY, counts, sky: Int32Array.from(idx), n: 0, off, octx, img: octx.createImageData(bw, bh), theta: new Uint16Array(bw * bh) };
    computeThetaMap();
    if (Lab.reducedMotion) prefill();
  }
  function computeThetaMap() {
    const V = S.view, s = state.sun * DEG, cs = Math.cos(s), ss = Math.sin(s);
    for (let v = 0; v < buf.bh; v++) {
      const el = ((buf.horizonY - (v + 0.5) * 2) / S.scale) * DEG;
      const ce = Math.cos(el), se = Math.sin(el);
      for (let u = 0; u < buf.bw; u++) {
        const az = (((u + 0.5) * 2 - V.w / 2) / S.scale) * DEG;
        const d = ce * Math.cos(az) * cs - se * ss;
        const th = Math.acos(Math.max(-1, Math.min(1, d))) / DEG;
        buf.theta[v * buf.bw + u] = Math.min(NB - 1, (th * 10) | 0);
      }
    }
    skyDirty = true;
  }
  function thetaAt(azDeg, elDeg) {
    const s = state.sun * DEG;
    const d = Math.cos(elDeg * DEG) * Math.cos(azDeg * DEG) * Math.cos(s) - Math.sin(elDeg * DEG) * Math.sin(s);
    return Math.acos(Math.max(-1, Math.min(1, d))) / DEG;
  }
  const MAX_PER_CELL = 300;
  function sampleDrops(count) {
    const sky = buf.sky, m = sky.length, c = buf.counts;
    const cap = MAX_PER_CELL * m - buf.n;
    count = Math.min(count, cap);
    for (let j = 0; j < count; j++) c[sky[(Math.random() * m) | 0]]++;
    buf.n += Math.max(0, count);
    if (count > 0) skyDirty = true;
  }
  function prefill() { sampleDrops(60 * buf.sky.length); }
  function clearSky() {
    buf.counts.fill(0);
    buf.n = 0;
    bowSaid = false;
    skyDirty = true;
    if (!state.running) prefill();
  }

  // Colour table: light per patch of sky (per steradian) at each 0.1° of angle.
  let table = null, tableKey = "";
  function buildTable() {
    const key = [state.skyMono ? state.nm : "w", state.refl].join("|");
    if (key === tableKey) return;
    tableKey = key;
    const tab = new Float32Array(NB * 3);
    const u1 = show1() ? 1 : 0, u2 = show2() ? 1 : 0;
    let peak = 0;
    if (!state.skyMono) {
      const HWs = ensureWhite();
      for (let t = 0; t < NB; t++) {
        const sin = Math.sin(((t + 0.5) / 10) * DEG);
        let X = 0, Y = 0, Z = 0, Y1 = 0;
        for (let li = 0; li < LAMS.length; li++) {
          const h = HWs[li], c = CMF[li];
          const v = (u1 * h[0][t] + u2 * h[1][t]) / sin;
          X += v * c[0]; Y += v * c[1]; Z += v * c[2];
          Y1 += (h[0][t] / sin) * c[1];
        }
        // White-balanced linear RGB, with the colour contrast raised a little for the screen.
        const rgb = xyz2rgb(X, Y, Z).map((v, ch) => v * WB[ch]);
        const y = rgb[0] * LUM[0] + rgb[1] * LUM[1] + rgb[2] * LUM[2];
        for (let ch = 0; ch < 3; ch++) tab[t * 3 + ch] = Math.max(0, y + (rgb[ch] - y) * SAT);
        if (t >= 300 && t <= 480 && Y1 > peak) peak = Y1;
      }
    } else {
      const h = monoHist(state.nm), col = linRGB(state.nm);
      const lum = Math.max(0.05, col[0] * LUM[0] + col[1] * LUM[1] + col[2] * LUM[2]);
      for (let t = 0; t < NB; t++) {
        const sin = Math.sin(((t + 0.5) / 10) * DEG);
        const v = (u1 * h[0][t] + u2 * h[1][t]) / sin;
        for (let ch = 0; ch < 3; ch++) tab[t * 3 + ch] = v * col[ch] / lum;
        if (t >= 300 && t <= 480 && h[0][t] / sin > peak) peak = h[0][t] / sin;
      }
    }
    const k = 1 / (peak || 1);
    for (let j = 0; j < tab.length; j++) tab[j] *= k;
    table = tab;
    skyDirty = true;
  }
  const SAT = 1.7;
  // Tone curve: linear light to 0–255 sRGB-ish.
  const EXPO = 2.0;
  const LUT = new Uint8ClampedArray(2048);
  for (let j = 0; j < 2048; j++) LUT[j] = Math.round(255 * Math.pow(1 - Math.exp(-(j / 256) * EXPO), 1 / 1.5));
  const tone = (x) => LUT[Math.min(2047, (x * 256) | 0)];

  let skyDirty = true;
  function renderSkyBuffer() {
    buildTable();
    const { bw, bh, counts, theta, img } = buf;
    const data = img.data, m = buf.sky.length;
    const norm = 1 / Math.max(1, buf.n / m);
    for (let p = 0, q = 0; p < bw * bh; p++, q += 4) {
      const c = counts[p];
      if (c === 0) { data[q] = data[q + 1] = data[q + 2] = 0; data[q + 3] = 255; continue; }
      const f = c * norm, t = theta[p] * 3;
      data[q] = tone(table[t] * f);
      data[q + 1] = tone(table[t + 1] * f);
      data[q + 2] = tone(table[t + 2] * f);
      data[q + 3] = 255;
    }
    buf.octx.putImageData(img, 0, 0);
    skyDirty = false;
  }

  // Falling drops drawn on top: each lights up only while it sits at a bright angle.
  const RAIN = [];
  function seedRain() {
    RAIN.length = 0;
    const azMax = S.view.w / 2 / S.scale, elMax = (buf.horizonY) / S.scale;
    const count = narrow ? 90 : 160;
    for (let j = 0; j < count; j++) RAIN.push({ az: (Math.random() * 2 - 1) * azMax, el: Math.random() * elMax, v: 5 + Math.random() * 6 });
  }
  function moveRain(dt) {
    const azMax = S.view.w / 2 / S.scale, elMax = buf.horizonY / S.scale;
    for (const d of RAIN) {
      d.el -= d.v * dt;
      if (d.el < 0) { d.el = elMax + Math.random() * 3; d.az = (Math.random() * 2 - 1) * azMax; }
    }
  }

  // ---------- Ray tracing for the drawing ----------
  // Drop centred at the origin, y up, sunlight travelling in +x. A ray at height b enters
  // at polar angle π − i; each chord inside turns the polar angle by −(π − 2r).
  function trace(b, nm) {
    const n = nWater(nm), i = Math.asin(b), r = Math.asin(b / n);
    const step = Math.PI - 2 * r;
    const pts = [];
    for (let j = 0; j <= 3; j++) { const a = Math.PI - i - j * step; pts.push([Math.cos(a), Math.sin(a)]); }
    const D1 = 2 * (i - r) + step, D2 = D1 + step;
    return { n, i, r, pts, dir1: [Math.cos(-D1), Math.sin(-D1)], dir2: [Math.cos(-D2), Math.sin(-D2)], D1, D2 };
  }

  // ---------- Drawing: the drop ----------
  let dirty = true;
  function toPx(p) { const d = L.drop; return [d.cx + p[0] * d.R, d.cy - p[1] * d.R]; }
  function rgba(rgb, a) { return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; }

  function drawRay(b, nm, col, opts) {
    const tr = trace(b, nm), d = L.drop;
    const lw = opts.highlight ? 2.2 : 1.1;
    const a = opts.alpha;
    ctx.lineWidth = lw;
    const P = tr.pts.map(toPx);
    if (opts.incoming !== false) {
      ctx.strokeStyle = opts.inColour || rgba(col, a);
      ctx.beginPath(); ctx.moveTo(d.x0 + 6, P[0][1]); ctx.lineTo(P[0][0], P[0][1]); ctx.stroke();
    }
    // Inside the drop
    ctx.strokeStyle = rgba(col, a * 0.9);
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[1][0], P[1][1]); ctx.lineTo(P[2][0], P[2][1]); ctx.stroke();
    const far = d.R * 3.2;
    if (show1()) {
      ctx.strokeStyle = rgba(col, a);
      ctx.beginPath(); ctx.moveTo(P[2][0], P[2][1]);
      ctx.lineTo(P[2][0] + tr.dir1[0] * far, P[2][1] - tr.dir1[1] * far); ctx.stroke();
    }
    if (show2()) {
      const a2 = show1() ? a * 0.5 : a * 0.9;
      ctx.strokeStyle = rgba(col, a2);
      ctx.beginPath(); ctx.moveTo(P[2][0], P[2][1]); ctx.lineTo(P[3][0], P[3][1]);
      ctx.lineTo(P[3][0] + tr.dir2[0] * far, P[3][1] - tr.dir2[1] * far); ctx.stroke();
    }
    return { tr, P };
  }

  function angleMark(P, dir, theta, label, col) {
    // Dashed line from the exit point back toward the sun, and an arc to the ray.
    const len = Math.min(L.drop.R * 0.9, 120);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(233,238,247,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(P[0] - len, P[1]); ctx.stroke();
    ctx.setLineDash([]);
    const rr = Math.min(56, len * 0.6);
    const back = Math.PI; // screen angle of the dashed line
    const ray = Math.atan2(-dir[1], dir[0]);
    let a0 = back, a1 = ray;
    let diff = a1 - a0;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    ctx.strokeStyle = rgba(col, 0.95);
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(P[0], P[1], rr, a0, a0 + diff, diff < 0); ctx.stroke();
    const mid = a0 + diff / 2;
    ctx.fillStyle = "#e9eef7";
    ctx.font = fpx(12) + " " + MONO;
    ctx.textAlign = "center";
    const lx = Math.max(L.drop.x0 + 40, Math.min(L.drop.x1 - 40, P[0] + Math.cos(mid) * (rr + 26)));
    const ly = Math.max(L.drop.y0 + 12, Math.min(L.drop.y1 - 22, P[1] + Math.sin(mid) * (rr + 12) + 4));
    ctx.fillText(label + " " + theta.toFixed(1) + "°", lx, ly);
    ctx.restore();
  }

  function drawDrop() {
    const d = L.drop;
    ctx.save();
    ctx.beginPath(); ctx.rect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0); ctx.clip();

    // Drop body
    const g = ctx.createRadialGradient(d.cx - d.R * 0.3, d.cy - d.R * 0.35, d.R * 0.1, d.cx, d.cy, d.R);
    g.addColorStop(0, "rgba(120,170,230,0.16)");
    g.addColorStop(1, "rgba(60,100,160,0.07)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(d.cx, d.cy, d.R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#5578a6"; ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = "#1a2436"; ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(d.x0 + 6, d.cy + 0.5); ctx.lineTo(d.cx + d.R + 8, d.cy + 0.5); ctx.stroke();
    ctx.setLineDash([]);

    const nms = state.white ? WHITE_SET : [state.nm];
    const cols = nms.map((l) => Lab.wavelengthToRGB(l));
    if (state.fan) {
      const N = 24;
      const a = state.white ? 0.28 : 0.5;
      for (let j = 0; j < N; j++) {
        const b = (j + 0.5) / N;
        for (let c = 0; c < nms.length; c++) drawRay(b, nms[c], cols[c], { alpha: a, incoming: c === 0, inColour: state.white ? "rgba(240,236,220,0.3)" : undefined });
      }
    }
    // The selected ray, bright.
    let last = null;
    for (let c = 0; c < nms.length; c++) {
      last = drawRay(state.b, nms[c], cols[c], { alpha: 0.95, highlight: true, incoming: c === 0, inColour: state.white ? "rgba(255,250,235,0.95)" : undefined });
    }
    ctx.restore();

    // Angle annotations for the selected ray (mid colour in white light).
    const refNm = state.white ? 570 : state.nm;
    const ref = trace(state.b, refNm), P = ref.pts.map(toPx);
    const col = Lab.wavelengthToRGB(refNm);
    if (show1()) angleMark(P[2], ref.dir1, exitAngle(state.b, ref.n, 1), "θ₁", col);
    if (show2() && !show1()) angleMark(P[3], ref.dir2, exitAngle(state.b, ref.n, 2), "θ₂", col);

    // Entry marker and labels
    ctx.fillStyle = "#e9eef7";
    ctx.beginPath(); ctx.arc(P[0][0], P[0][1], 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.font = fpx(12) + " " + MONO;
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "center";
    fitText(narrow ? "ONE RAINDROP" : "ONE RAINDROP, SUNLIGHT FROM THE LEFT", narrow ? W / 2 : (d.x0 + d.x1) / 2, L.titleY, (d.x1 - d.x0) - 16);
    ctx.textAlign = "left";
    ctx.font = fpx(11) + " " + MONO;
    ctx.fillStyle = "#c9b98a";
    ctx.fillText("sunlight →", d.x0 + 8, Math.max(d.y0 + 14, d.cy - d.R - 14));
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "right";
    ctx.fillText("b = " + state.b.toFixed(3), d.x1 - 10, d.y1 - 8);
  }

  // ---------- Drawing: plot of exit angle against impact height, and the histogram ----------
  function drawPlot() {
    const P = L.plot, Hh = L.hist;
    const yOf = (t) => P.y + P.h * (1 - t / 90);
    const xOf = (b) => P.x + b * P.w;
    ctx.font = fpx(12) + " " + MONO;
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "center";
    const ty = narrow ? L.plotTitleY : L.titleY;
    fitText("EXIT ANGLE VS IMPACT HEIGHT", P.x + P.w / 2, ty, narrow ? P.w + 30 : P.w + 12);
    fitText(narrow ? "LIGHT" : "LIGHT PER DEGREE", Hh.x + Hh.w / 2, ty, Hh.w + 24);

    ctx.fillStyle = "#0a0f19";
    ctx.fillRect(P.x, P.y, P.w, P.h);
    ctx.fillRect(Hh.x, Hh.y, Hh.w, Hh.h);

    // Bow angles for the shown colour(s)
    const nmsAll = state.white ? [RED, VIOLET] : [state.nm];
    const b1 = nmsAll.map((l) => bowAngle(nWater(l), 1));
    const b2 = nmsAll.map((l) => bowAngle(nWater(l), 2));
    // Dark band: between the largest primary angle and the smallest secondary angle.
    if (show1() && show2()) {
      const top = Math.min(...b2), bot = Math.max(...b1);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(P.x, yOf(top), Hh.x + Hh.w - P.x, yOf(bot) - yOf(top));
      ctx.fillStyle = "#56647c";
      ctx.font = fpx(10) + " " + MONO;
      ctx.textAlign = "left";
      fitText("Alexander's dark band", P.x + 6, (yOf(top) + yOf(bot)) / 2 + 3, P.w - 12);
    }

    // Grid
    ctx.font = fpx(10) + " " + MONO;
    ctx.textAlign = "right";
    for (let t = 0; t <= 90; t += 10) {
      const y = Math.round(yOf(t)) + 0.5;
      ctx.strokeStyle = "#151e2e";
      ctx.beginPath(); ctx.moveTo(P.x, y); ctx.lineTo(P.x + P.w, y); ctx.moveTo(Hh.x, y); ctx.lineTo(Hh.x + Hh.w, y); ctx.stroke();
      if (t % (narrow ? 20 : 10) === 0) { ctx.fillStyle = "#56647c"; ctx.fillText(t + "°", P.x - 5, y + 3); }
    }
    ctx.textAlign = "center";
    for (const b of [0, 0.25, 0.5, 0.75, 1]) {
      const x = Math.round(xOf(b)) + 0.5;
      ctx.strokeStyle = "#151e2e";
      ctx.beginPath(); ctx.moveTo(x, P.y); ctx.lineTo(x, P.y + P.h); ctx.stroke();
      if (!narrow || b !== 0.25 && b !== 0.75) { ctx.fillStyle = "#56647c"; ctx.fillText(String(b), x, P.y + P.h + 14); }
    }
    ctx.fillStyle = "#7f8ea6";
    ctx.font = fpx(11) + " " + SANS;
    fitText("impact height (0 = centre, 1 = edge)", P.x + P.w / 2, P.y + P.h + 32, P.w + 30);

    // Reference lines at the bow angles across plot and histogram
    ctx.setLineDash([3, 4]);
    for (let c = 0; c < nmsAll.length; c++) {
      const col = Lab.wavelengthToRGB(nmsAll[c]);
      ctx.strokeStyle = rgba(col, 0.55);
      for (const [on, t] of [[show1(), b1[c]], [show2(), b2[c]]]) {
        if (!on) continue;
        const y = yOf(t);
        ctx.beginPath(); ctx.moveTo(P.x, y); ctx.lineTo(Hh.x + Hh.w, y); ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // Curves
    const nms = state.white ? WHITE_SET : [state.nm];
    ctx.save();
    ctx.beginPath(); ctx.rect(P.x, P.y, P.w, P.h); ctx.clip();
    for (const l of nms) {
      const n = nWater(l), col = Lab.wavelengthToRGB(l);
      for (const k of [1, 2]) {
        if (k === 1 ? !show1() : !show2()) continue;
        ctx.strokeStyle = rgba(col, state.white ? 0.75 : 0.95);
        ctx.lineWidth = state.white ? 1.2 : 1.8;
        ctx.beginPath();
        for (let j = 0; j <= 300; j++) {
          const b = Math.min(0.9999, 1 - Math.pow(1 - j / 300, 1.6));
          const x = xOf(b), y = yOf(exitAngle(b, n, k));
          j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.lineWidth = 1;

    // Turning points and the current ray
    const refNm = state.white ? 570 : state.nm, n = nWater(refNm);
    ctx.font = fpx(10) + " " + MONO;
    for (const k of [1, 2]) {
      if (k === 1 ? !show1() : !show2()) continue;
      const bs = descartesB(n, k), ts = exitAngle(bs, n, k);
      ctx.strokeStyle = "#e9eef7";
      ctx.beginPath(); ctx.arc(xOf(bs), yOf(ts), 5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#c9d4e3";
      const ly = k === 1 ? yOf(ts) + 16 : yOf(ts) - 9;
      const lbl = k === 1 ? "turning point: most light" : "turning point";
      const room = xOf(bs) - P.x - 8;
      if (ctx.measureText(lbl).width <= room) { ctx.textAlign = "right"; ctx.fillText(lbl, xOf(bs) - 6, ly); }
      else { ctx.textAlign = "left"; fitText(lbl, P.x + 4, ly, P.w - 8); }
      const tc = exitAngle(state.b, n, k);
      if (tc <= 90) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(xOf(state.b), yOf(tc), 3.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath(); ctx.moveTo(Math.round(xOf(state.b)) + 0.5, P.y); ctx.lineTo(Math.round(xOf(state.b)) + 0.5, P.y + P.h); ctx.stroke();

    drawHistogram(yOf);

    ctx.strokeStyle = "#1f2a3f";
    ctx.strokeRect(P.x + 0.5, P.y + 0.5, P.w - 1, P.h - 1);
    ctx.strokeRect(Hh.x + 0.5, Hh.y + 0.5, Hh.w - 1, Hh.h - 1);
  }

  // Sideways histogram of light per degree (0.5° bars), sharing the angle axis.
  function drawHistogram(yOf) {
    const Hh = L.hist;
    const NBAR = 180, PER = 5;
    const vals = new Float32Array(NBAR), cols = [];
    const u1 = show1() ? 1 : 0, u2 = show2() ? 1 : 0;
    if (state.white) {
      const HWs = ensureWhite();
      for (let j = 0; j < NBAR; j++) {
        let X = 0, Y = 0, Z = 0;
        for (let t = j * PER; t < (j + 1) * PER; t++) {
          for (let li = 0; li < LAMS.length; li++) {
            const v = u1 * HWs[li][0][t] + u2 * HWs[li][1][t], c = CMF[li];
            X += v * c[0]; Y += v * c[1]; Z += v * c[2];
          }
        }
        const rgb = xyz2rgb(X, Y, Z).map((v, ch) => Math.max(0, v * WB[ch]));
        const mx = Math.max(...rgb) || 1;
        cols.push(rgb.map((v) => Math.round(255 * Math.pow(v / mx, 1 / 2.2))));
        vals[j] = Y;
      }
    } else {
      const h = monoHist(state.nm), col = Lab.wavelengthToRGB(state.nm);
      for (let j = 0; j < NBAR; j++) {
        let v = 0;
        for (let t = j * PER; t < (j + 1) * PER; t++) v += u1 * h[0][t] + u2 * h[1][t];
        vals[j] = v; cols.push(col);
      }
    }
    let mx = 0;
    for (let j = 0; j < NBAR; j++) mx = Math.max(mx, vals[j]);
    if (!mx) return;
    for (let j = 0; j < NBAR; j++) {
      if (vals[j] <= 0) continue;
      const y0 = yOf((j + 1) * 0.5), y1 = yOf(j * 0.5);
      const w = (vals[j] / mx) * (Hh.w - 4);
      ctx.fillStyle = rgba(cols[j], 0.9);
      ctx.fillRect(Hh.x + 1, y0, Math.max(0.5, w), Math.max(1, y1 - y0 - 0.3));
    }
    ctx.fillStyle = "#56647c";
    ctx.font = fpx(10) + " " + MONO;
    ctx.textAlign = "center";
    fitText("more →", Hh.x + Hh.w / 2, Hh.y + Hh.h + 14, Hh.w);
  }

  function drawBench() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    if (L.divider) {
      ctx.strokeStyle = "#1a2436";
      ctx.beginPath(); ctx.moveTo(510.5, 20); ctx.lineTo(510.5, H - 20); ctx.stroke();
    } else {
      ctx.strokeStyle = "#1a2436";
      const y = Math.round(L.plotTitleY - 22) + 0.5;
      ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(W - 12, y); ctx.stroke();
    }
    drawDrop();
    drawPlot();
    dirty = false;
  }

  // ---------- Drawing: the sky canvas ----------
  function drawSide() {
    const P = S.side;
    const c = sctx;
    c.save();
    c.beginPath(); c.rect(P.x, P.y, P.w, P.h); c.clip();
    c.fillStyle = "#070b13";
    c.fillRect(P.x, P.y, P.w, P.h);
    const gy = P.y + P.h - 26;
    const ox = P.x + Math.min(60, P.w * 0.18), eyeY = gy - 24;
    const s = state.sun * DEG;
    // Ground
    c.fillStyle = "#0e1510";
    c.fillRect(P.x, gy, P.w, P.y + P.h - gy);
    c.strokeStyle = "#3a4a5e";
    c.beginPath(); c.moveTo(P.x, gy + 0.5); c.lineTo(P.x + P.w, gy + 0.5); c.stroke();
    // Rain
    c.fillStyle = "rgba(150,175,210,0.22)";
    for (let j = 0; j < 70; j++) {
      const x = P.x + ((j * 97) % 1000) / 1000 * P.w, y = P.y + ((j * 61 + 13) % 1000) / 1000 * (gy - P.y - 4);
      if (x < ox + 30) continue;
      c.fillRect(x, y, 1.2, 3);
    }
    // Sunlight: parallel rays travelling down and to the right at the sun's height.
    const dx = Math.cos(s), dy = Math.sin(s);
    c.strokeStyle = "rgba(240,210,120,0.22)";
    c.lineWidth = 1;
    for (let j = -3; j <= 3; j++) {
      const sx = ox - dx * 400 - dy * j * 34, sy = eyeY - dy * 400 + dx * j * 34;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + dx * 900, sy + dy * 900); c.stroke();
    }
    // Sun glyph where the ray through the eye leaves the panel
    const tSun = Math.min((ox - P.x - 16) / Math.max(dx, 1e-6), dy > 1e-6 ? (eyeY - P.y - 16) / dy : 1e9);
    const sunX = ox - dx * tSun, sunY = eyeY - dy * tSun;
    c.fillStyle = "#f0c860";
    c.beginPath(); c.arc(sunX, sunY, 7, 0, Math.PI * 2); c.fill();
    // Antisolar direction from the eye
    c.setLineDash([4, 4]);
    c.strokeStyle = "rgba(233,238,247,0.5)";
    const along = (gy - eyeY) / Math.max(dy, 1e-6);
    const aLen = Math.min(P.w, along);
    c.beginPath(); c.moveTo(ox, eyeY); c.lineTo(ox + dx * aLen, eyeY + dy * aLen); c.stroke();
    c.setLineDash([]);
    // Lines of sight at the bow angles
    const reach = Math.min(P.w - (ox - P.x) - 14, (eyeY - P.y) * 1.4);
    const lines = [];
    if (show1()) lines.push([bowAngle(nWater(RED), 1), RED], [bowAngle(nWater(VIOLET), 1), VIOLET]);
    if (show2()) lines.push([bowAngle(nWater(RED), 2), RED], [bowAngle(nWater(VIOLET), 2), VIOLET]);
    for (const [ang, l] of lines) {
      const e = (ang - state.sun) * DEG; // elevation of the line of sight
      let len = reach;
      if (e < 0) len = Math.min(len, (gy - eyeY) / Math.sin(-e));
      const ex = ox + Math.cos(e) * len, ey = eyeY - Math.sin(e) * len;
      c.strokeStyle = rgba(Lab.wavelengthToRGB(l), 0.85);
      c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(ox, eyeY); c.lineTo(ex, ey); c.stroke();
      if (e >= 0) {
        c.fillStyle = "rgba(140,180,235,0.9)";
        c.beginPath(); c.arc(ex, ey, 3, 0, Math.PI * 2); c.fill();
      }
    }
    c.lineWidth = 1;
    // Angle arc for the primary (or secondary) red line
    const mainAng = show1() ? bowAngle(nWater(RED), 1) : bowAngle(nWater(RED), 2);
    const aStart = s, aEnd = s - mainAng * DEG; // screen angles (y down): antisolar dir is +s
    c.strokeStyle = "rgba(233,238,247,0.6)";
    c.beginPath(); c.arc(ox, eyeY, 34, aEnd, aStart); c.stroke();
    c.fillStyle = "#e9eef7";
    c.font = fpx(11) + " " + MONO;
    c.textAlign = "left";
    const mid = (aStart + aEnd) / 2;
    c.fillText(Math.round(mainAng) + "°", ox + Math.cos(mid) * 40, eyeY + Math.sin(mid) * 40 + 4);
    // Observer
    c.strokeStyle = "#c9d4e3"; c.fillStyle = "#c9d4e3"; c.lineWidth = 1.6;
    c.beginPath(); c.arc(ox, eyeY - 2, 4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(ox, eyeY + 2); c.lineTo(ox, gy - 9); c.moveTo(ox, gy - 9); c.lineTo(ox - 4, gy); c.moveTo(ox, gy - 9); c.lineTo(ox + 4, gy);
    c.moveTo(ox - 5, eyeY + 8); c.lineTo(ox + 5, eyeY + 8); c.stroke();
    c.lineWidth = 1;
    c.restore();
    // Labels
    c.font = fpx(12) + " " + MONO;
    c.fillStyle = "#7f8ea6";
    c.textAlign = "center";
    fitTextOn(c, "SIDE VIEW", P.x + P.w / 2, narrow ? P.y - 8 : S.titleY, P.w);
    c.font = fpx(10) + " " + MONO;
    c.textAlign = "left";
    c.fillStyle = "#c9b98a";
    c.fillText("sun behind you", P.x + 6, P.y + P.h - 8);
    if (show1() && bowAngle(nWater(RED), 1) < state.sun) {
      c.fillStyle = "#f08a5d";
      c.textAlign = "right";
      fitTextOn(c, "primary bow below the horizon", P.x + P.w - 6, P.y + 14, P.w - 12);
    }
  }

  function drawView() {
    const V = S.view, c = sctx;
    const hy = V.y + buf.horizonY;
    c.save();
    c.beginPath(); c.rect(V.x, V.y, V.w, V.h); c.clip();
    // Dark rain-cloud sky behind the drops
    const g = c.createLinearGradient(0, V.y, 0, hy);
    g.addColorStop(0, "#0b111c");
    g.addColorStop(1, "#18202e");
    c.fillStyle = g;
    c.fillRect(V.x, V.y, V.w, hy - V.y);
    if (skyDirty) renderSkyBuffer();
    c.globalCompositeOperation = "lighter";
    c.imageSmoothingEnabled = true;
    c.drawImage(buf.off, V.x, V.y, buf.bw * 2, buf.bh * 2);
    // Falling drops, lit by the light they send at their angle
    const r = narrow ? 1.5 : 1.8;
    for (const d of RAIN) {
      const x = V.x + V.w / 2 + d.az * S.scale, y = hy - d.el * S.scale;
      const t = Math.min(NB - 1, (thetaAt(d.az, d.el) * 10) | 0) * 3;
      const k = 1.6;
      const R = tone(table[t] * k), G = tone(table[t + 1] * k), B = tone(table[t + 2] * k);
      c.fillStyle = `rgb(${Math.max(R, 28)},${Math.max(G, 34)},${Math.max(B, 46)})`;
      c.fillRect(x - r / 2, y - r * 1.4, r, r * 2.8);
    }
    c.globalCompositeOperation = "source-over";
    // Ground
    const gg = c.createLinearGradient(0, hy, 0, V.y + V.h);
    gg.addColorStop(0, "#111a14");
    gg.addColorStop(1, "#0a0f0c");
    c.fillStyle = gg;
    c.fillRect(V.x, hy, V.w, V.y + V.h - hy);
    c.strokeStyle = "#3a4a5e";
    c.beginPath(); c.moveTo(V.x, Math.round(hy) + 0.5); c.lineTo(V.x + V.w, Math.round(hy) + 0.5); c.stroke();
    // Antisolar point: the shadow of your head
    const ay = hy + state.sun * S.scale, ax = V.x + V.w / 2;
    c.font = fpx(10) + " " + MONO;
    if (ay < V.y + V.h - 4) {
      c.strokeStyle = "#c9d4e3";
      c.beginPath(); c.moveTo(ax - 6, ay); c.lineTo(ax + 6, ay); c.moveTo(ax, ay - 6); c.lineTo(ax, ay + 6); c.stroke();
      c.fillStyle = "#97a6b9";
      c.textAlign = "left";
      fitTextOn(c, "shadow of your head", ax + 10, Math.min(ay + 4, V.y + V.h - 6), V.w / 2 - 14);
    } else {
      c.fillStyle = "#97a6b9";
      c.textAlign = "center";
      fitTextOn(c, "shadow of your head: " + state.sun + "° below the horizon ↓", ax, V.y + V.h - 6, V.w - 12);
    }
    // Labels at the top of each bow, once enough drops have landed
    if (buf.n > buf.sky.length * 2) {
      c.textAlign = "center";
      const lab = (text, el, col) => {
        const y = hy - el * S.scale;
        if (y < V.y + 12 || y > hy - 4) return;
        c.fillStyle = col;
        fitTextOn(c, text, ax, y, V.w * 0.5);
      };
      const p1 = bowAngle(nWater(RED), 1), p2 = bowAngle(nWater(RED), 2);
      const fs = parseFloat(c.font) / S.scale; // label height in degrees
      if (show1()) lab("primary", bowAngle(nWater(VIOLET), 1) - state.sun - 1.5, "#e9eef7");
      if (show2()) lab("secondary", bowAngle(nWater(VIOLET), 2) - state.sun + 1.5 + fs, "#c9d4e3");
      if (show1() && show2()) lab("dark band", (p1 + p2) / 2 - state.sun - fs / 2, "#97a6b9");
    }
    // Elevation ticks
    c.fillStyle = "#56647c";
    c.textAlign = "left";
    for (let e = 10; e < 90; e += 10) {
      const y = hy - e * S.scale;
      if (y < V.y + 8) break;
      c.fillRect(V.x, Math.round(y), 5, 1);
      if (e % 20 === 0) c.fillText(e + "°", V.x + 7, y + 3);
    }
    c.restore();
    c.strokeStyle = "#1f2a3f";
    c.strokeRect(V.x + 0.5, V.y + 0.5, V.w - 1, V.h - 1);
    c.font = fpx(12) + " " + MONO;
    c.fillStyle = "#7f8ea6";
    c.textAlign = "center";
    fitTextOn(c, "FACING AWAY FROM THE SUN", V.x + V.w / 2, narrow ? V.y - 10 : S.titleY, V.w);
  }

  function drawSky() {
    sctx.fillStyle = "#05080e";
    sctx.fillRect(0, 0, SW, SH);
    drawSide();
    drawView();
  }

  // Shrink a one-line label (down to 10 px) only if it would not fit.
  function fitTextOn(c, text, x, y, maxW) {
    const m = /(\d+(?:\.\d+)?)px/.exec(c.font);
    let size = m ? +m[1] : 12;
    const base = c.font;
    while (size > 10 && c.measureText(text).width > maxW) {
      size -= 0.5;
      c.font = base.replace(/\d+(?:\.\d+)?px/, size + "px");
    }
    c.fillText(text, x, y);
    c.font = base;
  }
  const fitText = (text, x, y, maxW) => fitTextOn(ctx, text, x, y, maxW);

  // ---------- Readouts ----------
  const fmtA = (a) => a.toFixed(1) + "°";
  function exitRange(k) {
    if (!state.white) return fmtA(exitAngle(state.b, nWater(state.nm), k));
    const a = exitAngle(state.b, nWater(VIOLET), k), c = exitAngle(state.b, nWater(RED), k);
    return Math.min(a, c).toFixed(1) + "° to " + Math.max(a, c).toFixed(1) + "°";
  }
  function updateReadouts() {
    const n = nWater(state.white ? 570 : state.nm);
    $("wavelengthOut").textContent = state.nm + " nm";
    $("impactOut").textContent = state.b.toFixed(3);
    $("sunAltOut").textContent = state.sun + "°";
    $("theta1").textContent = show1() ? exitRange(1) : "–";
    $("theta2").textContent = show2() ? exitRange(2) : "–";
    $("dev").textContent = fmtA(devRad(state.b, n, 1) / DEG);
    $("power").textContent = (100 * power(state.b, n, 1)).toFixed(1) + "% / " + (100 * power(state.b, n, 2)).toFixed(1) + "%";
    $("bowSel").textContent = state.white ? "–" : fmtA(bowAngle(nWater(state.nm), 1)) + " and " + fmtA(bowAngle(nWater(state.nm), 2));
    $("bow1").textContent = fmtA(bowAngle(nWater(RED), 1)) + " / " + fmtA(bowAngle(nWater(VIOLET), 1));
    $("bow2").textContent = fmtA(bowAngle(nWater(RED), 2)) + " / " + fmtA(bowAngle(nWater(VIOLET), 2));
    updateDrops();
  }
  let lastDropsText = "";
  function updateDrops() {
    const t = Math.round(buf.n).toLocaleString("en-US");
    if (t !== lastDropsText) { lastDropsText = t; $("drops").textContent = t; }
  }

  // ---------- Accessibility, sounds and challenges ----------
  let lastSide1 = null, lastSide2 = null, bowSaid = false, belowSaid = null;
  function afterRayChange() {
    const n = nWater(state.white ? 570 : state.nm);
    const s1 = Math.sign(state.b - descartesB(n, 1)), s2 = Math.sign(state.b - descartesB(n, 2));
    if (show1() && lastSide1 !== null && s1 !== lastSide1) {
      W_.sound("tick", { pitch: 0.7 });
      W_.describe("The ray passed the primary turning point at impact height " + descartesB(n, 1).toFixed(2) + ". There it leaves at " + bowAngle(n, 1).toFixed(1) + "°, the largest angle any one-reflection ray reaches.", { now: true });
    } else if (show2() && lastSide2 !== null && s2 !== lastSide2) {
      W_.sound("tick", { pitch: 0.4 });
      W_.describe("The ray passed the secondary turning point at impact height " + descartesB(n, 2).toFixed(2) + ". There it leaves at " + bowAngle(n, 2).toFixed(1) + "°, the smallest angle any two-reflection ray reaches.", { now: true });
    }
    lastSide1 = s1; lastSide2 = s2;
    checkChallenges();
  }
  function checkChallenges() {
    if (!state.white && show1()) {
      const n = nWater(state.nm);
      if (Math.abs(exitAngle(state.b, n, 1) - bowAngle(n, 1)) < 0.1) W_.challenge("turning-point");
    }
    if (show1() && state.sun > bowAngle(nWater(RED), 1)) W_.challenge("below-horizon");
    if (!state.white && show2() && state.nm <= 420) {
      const n = nWater(state.nm);
      if (Math.abs(exitAngle(state.b, n, 2) - bowAngle(n, 2)) < 0.1) W_.challenge("violet-secondary");
    }
  }
  W_.describer(() => {
    const n = nWater(state.white ? 570 : state.nm);
    const parts = [];
    parts.push(state.white
      ? "A raindrop lit by white sunlight, with " + (state.fan ? "a fan of rays." : "one ray.")
      : "A raindrop lit by " + state.nm + " nm light, with " + (state.fan ? "a fan of rays." : "one ray."));
    if (show1()) parts.push("The selected ray enters at impact height " + state.b.toFixed(2) + " and after one reflection leaves at " + exitAngle(state.b, n, 1).toFixed(1) + "° from the point opposite the sun; no one-reflection ray leaves at more than " + bowAngle(n, 1).toFixed(1) + "°.");
    if (show2()) parts.push("After two reflections it leaves at " + exitAngle(state.b, n, 2).toFixed(1) + "°; no two-reflection ray leaves at less than " + bowAngle(n, 2).toFixed(1) + "°.");
    const top = bowAngle(nWater(RED), 1) - state.sun;
    parts.push(top > 0
      ? "The sun is " + state.sun + "° high, so the top of the primary bow is " + top.toFixed(0) + "° above the horizon."
      : "The sun is " + state.sun + "° high, so the whole primary bow is below the horizon.");
    return parts.map(T).join(" ");
  });

  // ---------- Loop ----------
  let lastT = performance.now(), lastStats = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (state.running) {
      const m = buf.sky.length;
      const rate = Math.min(25000, Math.max(450, buf.n * 0.035));
      sampleDrops(Math.round(rate * dt * 60));
      moveRain(dt);
      if (!bowSaid && buf.n > m * 6) {
        bowSaid = true;
        W_.sound("event", { pitch: 0.6 });
        W_.describe(show1() && show2()
          ? "Enough drops have fallen for the bows to show: a bright primary bow, a fainter secondary bow and the darker band between them."
          : "Enough drops have fallen for the bow to show clearly.");
      }
      if (now - lastStats > 200) { lastStats = now; updateDrops(); }
    }
    if (dirty) drawBench();
    drawSky();
    requestAnimationFrame(frame);
  }

  // ---------- Controls ----------
  function press(ids, on) { for (const id of ids) $(id).setAttribute("aria-pressed", String(id === on)); }
  function changed() { dirty = true; updateReadouts(); }
  function setLight(white) {
    state.white = white;
    press(["lightOne", "lightWhite"], white ? "lightWhite" : "lightOne");
    lastSide1 = lastSide2 = null;
    changed(); afterRayChange();
  }
  function setFan(fan) {
    state.fan = fan;
    press(["raysOne", "raysFan"], fan ? "raysFan" : "raysOne");
    changed();
  }
  function setRefl(r) {
    state.refl = r;
    press(["refl1", "refl2", "reflBoth"], r === 1 ? "refl1" : r === 2 ? "refl2" : "reflBoth");
    lastSide1 = lastSide2 = null;
    changed(); afterRayChange(); skyDirty = true;
    W_.describe(r === 1 ? "Showing light that leaves after one reflection: the primary bow."
      : r === 2 ? "Showing light that leaves after two reflections: the secondary bow."
        : "Showing light after one and two reflections: both bows.", { now: true });
  }
  function setB(b) {
    state.b = Math.max(0, Math.min(0.995, Math.round(b * 1000) / 1000));
    $("impact").value = String(state.b);
    changed(); afterRayChange();
  }
  function setNm(nm, fromKey) {
    state.nm = Math.max(400, Math.min(700, Math.round(nm / 5) * 5));
    $("wavelength").value = String(state.nm);
    if (state.white) setLight(false);
    lastSide1 = lastSide2 = null;
    changed(); afterRayChange();
    if (fromKey) W_.describe("Wavelength " + state.nm + " nm. The primary bow for this colour is at " + bowAngle(nWater(state.nm), 1).toFixed(1) + "° and the secondary at " + bowAngle(nWater(state.nm), 2).toFixed(1) + "°.");
  }
  function setSun(s) {
    state.sun = s;
    computeThetaMap();
    seedRainIfNeeded();
    changed(); checkChallenges();
    const top = bowAngle(nWater(RED), 1) - s;
    const below = top <= 0;
    if (below !== belowSaid) {
      if (belowSaid !== null) {
        W_.sound(below ? "fail" : "event");
        W_.describe(below ? "The sun is " + s + "° high. The primary bow has sunk completely below the horizon." : "The sun is " + s + "° high. The top of the primary bow is back above the horizon.", { now: true });
      }
      belowSaid = below;
    }
  }
  function seedRainIfNeeded() { if (!RAIN.length) seedRain(); }
  function setPlay(on) {
    state.running = on;
    $("play").textContent = on ? "Pause" : "Play";
    if (!on && buf.n < buf.sky.length) prefill();
  }

  $("lightOne").addEventListener("click", () => setLight(false));
  $("lightWhite").addEventListener("click", () => setLight(true));
  $("raysOne").addEventListener("click", () => setFan(false));
  $("raysFan").addEventListener("click", () => setFan(true));
  $("refl1").addEventListener("click", () => setRefl(1));
  $("refl2").addEventListener("click", () => setRefl(2));
  $("reflBoth").addEventListener("click", () => setRefl(3));
  $("wavelength").addEventListener("input", (e) => setNm(+e.target.value));
  $("impact").addEventListener("input", (e) => setB(+e.target.value));
  $("sunAlt").addEventListener("input", (e) => setSun(+e.target.value));
  $("skyMono").addEventListener("change", (e) => { state.skyMono = e.target.checked; skyDirty = true; });
  $("play").addEventListener("click", () => setPlay(!state.running));
  $("clearSky").addEventListener("click", () => { clearSky(); updateDrops(); W_.describe("The sky was cleared. Watch the bows build up again as drops fall.", { now: true }); });

  // Pointer: drag on the drop (vertical position) or on the plot (horizontal position).
  function logical(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
  }
  let drag = null;
  function dragTo(p) {
    if (drag === "drop") setB(Math.abs(L.drop.cy - p[1]) / L.drop.R);
    else if (drag === "plot") setB((p[0] - L.plot.x) / L.plot.w);
  }
  canvas.addEventListener("pointerdown", (e) => {
    const p = logical(e), d = L.drop, P = L.plot;
    if (p[0] >= P.x - 8 && p[0] <= P.x + P.w + 8 && p[1] >= P.y && p[1] <= P.y + P.h) drag = "plot";
    else if (p[0] >= d.x0 && p[0] <= d.x1 && p[1] >= d.y0 && p[1] <= d.y1) drag = "drop";
    else return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    dragTo(p);
    e.preventDefault();
  });
  canvas.addEventListener("pointermove", (e) => { if (drag) dragTo(logical(e)); });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    const n = nWater(state.white ? 570 : state.nm);
    if (show1()) W_.describe("Impact height " + state.b.toFixed(3) + ": the primary ray leaves at " + exitAngle(state.b, n, 1).toFixed(1) + "°.");
    else W_.describe("Impact height " + state.b.toFixed(3) + ": the secondary ray leaves at " + exitAngle(state.b, n, 2).toFixed(1) + "°.");
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // Keyboard on the main picture.
  canvas.addEventListener("keydown", (e) => {
    const k = e.key, fine = e.shiftKey;
    let handled = true;
    if (k === "ArrowUp" || k === "ArrowDown") {
      setB(state.b + (k === "ArrowUp" ? 1 : -1) * (fine ? 0.001 : 0.01));
      const n = nWater(state.white ? 570 : state.nm);
      W_.describe("Impact height " + state.b.toFixed(3) + ": " + (show1() ? "the primary ray leaves at " + exitAngle(state.b, n, 1).toFixed(1) + "°." : "the secondary ray leaves at " + exitAngle(state.b, n, 2).toFixed(1) + "°."));
    } else if (k === "ArrowLeft" || k === "ArrowRight") setNm(state.nm + (k === "ArrowRight" ? 1 : -1) * (fine ? 5 : 10), true);
    else if (k === "Enter") setFan(!state.fan);
    else if (k === "1") setRefl(1);
    else if (k === "2") setRefl(2);
    else if (k === "3") setRefl(3);
    else if (k === "w" || k === "W") setLight(!state.white);
    else handled = false;
    if (handled) e.preventDefault();
  });

  // Re-layout when the bench changes width; the state is kept.
  let lastCW = 0;
  function onResize() {
    const cw = Math.round(canvas.parentElement.clientWidth);
    if (cw === lastCW) return;
    lastCW = cw;
    const oldW = W, wasNarrow = narrow;
    const oldCounts = buf;
    if (!wasNarrow && cw >= 640 && oldW === 960 && oldCounts) { return; }
    layout();
    seedRain();
    updateReadouts();
  }

  layout();
  lastCW = Math.round(canvas.parentElement.clientWidth);
  seedRain();
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvas.parentElement);
  else window.addEventListener("resize", onResize);
  if (Lab.reducedMotion) setPlay(false);
  belowSaid = bowAngle(nWater(RED), 1) - state.sun <= 0;
  updateReadouts();
  afterRayChange();
  requestAnimationFrame(frame);
})();
