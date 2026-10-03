(function () {
  const canvas = document.getElementById("bench");
  // Wide: 960 x 520, orbit and ring side by side over the waveform.
  // Narrow (phones): 480 wide, the three panels stacked, with larger type.
  let W = 960, H = 520, NARROW = false, ctx;
  const $ = (id) => document.getElementById(id);

  // ---------- Constants (SI) ----------
  const TSUN = 4.925491e-6;      // G·M☉ / c³ in seconds
  const C = 299792458;
  const MLY = 9.4607e21;         // metres in a million light-years
  const CYCLES = 16;             // wave cycles shown before coalescence
  const FV0 = 1.4;               // on-screen wave frequency at the start (Hz)
  const HOLD = 2.6;              // seconds to linger after ringdown before looping

  // Panels (logical px)
  const ORB = { x: 0, y: 0, w: 480, h: 300, cx: 240, cy: 152 };
  let RING, WAVE;
  function layout() {
    NARROW = (canvas.parentElement.clientWidth || 960) < 640;
    if (NARROW) {
      W = 480; H = 900;
      RING = { x: 0, y: 300, w: 480, h: 336, cx: 240, cy: 475, r: 92 };
      WAVE = { y: 636, x0: 122, x1: 458, cy: 792, amp: 70 };
    } else {
      W = 960; H = 520;
      RING = { x: 480, y: 0, w: 480, h: 300, cx: 720, cy: 152, r: 92 };
      WAVE = { y: 300, x0: 100, x1: 940, cy: 418, amp: 70 };
    }
    canvas.setAttribute("width", W); canvas.setAttribute("height", H);
    ctx = Lab.setupCanvas(canvas, W, H);
  }
  layout();
  const fs = (px) => (NARROW ? Math.max(17, Math.round(px * 1.42)) : px) + "px ";
  const tr = (t) => (window.I18N ? I18N.t(t) : t);

  const state = {
    m1: 36, m2: 29, distMly: 1300, pol: "plus",
    playing: !Lab.reducedMotion, t: 0, hold: 0, tv: 0,
    ripples: [], lastCycle: 0,
  };
  let P = {};          // derived parameters
  let curve = [];      // precomputed waveform samples
  let audioCtx = null;

  // ---------- Physics ----------
  function derive() {
    const m1 = state.m1, m2 = state.m2, M = m1 + m2;
    const eta = m1 * m2 / (M * M);
    const Mc = Math.pow(m1 * m2, 0.6) / Math.pow(M, 0.2);
    const T = Mc * TSUN;
    const d = state.distMly * MLY;
    // Remnant: radiated energy and final spin from simple non-spinning fits.
    const Erad = M * (0.0572 * eta + 0.498 * eta * eta);
    const Mf = M - Erad;
    const af = Math.min(0.95, Math.sqrt(12) * eta - 3.871 * eta * eta + 4.028 * eta * eta * eta);
    // l = m = 2 quasi-normal mode (Berti, Cardoso and Will fits).
    const fRd = (1.5251 - 1.1568 * Math.pow(1 - af, 0.1292)) / (2 * Math.PI * Mf * TSUN);
    const Q = 0.7 + 1.4187 * Math.pow(1 - af, -0.499);
    const tauD = Q / (Math.PI * fRd);
    // Leading-order chirp stops being trustworthy near the innermost stable orbit.
    const fIsco = 1 / (Math.pow(6, 1.5) * Math.PI * M * TSUN);
    const fMerge = 2.2 * fIsco;
    // Start a fixed number of cycles before coalescence: N = (1/32) π^(−8/3) (f T)^(−5/3).
    const f0 = Math.pow(CYCLES * 32 * Math.pow(Math.PI, 8 / 3), -0.6) / T;
    // Strain prefactor, averaged over sky position and orientation (factor 2/5).
    const K = 0.4 * 4 * (C / d) * Math.pow(T, 5 / 3);
    P = { M, eta, Mc, T, d, Erad, Mf, af, fRd, tauD, fIsco, fMerge, f0, K };
    P.tStart = -tauOf(f0);
    P.tMerge = -tauOf(fMerge);
    P.tEnd = P.tMerge + 7 * tauD;
    P.phiMerge = phiPN(-P.tMerge);
    P.hPeak = ampOf(fMerge);
    P.tauS = 0.6 * tauD;
    buildCurve();
  }
  const tauOf = (f) => (5 / 256) * Math.pow(Math.PI * f, -8 / 3) * Math.pow(P.T, -5 / 3);
  const fOfTau = (tau) => (1 / Math.PI) * Math.pow(5 / (256 * tau), 3 / 8) * Math.pow(P.T, -5 / 8);
  const phiPN = (tau) => -2 * Math.pow(tau / (5 * P.T), 5 / 8);
  const ampOf = (f) => P.K * Math.pow(Math.PI * f, 2 / 3);

  // Frequency, amplitude and phase of the wave at time t (s, coalescence at 0).
  function sample(t) {
    if (t < P.tMerge) {
      const tau = -t;
      const f = fOfTau(tau);
      return { f, A: ampOf(f), phi: phiPN(tau), merged: false };
    }
    const s = t - P.tMerge;
    const df = P.fRd - P.fMerge;
    const e = Math.exp(-s / P.tauS);
    const f = P.fRd - df * e;
    const phi = P.phiMerge + 2 * Math.PI * (P.fRd * s - df * P.tauS * (1 - e));
    return { f, A: P.hPeak * Math.exp(-s / P.tauD), phi, merged: true };
  }

  function buildCurve() {
    curve = [];
    const n = 2400;
    for (let i = 0; i <= n; i++) {
      const t = P.tStart + (P.tEnd - P.tStart) * i / n;
      const s = sample(t);
      curve.push({ t, hp: s.A * Math.cos(s.phi), hc: s.A * Math.sin(s.phi) });
    }
  }

  // Event-seconds that pass per on-screen second: slower as the pitch rises.
  const rate = (f) => FV0 / Math.sqrt(P.f0 * f);

  // ---------- Formatting ----------
  function sci(x) {
    if (!isFinite(x) || x === 0) return "0";
    const e = Math.floor(Math.log10(Math.abs(x)));
    const m = x / Math.pow(10, e);
    return m.toFixed(1) + "×10" + supers(e);
  }
  function supers(n) {
    const map = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
    return String(n).split("").map((ch) => map[ch]).join("");
  }
  function fmtDist(mly) {
    if (mly >= 1000) return (mly / 1000).toFixed(mly >= 9950 ? 0 : 1) + " billion ly";
    return Math.round(mly) + " million ly";
  }
  function fmtTime(s) {
    if (s <= 0) return "merged";
    if (s < 0.1) return (s * 1000).toFixed(1) + " ms";
    return s.toFixed(2) + " s";
  }

  // ---------- Drawing ----------
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";

  function draw(cur) {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    drawOrbit(cur);
    drawRing(cur);
    drawWave();
    // Panel dividers
    ctx.strokeStyle = "#1a2436";
    ctx.beginPath();
    if (NARROW) {
      ctx.moveTo(14, RING.y + 0.5); ctx.lineTo(W - 14, RING.y + 0.5);
      ctx.moveTo(14, WAVE.y + 0.5); ctx.lineTo(W - 14, WAVE.y + 0.5);
    } else {
      ctx.moveTo(480.5, 14); ctx.lineTo(480.5, 290);
      ctx.moveTo(14, 304.5); ctx.lineTo(946, 304.5);
    }
    ctx.stroke();
  }

  // maxW: squeeze horizontally only if a translation would run past it.
  function label(text, x, y, align, color, maxW) {
    ctx.font = fs(12) + MONO;
    ctx.fillStyle = color || "#7f8ea6";
    ctx.textAlign = align || "left";
    const t = tr(text);
    if (maxW && ctx.measureText(t).width > maxW) ctx.fillText(t, x, y, maxW); else ctx.fillText(t, x, y);
  }

  function drawOrbit(cur) {
    ctx.save();
    ctx.beginPath(); ctx.rect(ORB.x, ORB.y, ORB.w, ORB.h); ctx.clip();
    // Ripples: one ring per wave crest, fading with the amplitude it carried.
    if (!Lab.reducedMotion) {
      for (const r of state.ripples) {
        const rad = (state.tv - r.tv) * 70;
        if (rad <= 0) continue;
        const a = Math.min(0.55, 0.12 + 0.5 * r.amp) * Math.max(0, 1 - rad / 330);
        ctx.strokeStyle = `rgba(143,166,255,${a})`;
        ctx.lineWidth = 1 + 2 * r.amp;
        ctx.beginPath(); ctx.arc(ORB.cx, ORB.cy, rad, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.lineWidth = 1;
    }
    // Scale: separation at the start fills a fixed radius.
    const aOf = (f) => C * Math.pow(P.M * TSUN / Math.pow(Math.PI * f, 2), 1 / 3);
    const a0 = aOf(P.f0);
    const px = 118 / a0;                       // px per metre
    const rs = (m) => 2 * m * TSUN * C;         // Schwarzschild radius, metres
    if (!cur.merged) {
      const a = aOf(cur.f);
      const th = cur.phi / 2;
      const r1 = a * state.m2 / P.M * px, r2 = a * state.m1 / P.M * px;
      const p1 = [ORB.cx + r1 * Math.cos(th), ORB.cy + r1 * Math.sin(th)];
      const p2 = [ORB.cx - r2 * Math.cos(th), ORB.cy - r2 * Math.sin(th)];
      // Orbit traces
      ctx.strokeStyle = "#1c2639";
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.arc(ORB.cx, ORB.cy, r1, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(ORB.cx, ORB.cy, r2, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      blackHole(p1[0], p1[1], Math.max(3, rs(state.m1) * px), 1);
      blackHole(p2[0], p2[1], Math.max(3, rs(state.m2) * px), 1);
      label("separation " + Math.round(a / 1000).toLocaleString() + " km", 18, 288, "left", null, NARROW ? 230 : 0);
    } else {
      // One black hole, ringing: its horizon wobbles at the ringdown frequency.
      const wob = 0.22 * cur.A / P.hPeak;
      const r = Math.max(4, rs(P.Mf) * px);
      ctx.save();
      ctx.translate(ORB.cx, ORB.cy);
      ctx.rotate(cur.phi / 2);
      ctx.scale(1 + wob * Math.cos(cur.phi), 1 - wob * Math.cos(cur.phi));
      blackHole(0, 0, r, 1);
      ctx.restore();
      label("merged: " + P.Mf.toFixed(0) + " M☉, spin " + P.af.toFixed(2), 18, 288, "left", null, NARROW ? 270 : 0);
    }
    label("ORBIT, SEEN FROM ABOVE", 18, 24, "left", null, 444);
    if (NARROW) label("horizons to scale", 462, 24 + 24, "right", "#56647c", 300);
    else label("horizons to scale", 462, 288, "right", "#56647c");
    ctx.restore();
  }

  function blackHole(x, y, r, glow) {
    const g = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 2.4);
    g.addColorStop(0, `rgba(240,179,90,${0.55 * glow})`);
    g.addColorStop(0.35, `rgba(240,140,70,${0.18 * glow})`);
    g.addColorStop(1, "rgba(240,140,70,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,210,150,0.8)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function polStrain(cur) {
    const A = cur.A, ph = cur.phi;
    if (state.pol === "plus") return [A * Math.cos(ph), 0];
    if (state.pol === "cross") return [0, A * Math.cos(ph)];
    return [A * Math.cos(ph), A * Math.sin(ph)];
  }

  function drawRing(cur) {
    const E = 0.6 / P.hPeak;                 // exaggeration so the peak stretch is ±30 %
    const [hp, hc] = polStrain(cur).map((h) => h * E);
    const { cx, cy, r } = RING;
    const warp = (x, y) => [cx + x + 0.5 * (hp * x + hc * y), cy + y + 0.5 * (hc * x - hp * y)];
    // Undisturbed ring
    ctx.strokeStyle = "#26324a";
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // Detector arms: along x and y
    const ex = warp(r, 0), wx = warp(-r, 0), ny = warp(0, -r), sy = warp(0, r);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(240,179,90,0.7)";
    ctx.beginPath(); ctx.moveTo(wx[0], wx[1]); ctx.lineTo(ex[0], ex[1]); ctx.stroke();
    ctx.strokeStyle = "rgba(120,200,255,0.7)";
    ctx.beginPath(); ctx.moveTo(ny[0], ny[1]); ctx.lineTo(sy[0], sy[1]); ctx.stroke();
    ctx.lineWidth = 1;
    // Deformed ring outline and particles
    ctx.strokeStyle = "rgba(201,212,227,0.35)";
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const th = i / 96 * Math.PI * 2;
      const p = warp(r * Math.cos(th), r * Math.sin(th));
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const th = i / 24 * Math.PI * 2;
      const p = warp(r * Math.cos(th), r * Math.sin(th));
      ctx.fillStyle = "#e9eef7";
      ctx.beginPath(); ctx.arc(p[0], p[1], 3.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#56647c";
    ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
    const X0 = RING.x + 20, X1 = RING.x + RING.w - 18, Yb = RING.y + (NARROW ? 326 : 288);
    label("RING OF FREE PARTICLES, FACE-ON", X0, RING.y + 24 + (NARROW ? 6 : 0), "left", null, X1 - X0);
    const lx = (ex[0] - wx[0]) / (2 * r) - 1, ly = (sy[1] - ny[1]) / (2 * r) - 1;
    label("arm x " + (lx >= 0 ? "+" : "−") + Math.abs(lx * 100).toFixed(0).padStart(2, " ") + "%", X0, Yb - (NARROW ? 24 : 18), "left", "rgba(240,179,90,0.9)");
    label("arm y " + (ly >= 0 ? "+" : "−") + Math.abs(ly * 100).toFixed(0).padStart(2, " ") + "%", X0, Yb, "left", "rgba(120,200,255,0.9)");
    const e = Math.floor(Math.log10(E));
    const exTxt = "stretch exaggerated ~" + Math.round(E / Math.pow(10, e)) + "×10" + supers(e) + " times";
    if (NARROW) label(exTxt, X0, RING.y + 54, "left", "#56647c", X1 - X0);
    else label(exTxt, 942, 288, "right", "#56647c");
  }

  function drawWave() {
    const { x0, x1, cy, amp } = WAVE;
    const tx = (t) => x0 + (t - P.tStart) / (P.tEnd - P.tStart) * (x1 - x0);
    const scale = amp / P.hPeak;
    const sub = (state.pol === "both" ? "h+ and h×" : state.pol === "cross" ? "h×" : "h+") + " against seconds from merger";
    if (NARROW) {
      label("STRAIN AT EARTH, h(t)", 18, WAVE.y + 34, "left", null, W - 36);
      label(sub, 18, WAVE.y + 58, "left", "#56647c", W - 36);
    } else {
      label("STRAIN AT EARTH, h(t)", 18, 334);
      label(sub, 942, 334, "right", "#56647c");
    }
    // Axes
    ctx.strokeStyle = "#1a2436";
    ctx.beginPath(); ctx.moveTo(x0, cy + 0.5); ctx.lineTo(x1, cy + 0.5); ctx.stroke();
    ctx.font = fs(10) + MONO;
    ctx.fillStyle = "#56647c";
    ctx.textAlign = "right";
    ctx.fillText("+" + sci(P.hPeak), x0 - 6, cy - amp + 4);
    ctx.fillText("0", x0 - 6, cy + 4);
    ctx.fillText("−" + sci(P.hPeak), x0 - 6, cy + amp + 4);
    for (const y of [cy - amp, cy + amp]) { ctx.fillRect(x0 - 3, y, 3, 1); }
    // Time ticks relative to merger
    const span = P.tEnd - P.tStart;
    const step = niceStep(span / (NARROW ? 3.2 : 6));
    ctx.textAlign = "center";
    for (let k = Math.ceil((P.tStart - P.tMerge) / step); k * step <= P.tEnd - P.tMerge; k++) {
      const t = P.tMerge + k * step;
      const x = tx(t);
      ctx.fillRect(x, cy + amp + 8, 1, 4);
      const v = k * step;
      const dec = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
      ctx.fillText((Math.abs(v) < 1e-9 ? "0" : (v > 0 ? "+" : "−") + Math.abs(v).toFixed(dec)), x, cy + amp + (NARROW ? 30 : 23));
    }
    // Merger marker
    const xm = tx(P.tMerge);
    ctx.strokeStyle = "rgba(240,179,90,0.35)";
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(xm, cy - amp - 12); ctx.lineTo(xm, cy + amp + 6); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(240,179,90,0.8)";
    ctx.textAlign = "right";
    ctx.fillText("merger", xm - 4, cy - amp - (NARROW ? 6 : 4));
    // Full waveform dim, played part bright
    const keys = state.pol === "both" ? ["hc", "hp"] : ["hp"];
    for (const key of keys) {
      const bright = key === "hp" ? "#8fa6ff" : "rgba(120,200,255,0.75)";
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? bright : "#202b40";
        ctx.lineWidth = pass ? 1.6 : 1.2;
        ctx.beginPath();
        let started = false;
        for (const c of curve) {
          if (pass && c.t > state.t) break;
          // single-polarization views draw the selected component
          const h = c[key];
          const x = tx(c.t), y = cy - h * scale;
          started ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          started = true;
        }
        if (pass && started) {
          const s = sample(state.t);
          const [hp, hc] = polStrain(s);
          const h = key === "hp" ? (state.pol === "cross" ? hc : hp) : hc;
          ctx.lineTo(tx(state.t), cy - h * scale);
        }
        ctx.stroke();
      }
    }
    ctx.lineWidth = 1;
    // Playhead
    const xp = tx(state.t);
    ctx.strokeStyle = "rgba(233,238,247,0.5)";
    ctx.beginPath(); ctx.moveTo(xp + 0.5, cy - amp - 8); ctx.lineTo(xp + 0.5, cy + amp + 6); ctx.stroke();
  }
  function niceStep(x) {
    const e = Math.pow(10, Math.floor(Math.log10(x)));
    const m = x / e;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e;
  }

  // ---------- Loop ----------
  let last = performance.now();
  let lastStats = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (state.playing) advance(dt);
    const cur = sample(state.t);
    draw(cur);
    if (now - lastStats > 120) { updateStats(cur); lastStats = now; }
    requestAnimationFrame(frame);
  }

  function advance(dt) {
    state.tv += dt;
    if (state.t >= P.tEnd) {
      state.hold += dt;
      if (state.hold > HOLD) restart();
      return;
    }
    const f = sample(state.t).f;
    state.t = Math.min(P.tEnd, state.t + dt * rate(f));
    const s = sample(state.t);
    const cycle = Math.floor(s.phi / (2 * Math.PI));
    if (cycle > state.lastCycle) {
      state.ripples.push({ tv: state.tv, amp: s.A / P.hPeak });
      state.lastCycle = cycle;
    }
    state.ripples = state.ripples.filter((r) => (state.tv - r.tv) * 70 < 340);
  }

  function restart(t) {
    state.t = t === undefined ? P.tStart : t;
    state.hold = 0;
    state.ripples = [];
    state.lastCycle = Math.floor(sample(state.t).phi / (2 * Math.PI));
  }

  function updateStats(cur) {
    $("chirpMass").textContent = P.Mc.toFixed(1) + " M☉";
    $("freq").textContent = cur.f.toFixed(0) + " Hz";
    const [hp, hc] = polStrain(cur);
    $("strain").textContent = sci(Math.hypot(hp, hc) || 0);
    $("peak").textContent = sci(P.hPeak);
    $("tmerge").textContent = fmtTime(P.tMerge - state.t);
    $("slowmo").textContent = Math.round(1 / rate(cur.f)) + "×";
    $("erad").textContent = P.Erad.toFixed(1) + " M☉";
  }

  // ---------- Audio ----------
  function playChirp() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { $("hint").textContent = "This browser can't synthesize audio."; return; }
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const sr = audioCtx.sampleRate;
    const k = $("audioShift").checked ? 4 : 1;
    // Start in LIGO's band (20 Hz), but keep long, light-mass chirps to about 4 s.
    const fA = Math.min(0.8 * P.fMerge, Math.max(20, fOfTau(4)));
    const t0 = -tauOf(fA);
    const dur = P.tEnd - t0 + 0.06;
    const n = Math.ceil(dur * sr);
    const buf = audioCtx.createBuffer(1, n, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = t0 + i / sr;
      const s = sample(Math.min(t, P.tEnd + 0.06));
      let y = (s.A / P.hPeak) * Math.cos(k * s.phi);
      const fadeIn = Math.min(1, i / (0.05 * sr));
      const fadeOut = Math.min(1, (n - i) / (0.02 * sr));
      data[i] = 0.6 * y * fadeIn * fadeOut;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start();
    $("hint").textContent = "Playing " + dur.toFixed(2) + " s of real time, from " + Math.round(fA * k) + " Hz up to " +
      Math.round(P.fRd * k) + " Hz" + (k > 1 ? " (two octaves above the true " + Math.round(fA) + " to " + Math.round(P.fRd) + " Hz)." : ", the true pitch. Most phone and laptop speakers can't reproduce it; try headphones.");
  }

  // ---------- Controls ----------
  function updateReadouts() {
    $("m1Out").textContent = state.m1 + " M☉";
    $("m2Out").textContent = state.m2 + " M☉";
    $("distOut").textContent = fmtDist(state.distMly);
  }
  function massesChanged() {
    derive();
    updateReadouts();
    restart(Lab.reducedMotion || !state.playing ? stillT() : undefined);
  }
  // A telling still frame: a few cycles before merger.
  const stillT = () => -tauOf(0.75 * P.fMerge);

  $("m1").addEventListener("input", (e) => { state.m1 = +e.target.value; massesChanged(); });
  $("m2").addEventListener("input", (e) => { state.m2 = +e.target.value; massesChanged(); });
  $("dist").addEventListener("input", (e) => {
    state.distMly = Math.pow(10, +e.target.value);
    const t = state.t;
    derive();
    state.t = Math.min(t, P.tEnd);
    updateReadouts();
  });
  function preset(m1, m2, mly) {
    state.m1 = m1; state.m2 = m2; state.distMly = mly;
    $("m1").value = m1; $("m2").value = m2; $("dist").value = Math.log10(mly).toFixed(2);
    massesChanged();
  }
  $("presetGW150914").addEventListener("click", () => preset(36, 29, 1300));
  $("presetLight").addEventListener("click", () => preset(10, 8, 1300));
  $("presetHeavy").addEventListener("click", () => preset(80, 70, 1300));
  function setPol(p) {
    state.pol = p;
    for (const [id, v] of [["polPlus", "plus"], ["polCross", "cross"], ["polBoth", "both"]]) {
      $(id).setAttribute("aria-pressed", String(v === p));
    }
  }
  $("polPlus").addEventListener("click", () => setPol("plus"));
  $("polCross").addEventListener("click", () => setPol("cross"));
  $("polBoth").addEventListener("click", () => setPol("both"));
  function setPlaying(on) {
    state.playing = on;
    $("play").textContent = on ? "Pause" : "Play";
  }
  $("play").addEventListener("click", () => {
    if (!state.playing && state.t >= P.tEnd) restart();
    setPlaying(!state.playing);
  });
  $("replay").addEventListener("click", () => { restart(); setPlaying(true); });
  $("chirp").addEventListener("click", playChirp);

  // Switch layouts at the phone breakpoint; the playback state carries over.
  let rzTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(() => {
      if (((canvas.parentElement.clientWidth || 960) < 640) !== NARROW) { layout(); draw(sample(state.t)); }
    }, 120);
  }).observe(canvas.parentElement);

  // ---------- Start ----------
  derive();
  updateReadouts();
  if (Lab.reducedMotion) {
    restart(stillT());
    setPlaying(false);
  } else {
    // Open a little way in so the orbit is already moving.
    restart(P.tStart + 0.18 * (P.tMerge - P.tStart));
    setPlaying(true);
  }
  requestAnimationFrame(frame);
})();
