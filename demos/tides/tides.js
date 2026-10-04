(function () {
  const canvas = document.getElementById("bench");
  const $ = (id) => document.getElementById(id);
  const tr = (s) => (window.I18N ? window.I18N.t(s) : s);

  // ---------- Physics (SI units; distances to the Moon in Earth radii) ----------
  const G = 6.674e-11, M_MOON = 7.342e22, M_EARTH = 5.972e24, M_SUN = 1.989e30;
  const R_E = 6.371e6, AU = 1.496e11, SUN_D = AU / R_E;
  const D_REF = 60.3;                 // today's mean distance, Earth radii (384,400 km)
  const T_EARTH = 23.9345;            // Earth's turn relative to the stars, hours
  const T_MOON_REF = 27.3217 * 24;    // Moon's orbit relative to the stars at D_REF, hours
  const T_YEAR = 365.256 * 24;        // the Sun's apparent trip round the sky, hours
  const SPEEDS = [0.5, 1, 2, 4, 8, 24, 72]; // simulated hours per real second
  const TAU = Math.PI * 2;

  // Equilibrium tide scale (m): (M/M_E)(R/d)³R. Bulges rise by this, low belts drop by half.
  const kTide = (m, dR) => (m / M_EARTH) * Math.pow(1 / dR, 3) * R_E;
  const K_SUN = kTide(M_SUN, SUN_D);
  const K_REF = kTide(M_MOON, D_REF);
  const tidalAcc = (dR) => 2 * G * M_MOON * R_E / Math.pow(dR * R_E, 3); // 2GMr/d³
  const A_REF = tidalAcc(D_REF);
  const moonPeriod = (dR) => T_MOON_REF * Math.pow(dR / D_REF, 1.5); // Kepler's third law
  const shape = (psi) => { const c = Math.cos(psi); return 1.5 * c * c - 0.5; };

  // ---------- State ----------
  const START = { moon: 0.42, sunA: 0 };
  const state = {
    d: D_REF, sun: false, speedIdx: 3, mode: "tidal", measured: false,
    running: !Lab.reducedMotion,
    t: 0, earth: START.moon - Math.PI / 2, moon: START.moon, sunA: START.sunA,
  };
  const rates = () => ({ e: TAU / T_EARTH, m: TAU / moonPeriod(state.d), s: TAU / T_YEAR });
  const kMoon = () => kTide(M_MOON, state.d);

  // Tide at the town (on the equator, at Earth-fixed longitude 0), `ago` hours before now.
  function townTide(ago, withSun, r) {
    const e = state.earth - r.e * ago, m = state.moon - r.m * ago;
    let h = kMoon() * shape(e - m);
    if (withSun) h += K_SUN * shape(e - (state.sunA - r.s * ago));
    return h;
  }

  // ---------- Layout ----------
  let W = 960, H = 540, narrow = false, ctx, S = 1;
  let OX = 270, OY = 270;                    // Earth's centre in the orbit view
  let C1 = { x: 600, y: 46, w: 336, h: 168 }, C2 = { x: 600, y: 300, w: 336, h: 160 };
  let FS = 12, FT = 10;                      // title and tick font sizes
  const mono = (n) => n + "px 'IBM Plex Mono', ui-monospace, monospace";
  const sans = (n) => n + "px 'IBM Plex Sans', system-ui, sans-serif";

  function layout() {
    const cw = Math.round(canvas.clientWidth || canvas.parentElement.clientWidth || 960);
    narrow = cw < 640;
    if (!narrow) {
      W = 960; H = 540; S = 1; OX = 272; OY = 270;
      C1 = { x: 604, y: 46, w: 332, h: 168 };
      C2 = { x: 604, y: 300, w: 332, h: 160 };
      FS = 12; FT = 10;
    } else {
      W = Math.max(280, cw); S = W / 540; OX = W / 2; OY = W / 2 + 30;
      FS = 12; FT = 11;
      const left = 46;
      C1 = { x: left, y: W + 40 + 34, w: W - left - 12, h: 150 };
      C2 = { x: left, y: C1.y + C1.h + 72, w: W - left - 12, h: 140 };
      H = Math.round(C2.y + C2.h + 78 + (state.measured ? 30 : 0));
    }
    ctx = Lab.setupCanvas(canvas, W, H);
  }
  layout();

  // Earth's drawn radius, ocean shell and bulge scale (pixels).
  const RD = () => 88 * S, SHELL = () => 15 * S, VB = () => 24 * S;
  const orbitR = () => (172 + 52 * (state.d - 20) / 80) * S;
  // Drawn sizes follow the real value up to today's, then grow more slowly so a close Moon stays on the bench.
  const soft = (x) => (x <= 1 ? x : 1 + 1.3 * Math.tanh((x - 1) / 1.3));

  // ---------- Gravity at points around Earth ----------
  // Pull of a body of mass M at angle ang, distance dR (Earth radii), on a surface point at angle a.
  function pullAt(M, ang, dR, a, rFrac) {
    const Dx = dR * R_E * Math.cos(ang), Dy = dR * R_E * Math.sin(ang);
    const px = rFrac * R_E * Math.cos(a), py = rFrac * R_E * Math.sin(a);
    const dx = Dx - px, dy = Dy - py, q = Math.hypot(dx, dy);
    const f = G * M / (q * q * q);
    return [f * dx, f * dy];
  }
  function tidalAt(M, ang, dR, a) {
    const p = pullAt(M, ang, dR, a, 1), c = pullAt(M, ang, dR, 0, 0);
    return [p[0] - c[0], p[1] - c[1]];
  }

  // ---------- Drawing helpers ----------
  const P = (r, a) => [OX + r * Math.cos(a), OY - r * Math.sin(a)];
  function arrow(x, y, dx, dy, col, w) {
    const L = Math.hypot(dx, dy);
    if (L < 0.5) return;
    const ux = dx / L, uy = dy / L, hd = Math.min(7 * Math.max(0.75, S), L * 0.45);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx - ux * hd * 0.6, y + dy - uy * hd * 0.6); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + dx, y + dy);
    ctx.lineTo(x + dx - ux * hd - uy * hd * 0.5, y + dy - uy * hd + ux * hd * 0.5);
    ctx.lineTo(x + dx - ux * hd + uy * hd * 0.5, y + dy - uy * hd - ux * hd * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = 1;
  }
  function fitText(text, x, y, maxW) {
    const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
    let size = m ? +m[1] : 12;
    const base = ctx.font;
    while (size > 10 && ctx.measureText(text).width > maxW) {
      size -= 0.5;
      ctx.font = base.replace(/\d+(?:\.\d+)?px/, size + "px");
    }
    ctx.fillText(text, x, y);
    ctx.font = base;
  }
  function wrapText(text, x, y, maxW, lh) {
    text = tr(text);
    const cjk = /[　-鿿]/.test(text);
    const words = cjk ? [...text] : text.split(" ");
    const sep = cjk ? "" : " ";
    let line = "";
    for (const w of words) {
      const t = line ? line + sep + w : w;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; }
      else line = t;
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  }
  // A label kept inside the orbit view.
  function label(text, x, y, col, size) {
    ctx.font = mono(size || (narrow ? 11 : 11));
    const w = ctx.measureText(text).width;
    const half = narrow ? W / 2 : 540 / 2 + 2;
    const lo = OX - half + 6, hi = OX + half - 6;
    const cx = Math.max(lo + w / 2, Math.min(hi - w / 2, x));
    ctx.fillStyle = col; ctx.textAlign = "center";
    ctx.fillText(text, cx, y);
  }

  // Fixed background stars for the orbit view.
  const stars = [];
  { let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) stars.push([rnd(), rnd(), rnd()]); }

  // ---------- Orbit view ----------
  function drawOrbit(an) {
    const Rd = RD(), side = narrow ? W : 540, sideH = narrow ? W + 40 : 540;
    const x0 = OX - side / 2, y0 = narrow ? 0 : OY - side / 2;
    for (const [u, v, b] of stars) {
      ctx.fillStyle = `rgba(201,212,227,${0.12 + b * 0.25})`;
      ctx.fillRect(x0 + u * side, y0 + v * sideH, 1.2, 1.2);
    }
    const kM = kMoon(), gM = soft(kM / K_REF), sunRel = K_SUN / K_REF;
    const rO = orbitR();

    // Orbit path
    ctx.strokeStyle = "#1f2a3f"; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(OX, OY, rO, 0, TAU); ctx.stroke(); ctx.setLineDash([]);

    // Sun direction
    if (state.sun) {
      const [sx, sy] = P(Math.min(side / 2 - 18 * S, rO + 26 * S), state.sunA);
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26 * S);
      g.addColorStop(0, "rgba(255,214,120,0.95)"); g.addColorStop(0.35, "rgba(255,190,90,0.55)"); g.addColorStop(1, "rgba(255,190,90,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 26 * S, 0, TAU); ctx.fill();
      ctx.fillStyle = "#ffd98a"; ctx.beginPath(); ctx.arc(sx, sy, 7 * Math.max(S, 0.8), 0, TAU); ctx.fill();
      label("to the Sun", sx, sy + (Math.sin(state.sunA) > 0 ? 26 : -18) * Math.max(S, 0.8), "#f0c870");
    }

    // The Earth–Moon line
    {
      const [ax, ay] = P(rO, state.moon), [bx, by] = P(rO * 0.8, state.moon + Math.PI);
      ctx.strokeStyle = "rgba(201,212,227,0.16)"; ctx.setLineDash([2, 6]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
    }

    // Ocean: the equilibrium surface, greatly exaggerated
    const N = 180;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU;
      let h = gM * shape(a - state.moon);
      if (state.sun) h += sunRel * shape(a - state.sunA);
      const [x, y] = P(Rd + SHELL() + VB() * h, a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    const og = ctx.createRadialGradient(OX, OY, Rd * 0.9, OX, OY, Rd + SHELL() + VB() * 2.5);
    og.addColorStop(0, "#1c5ea6"); og.addColorStop(1, "#3f95e0");
    ctx.fillStyle = og; ctx.fill();
    ctx.strokeStyle = "rgba(140,200,255,0.8)"; ctx.lineWidth = 1.3; ctx.stroke(); ctx.lineWidth = 1;

    // Solid Earth, turning
    const rg = ctx.createRadialGradient(OX - Rd * 0.3, OY - Rd * 0.3, Rd * 0.1, OX, OY, Rd);
    rg.addColorStop(0, "#3d4a3a"); rg.addColorStop(1, "#232c25");
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(OX, OY, Rd, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(201,212,227,0.10)";
    for (let k = 0; k < 12; k++) {
      const a = state.earth + k * TAU / 12;
      const [x1, y1] = P(Rd * 0.2, a), [x2, y2] = P(Rd * 0.97, a);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(OX, OY, Rd * 0.55, 0, TAU); ctx.stroke();
    ctx.fillStyle = "rgba(225,235,245,0.75)"; ctx.beginPath(); ctx.arc(OX, OY, Rd * 0.17, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2a3346"; ctx.font = mono(Math.max(10, Math.round(11 * S))); ctx.textAlign = "center";
    ctx.fillText("N", OX, OY + 4);

    // Arrows
    drawArrows(Rd);

    // Town and its tide gauge
    let hT = gM * shape(state.earth - state.moon);
    if (state.sun) hT += sunRel * shape(state.earth - state.sunA);
    const surf = Rd + SHELL() + VB() * hT;
    const [tx, ty] = P(Rd, state.earth), [sx2, sy2] = P(surf, state.earth);
    ctx.strokeStyle = "#f0b35a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(sx2, sy2); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = "#f0b35a"; ctx.beginPath(); ctx.arc(tx, ty, 4.5 * Math.max(S, 0.8), 0, TAU); ctx.fill();
    ctx.strokeStyle = "#ffe2b0"; ctx.beginPath();
    const [g1x, g1y] = P(surf, state.earth - 0.05), [g2x, g2y] = P(surf, state.earth + 0.05);
    ctx.moveTo(g1x, g1y); ctx.lineTo(g2x, g2y); ctx.stroke();
    const [lx, ly] = P(surf + 16 * Math.max(S, 0.8), state.earth);
    label("Town", lx, ly + 4, "#f0b35a");

    // Bulge labels, fixed to the Moon's direction
    const hiR = Rd + SHELL() + VB() * Math.max(1, gM) + (state.mode === "tidal" ? 18 : 12) * Math.max(S, 0.8);
    for (const off of [0, Math.PI]) {
      const la = state.moon + off + 0.42;
      if (Math.cos(la - state.earth) > 0.92) continue;
      const [bx, by] = P(hiR + (narrow ? 4 : 10), la);
      label("high tide", bx, by + 4, "#8fd0ff");
    }
    for (const off of [Math.PI / 2, -Math.PI / 2]) {
      const la = state.moon + off + 0.3;
      if (Math.cos(la - state.earth) > 0.92) continue;
      const [bx, by] = P(Rd + SHELL() + 10 * Math.max(S, 0.8), la);
      label("low", bx, by + 4, "#6f8fb3");
    }

    // Moon, lit on the side facing the Sun when the Sun is shown
    const [mx, my] = P(rO, state.moon), mr = 12 * Math.max(S, 0.75);
    ctx.fillStyle = state.sun ? "#2c3240" : "#c9ced8";
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    if (state.sun) {
      ctx.fillStyle = "#d9dde6";
      ctx.beginPath(); ctx.arc(mx, my, mr, -state.sunA - Math.PI / 2, -state.sunA + Math.PI / 2); ctx.closePath(); ctx.fill();
    }
    label("Moon", mx, my + (Math.sin(state.moon) > 0 ? mr + 14 : -mr - 6), "#c9ced8");

    // Captions
    ctx.font = mono(narrow ? 11 : 11); ctx.textAlign = "left"; ctx.fillStyle = "#7f8ea6";
    const tx0 = OX - side / 2 + 10;
    fitText(state.mode === "pull" ? "THE MOON'S PULL" : state.mode === "sub" ? "PULL MINUS THE AVERAGE" : "TIDAL FORCE", tx0, y0 + 18, side - 20);
    ctx.font = sans(11);
    ctx.fillStyle = "#93a3bb";
    const ex = exaggeration(gM);
    fitText("Not to scale. Bulges drawn " + ex + " million times too tall", tx0, y0 + sideH - 12, side - 20);
    ctx.fillStyle = "#93a3bb";
    if (modeNote) fitText(modeNote, tx0, y0 + 34, side - 20);
  }

  function exaggeration(gM) {
    const pxPerM = RD() / R_E;
    const real = kMoon();
    const drawn = VB() * gM;
    const x = drawn / pxPerM / real / 1e6;
    return x >= 10 ? x.toFixed(0) : x.toFixed(1);
  }

  let modeNote = "";
  function drawArrows(Rd) {
    const n = 12, base = 52 * S, Lpull = 64 * S;
    const c = pullAt(M_MOON, state.moon, state.d, 0, 0), cMag = Math.hypot(c[0], c[1]);
    const sp = Lpull / cMag;                 // pixels per m/s² for the pull views
    const st = base / A_REF;                 // pixels per m/s² for the tidal view (today's near side = base)
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + state.moon;
      pts.push({ a, xy: P(Rd, a) });
    }
    if (state.mode === "pull" || state.mode === "sub") {
      for (const p of pts) {
        const f = pullAt(M_MOON, state.moon, state.d, p.a, 1);
        const dx = f[0] * sp, dy = -f[1] * sp;
        arrow(p.xy[0], p.xy[1], dx, dy, state.mode === "pull" ? "rgba(240,179,90,0.9)" : "rgba(240,179,90,0.45)", 1.6);
        if (state.mode === "sub") {
          // The returning grey arrow is drawn a few pixels to one side so both stay visible.
          const ox = c[1] / cMag * 3.5 * Math.max(S, 0.8), oy = c[0] / cMag * 3.5 * Math.max(S, 0.8);
          arrow(p.xy[0] + dx + ox, p.xy[1] + dy + oy, -c[0] * sp, c[1] * sp, "rgba(170,180,210,0.8)", 1.4);
          const t = [f[0] - c[0], f[1] - c[1]];
          ctx.fillStyle = "#5cc8ff";
          ctx.beginPath(); ctx.arc(p.xy[0] + t[0] * sp, p.xy[1] - t[1] * sp, 2.4, 0, TAU); ctx.fill();
        }
      }
      arrow(OX, OY, c[0] * sp, -c[1] * sp, "#f0b35a", 3);
      const near = tidalAt(M_MOON, state.moon, state.d, state.moon);
      const pct = Math.hypot(near[0], near[1]) / cMag * 100;
      modeNote = state.mode === "pull"
        ? "Thick arrow: the average pull, felt at the centre"
        : "Grey: the average pull taken away. Blue dots: what is left, only " + pct.toFixed(1) + "% of the pull";
    } else {
      let nearLen = 0, nearMag = 0;
      for (const p of pts) {
        const f = tidalAt(M_MOON, state.moon, state.d, p.a);
        if (state.sun) { const s = tidalAt(M_SUN, state.sunA, SUN_D, p.a); f[0] += s[0]; f[1] += s[1]; }
        const mag = Math.hypot(f[0], f[1]);
        const L = base * soft(mag * st / base);
        if (p.a === state.moon) { nearLen = L; nearMag = mag; }
        arrow(p.xy[0], p.xy[1], f[0] / mag * L, -f[1] / mag * L, "#5cc8ff", 2);
      }
      const mag = nearLen / (nearMag * sp);
      modeNote = "Drawn " + (mag >= 10 ? mag.toFixed(0) : mag.toFixed(1)) + " times longer than the pull arrows. Zero at the centre";
    }
  }

  // ---------- Charts ----------
  function niceStep(maxV) {
    for (const s of [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20]) if (maxV / s <= 3) return s;
    return 50;
  }
  const signed = (v, dec) => (v > 0.0005 ? "+" : "") + v.toFixed(dec) + " m";

  function chartFrame(C, title, ymax, xTicks) {
    ctx.font = mono(FS); ctx.fillStyle = "#7f8ea6"; ctx.textAlign = "center";
    fitText(title, C.x + C.w / 2 - (narrow ? 20 : 0), C.y - 12, narrow ? W - 16 : C.w + 60);
    ctx.fillStyle = "#0a0f19"; ctx.fillRect(C.x, C.y, C.w, C.h);
    const yOf = (v) => C.y + C.h / 2 - (v / ymax) * (C.h / 2 - 6);
    const step = niceStep(ymax);
    const dec = step < 0.1 ? 2 : step < 1 ? (step === 0.25 ? 2 : 1) : 0;
    ctx.font = mono(FT); ctx.textAlign = "right";
    for (let v = -Math.floor(ymax / step) * step; v <= ymax + 1e-9; v += step) {
      const y = Math.round(yOf(v)) + 0.5;
      ctx.strokeStyle = Math.abs(v) < 1e-9 ? "#2a3852" : "#151e2e";
      ctx.beginPath(); ctx.moveTo(C.x, y); ctx.lineTo(C.x + C.w, y); ctx.stroke();
      ctx.fillStyle = "#56647c";
      ctx.fillText(Math.abs(v) < 1e-9 ? "0" : signed(v, dec), C.x - 4, y + 3);
    }
    ctx.textAlign = "center";
    for (const [frac, txt] of xTicks) {
      const x = Math.round(C.x + frac * C.w) + 0.5;
      ctx.strokeStyle = "#151e2e";
      ctx.beginPath(); ctx.moveTo(x, C.y); ctx.lineTo(x, C.y + C.h); ctx.stroke();
      ctx.fillStyle = frac === 1 ? "#f0b35a" : "#56647c";
      ctx.textAlign = frac === 1 ? "right" : frac === 0 ? "left" : "center";
      ctx.fillText(txt, frac === 1 ? x + 2 : x, C.y + C.h + 14);
    }
    ctx.textAlign = "center";
    return yOf;
  }

  // The last 48 hours, sampled every 0.1 h, with highs and lows found by parabolic fits.
  const SPAN1 = 48, STEP1 = 0.1, N1 = Math.round(SPAN1 / STEP1);
  const buf1 = new Float64Array(N1 + 1), buf1m = new Float64Array(N1 + 1);
  function analyse() {
    const r = rates();
    for (let i = 0; i <= N1; i++) {
      const ago = SPAN1 - i * STEP1;
      buf1[i] = townTide(ago, state.sun, r);
      buf1m[i] = state.sun ? townTide(ago, false, r) : buf1[i];
    }
    const highs = [], lows = [];
    for (let i = 1; i < N1; i++) {
      const a = buf1[i - 1], b = buf1[i], c = buf1[i + 1];
      const isHi = b > a && b >= c, isLo = b < a && b <= c;
      if (!isHi && !isLo) continue;
      const den = a - 2 * b + c;
      const off = den !== 0 ? 0.5 * (a - c) / den : 0;
      const v = b - 0.25 * (a - c) * off;
      (isHi ? highs : lows).push({ t: (i + off) * STEP1, v });
    }
    const gap = highs.length >= 2 ? highs[highs.length - 1].t - highs[highs.length - 2].t : null;
    const lastH = highs[highs.length - 1], lastL = lows[lows.length - 1];
    const range = lastH && lastL ? lastH.v - lastL.v : null;
    return { highs, lows, gap, range };
  }

  function drawChart1(an) {
    const C = C1;
    const ymax = (kMoon() + (state.sun ? K_SUN : 0)) * 1.15;
    const ticks = [];
    for (let h = 0; h <= SPAN1; h += narrow ? 24 : 12) ticks.push([h / SPAN1, h === SPAN1 ? "now" : "−" + (SPAN1 - h) + " h"]);
    const yOf = chartFrame(C, "TIDE AT THE TOWN, LAST " + SPAN1 + " HOURS", ymax, ticks);
    const xOf = (i) => C.x + (i / N1) * C.w;
    ctx.save(); ctx.beginPath(); ctx.rect(C.x, C.y, C.w, C.h); ctx.clip();
    if (state.sun) {
      ctx.strokeStyle = "rgba(201,212,227,0.35)"; ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i <= N1; i++) i === 0 ? ctx.moveTo(xOf(i), yOf(buf1m[i])) : ctx.lineTo(xOf(i), yOf(buf1m[i]));
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = "#5cc8ff"; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= N1; i++) i === 0 ? ctx.moveTo(xOf(i), yOf(buf1[i])) : ctx.lineTo(xOf(i), yOf(buf1[i]));
    ctx.stroke(); ctx.lineWidth = 1;
    ctx.restore();
    // High-tide marks and the gap between the last two
    ctx.fillStyle = "#f0b35a";
    for (const h of an.highs) {
      const x = C.x + (h.t / SPAN1) * C.w, y = yOf(h.v);
      ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x - 4, y - 10); ctx.lineTo(x + 4, y - 10); ctx.closePath(); ctx.fill();
    }
    if (an.highs.length >= 2) {
      const a = an.highs[an.highs.length - 2], b = an.highs[an.highs.length - 1];
      const xa = C.x + (a.t / SPAN1) * C.w, xb = C.x + (b.t / SPAN1) * C.w;
      const y = C.y + C.h - 12;
      ctx.strokeStyle = "rgba(240,179,90,0.7)";
      ctx.beginPath(); ctx.moveTo(xa, y - 4); ctx.lineTo(xa, y); ctx.lineTo(xb, y); ctx.lineTo(xb, y - 4); ctx.stroke();
      ctx.font = mono(FT); ctx.fillStyle = "#f0b35a"; ctx.textAlign = "center";
      const txt = fmtGap(an.gap), tw = ctx.measureText(tr(txt)).width;
      const cx = Math.max(C.x + tw / 2 + 4, Math.min(C.x + C.w - tw / 2 - 4, (xa + xb) / 2));
      ctx.fillStyle = "#0a0f19"; ctx.fillRect(cx - tw / 2 - 3, y - 6, tw + 6, 13);
      ctx.fillStyle = "#f0b35a"; ctx.fillText(txt, cx, y + 4);
    }
    // Now
    const yn = yOf(buf1[N1]);
    ctx.fillStyle = "#f0b35a"; ctx.beginPath(); ctx.arc(C.x + C.w, yn, 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#1f2a3f"; ctx.strokeRect(C.x + 0.5, C.y + 0.5, C.w - 1, C.h - 1);
    ctx.font = sans(11); ctx.fillStyle = "#93a3bb"; ctx.textAlign = "left";
    const cap = state.sun ? "Blue: Moon and Sun together. Dashed: the Moon alone" : "Two highs a day, each marked with a triangle";
    fitText(cap, C.x, C.y + C.h + 30, (narrow ? W - C.x - 8 : C.w));
  }

  // ---------- Measured data: four days of the Halifax tide gauge ----------
  const TD = window.TIDE_DATA;
  const halifax = (() => {
    if (!TD) return null;
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const mM = mean(TD.measured), mE = mean(TD.model);
    const meas = TD.measured.map((v) => v - mM), model = TD.model.map((v) => v - mE);
    const peaks = (a) => { const out = []; for (let i = 1; i < a.length - 1; i++) if (a[i] > a[i - 1] && a[i] >= a[i + 1]) out.push(i); return out; };
    const hm = peaks(meas), he = peaks(model);
    // Lag: each measured high water against the latest model high water before it.
    const lags = [];
    for (const i of hm) { const prev = he.filter((j) => j <= i); if (prev.length) lags.push(i - prev[prev.length - 1]); }
    const range = (a) => Math.max(...a) - Math.min(...a);
    return { meas, model, hm, he, lag: mean(lags), rangeM: range(meas), rangeE: range(model) };
  })();
  function drawHalifax() {
    const C = C2, n = halifax.meas.length - 1;
    const ticks = [[0, "24"], [0.25, "25"], [0.5, "26"], [0.75, "27"]];
    const yOf = chartFrame(C, "HALIFAX, 24 TO 28 SEPTEMBER 2003 (UTC)", 1.05, ticks);
    ctx.font = mono(FT); ctx.fillStyle = "#56647c"; ctx.textAlign = "right";
    ctx.fillText("28", C.x + C.w + 2, C.y + C.h + 14);
    const xOf = (i) => C.x + (i / n) * C.w;
    ctx.save(); ctx.beginPath(); ctx.rect(C.x, C.y, C.w, C.h); ctx.clip();
    // Equilibrium model for Halifax at the same hours
    ctx.strokeStyle = "#5cc8ff"; ctx.lineWidth = 1.8;
    ctx.beginPath();
    halifax.model.forEach((v, i) => (i ? ctx.lineTo(xOf(i), yOf(v)) : ctx.moveTo(xOf(i), yOf(v))));
    ctx.stroke(); ctx.lineWidth = 1;
    // Measured hourly readings, joined by a faint line so the wave is easy to follow
    ctx.strokeStyle = "rgba(240,179,90,0.35)";
    ctx.beginPath();
    halifax.meas.forEach((v, i) => (i ? ctx.lineTo(xOf(i), yOf(v)) : ctx.moveTo(xOf(i), yOf(v))));
    ctx.stroke();
    ctx.fillStyle = "#f0b35a";
    const r = narrow ? 1.7 : 2;
    halifax.meas.forEach((v, i) => { ctx.beginPath(); ctx.arc(xOf(i), yOf(v), r, 0, TAU); ctx.fill(); });
    ctx.restore();
    // New moon
    const xn = xOf(TD.newMoonHours), yn = C.y + C.h - 10;
    ctx.strokeStyle = "#c9ced8"; ctx.fillStyle = "#0a0f19";
    ctx.beginPath(); ctx.arc(xn, yn, 5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.font = mono(FT); ctx.fillStyle = "#8796ad"; ctx.textAlign = "right";
    ctx.fillText("new moon", xn - 9, yn + 4);
    ctx.strokeStyle = "#1f2a3f"; ctx.strokeRect(C.x + 0.5, C.y + 0.5, C.w - 1, C.h - 1);
    // Legend and the comparison in numbers
    const lw = narrow ? W - C.x - 8 : C.w;
    let y = C.y + C.h + 30;
    ctx.font = sans(11); ctx.textAlign = "left";
    ctx.fillStyle = "#f0b35a"; ctx.beginPath(); ctx.arc(C.x + 4, y - 4, 3, 0, TAU); ctx.fill();
    fitText("Measured: Halifax tide gauge, 2003, hourly", C.x + 12, y, lw - 12);
    y += 15;
    ctx.fillStyle = "#5cc8ff"; ctx.fillRect(C.x, y - 5, 9, 2);
    fitText("Equilibrium model for Halifax, same hours", C.x + 12, y, lw - 12);
    ctx.fillStyle = "#93a3bb";
    wrapText("Range " + halifax.rangeM.toFixed(2) + " m measured, " + halifax.rangeE.toFixed(2) + " m in the model. High water comes " + halifax.lag.toFixed(1) + " h after the model's.", C.x, y + 15, lw, 14);
  }

  const SPAN2 = 720, STEP2 = 0.5, N2 = SPAN2 / STEP2;
  function drawChart2() {
    if (state.measured && halifax) { drawHalifax(); return; }
    const C = C2, r = rates();
    const ymax = (kMoon() + (state.sun ? K_SUN : 0)) * 1.15;
    const ticks = [];
    for (let d = 0; d <= 30; d += narrow ? 10 : 5) ticks.push([d / 30, d === 30 ? "now" : "−" + (30 - d) + " d"]);
    const yOf = chartFrame(C, "TIDE AT THE TOWN, LAST 30 DAYS", ymax, ticks);
    ctx.save(); ctx.beginPath(); ctx.rect(C.x, C.y, C.w, C.h); ctx.clip();
    ctx.strokeStyle = "rgba(92,200,255,0.75)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= N2; i++) {
      const x = C.x + (i / N2) * C.w, y = yOf(townTide(SPAN2 - i * STEP2, state.sun, r));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    // New and full moons (and quarters) in the window
    const wEl = r.m - r.s, eNow = state.moon - state.sunA;
    const kLo = Math.ceil((eNow - wEl * SPAN2) / (Math.PI / 2)), kHi = Math.floor(eNow / (Math.PI / 2));
    ctx.font = mono(FT);
    for (let k = kLo; k <= kHi; k++) {
      const ago = (eNow - k * Math.PI / 2) / wEl;
      const x = C.x + (1 - ago / SPAN2) * C.w, y = C.y + C.h - 10;
      const kind = ((k % 4) + 4) % 4; // 0 new, 1 first quarter, 2 full, 3 last quarter
      ctx.strokeStyle = "#c9ced8"; ctx.fillStyle = kind === 2 ? "#e3e6ee" : "#0a0f19";
      ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.stroke();
      if (kind === 1 || kind === 3) {
        ctx.fillStyle = "#e3e6ee"; ctx.beginPath();
        ctx.arc(x, y, 5, kind === 1 ? -Math.PI / 2 : Math.PI / 2, kind === 1 ? Math.PI / 2 : 3 * Math.PI / 2); ctx.fill();
      }
      if (state.sun && x > C.x + 18 && x < C.x + C.w - 18) {
        ctx.fillStyle = kind % 2 === 0 ? "#f0b35a" : "#8796ad"; ctx.textAlign = "center";
        ctx.fillText(kind % 2 === 0 ? "spring" : "neap", x, C.y + 12);
      }
    }
    ctx.strokeStyle = "#1f2a3f"; ctx.strokeRect(C.x + 0.5, C.y + 0.5, C.w - 1, C.h - 1);
    ctx.font = sans(11); ctx.fillStyle = "#93a3bb"; ctx.textAlign = "left";
    const cap = state.sun
      ? "Sun on: tides are largest near new and full moon (spring) and smallest at the quarters (neap)."
      : "Moon only: every day's tides are the same size. Add the Sun's tide to see spring and neap tides.";
    wrapText(cap, C.x, C.y + C.h + 30, narrow ? W - C.x - 8 : C.w, 14);
  }

  function draw() {
    const an = analyse();
    ctx.fillStyle = "#05080e"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#1a2436"; ctx.beginPath();
    if (narrow) { const y = Math.round(W + 42) + 0.5; ctx.moveTo(12, y); ctx.lineTo(W - 12, y); }
    else { ctx.moveTo(556.5, 20); ctx.lineTo(556.5, H - 20); }
    ctx.stroke();
    drawOrbit(an);
    drawChart1(an);
    drawChart2();
    return an;
  }

  // ---------- Readouts ----------
  function fmtGap(h) {
    let hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    if (mm === 60) { hh++; mm = 0; }
    return hh + " h " + String(mm).padStart(2, "0") + " min";
  }
  const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  function fmtSci(x, dig) {
    const e = Math.floor(Math.log10(x));
    const m = x / Math.pow(10, e);
    return m.toFixed(dig) + " × 10" + String(e).split("").map((c) => SUP[c]).join("");
  }
  function phaseName() {
    const e = (((state.moon - state.sunA) % TAU) + TAU) % TAU;
    const i = Math.round(e / (TAU / 8)) % 8;
    return ["New Moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full Moon", "Waning gibbous", "Last quarter", "Waning crescent"][i];
  }
  function tideKind() {
    const c = Math.cos(2 * (state.moon - state.sunA));
    return c > 0.7 ? "spring" : c < -0.7 ? "neap" : "between";
  }
  const KIND_TEXT = { spring: "spring tides", neap: "neap tides", between: "between spring and neap" };
  function clockText() {
    const day = Math.floor(state.t / 24) + 1;
    const mins = Math.floor((state.t % 24) * 60);
    return "Day " + day + ", " + String(Math.floor(mins / 60)).padStart(2, "0") + ":" + String(mins % 60).padStart(2, "0");
  }
  function kmText() { return (Math.round(state.d * 6371 / 100) * 100).toLocaleString("en-US"); }

  let lastAn = null;
  function updateReadouts(an) {
    $("clock").textContent = clockText();
    $("tideNow").textContent = signed(townTide(0, state.sun, rates()), 2);
    $("gap").textContent = an.gap ? fmtGap(an.gap) : "–";
    $("range").textContent = an.range ? an.range.toFixed(2) + " m" : "–";
    const acc = tidalAcc(state.d);
    $("accel").textContent = fmtSci(acc, 2) + " m/s² · " + (acc / A_REF).toFixed(acc / A_REF >= 10 ? 0 : 2) + "× today";
    $("phase").textContent = phaseName();
    $("sunState").textContent = state.sun ? KIND_TEXT[tideKind()] : "off";
  }
  function updateControls() {
    $("distOut").textContent = state.d.toFixed(1) + " Earth radii · " + kmText() + " km";
    $("speedOut").textContent = SPEEDS[state.speedIdx] + " h per second";
    $("play").textContent = state.running ? "Pause" : "Play";
  }

  // ---------- Simulation, narration and challenges ----------
  const W_ = window.WONDERS;
  let hist = [], lastHighSaid = -1e9, lastKind = null;
  function advance(hours) {
    const n = Math.max(1, Math.ceil(hours / 0.1)), dt = hours / n;
    const r = rates();
    for (let k = 0; k < n; k++) {
      state.t += dt;
      state.earth += r.e * dt; state.moon += r.m * dt; state.sunA += r.s * dt;
      const h = townTide(0, state.sun, r);
      hist.push(h);
      if (hist.length > 3) hist.shift();
      if (hist.length === 3 && hist[1] > hist[0] && hist[1] >= hist[2]) onHighTide(hist[1]);
    }
    if (state.sun) {
      const kind = tideKind();
      if (kind !== lastKind && lastKind !== null && kind !== "between") {
        W_.sound("event", { pitch: kind === "spring" ? 0.8 : 0.3 });
        W_.describe(kind === "spring"
          ? "Spring tides: the Sun and Moon are lined up, so their bulges add and the tidal range is large."
          : "Neap tides: the Sun is at right angles to the Moon, so its bulges partly fill the Moon's low belts and the range is small.");
      }
      lastKind = kind;
    }
  }
  function onHighTide(h) {
    if (SPEEDS[state.speedIdx] <= 8) W_.sound("tick", { pitch: Math.min(1, h / 0.6) });
    const now = performance.now();
    if (now - lastHighSaid > 20000) {
      lastHighSaid = now;
      W_.describe("High tide at the town, " + h.toFixed(2) + " m above the average sea level.");
    }
  }

  const seen = new Set();
  function checkChallenges(an) {
    if (state.mode === "tidal" && seen.has("pull") && seen.has("sub")) W_.challenge("views");
    if (state.sun && Math.abs(state.d - D_REF) < 1.5 && an.range !== null && an.range < 0.35 && an.highs.length >= 2) W_.challenge("neap");
    if (!state.sun && an.gap !== null && an.gap > 13) W_.challenge("slow-tides");
  }

  W_.describer(() => {
    const an = lastAn || analyse();
    const h = townTide(0, state.sun, rates());
    const s1 = "Earth seen from above the North Pole, with the Moon " + state.d.toFixed(1) + " Earth radii away.";
    const s2 = "The ocean is stretched into two bulges, one facing the Moon and one on the far side. The town's tide is " + h.toFixed(2) + " m and its high tides come " + (an.gap ? fmtGap(an.gap) : "about 12 h 25 min") + " apart.";
    const s3 = !state.sun ? "The Sun's tide is switched off."
      : tideKind() === "spring" ? "The Sun is lined up with the Moon, so these are spring tides with a range of " + (an.range || 0).toFixed(2) + " m."
      : tideKind() === "neap" ? "The Sun is at right angles to the Moon, so these are neap tides with a range of " + (an.range || 0).toFixed(2) + " m."
      : "The Sun's tide is added to the Moon's; the range is now " + (an.range || 0).toFixed(2) + " m.";
    const s4 = state.measured && halifax ? "The lower chart shows four days of measured tide at Halifax in September 2003: a range of " + halifax.rangeM.toFixed(2) + " m against the equilibrium model's " + halifax.rangeE.toFixed(2) + " m, with high water about " + halifax.lag.toFixed(1) + " hours after the model's." : "";
    return [s1, s2, s3, s4].filter(Boolean).map(tr).join(" ");
  });

  // ---------- Loop ----------
  let lastT = performance.now(), lastStats = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (state.running) advance(dt * SPEEDS[state.speedIdx]);
    lastAn = draw();
    if (now - lastStats > 150) { lastStats = now; updateReadouts(lastAn); checkChallenges(lastAn); }
    requestAnimationFrame(frame);
  }

  // ---------- Controls ----------
  const MODE_SAY = {
    pull: "Showing the Moon's pull at twelve points. The arrows are almost identical: all point at the Moon and differ by only a few percent.",
    sub: "Showing each pull with the average pull taken away. What is left is tiny, a few percent of the pull.",
    tidal: "Showing the tidal force, magnified. It points outward toward and away from the Moon, and inward at the sides, so the ocean forms two bulges.",
  };
  const MODES = { arrowsPull: "pull", arrowsSub: "sub", arrowsTidal: "tidal" };
  for (const id of Object.keys(MODES)) {
    $(id).addEventListener("click", () => {
      state.mode = MODES[id];
      seen.add(state.mode);
      for (const other of Object.keys(MODES)) $(other).setAttribute("aria-pressed", String(other === id));
      W_.describe(MODE_SAY[state.mode], { now: true });
      W_.sound("event", { pitch: 0.5 });
    });
  }
  let distTimer = 0;
  $("dist").addEventListener("input", (e) => {
    state.d = Math.max(20, Math.min(100, +e.target.value));
    updateControls();
    clearTimeout(distTimer);
    distTimer = setTimeout(() => {
      const an = analyse(), ratio = tidalAcc(state.d) / A_REF;
      W_.describe("Moon at " + state.d.toFixed(1) + " Earth radii. The tidal force is " + ratio.toFixed(2) + " times today's, and high tides come " + (an.gap ? fmtGap(an.gap) : "–") + " apart.");
    }, 700);
  });
  $("measured").addEventListener("change", (e) => {
    state.measured = e.target.checked && !!halifax;
    if (narrow) { layout(); }
    lastAn = draw();
    if (state.measured) {
      W_.describe("The lower chart now shows four days of the real tide at Halifax, Canada, in September 2003. The measured range is " + halifax.rangeM.toFixed(2) + " m, against " + halifax.rangeE.toFixed(2) + " m for the equilibrium model, and high water comes about " + halifax.lag.toFixed(1) + " hours after the model's.", { now: true });
      W_.sound("event", { pitch: 0.6 });
    } else W_.describe("The lower chart shows the model town's last 30 days again.", { now: true });
  });
  $("sun").addEventListener("change", (e) => {
    state.sun = e.target.checked;
    lastKind = state.sun ? tideKind() : null;
    W_.describe(state.sun
      ? "The Sun's tide is added. It is 46% as strong as the Moon's, so the total grows or shrinks with the Moon's phase."
      : "The Sun's tide is switched off. Only the Moon's tide remains.", { now: true });
  });
  $("speed").addEventListener("input", (e) => { state.speedIdx = Math.max(0, Math.min(6, Math.round(+e.target.value))); updateControls(); });
  $("play").addEventListener("click", () => { state.running = !state.running; updateControls(); });
  $("restart").addEventListener("click", () => {
    state.t = 0; state.moon = START.moon; state.sunA = START.sunA; state.earth = START.moon - Math.PI / 2;
    hist = []; lastKind = state.sun ? tideKind() : null;
    if (!state.running) { state.running = true; updateControls(); }
  });
  $("today").addEventListener("click", () => {
    const el = $("dist");
    el.value = String(D_REF);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // Re-layout when the bench changes width; the simulation state is kept.
  let lastCW = 0;
  function onResize() {
    const cw = Math.round(canvas.parentElement.clientWidth);
    if (cw === lastCW) return;
    lastCW = cw;
    layout();
    lastAn = draw();
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvas.parentElement);
  else window.addEventListener("resize", onResize);

  updateControls();
  // With reduced motion the page opens paused, a few hours in, on a frame that already shows the story.
  if (Lab.reducedMotion) advance(3);
  lastAn = draw();
  updateReadouts(lastAn);
  requestAnimationFrame(frame);
})();
