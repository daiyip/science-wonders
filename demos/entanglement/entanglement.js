(function () {
  const $ = (id) => document.getElementById(id);
  const DEG = Math.PI / 180;

  // ---------- The two universes ----------
  // Each returns [aliceAgree?, ...] as booleans: true = photon passed the polarizer.
  const models = {
    // Quantum mechanics for (|HH> + |VV>)/sqrt2: Alice is 50/50, Bob matches with cos²(a-b).
    quantum(a, b) {
      const A = Math.random() < 0.5;
      const same = Math.random() < Math.cos((a - b) * DEG) ** 2;
      return [A, same ? A : !A];
    },
    // Local hidden variables: the pair shares a secret angle λ. Each photon passes
    // if its polarizer is within 45° of λ. This is the best such plan: it is perfect
    // at 0° and 90° and linear in between.
    classical(a, b) {
      const lam = Math.random() * 180;
      const pass = (t) => Math.cos((t - lam) * DEG) ** 2 > 0.5;
      return [pass(a), pass(b)];
    },
  };
  const qAgree = (d) => Math.cos(d * DEG) ** 2;
  const cAgree = (d) => { const x = foldDiff(d); return 1 - x / 90; };
  function foldDiff(d) { d = Math.abs(d) % 180; return d > 90 ? 180 - d : d; }

  const state = {
    a: 0, b: 30, model: "quantum", running: true, rate: 4, pending: 0,
    tapeA: [], tapeB: [],
    flights: [],
    // Measured data per model, binned by folded angle difference in 2.5° steps.
    data: { quantum: makeBins(), classical: makeBins() },
    lampA: 0, lampB: 0, lastA: null, lastB: null,
  };
  function makeBins() { return Array.from({ length: 37 }, () => ({ n: 0, same: 0 })); }
  const binOf = (a, b) => Math.round(foldDiff(a - b) / 2.5);

  // ---------- Apparatus ----------
  const W = 960, H = 330;
  const ctx = Lab.setupCanvas($("bench"), W, H);
  const CX = W / 2, CY = 120, AX = 170, BX = 790, DET_OFF = 78;
  const FLIGHT_MS = 900;

  function record(A, B, animate) {
    if (animate && !Lab.reducedMotion && state.flights.length < 6) {
      state.flights.push({ t: 0, A, B, a: state.a, b: state.b, model: state.model });
    } else {
      commit(A, B, state.a, state.b, state.model);
    }
  }
  function commit(A, B, a, b, model) {
    const bin = state.data[model][binOf(a, b)];
    bin.n++; if (A === B) bin.same++;
    state.tapeA.push(A); state.tapeB.push(B);
    if (state.tapeA.length > 40) { state.tapeA.shift(); state.tapeB.shift(); }
    state.lastA = A; state.lastB = B; state.lampA = 1; state.lampB = 1;
    dirtyStats = true;
  }
  function sendPair(animate) {
    const [A, B] = models[state.model](state.a, state.b);
    record(A, B, animate);
  }

  function drawPolarizer(x, angle, label, sub) {
    ctx.save();
    ctx.translate(x, CY);
    ctx.strokeStyle = "#3a4760"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#0b1220";
    ctx.beginPath(); ctx.arc(0, 0, 37, 0, Math.PI * 2); ctx.fill();
    // Grating lines parallel to the transmission axis
    ctx.rotate(-angle * DEG);
    ctx.strokeStyle = "rgba(143,166,255,0.25)"; ctx.lineWidth = 1;
    for (let k = -30; k <= 30; k += 7.5) {
      const h = Math.sqrt(37 * 37 - k * k);
      ctx.beginPath(); ctx.moveTo(-h, k); ctx.lineTo(h, k); ctx.stroke();
    }
    ctx.strokeStyle = "#8fa6ff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#c9d4e3"; ctx.textAlign = "center";
    ctx.font = "600 15px 'IBM Plex Sans', system-ui, sans-serif";
    ctx.fillText(label, x, 30);
    ctx.font = "12px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillStyle = "#7f8ea6";
    ctx.fillText(sub, x, 48);
  }

  function drawLamp(x, lit, passed) {
    const on = passed === true;
    const glow = lit * (on ? 1 : 0.5);
    const col = on ? [76, 196, 141] : [240, 138, 93];
    if (passed !== null) {
      const g = ctx.createRadialGradient(x, CY, 0, x, CY, 30);
      g.addColorStop(0, `rgba(${col},${0.25 + 0.6 * glow})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, CY, 30, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = passed === null ? "#26324a" : `rgb(${col})`;
    ctx.beginPath(); ctx.arc(x, CY, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7f8ea6"; ctx.font = "11px 'IBM Plex Mono', ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText(passed === null ? "—" : on ? "PASS" : "BLOCK", x, CY + 30);
  }

  function drawTapes() {
    const n = state.tapeA.length;
    const cell = 18, gap = 4, cols = 40;
    const total = cols * (cell + gap) - gap;
    const x0 = (W - total) / 2;
    const rows = [{ y: 222, tape: state.tapeA, name: "ALICE" }, { y: 274, tape: state.tapeB, name: "BOB" }];
    ctx.font = "11px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "left"; ctx.fillStyle = "#7f8ea6";
    ctx.fillText("LAST 40 PAIRS  ·  filled = pass, hollow = blocked, gold link = results agree", x0, 206);
    for (let i = 0; i < n; i++) {
      const x = x0 + (cols - n + i) * (cell + gap);
      const same = state.tapeA[i] === state.tapeB[i];
      if (same) {
        ctx.fillStyle = "rgba(240,179,90,0.55)";
        ctx.fillRect(x + cell / 2 - 1, 222 + cell, 2, 274 - 222 - cell);
      }
      for (const r of rows) {
        const passed = r.tape[i];
        ctx.strokeStyle = passed ? "#4cc48d" : "#f08a5d";
        ctx.fillStyle = "#4cc48d";
        ctx.lineWidth = 1.5;
        if (passed) ctx.fillRect(x, r.y, cell, cell);
        else ctx.strokeRect(x + 0.75, r.y + 0.75, cell - 1.5, cell - 1.5);
      }
    }
    ctx.lineWidth = 1;
    if (!n) {
      ctx.fillStyle = "#56647c"; ctx.textAlign = "center";
      ctx.fillText("No pairs measured yet", W / 2, 260);
    }
  }

  function drawBench(dt) {
    ctx.fillStyle = "#05080e"; ctx.fillRect(0, 0, W, H);
    // Beam line
    ctx.strokeStyle = "#1a2436"; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(AX - DET_OFF, CY); ctx.lineTo(BX + DET_OFF, CY); ctx.stroke();
    ctx.setLineDash([]);
    // Source
    const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, 30);
    g.addColorStop(0, "rgba(201,170,255,0.9)"); g.addColorStop(1, "rgba(201,170,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, CY, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c9d4e3"; ctx.textAlign = "center";
    ctx.font = "12px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillStyle = "#7f8ea6";
    ctx.fillText("ENTANGLED PAIR SOURCE", CX, 48);
    ctx.fillText(state.model === "quantum" ? "quantum rules" : "hidden instructions", CX, 66);

    drawPolarizer(AX, state.a, "Alice", state.a.toFixed(1).replace(/\.0$/, "") + "°");
    drawPolarizer(BX, state.b, "Bob", state.b.toFixed(1).replace(/\.0$/, "") + "°");

    // Photons in flight
    const done = [];
    for (const f of state.flights) {
      f.t += dt / FLIGHT_MS;
      const u = Math.min(1, f.t);
      const dx = u * (CX - AX);
      ctx.fillStyle = "#e9e2ff";
      for (const x of [CX - dx, CX + dx]) {
        ctx.beginPath(); ctx.arc(x, CY, 4, 0, Math.PI * 2); ctx.fill();
      }
      if (f.t >= 1) done.push(f);
    }
    for (const f of done) {
      state.flights.splice(state.flights.indexOf(f), 1);
      commit(f.A, f.B, f.a, f.b, f.model);
    }

    state.lampA = Math.max(0, state.lampA - dt / 500);
    state.lampB = Math.max(0, state.lampB - dt / 500);
    drawLamp(AX - DET_OFF, state.lampA, state.lastA);
    drawLamp(BX + DET_OFF, state.lampB, state.lastB);
    drawTapes();
  }

  // ---------- Agreement chart ----------
  const CW = 560, CH = 320;
  const cctx = Lab.setupCanvas($("chart"), CW, CH);
  const P = { l: 48, r: 16, t: 18, b: 44 };
  const xOf = (d) => P.l + (d / 90) * (CW - P.l - P.r);
  const yOf = (p) => CH - P.b - p * (CH - P.t - P.b);

  function drawChart() {
    cctx.fillStyle = "#05080e"; cctx.fillRect(0, 0, CW, CH);
    cctx.font = "11px 'IBM Plex Mono', ui-monospace, monospace";
    // Grid
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      cctx.strokeStyle = "#141d2d"; cctx.beginPath(); cctx.moveTo(P.l, yOf(p)); cctx.lineTo(CW - P.r, yOf(p)); cctx.stroke();
      cctx.fillStyle = "#7f8ea6"; cctx.textAlign = "right"; cctx.fillText(Math.round(p * 100) + "%", P.l - 8, yOf(p) + 4);
    }
    for (const d of [0, 22.5, 45, 67.5, 90]) {
      cctx.strokeStyle = "#141d2d"; cctx.beginPath(); cctx.moveTo(xOf(d), P.t); cctx.lineTo(xOf(d), CH - P.b); cctx.stroke();
      cctx.fillStyle = "#7f8ea6"; cctx.textAlign = "center"; cctx.fillText(d + "°", xOf(d), CH - P.b + 16);
    }
    cctx.fillText("angle difference between polarizers", (P.l + CW - P.r) / 2, CH - 8);

    // Shade the quantum excess over the best classical line
    cctx.fillStyle = "rgba(143,166,255,0.10)";
    cctx.beginPath();
    for (let d = 0; d <= 90; d += 1) cctx.lineTo(xOf(d), yOf(qAgree(d)));
    for (let d = 90; d >= 0; d -= 1) cctx.lineTo(xOf(d), yOf(cAgree(d)));
    cctx.fill();

    // Curves
    cctx.lineWidth = 2;
    cctx.strokeStyle = "#8fa6ff";
    cctx.beginPath();
    for (let d = 0; d <= 90; d += 1) d === 0 ? cctx.moveTo(xOf(d), yOf(qAgree(d))) : cctx.lineTo(xOf(d), yOf(qAgree(d)));
    cctx.stroke();
    cctx.strokeStyle = "#f0b35a"; cctx.setLineDash([6, 5]);
    cctx.beginPath(); cctx.moveTo(xOf(0), yOf(1)); cctx.lineTo(xOf(90), yOf(0)); cctx.stroke();
    cctx.setLineDash([]); cctx.lineWidth = 1;

    // Legend
    cctx.textAlign = "left";
    cctx.fillStyle = "#8fa6ff"; cctx.fillRect(CW - P.r - 196, P.t + 4, 14, 3);
    cctx.fillStyle = "#c9d4e3"; cctx.fillText("quantum: cos²(Δ)", CW - P.r - 176, P.t + 9);
    cctx.fillStyle = "#f0b35a"; cctx.fillRect(CW - P.r - 196, P.t + 22, 14, 3);
    cctx.fillStyle = "#c9d4e3"; cctx.fillText("hidden instructions", CW - P.r - 176, P.t + 27);

    // Measured points for the current universe
    const bins = state.data[state.model];
    for (let i = 0; i < bins.length; i++) {
      const { n, same } = bins[i];
      if (n < 3) continue;
      const r = 2.5 + Math.min(4, Math.log10(n) * 1.6);
      cctx.fillStyle = state.model === "quantum" ? "#e9eef7" : "#ffd59a";
      cctx.beginPath(); cctx.arc(xOf(i * 2.5), yOf(same / n), r, 0, Math.PI * 2); cctx.fill();
    }
    // Current setting marker
    const d = foldDiff(state.a - state.b);
    cctx.strokeStyle = "rgba(233,238,247,0.5)"; cctx.setLineDash([2, 3]);
    cctx.beginPath(); cctx.moveTo(xOf(d), P.t); cctx.lineTo(xOf(d), CH - P.b); cctx.stroke();
    cctx.setLineDash([]);
  }

  // ---------- Stats ----------
  let dirtyStats = true;
  const pct = (p) => (p * 100).toFixed(1) + "%";
  function updateStats() {
    const bin = state.data[state.model][binOf(state.a, state.b)];
    const d = foldDiff(state.a - state.b);
    $("nHere").textContent = bin.n.toLocaleString();
    $("agreeHere").textContent = bin.n ? pct(bin.same / bin.n) : "–";
    $("qPred").textContent = pct(qAgree(d));
    $("cPred").textContent = pct(cAgree(d));
    $("aliceOut").textContent = state.a + "°";
    $("bobOut").textContent = state.b + "°";
    dirtyStats = false;
  }

  // ---------- Bell test ----------
  const SETTINGS = [[0, 22.5, +1], [45, 22.5, +1], [45, 67.5, +1], [0, 67.5, -1]];
  function bellRun(model, pairs) {
    const tally = SETTINGS.map(() => ({ n: 0, same: 0 }));
    for (let i = 0; i < pairs; i++) {
      const a = Math.random() < 0.5 ? 0 : 45;
      const b = Math.random() < 0.5 ? 22.5 : 67.5;
      const k = SETTINGS.findIndex(([sa, sb]) => sa === a && sb === b);
      const [A, B] = models[model](a, b);
      tally[k].n++; if (A === B) tally[k].same++;
    }
    const E = tally.map((t) => (2 * t.same - t.n) / t.n);
    const S = E.reduce((s, e, i) => s + SETTINGS[i][2] * e, 0);
    return { E, S };
  }
  function renderBell(q, c) {
    const body = $("bellBody");
    body.innerHTML = "";
    SETTINGS.forEach(([a, b, sign], i) => {
      const tr = document.createElement("tr");
      const f = (r) => (r ? (r.E[i] >= 0 ? "+" : "−") + Math.abs(r.E[i]).toFixed(3) : "–");
      tr.innerHTML = `<td>${sign < 0 ? "− " : ""}${a}°, ${b}°</td><td>${f(q)}</td><td>${f(c)}</td>`;
      body.appendChild(tr);
    });
    if (q && c) {
      $("sq").textContent = q.S.toFixed(2);
      $("sc").textContent = c.S.toFixed(2);
      $("gq").style.width = Math.min(100, (q.S / 3) * 100) + "%";
      $("gc").style.width = Math.min(100, (c.S / 3) * 100) + "%";
      const v = $("verdict");
      v.className = "verdict broken";
      v.textContent = `Quantum rules score ${q.S.toFixed(2)}, past the limit of 2 that every hidden-instruction theory obeys. The instructions universe scores ${c.S.toFixed(2)}, at the limit give or take random noise. Run it again: the gap never closes.`;
    }
  }
  renderBell(null, null);
  $("runBell").addEventListener("click", () => {
    renderBell(bellRun("quantum", 20000), bellRun("classical", 20000));
  });

  // ---------- Controls ----------
  $("alice").addEventListener("input", (e) => { state.a = +e.target.value; dirtyStats = true; });
  $("bob").addEventListener("input", (e) => { state.b = +e.target.value; dirtyStats = true; });
  function setModel(m) {
    state.model = m;
    state.tapeA = []; state.tapeB = []; state.flights = []; state.lastA = state.lastB = null;
    $("modelQ").setAttribute("aria-pressed", String(m === "quantum"));
    $("modelC").setAttribute("aria-pressed", String(m === "classical"));
    dirtyStats = true;
  }
  $("modelQ").addEventListener("click", () => setModel("quantum"));
  $("modelC").addEventListener("click", () => setModel("classical"));
  $("auto").addEventListener("click", () => {
    state.running = !state.running;
    $("auto").textContent = state.running ? "Pause" : "Resume";
  });
  $("one").addEventListener("click", () => sendPair(true));
  $("burst").addEventListener("click", () => { for (let i = 0; i < 500; i++) sendPair(false); });
  $("sweep").addEventListener("click", () => {
    for (let d = 0; d <= 90; d += 2.5) {
      for (let i = 0; i < 300; i++) {
        const [A, B] = models[state.model](0, d);
        const bin = state.data[state.model][binOf(0, d)];
        bin.n++; if (A === B) bin.same++;
      }
    }
    dirtyStats = true;
  });
  $("clearData").addEventListener("click", () => {
    state.data = { quantum: makeBins(), classical: makeBins() };
    dirtyStats = true;
  });

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    if (state.running) {
      state.pending += state.rate * dt / 1000;
      while (state.pending >= 1) { state.pending--; sendPair(true); }
    }
    drawBench(dt);
    if (dirtyStats) { updateStats(); drawChart(); }
    requestAnimationFrame(frame);
  }

  // Seed a little history so the first view shows the idea.
  for (let i = 0; i < 24; i++) sendPair(false);
  for (const d of [0, 15, 30, 45, 60, 75, 90]) {
    for (let i = 0; i < 120; i++) {
      const [A, B] = models.quantum(0, d);
      const bin = state.data.quantum[binOf(0, d)];
      bin.n++; if (A === B) bin.same++;
    }
  }
  requestAnimationFrame(frame);
})();
