(function () {
  const canvas = document.getElementById("bench");
  let W = 960, H = 540, NARROW = false, ctx;
  const $ = (id) => document.getElementById(id);

  // ---------- Layout (logical px) ----------
  // Wide: field on the left, plot and spectrum stacked on the right.
  // Narrow (phones): 480 wide, field, plot and spectrum stacked, with larger type.
  let FIELD, PLOT, SPEC;
  const PX = 0.9;                       // px per megaparsec of physical distance
  function layout() {
    NARROW = (canvas.parentElement.clientWidth || 960) < 640;
    if (NARROW) {
      W = 480; H = 1010;
      FIELD = { w: 480, h: 420, cx: 240, cy: 210 };
      PLOT = { tx: 18, ty: 452, ax: 26, x0: 96, x1: 456, y0: 480, y1: 676, dMax: 360, vMax: 60000 };
      SPEC = { x0: 112, x1: 448, dy: 422, tx: 18 };
    } else {
      W = 960; H = 540;
      FIELD = { w: 560, h: 540, cx: 280, cy: 270 };
      PLOT = { tx: 580, ty: 24, ax: 586, x0: 640, x1: 940, y0: 44, y1: 270, dMax: 450, vMax: 60000 };
      SPEC = { x0: 650, x1: 930, dy: 0, tx: 580 };
    }
    canvas.setAttribute("width", W); canvas.setAttribute("height", H);
    ctx = Lab.setupCanvas(canvas, W, H);
  }
  layout();
  const fs = (px) => (NARROW ? Math.max(17, Math.round(px * 1.42)) : px) + "px ";
  const tr = (t) => (window.I18N ? I18N.t(t) : t);
  // Split a sentence into lines (translated whole first; Chinese breaks per character).
  function lines(text, maxW) {
    text = tr(text);
    const cjk = /[\u3000-\u9fff]/.test(text);
    const words = cjk ? [...text] : text.split(" ");
    const out = [];
    let line = "";
    for (const w of words) {
      const t = line ? line + (cjk ? "" : " ") + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }

  // ---------- Universe ----------
  const BOX = 1400;                     // comoving size of the repeating patch (Mpc)
  const NG = 260;
  const SIGMA_V = 250;                  // random galaxy motions, km/s per axis
  const KM_S_MPC_TO_GYR = 977.8;        // 1/H in Gyr when H is in km/s/Mpc
  const H_BETA = 486.1;                 // hydrogen line used for the light wave (nm)
  const BALMER = [410.2, 434.0, 486.1, 656.3];

  // Seeded random numbers so the field looks the same every visit.
  let seed = 7;
  const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const galaxies = [];
  for (let i = 0; i < NG; i++) {
    galaxies.push({
      x: rand() * BOX, y: rand() * BOX,
      vx: SIGMA_V * gauss(), vy: SIGMA_V * gauss(),
      size: 1.4 + rand() * 2.2, tilt: rand() * Math.PI, flat: 0.35 + rand() * 0.6,
      hue: rand(),
    });
  }

  const state = {
    H0: 70, t: 9, playing: !Lab.reducedMotion, mode: "forward", hold: 0,
    home: 0, pan: [0, 0], aEmit: 0.7, arrows: true, grid: true,
    visible: [], fit: 70, wavePhase: 0,
  };
  const tNow = () => KM_S_MPC_TO_GYR / state.H0;
  const aOf = (t) => t / tNow();
  const T_MIN_FRAC = 0.075;

  // Start at the galaxy nearest the middle of the patch.
  let best = Infinity;
  galaxies.forEach((g, i) => { const d = Math.hypot(g.x - BOX / 2, g.y - BOX / 2); if (d < best) { best = d; state.home = i; } });

  const wrap = (d) => d - BOX * Math.round(d / BOX);
  const START_HOME = state.home;

  // ---------- Narration, sound and challenges ----------
  const W8 = window.WONDERS;
  function bangReached() {
    W8.describe("The clock has run back " + tNow().toFixed(1) + " billion years, to 1 / H₀: every galaxy crowds onto every other one, everywhere at once.", { now: true });
    W8.sound("event", { pitch: 0.2 });
    if (state.home !== START_HOME) W8.challenge("bang-home");
  }
  W8.describer(() => {
    const stats = [...document.querySelectorAll(".stats > span")].map((s) => s.textContent.replace(/\s+/g, " ").trim()).join(". ") + ".";
    return tr("A field of galaxies spreading apart around the home galaxy, a plot of their speed against distance with a fitted straight line, and a light wave stretched on its way to us.") + " " + stats;
  });

  // ---------- Measure: positions, speeds, the fit ----------
  function measure() {
    const a = aOf(state.t);
    const Hkm = KM_S_MPC_TO_GYR / state.t;
    const h = galaxies[state.home];
    const half = [FIELD.w / 2 / PX / a, FIELD.h / 2 / PX / a]; // comoving half-view
    const K = [Math.ceil(half[0] / BOX + 0.5), Math.ceil(half[1] / BOX + 0.5)];
    const vis = [];
    let sxy = 0, sxx = 0;
    for (const g of galaxies) {
      const dx0 = wrap(g.x - h.x), dy0 = wrap(g.y - h.y);
      for (let i = -K[0]; i <= K[0]; i++) {
        const dx = dx0 + i * BOX;
        if (Math.abs(dx) > half[0] + 10) continue;
        for (let j = -K[1]; j <= K[1]; j++) {
          const dy = dy0 + j * BOX;
          if (Math.abs(dy) > half[1] + 10) continue;
          const px = a * dx, py = a * dy;          // physical Mpc
          const d = Math.hypot(px, py);
          let v = 0;
          if (d > 0.01) {
            v = Hkm * d + ((g.vx - h.vx) * px + (g.vy - h.vy) * py) / d;
            if (d > 3) { sxy += v * d; sxx += d * d; }
          }
          vis.push({ g, sx: FIELD.cx + px * PX + state.pan[0], sy: FIELD.cy + py * PX + state.pan[1], px, py, d, v, home: g === h && i === 0 && j === 0 });
        }
      }
    }
    state.visible = vis;
    state.fit = sxx > 0 ? sxy / sxx : Hkm;
    return { a, Hkm };
  }

  // ---------- Drawing ----------
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";
  // maxW: squeeze horizontally only if a translation would run past it.
  function label(text, x, y, align, color, size, maxW) {
    ctx.font = fs(size || 12) + MONO;
    ctx.fillStyle = color || "#7f8ea6";
    ctx.textAlign = align || "left";
    const t = tr(text);
    if (maxW && ctx.measureText(t).width > maxW) ctx.fillText(t, x, y, maxW); else ctx.fillText(t, x, y);
  }

  function draw() {
    const { a, Hkm } = measure();
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    drawField(a, Hkm);
    ctx.strokeStyle = "#1a2436";
    ctx.beginPath();
    if (NARROW) {
      ctx.moveTo(14, FIELD.h + 0.5); ctx.lineTo(W - 14, FIELD.h + 0.5);
      ctx.moveTo(14, 300.5 + SPEC.dy); ctx.lineTo(W - 14, 300.5 + SPEC.dy);
    } else {
      ctx.moveTo(FIELD.w + 0.5, 14); ctx.lineTo(FIELD.w + 0.5, H - 14);
      ctx.moveTo(FIELD.w + 16, 300.5); ctx.lineTo(W - 14, 300.5);
    }
    ctx.stroke();
    drawPlot(Hkm);
    drawSpectrum();
  }

  function drawField(a, Hkm) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, FIELD.w, FIELD.h); ctx.clip();
    const h = galaxies[state.home];
    // Comoving grid: fixed to the galaxies, stretched by the scale factor.
    if (state.grid) {
      const sp = 100 * a * PX;
      ctx.strokeStyle = `rgba(80,100,140,${Math.min(0.45, sp / 70)})`;
      ctx.beginPath();
      const ox = FIELD.cx + state.pan[0] - (((h.x % 100) + 100) % 100) * a * PX;
      const oy = FIELD.cy + state.pan[1] - (((h.y % 100) + 100) % 100) * a * PX;
      for (let x = ox - Math.ceil(ox / sp) * sp; x < FIELD.w; x += sp) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, FIELD.h); }
      for (let y = oy - Math.ceil(oy / sp) * sp; y < FIELD.h; y += sp) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(FIELD.w, Math.round(y) + 0.5); }
      ctx.stroke();
    }
    const many = state.visible.length > 600;
    // Velocity arrows (radial speed away from home)
    if (state.arrows && !many) {
      ctx.strokeStyle = "rgba(240,179,90,0.55)";
      ctx.fillStyle = "rgba(240,179,90,0.55)";
      for (const p of state.visible) {
        if (p.home || p.d < 1) continue;
        const len = p.v * 55 / 30000;
        const ux = p.px / p.d, uy = p.py / p.d;
        const x0 = p.sx + ux * 5, y0 = p.sy + uy * 5;
        const x1 = x0 + ux * len, y1 = y0 + uy * len;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        if (len > 6) {
          ctx.beginPath();
          ctx.moveTo(x1 + ux * 4, y1 + uy * 4);
          ctx.lineTo(x1 - uy * 2.6, y1 + ux * 2.6);
          ctx.lineTo(x1 + uy * 2.6, y1 - ux * 2.6);
          ctx.fill();
        }
      }
    }
    // Galaxies keep their size: gravity holds them together.
    for (const p of state.visible) {
      const g = p.g;
      const col = g.hue < 0.55 ? "rgba(225,230,255,0.9)" : g.hue < 0.85 ? "rgba(255,226,180,0.9)" : "rgba(170,200,255,0.9)";
      ctx.fillStyle = col;
      if (many) { ctx.fillRect(p.sx - 1, p.sy - 1, 2, 2); continue; }
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy, g.size, g.size * g.flat, g.tilt, 0, Math.PI * 2);
      ctx.fill();
    }
    // Early universe: hot and dense everywhere
    const glow = Math.max(0, Math.min(1, (0.32 - a) / 0.25));
    if (glow > 0) {
      ctx.fillStyle = `rgba(255,160,80,${0.22 * glow})`;
      ctx.fillRect(0, 0, FIELD.w, FIELD.h);
    }
    // Home marker
    const hx = FIELD.cx + state.pan[0], hy = FIELD.cy + state.pan[1];
    ctx.strokeStyle = "#8fa6ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(hx, hy, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    label("HOME", hx + 13, hy - 9, "left", "#8fa6ff");
    ctx.fillStyle = "rgba(5,8,14,0.75)";
    if (NARROW) {
      ctx.font = fs(12) + MONO;
      const bw = Math.min(W - 16, 16 + Math.max(ctx.measureText(tr("GALAXIES AROUND HOME")).width, ctx.measureText(tr("tap any galaxy to live there")).width));
      ctx.fillRect(8, 8, bw, 58);
      ctx.fillRect(8, FIELD.h - 56, 270, 46);
      label("GALAXIES AROUND HOME", 16, 30, "left", null, 12, W - 32);
      label("tap any galaxy to live there", 16, 54, "left", "#7f8ea6", 12, W - 32);
    } else {
      ctx.fillRect(8, 8, 250, 42);
      ctx.fillRect(8, FIELD.h - 46, 190, 36);
      label("GALAXIES AROUND HOME", 16, 24);
      label("click any galaxy to live there", 16, 42, "left", "#56647c");
    }
    // Scale bar: 100 Mpc today
    const bar = 100 * PX;
    ctx.fillStyle = "#7f8ea6";
    ctx.fillRect(16, FIELD.h - 22, bar, 2);
    ctx.fillRect(16, FIELD.h - 26, 1, 10); ctx.fillRect(16 + bar - 1, FIELD.h - 26, 1, 10);
    label("100 Mpc ≈ 326 million ly", 16, FIELD.h - (NARROW ? 34 : 30), "left", "#7f8ea6", 11, 254);

    if (state.mode === "bang" || (state.t <= T_MIN_FRAC * tNow() * 1.02)) {
      const msg1 = "Back " + tNow().toFixed(1) + " billion years (1 / H₀):";
      const msg2 = "every galaxy crowds onto every other one.";
      const msg3 = "Not at one point. Everywhere.";
      if (NARROW) {
        // Wrap each sentence to the box, then size the box to fit.
        ctx.font = fs(15) + SANS;
        const bw = W - 40, lh = 26;
        const L1 = lines(msg1, bw - 24), L2 = lines(msg2, bw - 24), L3 = lines(msg3, bw - 24);
        const n = L1.length + L2.length + L3.length;
        const top = 84, bh = n * lh + 22;
        ctx.fillStyle = "rgba(5,8,14,0.85)";
        ctx.fillRect(FIELD.cx - bw / 2, top, bw, bh);
        ctx.strokeStyle = "#26324a";
        ctx.strokeRect(FIELD.cx - bw / 2 + 0.5, top + 0.5, bw - 1, bh - 1);
        ctx.textAlign = "center";
        let y = top + 30;
        for (const [arr, col] of [[L1, "#e9eef7"], [L2, "#e9eef7"], [L3, "#f0b35a"]]) {
          ctx.fillStyle = col;
          for (const l of arr) { ctx.fillText(l, FIELD.cx, y); y += lh; }
        }
      } else {
        ctx.fillStyle = "rgba(5,8,14,0.82)";
        ctx.fillRect(FIELD.cx - 200, 70, 400, 84);
        ctx.strokeStyle = "#26324a";
        ctx.strokeRect(FIELD.cx - 199.5, 70.5, 399, 83);
        ctx.font = "15px " + SANS;
        ctx.fillStyle = "#e9eef7";
        ctx.textAlign = "center";
        ctx.fillText(msg1, FIELD.cx, 96);
        ctx.fillText(msg2, FIELD.cx, 117);
        ctx.fillStyle = "#f0b35a";
        ctx.fillText(msg3, FIELD.cx, 140);
      }
    }
    ctx.restore();
  }

  function drawPlot(Hkm) {
    const { x0, x1, y0, y1, dMax, vMax } = PLOT;
    const X = (d) => x0 + d / dMax * (x1 - x0);
    const Y = (v) => y1 - v / vMax * (y1 - y0);
    label("SPEED AWAY FROM HOME vs DISTANCE", PLOT.tx, PLOT.ty, "left", null, 12, NARROW ? W - 36 : 360);
    // axes and ticks
    ctx.strokeStyle = "#26324a";
    ctx.beginPath(); ctx.moveTo(x0 + 0.5, y0); ctx.lineTo(x0 + 0.5, y1 + 0.5); ctx.lineTo(x1, y1 + 0.5); ctx.stroke();
    ctx.font = fs(10) + MONO;
    ctx.fillStyle = NARROW ? "#7f8ea6" : "#56647c";
    ctx.textAlign = "center";
    for (let d = 0; d <= dMax - 50; d += 100) { ctx.fillRect(X(d), y1, 1, 4); ctx.fillText(String(d), X(d), y1 + (NARROW ? 21 : 15)); }
    ctx.fillText("distance (Mpc)", (x0 + x1) / 2, y1 + (NARROW ? 42 : 28));
    ctx.textAlign = "right";
    for (let v = 0; v <= vMax; v += 20000) { ctx.fillRect(x0 - 4, Y(v), 4, 1); ctx.fillText(v ? (v / 1000) + "k" : "0", x0 - 7, Y(v) + 4); }
    ctx.save();
    ctx.translate(PLOT.ax, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center"; ctx.fillText("speed (km/s)", 0, 0);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0 - 6, x1 - x0 + 4, y1 - y0 + 8); ctx.clip();
    // today's line for reference
    const tn = Math.abs(state.t - tNow()) < 0.02;
    if (!tn) {
      ctx.strokeStyle = "rgba(127,142,166,0.6)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(dMax), Y(state.H0 * dMax)); ctx.stroke();
      ctx.setLineDash([]);
    }
    // points
    ctx.fillStyle = "rgba(143,166,255,0.8)";
    let n = 0;
    for (const p of state.visible) {
      if (p.home || p.d < 1) continue;
      if (++n > 1500) break;
      ctx.fillRect(X(p.d) - 1.5, Y(p.v) - 1.5, 3, 3);
    }
    // fitted line
    ctx.strokeStyle = "#f0b35a";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(dMax), Y(state.fit * dMax)); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.restore();
    label("slope H = " + state.fit.toFixed(1) + " km/s/Mpc", x0 + 10, y0 + 6, "left", "#f0b35a", 12, x1 - x0 - 10);
    const y2 = y0 + (NARROW ? 30 : 22);
    if (!tn) label("dashed: today's H₀ = " + state.H0, x0 + 10, y2, "left", "#7f8ea6", 11, x1 - x0 - 10);
    else label("this is H₀, today's value", x0 + 10, y2, "left", "#7f8ea6", 11, x1 - x0 - 10);
  }

  function drawSpectrum() {
    const aE = state.aEmit;
    const stretch = 1 / aE;
    const dy = SPEC.dy;
    label("LIGHT ON ITS WAY TO US", SPEC.tx, 326 + dy, "left", null, 12, NARROW ? 330 : 280);
    label("z = " + (stretch - 1).toFixed(2), W - 16, 326 + dy, "right", "#f0b35a");
    // Source and observer
    const wy = 372 + dy, xa = SPEC.x0 + 14, xb = SPEC.x1 - 14;
    ctx.fillStyle = "rgba(170,200,255,0.9)";
    ctx.beginPath(); ctx.ellipse(SPEC.x0, wy, 7, 3.5, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8fa6ff";
    ctx.beginPath(); ctx.arc(SPEC.x1 + 2, wy, 4, 0, Math.PI * 2); ctx.fill();
    label("then", SPEC.x0 - 8, wy + (NARROW ? 32 : 26), "left", NARROW ? "#7f8ea6" : "#56647c", 10);
    label("now, at home", SPEC.x1 + 8, wy + (NARROW ? 32 : 26), "right", NARROW ? "#7f8ea6" : "#56647c", 10);
    // Wave whose wavelength grows with the scale factor as it travels
    let phase = -state.wavePhase;
    let prev = null;
    ctx.lineWidth = 2;
    for (let x = xa; x <= xb; x += 1.5) {
      const u = (x - xa) / (xb - xa);
      const lam = H_BETA * (aE + (1 - aE) * u) / aE;
      const pxLam = 12 * lam / H_BETA;
      phase += 2 * Math.PI * 1.5 / pxLam;
      const y = wy - 13 * Math.sin(phase);
      if (prev) {
        ctx.strokeStyle = lamColour(lam, 1);
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(x, y); ctx.stroke();
      }
      prev = [x, y];
    }
    ctx.lineWidth = 1;
    // Spectrum bars: emitted and observed hydrogen lines
    const L0 = 350, L1 = 1250;
    const sx = (l) => SPEC.x0 + (l - L0) / (L1 - L0) * (SPEC.x1 - SPEC.x0);
    const bars = NARROW ? [{ y: 430 + dy, k: 1, name: "emitted" }, { y: 486 + dy, k: stretch, name: "observed" }]
      : [{ y: 426, k: 1, name: "emitted" }, { y: 470, k: stretch, name: "observed" }];
    for (const b of bars) {
      for (let x = SPEC.x0; x < SPEC.x1; x++) {
        const l = L0 + (x - SPEC.x0) / (SPEC.x1 - SPEC.x0) * (L1 - L0);
        ctx.fillStyle = l < 380 || l > 700 ? "#0e1522" : lamColour(l, 0.28);
        ctx.fillRect(x, b.y, 1, 18);
      }
      ctx.strokeStyle = "#26324a";
      ctx.strokeRect(SPEC.x0 + 0.5, b.y + 0.5, SPEC.x1 - SPEC.x0 - 1, 17);
      for (const l0 of BALMER) {
        const l = l0 * b.k;
        if (l > L1) continue;
        ctx.fillStyle = l > 700 ? "#e9eef7" : lamColour(l, 1);
        ctx.fillRect(sx(l) - 1, b.y - 2, 2, 22);
      }
      label(b.name, SPEC.x0 - (NARROW ? 8 : 22), b.y + 14, "right", NARROW ? "#7f8ea6" : "#56647c", 10, SPEC.x0 - (NARROW ? 14 : 30));
    }
    // Connect the line we drew as a wave
    ctx.strokeStyle = "rgba(201,212,227,0.35)";
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(sx(H_BETA), bars[0].y + 20); ctx.lineTo(sx(H_BETA * stretch), bars[1].y - 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = fs(10) + MONO;
    ctx.fillStyle = NARROW ? "#7f8ea6" : "#56647c";
    ctx.textAlign = "center";
    const yt = NARROW ? bars[1].y + 42 : 504;
    for (const l of [400, 600, 800, 1000, 1200]) ctx.fillText(String(l), sx(l), yt);
    ctx.fillText("wavelength (nm)", sx(800), yt + (NARROW ? 22 : 16));
    if (NARROW) label("infrared →", SPEC.x1 - 4, bars[0].y + 44, "right", "#7f8ea6", 10);
    else label("infrared →", SPEC.x1 - 4, 441, "right", "#56647c", 10);
    label("wavelength × " + stretch.toFixed(2) + ": " + Math.round(H_BETA) + " → " + Math.round(H_BETA * stretch) + " nm", NARROW ? 18 : SPEC.x0, NARROW ? yt + 50 : 534, "left", "#c9d4e3", 11, NARROW ? W - 36 : 290);
  }

  function lamColour(l, alpha) {
    if (l > 700) return `rgba(150,50,50,${alpha * 0.8})`;
    const [r, g, b] = Lab.wavelengthToRGB(Math.max(380, l));
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ---------- Loop ----------
  let last = performance.now(), lastStats = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (state.playing) advance(dt);
    if (!Lab.reducedMotion) {
      const k = Math.exp(-dt * 6);
      state.pan[0] *= k; state.pan[1] *= k;
      if (Math.hypot(state.pan[0], state.pan[1]) < 0.3) state.pan = [0, 0];
      if (state.playing) state.wavePhase += dt * 4;
    }
    draw();
    if (now - lastStats > 150) { updateStats(); lastStats = now; }
    requestAnimationFrame(frame);
  }

  function advance(dt) {
    const tn = tNow();
    if (state.mode === "rewind") {
      state.t *= Math.exp(-dt * 0.65);
      if (state.t <= T_MIN_FRAC * tn) { state.t = T_MIN_FRAC * tn; state.mode = "bang"; state.hold = 0; bangReached(); }
    } else if (state.mode === "bang") {
      state.hold += dt;
      if (state.hold > 3.2) state.mode = "rise";
    } else if (state.mode === "rise") {
      state.t *= Math.exp(dt * 0.65);
      if (state.t >= tn) { state.t = tn; state.mode = "forward"; state.hold = 0; }
    } else {
      if (state.t >= tn) {
        state.hold += dt;
        if (state.hold > 2.5) { state.t = 0.55 * tn; state.hold = 0; }
      } else {
        state.t = Math.min(tn, state.t + dt * 0.45 * tn / 8);
      }
    }
    $("time").value = state.t.toFixed(2);
    $("timeOut").textContent = fmtGyr(state.t);
  }

  const fmtGyr = (t) => t.toFixed(t < 10 ? 2 : 1) + " billion yr";

  function updateStats() {
    const a = aOf(state.t);
    $("tNow").textContent = fmtGyr(state.t);
    $("scale").textContent = (a * 100).toFixed(0) + "%";
    $("hFit").textContent = state.fit.toFixed(1) + " km/s/Mpc";
    $("age").textContent = (KM_S_MPC_TO_GYR / state.fit).toFixed(1) + " billion yr";
    $("nGal").textContent = state.visible.filter((p) => !p.home).length.toLocaleString();
    $("zOut").textContent = (1 / state.aEmit - 1).toFixed(2);
    const age = KM_S_MPC_TO_GYR / state.fit;
    if (state.H0 !== 70 && a >= 0.999 && age >= 13.6 && age <= 13.9) W8.challenge("age");
  }

  // ---------- Controls ----------
  function setPlaying(on) {
    state.playing = on;
    $("play").textContent = on ? "Pause" : "Play";
  }
  function setHome(i, sx, sy) {
    if (i === state.home) return;
    state.home = i;
    state.pan = Lab.reducedMotion ? [0, 0] : [sx - FIELD.cx, sy - FIELD.cy];
    $("hint").textContent = "New home. Everything still rushes away from you, and the slope is the same.";
    W8.describe("New home. Everything still rushes away from you, and the slope is the same.", { now: true });
    W8.sound("event", { pitch: 0.6 });
  }

  $("play").addEventListener("click", () => {
    if (state.mode === "bang" || state.mode === "rewind") { state.mode = "rise"; setPlaying(true); return; }
    setPlaying(!state.playing);
  });
  $("rewind").addEventListener("click", () => {
    if (Lab.reducedMotion) {
      state.t = T_MIN_FRAC * tNow();
      state.mode = "bang";
      setPlaying(false);
      bangReached();
    } else {
      state.mode = "rewind";
      setPlaying(true);
    }
    $("hint").textContent = "Running back to when every galaxy sat on top of every other. Press Play to let it expand again.";
  });
  $("time").addEventListener("input", (e) => {
    state.t = +e.target.value;
    state.mode = "forward";
    setPlaying(false);
    $("timeOut").textContent = fmtGyr(state.t);
    const m = measure();
    W8.describe("Cosmic time " + state.t.toFixed(state.t < 10 ? 2 : 1) + " billion years: the universe is " + (m.a * 100).toFixed(0) + "% of today's size, and the fitted slope is H = " + state.fit.toFixed(1) + " km/s/Mpc.");
    W8.sound("tick", { pitch: m.a });
  });
  $("h0").addEventListener("input", (e) => {
    const frac = state.t / tNow();
    state.H0 = +e.target.value;
    $("h0Out").textContent = state.H0 + " km/s/Mpc";
    $("time").max = tNow().toFixed(2);
    state.t = frac * tNow();
    $("time").value = state.t.toFixed(2);
    $("timeOut").textContent = fmtGyr(state.t);
    const h0Msg = "With H₀ = " + state.H0 + ", 1 / H₀ is " + tNow().toFixed(1) + " billion years. A faster expansion means a younger universe.";
    $("hint").textContent = h0Msg;
    W8.describe(h0Msg);
    W8.sound("tick", { pitch: (state.H0 - 50) / 40 });
  });
  $("emitted").addEventListener("input", (e) => {
    state.aEmit = +e.target.value;
    $("emittedOut").textContent = Math.round(state.aEmit * 100) + "% of today's size";
    const seen = H_BETA / state.aEmit;
    W8.describe("Light that left when the universe was " + Math.round(state.aEmit * 100) + "% of today's size arrives with redshift z = " + (1 / state.aEmit - 1).toFixed(2) + ": the 486 nm hydrogen line is seen at " + Math.round(seen) + " nm" + (seen > 700 ? ", in the infrared." : "."));
    W8.sound("tick", { pitch: 1 - (state.aEmit - 0.4) / 0.6 });
    if (seen > 700) W8.challenge("infrared");
  });
  $("arrows").addEventListener("change", (e) => { state.arrows = e.target.checked; });
  $("grid").addEventListener("change", (e) => { state.grid = e.target.checked; });
  $("newHome").addEventListener("click", () => {
    const near = state.visible.filter((p) => !p.home && Math.hypot(p.sx - FIELD.cx, p.sy - FIELD.cy) < 200 && Math.hypot(p.sx - FIELD.cx, p.sy - FIELD.cy) > 60);
    if (!near.length) return;
    const p = near[Math.floor(Math.random() * near.length)];
    setHome(galaxies.indexOf(p.g), p.sx, p.sy);
  });
  canvas.addEventListener("click", (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    if (x > FIELD.w || y > FIELD.h) return;
    let bestP = null, bestD = NARROW ? 30 : 18;
    for (const p of state.visible) {
      const d = Math.hypot(p.sx - x, p.sy - y);
      if (d < bestD) { bestD = d; bestP = p; }
    }
    if (bestP) setHome(galaxies.indexOf(bestP.g), bestP.sx, bestP.sy);
  });

  // Switch layouts at the phone breakpoint; the universe's state carries over.
  let rzTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(() => {
      if (((canvas.parentElement.clientWidth || 960) < 640) !== NARROW) { layout(); draw(); }
    }, 120);
  }).observe(canvas.parentElement);

  // ---------- Start ----------
  $("time").max = tNow().toFixed(2);
  if (Lab.reducedMotion) {
    state.t = tNow();
    setPlaying(false);
  } else {
    state.t = 0.78 * tNow();
    setPlaying(true);
  }
  $("time").value = state.t.toFixed(2);
  $("timeOut").textContent = fmtGyr(state.t);
  requestAnimationFrame(frame);
})();
