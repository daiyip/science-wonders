(function () {
  const canvas = document.getElementById("bench");
  const $ = (id) => document.getElementById(id);
  const tr = (s) => (window.I18N ? window.I18N.t(s) : s);
  const TAU = Math.PI * 2;
  const DEG = 180 / Math.PI;

  // ---------- Objects ----------
  // Each object is one damped oscillator x'' + γx' + ω0² g(x) = F0 cos φ, φ' = ω.
  // Internal units: swing in radians, glass rim in units of its breaking amplitude,
  // bridge sway in centimetres. a1 is the resonant amplitude per unit strength per unit Q,
  // so F0 = s·a1·ω0² and A(ω0) = s·a1·Q.
  const PRESETS = {
    swing: {
      f0: Math.sqrt(9.81 / 2.5) / TAU, fMin: 0.1, fMax: 0.6, fStep: 0.005, f: 0.315, fDigits: 3,
      qMin: 3, qMax: 30, q: 20, s: 60, a1: 0.0406, kick: 0.16, window: 40,
      traceMin: 10 / DEG, curveMax: 60 / DEG, nonlinear: true,
    },
    glass: {
      f0: 660, fMin: 650, fMax: 670, fStep: 0.05, f: 657, fDigits: 2,
      qMin: 100, qMax: 3000, q: 800, s: 50, a1: 0.004, kick: 0.06 * 660 * TAU, window: 1,
      traceMin: 1.25, curveMax: 2, nonlinear: false,
    },
    bridge: {
      f0: 1.0, fMin: 0.5, fMax: 1.5, fStep: 0.01, f: 0.95, fDigits: 2,
      qMin: 2, qMax: 200, q: 60, s: 50, a1: 0.3, kick: 0.6 * TAU, window: 60,
      traceMin: 2, curveMax: 20, nonlinear: false,
    },
  };

  const state = {
    preset: "swing", drive: "motor", f: 0.315, s: 60, q: 20,
    running: !Lab.reducedMotion,
    t: 0, x: 0, v: 0, phi: 0,
    lockC: 0, lockS: 0,
    shattered: false, shatterT: 0, shards: [],
    pushes: [], lastPushGain: null, pushAnim: 0, pushText: null,
    handFresh: true, settleSaid: false, beatSaid: false, bridgeOK: 0,
    visPhase: 0, walkT: 0,
  };
  const P = () => PRESETS[state.preset];
  const w0 = () => TAU * P().f0;
  const wd = () => TAU * state.f;
  const gamma = () => w0() / state.q;
  const F0 = () => (state.drive === "motor" ? (state.s / 100) * P().a1 * w0() * w0() : 0);

  // Steady-state (linear) amplitude and lag at drive frequency f.
  function steady(f) {
    const W0 = w0(), w = TAU * f, g = gamma();
    const re = W0 * W0 - w * w, im = g * w;
    const F = (state.s / 100) * P().a1 * W0 * W0;
    return { A: F / Math.hypot(re, im), lag: Math.atan2(im, re) };
  }

  // ---------- Integration (RK4) ----------
  function acc(x, v, cphi) {
    const W0 = w0();
    const restore = P().nonlinear ? Math.sin(x) : x;
    return -W0 * W0 * restore - gamma() * v + F0() * cphi;
  }
  function rk4(h) {
    const x = state.x, v = state.v, phi = state.phi, w = wd();
    const c0 = Math.cos(phi), cm = Math.cos(phi + 0.5 * w * h), c1 = Math.cos(phi + w * h);
    const k1x = v, k1v = acc(x, v, c0);
    const k2x = v + 0.5 * h * k1v, k2v = acc(x + 0.5 * h * k1x, k2x, cm);
    const k3x = v + 0.5 * h * k2v, k3v = acc(x + 0.5 * h * k2x, k3x, cm);
    const k4x = v + h * k3v, k4v = acc(x + h * k3x, k4x, c1);
    state.x = x + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    state.v = v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    state.phi = phi + w * h;
    if (state.phi > 1e6) state.phi -= TAU * Math.floor(state.phi / TAU);
    state.t += h;
  }

  // ---------- Trace bins (min/max per column) ----------
  const NB = 480;
  const bins = { id: new Float64Array(NB), mn: new Float32Array(NB), mx: new Float32Array(NB), last: new Float32Array(NB), drv: new Float32Array(NB) };
  let binW = 40 / NB;
  function clearBins() { bins.id.fill(-1); binW = P().window / NB; }
  function binPush(t, x, d) {
    const id = Math.floor(t / binW), k = id % NB;
    if (bins.id[k] !== id) { bins.id[k] = id; bins.mn[k] = x; bins.mx[k] = x; }
    else { if (x < bins.mn[k]) bins.mn[k] = x; if (x > bins.mx[k]) bins.mx[k] = x; }
    bins.last[k] = x; bins.drv[k] = d;
  }
  // Largest |x| over the last span seconds.
  function peakOver(span) {
    const cur = Math.floor(state.t / binW), n = Math.min(NB, Math.ceil(span / binW) + 1);
    let m = 0;
    for (let j = cur; j > cur - n && j >= 0; j--) {
      const k = j % NB;
      if (bins.id[k] !== j) continue;
      m = Math.max(m, Math.abs(bins.mn[k]), Math.abs(bins.mx[k]));
    }
    return m;
  }
  const period = () => 1 / P().f0;
  function ampNow() {
    const span = 1.05 * Math.max(period(), state.drive === "motor" ? 1 / state.f : 0);
    return Math.max(peakOver(span), Math.abs(state.x));
  }
  // Size of the transient: distance from the steady-state motion.
  function transient() {
    if (state.drive !== "motor") return Math.hypot(state.x, state.v / w0());
    const st = steady(state.f), w = wd();
    const xs = st.A * Math.cos(state.phi - st.lag), vs = -st.A * w * Math.sin(state.phi - st.lag);
    return Math.hypot(state.x - xs, (state.v - vs) / w0());
  }
  function measuredLag() {
    if (state.drive !== "motor" || state.s === 0 || state.shattered) return null;
    if (Math.hypot(state.lockC, state.lockS) < 1e-9) return null;
    return Math.atan2(state.lockS, state.lockC);
  }

  function advance(dt) {
    if (state.shattered) return;
    const pmin = Math.min(period(), state.drive === "motor" ? 1 / state.f : Infinity);
    const n = Math.max(1, Math.ceil(dt / (pmin / 120)));
    const h = dt / n;
    const Tc = 3 / state.f;
    const a = Math.min(1, h / Tc);
    for (let i = 0; i < n; i++) {
      rk4(h);
      const c = Math.cos(state.phi), s = Math.sin(state.phi);
      state.lockC += (state.x * c - state.lockC) * a;
      state.lockS += (state.x * s - state.lockS) * a;
      binPush(state.t, state.x, state.drive === "motor" ? c : 0);
      if (state.preset === "glass" && Math.abs(state.x) >= 1) { shatter(); break; }
    }
  }

  function energy(x, v) {
    const W0 = w0();
    return P().nonlinear ? 0.5 * v * v + W0 * W0 * (1 - Math.cos(x)) : 0.5 * v * v + 0.5 * W0 * W0 * x * x;
  }

  // ---------- Glass breaking ----------
  function shatter() {
    state.shattered = true;
    state.shatterT = performance.now();
    state.x = 0; state.v = 0;
    const shards = [];
    for (let i = 0; i < 22; i++) {
      const u = Math.random() * 2 - 1, hgt = 0.15 + Math.random() * 0.85;
      const pts = [];
      const m = 3 + (Math.random() < 0.4 ? 1 : 0), r = 0.08 + Math.random() * 0.14;
      for (let k = 0; k < m; k++) { const a = (k / m) * TAU + Math.random() * 0.8; pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.8]); }
      shards.push({ x: u * (0.25 + 0.75 * hgt), y: -hgtToY(hgt), vx: u * (2 + Math.random() * 3) + (Math.random() - 0.5) * 2, vy: -(1 + Math.random() * 4), a: 0, w: (Math.random() - 0.5) * 16, pts, rest: false });
    }
    state.shards = shards;
    crackSound();
    stopTone();
    WONDERS.sound("event", { pitch: 0.9 });
    WONDERS.describe("Crack! The wine glass shattered with the tone at " + state.f.toFixed(2) + " Hz, " + Math.abs(state.f - 660).toFixed(2) + " Hz from its natural note. Press Restart for a new glass.", { now: true });
    if (state.drive === "motor") WONDERS.challenge("glass");
    updateReadouts();
  }
  // Bowl height (0 at bottom of bowl, 1 at rim) to glass units above the table (rim radius = 1).
  function hgtToY(h) { return 2.1 + h * 1.9; }

  // ---------- Layout (logical pixels) ----------
  let W = 960, H = 540, narrow = false, ctx;
  let SC, DIAL, TRc, CV, PH, TITLE = {}, CAP;
  const fpx = (n) => (narrow ? Math.max(11, n) : n) + "px";
  const MONO = " 'IBM Plex Mono', ui-monospace, monospace";
  const SANS = " 'IBM Plex Sans', system-ui, sans-serif";

  function layout() {
    const cw = Math.round(canvas.clientWidth || canvas.parentElement.clientWidth || 960);
    narrow = cw < 640;
    if (!narrow) {
      W = 960; H = 540;
      SC = { x: 16, y: 40, w: 430, h: 366 };
      DIAL = { x: 70, y: 470, r: 40 };
      TRc = { x: 528, y: 42, w: 412, h: 150 };
      CV = { x: 528, y: 256, w: 412, h: 140 };
      PH = { x: 528, y: 408, w: 412, h: 66 };
      TITLE = { sc: [SC.x + SC.w / 2, 24], tr: [TRc.x + TRc.w / 2 - 20, 24], cv: [CV.x + CV.w / 2 - 20, 236] };
      CAP = { x: CV.x + CV.w / 2 - 20, y: 522 };
    } else {
      W = Math.max(300, cw);
      let y = 0;
      TITLE.sc = [W / 2, y + 18];
      SC = { x: 6, y: y + 26, w: W - 12, h: Math.round(Math.min(330, (W - 12) * 0.8)) };
      y = SC.y + SC.h;
      DIAL = { x: 40, y: y + 46, r: 30 };
      y += 96;
      TITLE.tr = [W / 2, y + 18];
      TRc = { x: 46, y: y + 30, w: W - 58, h: 120 };
      y = TRc.y + TRc.h + 22;
      TITLE.cv = [W / 2, y + 22];
      CV = { x: 46, y: y + 34, w: W - 58, h: 130 };
      y = CV.y + CV.h;
      PH = { x: 46, y: y + 12, w: W - 58, h: 56 };
      y = PH.y + PH.h + 24;
      CAP = { x: W / 2, y: y + 14 };
      H = Math.round(y + 50);
    }
    ctx = Lab.setupCanvas(canvas, W, H);
  }
  layout();

  // ---------- Text helpers ----------
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
  function arrow(x1, y1, x2, y2, col, wdt) {
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 2) return;
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L, hd = Math.min(9, L * 0.45);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wdt || 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - ux * hd * 0.7, y2 - uy * hd * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ux * hd - uy * hd * 0.5, y2 - uy * hd + ux * hd * 0.5); ctx.lineTo(x2 - ux * hd + uy * hd * 0.5, y2 - uy * hd - ux * hd * 0.5); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 1;
  }

  // ---------- Units ----------
  function fmtAmp(a) {
    if (state.preset === "swing") return (a * DEG).toFixed(1) + "°";
    if (state.preset === "glass") return Math.round(a * 100) + "% of breaking point";
    return a.toFixed(1) + " cm";
  }
  function fmtAxis(a) {
    if (state.preset === "swing") return Math.round(a * DEG) + "°";
    if (state.preset === "glass") return Math.round(a * 100) + "%";
    return (Math.abs(a) < 10 && a % 1 ? a.toFixed(1) : Math.round(a)) + " cm";
  }
  const fmtF = (f) => f.toFixed(P().fDigits) + " Hz";
  const qStr = (q) => (q < 10 ? q.toFixed(1) : q < 100 ? String(Math.round(q)) : String(Math.round(q / 10) * 10));
  const fmtQ = (q) => "Q = " + qStr(q);

  // ---------- Drawing: the scene ----------
  const COL = { amber: "#f0b35a", cyan: "#5cc8ff", soft: "#7f8ea6", dim: "#56647c", grid: "#151e2e", rule: "#1f2a3f", red: "#f08a5d", green: "#4cc48d", ink: "#e9eef7" };

  function sceneTitle() {
    ctx.font = fpx(12) + MONO;
    ctx.fillStyle = COL.soft;
    ctx.textAlign = "center";
    const t = state.preset === "swing" ? "PLAYGROUND SWING, 2.5 M ROPES" : state.preset === "glass" ? "WINE GLASS, NOTE 660 HZ" : "FOOTBRIDGE SEEN FROM ABOVE";
    fitText(t, TITLE.sc[0], TITLE.sc[1], W - 16);
  }

  function drawSwing() {
    const S = SC, cx = S.x + S.w / 2, top = S.y + 18, ground = S.y + S.h - 10;
    const L = ground - top - 46;
    // Frame (side view: an A over the pivot)
    ctx.strokeStyle = "#3a4a66"; ctx.lineWidth = 5; ctx.lineCap = "round";
    const spread = Math.min(S.w * 0.36, L * 0.62);
    ctx.beginPath(); ctx.moveTo(cx - spread, ground); ctx.lineTo(cx, top); ctx.lineTo(cx + spread, ground); ctx.stroke();
    ctx.lineCap = "butt"; ctx.lineWidth = 1;
    ctx.strokeStyle = "#1f2a3f";
    ctx.beginPath(); ctx.moveTo(S.x + 4, ground + 0.5); ctx.lineTo(S.x + S.w - 4, ground + 0.5); ctx.stroke();
    // Amplitude guide
    const A = Math.min(ampNow(), Math.PI * 0.95);
    if (A > 0.01) {
      ctx.strokeStyle = "rgba(92,200,255,0.25)"; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(cx, top, L + 14, Math.PI / 2 - A, Math.PI / 2 + A); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "rgba(92,200,255,0.8)"; ctx.font = fpx(11) + MONO; ctx.textAlign = "center";
      const ex = cx + (L + 28) * Math.sin(A), ey = top + (L + 28) * Math.cos(A);
      if (ey < ground - 4) ctx.fillText(Math.round(A * DEG) + "°", ex, ey + 4);
    }
    // Rope and seat
    const th = state.x;
    const sx = cx + L * Math.sin(th), sy = top + L * Math.cos(th);
    ctx.strokeStyle = "#9aa7bd"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-th);
    // seat
    ctx.fillStyle = COL.amber; ctx.fillRect(-18, -2, 36, 6);
    // rider: torso up along the rope, legs forward (+x)
    ctx.strokeStyle = COL.cyan; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(-4, -26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(14, -2); ctx.lineTo(20, 14); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, -22); ctx.lineTo(-1, -40); ctx.stroke();
    ctx.lineCap = "butt"; ctx.lineWidth = 1;
    ctx.fillStyle = COL.cyan; ctx.beginPath(); ctx.arc(-5, -34, 7, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(cx, top, 4, 0, TAU); ctx.fill();

    if (state.drive === "motor") {
      // The periodic push, drawn along the direction of motion at the seat.
      const f = (state.s / 100) * Math.cos(state.phi);
      const len = 52 * f;
      const tx = Math.cos(th), ty = -Math.sin(th);
      arrow(sx - tx * 4, sy - 20 - ty * 4, sx + tx * len, sy - 20 + ty * len, "rgba(240,179,90,0.9)", 2.5);
    } else {
      // A person standing behind the rest position, pushing forward (+x).
      const px = cx - Math.min(70, S.w * 0.16), feet = ground;
      const reach = state.pushAnim > 0 ? 1 : 0;
      ctx.strokeStyle = "#c9a0f0"; ctx.fillStyle = "#c9a0f0"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(px - 8, feet); ctx.lineTo(px - 2, feet - 30); ctx.lineTo(px + 6, feet); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px - 2, feet - 30); ctx.lineTo(px - 4, feet - 62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px - 4, feet - 56); ctx.lineTo(px + 14 + reach * 16, feet - 50); ctx.stroke();
      ctx.beginPath(); ctx.arc(px - 5, feet - 72, 8, 0, TAU); ctx.fill();
      ctx.lineCap = "butt"; ctx.lineWidth = 1;
    }
    if (state.pushText) drawPushText(sx, sy - 58);
  }

  function drawPushText(x, y) {
    const pt = state.pushText, age = (performance.now() - pt.at) / 1000;
    if (age > 1.6) { state.pushText = null; return; }
    ctx.globalAlpha = Math.max(0, 1 - age / 1.6);
    ctx.font = "600 " + fpx(13) + SANS; ctx.textAlign = "center";
    ctx.fillStyle = pt.good ? COL.green : COL.red;
    ctx.fillText(pt.text, Math.max(SC.x + 50, Math.min(SC.x + SC.w - 50, x)), y - age * 18);
    ctx.globalAlpha = 1;
  }

  function drawGlass() {
    const S = SC, cx = S.x + S.w / 2, ground = S.y + S.h - 14;
    const R = Math.min(S.w * 0.15, S.h * 0.15);
    const yAt = (u) => ground - u * R; // glass units -> px
    ctx.strokeStyle = "#1f2a3f";
    ctx.beginPath(); ctx.moveTo(S.x + 4, ground + 0.5); ctx.lineTo(S.x + S.w - 4, ground + 0.5); ctx.stroke();
    const A = state.shattered ? 0 : ampNow();
    const e = Math.min(0.3, 0.32 * A) * (Lab.reducedMotion ? 0.6 : 1);
    const c = Math.cos(state.visPhase);
    const rx = R * (1 + e * c), ry = R * 0.26 * (1 - e * c);
    const rimY = yAt(hgtToY(1)), bowlBot = yAt(hgtToY(0)), stemTop = bowlBot;
    const glassStroke = "rgba(200,225,255,0.85)", glassFill = "rgba(150,190,255,0.08)";

    // Loudspeaker on the left, with sound waves in motor mode.
    const spx = S.x + Math.max(26, S.w * 0.08), spy = rimY + R * 0.9;
    ctx.fillStyle = "#26324a"; ctx.fillRect(spx - 12, spy - 14, 12, 28);
    ctx.beginPath(); ctx.moveTo(spx, spy - 8); ctx.lineTo(spx + 12, spy - 18); ctx.lineTo(spx + 12, spy + 18); ctx.lineTo(spx, spy + 8); ctx.closePath(); ctx.fill();
    if (state.drive === "motor" && state.s > 0 && !state.shattered) {
      const reach = cx - rx - spx - 20;
      for (let k = 0; k < 4; k++) {
        const ph = ((state.visPhase / TAU) + k / 4) % 1;
        ctx.strokeStyle = `rgba(240,179,90,${(0.15 + 0.6 * state.s / 100) * (1 - ph)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(spx + 14, spy, 8 + ph * reach, -0.5, 0.5); ctx.stroke();
      }
      ctx.lineWidth = 1;
    }

    // Foot and stem (survive breaking)
    ctx.strokeStyle = glassStroke; ctx.fillStyle = glassFill; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(cx, ground - 3, R * 0.75, R * 0.14, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 3, ground - 4); ctx.lineTo(cx - 3, stemTop); ctx.moveTo(cx + 3, ground - 4); ctx.lineTo(cx + 3, stemTop); ctx.stroke();

    if (!state.shattered) {
      // Bowl: its width follows the rim's oval.
      const bh = rimY - bowlBot;
      ctx.beginPath();
      ctx.moveTo(cx - rx, rimY);
      ctx.bezierCurveTo(cx - rx * 1.04, rimY - bh * 0.55, cx - R * 0.5, bowlBot, cx, bowlBot);
      ctx.bezierCurveTo(cx + R * 0.5, bowlBot, cx + rx * 1.04, rimY - bh * 0.55, cx + rx, rimY);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, rimY, rx, Math.max(2, ry), 0, 0, TAU); ctx.stroke();
      // Glint
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - rx * 0.62, rimY + 8); ctx.quadraticCurveTo(cx - rx * 0.7, rimY - bh * 0.4, cx - R * 0.3, bowlBot - 6); ctx.stroke();
      ctx.lineWidth = 1;
      // Danger glow near the breaking point
      if (A > 0.6) {
        ctx.strokeStyle = `rgba(240,138,93,${Math.min(0.8, (A - 0.6) * 2)})`;
        ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, rimY, rx + 5, ry + 4, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
      }
      // Vibration lines beside the rim
      if (A > 0.05) {
        ctx.strokeStyle = `rgba(92,200,255,${Math.min(0.7, A)})`;
        for (const sgn of [-1, 1]) for (let k = 1; k <= 2; k++) {
          const x0 = cx + sgn * (R * (1 + 0.32) + k * 7);
          ctx.beginPath(); ctx.arc(x0 - sgn * 30, rimY - 4, 30, sgn > 0 ? -0.35 : Math.PI - 0.35, sgn > 0 ? 0.35 : Math.PI + 0.35); ctx.stroke();
        }
      }
    } else {
      // Jagged stub on the stem, a crack flash, then shards.
      ctx.beginPath(); ctx.moveTo(cx - R * 0.35, bowlBot - R * 0.25); ctx.lineTo(cx - R * 0.15, bowlBot - R * 0.1); ctx.lineTo(cx - R * 0.05, bowlBot - R * 0.3);
      ctx.lineTo(cx + R * 0.12, bowlBot - R * 0.12); ctx.lineTo(cx + R * 0.33, bowlBot - R * 0.28); ctx.lineTo(cx + R * 0.2, bowlBot); ctx.lineTo(cx - R * 0.2, bowlBot); ctx.closePath();
      ctx.fill(); ctx.stroke();
      const age = (performance.now() - state.shatterT) / 1000;
      if (age < 0.25) {
        ctx.fillStyle = `rgba(255,240,200,${0.5 * (1 - age / 0.25)})`;
        ctx.beginPath(); ctx.arc(cx, (rimY + bowlBot) / 2, R * (1 + age * 6), 0, TAU); ctx.fill();
      }
      for (const s of state.shards) {
        ctx.save(); ctx.translate(cx + s.x * R, ground + s.y * R); ctx.rotate(s.a);
        ctx.beginPath(); s.pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * R, p[1] * R) : ctx.moveTo(p[0] * R, p[1] * R))); ctx.closePath();
        ctx.fillStyle = "rgba(170,205,255,0.18)"; ctx.fill(); ctx.strokeStyle = glassStroke; ctx.stroke();
        ctx.restore();
      }
      ctx.font = "600 " + fpx(18) + SANS; ctx.textAlign = "center"; ctx.fillStyle = COL.red;
      ctx.fillText("Crack!", cx, rimY - R * 0.4);
      ctx.font = fpx(11) + SANS; ctx.fillStyle = COL.soft;
      fitText("Press Restart for a new glass", cx, rimY - R * 0.4 + 20, S.w - 20);
    }
    ctx.lineWidth = 1;

    // Inset: the rim seen from above, flexing into an oval.
    const ir = Math.min(30, S.w * 0.08), ix = S.x + S.w - ir - 14, iy = S.y + ir + 26;
    ctx.font = fpx(10) + MONO; ctx.fillStyle = COL.dim; ctx.textAlign = "center";
    fitText("RIM FROM ABOVE", ix, iy - ir - 10, 2 * ir + 40);
    ctx.strokeStyle = "#26324a"; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (!state.shattered) {
      ctx.strokeStyle = glassStroke; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k <= 64; k++) {
        const a = (k / 64) * TAU, r = ir * (1 + 1.4 * e * Math.cos(2 * a) * c);
        k ? ctx.lineTo(ix + r * Math.cos(a), iy + r * Math.sin(a)) : ctx.moveTo(ix + r * Math.cos(a), iy + r * Math.sin(a));
      }
      ctx.stroke(); ctx.lineWidth = 1;
    }
    ctx.font = fpx(10) + MONO; ctx.fillStyle = COL.dim; ctx.textAlign = "left";
    fitText("RIM MOTION SLOWED AND EXAGGERATED", S.x + 6, S.y + 12, S.w - 2 * ir - 50);
    if (state.drive === "hand" && state.pushText) drawPushText(cx, rimY - R * 0.6);
  }

  function drawBridge() {
    const S = SC, ya = S.y + S.h / 2;
    const bank = Math.max(26, S.w * 0.08);
    const xa = S.x + bank, xb = S.x + S.w - bank;
    // Water and banks
    ctx.fillStyle = "rgba(30,70,120,0.32)"; ctx.fillRect(xa, S.y + 10, xb - xa, S.h - 24);
    ctx.strokeStyle = "rgba(92,200,255,0.12)";
    for (let k = 0; k < 7; k++) {
      const yy = S.y + 24 + k * (S.h - 50) / 6, off = ((state.walkT * 12 + k * 37) % 60);
      ctx.beginPath();
      for (let xx = xa + off; xx < xb - 20; xx += 60) { ctx.moveTo(xx, yy); ctx.lineTo(xx + 18, yy); }
      ctx.stroke();
    }
    ctx.fillStyle = "#1c2a1f"; ctx.fillRect(S.x, S.y + 10, bank, S.h - 24); ctx.fillRect(xb, S.y + 10, bank, S.h - 24);
    // Deck, displaced sideways in the first mode shape sin(πs).
    const k = S.h * 0.022;                // px per cm of sway
    const exag = Math.round((k / ((xb - xa) / 14400)) / 10) * 10; // span 144 m = 14400 cm
    const half = Math.max(9, S.h * 0.035);
    const off = (s) => state.x * k * Math.sin(Math.PI * s);
    const N = 48;
    ctx.fillStyle = "#2a3852";
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const s = i / N; const X = xa + s * (xb - xa), Y = ya + off(s) - half; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    for (let i = N; i >= 0; i--) { const s = i / N; ctx.lineTo(xa + s * (xb - xa), ya + off(s) + half); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#9aa7bd"; ctx.lineWidth = 1.5;
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= N; i++) { const s = i / N; const X = xa + s * (xb - xa), Y = ya + off(s) + sg * half; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    // Rest position
    ctx.strokeStyle = "rgba(201,212,227,0.25)"; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, ya); ctx.stroke(); ctx.setLineDash([]);
    // Walkers, swaying with the drive.
    const nW = 16;
    for (let i = 0; i < nW; i++) {
      const dir = i % 2 ? 1 : -1;
      let s = ((i * 0.618 + dir * state.walkT * 0.009) % 1 + 1) % 1;
      const lane = (i % 2 ? 0.45 : -0.45) * half;
      const sway = state.drive === "motor" ? 2.2 * (state.s / 100) * Math.cos(state.phi) : 0;
      const X = xa + s * (xb - xa), Y = ya + off(s) + lane + sway;
      ctx.fillStyle = i % 3 ? "rgba(240,179,90,0.9)" : "rgba(228,139,208,0.9)";
      ctx.beginPath(); ctx.arc(X, Y, 2.6, 0, TAU); ctx.fill();
    }
    // Labels
    ctx.font = fpx(10) + MONO; ctx.fillStyle = COL.dim; ctx.textAlign = "center";
    fitText("144 m SPAN · SIDEWAYS SWAY DRAWN ×" + exag, S.x + S.w / 2, S.y + S.h - 2, S.w - 12);
    const A = ampNow();
    if (A > 0.05) {
      ctx.strokeStyle = "rgba(92,200,255,0.35)"; ctx.setLineDash([3, 4]);
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo((xa + xb) / 2 - 30, ya + sg * A * k); ctx.lineTo((xa + xb) / 2 + 30, ya + sg * A * k); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    if (state.drive === "hand" && state.pushAnim > 0) arrow((xa + xb) / 2, ya + off(0.5) - half - 34, (xa + xb) / 2, ya + off(0.5) - half - 6, "#c9a0f0", 3);
    if (state.pushText) drawPushText((xa + xb) / 2, ya - half - 40);
  }

  // ---------- Drawing: dial / energy ----------
  function drawDial() {
    const D = DIAL;
    const tx = D.x + D.r + 18, maxW = (narrow ? W - tx - 8 : SC.x + SC.w - tx);
    ctx.textAlign = "left";
    if (state.drive === "motor") {
      ctx.strokeStyle = "#26324a"; ctx.beginPath(); ctx.arc(D.x, D.y, D.r, 0, TAU); ctx.stroke();
      // ticks at 0, 90, 180
      ctx.fillStyle = COL.dim; ctx.font = fpx(10) + MONO; ctx.textAlign = "center";
      // drive arrow: straight up
      arrow(D.x, D.y, D.x, D.y - D.r, COL.amber, 2.5);
      const st = steady(state.f);
      const ang = (d) => [D.x + Math.sin(d) * D.r * 0.92, D.y - Math.cos(d) * D.r * 0.92];
      const [ax, ay] = ang(st.lag);
      ctx.strokeStyle = "rgba(92,200,255,0.5)"; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(D.x, D.y); ctx.lineTo(ax, ay); ctx.stroke(); ctx.setLineDash([]);
      const lag = measuredLag();
      if (lag !== null && ampNow() > 1e-4) { const [mx, my] = ang(lag); arrow(D.x, D.y, mx, my, COL.cyan, 2.5); }
      ctx.textAlign = "left";
      ctx.font = fpx(11) + MONO; ctx.fillStyle = COL.soft;
      fitText("PHASE LAG", tx, D.y - 18, maxW);
      ctx.font = "500 " + fpx(18) + MONO; ctx.fillStyle = COL.ink;
      ctx.fillText(lag === null ? "–" : Math.round(Math.abs(lag) * DEG) + "°", tx, D.y + 4);
      ctx.font = fpx(11) + SANS; ctx.fillStyle = COL.soft;
      const deg = lag === null ? st.lag * DEG : Math.abs(lag) * DEG;
      const msg = deg < 35 ? "Moves in step with the push" : deg < 145 ? (Math.abs(deg - 90) < 15 ? "A quarter cycle behind: every push adds energy" : "Lagging behind the push") : "Moving opposite to the push";
      wrapText(msg, tx, D.y + 22, maxW, 14);
      ctx.fillStyle = COL.amber; ctx.font = fpx(10) + MONO; ctx.textAlign = "center";
      ctx.fillText("push", D.x, D.y - D.r - 5);
    } else {
      // Energy bar for the hand mode.
      const E = energy(state.x, state.v);
      const refE = state.preset === "swing" ? energy(30 / DEG, 0) : state.preset === "glass" ? energy(1, 0) : energy(10, 0);
      const bw = Math.max(80, maxW + D.r * 2 + 18 - 10), bx = D.x - D.r, by = D.y - 6;
      ctx.font = fpx(11) + MONO; ctx.fillStyle = COL.soft;
      fitText("ENERGY", bx, D.y - 18, bw);
      ctx.fillStyle = "#151e2e"; ctx.fillRect(bx, by, bw, 12);
      ctx.fillStyle = COL.cyan; ctx.fillRect(bx, by, bw * Math.min(1, E / refE), 12);
      ctx.font = fpx(11) + SANS; ctx.fillStyle = COL.soft;
      const tip = state.preset === "swing" ? "Push as the swing passes you going forward. Space works too." : state.preset === "glass" ? "Each tap is a kick. The glass rings at its own note and dies away." : "Each push is a sideways shove at mid-span.";
      wrapText(tip, bx, by + 30, bw, 14);
    }
  }

  // ---------- Drawing: plots ----------
  function panel(R) { ctx.fillStyle = "#0a0f19"; ctx.fillRect(R.x, R.y, R.w, R.h); }
  function frame(R) { ctx.strokeStyle = COL.rule; ctx.strokeRect(R.x + 0.5, R.y + 0.5, R.w - 1, R.h - 1); }

  let traceScale = 0.2;
  function drawTrace() {
    const R = TRc, p = P();
    ctx.font = fpx(12) + MONO; ctx.fillStyle = COL.soft; ctx.textAlign = "center";
    fitText(state.preset === "glass" ? "RIM DISPLACEMENT, LAST " + p.window + " S" : "DISPLACEMENT, LAST " + p.window + " S", TITLE.tr[0], TITLE.tr[1], narrow ? W - 16 : R.w + 60);
    panel(R);
    // Scale: fixed for the glass (so the breaking line shows), otherwise grows to fit.
    let peak = 0;
    const cur = Math.floor(state.t / binW);
    for (let j = cur; j > cur - NB && j >= 0; j--) { const k = j % NB; if (bins.id[k] === j) peak = Math.max(peak, Math.abs(bins.mn[k]), Math.abs(bins.mx[k])); }
    const want = state.preset === "glass" ? p.traceMin : Math.max(p.traceMin, peak * 1.15);
    traceScale = want > traceScale ? want : traceScale + (want - traceScale) * 0.02;
    const sc = traceScale;
    const yOf = (x) => R.y + R.h / 2 - (x / sc) * (R.h / 2 - 4);
    // Grid
    ctx.font = fpx(10) + MONO; ctx.textAlign = "right";
    const step = niceStep(sc);
    for (let g = -Math.floor(sc / step) * step; g <= sc + 1e-9; g += step) {
      const y = Math.round(yOf(g)) + 0.5;
      ctx.strokeStyle = Math.abs(g) < 1e-9 ? "#2a3852" : COL.grid;
      ctx.beginPath(); ctx.moveTo(R.x, y); ctx.lineTo(R.x + R.w, y); ctx.stroke();
      ctx.fillStyle = COL.dim; ctx.fillText(fmtAxis(g), R.x - 5, y + 3);
    }
    ctx.textAlign = "center";
    for (let k = 0; k <= 4; k++) {
      const x = R.x + (R.w * k) / 4;
      const tt = p.window * (1 - k / 4);
      ctx.fillStyle = COL.dim;
      ctx.fillText(k === 4 ? "now" : "−" + (p.window < 2 ? tt.toFixed(2) : Math.round(tt)) + " s", x, R.y + R.h + 13);
    }
    if (state.preset === "glass") {
      ctx.strokeStyle = "rgba(240,138,93,0.7)"; ctx.setLineDash([5, 4]);
      for (const sg of [-1, 1]) { const y = yOf(sg); ctx.beginPath(); ctx.moveTo(R.x, y); ctx.lineTo(R.x + R.w, y); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.fillStyle = COL.red; ctx.textAlign = "left"; ctx.fillText("breaks", R.x + 4, yOf(1) - 4);
    }
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    const first = cur - NB + 1;
    const xOfJ = (j) => R.x + ((j - first) / (NB - 1)) * R.w;
    const resolved = (period() / binW) > 12 && (state.drive !== "motor" || (1 / state.f) / binW > 12);
    // Drive (faint) in line mode
    if (resolved && state.drive === "motor" && state.s > 0) {
      ctx.strokeStyle = "rgba(240,179,90,0.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); let on = false;
      for (let j = Math.max(0, first); j <= cur; j++) {
        const k = j % NB; if (bins.id[k] !== j) { on = false; continue; }
        const y = R.y + R.h / 2 - bins.drv[k] * (R.h / 2 - 4) * 0.35;
        on ? ctx.lineTo(xOfJ(j), y) : ctx.moveTo(xOfJ(j), y); on = true;
      }
      ctx.stroke();
    }
    ctx.strokeStyle = COL.cyan; ctx.fillStyle = "rgba(92,200,255,0.55)"; ctx.lineWidth = 1.6;
    if (resolved) {
      ctx.beginPath(); let on = false;
      for (let j = Math.max(0, first); j <= cur; j++) {
        const k = j % NB; if (bins.id[k] !== j) { on = false; continue; }
        const y = yOf(bins.last[k]);
        on ? ctx.lineTo(xOfJ(j), y) : ctx.moveTo(xOfJ(j), y); on = true;
      }
      ctx.stroke();
    } else {
      // Carrier too fast to draw: fill between the min and max of each column (the envelope).
      ctx.beginPath(); let started = false; const back = [];
      for (let j = Math.max(0, first); j <= cur; j++) {
        const k = j % NB; if (bins.id[k] !== j) continue;
        const x = xOfJ(j);
        started ? ctx.lineTo(x, yOf(bins.mx[k])) : ctx.moveTo(x, yOf(bins.mx[k])); started = true;
        back.push([x, yOf(bins.mn[k])]);
      }
      for (let i = back.length - 1; i >= 0; i--) ctx.lineTo(back[i][0], back[i][1]);
      if (started) { ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
    ctx.lineWidth = 1;
    // Push markers
    for (const pu of state.pushes) {
      const j = Math.floor(pu.t / binW);
      if (j < first) continue;
      const x = xOfJ(j);
      ctx.fillStyle = pu.gain >= 0 ? COL.green : COL.red;
      ctx.beginPath(); ctx.moveTo(x, R.y + R.h - 2); ctx.lineTo(x - 4, R.y + R.h - 10); ctx.lineTo(x + 4, R.y + R.h - 10); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // Steady amplitude guide
    if (state.drive === "motor" && !state.shattered) {
      const A = steady(state.f).A;
      if (A < sc) {
        ctx.strokeStyle = "rgba(240,179,90,0.45)"; ctx.setLineDash([2, 4]);
        for (const sg of [-1, 1]) { const y = yOf(sg * A); ctx.beginPath(); ctx.moveTo(R.x, y); ctx.lineTo(R.x + R.w, y); ctx.stroke(); }
        ctx.setLineDash([]);
        ctx.textAlign = "right";
        const lw = ctx.measureText("steady").width;
        ctx.fillStyle = "rgba(10,15,25,0.85)"; ctx.fillRect(R.x + R.w - lw - 8, yOf(A) - 14, lw + 6, 12);
        ctx.fillStyle = "rgba(240,179,90,0.95)"; ctx.fillText("steady", R.x + R.w - 4, yOf(A) - 4);
      }
    }
    frame(R);
  }

  function niceStep(sc) {
    const raw = sc / 2.2;
    const unit = state.preset === "swing" ? 1 / DEG : 1;
    const r = raw / unit, e = Math.pow(10, Math.floor(Math.log10(r))), m = r / e;
    const n = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10;
    return n * e * unit;
  }

  function drawCurve() {
    const R = CV, p = P(), F = PH;
    ctx.font = fpx(12) + MONO; ctx.fillStyle = COL.soft; ctx.textAlign = "center";
    fitText("RESONANCE CURVE: STEADY AMPLITUDE VS DRIVE", TITLE.cv[0], TITLE.cv[1], narrow ? W - 16 : R.w + 60);
    panel(R); panel(F);
    const xOf = (f) => R.x + ((f - p.fMin) / (p.fMax - p.fMin)) * R.w;
    const ymax = p.curveMax;
    const yOf = (a) => R.y + R.h - (Math.min(a, ymax * 1.05) / ymax) * (R.h - 8);
    const pyOf = (d) => F.y + 6 + (d / Math.PI) * (F.h - 12);
    // grid
    ctx.font = fpx(10) + MONO; ctx.textAlign = "right";
    const step = niceStep(ymax / 1.1);
    for (let g = 0; g <= ymax + 1e-9; g += step) {
      const y = Math.round(yOf(g)) + 0.5;
      ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(R.x, y); ctx.lineTo(R.x + R.w, y); ctx.stroke();
      ctx.fillStyle = COL.dim; ctx.fillText(fmtAxis(g), R.x - 5, y + 3);
    }
    for (const d of [0, 90, 180]) {
      const y = Math.round(pyOf(d / DEG)) + 0.5;
      ctx.strokeStyle = d === 90 ? "#2a3852" : COL.grid; ctx.beginPath(); ctx.moveTo(F.x, y); ctx.lineTo(F.x + F.w, y); ctx.stroke();
      ctx.fillStyle = COL.dim; ctx.fillText(d + "°", F.x - 5, y + 3);
    }
    // frequency ticks at round values
    ctx.textAlign = "center";
    const span = p.fMax - p.fMin;
    const raw = span / (narrow ? 3.2 : 5.5), e10 = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / e10;
    const fstep = (m < 1.5 ? 1 : m < 2.2 ? 2 : m < 3.5 ? 2.5 : m < 7.5 ? 5 : 10) * e10;
    const dec = Math.max(0, -Math.floor(Math.log10(fstep) + 1e-9) + (fstep / e10 === 2.5 ? 1 : 0));
    for (let f = Math.ceil(p.fMin / fstep - 1e-9) * fstep; f <= p.fMax + 1e-9; f += fstep) {
      const x = Math.round(xOf(f)) + 0.5;
      ctx.strokeStyle = COL.grid;
      ctx.beginPath(); ctx.moveTo(x, R.y); ctx.lineTo(x, R.y + R.h); ctx.moveTo(x, F.y); ctx.lineTo(x, F.y + F.h); ctx.stroke();
      ctx.fillStyle = COL.dim;
      ctx.textAlign = x > F.x + F.w - 14 ? "right" : x < F.x + 14 ? "left" : "center";
      ctx.fillText(f.toFixed(dec), x, F.y + F.h + 13);
    }
    ctx.textAlign = "right"; ctx.fillStyle = COL.dim;
    ctx.fillText("drive frequency, Hz", F.x + F.w - 4, F.y + 13);
    // natural frequency
    const xn = Math.round(xOf(p.f0)) + 0.5;
    ctx.strokeStyle = "rgba(201,212,227,0.35)"; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(xn, R.y); ctx.lineTo(xn, R.y + R.h); ctx.moveTo(xn, F.y); ctx.lineTo(xn, F.y + F.h); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = COL.soft; ctx.textAlign = xn > R.x + R.w - 70 ? "right" : "left";
    ctx.fillText("natural", xn + (ctx.textAlign === "left" ? 4 : -4), R.y + 12);
    if (state.preset === "glass") {
      const y = yOf(1);
      ctx.strokeStyle = "rgba(240,138,93,0.7)"; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(R.x, y); ctx.lineTo(R.x + R.w, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COL.red; ctx.textAlign = "left"; ctx.fillText("breaks", R.x + 4, y - 4);
    }
    // curves, sampled densely near the peak
    const N = 360;
    const fs = [];
    for (let i = 0; i <= N; i++) fs.push(p.fMin + (span * i) / N);
    const bw = p.f0 / state.q;
    for (let i = -40; i <= 40; i++) { const f = p.f0 + (i / 10) * bw; if (f > p.fMin && f < p.fMax) fs.push(f); }
    fs.sort((a, b) => a - b);
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    ctx.strokeStyle = state.drive === "motor" ? COL.ink : "rgba(233,238,247,0.35)"; ctx.lineWidth = 1.8;
    ctx.beginPath();
    let peakA = 0;
    fs.forEach((f, i) => { const a = steady(f).A; peakA = Math.max(peakA, a); const x = xOf(f), y = yOf(a); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(F.x, F.y, F.w, F.h); ctx.clip();
    ctx.strokeStyle = "rgba(233,238,247,0.6)"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    fs.forEach((f, i) => { const d = steady(f).lag; const x = xOf(f), y = pyOf(d); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke(); ctx.restore();
    ctx.lineWidth = 1;
    if (peakA > ymax * 1.05) {
      ctx.fillStyle = COL.soft; ctx.font = fpx(10) + MONO;
      ctx.textAlign = xn > R.x + R.w - 120 ? "right" : "left";
      ctx.fillText("peak " + fmtAxis(peakA) + " ↑", xn + (ctx.textAlign === "left" ? 4 : -4), R.y + 26);
    }
    ctx.fillStyle = COL.dim; ctx.font = fpx(10) + MONO; ctx.textAlign = "left";
    ctx.fillText("phase lag", F.x + 4, F.y + F.h - 5);
    // markers
    if (state.drive === "motor") {
      const st = steady(state.f), x = xOf(state.f);
      ctx.strokeStyle = "rgba(240,179,90,0.7)";
      ctx.beginPath(); ctx.moveTo(x + 0.5, R.y); ctx.lineTo(x + 0.5, R.y + R.h); ctx.moveTo(x + 0.5, F.y); ctx.lineTo(x + 0.5, F.y + F.h); ctx.stroke();
      ctx.fillStyle = COL.amber;
      ctx.beginPath(); ctx.arc(x, yOf(st.A), 5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x, pyOf(st.lag), 4, 0, TAU); ctx.fill();
      if (!state.shattered) {
        ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, yOf(ampNow()), 6.5, 0, TAU); ctx.stroke();
        const lag = measuredLag();
        if (lag !== null && ampNow() > 1e-4) { ctx.beginPath(); ctx.arc(x, pyOf(Math.max(0, Math.min(Math.PI, Math.abs(lag)))), 5.5, 0, TAU); ctx.stroke(); }
        ctx.lineWidth = 1;
      }
    }
    frame(R); frame(F);
    ctx.font = fpx(11) + SANS; ctx.fillStyle = COL.soft; ctx.textAlign = "center";
    const cap = state.drive === "motor" ? "Amber: where the motion settles at this drive. Cyan ring: the motion right now." : "No steady drive: each push is a kick, and the object rings at its own natural frequency.";
    if (narrow) wrapText(cap, CAP.x, CAP.y, W - 20, 15);
    else fitText(cap, CAP.x, CAP.y, R.w + 80);
  }

  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#1a2436";
    ctx.beginPath();
    if (narrow) { const y = Math.round(TITLE.tr[1] - 22) + 0.5; ctx.moveTo(12, y); ctx.lineTo(W - 12, y); }
    else { ctx.moveTo(470.5, 20); ctx.lineTo(470.5, H - 20); }
    ctx.stroke();
    sceneTitle();
    if (state.preset === "swing") drawSwing();
    else if (state.preset === "glass") drawGlass();
    else drawBridge();
    drawDial();
    drawTrace();
    drawCurve();
  }

  // ---------- Readouts ----------
  function updateReadouts() {
    const p = P();
    $("freqOut").textContent = fmtF(state.f);
    $("strengthOut").textContent = state.s + "%";
    $("qOut").textContent = fmtQ(state.q);
    $("volumeOut").textContent = $("volume").value + "%";
    $("natF").textContent = state.preset === "glass" ? "660 Hz" : p.f0.toFixed(state.preset === "swing" ? 3 : 2) + " Hz (period " + (1 / p.f0).toFixed(2) + " s)";
    $("ampNow").textContent = state.shattered ? "shattered" : fmtAmp(ampNow());
    const st = steady(state.f);
    $("ampSteady").textContent = fmtAmp(st.A);
    const lag = measuredLag();
    $("lag").textContent = lag === null ? "–" : Math.round(Math.abs(lag) * DEG) + "° (steady " + Math.round(st.lag * DEG) + "°)";
    const b = beatInfo();
    $("beats").textContent = b ? "every " + fmtSec(b.period) : "none";
    $("pushGain").textContent = state.lastPushGain === null ? "–" : (state.lastPushGain >= 0 ? "+" : "") + Math.round(state.lastPushGain) + "% energy";
    const iv = pushInterval();
    $("pushRate").textContent = iv ? "every " + fmtSec(iv) + " (natural period " + fmtSec(1 / p.f0) + ")" : "–";
  }
  function fmtSec(s) { return (s < 0.1 ? s.toFixed(3) : s < 10 ? s.toFixed(2) : s.toFixed(0)) + " s"; }
  function pushInterval() {
    const ps = state.pushes.slice(-4);
    if (ps.length < 2) return null;
    return (ps[ps.length - 1].t - ps[0].t) / (ps.length - 1);
  }
  function beatInfo() {
    if (state.drive !== "motor" || state.shattered || state.s === 0) return null;
    const st = steady(state.f);
    if (st.A < 1e-6) return null;
    const f1 = P().f0 * Math.sqrt(Math.max(0, 1 - 1 / (4 * state.q * state.q)));
    const df = Math.abs(state.f - f1);
    if (df < 1e-6) return null;
    const per = 1 / df;
    if (per > P().window * 0.9) return null;
    if (transient() < 0.1 * st.A) return null;
    return { period: per, df };
  }

  // ---------- Narration and challenges ----------
  function onParamChange() {
    state.settleSaid = false;
    state.beatSaid = false;
    state.bridgeOK = 0;
    updateReadouts();
  }
  let lastCheck = 0;
  function checkEvents(now) {
    if (now - lastCheck < 200) return;
    const dtc = (now - lastCheck) / 1000;
    lastCheck = now;
    const A = ampNow();
    if (state.drive === "motor" && !state.shattered && state.s > 0) {
      const st = steady(state.f), tA = transient();
      const b = beatInfo();
      if (b && !state.beatSaid && state.t > 1 / state.f) {
        state.beatSaid = true;
        WONDERS.describe("Beats: the motion swells and fades every " + fmtSec(b.period) + ", because the drive is " + b.df.toFixed(3) + " Hz away from the natural frequency.");
      }
      if (!state.settleSaid && tA < 0.05 * st.A && st.A > 0) {
        state.settleSaid = true;
        const lag = Math.round(st.lag * DEG);
        if (state.preset === "swing") WONDERS.describe("The swing has settled at " + (A * DEG).toFixed(1) + "°, lagging the push by " + lag + "°.");
        else if (state.preset === "glass") WONDERS.describe("The glass rim has settled at " + Math.round(A * 100) + "% of its breaking amplitude, lagging the tone by " + lag + "°.");
        else WONDERS.describe("The bridge has settled, swaying " + A.toFixed(1) + " cm, lagging the footsteps by " + lag + "°.");
      }
      // Bridge: on resonance, strong footsteps, but enough damping to keep it under 2 cm.
      if (state.preset === "bridge" && Math.abs(state.f - 1) < 0.004 && state.s >= 50 && st.A < 2 && A < 2 && tA < 0.1 * st.A) {
        state.bridgeOK += dtc;
        if (state.bridgeOK >= 3) WONDERS.challenge("bridge");
      } else state.bridgeOK = 0;
    }
    if (state.drive === "hand") {
      if (A < 5 / DEG) state.handFresh = true;
      if (state.preset === "swing" && state.handFresh && A >= 15 / DEG && state.pushes.length >= 3) {
        WONDERS.challenge("push");
        if (!state.pushSaid) { state.pushSaid = true; WONDERS.describe("Your pushes have built the swing up to " + (A * DEG).toFixed(0) + "°.", { now: true }); }
      }
    }
  }

  WONDERS.describer(() => {
    const st = steady(state.f), A = ampNow();
    const parts = [];
    if (state.preset === "glass" && state.shattered) return tr("The wine glass has shattered. Press Restart for a new glass.");
    if (state.drive === "motor") {
      const lag = measuredLag();
      const lagDeg = Math.round(Math.abs(lag === null ? st.lag : lag) * DEG);
      if (state.preset === "swing") parts.push("A playground swing is pushed at " + state.f.toFixed(3) + " Hz; its natural frequency is " + P().f0.toFixed(3) + " Hz and its Q is " + qStr(state.q) + ".", "It now swings to " + (A * DEG).toFixed(1) + "° and is heading for a steady " + (st.A * DEG).toFixed(1) + "°, lagging the push by " + lagDeg + "°.");
      else if (state.preset === "glass") parts.push("A wine glass is driven by a tone at " + state.f.toFixed(2) + " Hz; its note is 660 Hz and its Q is " + qStr(state.q) + ".", "The rim now vibrates at " + Math.round(A * 100) + "% of its breaking amplitude and is heading for " + Math.round(st.A * 100) + "%, lagging the tone by " + lagDeg + "°.");
      else parts.push("A footbridge is pushed sideways by footsteps at " + state.f.toFixed(2) + " Hz; its natural frequency is 1.00 Hz and its Q is " + qStr(state.q) + ".", "It now sways " + A.toFixed(1) + " cm and is heading for a steady " + st.A.toFixed(1) + " cm, lagging the footsteps by " + lagDeg + "°.");
      const b = beatInfo();
      if (b) parts.push("It is beating, swelling and fading every " + fmtSec(b.period) + ".");
    } else {
      if (state.preset === "swing") parts.push("You are pushing the playground swing by hand. It now swings to " + (A * DEG).toFixed(1) + "°.");
      else if (state.preset === "glass") parts.push("You are tapping the wine glass. The rim now vibrates at " + Math.round(A * 100) + "% of its breaking amplitude.");
      else parts.push("You are shoving the footbridge sideways. It now sways " + A.toFixed(1) + " cm.");
      if (state.lastPushGain !== null) parts.push("Your last push changed its energy by " + Math.round(state.lastPushGain) + "%.");
    }
    return parts.map(tr).join(window.I18N && I18N.lang === "zh-CN" ? "" : " ");
  });

  // ---------- Pushing by hand ----------
  function push() {
    if (state.drive !== "hand") return;
    if (state.preset === "glass" && state.shattered) return;
    const E0 = energy(state.x, state.v);
    state.v += P().kick;
    const E1 = energy(state.x, state.v);
    const tiny = P().nonlinear ? energy(1 / DEG, 0) : energy(P().traceMin * 0.02, 0);
    const gain = E0 > tiny ? ((E1 - E0) / E0) * 100 : null;
    state.lastPushGain = gain === null ? 100 : gain;
    state.pushes.push({ t: state.t, gain: E1 - E0 });
    if (state.pushes.length > 40) state.pushes.shift();
    state.pushAnim = 0.25;
    const good = E1 >= E0;
    state.pushText = { at: performance.now(), good, text: gain === null ? "Started it moving" : (gain >= 0 ? "+" : "") + Math.round(gain) + "% energy" };
    const btn = $("push");
    btn.classList.remove("flash", "flash-bad"); void btn.offsetWidth;
    btn.classList.add(good ? "flash" : "flash-bad");
    setTimeout(() => btn.classList.remove("flash", "flash-bad"), 180);
    WONDERS.sound(good ? "tick" : "fail", { pitch: good ? 0.8 : 0.2 });
    if (gain !== null) {
      if (gain < 0) WONDERS.describe("That push went against the motion and took away " + Math.round(-gain) + "% of the energy.");
      else WONDERS.describe("That push added " + Math.round(gain) + "% energy.");
    }
    if (!state.running) setPlay(true);
    updateReadouts();
  }

  // ---------- Sound (wine glass only) ----------
  const AC = window.AudioContext || window.webkitAudioContext;
  let actx = null, master = null, oscD = null, oscN = null, gD = null, gN = null, toneOn = false;
  const level = () => 0.6 * Math.pow(+$("volume").value / 100, 2);
  function startTone() {
    if (!AC || state.preset !== "glass") return;
    try {
      if (!actx) actx = new AC();
      if (actx.state === "suspended") actx.resume().catch(() => {});
      master = actx.createGain(); master.gain.value = level(); master.connect(actx.destination);
      oscD = actx.createOscillator(); oscN = actx.createOscillator();
      gD = actx.createGain(); gN = actx.createGain(); gD.gain.value = 0; gN.gain.value = 0;
      oscD.type = "sine"; oscN.type = "sine";
      oscD.frequency.value = state.f; oscN.frequency.value = 660;
      oscD.connect(gD); oscN.connect(gN); gD.connect(master); gN.connect(master);
      oscD.start(); oscN.start();
    } catch (e) { oscD = oscN = null; return; }
    toneOn = true;
    $("listen").textContent = "Stop sound";
    $("listen").classList.add("on");
    WONDERS.describe("Sound on. You hear the glass itself: louder as it vibrates more.", { now: true });
  }
  function stopTone(quiet) {
    if (actx && toneOn) {
      const t = actx.currentTime, a = oscD, b = oscN, g1 = gD, g2 = gN;
      for (const g of [g1, g2]) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.03); }
      setTimeout(() => { try { a.stop(); b.stop(); } catch (e) {} }, 300);
    }
    const was = toneOn;
    toneOn = false; oscD = oscN = null;
    $("listen").textContent = "Play sound";
    $("listen").classList.remove("on");
    if (was && quiet === false) WONDERS.describe("Sound off.", { now: true });
  }
  function updateTone() {
    if (!toneOn || !actx) return;
    const t = actx.currentTime;
    const motor = state.drive === "motor" && state.running;
    const st = motor ? steady(state.f).A : 0;
    const tA = state.running ? transient() : 0;
    const shape = (a) => 0.25 * Math.min(1.2, a);
    oscD.frequency.setTargetAtTime(state.f, t, 0.02);
    oscN.frequency.setTargetAtTime(660 * Math.sqrt(1 - 1 / (4 * state.q * state.q)), t, 0.02);
    // Steady part at the drive frequency, transient part at the glass's own note:
    // played together they beat exactly as the simulated rim does.
    gD.gain.setTargetAtTime(shape(Math.min(st, ampNow() * 1.05)), t, 0.03);
    gN.gain.setTargetAtTime(shape(tA), t, 0.03);
    master.gain.setTargetAtTime(level(), t, 0.05);
  }
  function crackSound() {
    if (!toneOn || !actx) return;
    try {
      const t = actx.currentTime, sr = actx.sampleRate, len = Math.floor(sr * 0.5);
      const buf = actx.createBuffer(1, len, sr), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.05));
      const src = actx.createBufferSource(); src.buffer = buf;
      const hp = actx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800;
      const g = actx.createGain(); g.gain.value = 0.9;
      src.connect(hp); hp.connect(g); g.connect(master); src.start(t);
      // A few tinkles of falling shards.
      for (let k = 0; k < 7; k++) {
        const o = actx.createOscillator(), og = actx.createGain(), t0 = t + 0.15 + Math.random() * 0.6;
        o.frequency.value = 2500 + Math.random() * 3500;
        og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.12, t0 + 0.005); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
        o.connect(og); og.connect(master); o.start(t0); o.stop(t0 + 0.15);
      }
    } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden && toneOn) stopTone(true); });

  // ---------- Loop ----------
  function stepShards(dt) {
    for (const s of state.shards) {
      if (s.rest) continue;
      s.vy += 14 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.w * dt;
      if (s.y > -0.08) { s.y = -0.08; s.vy *= -0.3; s.vx *= 0.6; s.w *= 0.5; if (Math.abs(s.vy) < 0.4) { s.vy = 0; s.vx *= 0.8; if (Math.abs(s.vx) < 0.05) s.rest = true; } }
      const lim = (SC.w / 2) / Math.min(SC.w * 0.15, SC.h * 0.15) - 0.2;
      if (Math.abs(s.x) > lim) { s.x = Math.sign(s.x) * lim; s.vx *= -0.4; }
    }
  }

  let lastT = performance.now(), lastStats = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (state.running) {
      advance(dt);
      state.walkT += dt;
      const A = state.shattered ? 0 : ampNow();
      state.visPhase += dt * TAU * (A > 0.002 ? 1.6 : 0);
      if (state.pushAnim > 0) state.pushAnim -= dt;
      checkEvents(now);
    }
    if (state.shattered) stepShards(dt);
    updateTone();
    if (now - lastStats > 150) { lastStats = now; updateReadouts(); }
    draw();
    requestAnimationFrame(loop);
  }

  // ---------- Controls ----------
  function setPlay(on) {
    state.running = on;
    $("play").textContent = on ? "Pause" : "Play";
  }
  function restart() {
    state.t = 0; state.x = 0; state.v = 0; state.phi = 0;
    state.lockC = 0; state.lockS = 0;
    state.shattered = false; state.shards = [];
    state.pushes = []; state.lastPushGain = null; state.pushText = null;
    state.handFresh = true; state.pushSaid = false;
    traceScale = P().traceMin;
    clearBins();
    onParamChange();
  }
  function preroll() {
    if (state.drive !== "motor") return;
    const secs = state.preset === "glass" ? 0.6 : P().window * 0.75;
    const n = Math.ceil(secs * 30);
    for (let i = 0; i < n && !state.shattered; i++) advance(1 / 30);
    updateReadouts();
  }
  function syncSeg(name) {
    for (const inp of document.querySelectorAll(`input[name="${name}"]`)) inp.parentElement.classList.toggle("on", inp.checked);
  }
  function showFor() {
    for (const n of document.querySelectorAll("[data-drive]")) n.hidden = n.dataset.drive !== state.drive;
    for (const n of document.querySelectorAll("[data-preset]")) n.hidden = n.dataset.preset !== state.preset;
  }
  function setSlider(id, min, max, step, value) {
    const el = $(id);
    el.min = min; el.max = max; el.step = step; el.value = value;
  }
  function applyPreset(name) {
    state.preset = name;
    const p = P();
    state.f = p.f; state.s = p.s; state.q = p.q;
    setSlider("freq", p.fMin, p.fMax, p.fStep, p.f);
    setSlider("strength", 0, 100, 1, p.s);
    setSlider("q", Math.log10(p.qMin).toFixed(2), Math.log10(p.qMax).toFixed(2), 0.01, Math.log10(p.q).toFixed(2));
    if (name !== "glass" && toneOn) stopTone(true);
    showFor();
    restart();
    if (Lab.reducedMotion && !state.running) preroll();
    const names = { swing: "Playground swing selected. Natural frequency 0.315 Hz.", glass: "Wine glass selected. Its note is 660 Hz.", bridge: "Footbridge selected. Natural frequency 1.00 Hz." };
    WONDERS.describe(names[name], { now: true });
  }

  for (const inp of document.querySelectorAll('input[name="preset"]')) {
    inp.addEventListener("change", () => { if (inp.checked) { syncSeg("preset"); applyPreset(inp.value); } });
  }
  for (const inp of document.querySelectorAll('input[name="drive"]')) {
    inp.addEventListener("change", () => {
      if (!inp.checked) return;
      syncSeg("drive");
      state.drive = inp.value;
      state.handFresh = ampNow() < 5 / DEG;
      state.pushes = []; state.lastPushGain = null;
      showFor();
      onParamChange();
      WONDERS.describe(state.drive === "hand" ? "Your pushes: press Push, or Space with the picture focused, to give a short kick forward." : "Steady rhythm: the drive pushes back and forth at the drive frequency.", { now: true });
    });
  }
  $("freq").addEventListener("input", (e) => { state.f = +e.target.value; onParamChange(); });
  $("strength").addEventListener("input", (e) => { state.s = +e.target.value; onParamChange(); });
  $("q").addEventListener("input", (e) => { state.q = Math.pow(10, +e.target.value); onParamChange(); });
  $("volume").addEventListener("input", () => updateReadouts());
  $("play").addEventListener("click", () => setPlay(!state.running));
  $("restart").addEventListener("click", () => {
    restart();
    if (!state.running) setPlay(true);
    WONDERS.describe(state.preset === "glass" ? "Restarted with a new glass, at rest." : "Restarted from rest.", { now: true });
  });
  $("push").addEventListener("click", push);
  $("listen").addEventListener("click", () => (toneOn ? stopTone(false) : startTone()));

  canvas.addEventListener("click", () => { if (state.drive === "hand") push(); });
  canvas.addEventListener("keydown", (e) => {
    const k = e.key;
    const nudge = (id, dir) => {
      const el = $(id);
      const before = el.value;
      dir > 0 ? el.stepUp() : el.stepDown();
      if (el.value !== before) el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    if ((k === " " || k === "Enter") && state.drive === "hand") { e.preventDefault(); if (!e.repeat) push(); }
    else if (k === "ArrowLeft" || k === "ArrowRight") { e.preventDefault(); nudge("freq", k === "ArrowRight" ? 1 : -1); WONDERS.describe("Drive frequency " + fmtF(state.f) + "."); }
    else if (k === "ArrowUp" || k === "ArrowDown") { e.preventDefault(); for (let i = 0; i < 5; i++) nudge("strength", k === "ArrowUp" ? 1 : -1); WONDERS.describe("Driving strength " + state.s + "%."); }
  });

  // Re-layout when the bench changes width; the simulation state is kept.
  let lastCW = 0;
  function onResize() {
    const cw = Math.round(canvas.parentElement.clientWidth);
    if (cw === lastCW) return;
    lastCW = cw;
    layout();
    draw();
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvas.parentElement);
  else window.addEventListener("resize", onResize);

  restart();
  updateReadouts();
  if (Lab.reducedMotion) { setPlay(false); preroll(); }
  requestAnimationFrame(loop);
})();
