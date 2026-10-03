(function () {
  const W = 960, H = 460;
  const canvas = document.getElementById("bench");
  const ctx = Lab.setupCanvas(canvas, W, H);
  const $ = (id) => document.getElementById(id);
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";

  // Layout
  const AX = 14, AY = 14, AW = 500, AH = 432;     // arena
  const CX = 572, CW = 372, CY = 34, CH = 250;    // chart
  const GY = 372;                                  // herd-immunity gauge

  // Model
  const N = 400;
  const CONTACT = 8;            // people closer than this are "meeting"
  const WALK = 2.0;             // px per tick for people who move
  const TICKS_PER_DAY = 24;
  const RECOVER_DAYS = 10;
  const D = RECOVER_DAYS * TICKS_PER_DAY;          // mean infectious period in ticks
  const SEEDS = 5;
  const S = 0, I = 1, R = 2, V = 3;
  const COL = ["#6fa8ff", "#ff5d4d", "#7d889b", "#4cc48d"];

  const state = {
    r0: 3, vax: 0, distance: 0, speed: 2, ode: true, running: true,
    people: [], tick: 0, peak: 0, over: false, everInfected: 0,
    hist: [], odeSeries: [], pInfect: 0, encounterRate: 0,
  };
  // When each pair last touched; a "meeting" is a pair coming into contact.
  const lastTouch = new Int32Array(N * N).fill(-10);

  // ---------- People ----------
  function spawn(p) {
    const a = Math.random() * Math.PI * 2;
    p.x = AX + 4 + Math.random() * (AW - 8);
    p.y = AY + 4 + Math.random() * (AH - 8);
    p.vx = Math.cos(a) * WALK; p.vy = Math.sin(a) * WALK;
  }
  function move(p) {
    if (p.still) return;
    p.x += p.vx; p.y += p.vy;
    if (p.x < AX + 3) { p.x = AX + 3; p.vx = -p.vx; }
    if (p.x > AX + AW - 3) { p.x = AX + AW - 3; p.vx = -p.vx; }
    if (p.y < AY + 3) { p.y = AY + 3; p.vy = -p.vy; }
    if (p.y > AY + AH - 3) { p.y = AY + AH - 3; p.vy = -p.vy; }
  }

  // Calibrate once: how many new meetings does a person have per tick when everyone moves?
  function calibrate() {
    const ps = [];
    for (let i = 0; i < N; i++) { const p = { still: false }; spawn(p); ps.push(p); }
    const T = 500;
    let meetings = 0;
    for (let t = 0; t < T; t++) {
      for (const p of ps) move(p);
      for (let i = 0; i < N; i++) {
        const a = ps[i];
        for (let j = i + 1; j < N; j++) {
          const b = ps[j];
          const dx = a.x - b.x;
          if (dx > CONTACT || dx < -CONTACT) continue;
          const dy = a.y - b.y;
          if (dy > CONTACT || dy < -CONTACT || dx * dx + dy * dy > CONTACT * CONTACT) continue;
          const k = i * N + j;
          if (lastTouch[k] !== t - 1 && t > 0) meetings++;
          lastTouch[k] = t;
        }
      }
    }
    lastTouch.fill(-10);
    state.encounterRate = 2 * meetings / (N * (T - 1));
  }
  function updateInfectChance() {
    // R0 = (chance per meeting) × (meetings per tick) × (ticks infectious)
    state.pInfect = Math.min(1, state.r0 / (state.encounterRate * D));
  }

  function newOutbreak() {
    state.people = [];
    const order = [...Array(N).keys()].sort(() => Math.random() - 0.5);
    const nV = Math.round(N * state.vax / 100);
    const stillSet = new Set([...Array(N).keys()].sort(() => Math.random() - 0.5).slice(0, Math.round(N * state.distance / 100)));
    for (let i = 0; i < N; i++) {
      const p = { s: S, still: stillSet.has(i) };
      spawn(p);
      state.people.push(p);
    }
    for (let k = 0; k < nV; k++) state.people[order[k]].s = V;
    let seeded = 0;
    for (let k = nV; k < N && seeded < SEEDS; k++) { state.people[order[k]].s = I; seeded++; }
    state.tick = 0; state.over = false; state.everInfected = seeded; state.peak = seeded;
    lastTouch.fill(-10);
    state.hist = [counts()];
    updateInfectChance();
    solveODE();
  }

  function counts() {
    const c = [0, 0, 0, 0];
    for (const p of state.people) c[p.s]++;
    return c;
  }

  function step() {
    const P = state.people, t = state.tick;
    for (const p of P) move(p);
    const pI = state.pInfect;
    for (let i = 0; i < N; i++) {
      const a = P[i];
      for (let j = i + 1; j < N; j++) {
        const b = P[j];
        const dx = a.x - b.x;
        if (dx > CONTACT || dx < -CONTACT) continue;
        const dy = a.y - b.y;
        if (dy > CONTACT || dy < -CONTACT || dx * dx + dy * dy > CONTACT * CONTACT) continue;
        const k = i * N + j;
        const fresh = lastTouch[k] !== t - 1;
        lastTouch[k] = t;
        if (!fresh) continue;
        if (a.s === I && b.s === S && Math.random() < pI) { b.s = I; b.newly = true; state.everInfected++; }
        else if (b.s === I && a.s === S && Math.random() < pI) { a.s = I; a.newly = true; state.everInfected++; }
      }
    }
    // Recovery: each tick an infected person recovers with chance 1/D (average 10 days).
    for (const p of P) {
      if (p.newly) { p.newly = false; continue; }
      if (p.s === I && Math.random() < 1 / D) p.s = R;
    }
    state.tick++;
    if (state.tick % TICKS_PER_DAY === 0) {
      const c = counts();
      state.hist.push(c);
      state.peak = Math.max(state.peak, c[I]);
      if (c[I] === 0 && !state.over) { state.over = true; announceEnd(c); }
    }
  }

  // ---------- SIR equations (Kermack and McKendrick 1927) ----------
  function solveODE() {
    const gamma = 1 / RECOVER_DAYS, beta = state.r0 * gamma;
    const nV = Math.round(N * state.vax / 100);
    let s = N - nV - Math.min(SEEDS, N - nV), i = Math.min(SEEDS, N - nV), r = 0;
    const out = [[s, i, r]];
    const dt = 0.05;
    for (let day = 1; day <= 400; day++) {
      for (let k = 0; k < 1 / dt; k++) {
        const inf = beta * s * i / N * dt, rec = gamma * i * dt;
        s -= inf; i += inf - rec; r += rec;
      }
      out.push([s, i, r]);
      if (i < 0.05 && day > 20) break;
    }
    state.odeSeries = out;
  }

  // ---------- Drawing ----------
  function drawArena() {
    ctx.fillStyle = "#070b13";
    ctx.fillRect(AX, AY, AW, AH);
    ctx.strokeStyle = "#26324a";
    ctx.strokeRect(AX + 0.5, AY + 0.5, AW - 1, AH - 1);
    for (const p of state.people) {
      if (p.s === I) {
        ctx.fillStyle = "rgba(255,93,77,0.18)";
        ctx.beginPath(); ctx.arc(p.x, p.y, CONTACT, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const p of state.people) {
      ctx.fillStyle = COL[p.s];
      if (p.still) ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.font = "11px " + MONO;
    ctx.textAlign = "left";
    const label = "DAY " + Math.floor(state.tick / TICKS_PER_DAY) + (state.over ? " · OUTBREAK OVER" : "");
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(5,8,14,0.8)";
    ctx.fillRect(AX + 8, AY + 8, tw + 14, 20);
    ctx.fillStyle = state.over ? "#4cc48d" : "#c9d4e3";
    ctx.fillText(label, AX + 15, AY + 22);
  }

  function drawChart() {
    ctx.font = "11px " + MONO;
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "left";
    ctx.fillText("SHARE OF PEOPLE, BY DAY", CX, CY - 14);
    const days = state.hist.length - 1;
    const odeDays = state.ode ? state.odeSeries.length - 1 : 0;
    const span = Math.max(60, Math.ceil(Math.max(days, odeDays) / 20) * 20 + 10);
    const X = (d) => CX + d / span * CW;
    const Y = (f) => CY + CH - f * CH;
    // Grid
    ctx.strokeStyle = "#1a2436";
    ctx.fillStyle = "#56647c";
    ctx.font = "10px " + MONO;
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.beginPath(); ctx.moveTo(CX, Y(f) + 0.5); ctx.lineTo(CX + CW, Y(f) + 0.5); ctx.stroke();
      ctx.textAlign = "right"; ctx.fillText(Math.round(f * 100) + "%", CX - 6, Y(f) + 3);
    }
    ctx.textAlign = "center";
    const tickStep = span > 200 ? 50 : span > 100 ? 25 : 10;
    for (let d = 0; d <= span; d += tickStep) ctx.fillText(String(d), X(d), CY + CH + 14);
    ctx.textAlign = "right";
    ctx.fillText("day", CX + CW, CY + CH + 28);

    // 1/R0 line: infections peak when the susceptible share crosses it
    const thr = 1 / state.r0;
    ctx.strokeStyle = "#f0b35a";
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(CX, Y(thr) + 0.5); ctx.lineTo(CX + CW, Y(thr) + 0.5); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#f0b35a";
    ctx.textAlign = "right";
    ctx.fillText("1/R0 = " + Math.round(thr * 100) + "%", CX + CW, Y(thr) - 4);

    // Vaccinated: flat band
    const vFrac = Math.round(N * state.vax / 100) / N;
    if (vFrac > 0) {
      ctx.fillStyle = "rgba(76,196,141,0.14)";
      ctx.fillRect(CX, Y(vFrac), CW, vFrac * CH);
    }
    // ODE (dashed)
    if (state.ode) {
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.3;
      for (const k of [0, 1, 2]) {
        ctx.strokeStyle = COL[k] + "b0";
        ctx.beginPath();
        state.odeSeries.forEach((v, d) => { d ? ctx.lineTo(X(d), Y(v[k] / N)) : ctx.moveTo(X(d), Y(v[k] / N)); });
        // After the equations settle, hold the final value to the right edge
        const lastV = state.odeSeries[state.odeSeries.length - 1];
        ctx.lineTo(CX + CW, Y(lastV[k] / N));
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    // Agents (solid)
    ctx.lineWidth = 2;
    for (const k of [0, 2, 1]) {
      ctx.strokeStyle = COL[k];
      ctx.beginPath();
      state.hist.forEach((c, d) => { d ? ctx.lineTo(X(d), Y(c[k] / N)) : ctx.moveTo(X(d), Y(c[k] / N)); });
      // live point for the current partial day
      const c = counts();
      ctx.lineTo(X(state.tick / TICKS_PER_DAY), Y(c[k] / N));
      ctx.stroke();
    }
    ctx.lineWidth = 1;

    // Legend
    const ly = CY + CH + 46;
    ctx.font = "11px " + MONO;
    ctx.textAlign = "left";
    let lx = CX;
    for (const [t, col] of [["susceptible", COL[S]], ["infected", COL[I]], ["recovered", COL[R]], ["vaccinated", COL[V]]]) {
      ctx.fillStyle = col; ctx.fillRect(lx, ly - 5, 12, 3);
      ctx.fillStyle = "#97a6b9"; ctx.fillText(t, lx + 16, ly);
      lx += 16 + ctx.measureText(t).width + 14;
    }
    if (state.ode) {
      ctx.fillStyle = "#56647c";
      ctx.fillText("solid: the dots · dashed: SIR equations, no distancing", CX, ly + 18);
    }
  }

  function drawGauge() {
    const herd = Math.max(0, 1 - 1 / state.r0);
    const vFrac = state.vax / 100;
    const y = GY + 16, h = 14;
    ctx.font = "11px " + MONO;
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "left";
    ctx.fillText("VACCINATED VS HERD-IMMUNITY THRESHOLD", CX, GY);
    ctx.fillStyle = "#121a26";
    ctx.fillRect(CX, y, CW, h);
    ctx.fillStyle = COL[V];
    ctx.fillRect(CX, y, CW * vFrac, h);
    const mx = CX + CW * herd;
    ctx.fillStyle = "#f0b35a";
    ctx.fillRect(mx - 1, y - 5, 2, h + 10);
    ctx.font = "10px " + MONO;
    ctx.textAlign = mx > CX + CW - 90 ? "right" : "left";
    ctx.fillText("1 − 1/R0 = " + Math.round(herd * 100) + "%", mx + (ctx.textAlign === "right" ? -5 : 5), y + h + 14);
    ctx.textAlign = "left";
    const above = vFrac > herd;
    ctx.fillStyle = above ? "#4cc48d" : "#ff8a7a";
    ctx.font = "12px 'IBM Plex Sans', system-ui, sans-serif";
    ctx.fillText(above ? "Above the threshold: outbreaks should die out."
                       : "Below the threshold: an outbreak can take off.", CX, y + h + 34);
  }

  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    drawArena();
    drawChart();
    drawGauge();
  }

  function updateReadouts() {
    const c = counts();
    $("day").textContent = Math.floor(state.tick / TICKS_PER_DAY);
    $("nS").textContent = c[S];
    $("nI").textContent = c[I];
    $("nR").textContent = c[R];
    $("nV").textContent = c[V];
    $("peak").textContent = Math.max(state.peak, c[I]);
    $("herd").textContent = Math.round(Math.max(0, 1 - 1 / state.r0) * 100) + "%";
  }

  function hint(t) { $("hint").textContent = t; }
  function announceEnd(c) {
    const unvax = N - c[V];
    const share = unvax ? Math.round(100 * state.everInfected / unvax) : 0;
    const day = Math.floor(state.tick / TICKS_PER_DAY);
    hint(state.everInfected <= SEEDS * 4
      ? `The outbreak fizzled on day ${day} after only ${state.everInfected} cases. ${c[S]} people were never infected.`
      : `The outbreak ended on day ${day}. ${state.everInfected} people caught it, ${share}% of those not vaccinated. Note that ${c[S]} were never infected: it burned out because cases ran out of susceptible people to meet, not because everyone had it.`);
  }

  // ---------- Loop ----------
  let frameNo = 0;
  function frame() {
    if (state.running) {
      for (let i = 0; i < state.speed; i++) {
        if (state.over) { for (const p of state.people) move(p); break; }
        step();
      }
    }
    draw();
    if (++frameNo % 4 === 0 || !state.running) updateReadouts();
    requestAnimationFrame(frame);
  }

  // ---------- Controls ----------
  function syncOutputs() {
    $("r0Out").textContent = state.r0.toFixed(1);
    $("vaxOut").textContent = state.vax + "%";
    $("distanceOut").textContent = state.distance + "%";
    $("speedOut").textContent = state.speed + "×";
  }
  function restart(msg) {
    newOutbreak();
    if (msg) hint(msg);
    else {
      const herd = 1 - 1 / state.r0;
      hint(state.vax / 100 > herd
        ? `With ${state.vax}% vaccinated, above the ${Math.round(herd * 100)}% threshold, each case should infect fewer than one other on average.`
        : `With ${state.vax}% vaccinated, below the ${Math.round(herd * 100)}% threshold for R0 ${state.r0.toFixed(1)}, the outbreak can spread.`);
    }
    if (Lab.reducedMotion && !state.running) {
      for (let i = 0; i < TICKS_PER_DAY * 400 && !state.over; i++) step();
    }
    syncOutputs(); draw(); updateReadouts();
  }
  $("r0").addEventListener("input", (e) => { state.r0 = +e.target.value; restart(); });
  $("vax").addEventListener("input", (e) => { state.vax = +e.target.value; restart(); });
  $("distance").addEventListener("input", (e) => {
    state.distance = +e.target.value;
    restart(state.distance ? `${state.distance}% of people now stay put (drawn as squares). They can still be infected by someone passing, but they meet far fewer people.` : null);
  });
  $("speed").addEventListener("input", (e) => { state.speed = +e.target.value; syncOutputs(); });
  $("ode").addEventListener("change", (e) => { state.ode = e.target.checked; if (!state.running) draw(); });
  function setRunning(on) { state.running = on; $("play").textContent = on ? "Pause" : "Play"; }
  $("play").addEventListener("click", () => setRunning(!state.running));
  $("restart").addEventListener("click", () => restart());
  function preset(r0, msg) {
    state.r0 = r0; $("r0").value = r0;
    restart(msg);
  }
  $("presetFlu").addEventListener("click", () => preset(1.3, "Seasonal flu spreads slowly, with an R0 around 1.3. The threshold is only 23%, but with R0 this close to 1 chance matters: run it a few times and some outbreaks die out early."));
  $("presetCovid").addEventListener("click", () => preset(2.5, "The original COVID-19 virus had an R0 of roughly 2.5 to 3 before any measures. The threshold is 60%. Later variants spread faster and pushed it higher."));
  $("presetMeasles").addEventListener("click", () => preset(15, "Measles: R0 about 12 to 18. The threshold here is 93%. Try 90% vaccinated, then 95%."));

  // ---------- Start ----------
  calibrate();
  syncOutputs();
  newOutbreak();
  for (let i = 0; i < TICKS_PER_DAY * 14; i++) step();
  if (Lab.reducedMotion) {
    for (let i = 0; i < TICKS_PER_DAY * 400 && !state.over; i++) step();
    setRunning(false);
    hint("Animation is paused because your system asks for reduced motion, so this shows a finished outbreak. Change a setting to see a new one, or press Play.");
  } else {
    setRunning(true);
  }
  draw();
  updateReadouts();
  requestAnimationFrame(frame);
})();
