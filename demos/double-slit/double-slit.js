(function () {
  const W = 960, H = 460;
  const canvas = document.getElementById("bench");
  const ctx = Lab.setupCanvas(canvas, W, H);

  // Geometry of the drawing (logical pixels).
  const CY = 240;                 // optical axis
  const SRC_X = 50, BAR_X = 250, SCR_X = 560;
  const SCR_TOP = 50, SCR_BOT = 430;
  const FILM_X = 600, FILM_W = 150;
  const HIST_X = 776, HIST_W = 168;

  // Physics (real units). The screen shows ±HALF mm, L metres away.
  const L_MM = 1000;
  const HALF = 15;
  const BINS = 95;

  const state = {
    lambda: 520, d: 0.25, a: 0.05,
    detector: false, bothOpen: true,
    rate: 15, running: true, showTheory: true,
    hits: [], counts: new Array(BINS).fill(0),
    pdf: new Array(BINS).fill(0),
    flights: [], pending: 0,
  };

  // Offscreen "film" so thousands of dots cost nothing to redraw.
  const film = document.createElement("canvas");
  const filmCtx = Lab.setupCanvas(film, FILM_W, SCR_BOT - SCR_TOP);

  const $ = (id) => document.getElementById(id);

  // ---------- Physics ----------
  const sinc2 = (u) => (Math.abs(u) < 1e-9 ? 1 : (Math.sin(u) / u) ** 2);

  // Relative probability of landing at x (mm on the screen).
  function intensity(x) {
    const k = Math.PI / (state.lambda * 1e-6 * L_MM); // 1 / mm²
    if (!state.bothOpen) {
      return sinc2(k * state.a * (x - state.d / 2));
    }
    if (state.detector) {
      // Which-path known: the two single-slit patterns add as probabilities, no cross term.
      return 0.5 * (sinc2(k * state.a * (x - state.d / 2)) + sinc2(k * state.a * (x + state.d / 2)));
    }
    // Which-path unknown: amplitudes add, giving the cos² interference term.
    return Math.cos(k * state.d * x) ** 2 * sinc2(k * state.a * x);
  }

  function samplePosition() {
    for (let i = 0; i < 20000; i++) {
      const x = (Math.random() * 2 - 1) * HALF;
      if (Math.random() < intensity(x)) return x;
    }
    return 0;
  }

  function computePdf() {
    let total = 0;
    for (let b = 0; b < BINS; b++) {
      let s = 0;
      for (let j = 0; j < 6; j++) {
        const x = -HALF + (b + (j + 0.5) / 6) * (2 * HALF / BINS);
        s += intensity(x);
      }
      state.pdf[b] = s;
      total += s;
    }
    for (let b = 0; b < BINS; b++) state.pdf[b] /= total;
  }

  // ---------- Mapping helpers ----------
  const mmToY = (x) => CY - (x / HALF) * ((SCR_BOT - SCR_TOP) / 2);
  const slitGapPx = () => 14 + (state.d - 0.1) / 0.5 * 56;     // exaggerated for visibility
  const slitWidthPx = () => 3 + (state.a - 0.02) / 0.1 * 9;
  const slitYs = () => {
    const g = slitGapPx() / 2;
    return state.bothOpen ? [CY - g, CY + g] : [CY - g];
  };
  const colour = () => Lab.wavelengthToRGB(state.lambda);
  const rgba = (a) => { const [r, g, b] = colour(); return `rgba(${r},${g},${b},${a})`; };

  // ---------- Firing ----------
  function land(x) {
    const yPx = mmToY(x);
    const fx = 4 + Math.random() * (FILM_W - 8);
    state.hits.push({ x, fx });
    const b = Math.floor((x + HALF) / (2 * HALF) * BINS);
    if (b >= 0 && b < BINS) state.counts[b]++;
    filmCtx.fillStyle = rgba(0.9);
    filmCtx.beginPath();
    filmCtx.arc(fx, yPx - SCR_TOP, 1.4, 0, Math.PI * 2);
    filmCtx.fill();
    $("count").textContent = state.hits.length.toLocaleString();
  }

  function fire(animate) {
    const x = samplePosition();
    // A detector-on photon has a definite slit. Pick it in proportion to each slit's share.
    let slit = 0;
    if (state.bothOpen && state.detector) {
      const k = Math.PI / (state.lambda * 1e-6 * L_MM);
      const top = sinc2(k * state.a * (x - state.d / 2));
      const bot = sinc2(k * state.a * (x + state.d / 2));
      slit = Math.random() < top / (top + bot) ? 0 : 1;
    }
    if (animate && !Lab.reducedMotion && state.flights.length < 14) {
      state.flights.push({ x, slit, t: 0, wave: !state.detector });
    } else {
      land(x);
    }
  }

  function clearScreen() {
    state.hits = [];
    state.counts.fill(0);
    state.flights = [];
    filmCtx.clearRect(0, 0, FILM_W, SCR_BOT - SCR_TOP);
    $("count").textContent = "0";
  }

  // ---------- Drawing ----------
  const FLIGHT_MS = 1100;

  function drawApparatus() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);

    ctx.font = "12px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "center";
    ctx.fillText("SOURCE", SRC_X, 28);
    ctx.fillText(state.bothOpen ? "DOUBLE SLIT" : "ONE SLIT", BAR_X, 28);
    ctx.fillText("SCREEN", SCR_X, 28);
    ctx.fillText("SCREEN, FACE-ON", FILM_X + FILM_W / 2, 28);
    ctx.fillText("HITS PER BAND", HIST_X + HIST_W / 2, 28);

    // Optical axis
    ctx.strokeStyle = "#1a2436";
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(SRC_X, CY); ctx.lineTo(SCR_X, CY); ctx.stroke();
    ctx.setLineDash([]);

    // Source
    const g = ctx.createRadialGradient(SRC_X, CY, 0, SRC_X, CY, 26);
    g.addColorStop(0, rgba(0.95)); g.addColorStop(1, rgba(0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(SRC_X, CY, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e9eef7";
    ctx.beginPath(); ctx.arc(SRC_X, CY, 4, 0, Math.PI * 2); ctx.fill();

    // Barrier with slits
    const ys = slitYs();
    const allYs = [CY - slitGapPx() / 2, CY + slitGapPx() / 2];
    const hw = slitWidthPx() / 2;
    ctx.fillStyle = "#3a4760";
    let top = SCR_TOP - 10;
    const openings = allYs.map((y, i) => ({ y, open: state.bothOpen || i === 0 }));
    for (const o of openings) {
      if (o.open) {
        ctx.fillRect(BAR_X - 4, top, 8, o.y - hw - top);
        top = o.y + hw;
      }
    }
    ctx.fillRect(BAR_X - 4, top, 8, SCR_BOT + 10 - top);
    if (!state.bothOpen) {
      ctx.fillStyle = "#5c6a86";
      ctx.fillRect(BAR_X - 4, allYs[1] - hw, 8, hw * 2);
    }

    // Detectors (an eye-like ring beside each open slit)
    if (state.detector) {
      for (const y of ys) {
        ctx.strokeStyle = "#f0b35a";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(BAR_X + 22, y, 9, 5.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#f0b35a";
        ctx.beginPath(); ctx.arc(BAR_X + 22, y, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.lineWidth = 1;
    }

    // Screen (side view) with a faint glow where hits pile up
    ctx.fillStyle = "#1c2639";
    ctx.fillRect(SCR_X - 3, SCR_TOP, 6, SCR_BOT - SCR_TOP);
    const maxC = Math.max(1, ...state.counts);
    for (let b = 0; b < BINS; b++) {
      if (!state.counts[b]) continue;
      const y0 = mmToY(-HALF + (b + 1) * 2 * HALF / BINS);
      const y1 = mmToY(-HALF + b * 2 * HALF / BINS);
      ctx.fillStyle = rgba(0.15 + 0.85 * state.counts[b] / maxC);
      ctx.fillRect(SCR_X - 3, y0, 6, y1 - y0 + 0.5);
    }

    // Film (face-on view)
    ctx.fillStyle = "#0a0f19";
    ctx.fillRect(FILM_X, SCR_TOP, FILM_W, SCR_BOT - SCR_TOP);
    ctx.drawImage(film, FILM_X, SCR_TOP, FILM_W, SCR_BOT - SCR_TOP);
    ctx.strokeStyle = "#1f2a3f";
    ctx.strokeRect(FILM_X + 0.5, SCR_TOP + 0.5, FILM_W - 1, SCR_BOT - SCR_TOP - 1);

    drawHistogram();

    // Scale on the film: ±10 mm ticks
    ctx.fillStyle = "#56647c";
    ctx.textAlign = "right";
    ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
    for (const mm of [-10, -5, 0, 5, 10]) {
      const y = mmToY(mm);
      ctx.fillRect(FILM_X - 5, y, 4, 1);
    }
    ctx.textAlign = "left";
    ctx.fillText("+10 mm", FILM_X + 4, mmToY(10) - 4);
    ctx.fillText("−10 mm", FILM_X + 4, mmToY(-10) + 12);
  }

  function drawHistogram() {
    const n = state.hits.length;
    const binH = (SCR_BOT - SCR_TOP) / BINS;
    const maxExpected = n * Math.max(...state.pdf);
    const scale = Math.max(1, ...state.counts, maxExpected) * 1.08;
    ctx.strokeStyle = "#1f2a3f";
    ctx.beginPath(); ctx.moveTo(HIST_X + 0.5, SCR_TOP); ctx.lineTo(HIST_X + 0.5, SCR_BOT); ctx.stroke();
    ctx.fillStyle = rgba(0.75);
    for (let b = 0; b < BINS; b++) {
      const c = state.counts[b];
      if (!c) continue;
      const y = SCR_BOT - (b + 1) * binH;
      ctx.fillRect(HIST_X + 1, y + 0.4, (c / scale) * HIST_W, binH - 0.8);
    }
    if (state.showTheory && n > 0) {
      ctx.strokeStyle = "#e9eef7";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let b = 0; b < BINS; b++) {
        const y = SCR_BOT - (b + 0.5) * binH;
        const x = HIST_X + 1 + (n * state.pdf[b] / scale) * HIST_W;
        b === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (n === 0) {
      ctx.fillStyle = "#56647c";
      ctx.textAlign = "center";
      ctx.font = "12px 'IBM Plex Sans', system-ui, sans-serif";
      ctx.fillText("Waiting for photons…", HIST_X + HIST_W / 2, CY);
    }
  }

  function drawFlights(dt) {
    const done = [];
    const ys = slitYs();
    for (const f of state.flights) {
      f.t += dt / FLIGHT_MS;
      const hitY = mmToY(f.x);
      const legA = (BAR_X - SRC_X) / (SCR_X - SRC_X); // fraction of time to reach barrier
      if (f.wave) {
        // Undetected: draw the photon as expanding wavefronts, through every open slit.
        const rings = [0, 14, 28];
        for (const off of rings) {
          if (f.t < legA) {
            const r = f.t * (SCR_X - SRC_X) - off;
            if (r <= 0) continue;
            ctx.strokeStyle = rgba(0.55 * (1 - off / 40));
            ctx.beginPath(); ctx.arc(SRC_X, CY, r, -1.1, 1.1); ctx.stroke();
          } else {
            const r = (f.t - legA) * (SCR_X - SRC_X) - off;
            if (r <= 0) continue;
            ctx.save();
            ctx.beginPath(); ctx.rect(BAR_X + 4, 0, SCR_X - BAR_X - 4, H); ctx.clip();
            ctx.strokeStyle = rgba(0.5 * (1 - off / 40));
            for (const y of ys) { ctx.beginPath(); ctx.arc(BAR_X, y, r, -1.3, 1.3); ctx.stroke(); }
            ctx.restore();
          }
        }
      } else {
        // Detected: a particle with a definite path.
        const sy = ys[Math.min(f.slit, ys.length - 1)];
        let px, py;
        if (f.t < legA) {
          const u = f.t / legA;
          px = SRC_X + u * (BAR_X - SRC_X); py = CY + u * (sy - CY);
        } else {
          const u = (f.t - legA) / (1 - legA);
          px = BAR_X + u * (SCR_X - BAR_X); py = sy + u * (hitY - sy);
        }
        ctx.fillStyle = rgba(1);
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
        if (state.detector && f.t >= legA && f.t < legA + 0.12) {
          ctx.fillStyle = "rgba(240,179,90,0.9)";
          ctx.beginPath(); ctx.arc(BAR_X + 22, sy, 5, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (f.t >= 1) done.push(f);
    }
    for (const f of done) {
      land(f.x);
      state.flights.splice(state.flights.indexOf(f), 1);
      // Flash where it landed
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(SCR_X, hitYOf(f), 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  const hitYOf = (f) => mmToY(f.x);

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    if (state.running && state.rate > 0) {
      state.pending += state.rate * dt / 1000;
      let n = Math.min(200, Math.floor(state.pending));
      state.pending -= n;
      const animate = state.rate <= 40;
      while (n-- > 0) fire(animate);
    }
    drawApparatus();
    drawFlights(dt);
    requestAnimationFrame(frame);
  }

  // ---------- Controls ----------
  function updateReadouts() {
    $("lambdaOut").textContent = state.lambda + " nm";
    $("sepOut").textContent = state.d.toFixed(2) + " mm";
    $("widthOut").textContent = state.a.toFixed(3).replace(/0$/, "") + " mm";
    $("rateOut").textContent = state.rate;
    const spacing = state.lambda * 1e-6 * L_MM / state.d;
    $("spacing").textContent = (state.bothOpen && !state.detector) ? spacing.toFixed(2) + " mm" : "no fringes";
    $("detState").textContent = state.detector ? "on" : "off";
    $("detector").disabled = !state.bothOpen;
  }

  function paramsChanged() {
    computePdf();
    clearScreen();
    updateReadouts();
  }

  $("lambda").addEventListener("input", (e) => { state.lambda = +e.target.value; paramsChanged(); });
  $("sep").addEventListener("input", (e) => { state.d = +e.target.value; paramsChanged(); });
  $("width").addEventListener("input", (e) => { state.a = +e.target.value; paramsChanged(); });
  $("detector").addEventListener("change", (e) => { state.detector = e.target.checked; paramsChanged(); });
  $("theory").addEventListener("change", (e) => { state.showTheory = e.target.checked; });
  $("rate").addEventListener("input", (e) => {
    state.rate = Math.max(1, Math.round(Math.pow(400, e.target.value / 100)));
    updateReadouts();
  });
  $("play").addEventListener("click", () => {
    state.running = !state.running;
    $("play").textContent = state.running ? "Pause" : "Resume";
  });
  $("one").addEventListener("click", () => fire(true));
  $("clear").addEventListener("click", clearScreen);
  function setSlits(both) {
    state.bothOpen = both;
    if (!both) { state.detector = false; $("detector").checked = false; }
    $("slitsBoth").setAttribute("aria-pressed", String(both));
    $("slitsTop").setAttribute("aria-pressed", String(!both));
    paramsChanged();
  }
  $("slitsBoth").addEventListener("click", () => setSlits(true));
  $("slitsTop").addEventListener("click", () => setSlits(false));

  // Start with a pattern already forming so the first view isn't empty.
  state.rate = Math.max(1, Math.round(Math.pow(400, $("rate").value / 100)));
  computePdf();
  updateReadouts();
  for (let i = 0; i < 250; i++) land(samplePosition());
  requestAnimationFrame(frame);
})();
