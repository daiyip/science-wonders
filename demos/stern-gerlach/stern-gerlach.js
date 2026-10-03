(function () {
  const $ = (id) => document.getElementById(id);
  const W = 960, H = 420;
  const ctx = Lab.setupCanvas($("bench"), W, H);
  const DEG = Math.PI / 180;

  const CY = 215, MH = 42;           // beam axis, magnet half-length
  const OVEN_X = 42, SCR_X = 868, SCR_W = 22;
  const SPEED = 380;                  // px per second for animated atoms

  const COL = {
    bg: "#05080e", label: "#7f8ea6", dim: "#56647c", rule: "#1f2a3f", metal: "#3a4760",
    atom: "#d9dee8", up: "#8fa6ff", down: "#f0b35a", block: "#c4574a", white: "#e9eef7",
  };

  const state = {
    n: 3, angles: [0, 90, 0], keepUp: [true, true, true],
    rate: 11, running: true, pending: 0, classical: false,
    sent: 0, blocked: [0, 0, 0], finalUp: 0, finalDown: 0,
    flights: [], dots: [], flashBlock: [0, 0, 0], flashScreen: [0, 0],
  };

  // ---------- Geometry ----------
  let layout;
  function computeLayout() {
    const n = state.n;
    const S = n === 1 ? 80 : n === 2 ? 60 : 44;
    const stages = [];
    let y = CY;
    for (let i = 0; i < n; i++) {
      const xm = 160 + (i + 0.5) * (630 / n);
      stages.push({ xm, yIn: y, xs: xm - MH });
      if (i < n - 1) y += state.keepUp[i] ? -S : S;
    }
    for (let i = 0; i < n; i++) {
      const st = stages[i];
      st.next = i < n - 1 ? stages[i + 1].xs : SCR_X;
      st.xBlock = st.xm + MH + 30;
    }
    // Centre the whole zig-zag on the bench.
    let lo = Infinity, hi = -Infinity;
    for (const st of stages) { lo = Math.min(lo, st.yIn - S); hi = Math.max(hi, st.yIn + S); }
    const shift = Math.round(CY - (lo + hi) / 2);
    for (const st of stages) st.yIn += shift;
    layout = { S, stages, y0: stages[0].yIn };
  }
  const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  // y of a beam leaving stage i with sign s (−1 up, +1 down) at horizontal position x
  function beamY(i, s, x) {
    const st = layout.stages[i];
    return st.yIn + s * layout.S * smooth((x - st.xs) / (st.next - st.xs));
  }
  const finalY = (up) => {
    const last = layout.stages[state.n - 1];
    return last.yIn + (up ? -1 : 1) * layout.S;
  };

  // ---------- Quantum rules ----------
  // Spin direction α (degrees, in the Z–X plane). Measuring along θ gives up with cos²((θ−α)/2),
  // and leaves the atom pointing along θ (up) or θ+180° (down).
  function incomingAlpha(i) {
    if (i === 0) return null; // unpolarized from the oven
    return state.angles[i - 1] + (state.keepUp[i - 1] ? 0 : 180);
  }
  function pUpAt(i) {
    const a = incomingAlpha(i);
    return a === null ? 0.5 : Math.cos(((state.angles[i] - a) / 2) * DEG) ** 2;
  }

  function runAtom() {
    let alpha = null;
    const results = [];
    for (let i = 0; i < state.n; i++) {
      const p = alpha === null ? 0.5 : Math.cos(((state.angles[i] - alpha) / 2) * DEG) ** 2;
      const up = Math.random() < p;
      alpha = state.angles[i] + (up ? 0 : 180);
      results.push(up);
      if (i < state.n - 1 && up !== state.keepUp[i]) return { results, blockedAt: i };
    }
    return { results, blockedAt: -1 };
  }

  function atomY(fate, x) {
    const st = layout.stages;
    if (x < st[0].xs) return layout.y0;
    for (let i = 0; i < fate.results.length; i++) {
      const end = fate.blockedAt === i ? st[i].xBlock : st[i].next;
      if (x <= end || i === fate.results.length - 1) return beamY(i, fate.results[i] ? -1 : 1, x);
    }
    return CY;
  }
  const endX = (fate) => (fate.blockedAt >= 0 ? layout.stages[fate.blockedAt].xBlock : SCR_X + 4 + Math.random() * (SCR_W - 8));

  function commit(fate, xHit) {
    state.sent++;
    if (fate.blockedAt >= 0) {
      state.blocked[fate.blockedAt]++;
      state.flashBlock[fate.blockedAt] = 1;
    } else {
      const up = fate.results[state.n - 1];
      if (up) state.finalUp++; else state.finalDown++;
      state.flashScreen[up ? 0 : 1] = 1;
      if (state.dots.length < 4000) {
        state.dots.push({ x: xHit, y: finalY(up) + gauss() * 3.2, up });
      }
    }
  }
  function gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function fire(animate) {
    const fate = runAtom();
    const xe = endX(fate);
    if (animate && !Lab.reducedMotion && state.flights.length < 40) {
      state.flights.push({ fate, x: OVEN_X + 24, xe });
    } else {
      commit(fate, xe);
    }
  }

  function clearAll() {
    state.sent = 0; state.blocked = [0, 0, 0]; state.finalUp = 0; state.finalDown = 0;
    state.flights = []; state.dots = [];
    updateStats();
  }

  // ---------- Drawing ----------
  const mono = (px) => { ctx.font = `${px}px 'IBM Plex Mono', ui-monospace, monospace`; };
  function label(text, x, y, align, colour) {
    ctx.fillStyle = colour || COL.label;
    ctx.textAlign = align || "center";
    ctx.fillText(text, x, y);
  }
  function axisName(a) {
    a = ((a % 360) + 360) % 360;
    return { 0: "Z", 90: "X", 180: "−Z", 270: "−X" }[a] || `${a}°`;
  }

  function drawBeams() {
    const st = layout.stages;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(201,212,227,0.22)";
    ctx.beginPath(); ctx.moveTo(OVEN_X + 24, layout.y0); ctx.lineTo(st[0].xs, layout.y0); ctx.stroke();
    for (let i = 0; i < state.n; i++) {
      const last = i === state.n - 1;
      for (const s of [-1, 1]) {
        const kept = last || (s === -1) === state.keepUp[i];
        const end = kept ? st[i].next : st[i].xBlock;
        ctx.strokeStyle = s === -1 ? "rgba(143,166,255,0.32)" : "rgba(240,179,90,0.32)";
        ctx.beginPath();
        for (let x = st[i].xs; x <= end; x += 3) {
          const y = beamY(i, s, x);
          x === st[i].xs ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(end, beamY(i, s, end));
        ctx.stroke();
        if (!kept) {
          const yb = beamY(i, s, st[i].xBlock);
          ctx.fillStyle = state.flashBlock[i] > 0 ? `rgba(240,120,100,${0.5 + 0.5 * state.flashBlock[i]})` : COL.block;
          ctx.fillRect(st[i].xBlock, yb - 9, 5, 18);
          mono(10);
          label(`blocked ${state.blocked[i].toLocaleString()}`, st[i].xBlock + 10, yb + (s === -1 ? -8 : 14), "left", COL.dim);
        }
      }
    }
    ctx.lineWidth = 1;
  }

  function drawMagnet(i) {
    const st = layout.stages[i];
    const x0 = st.xm - MH, x1 = st.xm + MH, y = st.yIn;
    // North pole: knife edge pointing at the beam
    ctx.fillStyle = COL.metal;
    ctx.beginPath();
    ctx.moveTo(x0, y - 36); ctx.lineTo(x1, y - 36); ctx.lineTo(x1, y - 14); ctx.lineTo(st.xm, y - 7); ctx.lineTo(x0, y - 14);
    ctx.closePath(); ctx.fill();
    // South pole: flat with a groove
    ctx.beginPath();
    ctx.moveTo(x0, y + 36); ctx.lineTo(x1, y + 36); ctx.lineTo(x1, y + 10); ctx.lineTo(st.xm + 12, y + 10);
    ctx.lineTo(st.xm + 12, y + 16); ctx.lineTo(st.xm - 12, y + 16); ctx.lineTo(st.xm - 12, y + 10); ctx.lineTo(x0, y + 10);
    ctx.closePath(); ctx.fill();
    mono(10);
    label("N", st.xm, y - 22, "center", "#a9b6cc");
    label("S", st.xm, y + 29, "center", "#a9b6cc");

    // Header row: name, axis and an axis dial (looking along the beam: Z up, X right)
    mono(12);
    label(`MAGNET ${i + 1} · ${axisName(state.angles[i])}`, st.xm, 22);
    const dx = st.xm, dy = 50, r = 14;
    ctx.strokeStyle = COL.metal; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.stroke();
    const a = state.angles[i] * DEG;
    const ux = Math.sin(a), uy = -Math.cos(a);
    ctx.strokeStyle = COL.up; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(dx - ux * (r - 3), dy - uy * (r - 3)); ctx.lineTo(dx + ux * (r - 3), dy + uy * (r - 3)); ctx.stroke();
    ctx.fillStyle = COL.up;
    ctx.beginPath();
    ctx.moveTo(dx + ux * (r + 1), dy + uy * (r + 1));
    ctx.lineTo(dx + ux * (r - 6) - uy * 4, dy + uy * (r - 6) + ux * 4);
    ctx.lineTo(dx + ux * (r - 6) + uy * 4, dy + uy * (r - 6) - ux * 4);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = 1;

    // Odds for the beam entering this magnet
    const p = pUpAt(i);
    mono(10);
    label(`up ${Math.round(p * 100)}%`, st.xm, y + 52, "center", COL.up);
    label(`down ${Math.round((1 - p) * 100)}%`, st.xm, y + 65, "center", COL.down);
  }

  function drawScreen() {
    const top = 70, bot = 370;
    mono(12);
    label("DETECTOR", SCR_X + SCR_W / 2, 22);
    ctx.fillStyle = "#0a0f19";
    ctx.fillRect(SCR_X, top, SCR_W, bot - top);
    ctx.strokeStyle = COL.rule;
    ctx.strokeRect(SCR_X + 0.5, top + 0.5, SCR_W - 1, bot - top - 1);
    if (state.classical && state.n === 1) {
      const y0 = finalY(true), y1 = finalY(false);
      ctx.fillStyle = "rgba(201,212,227,0.12)";
      ctx.fillRect(SCR_X + 2, y0, SCR_W - 4, y1 - y0);
      ctx.strokeStyle = "rgba(201,212,227,0.55)";
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(SCR_X + 1.5, y0, SCR_W - 3, y1 - y0);
      ctx.setLineDash([]);
      mono(10);
      const ym = (y0 + y1) / 2;
      label("classical:", SCR_X - 6, ym - 4, "right", "#aab6c8");
      label("a smear", SCR_X - 6, ym + 9, "right", "#aab6c8");
    }
    for (const d of state.dots) {
      ctx.fillStyle = d.up ? "rgba(143,166,255,0.85)" : "rgba(240,179,90,0.85)";
      ctx.fillRect(d.x - 0.8, d.y - 0.8, 1.6, 1.6);
    }
    mono(11);
    const yu = finalY(true), yd = finalY(false);
    label(`up`, SCR_X + SCR_W + 6, yu - 3, "left", COL.up);
    label(state.finalUp.toLocaleString(), SCR_X + SCR_W + 6, yu + 11, "left", COL.white);
    label(`down`, SCR_X + SCR_W + 6, yd - 3, "left", COL.down);
    label(state.finalDown.toLocaleString(), SCR_X + SCR_W + 6, yd + 11, "left", COL.white);
    for (const [k, y] of [[0, yu], [1, yd]]) {
      if (state.flashScreen[k] > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.7 * state.flashScreen[k]})`;
        ctx.beginPath(); ctx.arc(SCR_X + SCR_W / 2, y, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawOven() {
    const CY = layout.y0;
    const g = ctx.createRadialGradient(OVEN_X, CY, 2, OVEN_X, CY, 30);
    g.addColorStop(0, "rgba(255,150,90,0.55)"); g.addColorStop(1, "rgba(255,150,90,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(OVEN_X, CY, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2a3550";
    ctx.fillRect(OVEN_X - 22, CY - 20, 44, 40);
    ctx.fillStyle = "#ff9a5a";
    ctx.fillRect(OVEN_X + 18, CY - 3, 4, 6);
    mono(12);
    label("OVEN", OVEN_X, 22);
    mono(10);
    label("silver atoms", OVEN_X, CY + 36, "center", COL.dim);
    // Collimating slits
    ctx.fillStyle = COL.metal;
    for (const x of [92, 108]) {
      ctx.fillRect(x, CY - 40, 3, 37);
      ctx.fillRect(x, CY + 3, 3, 37);
    }
  }

  function drawFlights(dt) {
    const done = [];
    for (const f of state.flights) {
      f.x += SPEED * dt / 1000;
      if (f.x >= f.xe) { done.push(f); continue; }
      const y = atomY(f.fate, f.x);
      ctx.fillStyle = COL.atom;
      ctx.beginPath(); ctx.arc(f.x, y, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    if (done.length) {
      for (const f of done) {
        state.flights.splice(state.flights.indexOf(f), 1);
        commit(f.fate, f.xe);
      }
      updateStats();
    }
  }

  function drawLegend() {
    mono(10);
    label("Dials show each magnet's axis looking along the beam: Z up, X right. Up and down beams are drawn up and down on the page.", 20, H - 12, "left", COL.dim);
  }

  function draw(dt) {
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, W, H);
    drawOven();
    drawBeams();
    for (let i = 0; i < state.n; i++) drawMagnet(i);
    drawScreen();
    drawFlights(dt);
    drawLegend();
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    if (state.running && state.rate > 0) {
      state.pending += state.rate * dt / 1000;
      let n = Math.min(300, Math.floor(state.pending));
      state.pending -= n;
      const animate = state.rate <= 40;
      const any = n > 0;
      while (n-- > 0) fire(animate);
      if (any && !animate) updateStats();
    }
    for (let i = 0; i < 3; i++) state.flashBlock[i] = Math.max(0, state.flashBlock[i] - dt / 250);
    state.flashScreen = state.flashScreen.map((v) => Math.max(0, v - dt / 250));
    draw(dt);
    requestAnimationFrame(frame);
  }

  // ---------- Stats and controls ----------
  function updateStats() {
    $("sent").textContent = state.sent.toLocaleString();
    const fin = state.finalUp + state.finalDown;
    $("reached").textContent = state.sent ? `${Math.round(100 * fin / state.sent)}%` : "–";
    $("final").textContent = `${state.finalUp.toLocaleString()} · ${state.finalDown.toLocaleString()}`;
    $("pred").textContent = `${Math.round(pUpAt(state.n - 1) * 1000) / 10}%`;
  }

  function syncControls() {
    for (let i = 0; i < 3; i++) {
      const k = i + 1;
      const active = i < state.n;
      const last = i === state.n - 1;
      $("stage" + k).classList.toggle("is-off", !active);
      $("angle" + k).disabled = !active;
      $("angle" + k).value = state.angles[i];
      $("angle" + k + "Out").textContent = `${axisName(state.angles[i])}${["Z", "X", "−Z", "−X"].includes(axisName(state.angles[i])) ? ` (${state.angles[i]}°)` : ""}`;
      for (const [id, up] of [["keep" + k + "Up", true], ["keep" + k + "Down", false]]) {
        const b = $(id);
        b.disabled = !active || last;
        b.setAttribute("aria-pressed", String(!last && active && state.keepUp[i] === up));
        b.title = last && active ? "The last magnet sends both beams to the detector" : "";
      }
    }
    for (let k = 1; k <= 3; k++) $("n" + k).setAttribute("aria-pressed", String(state.n === k));
    $("classical").disabled = state.n !== 1;
    $("classicalNote").textContent = state.n === 1 ? "A tilted compass needle could land anywhere in the band." : "Shown for a single magnet.";
  }

  function settingsChanged() {
    computeLayout();
    syncControls();
    clearAll();
  }

  for (let k = 1; k <= 3; k++) {
    const i = k - 1;
    $("angle" + k).addEventListener("input", (e) => { state.angles[i] = +e.target.value; settingsChanged(); });
    $("keep" + k + "Up").addEventListener("click", () => { state.keepUp[i] = true; settingsChanged(); });
    $("keep" + k + "Down").addEventListener("click", () => { state.keepUp[i] = false; settingsChanged(); });
    $("n" + k).addEventListener("click", () => { state.n = k; settingsChanged(); });
  }
  function preset(n, angles) {
    state.n = n;
    state.angles = angles.concat([0, 0, 0]).slice(0, 3);
    state.keepUp = [true, true, true];
    settingsChanged();
  }
  $("presetZ").addEventListener("click", () => preset(1, [0]));
  $("presetZZ").addEventListener("click", () => preset(2, [0, 0]));
  $("presetZX").addEventListener("click", () => preset(2, [0, 90]));
  $("presetZXZ").addEventListener("click", () => preset(3, [0, 90, 0]));
  $("presetZ60").addEventListener("click", () => preset(2, [0, 60]));
  $("classical").addEventListener("change", (e) => { state.classical = e.target.checked; });
  $("rate").addEventListener("input", (e) => {
    state.rate = Math.max(1, Math.round(Math.pow(200, e.target.value / 100)));
    $("rateOut").textContent = state.rate;
  });
  $("play").addEventListener("click", () => {
    state.running = !state.running;
    $("play").textContent = state.running ? "Pause" : "Resume";
  });
  $("burst").addEventListener("click", () => { for (let i = 0; i < 1000; i++) fire(false); updateStats(); });
  $("clear").addEventListener("click", clearAll);

  // Start on the famous Z, X, Z chain with results already on the detector.
  state.rate = Math.max(1, Math.round(Math.pow(200, $("rate").value / 100)));
  $("rateOut").textContent = state.rate;
  computeLayout();
  syncControls();
  for (let i = 0; i < 1600; i++) fire(false);
  updateStats();
  requestAnimationFrame(frame);
})();
