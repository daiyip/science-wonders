(function () {
  const $ = (id) => document.getElementById(id);
  const W = 960, H = 460;
  const ctx = Lab.setupCanvas($("bench"), W, H);

  // ---------- Layout ----------
  const SRC = { x: 40, y: 220 }, BS1 = { x: 104, y: 220 }, BS2 = { x: 486, y: 220 };
  const UP_Y = 150, LO_Y = 290;
  const BOX = { x0: 170, y0: 78, x1: 420, y1: 362 };
  const BLOB_R = 16, P_R = 2.5;
  const blobs = [{ x: 295, y: UP_Y, flash: 0 }, { x: 295, y: LO_Y, flash: 0 }];
  const RX = 566, RW = 380;

  const COL = {
    bg: "#05080e", label: "#7f8ea6", dim: "#56647c", rule: "#1f2a3f", metal: "#3a4760",
    obj: "#8fa6ff", coh: "#6fd8c4", record: "#f0b35a", gas: "#7f8ea6", white: "#e9eef7",
  };

  // ---------- State ----------
  const state = {
    N: 40, T: 300, coupling: 0.15, running: true, showAvg: true,
    particles: [],
    t: 0, C: 1, hits: 0, trace: [[0, 1]], win: 10, hold: 0,
  };

  const overlap = () => 1 - state.coupling;        // ⟨E_upper|E_lower⟩ per collision
  const speed = () => 70 * Math.sqrt(state.T / 300); // px per second

  // Expected collision rate in this 2D box: density × collision width × speed, for two blobs.
  function collisionRate() {
    const area = (BOX.x1 - BOX.x0) * (BOX.y1 - BOX.y0) - 2 * Math.PI * BLOB_R * BLOB_R;
    return (state.N / area) * 2 * (BLOB_R + P_R) * speed() * 2;
  }
  // Ensemble-averaged coherence: E[overlap^n] for Poisson n = exp(−Γ(1−overlap)t).
  const lambda = () => collisionRate() * (1 - overlap());

  function makeParticle() {
    for (;;) {
      const x = BOX.x0 + P_R + Math.random() * (BOX.x1 - BOX.x0 - 2 * P_R);
      const y = BOX.y0 + P_R + Math.random() * (BOX.y1 - BOX.y0 - 2 * P_R);
      if (blobs.every((b) => Math.hypot(x - b.x, y - b.y) > BLOB_R + P_R + 2)) {
        const a = Math.random() * Math.PI * 2;
        return { x, y, dx: Math.cos(a), dy: Math.sin(a), marked: false };
      }
    }
  }
  function setParticleCount(n) {
    while (state.particles.length < n) state.particles.push(makeParticle());
    state.particles.length = n;
  }

  function newRun() {
    state.t = 0; state.C = 1; state.hits = 0; state.hold = 0;
    state.trace = [[0, 1]];
    for (const p of state.particles) p.marked = false;
    const L = lambda();
    state.win = L > 0 ? Math.min(30, Math.max(4, 5 / L)) : 10;
    updateStats(true);
  }

  // ---------- Simulation step ----------
  function step(dt) {
    const s = speed();
    const r = overlap();
    for (const p of state.particles) {
      p.x += p.dx * s * dt; p.y += p.dy * s * dt;
      if (p.x < BOX.x0 + P_R) { p.x = BOX.x0 + P_R; p.dx = Math.abs(p.dx); }
      if (p.x > BOX.x1 - P_R) { p.x = BOX.x1 - P_R; p.dx = -Math.abs(p.dx); }
      if (p.y < BOX.y0 + P_R) { p.y = BOX.y0 + P_R; p.dy = Math.abs(p.dy); }
      if (p.y > BOX.y1 - P_R) { p.y = BOX.y1 - P_R; p.dy = -Math.abs(p.dy); }
      for (const b of blobs) {
        const ox = p.x - b.x, oy = p.y - b.y;
        const d = Math.hypot(ox, oy);
        if (d < BLOB_R + P_R && d > 0) {
          const nx = ox / d, ny = oy / d;
          const dot = p.dx * nx + p.dy * ny;
          if (dot < 0) {
            p.dx -= 2 * dot * nx; p.dy -= 2 * dot * ny;
            // The bounce happened in this branch only: the particle now holds a partial record.
            state.C *= r;
            state.hits++;
            if (r < 1) p.marked = true;
            b.flash = 1;
            state.trace.push([state.t, state.C]);
          }
          p.x = b.x + nx * (BLOB_R + P_R); p.y = b.y + ny * (BLOB_R + P_R);
        }
      }
    }
    state.t += dt;
  }

  // ---------- Drawing ----------
  function label(text, x, y, align, colour) {
    ctx.fillStyle = colour || COL.label;
    ctx.textAlign = align || "center";
    ctx.fillText(text, x, y);
  }
  const mono = (px) => { ctx.font = `${px}px 'IBM Plex Mono', ui-monospace, monospace`; };

  function drawApparatus() {
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, W, H);
    mono(12);

    // Chamber
    ctx.fillStyle = "#08101c";
    ctx.fillRect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0);
    ctx.strokeStyle = "#26324a";
    ctx.strokeRect(BOX.x0 + 0.5, BOX.y0 + 0.5, BOX.x1 - BOX.x0 - 1, BOX.y1 - BOX.y0 - 1);
    label(state.N ? `GAS CHAMBER · ${state.T} K` : "GAS CHAMBER · EMPTY", (BOX.x0 + BOX.x1) / 2, BOX.y0 - 10);

    // Beam paths (both branches exist at once)
    ctx.strokeStyle = `rgba(143,166,255,${0.18 + 0.4 * state.C})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(SRC.x + 8, SRC.y); ctx.lineTo(BS1.x, BS1.y);
    for (const y of [UP_Y, LO_Y]) {
      ctx.moveTo(BS1.x, BS1.y); ctx.lineTo(BOX.x0 - 10, y); ctx.lineTo(BOX.x1 + 10, y); ctx.lineTo(BS2.x, BS2.y);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(143,166,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(BS2.x, BS2.y); ctx.lineTo(536, 192);
    ctx.moveTo(BS2.x, BS2.y); ctx.lineTo(536, 248);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Source, beam splitters, detectors
    ctx.fillStyle = COL.obj;
    ctx.beginPath(); ctx.arc(SRC.x, SRC.y, 5, 0, Math.PI * 2); ctx.fill();
    label("SOURCE", SRC.x, SRC.y + 26);
    for (const [bs, name] of [[BS1, "SPLIT"], [BS2, "JOIN"]]) {
      ctx.save(); ctx.translate(bs.x, bs.y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "rgba(143,166,255,0.2)"; ctx.strokeStyle = COL.obj;
      ctx.fillRect(-8, -8, 16, 16); ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
      label(name, bs.x, bs.y + 30);
    }
    const p0 = (1 + state.C) / 2; // detector odds at zero phase
    for (const [y, name, p] of [[192, "D0", p0], [248, "D1", 1 - p0]]) {
      ctx.fillStyle = `rgba(143,166,255,${0.15 + 0.75 * p})`;
      ctx.beginPath(); ctx.arc(542, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = COL.obj;
      ctx.beginPath(); ctx.arc(542, y, 8, 0, Math.PI * 2); ctx.stroke();
      mono(10);
      label(name, 542, y + (y < 220 ? -14 : 24));
      mono(12);
    }

    // The link between branches: brightness = remaining coherence
    ctx.strokeStyle = `rgba(111,216,196,${0.08 + 0.8 * state.C})`;
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = UP_Y + BLOB_R + 4; y <= LO_Y - BLOB_R - 4; y += 2) {
      const x = blobs[0].x + 6 * Math.sin((y - UP_Y) / 9 + state.t * 4);
      y === UP_Y + BLOB_R + 4 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    mono(10);
    label(`coherence ${(state.C * 100).toFixed(0)}%`, blobs[0].x + 14, (UP_Y + LO_Y) / 2 + 4, "left", COL.coh);
    mono(12);

    // Gas
    for (const p of state.particles) {
      ctx.fillStyle = p.marked ? COL.record : COL.gas;
      ctx.beginPath(); ctx.arc(p.x, p.y, P_R, 0, Math.PI * 2); ctx.fill();
    }

    // The object, half present in each branch
    for (const b of blobs) {
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, BLOB_R + 10);
      g.addColorStop(0, "rgba(143,166,255,0.75)");
      g.addColorStop(0.6, "rgba(143,166,255,0.35)");
      g.addColorStop(1, "rgba(143,166,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, BLOB_R + 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = COL.obj;
      ctx.beginPath(); ctx.arc(b.x, b.y, BLOB_R, 0, Math.PI * 2); ctx.stroke();
      if (b.flash > 0) {
        ctx.strokeStyle = `rgba(240,179,90,${b.flash})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, BLOB_R + 4 + 10 * (1 - b.flash), 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
    mono(10);
    label("upper path", blobs[0].x, UP_Y - BLOB_R - 14, "center", COL.obj);
    label("lower path", blobs[1].x, LO_Y + BLOB_R + 22, "center", COL.obj);
    // Legend
    ctx.fillStyle = COL.gas; ctx.beginPath(); ctx.arc(BOX.x0 + 4, BOX.y1 + 22, 3, 0, Math.PI * 2); ctx.fill();
    label("gas particle", BOX.x0 + 12, BOX.y1 + 26, "left");
    ctx.fillStyle = COL.record; ctx.beginPath(); ctx.arc(BOX.x0 + 110, BOX.y1 + 22, 3, 0, Math.PI * 2); ctx.fill();
    label("carries a which-path record", BOX.x0 + 118, BOX.y1 + 26, "left", COL.record);
    mono(12);
  }

  function drawMatrix() {
    mono(11);
    label("DENSITY MATRIX ρ", RX, 28, "left");
    const gx = RX + 34, gy = 44, cell = 62;
    const rho = [[0.5, 0.5 * state.C], [0.5 * state.C, 0.5]];
    mono(10);
    label("upper", gx + cell / 2, gy - 4, "center", COL.dim);
    label("lower", gx + cell * 1.5, gy - 4, "center", COL.dim);
    label("upper", gx - 6, gy + cell / 2 + 3, "right", COL.dim);
    label("lower", gx - 6, gy + cell * 1.5 + 3, "right", COL.dim);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x = gx + j * cell, y = gy + i * cell;
      ctx.strokeStyle = COL.rule;
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
      const v = rho[i][j];
      const side = (cell - 12) * Math.sqrt(v / 0.5);
      ctx.fillStyle = i === j ? "rgba(143,166,255,0.8)" : "rgba(111,216,196,0.85)";
      ctx.fillRect(x + (cell - side) / 2, y + (cell - side) / 2, side, side);
      mono(11);
      ctx.fillStyle = COL.white;
      ctx.textAlign = "center";
      ctx.fillText(v.toFixed(2), x + cell / 2, y + cell / 2 + 4);
    }
    const tx = gx + 2 * cell + 22;
    mono(11);
    label("diagonal", tx, gy + 16, "left", COL.obj);
    ctx.font = "12px 'IBM Plex Sans', system-ui, sans-serif";
    label("odds of each path", tx, gy + 32, "left", "#aab6c8");
    mono(11);
    label("off-diagonal", tx, gy + 66, "left", COL.coh);
    ctx.font = "12px 'IBM Plex Sans', system-ui, sans-serif";
    label("how well the paths", tx, gy + 82, "left", "#aab6c8");
    label("can still interfere", tx, gy + 97, "left", "#aab6c8");
  }

  function drawFringes() {
    const top = 200, x0 = RX, w = RW;
    mono(11);
    label("OUTPUT IF RECOMBINED NOW", x0, top, "left");
    label(`visibility ${(state.C * 100).toFixed(0)}%`, x0 + w, top, "right", COL.coh);
    // Stripe band: what a screen at the output would show as the phase is scanned
    const bandY = top + 10, bandH = 22;
    for (let i = 0; i < w; i += 2) {
      const phi = (i / w) * 6 * Math.PI;
      const I = (1 + state.C * Math.cos(phi)) / 2;
      ctx.fillStyle = `rgba(143,166,255,${0.05 + 0.9 * I})`;
      ctx.fillRect(x0 + i, bandY, 2, bandH);
    }
    // Curve
    const cy0 = bandY + bandH + 10, ch = 52;
    ctx.strokeStyle = COL.rule;
    ctx.beginPath(); ctx.moveTo(x0, cy0 + ch + 0.5); ctx.lineTo(x0 + w, cy0 + ch + 0.5); ctx.stroke();
    ctx.strokeStyle = "rgba(233,238,247,0.3)";
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    for (let i = 0; i <= w; i += 2) {
      const phi = (i / w) * 6 * Math.PI;
      const y = cy0 + ch - ch * (1 + Math.cos(phi)) / 2;
      i === 0 ? ctx.moveTo(x0 + i, y) : ctx.lineTo(x0 + i, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = COL.obj; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= w; i += 2) {
      const phi = (i / w) * 6 * Math.PI;
      const y = cy0 + ch - ch * (1 + state.C * Math.cos(phi)) / 2;
      i === 0 ? ctx.moveTo(x0 + i, y) : ctx.lineTo(x0 + i, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    mono(10);
    label("chance at D0 as the path difference is scanned →", x0, cy0 + ch + 14, "left", COL.dim);
  }

  function drawTrace() {
    const top = 340, x0 = RX + 26, w = RW - 26, y0 = top + 12, h = 82;
    mono(11);
    label("COHERENCE OVER TIME", RX, top, "left");
    mono(10);
    label("1", x0 - 6, y0 + 4, "right", COL.dim);
    label("0", x0 - 6, y0 + h + 3, "right", COL.dim);
    ctx.strokeStyle = COL.rule;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h);
    const X = (t) => x0 + (t / state.win) * w;
    const Y = (c) => y0 + h - c * h;
    if (state.showAvg) {
      const L = lambda();
      ctx.strokeStyle = "rgba(233,238,247,0.6)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = (i / 60) * state.win;
        i === 0 ? ctx.moveTo(X(t), Y(Math.exp(-L * t))) : ctx.lineTo(X(t), Y(Math.exp(-L * t)));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (!Lab.reducedMotion) {
      ctx.strokeStyle = COL.coh; ctx.lineWidth = 1.6;
      ctx.beginPath();
      let prev = state.trace[0];
      ctx.moveTo(X(prev[0]), Y(prev[1]));
      for (let k = 1; k < state.trace.length; k++) {
        const pt = state.trace[k];
        ctx.lineTo(X(pt[0]), Y(prev[1]));
        ctx.lineTo(X(pt[0]), Y(pt[1]));
        prev = pt;
      }
      ctx.lineTo(X(Math.min(state.t, state.win)), Y(state.C));
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    label("0 s", x0, y0 + h + 14, "left", COL.dim);
    label(`${state.win.toFixed(state.win < 10 ? 1 : 0)} s`, x0 + w, y0 + h + 14, "right", COL.dim);
    const legend = Lab.reducedMotion ? "dashed: average over many runs" : (state.showAvg ? "solid: this run · dashed: average" : "solid: this run");
    label(legend, x0 + w / 2, y0 + h + 14, "center", COL.dim);
  }

  function draw() {
    drawApparatus();
    drawMatrix();
    drawFringes();
    drawTrace();
  }

  // ---------- Stats ----------
  let lastStats = 0;
  function updateStats(force) {
    const now = performance.now();
    if (!force && now - lastStats < 150) return;
    lastStats = now;
    $("hits").textContent = state.hits.toLocaleString();
    $("rho01").textContent = (0.5 * state.C).toFixed(3);
    $("vis").textContent = (state.C * 100).toFixed(state.C < 0.1 && state.C > 0 ? 1 : 0) + "%";
    $("info").textContent = Math.round(Math.sqrt(Math.max(0, 1 - state.C * state.C)) * 100) + "%";
    const L = lambda();
    $("tau").textContent = L > 0 ? (1 / L).toFixed(1) + " s" : "never";
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.running) {
      if (state.t < state.win) {
        // Substeps keep fast particles from skipping through the object.
        const n = Math.ceil(speed() * dt / 4) || 1;
        for (let i = 0; i < n; i++) step(dt / n);
      } else {
        state.hold += dt;
        if (state.hold > 1.4) newRun();
      }
    }
    for (const b of blobs) b.flash = Math.max(0, b.flash - dt * 3);
    updateStats();
    draw();
    requestAnimationFrame(frame);
  }

  // Reduced motion: no moving gas. Show the average state one decoherence time in.
  function renderStatic() {
    const L = lambda();
    state.win = L > 0 ? Math.min(30, Math.max(4, 5 / L)) : 10;
    state.t = L > 0 ? 1 / L : 0;
    state.C = L > 0 ? Math.exp(-1) : 1;
    state.hits = Math.round(collisionRate() * state.t);
    updateStats(true);
    draw();
  }

  // ---------- Controls ----------
  function readouts() {
    $("pressureOut").textContent = state.N;
    $("tempOut").textContent = state.T + " K";
    $("couplingOut").textContent = Math.round(state.coupling * 100) + "% lost";
  }
  function changed() {
    readouts();
    if (Lab.reducedMotion) { renderStatic(); return; }
    const L = lambda();
    state.win = Math.max(state.win, state.t + 1);
    if (L > 0) state.win = Math.max(state.win, Math.min(30, 5 / L));
    updateStats(true);
  }
  $("pressure").addEventListener("input", (e) => { state.N = +e.target.value; setParticleCount(state.N); changed(); });
  $("temp").addEventListener("input", (e) => { state.T = +e.target.value; changed(); });
  $("coupling").addEventListener("input", (e) => { state.coupling = +e.target.value / 100; changed(); });
  $("avg").addEventListener("change", (e) => { state.showAvg = e.target.checked; if (Lab.reducedMotion) draw(); });
  $("play").addEventListener("click", () => {
    state.running = !state.running;
    $("play").textContent = state.running ? "Pause" : "Resume";
  });
  $("reset").addEventListener("click", () => { newRun(); if (Lab.reducedMotion) renderStatic(); });
  $("vacuum").addEventListener("click", () => {
    state.N = 0; $("pressure").value = 0; setParticleCount(0);
    readouts();
    newRun();
    if (Lab.reducedMotion) renderStatic();
  });

  // ---------- Scale it up ----------
  const OBJECTS = {
    c70: { r: 0.5e-9, name: "A C₇₀ molecule" },
    virus: { r: 50e-9, name: "A virus" },
    dust: { r: 5e-6, name: "A dust grain" },
    cat: { r: 0.15, name: "A cat" },
  };
  const ENVIRONS = { air: 101325, hv: 1e-4, uhv: 1e-8 }; // pascals
  const KB = 1.380649e-23, T_GAS = 293, V_GAS = 470, R_GAS = 0.18e-9; // nitrogen

  const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  function sci(x) {
    const e = Math.floor(Math.log10(x));
    let m = Math.round(x / 10 ** e);
    let ee = e;
    if (m === 10) { m = 1; ee++; }
    return `${m} × 10${String(ee).split("").map((c) => SUP[c]).join("")}`;
  }
  function formatTime(s) {
    if (s >= 3600) return `about ${(s / 3600).toPrecision(2)} hours`;
    if (s >= 60) return `about ${(s / 60).toPrecision(2)} minutes`;
    if (s >= 0.001) return `about ${s.toPrecision(2)} s`;
    return `about ${sci(s)} s`;
  }
  function updateScale() {
    const o = OBJECTS[$("object").value];
    const n = ENVIRONS[$("environ").value] / (KB * T_GAS);
    const sigma = Math.PI * (o.r + R_GAS) ** 2;
    const rate = n * sigma * V_GAS;
    const tau = 1 / rate;
    $("scaleOut").textContent = formatTime(tau);
    let compare;
    if (tau < 3.3e-19) compare = "That is less time than light takes to cross a single atom.";
    else if (tau < 2e-15) compare = "That is shorter than one wiggle of a visible light wave.";
    else if (tau < 1e-9) compare = "That is under a nanosecond: no interference experiment could ever catch it.";
    else if (tau < 1e-2) compare = "Short, but quantum experiments with fast molecules can sometimes beat it.";
    else compare = "Long enough that interference experiments can work. This is why they need a good vacuum.";
    $("scaleNote").textContent = `${o.name} is hit by about ${sci(rate)} gas molecules per second. ${compare}`;
  }
  $("object").addEventListener("change", updateScale);
  $("environ").addEventListener("change", updateScale);

  // ---------- Start ----------
  setParticleCount(state.N);
  readouts();
  updateScale();
  newRun();
  if (Lab.reducedMotion) {
    renderStatic();
  } else {
    // Start part-way into a run so the first view already shows some decay.
    for (let i = 0; i < 120; i++) step(1 / 60);
    requestAnimationFrame(frame);
  }
})();
