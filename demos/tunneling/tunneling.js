(function () {
  const $ = (id) => document.getElementById(id);
  const W = 960, H = 460;
  const ctx = Lab.setupCanvas($("bench"), W, H);
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";

  // ---------- Units: nanometres, femtoseconds, electron-volts, one electron ----------
  const HBAR = 0.6582119569;          // eV·fs
  const C2M = 0.0380998;              // ħ²/2m for an electron, eV·nm²
  const HBAR_M = 2 * C2M / HBAR;      // ħ/m, nm²/fs (about 0.1158)

  // Grid. The FFT method is periodic, so the edges soak up the wave instead of wrapping it.
  const N = 2048, XMIN = -48, XMAX = 48, LEN = XMAX - XMIN, DX = LEN / N;
  const VIEW = 30;                    // the plot shows ±30 nm
  const ABS0 = 33;                    // absorbing layer starts here
  const X0 = -14, SIGMA = 3;          // packet start and width (nm)
  const DT = 0.02;                    // fs per step
  const xs = new Float64Array(N);
  for (let i = 0; i < N; i++) xs[i] = XMIN + (i + 0.5) * DX;

  // ---------- A small radix-2 FFT ----------
  const LOG2N = Math.round(Math.log2(N));
  const rev = new Uint32Array(N);
  for (let i = 0; i < N; i++) {
    let r = 0, v = i;
    for (let j = 0; j < LOG2N; j++) { r = (r << 1) | (v & 1); v >>= 1; }
    rev[i] = r;
  }
  const twc = new Float64Array(N / 2), tws = new Float64Array(N / 2);
  for (let i = 0; i < N / 2; i++) { twc[i] = Math.cos(2 * Math.PI * i / N); tws[i] = Math.sin(2 * Math.PI * i / N); }
  function fft(re, im, inverse) {
    for (let i = 0; i < N; i++) {
      const j = rev[i];
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    const sgn = inverse ? 1 : -1;
    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1, step = N / size;
      for (let i = 0; i < N; i += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const wr = twc[k], wi = sgn * tws[k];
          const a = i + j, b = a + half;
          const tr = re[b] * wr - im[b] * wi;
          const ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
    if (inverse) for (let i = 0; i < N; i++) { re[i] /= N; im[i] /= N; }
  }

  // Kinetic phase for each wavenumber: exp(-i ħk²/2m · dt).
  const kinC = new Float64Array(N), kinS = new Float64Array(N);
  for (let j = 0; j < N; j++) {
    const k = 2 * Math.PI / LEN * (j < N / 2 ? j : j - N);
    const th = C2M * k * k * DT / HBAR;
    kinC[j] = Math.cos(th); kinS[j] = -Math.sin(th);
  }
  // Absorbing mask near both edges.
  const mask = new Float64Array(N).fill(1);
  const edgeIdx = [];
  for (let i = 0; i < N; i++) {
    const d = Math.abs(xs[i]) - ABS0;
    if (d > 0) {
      mask[i] = Math.pow(Math.cos(Math.min(1, d / (XMAX - ABS0)) * Math.PI / 2), 0.125);
      edgeIdx.push(i);
    }
  }

  // ---------- State ----------
  const state = {
    V0: 1.0, a: 0.5, E: 0.6,
    showRe: true, showBall: true, magnify: false, loop: true,
    running: true, done: false, holdUntil: 0,
    t: 0, absL: 0, absR: 0,
    R: 0, T: 0, inside: 0,
    theoryT: 0, classicalT: 0,
    k0: 0, v0: 0, tCap: 0,
  };
  const re = new Float64Array(N), im = new Float64Array(N);
  const potC = new Float64Array(N), potS = new Float64Array(N);
  const pot = new Float64Array(N);

  // ---------- Physics ----------
  // Plane-wave transmission through a rectangular barrier (exact).
  function planeT(E, V0, a) {
    if (E <= 0) return 0;
    if (V0 <= 0) return 1;
    if (Math.abs(E - V0) < 1e-9) return 1 / (1 + V0 * a * a / (4 * C2M));
    if (E < V0) {
      const kap = Math.sqrt((V0 - E) / C2M);
      const s = Math.sinh(kap * a);
      return 1 / (1 + V0 * V0 * s * s / (4 * E * (V0 - E)));
    }
    const k2 = Math.sqrt((E - V0) / C2M);
    const s = Math.sin(k2 * a);
    return 1 / (1 + V0 * V0 * s * s / (4 * E * (E - V0)));
  }

  // Average over the packet's spread of wavenumbers: |φ(k)|² ∝ exp(-2σ²(k-k0)²).
  function packetAverages() {
    let wsum = 0, tq = 0, tc = 0;
    const dk = 1 / (2 * SIGMA);
    for (let i = -400; i <= 400; i++) {
      const k = state.k0 + i * (6 * dk / 400);
      if (k <= 0) continue;
      const w = Math.exp(-2 * SIGMA * SIGMA * (k - state.k0) ** 2);
      const E = C2M * k * k;
      wsum += w;
      tq += w * planeT(E, state.V0, state.a);
      tc += w * (E > state.V0 ? 1 : 0);
    }
    state.theoryT = tq / wsum;
    state.classicalT = tc / wsum;
  }

  function buildPotential() {
    const lo = -state.a / 2, hi = state.a / 2;
    for (let i = 0; i < N; i++) {
      const c0 = xs[i] - DX / 2, c1 = xs[i] + DX / 2;
      const overlap = Math.max(0, Math.min(c1, hi) - Math.max(c0, lo)) / DX;
      pot[i] = state.V0 * overlap;
      const th = pot[i] * DT / (2 * HBAR);
      potC[i] = Math.cos(th); potS[i] = -Math.sin(th);
    }
  }

  function reset() {
    state.k0 = Math.sqrt(state.E / C2M);
    state.v0 = HBAR_M * state.k0;
    state.tCap = 95 / state.v0 + 60;
    const norm = Math.pow(2 * Math.PI * SIGMA * SIGMA, -0.25);
    for (let i = 0; i < N; i++) {
      const d = xs[i] - X0;
      const amp = norm * Math.exp(-d * d / (4 * SIGMA * SIGMA));
      re[i] = amp * Math.cos(state.k0 * xs[i]);
      im[i] = amp * Math.sin(state.k0 * xs[i]);
    }
    state.t = 0; state.absL = 0; state.absR = 0;
    state.done = false; state.holdUntil = 0;
    buildPotential();
    packetAverages();
    measure();
  }

  const mulPot = () => {
    for (let i = 0; i < N; i++) {
      const c = potC[i], s = potS[i], r = re[i], m = im[i];
      re[i] = r * c - m * s; im[i] = r * s + m * c;
    }
  };

  function step() {
    mulPot();
    fft(re, im, false);
    for (let j = 0; j < N; j++) {
      const c = kinC[j], s = kinS[j], r = re[j], m = im[j];
      re[j] = r * c - m * s; im[j] = r * s + m * c;
    }
    fft(re, im, true);
    mulPot();
    // Edge absorption: whatever is soaked up is booked to the side it left by.
    for (const i of edgeIdx) {
      const p = re[i] * re[i] + im[i] * im[i];
      const m = mask[i];
      const lost = p * (1 - m * m) * DX;
      if (xs[i] < 0) state.absL += lost; else state.absR += lost;
      re[i] *= m; im[i] *= m;
    }
    state.t += DT;
  }

  function measure() {
    const lo = -state.a / 2, hi = state.a / 2;
    let L = 0, R = 0, M = 0, view = 0;
    for (let i = 0; i < N; i++) {
      const p = (re[i] * re[i] + im[i] * im[i]) * DX;
      if (xs[i] + DX / 2 <= lo) L += p;
      else if (xs[i] - DX / 2 >= hi) R += p;
      else M += p;
      if (Math.abs(xs[i]) < VIEW - 4) view += p;
    }
    state.R = L + state.absL;
    state.T = R + state.absR;
    state.inside = M;
    return view;
  }

  function advance(nSteps) {
    for (let n = 0; n < nSteps; n++) step();
    measure();
    // Finish once the two packets are well clear of the barrier but still on screen.
    if (!state.done && (state.t > state.tCap || (state.t > 34 / state.v0 && state.inside < 1e-3))) {
      state.done = true;
      state.holdUntil = performance.now() + 3200;
    }
  }

  // Simulated femtoseconds per animation frame: the packet crosses the view in about 6 s.
  const stepsPerFrame = () => Math.max(2, Math.round(1 / (7 * state.v0) / DT));

  // ---------- Classical ball ----------
  // Same mean energy, a point particle. Bounces off the barrier if E < V, slows over it if E > V.
  function ballX(t) {
    const lo = -state.a / 2, hi = state.a / 2;
    const tHit = (lo - X0) / state.v0;
    if (t <= tHit) return X0 + state.v0 * t;
    if (state.E <= state.V0) return lo - state.v0 * (t - tHit);
    const v1 = HBAR_M * Math.sqrt((state.E - state.V0) / C2M);
    const tOut = tHit + state.a / v1;
    if (t <= tOut) return lo + v1 * (t - tHit);
    return hi + state.v0 * (t - tOut);
  }

  // ---------- Drawing ----------
  const PX0 = 56, PX1 = 930, PY0 = 46, PY1 = 318;
  const EMAX = 2.4;
  const xPx = (x) => PX0 + (x + VIEW) / (2 * VIEW) * (PX1 - PX0);
  const ePx = (E) => PY1 - E / EMAX * (PY1 - PY0);
  const PEAK0 = 1 / (Math.sqrt(2 * Math.PI) * SIGMA);
  const PROB_SCALE = 0.52 * (PY1 - PY0) / PEAK0;
  const RE_SCALE = 0.2 * (PY1 - PY0) / Math.sqrt(PEAK0);
  function pct(p) {
    const v = Math.max(0, p * 100);
    if (v >= 1 || v === 0) return v.toFixed(1) + "%";
    if (v >= 0.1) return v.toFixed(2) + "%";
    return v.toFixed(3) + "%";
  }

  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);

    // Energy axis
    ctx.font = "11px " + MONO;
    ctx.textAlign = "right";
    for (let e = 0; e <= 2.0001; e += 0.5) {
      const y = ePx(e);
      ctx.fillStyle = "#121b2b";
      ctx.fillRect(PX0, Math.round(y), PX1 - PX0, 1);
      ctx.fillStyle = "#56647c";
      ctx.fillText(e.toFixed(1), PX0 - 8, y + 4);
    }
    ctx.save();
    ctx.translate(16, (PY0 + PY1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("ENERGY (eV)", 0, 0);
    ctx.restore();

    // Distance axis
    ctx.textAlign = "center";
    for (let x = -30; x <= 30; x += 10) {
      const px = xPx(x);
      ctx.fillStyle = "#26324a";
      ctx.fillRect(px, PY1, 1, 5);
      ctx.fillStyle = "#56647c";
      ctx.fillText((x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x) + " nm", px, PY1 + 18);
    }

    // Barrier
    const bx0 = xPx(-state.a / 2), bx1 = xPx(state.a / 2);
    const bw = Math.max(2, bx1 - bx0), bxc = (bx0 + bx1) / 2;
    const by = ePx(state.V0);
    ctx.fillStyle = "rgba(240,179,90,0.22)";
    ctx.fillRect(bxc - bw / 2, by, bw, PY1 - by);
    ctx.strokeStyle = "#f0b35a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PX0, PY1); ctx.lineTo(bxc - bw / 2, PY1); ctx.lineTo(bxc - bw / 2, by);
    ctx.lineTo(bxc + bw / 2, by); ctx.lineTo(bxc + bw / 2, PY1); ctx.lineTo(PX1, PY1);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = "#f0b35a";
    ctx.textAlign = "left";
    ctx.font = "12px " + MONO;
    ctx.fillText("barrier " + state.V0.toFixed(2) + " eV × " + state.a.toFixed(2) + " nm", bxc + 10, Math.max(PY0 + 4, by - 8));

    // Packet energy line
    const ey = ePx(state.E);
    ctx.strokeStyle = "rgba(143,166,255,0.7)";
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(PX0, ey); ctx.lineTo(PX1, ey); ctx.stroke();
    ctx.setLineDash([]);

    // Clip the wave to the plot
    ctx.save();
    ctx.beginPath(); ctx.rect(PX0, PY0 - 30, PX1 - PX0, PY1 - PY0 + 30); ctx.clip();

    const i0 = Math.floor((-VIEW - XMIN) / DX), i1 = Math.ceil((VIEW - XMIN) / DX);

    // Re ψ, drawn around the energy line
    if (state.showRe) {
      ctx.strokeStyle = "rgba(201,212,227,0.5)";
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) {
        const px = xPx(xs[i]), py = ey - re[i] * RE_SCALE;
        i === i0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // |ψ|²
    ctx.beginPath();
    ctx.moveTo(xPx(xs[i0]), PY1);
    for (let i = i0; i <= i1; i++) {
      const p = re[i] * re[i] + im[i] * im[i];
      ctx.lineTo(xPx(xs[i]), PY1 - p * PROB_SCALE);
    }
    ctx.lineTo(xPx(xs[i1]), PY1);
    ctx.closePath();
    ctx.fillStyle = "rgba(92,190,255,0.32)";
    ctx.fill();
    ctx.strokeStyle = "#7cc8ff";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = i0; i <= i1; i++) {
      const p = re[i] * re[i] + im[i] * im[i];
      const px = xPx(xs[i]), py = PY1 - p * PROB_SCALE;
      i === i0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    // Magnified view of the far side
    if (state.magnify) {
      const iStart = Math.ceil((state.a / 2 - XMIN) / DX);
      ctx.strokeStyle = "#4cc48d";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (let i = iStart; i <= i1; i++) {
        const p = 20 * (re[i] * re[i] + im[i] * im[i]);
        const px = xPx(xs[i]), py = Math.max(PY0 - 30, PY1 - p * PROB_SCALE);
        i === iStart ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#4cc48d";
      ctx.textAlign = "right";
      ctx.fillText("×20", PX1 - 6, PY0 + 4);
    }
    ctx.restore();

    // Energy label, on top of the wave
    const eLabel = "packet energy " + state.E.toFixed(2) + " eV";
    ctx.font = "12px " + MONO;
    const ew = ctx.measureText(eLabel).width;
    ctx.fillStyle = "rgba(5,8,14,0.8)";
    ctx.fillRect(PX0 + 4, ey - 20, ew + 8, 17);
    ctx.fillStyle = "#8fa6ff";
    ctx.textAlign = "left";
    ctx.fillText(eLabel, PX0 + 8, ey - 7);

    // Classical ball
    if (state.showBall) {
      const bx = ballX(state.t);
      if (bx > -VIEW && bx < VIEW) {
        const px = xPx(bx);
        ctx.fillStyle = "#f08a5d";
        ctx.beginPath(); ctx.arc(px, ey - 7, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#c9d4e3";
        ctx.font = "11px " + MONO;
        ctx.textAlign = "center";
        ctx.fillText("classical ball", px, ey - 20);
      }
    }

    // Legend and clock
    ctx.font = "12px " + MONO;
    ctx.textAlign = "left";
    ctx.fillStyle = "#7cc8ff";
    ctx.fillText("■ |ψ|² where the electron may be", PX0, 24);
    if (state.showRe) {
      ctx.fillStyle = "#9aa7bb";
      ctx.fillText("∿ Re ψ", PX0 + 270, 24);
    }
    ctx.textAlign = "right";
    ctx.fillStyle = "#c9d4e3";
    ctx.fillText("t = " + state.t.toFixed(0) + " fs" + (state.done ? "  · finished" : ""), PX1, 24);

    drawSplitBar();
  }

  function drawSplitBar() {
    const X = PX0, BW = PX1 - PX0, Y = 384, BH = 16;
    const R = Math.min(1, state.R), T = Math.min(1, state.T), M = Math.max(0, 1 - R - T);
    ctx.fillStyle = "#121b2b";
    ctx.fillRect(X, Y, BW, BH);
    ctx.fillStyle = "#5c7dd6";
    ctx.fillRect(X, Y, R * BW, BH);
    ctx.fillStyle = "rgba(240,179,90,0.6)";
    ctx.fillRect(X + R * BW, Y, M * BW, BH);
    ctx.fillStyle = "#4cc48d";
    ctx.fillRect(X + BW - T * BW, Y, T * BW, BH);

    ctx.font = "12px " + MONO;
    ctx.fillStyle = "#c9d4e3";
    ctx.textAlign = "left";
    ctx.fillText("REFLECTED " + pct(state.R), X, Y - 10);
    ctx.textAlign = "right";
    ctx.fillText("TRANSMITTED " + pct(state.T), X + BW, Y - 10);

    // Prediction markers on the transmitted side
    const marks = [
      { v: state.theoryT, label: "quantum theory " + pct(state.theoryT), col: "#e9eef7", dy: 0 },
      { v: state.classicalT, label: "classical ball " + pct(state.classicalT), col: "#f08a5d", dy: 16 },
    ];
    for (const m of marks) {
      const px = X + BW - m.v * BW;
      ctx.fillStyle = m.col;
      ctx.fillRect(Math.round(px) - 1, Y - 3, 2, BH + 6);
      ctx.beginPath();
      ctx.moveTo(px, Y + BH + 4); ctx.lineTo(px - 4, Y + BH + 10); ctx.lineTo(px + 4, Y + BH + 10); ctx.fill();
      const tx = Math.min(X + BW, Math.max(X, px));
      ctx.textAlign = px > X + BW - 160 ? "right" : px < X + 160 ? "left" : "center";
      ctx.fillText(m.label, tx, Y + BH + 26 + m.dy);
    }
  }

  // ---------- Readouts ----------
  function updateStats() {
    $("trans").textContent = pct(state.T);
    $("refl").textContent = pct(state.R);
    $("theory").textContent = pct(state.theoryT);
    $("classical").textContent = pct(state.classicalT);
    $("lambda").textContent = (2 * Math.PI / state.k0).toFixed(2) + " nm";
  }
  function updateOutputs() {
    $("heightOut").textContent = state.V0.toFixed(2) + " eV";
    $("widthOut").textContent = state.a.toFixed(2) + " nm";
    $("energyOut").textContent = state.E.toFixed(2) + " eV";
    let note;
    if (state.V0 === 0) note = "No barrier at all: everything goes through.";
    else if (state.E < state.V0) {
      const kap = Math.sqrt((state.V0 - state.E) / C2M);
      note = "Energy is below the barrier, so a classical ball always bounces back. Inside the barrier the wave shrinks by a factor of e every " + (1 / kap).toFixed(2) + " nm.";
    } else note = "Energy is above the barrier, so a classical ball always gets over. Watch for the part of the wave that reflects anyway.";
    $("hint").textContent = note;
  }

  // ---------- Loop ----------
  let lastStats = 0;
  function frame(now) {
    if (state.running) {
      if (!state.done) advance(stepsPerFrame());
      else if (state.loop && now > state.holdUntil) reset();
    }
    draw();
    if (now - lastStats > 120) { updateStats(); lastStats = now; }
    requestAnimationFrame(frame);
  }

  // Reduced motion: compute the whole collision quietly, then show the final picture.
  let quietJob = 0;
  function runQuietly() {
    const job = ++quietJob;
    function chunk() {
      if (job !== quietJob) return;
      let n = 0;
      while (!state.done && n < 600) { advance(50); n += 50; }
      if (state.done) { draw(); updateStats(); }
      else setTimeout(chunk, 0);
    }
    draw(); updateStats();
    chunk();
  }

  function restart() {
    reset();
    updateOutputs();
    updateStats();
    if (Lab.reducedMotion) runQuietly();
  }

  // ---------- Controls ----------
  $("height").addEventListener("input", (e) => { state.V0 = +e.target.value; restart(); });
  $("width").addEventListener("input", (e) => { state.a = +e.target.value; restart(); });
  $("energy").addEventListener("input", (e) => { state.E = +e.target.value; restart(); });
  $("showRe").addEventListener("change", (e) => { state.showRe = e.target.checked; if (Lab.reducedMotion) draw(); });
  $("showBall").addEventListener("change", (e) => { state.showBall = e.target.checked; if (Lab.reducedMotion) draw(); });
  $("magnify").addEventListener("change", (e) => { state.magnify = e.target.checked; if (Lab.reducedMotion) draw(); });
  $("loop").addEventListener("change", (e) => { state.loop = e.target.checked; });
  $("restart").addEventListener("click", () => {
    state.running = true;
    $("pause").textContent = "Pause";
    restart();
  });
  $("pause").addEventListener("click", () => {
    state.running = !state.running;
    $("pause").textContent = state.running ? "Pause" : "Resume";
  });
  if (Lab.reducedMotion) {
    $("pause").hidden = true;
    $("loop").closest(".control").hidden = true;
  }

  state.V0 = +$("height").value;
  state.a = +$("width").value;
  state.E = +$("energy").value;
  state.showRe = $("showRe").checked;
  state.showBall = $("showBall").checked;
  state.magnify = $("magnify").checked;
  state.loop = $("loop").checked;
  reset();
  updateOutputs();
  if (Lab.reducedMotion) {
    runQuietly();
  } else {
    // Open with the packet already on its way in.
    advance(Math.round(6 / DT));
    requestAnimationFrame(frame);
  }

  // Exposed for testing in a console.
  window.__tunneling = { state, planeT, advance, reset };
})();
