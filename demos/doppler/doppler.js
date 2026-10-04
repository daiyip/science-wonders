(function () {
  const canvas = document.getElementById("bench");
  const $ = (id) => document.getElementById(id);
  const W_ = window.WONDERS;
  const tr = (s) => (window.I18N ? window.I18N.t(s) : s);

  // ---------- Physics constants ----------
  const C = 343;              // speed of sound in air at 20 °C (m/s)
  const CRESTS_PER_RING = 8;  // only every 8th crest is drawn
  const HIST_KEEP = 0.8;      // seconds of position record kept (sound travels 274 m)
  const STEP = 0.001;         // largest simulation step (s)

  // ---------- Layout (logical pixels) ----------
  // Wide benches use a fixed 960-wide frame. Phones use the displayed CSS width
  // as the logical width, so canvas text keeps its real size, with a taller field.
  let W = 960, H = 560, FH = 410, narrow = false, ctx, S = 8, XH = 60; // XH: half-width shown (m)
  let PLOT = { x: 74, y: 446, w: 860, h: 86 };
  const fpx = (n) => (narrow ? Math.max(10.5, n) : n) + "px";

  function layout() {
    const cw = Math.round(canvas.clientWidth || canvas.parentElement.clientWidth || 960);
    narrow = cw < 640;
    if (!narrow) {
      W = 960; FH = 410; XH = 60; S = W / (2 * XH);
      PLOT = { x: 74, y: FH + 36, w: W - 74 - 26, h: 86 };
      H = PLOT.y + PLOT.h + 28;
    } else {
      W = Math.max(280, cw); XH = 40; S = W / (2 * XH);
      FH = Math.round(W * 0.95);
      PLOT = { x: 48, y: FH + 52, w: W - 48 - 12, h: 104 };
      H = PLOT.y + PLOT.h + 30;
    }
    ctx = Lab.setupCanvas(canvas, W, H);
  }
  layout();
  const halfY = () => FH / 2 / S;            // world half-height of the field (m)
  // The siren's pass starts and ends 20 m beyond the edges of the picture.
  const xStart = () => -XH - 20, xEnd = () => XH + 20;
  const sx = (x) => W / 2 + x * S;            // world -> screen
  const sy = (y) => FH / 2 + y * S;

  // ---------- State ----------
  const state = {
    mach: 0.4, f: 440, slow: 15, guides: true,
    lx: 15, ly: 14,
    running: !Lab.reducedMotion,
    t: 0, x: xStart(), pass: 0, phase: 0,
    volume: 40, sound: false,
  };
  let hist = [];   // {t, x, pass}: where the siren was at each moment
  let rings = [];  // {x, t}: drawn crests, made at x at time t
  let heard = [];  // current arrivals at the listener
  let plot = [];   // {w, a, b, boom}: heard pitch ratios for the strip plot
  let clock = 0;   // seconds of running animation (wall time)
  const passInfo = new Map(); // pass -> {count, maxR, dropped}

  function restart() {
    state.t = 0; state.phase = 0; state.pass++;
    state.x = state.mach < 0.05 ? -12 : xStart();
    hist = []; rings = []; heard = [];
    passInfo.clear();
    // Start with the field already full of rings, as if the siren had been driving a while.
    const pre = state.mach < 0.05 ? 0.35 : Math.min(0.35, 30 / (state.mach * C));
    simulate(pre, true);
    listenNow(true);
  }

  function simulate(dt, quiet) {
    let left = dt;
    while (left > 1e-9) {
      const h = Math.min(STEP, left);
      left -= h;
      const v = state.mach * C;
      state.t += h;
      state.x += v * h;
      state.phase += state.f * h;
      while (state.phase >= CRESTS_PER_RING) {
        state.phase -= CRESTS_PER_RING;
        const back = state.phase / state.f; // how long ago this crest was made
        rings.push({ x: state.x - v * back, t: state.t - back });
      }
      hist.push({ t: state.t, x: state.x, pass: state.pass });
      if (state.x > xEnd()) {
        state.pass++;
        state.x = xStart();
        state.phase = 0;
        hist.push({ t: state.t, x: state.x, pass: state.pass });
        if (!quiet) W_.sound("tick", { pitch: 0.3 });
      }
    }
    let k = 0;
    while (k < hist.length && hist[k].t < state.t - HIST_KEEP) k++;
    if (k) hist.splice(0, k);
    const rMax = 2.6 * Math.hypot(XH, halfY()) + 20;
    let j = 0;
    while (j < rings.length && C * (state.t - rings[j].t) > rMax) j++;
    if (j) rings.splice(0, j);
  }

  // Every moment of emission whose crest is reaching the listener right now.
  // g = c (t - te) - |L - S(te)| changes sign there. The heard frequency is
  // f times dte / dta, with ta = te + |L - S(te)| / c, from neighbouring records.
  function arrivals() {
    const out = [];
    const L = [state.lx, state.ly], t = state.t;
    let prev = null, gPrev = 0, dPrev = 0;
    for (const r of hist) {
      const d = Math.hypot(L[0] - r.x, L[1]);
      const g = C * (t - r.t) - d;
      if (prev && prev.pass === r.pass && r.t > prev.t && (gPrev >= 0) !== (g >= 0)) {
        const fr = gPrev / (gPrev - g);
        const x = prev.x + fr * (r.x - prev.x);
        const te = prev.t + fr * (r.t - prev.t);
        const dTa = (r.t + d / C) - (prev.t + dPrev / C);
        const dTe = r.t - prev.t;
        const ratio = Math.min(999, dTe / Math.max(1e-9, Math.abs(dTa)));
        const dist = Math.hypot(L[0] - x, L[1]);
        out.push({ x, te, ratio, reversed: dTa < 0, dist, pass: r.pass, ago: t - te });
      }
      prev = r; gPrev = g; dPrev = d;
    }
    // Newest emission first, so the voices keep their order between frames.
    out.sort((a, b) => b.te - a.te);
    return out.slice(0, 2);
  }

  // ---------- Listening, events and challenges ----------
  let lastSaidDrop = -1;
  function listenNow(quiet) {
    heard = arrivals();
    const byPass = new Map();
    for (const a of heard) byPass.set(a.pass, (byPass.get(a.pass) || 0) + 1);
    for (const [p, n] of byPass) {
      const info = passInfo.get(p) || { count: 0, maxR: 0, dropped: false };
      if (!quiet && info.count === 0 && n === 2) boom();
      info.count = n;
      for (const a of heard) if (a.pass === p && !a.reversed) {
        info.maxR = Math.max(info.maxR, a.ratio);
        if (!quiet && n === 1 && !info.dropped && info.maxR > 1.03 && a.ratio < 1 && state.mach < 1 && state.mach > 0.02) {
          info.dropped = true;
          if (p !== lastSaidDrop) {
            lastSaidDrop = p;
            const past = Math.max(0, state.x - state.lx);
            W_.sound("tick", { pitch: 0.2 });
            W_.describe("The pitch the listener hears has just dropped below the siren's own " + state.f + " Hz, and the siren is already " + past.toFixed(0) + " m past them.");
          }
        }
      }
      passInfo.set(p, info);
    }
    for (const [p, info] of passInfo) if (!byPass.has(p)) info.count = 0;
    if (!quiet) checkChallenges();
  }

  function boom() {
    plot.push({ w: clock, boom: true });
    W_.sound("event", { pitch: 0.15 });
    W_.describe("Boom. The Mach cone has swept over the listener, who now hears two sounds at once, one of them played backwards.", { now: true });
    if (Math.abs(state.ly) >= 20) W_.challenge("boom");
    thump();
  }

  function checkChallenges() {
    for (const a of heard) {
      if (a.reversed) continue;
      if (a.ratio >= 2) W_.challenge("double");
      if (state.mach < 1 && a.ratio >= 10 && heard.length === 1) W_.challenge("tenfold");
    }
  }

  // ---------- Sound (Web Audio, only after a click) ----------
  const AC = window.AudioContext || window.webkitAudioContext;
  let actx = null, master = null, voices = [];
  const level = () => 0.32 * Math.pow(state.volume / 100, 2);
  function startSound() {
    if (!AC) return;
    try {
      if (!actx) actx = new AC();
      if (actx.state === "suspended") actx.resume().catch(() => {});
      master = actx.createGain();
      master.gain.value = 0;
      const lp = actx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 5000;
      lp.connect(master);
      master.connect(actx.destination);
      voices = [0, 1].map(() => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = "triangle"; o.frequency.value = state.f;
        g.gain.value = 0;
        o.connect(g); g.connect(lp); o.start();
        return { o, g };
      });
      master.gain.setTargetAtTime(level(), actx.currentTime, 0.05);
    } catch (e) { voices = []; master = null; return; }
    state.sound = true;
    $("listen").textContent = "Stop sound";
    $("listen").classList.add("on");
    W_.describe("Sound on. You hear what the listener hears.", { now: true });
  }
  function stopSound(quiet) {
    if (actx && master) {
      const t = actx.currentTime, m = master, vs = voices;
      m.gain.cancelScheduledValues(t);
      m.gain.setTargetAtTime(0, t, 0.03);
      for (const v of vs) { try { v.o.stop(t + 0.25); } catch (e) {} }
      setTimeout(() => { try { m.disconnect(); } catch (e) {} }, 400);
    }
    master = null; voices = [];
    const was = state.sound;
    state.sound = false;
    $("listen").textContent = "Play sound";
    $("listen").classList.remove("on");
    if (was && !quiet) W_.describe("Sound off.", { now: true });
  }
  function updateVoices() {
    if (!state.sound || !actx || !voices.length) return;
    const now = actx.currentTime;
    for (let i = 0; i < 2; i++) {
      const a = state.running ? heard[i] : null;
      const v = voices[i];
      if (a) {
        const fq = Math.min(9000, state.f * a.ratio);
        const amp = 0.5 * Math.min(1, 14 / Math.max(1, a.dist)) * (fq > 5000 ? Math.max(0.15, 1 - (fq - 5000) / 5000) : 1);
        v.o.frequency.setTargetAtTime(fq, now, 0.012);
        v.g.gain.setTargetAtTime(amp, now, 0.03);
      } else {
        v.g.gain.setTargetAtTime(0, now, 0.03);
      }
    }
  }
  // A boom: two sharp pressure jumps (the bow and tail shocks) over a low rumble.
  function thump() {
    if (!state.sound || !actx || !master) return;
    const t0 = actx.currentTime + 0.01;
    const len = Math.floor(actx.sampleRate * 0.7);
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const out = actx.createGain();
    out.gain.value = Math.min(1, 2.2 * Math.pow(state.volume / 100, 2) + 0.05);
    out.connect(actx.destination);
    for (const [at, vol] of [[0, 1], [0.13, 0.8]]) {
      const src = actx.createBufferSource(), lp = actx.createBiquadFilter(), g = actx.createGain();
      src.buffer = buf; lp.type = "lowpass"; lp.frequency.setValueAtTime(900, t0 + at);
      lp.frequency.exponentialRampToValueAtTime(90, t0 + at + 0.35);
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.45);
      src.connect(lp); lp.connect(g); g.connect(out);
      src.start(t0 + at); src.stop(t0 + at + 0.5);
    }
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(35, t0 + 0.5);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.6, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 0.65);
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden && state.sound) stopSound(true); });

  // ---------- Drawing ----------
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";

  function drawField() {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, FH); ctx.clip();
    // 10 m grid
    ctx.strokeStyle = "#0d1522";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -XH; x <= XH; x += 10) { const px = Math.round(sx(x)) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, FH); }
    for (let y = -Math.floor(halfY() / 10) * 10; y <= halfY(); y += 10) { const py = Math.round(sy(y)) + 0.5; ctx.moveTo(0, py); ctx.lineTo(W, py); }
    ctx.stroke();
    // Road
    ctx.fillStyle = "#101826";
    ctx.fillRect(0, sy(-3), W, 6 * S);
    ctx.strokeStyle = "#2a3852";
    ctx.setLineDash([10, 10]);
    ctx.beginPath(); ctx.moveTo(0, sy(0) + 0.5); ctx.lineTo(W, sy(0) + 0.5); ctx.stroke();
    ctx.setLineDash([]);

    // Rings: exact circles from where each crest was made. Additive blending
    // makes the places where crests crowd together glow.
    ctx.globalCompositeOperation = "lighter";
    const fade = Math.hypot(XH, halfY()) * 2.2;
    ctx.lineWidth = narrow ? 1 : 1.3;
    for (const r of rings) {
      const rad = C * (state.t - r.t);
      if (rad <= 0) continue;
      const a = Math.max(0.05, 0.55 * (1 - rad / fade));
      ctx.strokeStyle = `rgba(92,200,255,${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(sx(r.x), sy(0), rad * S, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    // Mach cone
    if (state.mach > 1.001) {
      const al = Math.asin(1 / state.mach), len = 400;
      ctx.strokeStyle = "rgba(240,138,93,0.7)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(sx(state.x - len * Math.cos(al)), sy(-len * Math.sin(al)));
      ctx.lineTo(sx(state.x), sy(0));
      ctx.lineTo(sx(state.x - len * Math.cos(al)), sy(len * Math.sin(al)));
      ctx.stroke();
      ctx.setLineDash([]);
      const lx = sx(state.x - 22 * Math.cos(al)), ly = sy(-22 * Math.sin(al)) - 8;
      ctx.fillStyle = "#f08a5d";
      ctx.font = fpx(11) + " " + MONO;
      ctx.textAlign = "right";
      if (lx > 40 && lx < W + 60) ctx.fillText("Mach cone, " + (al * 180 / Math.PI).toFixed(0) + "°", Math.min(W - 6, lx), Math.max(14, ly));
    }

    // Where the heard sound came from, and the crest arriving now.
    if (state.guides) {
      for (const a of heard) {
        const gx = sx(a.x), gy = sy(0);
        const col = a.reversed ? "228,139,208" : "240,179,90";
        ctx.strokeStyle = `rgba(${col},0.35)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(gx, gy, a.dist * S, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(${col},0.8)`;
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(sx(state.lx), sy(state.ly)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(gx, gy, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgb(${col})`;
        ctx.font = fpx(11) + " " + MONO;
        ctx.textAlign = "center";
        // Label on the far side of the road from the listener; a second label goes on the near side.
        let above = state.ly > 0;
        if (heard.length === 2 && a === heard[1]) above = !above;
        const label = a.reversed ? "heard from here, backwards" : "heard from here";
        const tw = ctx.measureText(label).width / 2 + 4;
        ctx.fillText(label, Math.max(tw, Math.min(W - tw, gx)), gy + (above ? -14 : 22));
      }
    }

    drawSource();
    drawListener();
    ctx.restore();

    // Labels
    ctx.font = fpx(12) + " " + MONO;
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "left";
    fitText("SEEN FROM ABOVE", 12, 20, W / 2 - 24);
    ctx.textAlign = "right";
    fitText(state.slow === 1 ? "REAL TIME" : "TIME RUNS " + state.slow + "× SLOWER", W - 12, 20, W / 2 - 12);
    // Scale bar
    const by = FH - 14;
    ctx.strokeStyle = "#7f8ea6";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(12, by); ctx.lineTo(12 + 10 * S, by); ctx.moveTo(12, by - 4); ctx.lineTo(12, by + 4); ctx.moveTo(12 + 10 * S, by - 4); ctx.lineTo(12 + 10 * S, by + 4); ctx.stroke();
    ctx.textAlign = "left";
    ctx.font = fpx(11) + " " + MONO;
    ctx.fillText("10 m", 18 + 10 * S, by + 4);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#1a2436";
    ctx.beginPath(); ctx.moveTo(0, FH + 0.5); ctx.lineTo(W, FH + 0.5); ctx.stroke();
  }

  function drawSource() {
    const x = sx(state.x), y = sy(0);
    if (x < -40 || x > W + 40) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
    g.addColorStop(0, "rgba(240,179,90,0.45)");
    g.addColorStop(1, "rgba(240,179,90,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
    // A small vehicle with a flashing light.
    const L = Math.max(16, 4.5 * S), Wd = Math.max(9, 2 * S);
    ctx.fillStyle = "#f0b35a";
    roundRect(x - L / 2, y - Wd / 2, L, Wd, 3); ctx.fill();
    const on = Math.floor(state.t * 60) % 2 === 0;
    ctx.fillStyle = on ? "#5c8bff" : "#ff5c6c";
    ctx.beginPath(); ctx.arc(x, y, Math.max(2.5, Wd * 0.28), 0, Math.PI * 2); ctx.fill();
  }

  function drawListener() {
    const x = sx(state.lx), y = sy(state.ly);
    ctx.fillStyle = "#e9eef7";
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(233,238,247,0.7)";
    ctx.lineWidth = 1.5;
    for (const r of [11, 15]) {
      ctx.beginPath(); ctx.arc(x, y, r, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
    }
    if (focused) {
      ctx.strokeStyle = "rgba(143,166,255,0.9)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.lineWidth = 1;
    const below = y < FH - 50;
    const ty = below ? y + 32 : y - 40;
    ctx.textAlign = x < 90 ? "left" : x > W - 90 ? "right" : "center";
    const tx = x < 90 ? Math.max(6, x - 10) : x > W - 90 ? Math.min(W - 6, x + 10) : x;
    ctx.font = fpx(11) + " " + MONO;
    ctx.fillStyle = "#97a6b9";
    ctx.fillText("LISTENER", tx, ty);
    ctx.font = fpx(12) + " " + MONO;
    ctx.fillStyle = "#e9eef7";
    ctx.fillText(heardText(), tx, ty + 16);
  }

  function heardText() {
    if (!heard.length) return "hears nothing yet";
    if (heard.length === 1) return "hears " + hz(heard[0].ratio) + " Hz";
    return "hears " + hz(heard[0].ratio) + " Hz and " + hz(heard[1].ratio) + " Hz";
  }
  const hz = (r) => Math.round(Math.min(99999, state.f * r));

  // Log scale from a quarter to 16 times the siren's note.
  const LMIN = -2, LMAX = 4, WINDOW = 12;
  const yR = (r) => PLOT.y + PLOT.h * (1 - (Math.log2(Math.max(r, 0.2)) - LMIN) / (LMAX - LMIN));
  function drawPlot() {
    const P = PLOT;
    ctx.font = fpx(11) + " " + MONO;
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "left";
    fitText("PITCH HEARD, AS A MULTIPLE OF THE SIREN'S NOTE", narrow ? 12 : P.x, P.y - 10, W - 24);
    ctx.fillStyle = "#0a0f19";
    ctx.fillRect(P.x, P.y, P.w, P.h);
    ctx.font = fpx(10) + " " + MONO;
    ctx.textAlign = "right";
    for (let e = LMIN; e <= LMAX; e++) {
      const y = Math.round(yR(Math.pow(2, e))) + 0.5;
      ctx.strokeStyle = e === 0 ? "#3a4a68" : "#151e2e";
      ctx.beginPath(); ctx.moveTo(P.x, y); ctx.lineTo(P.x + P.w, y); ctx.stroke();
      if (!narrow || e % 2 === 0 || e === 1) {
        ctx.fillStyle = e === 0 ? "#97a6b9" : "#56647c";
        ctx.fillText(e >= 0 ? "×" + Math.pow(2, e) : "×1/" + Math.pow(2, -e), P.x - 6, y + 3);
      }
    }
    const xOf = (w) => P.x + P.w - ((clock - w) / WINDOW) * P.w;
    ctx.save();
    ctx.beginPath(); ctx.rect(P.x, P.y, P.w, P.h); ctx.clip();
    for (const key of ["a", "b"]) {
      ctx.strokeStyle = key === "a" ? "#f0b35a" : "#e48bd0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let on = false;
      for (const s of plot) {
        if (s.boom) continue;
        const r = s[key];
        if (r == null) { on = false; continue; }
        const x = xOf(s.w), y = yR(r);
        if (on) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        on = true;
      }
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    for (const s of plot) {
      if (!s.boom) continue;
      const x = Math.round(xOf(s.w)) + 0.5;
      ctx.strokeStyle = "#f08a5d";
      ctx.beginPath(); ctx.moveTo(x, P.y); ctx.lineTo(x, P.y + P.h); ctx.stroke();
      ctx.fillStyle = "#f08a5d";
      ctx.textAlign = "right";
      ctx.fillText("boom", x - 4, P.y + 12);
    }
    ctx.restore();
    ctx.strokeStyle = "#1f2a3f";
    ctx.strokeRect(P.x + 0.5, P.y + 0.5, P.w - 1, P.h - 1);
    ctx.fillStyle = "#56647c";
    ctx.textAlign = "right";
    ctx.fillText("now", P.x + P.w, P.y + P.h + 14);
    ctx.textAlign = "left";
    ctx.fillText(WINDOW + " s ago", P.x, P.y + P.h + 14);
  }

  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    drawField();
    drawPlot();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  // Shrink a one-line label (down to 10 px) only if it would not fit.
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

  // ---------- Readouts ----------
  const kmh = () => Math.round(state.mach * C * 3.6);
  function updateReadouts() {
    $("machOut").textContent = "Mach " + state.mach.toFixed(2);
    $("freqOut").textContent = state.f + " Hz";
    $("volumeOut").textContent = state.volume + "%";
    $("speedNow").textContent = "Mach " + state.mach.toFixed(2) + ", " + kmh() + " km/h";
    $("fEmit").textContent = state.f + " Hz";
    if (!heard.length) {
      $("fHeard").textContent = state.mach > 1 ? "nothing, the cone has not arrived" : "nothing yet";
      $("ratio").textContent = "–";
      $("ago").textContent = "–";
    } else if (heard.length === 1) {
      const a = heard[0];
      $("fHeard").textContent = hz(a.ratio) + " Hz";
      $("ratio").textContent = "×" + a.ratio.toFixed(2);
      $("ago").textContent = a.ago.toFixed(2) + " s ago, " + a.dist.toFixed(0) + " m away";
    } else {
      const [a, b] = heard;
      $("fHeard").textContent = hz(a.ratio) + " Hz and " + hz(b.ratio) + " Hz";
      $("ratio").textContent = "×" + a.ratio.toFixed(2) + " and ×" + b.ratio.toFixed(2);
      $("ago").textContent = a.ago.toFixed(2) + " s and " + b.ago.toFixed(2) + " s ago";
    }
    $("coneAngle").textContent = state.mach < 1 ? "no cone below Mach 1"
      : state.mach < 1.005 ? "90°, a flat wall" : (Math.asin(1 / state.mach) * 180 / Math.PI).toFixed(0) + "°";
  }

  W_.describer(() => {
    const head = state.mach < 0.005
      ? "A siren sits still on the road, sending out " + state.f + " Hz in perfect circles."
      : "A siren drives along the road at Mach " + state.mach.toFixed(2) + ", " + kmh() + " km/h, sending out " + state.f + " Hz.";
    const gap = Math.abs(state.x - state.lx).toFixed(0), dy = Math.abs(state.ly).toFixed(0);
    const where = state.x < state.lx
      ? "The listener stands " + dy + " m from the road, and the siren still has " + gap + " m to go before it passes them."
      : "The listener stands " + dy + " m from the road, and the siren is " + gap + " m past them.";
    let now;
    if (!heard.length) now = state.mach > 1 ? "The siren is faster than sound, and its cone has not reached the listener yet, so they hear nothing." : "No sound has reached the listener yet.";
    else if (heard.length === 1) now = "They hear " + hz(heard[0].ratio) + " Hz, " + heard[0].ratio.toFixed(2) + " times the siren's note, from sound made " + heard[0].dist.toFixed(0) + " m away.";
    else now = "They hear two sounds at once, " + hz(heard[0].ratio) + " Hz and " + hz(heard[1].ratio) + " Hz, the second one played backwards.";
    return [head, where, now].map(tr).join(" ");
  });

  // ---------- Loop ----------
  let lastT = performance.now(), lastStats = 0, lastPlot = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (state.running) {
      clock += dt;
      simulate(dt / state.slow);
      listenNow(false);
      if (clock - lastPlot > 0.03) {
        lastPlot = clock;
        const a = heard[0], b = heard[1];
        plot.push({ w: clock, a: a ? a.ratio : null, b: b ? b.ratio : null });
        while (plot.length && plot[0].w < clock - WINDOW - 1) plot.shift();
      }
    }
    updateVoices();
    if (now - lastStats > 120) { lastStats = now; updateReadouts(); }
    draw();
    requestAnimationFrame(frame);
  }

  // ---------- Listener: pointer and keyboard ----------
  let focused = false, dragging = false;
  function setListener(x, y, say) {
    state.lx = Math.max(-XH + 2, Math.min(XH - 2, x));
    state.ly = Math.max(-halfY() + 2, Math.min(halfY() - 2, y));
    $("listenerX").value = state.lx.toFixed(1);
    $("listenerY").value = state.ly.toFixed(1);
    listenNow(true);
    if (say) W_.describe("The listener is now " + Math.abs(state.ly).toFixed(0) + " m from the road.");
  }
  function worldFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    const px = (e.clientX - r.left) * (W / r.width), py = (e.clientY - r.top) * (H / r.height);
    return { px, py, x: (px - W / 2) / S, y: (py - FH / 2) / S };
  }
  canvas.addEventListener("pointerdown", (e) => {
    const p = worldFromEvent(e);
    if (p.py > FH) return;
    dragging = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    setListener(p.x, p.y);
    e.preventDefault();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const p = worldFromEvent(e);
    setListener(p.x, p.y);
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    W_.describe("The listener is now " + Math.abs(state.ly).toFixed(0) + " m from the road.");
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("focus", () => { focused = true; });
  canvas.addEventListener("blur", () => { focused = false; });
  canvas.addEventListener("keydown", (e) => {
    const k = e.key, s = e.shiftKey ? 5 : 1;
    let handled = true;
    if (k === "ArrowLeft") setListener(state.lx - s, state.ly, true);
    else if (k === "ArrowRight") setListener(state.lx + s, state.ly, true);
    else if (k === "ArrowUp") setListener(state.lx, state.ly - s, true);
    else if (k === "ArrowDown") setListener(state.lx, state.ly + s, true);
    else if (k === "+" || k === "=") nudgeMach(e.shiftKey ? 0.1 : 0.05);
    else if (k === "-" || k === "_") nudgeMach(e.shiftKey ? -0.1 : -0.05);
    else if (k === " ") setPlay(!state.running);
    else handled = false;
    if (handled) e.preventDefault();
  });
  function nudgeMach(d) {
    const el = $("mach");
    el.value = String(Math.max(0, Math.min(2, Math.round((+el.value + d) * 100) / 100)));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // ---------- Controls ----------
  function setPlay(on) {
    state.running = on;
    $("play").textContent = on ? "Pause" : "Play";
  }
  let wasSuper = false;
  function setMach(m) {
    const before = state.mach;
    state.mach = m;
    const sup = m > 1.001;
    if (sup && !wasSuper) W_.describe("The siren is now faster than sound. Its rings pile up into a cone with a half-angle of " + (Math.asin(1 / m) * 180 / Math.PI).toFixed(0) + " degrees.", { now: true });
    else if (Math.abs(m - 1) < 0.005 && Math.abs(before - 1) >= 0.005) W_.describe("At Mach 1 the rings sent forward pile up into a single wall at the siren's nose.", { now: true });
    else if (!sup && wasSuper) W_.describe("Back below the speed of sound, at Mach " + m.toFixed(2) + ".");
    else W_.describe("Speed Mach " + m.toFixed(2) + ", " + kmh() + " km/h.");
    wasSuper = sup;
    updateReadouts();
  }
  $("mach").addEventListener("input", (e) => setMach(+e.target.value));
  const PRESETS = { preCar: 0.08, preJet: 0.85, preMach1: 1, preMach2: 2 };
  for (const id of Object.keys(PRESETS)) {
    $(id).addEventListener("click", () => {
      $("mach").value = String(PRESETS[id]);
      setMach(PRESETS[id]);
      if (state.x > state.lx - 10 || PRESETS[id] < 0.2) restart();
      if (!state.running) setPlay(true);
    });
  }
  $("freq").addEventListener("input", (e) => { state.f = +e.target.value; updateReadouts(); });
  $("volume").addEventListener("input", (e) => {
    state.volume = +e.target.value;
    if (master && actx) master.gain.setTargetAtTime(level(), actx.currentTime, 0.03);
    updateReadouts();
  });
  $("listen").addEventListener("click", () => (state.sound ? stopSound() : startSound()));
  $("slowmo").addEventListener("change", (e) => {
    state.slow = +e.target.value;
    W_.describe(state.slow === 1 ? "Real time." : "Time runs " + state.slow + " times slower.");
  });
  $("guides").addEventListener("change", (e) => { state.guides = e.target.checked; });
  $("play").addEventListener("click", () => setPlay(!state.running));
  $("restart").addEventListener("click", () => { restart(); if (!state.running) setPlay(true); });
  $("listenerX").addEventListener("input", (e) => { if (isFinite(+e.target.value)) setListener(+e.target.value, state.ly); });
  $("listenerY").addEventListener("input", (e) => { if (isFinite(+e.target.value)) setListener(state.lx, +e.target.value); });

  // Re-layout when the bench changes width; the simulation state is kept.
  let lastCW = 0;
  function onResize() {
    const cw = Math.round(canvas.parentElement.clientWidth);
    if (cw === lastCW) return;
    lastCW = cw;
    layout();
    setListener(state.lx, state.ly);
    draw();
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvas.parentElement);
  else window.addEventListener("resize", onResize);

  restart();
  // With reduced motion the page opens on a still frame with the siren mid-pass.
  if (Lab.reducedMotion) { setPlay(false); simulate(Math.max(0, (state.lx - 25 - state.x) / (state.mach * C)), true); listenNow(true); }
  updateReadouts();
  requestAnimationFrame(frame);
})();
