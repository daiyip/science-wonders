(function () {
  const $ = (id) => document.getElementById(id);
  const rand = (n) => Math.floor(Math.random() * n);

  // ---------- Prize drawings ----------
  const GOAT = '<svg viewBox="0 0 64 52" aria-hidden="true"><g fill="#d9dfe8">' +
    '<ellipse cx="28" cy="30" rx="17" ry="9"/>' +
    '<path d="M40 26 L47 13 L53 15 L47 30 Z"/>' +
    '<ellipse cx="52" cy="15" rx="7" ry="5" transform="rotate(25 52 15)"/>' +
    '<rect x="15" y="35" width="3.4" height="13" rx="1.4"/><rect x="21" y="36" width="3.4" height="12" rx="1.4"/>' +
    '<rect x="34" y="35" width="3.4" height="13" rx="1.4"/><rect x="39" y="35" width="3.4" height="12" rx="1.4"/>' +
    '<path d="M12 26 L6 21 L9 28 Z"/><path d="M55 20 L56 27 L52 22 Z"/></g>' +
    '<path d="M49 10 C47 4 43 2 40 3" stroke="#aab4c3" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="54" cy="13.5" r="1.2" fill="#05080e"/></svg>';
  const CAR = '<svg viewBox="0 0 64 40" aria-hidden="true">' +
    '<path d="M4 29 L6 21 Q8 18 14 17 L22 16 L28 9 Q30 7 34 7 L44 7 Q48 7 50 10 L55 17 Q60 18 61 22 L61 29 Z" fill="#f0c36a"/>' +
    '<path d="M25 16 L30 10 L38 10 L38 16 Z M41 16 L41 10 L46 10 Q48 10 49 12 L52 16 Z" fill="#1b2638"/>' +
    '<circle cx="17" cy="29" r="6" fill="#0b1018" stroke="#c9d4e3" stroke-width="2"/>' +
    '<circle cx="49" cy="29" r="6" fill="#0b1018" stroke="#c9d4e3" stroke-width="2"/>' +
    '<path d="M57 5 L58 1 L59 5 L63 6 L59 7 L58 11 L57 7 L53 6 Z" fill="#fff6d8"/></svg>';

  // ---------- State ----------
  const state = {
    n: 3, random: false,
    car: 0, pick: -1, left: -1, phase: "pick", final: -1, won: false,
    opened: new Set(),
    tally: { stay: { n: 0, w: 0 }, swap: { n: 0, w: 0 } },
  };
  const sim = { played: 0, valid: 0, stayW: 0, swapW: 0, stay: [], swap: [], target: 0 };

  // ---------- Doors ----------
  let doorEls = [];
  function sizeClass(n) {
    if (n <= 3) return "l";
    if (n <= 6) return "m";
    if (n <= 12) return "s";
    if (n <= 30) return "xs";
    return "xxs";
  }
  function buildDoors() {
    const box = $("doors");
    box.innerHTML = "";
    box.dataset.size = sizeClass(state.n);
    doorEls = [];
    for (let i = 0; i < state.n; i++) {
      const b = document.createElement("button");
      b.className = "door";
      b.id = "door-" + (i + 1);
      b.innerHTML = '<span class="frame"><span class="prize"></span><span class="leaf"><span class="num">' + (i + 1) +
        '</span><span class="knob"></span></span></span><span class="tag"></span>';
      b.addEventListener("click", () => onDoor(i));
      box.appendChild(b);
      doorEls.push(b);
    }
  }

  function renderDoors() {
    const showAll = state.phase === "reveal" || state.phase === "void";
    doorEls.forEach((b, i) => {
      const open = state.opened.has(i) || showAll;
      b.classList.toggle("open", open);
      b.classList.toggle("picked", i === state.pick && state.phase !== "reveal");
      b.classList.toggle("offered", i === state.left && state.phase === "decide");
      b.classList.toggle("win", state.phase === "reveal" && i === state.car);
      if (state.phase === "reveal") b.classList.toggle("picked", i === state.final && !state.won);
      const prize = b.querySelector(".prize");
      const want = open ? (i === state.car ? "car" : "goat") : "";
      if (prize.dataset.kind !== want) { prize.dataset.kind = want; prize.innerHTML = want === "car" ? CAR : want === "goat" ? GOAT : ""; }
      let tag = "";
      if (state.phase === "decide" || state.phase === "void") {
        if (i === state.pick) tag = "Your pick";
        else if (i === state.left && state.phase === "decide") tag = "Switch?";
      } else if (state.phase === "reveal") {
        if (i === state.final) tag = state.won ? "You won" : "Your door";
        else if (i === state.car) tag = "Car";
      }
      b.querySelector(".tag").textContent = tag;
      b.disabled = !(state.phase === "pick" || (state.phase === "decide" && (i === state.pick || i === state.left)));
      let label = "Door " + (i + 1);
      if (i === state.pick && state.phase !== "pick") label += ", your pick";
      if (i === state.left && state.phase === "decide") label += ", the one the host left closed";
      if (open) label += ", open: " + (i === state.car ? "the car" : "a goat");
      b.setAttribute("aria-label", label);
      // Stagger many doors opening so the host's sweep is visible.
      b.querySelector(".leaf").style.transitionDelay = (state.phase === "decide" && open && !Lab.reducedMotion) ? Math.min(600, i * (state.n > 10 ? 8 : 120)) + "ms" : "0ms";
    });
  }

  const others = () => state.n - 2;
  function renderStage() {
    const m = $("message");
    const P = state.pick + 1, L = state.left + 1;
    $("stay").hidden = $("switch").hidden = state.phase !== "decide";
    $("again").hidden = !(state.phase === "reveal" || state.phase === "void");
    if (state.phase === "pick") {
      m.innerHTML = "Pick a door. One of the " + state.n + " hides a car; the rest hide goats.";
    } else if (state.phase === "decide") {
      const who = state.random ? "The host, who has no idea where the car is, happened to open " : "The host, who knows where the car is, opened ";
      const what = state.n === 3 ? "door " + (state.opened.values().next().value + 1) + " to show a goat"
        : others() + " doors, all goats, and left <b>door " + L + "</b> closed";
      m.innerHTML = "You picked <b>door " + P + "</b>. " + who + what + ". Stay with door " + P + ", or switch to door " + L + "?";
      $("stay").textContent = "Stay with door " + P;
      $("switch").textContent = "Switch to door " + L;
    } else if (state.phase === "void") {
      m.innerHTML = "You picked <b>door " + P + "</b>, and the random host opened the door with the car behind it. That game doesn't count.";
    } else {
      const verb = state.final === state.pick ? "stayed with" : "switched to";
      m.innerHTML = state.won
        ? "You " + verb + " <b>door " + (state.final + 1) + "</b> and won the car!"
        : "You " + verb + " <b>door " + (state.final + 1) + "</b> and got a goat. The car was behind door " + (state.car + 1) + ".";
    }
    renderDoors();
  }

  // Which doors does the host open? Returns { left, opened }.
  function hostMove(n, car, pick, random) {
    let left;
    if (random) {
      left = rand(n - 1); if (left >= pick) left++;
    } else if (pick === car) {
      left = rand(n - 1); if (left >= pick) left++;
    } else {
      left = car;
    }
    return left;
  }

  function newGame() {
    state.car = rand(state.n);
    state.pick = -1; state.left = -1; state.final = -1; state.won = false;
    state.opened = new Set();
    state.phase = "pick";
    renderStage();
  }

  function onDoor(i) {
    if (state.phase === "pick") {
      state.pick = i;
      state.left = hostMove(state.n, state.car, i, state.random);
      state.opened = new Set();
      for (let d = 0; d < state.n; d++) if (d !== i && d !== state.left) state.opened.add(d);
      state.phase = state.random && state.opened.has(state.car) ? "void" : "decide";
      renderStage();
      if (state.phase === "decide") $("switch").focus({ preventScroll: true });
    } else if (state.phase === "decide") {
      if (i === state.pick) finish(false);
      else if (i === state.left) finish(true);
    }
  }

  function finish(switched) {
    state.final = switched ? state.left : state.pick;
    state.won = state.final === state.car;
    const t = switched ? state.tally.swap : state.tally.stay;
    t.n++; if (state.won) t.w++;
    state.phase = "reveal";
    renderStage();
    updateTally();
    $("again").focus({ preventScroll: true });
  }

  const pct = (w, n) => n ? (100 * w / n).toFixed(1) + "%" : "–";
  function updateTally() {
    const { stay, swap } = state.tally;
    $("played").textContent = stay.n + swap.n;
    $("stayTally").textContent = stay.w + " of " + stay.n + (stay.n ? " (" + pct(stay.w, stay.n) + ")" : "");
    $("switchTally").textContent = swap.w + " of " + swap.n + (swap.n ? " (" + pct(swap.w, swap.n) + ")" : "");
  }

  // ---------- Simulation ----------
  function clearSim() {
    sim.played = sim.valid = sim.stayW = sim.swapW = 0;
    sim.stay = []; sim.swap = []; sim.target = 0;
    updateSimStats();
  }
  function simulate(count) {
    clearSim();
    sim.target = count;
    if (Lab.reducedMotion) runGames(count);
  }
  function runGames(k) {
    while (k-- > 0 && sim.played < sim.target) {
      const n = state.n, car = rand(n), pick = rand(n);
      const left = hostMove(n, car, pick, state.random);
      sim.played++;
      // A random host shows the car unless it sits behind your door or the one he left.
      const voided = state.random && car !== pick && car !== left;
      if (!voided) {
        sim.valid++;
        if (pick === car) sim.stayW++;
        if (left === car) sim.swapW++;
      }
      sim.stay.push(sim.valid ? sim.stayW / sim.valid : NaN);
      sim.swap.push(sim.valid ? sim.swapW / sim.valid : NaN);
    }
    updateSimStats();
  }
  function updateSimStats() {
    $("simN").textContent = sim.played.toLocaleString("en-US") + (state.random && sim.played ? " (" + sim.valid + " counted)" : "");
    $("simStay").textContent = pct(sim.stayW, sim.valid);
    $("simSwitch").textContent = pct(sim.swapW, sim.valid);
  }

  // ---------- Chart ----------
  const W = 960, H = 300;
  const ctx = Lab.setupCanvas($("bench"), W, H);
  const C = { l: 62, r: 170, t: 30, b: 40 };
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const STAY = "#f08a5d", SWAP = "#8fa6ff";
  const xOf = (g) => C.l + (g / 1000) * (W - C.l - C.r);
  const yOf = (p) => H - C.b - p * (H - C.t - C.b);

  function drawChart() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    ctx.font = "13px " + MONO;
    // Grid
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.strokeStyle = p === 0 ? "#3a4760" : "#1a2436";
      ctx.beginPath(); ctx.moveTo(C.l, yOf(p) + 0.5); ctx.lineTo(W - C.r, yOf(p) + 0.5); ctx.stroke();
      ctx.fillStyle = "#7f8ea6"; ctx.textAlign = "right";
      ctx.fillText(Math.round(p * 100) + "%", C.l - 10, yOf(p) + 4);
    }
    ctx.textAlign = "center";
    for (const g of [0, 250, 500, 750, 1000]) ctx.fillText(g.toLocaleString("en-US"), xOf(g), H - C.b + 20);
    ctx.textAlign = "left";
    ctx.fillText("WIN RATE AS GAMES ACCUMULATE", C.l, 18);

    // Theory
    const tStay = state.random ? 0.5 : 1 / state.n, tSwap = state.random ? 0.5 : (state.n - 1) / state.n;
    ctx.setLineDash([5, 6]);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(240,138,93,0.55)";
    ctx.beginPath(); ctx.moveTo(C.l, yOf(tStay)); ctx.lineTo(W - C.r, yOf(tStay)); ctx.stroke();
    ctx.strokeStyle = "rgba(143,166,255,0.55)";
    ctx.beginPath(); ctx.moveTo(C.l, yOf(tSwap) - (state.random ? 2 : 0)); ctx.lineTo(W - C.r, yOf(tSwap) - (state.random ? 2 : 0)); ctx.stroke();
    ctx.setLineDash([]);

    // Traces
    const line = (arr, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = "round";
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < arr.length; i++) {
        if (isNaN(arr[i])) continue;
        const x = xOf(i + 1), y = yOf(arr[i]);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    line(sim.stay, STAY);
    line(sim.swap, SWAP);
    ctx.lineWidth = 1;

    // End labels (or theory labels if no data yet)
    const last = (arr) => { for (let i = arr.length - 1; i >= 0; i--) if (!isNaN(arr[i])) return arr[i]; return NaN; };
    let ys = last(sim.stay), yw = last(sim.swap);
    const haveData = !isNaN(ys);
    if (!haveData) { ys = tStay; yw = tSwap; }
    let pyS = yOf(ys), pyW = yOf(yw);
    if (Math.abs(pyS - pyW) < 34) {
      const mid = (pyS + pyW) / 2, up = ys >= yw ? -1 : 1;
      pyS = mid + up * 17; pyW = mid - up * 17;
    }
    const lx = W - C.r + 14;
    ctx.textAlign = "left";
    ctx.font = "600 15px " + MONO;
    ctx.fillStyle = SWAP;
    ctx.fillText("Switch " + (haveData ? (yw * 100).toFixed(1) + "%" : ""), lx, pyW - 2);
    ctx.fillStyle = STAY;
    ctx.fillText("Stay " + (haveData ? (ys * 100).toFixed(1) + "%" : ""), lx, pyS - 2);
    ctx.font = "12px " + MONO;
    ctx.fillStyle = "#7f8ea6";
    const fr = state.random ? ["1/2", "1/2"] : [(state.n - 1) + "/" + state.n, "1/" + state.n];
    ctx.fillText("theory " + fr[0], lx, pyW + 14);
    ctx.fillText("theory " + fr[1], lx, pyS + 14);

    if (!sim.played) {
      ctx.fillStyle = "#56647c"; ctx.textAlign = "center"; ctx.font = "15px 'IBM Plex Sans', system-ui, sans-serif";
      ctx.fillText("Press Simulate 1,000 games", (C.l + W - C.r) / 2, (C.t + H - C.b) / 2);
    }
  }

  // ---------- Probability flow ----------
  function frac(a, b) { return a + "/" + b; }
  function renderFlow() {
    const n = state.n;
    const mine = 100 / n;
    const cell = (100 - mine) / (n - 1);
    const goats = n - 2;
    $("flowIntro").textContent = state.random
      ? "With a host who opens doors at random, an all-goat reveal is luck, not knowledge, so it favours neither closed door."
      : "Your door starts with 1/" + n + ". The host's reveal can't change that, because he could always find goats to open. Everything else pours into the one door he skips.";
    const afterMine = state.random ? 50 : mine;
    const afterLeft = state.random ? 50 : 100 - mine;
    $("flow").innerHTML =
      '<div class="flow-step"><span class="eyebrow">1 · You pick, before the host acts</span>' +
      '<div class="bar"><span class="mine" style="width:' + mine + '%"></span><span class="rest' + (n <= 20 ? " split" : "") + '" style="width:' + (100 - mine) + "%;--cell:" + (100 / (100 - mine) * cell) + '%"></span></div>' +
      '<div class="bar-labels"><span class="k-mine">Your door <b>' + frac(1, n) + '</b></span><span class="k-rest">The other ' + (n - 1) + ' doors <b>' + frac(n - 1, n) + "</b> together</span></div></div>" +
      '<div class="flow-step"><span class="eyebrow">2 · The host opens ' + goats + (goats === 1 ? " goat door" : " goat doors") + "</span>" +
      '<div class="bar"><span class="mine" style="width:' + afterMine + '%"></span><span class="rest" style="width:' + afterLeft + '%"></span></div>' +
      '<div class="bar-labels"><span class="k-mine">Your door <b>' + (state.random ? "1/2" : frac(1, n)) + '</b></span><span class="k-rest">The door he left <b>' + (state.random ? "1/2" : frac(n - 1, n)) + "</b></span></div>" +
      '<span class="muted" style="font-size:var(--step--1)">Opened doors: <b class="mono">0</b> each. ' +
      (state.random ? "Given that he missed the car, both closed doors are equally likely." : "Switching wins " + (n - 1) + " times in " + n + ".") +
      "</span></div>";
  }

  // ---------- Controls ----------
  function resetTally() {
    state.tally = { stay: { n: 0, w: 0 }, swap: { n: 0, w: 0 } };
    updateTally();
  }
  function settingsChanged() {
    buildDoors();
    newGame();
    resetTally();
    renderFlow();
    simulate(1000);
  }
  $("doorCount").addEventListener("input", (e) => {
    state.n = +e.target.value;
    $("doorCountOut").textContent = state.n;
    settingsChanged();
  });
  function setHost(random) {
    state.random = random;
    $("hostKnows").setAttribute("aria-pressed", String(!random));
    $("hostRandom").setAttribute("aria-pressed", String(random));
    $("hint").textContent = random
      ? "The host now opens doors at random. If he reveals the car the game is void and doesn't count, in your tally or the simulation."
      : "The host knows where the car is and never reveals it. Changing the number of doors or the host starts a fresh tally and a fresh simulation.";
    settingsChanged();
  }
  $("hostKnows").addEventListener("click", () => setHost(false));
  $("hostRandom").addEventListener("click", () => setHost(true));
  $("stay").addEventListener("click", () => finish(false));
  $("switch").addEventListener("click", () => finish(true));
  $("again").addEventListener("click", () => { newGame(); doorEls[0] && doorEls[0].focus({ preventScroll: true }); });
  $("newGame").addEventListener("click", newGame);
  $("resetTally").addEventListener("click", resetTally);
  $("simulate").addEventListener("click", () => simulate(1000));
  $("clearSim").addEventListener("click", clearSim);

  // ---------- Loop ----------
  function frame() {
    if (sim.played < sim.target) runGames(6);
    drawChart();
    requestAnimationFrame(frame);
  }

  // Start with a game waiting for your pick and a simulation already running.
  buildDoors();
  newGame();
  updateTally();
  renderFlow();
  simulate(1000);
  requestAnimationFrame(frame);
})();
