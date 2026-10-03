(function () {
  const canvas = document.getElementById("bench");
  const $ = (id) => document.getElementById(id);
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  let W = 960, H = 460, narrow = false, ctx;

  // Layout. People always move in a 500 x 432 arena at (AX, AY). On a wide bench
  // it is drawn 1:1 with the chart and gauge beside it. On a narrow bench (phones)
  // the logical width matches the displayed CSS width, the arena is drawn scaled
  // by AS at (AOX, AOY), and the chart and gauge stack underneath.
  const AX = 14, AY = 14, AW = 500, AH = 432;     // arena (world coordinates)
  let AS = 1, AOX = AX, AOY = AY;
  let CX = 572, CW = 372, CY = 34, CH = 250;      // chart
  let GX = 572, GWID = 372, GY = 372;             // herd-immunity gauge
  const fpx = (n) => (narrow ? Math.max(11, n) : n) + "px ";
  function layout() {
    const cw = Math.round(canvas.clientWidth || canvas.parentElement.clientWidth || 960);
    narrow = cw < 640;
    if (!narrow) {
      W = 960; H = 460; AS = 1; AOX = AX; AOY = AY;
      CX = 572; CW = 372; CY = 34; CH = 250;
      GX = 572; GWID = 372; GY = 372;
    } else {
      W = Math.max(280, cw);
      AOX = 8; AOY = 8; AS = (W - 16) / AW;
      CX = 42; CW = W - CX - 16; CY = Math.round(AOY + AH * AS + 38); CH = 160;
      GX = 10; GWID = W - 20; GY = CY + CH + 136;
      H = GY + 84;
    }
    ctx = Lab.setupCanvas(canvas, W, H);
  }
  layout();

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
    lastDaySaid = -1;
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
        if (a.s === I && b.s === S && Math.random() < pI) { b.s = I; b.newly = true; state.everInfected++; infected(b); }
        else if (b.s === I && a.s === S && Math.random() < pI) { a.s = I; a.newly = true; state.everInfected++; infected(a); }
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
      narrateDay();
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
    ctx.save();
    if (narrow) {
      ctx.translate(AOX - AX * AS, AOY - AY * AS); ctx.scale(AS, AS);
      ctx.beginPath(); ctx.rect(AX, AY, AW, AH); ctx.clip();
    }
    const dot = narrow ? 1.4 : 1;   // dots drawn a little larger when the arena is shrunk
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
      if (p.still) ctx.fillRect(p.x - 3 * dot, p.y - 3 * dot, 6 * dot, 6 * dot);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, 3.2 * dot, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    ctx.font = "11px " + MONO;
    ctx.textAlign = "left";
    const label = "DAY " + Math.floor(state.tick / TICKS_PER_DAY) + (state.over ? " · OUTBREAK OVER" : "");
    const tw = ctx.measureText(label).width;
    const m = narrow ? 6 : 8;
    ctx.fillStyle = "rgba(5,8,14,0.8)";
    ctx.fillRect(AOX + m, AOY + m, tw + 14, 20);
    ctx.fillStyle = state.over ? "#4cc48d" : "#c9d4e3";
    ctx.fillText(label, AOX + m + 7, AOY + m + 14);
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
    ctx.font = fpx(10) + MONO;
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.beginPath(); ctx.moveTo(CX, Y(f) + 0.5); ctx.lineTo(CX + CW, Y(f) + 0.5); ctx.stroke();
      ctx.textAlign = "right"; ctx.fillText(Math.round(f * 100) + "%", CX - 6, Y(f) + 3);
    }
    ctx.textAlign = "center";
    let tickStep = span > 200 ? 50 : span > 100 ? 25 : 10;
    if (narrow && CW / (span / tickStep) < 34) tickStep *= 2;
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

    // Legend (two per row on a narrow bench)
    let ly = CY + CH + 46;
    ctx.font = "11px " + MONO;
    ctx.textAlign = "left";
    const lx0 = narrow ? GX : CX;
    let lx = lx0;
    [["susceptible", COL[S]], ["infected", COL[I]], ["recovered", COL[R]], ["vaccinated", COL[V]]].forEach(([t, col], i) => {
      if (narrow && i === 2) { lx = lx0; ly += 18; }
      ctx.fillStyle = col; ctx.fillRect(lx, ly - 5, 12, 3);
      ctx.fillStyle = "#97a6b9"; ctx.fillText(t, lx + 16, ly);
      lx += narrow ? Math.max(GWID / 2, 16 + ctx.measureText(t).width + 14) : 16 + ctx.measureText(t).width + 14;
    });
    if (state.ode) {
      ctx.fillStyle = "#56647c";
      if (narrow) wrapText("solid: the dots · dashed: SIR equations, no distancing", lx0, ly + 18, GWID, 15);
      else ctx.fillText("solid: the dots · dashed: SIR equations, no distancing", CX, ly + 18);
    }
  }

  function drawGauge() {
    const herd = Math.max(0, 1 - 1 / state.r0);
    const vFrac = state.vax / 100;
    const y = GY + 16, h = 14;
    ctx.font = "11px " + MONO;
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "left";
    if (narrow) fitText("VACCINATED VS HERD-IMMUNITY THRESHOLD", GX, GY, GWID);
    else ctx.fillText("VACCINATED VS HERD-IMMUNITY THRESHOLD", GX, GY);
    ctx.fillStyle = "#121a26";
    ctx.fillRect(GX, y, GWID, h);
    ctx.fillStyle = COL[V];
    ctx.fillRect(GX, y, GWID * vFrac, h);
    const mx = GX + GWID * herd;
    ctx.fillStyle = "#f0b35a";
    ctx.fillRect(mx - 1, y - 5, 2, h + 10);
    ctx.font = fpx(10) + MONO;
    const hl = "1 − 1/R0 = " + Math.round(herd * 100) + "%";
    ctx.textAlign = mx > GX + GWID - (narrow ? ctx.measureText(hl).width + 8 : 90) ? "right" : "left";
    ctx.fillText("1 − 1/R0 = " + Math.round(herd * 100) + "%", mx + (ctx.textAlign === "right" ? -5 : 5), y + h + 14);
    ctx.textAlign = "left";
    const above = vFrac > herd;
    ctx.fillStyle = above ? "#4cc48d" : "#ff8a7a";
    ctx.font = "12px 'IBM Plex Sans', system-ui, sans-serif";
    const msg = above ? "Above the threshold: outbreaks should die out." : "Below the threshold: an outbreak can take off.";
    if (narrow) wrapText(msg, GX, y + h + 34, GWID, 16);
    else ctx.fillText(msg, GX, y + h + 34);
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
  // Wrap by words; translate the whole sentence first. Chinese wraps per character.
  function wrapText(text, x, y, maxW, lh) {
    if (window.I18N) text = window.I18N.t(text);
    const cjk = /[\u3000-\u9fff]/.test(text);
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
  // ---------- Accessibility and challenges ----------
  const W_ = window.WONDERS;
  let live = false;
  function infected(p) {
    if (live) W_.sound("tick", { pitch: 0.3 + 0.5 * (1 - (p.y - AY) / AH), pan: ((p.x - AX) / AW) * 2 - 1 });
  }
  function checkEnd(c) {
    if (!live) return;
    const herd = 1 - 1 / state.r0;
    const cases = state.everInfected - Math.min(SEEDS, N - Math.round(N * state.vax / 100));
    if (state.vax / 100 > herd && cases < 20) W_.challenge("herd");
    if (state.vax === 0 && state.r0 >= 3 && state.peak < 60 && cases >= 20) W_.challenge("flatten");
    if (state.r0 >= 15 && cases < 10) W_.challenge("measles");
  }
  let lastDaySaid = -1;
  function narrateDay() {
    const day = Math.floor(state.tick / TICKS_PER_DAY);
    if (!live || state.over || day % 10 !== 0 || day === lastDaySaid) return;
    lastDaySaid = day;
    const c = counts();
    W_.describe("Day " + day + ": " + c[I] + " infected, " + c[S] + " susceptible, " + c[R] + " recovered.");
  }
  W_.describer(() => {
    const t = (x) => (window.I18N ? I18N.t(x) : x);
    const c = counts();
    const day = Math.floor(state.tick / TICKS_PER_DAY);
    const herd = Math.round(Math.max(0, 1 - 1 / state.r0) * 100);
    return [
      "A crowd of " + N + " people. R0 is " + state.r0.toFixed(1) + ", " + state.vax + "% are vaccinated and " + state.distance + "% stay put.",
      "Day " + day + ": " + c[S] + " susceptible, " + c[I] + " infected, " + c[R] + " recovered and " + c[V] + " vaccinated. The peak so far is " + Math.max(state.peak, c[I]) + " infected at once.",
      state.over ? "The outbreak is over; " + state.everInfected + " people caught it." : "The outbreak is still going.",
      state.vax > herd ? "Vaccination is above the herd-immunity threshold of " + herd + "%." : "Vaccination is below the herd-immunity threshold of " + herd + "%.",
    ].map(t).join(" ");
  });

  function announceEnd(c) {
    if (live) {
      W_.sound("event", { pitch: 0.7 });
      W_.describe("The outbreak ended on day " + Math.floor(state.tick / TICKS_PER_DAY) + ". " + state.everInfected + " people caught it and the peak was " + state.peak + " infected at once.", { now: true });
    }
    checkEnd(c);
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
  live = true;
  draw();
  updateReadouts();
  requestAnimationFrame(frame);
})();
