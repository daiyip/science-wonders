(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $("bench");
  let W = 960, H = 460, narrow = false, ctx;

  // ---------- Layout (logical pixels) ----------
  // The physics always runs in a 540 x 380 px box. On a wide bench the box is
  // drawn at that size with the plots beside it; on a narrow bench (phones) the
  // logical width matches the displayed CSS width, the box is drawn scaled down
  // by BS and the plots sit underneath, so canvas text keeps its real size.
  const BW = 540, BH = 380;                             // the box, in physics pixels
  const MID = BW / 2;                                   // partition, in box coordinates
  let BOX_X = 20, BOX_Y = 46, BS = 1;                   // where and how big the box is drawn
  let PX = 610, PW = 330;                               // plots
  let P1 = { y: 46, h: 160 }, P2 = { y: 266, h: 160 };
  function layout() {
    const cw = Math.round(canvas.clientWidth || canvas.parentElement.clientWidth || 960);
    narrow = cw < 640;
    if (!narrow) {
      W = 960; H = 460;
      BOX_X = 20; BOX_Y = 46; BS = 1;
      PX = 610; PW = 330;
      P1 = { y: 46, h: 160 }; P2 = { y: 266, h: 160 };
    } else {
      W = Math.max(280, cw);
      BOX_X = 9; BS = (W - 18) / BW; BOX_Y = 30;
      PX = 9; PW = W - 18;
      const ph = Math.round(Math.min(150, Math.max(100, W * 0.36)));
      P1 = { y: Math.round(BOX_Y + BH * BS + 38), h: ph };
      P2 = { y: P1.y + ph + 38, h: ph };
      H = P2.y + ph + 26;
    }
    ctx = Lab.setupCanvas(canvas, W, H);
  }
  layout();
  const HIST = 1200;                                    // plot window, in frames (about 20 s)

  // ---------- Physics ----------
  // Positions are stored as integers (1 px = SCALE units) and advanced with the
  // position Verlet rule x' = 2x - x_prev + round(a(x)). Because the rounded
  // acceleration depends only on the current positions, swapping "current" and
  // "previous" runs the motion backwards exactly, bit for bit.
  const SCALE = 65536;
  const K = 0.3;              // stiffness of the soft disks and walls (px / step² per px of overlap)
  const V0 = 0.35;            // spread of each velocity component (px / step)
  const STEPS_PER_SECOND = 480;
  const COUNTS = [4, 6, 8, 10, 12, 16, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500, 600, 800, 1000];

  const state = {
    N: 200, sigma: 10, running: !Lab.reducedMotion, speed: 8,
    partition: false, dir: 1, clock: 0,
    nLeft: 0, seenAll: 0, wasMixed: false, nudged: -1,
    hist: [], message: null,
  };
  let X, Y, XP, YP, head, next, gw, gh;

  // ln(n!) table for the entropy ln C(N, n).
  const LNF = new Float64Array(1001);
  for (let i = 2; i <= 1000; i++) LNF[i] = LNF[i - 1] + Math.log(i);
  const lnC = (n, k) => LNF[n] - LNF[k] - LNF[n - k];
  const sMax = () => lnC(state.N, Math.floor(state.N / 2));

  function gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function init() {
    const N = state.N;
    // Disk diameter shrinks with N so the gas stays equally dilute (about 10% of the area).
    state.sigma = Math.max(5, Math.min(16, 0.35 * Math.sqrt(BW * BH / N)));
    const s = state.sigma;
    X = new Float64Array(N); Y = new Float64Array(N);
    XP = new Float64Array(N); YP = new Float64Array(N);
    next = new Int32Array(N);
    gw = Math.ceil(BW / s); gh = Math.ceil(BH / s);
    head = new Int32Array(gw * gh);

    // Jittered grid in the left half so no disks overlap at the start.
    const w = MID - s, h = BH - s;
    let cols = Math.max(1, Math.round(Math.sqrt(N * w / h)));
    let rows = Math.ceil(N / cols);
    while ((w / cols < s * 1.05 || h / rows < s * 1.05) && cols > 1) { cols--; rows = Math.ceil(N / cols); }
    const cw = w / cols, ch = h / rows;
    const slots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push([c, r]);
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    const jx = Math.max(0, cw - s * 1.05) / 2, jy = Math.max(0, ch - s * 1.05) / 2;
    for (let i = 0; i < N; i++) {
      const [c, r] = slots[i];
      const x = s / 2 + (c + 0.5) * cw + (Math.random() * 2 - 1) * jx;
      const y = s / 2 + (r + 0.5) * ch + (Math.random() * 2 - 1) * jy;
      X[i] = Math.round(x * SCALE); Y[i] = Math.round(y * SCALE);
      XP[i] = X[i] - Math.round(gauss() * V0 * SCALE);
      YP[i] = Y[i] - Math.round(gauss() * V0 * SCALE);
    }
    state.partition = false;     // the wall has just been pulled out
    state.dir = 1; state.clock = 0;
    state.seenAll = 0; state.wasMixed = false; state.nudged = -1;
    state.hist = [];
    state.message = null;
    countLeft();
    setHint("The wall has just been pulled out. Let the gas spread for a few seconds, then press Reverse time.");
    updateOdds();
    updateReadouts();
  }

  function step() {
    const N = state.N, s = state.sigma, r = s / 2, s2 = s * s;
    head.fill(-1);
    for (let i = 0; i < N; i++) {
      const cx = Math.min(gw - 1, Math.max(0, Math.floor(X[i] / SCALE / s)));
      const cy = Math.min(gh - 1, Math.max(0, Math.floor(Y[i] / SCALE / s)));
      const c = cy * gw + cx;
      next[i] = head[c]; head[c] = i;
    }
    const AX = step.ax || (step.ax = new Float64Array(1000));
    const AY = step.ay || (step.ay = new Float64Array(1000));
    for (let i = 0; i < N; i++) {
      const px = X[i] / SCALE, py = Y[i] / SCALE;
      let ax = 0, ay = 0;
      // Soft walls.
      if (px < r) ax += K * (r - px);
      if (px > BW - r) ax -= K * (px - (BW - r));
      if (py < r) ay += K * (r - py);
      if (py > BH - r) ay -= K * (py - (BH - r));
      if (state.partition) {
        if (px < MID && px > MID - r) ax -= K * (px - (MID - r));
        else if (px >= MID && px < MID + r) ax += K * (MID + r - px);
      }
      // Neighbouring disks.
      const cx = Math.min(gw - 1, Math.max(0, Math.floor(px / s)));
      const cy = Math.min(gh - 1, Math.max(0, Math.floor(py / s)));
      for (let gy = Math.max(0, cy - 1); gy <= Math.min(gh - 1, cy + 1); gy++) {
        for (let gx = Math.max(0, cx - 1); gx <= Math.min(gw - 1, cx + 1); gx++) {
          for (let j = head[gy * gw + gx]; j !== -1; j = next[j]) {
            if (j === i) continue;
            const dx = px - X[j] / SCALE, dy = py - Y[j] / SCALE;
            const d2 = dx * dx + dy * dy;
            if (d2 < s2 && d2 > 0) {
              const d = Math.sqrt(d2);
              const f = K * (s - d) / d;
              ax += f * dx; ay += f * dy;
            }
          }
        }
      }
      AX[i] = Math.round(ax * SCALE);
      AY[i] = Math.round(ay * SCALE);
    }
    for (let i = 0; i < N; i++) {
      const nx = 2 * X[i] - XP[i] + AX[i];
      const ny = 2 * Y[i] - YP[i] + AY[i];
      XP[i] = X[i]; YP[i] = Y[i];
      X[i] = nx; Y[i] = ny;
    }
    state.clock += state.dir;
    countLeft();
    if (!state.partition && state.dir === 1) {
      if (state.nLeft < state.N) state.wasMixed = true;
      else if (state.wasMixed) { state.seenAll++; state.wasMixed = false; }
    }
  }

  function countLeft() {
    const lim = MID * SCALE;
    let n = 0;
    for (let i = 0; i < state.N; i++) if (X[i] < lim) n++;
    state.nLeft = n;
  }

  function reverse() {
    [X, XP] = [XP, X];
    [Y, YP] = [YP, Y];
    state.clock -= state.dir;
    state.dir = -state.dir;
    state.nudged = -1;
    if ($("nudge").checked) {
      // Shift one random particle by a single unit: 1/65,536 of a pixel.
      const k = Math.floor(Math.random() * state.N);
      X[k] += 1; XP[k] += 1;
      state.nudged = k;
    }
    state.message = null;
    if (state.dir === -1) {
      setHint(state.nudged >= 0
        ? "Time reversed, with one particle (orange) nudged by 1/65,536 of a pixel. Watch whether the gas still finds its way back."
        : "Every velocity has been flipped. The gas is now running its own film backwards, heading for the moment the wall was removed.");
    } else {
      setHint("Time is running forward again, away from the start.");
    }
    if (!state.running) setRunning(true);
    countLeft();
    updateReadouts();
  }

  // ---------- Drawing ----------
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";

  function drawBox() {
    // Halves
    const bw = BW * BS, bh = BH * BS, mid = MID * BS;
    ctx.fillStyle = "#0a101b";
    ctx.fillRect(BOX_X, BOX_Y, bw, bh);
    ctx.fillStyle = "rgba(143,166,255,0.035)";
    ctx.fillRect(BOX_X, BOX_Y, mid, bh);
    ctx.strokeStyle = "#3a4760"; ctx.lineWidth = 2;
    ctx.strokeRect(BOX_X - 1, BOX_Y - 1, bw + 2, bh + 2);
    ctx.lineWidth = 1;
    // Centre line or partition
    if (state.partition) {
      ctx.fillStyle = "#5c6a86";
      ctx.fillRect(BOX_X + mid - 2, BOX_Y, 4, bh);
    } else {
      ctx.strokeStyle = "#26324a";
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(BOX_X + mid + 0.5, BOX_Y); ctx.lineTo(BOX_X + mid + 0.5, BOX_Y + bh); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Particles
    const r = Math.max(narrow ? 1.5 : 2, (state.sigma / 2 - 0.5) * BS);
    ctx.fillStyle = state.dir === 1 ? "#8fa6ff" : "#7fd6c2";
    ctx.beginPath();
    for (let i = 0; i < state.N; i++) {
      if (i === state.nudged) continue;
      const x = BOX_X + X[i] / SCALE * BS, y = BOX_Y + Y[i] / SCALE * BS;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    if (state.nudged >= 0) {
      const x = BOX_X + X[state.nudged] / SCALE * BS, y = BOX_Y + Y[state.nudged] / SCALE * BS;
      ctx.fillStyle = "#f08a5d";
      ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(240,138,93,0.6)";
      ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.stroke();
    }

    // Labels
    ctx.font = "12px " + MONO;
    ctx.textAlign = "left";
    ctx.fillStyle = "#7f8ea6";
    const ly = BOX_Y - (narrow ? 10 : 12);
    ctx.fillText("LEFT " + state.nLeft, BOX_X, ly);
    const lw = ctx.measureText("LEFT " + state.nLeft).width;
    ctx.textAlign = "right";
    ctx.fillText("RIGHT " + (state.N - state.nLeft), BOX_X + bw, ly);
    const rw = ctx.measureText("RIGHT " + (state.N - state.nLeft)).width;
    ctx.textAlign = "center";
    ctx.fillStyle = state.dir === 1 ? "#c9d4e3" : "#7fd6c2";
    ctx.font = "600 13px " + MONO;
    const room = narrow ? bw - 2 * Math.max(lw, rw) - 16 : bw;
    fitText(state.dir === 1 ? "TIME ▶ FORWARD" : "◀ TIME REVERSED", BOX_X + mid, ly, room);

    if (state.message) {
      const cx = BOX_X + mid, cy = BOX_Y + bh / 2;
      if (!narrow) {
        ctx.fillStyle = "rgba(5,8,14,0.82)";
        const mw = 420, mh = 58;
        ctx.fillRect(cx - mw / 2, cy - mh / 2, mw, mh);
        ctx.strokeStyle = state.message.good ? "#4cc48d" : "#f08a5d";
        ctx.strokeRect(cx - mw / 2 + 0.5, cy - mh / 2 + 0.5, mw - 1, mh - 1);
        ctx.fillStyle = "#e4eaf2";
        ctx.font = "600 17px " + SANS;
        ctx.fillText(state.message.a, cx, cy - 4);
        ctx.font = "14px " + SANS;
        ctx.fillStyle = "#c9d4e3";
        ctx.fillText(state.message.b, cx, cy + 17);
      } else {
        // Narrow: wrap both lines and size the panel to fit them.
        const mw = bw - 16, tw = mw - 20;
        ctx.font = "600 14px " + SANS;
        const la = wrapLines(state.message.a, tw);
        ctx.font = "12px " + SANS;
        const lb = wrapLines(state.message.b, tw);
        const mh = la.length * 18 + lb.length * 16 + 18;
        const top = cy - mh / 2;
        ctx.fillStyle = "rgba(5,8,14,0.85)";
        ctx.fillRect(cx - mw / 2, top, mw, mh);
        ctx.strokeStyle = state.message.good ? "#4cc48d" : "#f08a5d";
        ctx.strokeRect(cx - mw / 2 + 0.5, top + 0.5, mw - 1, mh - 1);
        let y = top + 22;
        ctx.fillStyle = "#e4eaf2";
        ctx.font = "600 14px " + SANS;
        for (const l of la) { ctx.fillText(l, cx, y); y += 18; }
        ctx.fillStyle = "#c9d4e3";
        ctx.font = "12px " + SANS;
        for (const l of lb) { ctx.fillText(l, cx, y); y += 16; }
      }
    }
  }

  // Shrink a one-line label (down to 10 px) only if it would not fit.
  function fitText(text, x, y, maxW) {
    const base = ctx.font;
    const m = /(\d+(?:\.\d+)?)px/.exec(base);
    let size = m ? +m[1] : 12;
    while (size > 10 && ctx.measureText(text).width > maxW) {
      size -= 0.5;
      ctx.font = base.replace(/\d+(?:\.\d+)?px/, size + "px");
    }
    ctx.fillText(text, x, y);
    ctx.font = base;
  }
  // Split a sentence into lines that fit maxW. The whole sentence is translated
  // first; Chinese wraps per character.
  function wrapLines(text, maxW) {
    if (window.I18N) text = window.I18N.t(text);
    const cjk = /[\u3000-\u9fff]/.test(text);
    const words = cjk ? [...text] : text.split(" ");
    const sep = cjk ? "" : " ";
    const lines = [];
    let line = "";
    for (const w of words) {
      const t = line ? line + sep + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawPlot(p, title, value, maxV, band, refLabel, refV, colour) {
    const x0 = PX, x1 = PX + PW, y0 = p.y, y1 = p.y + p.h;
    const yOf = (v) => y1 - (v / maxV) * p.h;
    ctx.fillStyle = "#0a101b";
    ctx.fillRect(x0, y0, PW, p.h);
    ctx.font = "12px " + MONO;
    ctx.textAlign = "left";
    ctx.fillStyle = "#7f8ea6";
    ctx.fillText(title, x0, y0 - (narrow ? 9 : 12));
    // Typical fluctuation band
    if (band) {
      ctx.fillStyle = "rgba(143,166,255,0.10)";
      const top = yOf(Math.min(maxV, band[1])), bot = yOf(Math.max(0, band[0]));
      ctx.fillRect(x0, top, PW, bot - top);
    }
    // Reference line
    ctx.strokeStyle = "#3a4760";
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(x0, yOf(refV) + 0.5); ctx.lineTo(x1, yOf(refV) + 0.5); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#56647c";
    ctx.font = "11px " + MONO;
    ctx.textAlign = "right";
    ctx.fillText(refLabel, x1 - 4, yOf(refV) - 5);
    ctx.textAlign = "left";
    ctx.fillText("0", x0 + 4, y1 - 5);
    ctx.strokeStyle = "#26324a";
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, PW - 1, p.h - 1);

    // Reverse markers and the trace
    const hist = state.hist, n = hist.length;
    const xOf = (i) => x1 - (n - 1 - i) * (PW / (HIST - 1));
    for (let i = 1; i < n; i++) {
      if (hist[i].d !== hist[i - 1].d) {
        ctx.strokeStyle = hist[i].d === 1 ? "#5c6a86" : "#7fd6c2";
        ctx.beginPath(); ctx.moveTo(xOf(i) + 0.5, y0); ctx.lineTo(xOf(i) + 0.5, y1); ctx.stroke();
      }
    }
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    let prevD = null;
    for (let i = 0; i < n; i++) {
      const h = hist[i];
      if (h.d !== prevD) {
        if (prevD !== null) ctx.stroke();
        ctx.strokeStyle = h.d === 1 ? colour : "#7fd6c2";
        ctx.beginPath();
        if (i > 0) ctx.moveTo(xOf(i - 1), yOf(value(hist[i - 1])));
        else ctx.moveTo(xOf(i), yOf(value(h)));
        prevD = h.d;
      }
      ctx.lineTo(xOf(i), yOf(value(h)));
    }
    if (n) ctx.stroke();
    ctx.lineWidth = 1;
  }

  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    drawBox();
    const N = state.N, sd = 0.5 / Math.sqrt(N);
    drawPlot(P1, "FRACTION IN THE LEFT HALF", (h) => h.f, 1, [0.5 - sd, 0.5 + sd], "½", 0.5, "#8fa6ff");
    const sm = sMax();
    drawPlot(P2, "ENTROPY  S = ln C(N, n_left)", (h) => h.s, sm * 1.08, null, "max " + sm.toFixed(1), sm, "#f0b35a");
    ctx.font = "11px " + MONO;
    ctx.fillStyle = "#56647c";
    ctx.textAlign = "right";
    ctx.fillText("now", PX + PW, P2.y + P2.h + 16);
    ctx.textAlign = "left";
    ctx.fillText("20 s ago", PX, P2.y + P2.h + 16);
  }

  function sample() {
    state.hist.push({ f: state.nLeft / state.N, s: lnC(state.N, state.nLeft), d: state.dir });
    if (state.hist.length > HIST) state.hist.shift();
  }

  // ---------- Readouts ----------
  const sup = (n) => "<sup>" + String(n).replace("-", "−") + "</sup>";
  // Format 10^l10 as "m × 10ⁿ".
  function sci(l10, digits) {
    let e = Math.floor(l10);
    let m = Math.pow(10, l10 - e);
    if (+m.toFixed(digits) >= 10) { m /= 10; e++; }
    return m.toFixed(digits) + " × 10" + sup(e);
  }
  function bigNumber(l10) {
    if (l10 < 15) return Math.round(Math.pow(10, l10)).toLocaleString("en-US");
    return sci(l10, 1);
  }

  const LOG2 = Math.log10(2);
  function oddsLine(N) {
    const l10 = N * LOG2;
    return "1 in " + bigNumber(l10);
  }

  function updateOdds() {
    const N = state.N;
    const l10 = N * LOG2;                        // log10 of 2^N
    const p = N <= 12 ? "1/" + Math.pow(2, N).toLocaleString("en-US") : sci(-l10, 1);
    // Expected wait, looking once a second.
    const secs = l10;                            // log10 seconds
    const YEAR = Math.log10(3.156e7), AGE = Math.log10(1.38e10);
    let wait;
    if (secs < Math.log10(120)) wait = "about " + Math.round(Math.pow(10, secs)) + " seconds";
    else if (secs < Math.log10(7200)) wait = "about " + Math.round(Math.pow(10, secs) / 60) + " minutes";
    else if (secs < Math.log10(172800)) wait = "about " + Math.round(Math.pow(10, secs) / 3600) + " hours";
    else if (secs < YEAR + Math.log10(2)) wait = "about " + Math.round(Math.pow(10, secs) / 86400) + " days";
    else {
      const yrs = secs - YEAR;
      wait = "about " + (yrs < 9 ? Math.round(Math.pow(10, yrs)).toLocaleString("en-US") : sci(yrs, 1)) + " years";
      if (yrs > AGE) wait += ", roughly " + (yrs - AGE < 6 ? Math.round(Math.pow(10, yrs - AGE)).toLocaleString("en-US") : sci(yrs - AGE, 1)) + " times the age of the universe";
    }
    $("odds").innerHTML =
      "<b>Could it happen by itself?</b> Each particle is equally likely to be in either half, so the chance that all " + N +
      " are on the left at a given moment is (1/2)<sup>" + N + "</sup> = " + p + ", or " + oddsLine(N) +
      ". Taking one fresh look every second, you would expect to wait " + wait +
      ". A real room holds around 10<sup>27</sup> air molecules.";
  }

  function setHint(text, alert) {
    $("hint").textContent = text;
    $("hint").classList.toggle("alert", !!alert);
  }

  function updateReadouts() {
    $("leftOut").textContent = state.nLeft + " of " + state.N;
    $("entropyOut").textContent = lnC(state.N, state.nLeft).toFixed(1) + " of " + sMax().toFixed(1);
    $("clockOut").textContent = (state.clock / STEPS_PER_SECOND).toFixed(1) + " s";
    $("dirOut").textContent = state.dir === 1 ? "forward" : "backward";
    $("pAllOut").innerHTML = oddsLine(state.N);
    $("seenOut").textContent = state.seenAll + (state.seenAll === 1 ? " time" : " times");
    $("countOut").textContent = state.N;
    $("partition").textContent = state.partition ? "Pull the wall out" : "Put the wall back";
  }

  function setRunning(on) {
    state.running = on;
    $("play").textContent = on ? "Pause" : "Play";
  }

  // ---------- Loop ----------
  function advance(steps) {
    for (let k = 0; k < steps; k++) {
      step();
      if (state.dir === -1 && state.clock === 0) {
        backAtStart();
        break;
      }
    }
  }

  function backAtStart() {
    setRunning(false);
    const N = state.N, n = state.nLeft;
    if (n === N) {
      state.message = { good: true, a: "Back at t = 0: all " + N + " on the left", b: "Every particle retraced its path exactly." };
      setHint(state.nudged >= 0
        ? "Even with the nudge, all " + N + " particles made it back. With so few collisions the tiny error never had the chance to grow. Try it with a few hundred particles."
        : "Back at the start: all " + N + " particles are on the left, exactly where they began. The laws ran backwards without complaint. Press Play to keep going past t = 0, or Reverse time to run forward again.");
    } else {
      state.message = { good: false, a: "Back at t = 0, but only " + n + " of " + N + " on the left", b: "A tiny error grew until the reversal failed." };
      setHint("The clock is back at zero but the gas is still mixed: only " + n + " of " + N + " particles made it back. The nudge was 1/65,536 of a pixel. Each collision multiplied the error and spread it to new particles until the reversed motion no longer matched the original.", true);
    }
    updateReadouts();
  }

  let frameNo = 0;
  function frame() {
    if (state.running) {
      advance(state.speed);
      sample();
    }
    draw();
    if (++frameNo % 6 === 0 || !state.running) updateReadouts();
    requestAnimationFrame(frame);
  }

  // ---------- Controls ----------
  $("count").addEventListener("input", (e) => {
    state.N = COUNTS[+e.target.value];
    init();
    if (!Lab.reducedMotion) setRunning(true);
  });
  $("speed").addEventListener("input", (e) => {
    state.speed = +e.target.value;
    $("speedOut").textContent = state.speed + "×";
  });
  $("play").addEventListener("click", () => {
    state.message = null;
    setRunning(!state.running);
  });
  $("reverse").addEventListener("click", reverse);
  $("restart").addEventListener("click", () => { init(); setRunning(true); });
  $("partition").addEventListener("click", () => {
    state.partition = !state.partition;
    setHint(state.partition
      ? "The wall is back. Whatever split it caught is now locked in. Pull it out again to let the halves mix."
      : "The wall is out again. Note that changing the wall alters the history, so a later reversal may not land exactly on the start.");
    updateReadouts();
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

  // ---------- Start ----------
  state.N = COUNTS[+$("count").value];
  init();
  if (Lab.reducedMotion) {
    // No automatic motion: show a gas part-way through mixing and wait for Play.
    for (let i = 0; i < 300; i++) { advance(8); sample(); }
    setRunning(false);
    setHint("Animation is paused because your system asks for reduced motion. Press Play to run the gas, or Reverse time to send it back.");
  } else {
    setRunning(true);
  }
  updateReadouts();
  requestAnimationFrame(frame);
})();
