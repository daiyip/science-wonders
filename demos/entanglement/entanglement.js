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
  // Two layouts: the desktop one (960 wide) and a narrower, taller one for phones,
  // chosen from the canvas's displayed width so canvas text stays readable.
  let W = 960, H = 330, ctx, compact = null;
  let CX, CY, AX, BX, DET_OFF, NAME_Y, SUB_Y, SRC_Y;
  let TAPE_N, CELL, GAP, ROW_A, ROW_B, CAP_Y, MONO_S, MONO_M;
  function benchGeometry() {
    if (!compact) {
      W = 960; H = 330;
      CX = W / 2; CY = 120; AX = 170; BX = 790; DET_OFF = 78;
      NAME_Y = 30; SUB_Y = 48; SRC_Y = 48;
      TAPE_N = 40; CELL = 18; GAP = 4; ROW_A = 222; ROW_B = 274; CAP_Y = 206;
      MONO_S = 11; MONO_M = 12;
    } else {
      W = 340; H = 330;
      CX = W / 2; CY = 128; AX = 92; BX = 248; DET_OFF = 70;
      NAME_Y = 62; SUB_Y = 79; SRC_Y = 20;
      TAPE_N = 20; CELL = 13; GAP = 3; ROW_A = 258; ROW_B = 302; CAP_Y = 204;
      MONO_S = 12; MONO_M = 13;
    }
  }
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
    if (ready && !bulk) WONDERS.sound("tick", { pitch: A === B ? 0.8 : 0.3 });
  }
  let ready = false, bulk = false;
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
    ctx.fillText(label, x, NAME_Y);
    ctx.font = MONO_M + "px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillStyle = "#7f8ea6";
    ctx.fillText(sub, x, SUB_Y);
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
    ctx.fillStyle = "#7f8ea6"; ctx.font = MONO_S + "px 'IBM Plex Mono', ui-monospace, monospace"; ctx.textAlign = "center";
    const word = passed === null ? "—" : on ? "PASS" : "BLOCK";
    const half = ctx.measureText(word).width / 2;
    ctx.fillText(word, Math.max(3 + half, Math.min(W - 3 - half, x)), CY + 30);
  }

  function drawTapes() {
    const n = state.tapeA.length;
    const cell = CELL, gap = GAP, cols = TAPE_N;
    const total = cols * (cell + gap) - gap;
    const x0 = (W - total) / 2;
    const rows = [{ y: ROW_A, tape: state.tapeA, name: "ALICE" }, { y: ROW_B, tape: state.tapeB, name: "BOB" }];
    ctx.font = MONO_S + "px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "left"; ctx.fillStyle = "#7f8ea6";
    const caption = "LAST " + TAPE_N + " PAIRS  ·  filled = pass, hollow = blocked, gold link = results agree";
    if (!compact) ctx.fillText(caption, x0, CAP_Y);
    else wrapText(caption, x0, CAP_Y, total, 16);
    const first = Math.max(0, n - cols);
    for (let i = first; i < n; i++) {
      const x = x0 + (cols - n + i) * (cell + gap);
      const same = state.tapeA[i] === state.tapeB[i];
      if (same) {
        ctx.fillStyle = "rgba(240,179,90,0.55)";
        ctx.fillRect(x + cell / 2 - 1, ROW_A + cell, 2, ROW_B - ROW_A - cell);
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
      ctx.fillText("No pairs measured yet", W / 2, (ROW_A + ROW_B + cell) / 2 + 4);
    }
  }

  // Translate the whole sentence first, then wrap; Chinese wraps per character.
  function wrapText(text, x, y, maxW, lh) {
    if (window.I18N) text = window.I18N.t(text);
    const cjk = /[\u3000-\u9fff]/.test(text);
    const words = cjk ? [...text] : text.split(/\s+/);
    const sep = cjk ? "" : " ";
    let line = "";
    for (const w of words) {
      const t = line ? line + sep + w : w;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line.trim(), x, y); y += lh; line = w.trim(); }
      else line = t;
    }
    if (line.trim()) { ctx.fillText(line.trim(), x, y); y += lh; }
    return y;
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
    ctx.font = MONO_M + "px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillStyle = "#7f8ea6";
    ctx.fillText("ENTANGLED PAIR SOURCE", CX, SRC_Y);
    ctx.fillText(state.model === "quantum" ? "quantum rules" : "hidden instructions", CX, SRC_Y + 18);

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
  let CW = 560, CH = 320, cctx, chartCompact = null, CFONT = 11, LEG_X = 196;
  let P = { l: 48, r: 16, t: 18, b: 44 };
  function chartGeometry() {
    if (!chartCompact) { CW = 560; CH = 320; P = { l: 48, r: 16, t: 18, b: 44 }; CFONT = 11; LEG_X = 196; }
    else { CW = 280; CH = 296; P = { l: 40, r: 12, t: 14, b: 88 }; CFONT = 12; LEG_X = 150; }
  }
  const xOf = (d) => P.l + (d / 90) * (CW - P.l - P.r);
  const yOf = (p) => CH - P.b - p * (CH - P.t - P.b);

  function drawChart() {
    cctx.fillStyle = "#05080e"; cctx.fillRect(0, 0, CW, CH);
    cctx.font = CFONT + "px 'IBM Plex Mono', ui-monospace, monospace";
    // Grid
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      cctx.strokeStyle = "#141d2d"; cctx.beginPath(); cctx.moveTo(P.l, yOf(p)); cctx.lineTo(CW - P.r, yOf(p)); cctx.stroke();
      cctx.fillStyle = "#7f8ea6"; cctx.textAlign = "right"; cctx.fillText(Math.round(p * 100) + "%", P.l - 8, yOf(p) + 4);
    }
    for (const d of [0, 22.5, 45, 67.5, 90]) {
      cctx.strokeStyle = "#141d2d"; cctx.beginPath(); cctx.moveTo(xOf(d), P.t); cctx.lineTo(xOf(d), CH - P.b); cctx.stroke();
      cctx.fillStyle = "#7f8ea6"; cctx.textAlign = "center"; cctx.fillText(chartCompact && d % 45 ? "" : d + "°", xOf(d), CH - P.b + 16);
    }
    {
      // Axis title: centred under the plot, shrunk a little (never below 11 px) if it would not fit.
      const t = "angle difference between polarizers";
      let f = CFONT;
      while (f > 11 && cctx.measureText(t).width > CW - 8) { f -= 0.5; cctx.font = f + "px 'IBM Plex Mono', ui-monospace, monospace"; }
      const w = cctx.measureText(t).width;
      cctx.fillText(t, Math.max(4 + w / 2, Math.min(CW - 4 - w / 2, (P.l + CW - P.r) / 2)), chartCompact ? CH - P.b + 38 : CH - 8);
      cctx.font = CFONT + "px 'IBM Plex Mono', ui-monospace, monospace";
    }

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
    // On phones the legend sits under the axis title instead of over the plot.
    const lx = chartCompact ? P.l : CW - P.r - LEG_X, ly = chartCompact ? CH - 30 : P.t + 9;
    cctx.fillStyle = "#8fa6ff"; cctx.fillRect(lx, ly - 5, 14, 3);
    cctx.fillStyle = "#c9d4e3"; cctx.fillText("quantum: cos²(Δ)", lx + 20, ly);
    cctx.fillStyle = "#f0b35a"; cctx.fillRect(lx, ly + 13, 14, 3);
    cctx.fillStyle = "#c9d4e3"; cctx.fillText("hidden instructions", lx + 20, ly + 18);

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
    checkChallenges(bin, d);
  }

  // ---------- Narration and challenges ----------
  const fmt = (p) => (p * 100).toFixed(1);
  function checkChallenges(bin, d) {
    if (!ready || state.model !== "quantum" || !bin.n) return;
    const agree = bin.same / bin.n;
    if (d === 90 && bin.n >= 200 && agree === 0) WONDERS.challenge("never-agree");
    if (d >= 17.5 && d <= 22.5 && bin.n >= 1000 && agree - cAgree(d) >= 0.05) WONDERS.challenge("beat-plan");
  }
  function describeScene() {
    const d = foldDiff(state.a - state.b);
    const bin = state.data[state.model][binOf(state.a, state.b)];
    const rules = state.model === "quantum" ? "Quantum rules are on." : "Hidden instructions are on.";
    const angles = `Alice's polarizer is at ${state.a}° and Bob's at ${state.b}°, ${d}° apart.`;
    const measured = bin.n
      ? `Over ${bin.n.toLocaleString()} pairs at this angle difference the results agreed ${fmt(bin.same / bin.n)}% of the time; quantum mechanics predicts ${fmt(qAgree(d))}% and the best hidden-instruction plan ${fmt(cAgree(d))}%.`
      : `No pairs measured at this angle difference yet; quantum mechanics predicts ${fmt(qAgree(d))}% agreement and the best hidden-instruction plan ${fmt(cAgree(d))}%.`;
    return rules + " " + angles + " " + measured;
  }
  // The engine translates the description as a whole; with measured data shown, translate each sentence group first.
  const t8 = (x) => (window.I18N ? I18N.t(x) : x);
  WONDERS.describer(() => (showData ? t8(describeScene()) + " " + t8(dataSentence()) : describeScene()));

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
    const q = bellRun("quantum", 20000), c = bellRun("classical", 20000);
    renderBell(q, c);
    WONDERS.describe(`Bell test done. Quantum rules score S = ${q.S.toFixed(2)}, above the limit of 2. Hidden instructions score ${c.S.toFixed(2)}.`, { now: true });
    WONDERS.sound("event", { pitch: 0.8 });
    if (q.S > 2.7) WONDERS.challenge("bell");
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
    WONDERS.describe(m === "quantum" ? "The universe now runs on quantum rules." : "The universe now runs on hidden instructions.", { now: true });
  }
  $("modelQ").addEventListener("click", () => setModel("quantum"));
  $("modelC").addEventListener("click", () => setModel("classical"));
  $("auto").addEventListener("click", () => {
    state.running = !state.running;
    $("auto").textContent = state.running ? "Pause" : "Resume";
  });
  $("one").addEventListener("click", () => sendPair(true));
  $("burst").addEventListener("click", () => {
    bulk = true;
    for (let i = 0; i < 500; i++) sendPair(false);
    bulk = false;
    updateStats();
    const d = foldDiff(state.a - state.b), bin = state.data[state.model][binOf(state.a, state.b)];
    WONDERS.describe(`Sent 500 pairs. At ${d}° apart the results now agree ${fmt(bin.same / bin.n)}% of the time over ${bin.n.toLocaleString()} pairs.`, { now: true });
    WONDERS.sound("event");
  });
  $("sweep").addEventListener("click", () => {
    WONDERS.describe("Swept all angle differences from 0° to 90°, 300 pairs each. The measured dots now follow the curve for the current universe.", { now: true });
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
    WONDERS.describe("Measured data cleared.", { now: true });
    dirtyStats = true;
  });


  // ---------- Measured data (cited single measurements; values are in the page's HTML) ----------
  // Aspect, Grangier, Roger, PRL 49, 91 (1982): S = 2.697 ± 0.015, prediction 2.70 ± 0.05.
  // Weihs et al., PRL 81, 5039 (1998): S = 2.73 ± 0.02. Hensen et al., Nature 526, 682 (2015): S = 2.42 ± 0.20.
  let showData = false;
  const dataSentence = () => "Measured Bell scores: Aspect's team got S = 2.697 ± 0.015 in 1982, Weihs's team 2.73 ± 0.02 in 1998, and Hensen's loophole-free test 2.42 ± 0.20 in 2015. All are above the limit of 2 and below the perfect quantum score of 2.83.";
  $("showData").addEventListener("change", (e) => {
    showData = e.target.checked;
    $("dataPanel").hidden = !showData;
    if (showData) WONDERS.describe(dataSentence(), { now: true });
  });
  if ($("showData").checked) { showData = true; $("dataPanel").hidden = false; }

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

  // ---------- Layout ----------
  function layout() {
    const bc = $("bench"), cc = $("chart");
    const nb = (bc.clientWidth || 960) < 640, nc = (cc.clientWidth || 560) < 400;
    if (nb !== compact) { compact = nb; benchGeometry(); ctx = Lab.setupCanvas(bc, W, H); }
    if (nc !== chartCompact) { chartCompact = nc; chartGeometry(); cctx = Lab.setupCanvas(cc, CW, CH); dirtyStats = true; }
  }
  layout();
  let resizeTimer = 0;
  const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); };
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(onResize);
    ro.observe($("bench").parentElement); ro.observe($("chart").parentElement);
  } else window.addEventListener("resize", onResize);

  // Seed a little history so the first view shows the idea.
  for (let i = 0; i < 24; i++) sendPair(false);
  for (const d of [0, 15, 30, 45, 60, 75, 90]) {
    for (let i = 0; i < 120; i++) {
      const [A, B] = models.quantum(0, d);
      const bin = state.data.quantum[binOf(0, d)];
      bin.n++; if (A === B) bin.same++;
    }
  }
  ready = true;
  requestAnimationFrame(frame);
})();
