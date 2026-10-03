(function () {
  const W = 960, H = 470;
  const canvas = document.getElementById("bench");
  const ctx = Lab.setupCanvas(canvas, W, H);
  const $ = (id) => document.getElementById(id);

  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";
  const BLUE = "#8fa6ff", AMBER = "#f0b35a", DIM = "#7f8ea6", FAINT = "#56647c", GRID = "#1a2436";

  // Chart geometry
  const BX0 = 70, BX1 = 930, BY0 = 58, BY1 = 286;
  const SX0 = 70, SX1 = 930, SY0 = 352, SY1 = 420;

  const BENFORD = [0];
  for (let d = 1; d <= 9; d++) BENFORD[d] = Math.log10(1 + 1 / d);

  const GENERATIONS = 60;
  const LOG2 = Math.log10(2);
  const PHI = (1 + Math.sqrt(5)) / 2;

  const state = {
    dataset: "growth",
    size: 1000,
    items: [],          // { L: log10 value, d: leading digit, j: jitter, label }
    shown: 0,           // how many items are counted so far
    revealStart: 0,
    gen: 0, genTimer: 0, growing: false,
    showBenford: true,
    bars: new Array(10).fill(0),   // displayed heights (eased)
    yMax: 0.35,
  };

  // ---------- Helpers ----------
  const digitFromLog = (L) => {
    const f = L - Math.floor(L);
    return Math.min(9, Math.max(1, Math.floor(Math.pow(10, f) + 1e-9)));
  };
  const digitFromNumber = (x) => +Math.abs(x).toExponential()[0];
  const item = (L, label, d) => ({ L, d: d || digitFromLog(L), j: Math.random(), label });
  const sci = (L) => {
    const e = Math.floor(L);
    const m = Math.pow(10, L - e);
    if (e < 6 && e > -3) {
      const v = Math.pow(10, L);
      return v.toLocaleString(undefined, { maximumSignificantDigits: 6 });
    }
    return m.toFixed(3) + " × 10^" + e;
  };

  // ---------- Datasets ----------
  function build() {
    const N = state.size;
    const items = [];
    if (state.dataset === "pow2") {
      for (let n = 1; n <= N; n++) items.push(item(n * LOG2, "2^" + n));
    } else if (state.dataset === "fib") {
      let a = 1, b = 1;
      for (let n = 1; n <= N; n++) {
        if (n <= 75) {
          const v = n <= 2 ? 1 : (() => { const c = a + b; a = b; b = c; return c; })();
          items.push(item(Math.log10(v), "F(" + n + ")", digitFromNumber(v)));
        } else {
          // Binet: F(n) is the nearest integer to phi^n / sqrt 5.
          items.push(item(n * Math.log10(PHI) - Math.log10(Math.sqrt(5)), "F(" + n + ")"));
        }
      }
    } else if (state.dataset === "fact") {
      let L = 0;
      for (let n = 1; n <= N; n++) {
        L += Math.log10(n);
        if (n <= 18) {
          let v = 1; for (let k = 2; k <= n; k++) v *= k;
          items.push(item(L, n + "!", digitFromNumber(v)));
        } else items.push(item(L, n + "!"));
      }
    } else if (state.dataset === "growth") {
      // Every population starts at 5,000. Each generation multiplies it by a random
      // factor between ×0.5 and ×2 (evenly spread on a log scale).
      for (let i = 0; i < N; i++) items.push(item(Math.log10(5000), "town " + (i + 1), 5));
    } else if (state.dataset === "uniform") {
      for (let i = 0; i < N; i++) {
        const v = 1 + Math.floor(Math.random() * 9999);
        items.push(item(Math.log10(v), "", digitFromNumber(v)));
      }
    } else {
      for (const x of parseCustom($("custom").value)) {
        items.push(item(Math.log10(Math.abs(x.v)), x.s, digitFromNumber(x.v)));
      }
    }
    return items;
  }

  function parseCustom(text) {
    const out = [];
    for (let tok of text.split(/[\s;\t|]+/)) {
      if (!tok) continue;
      // "1,234,567" is one number with thousands separators; "12,45,7" is a list.
      const parts = /^[-+(]?[$€£¥]?\d{1,3}(,\d{3})+(\.\d+)?\)?%?$/.test(tok) ? [tok.replace(/,/g, "")] : tok.split(",");
      for (let p of parts) {
        p = p.replace(/^[(+$€£¥]+|[)%]+$/g, "").replace(/^-[$€£¥]/, "-");
        if (!/^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(p)) continue;
        const v = parseFloat(p);
        if (!isFinite(v) || v === 0) continue;
        out.push({ v, s: p });
      }
    }
    return out;
  }

  function stepGeneration() {
    for (const it of state.items) {
      it.L += (Math.random() * 2 - 1) * LOG2;
      it.d = digitFromLog(it.L);
    }
    state.gen++;
  }

  // ---------- Start / reset ----------
  function start() {
    state.items = build();
    state.gen = 0;
    state.growing = state.dataset === "growth";
    if (Lab.reducedMotion) {
      state.shown = state.items.length;
      if (state.growing) { while (state.gen < GENERATIONS) stepGeneration(); state.growing = false; }
    } else {
      state.shown = state.growing ? state.items.length : 0;
      state.revealStart = performance.now();
      state.genTimer = performance.now() + 700;
    }
    const custom = state.dataset === "custom";
    $("size").disabled = custom;
    $("reroll").disabled = !(state.dataset === "growth" || state.dataset === "uniform");
    updateStats();
  }

  // ---------- Statistics ----------
  function tally() {
    const c = new Array(10).fill(0);
    for (let i = 0; i < state.shown; i++) c[state.items[i].d]++;
    return c;
  }
  // Chi-square survival function for 8 degrees of freedom (exact for even df).
  const chiP8 = (x) => {
    const h = x / 2;
    let s = 0, t = 1;
    for (let i = 0; i < 4; i++) { s += t; t *= h / (i + 1); }
    return Math.exp(-h) * s;
  };

  function updateStats() {
    const n = state.shown;
    const c = tally();
    $("count").textContent = n.toLocaleString();
    $("customOut").textContent = parseCustom($("custom").value).length.toLocaleString() + " found";
    const v = $("verdict");
    v.className = "";
    if (n < 2) {
      for (const id of ["spread", "share1", "mad", "chi"]) $(id).textContent = "–";
      v.textContent = state.dataset === "custom" ? "paste some numbers" : "–";
      return;
    }
    let lo = Infinity, hi = -Infinity, mad = 0, chi = 0;
    for (let i = 0; i < n; i++) { const L = state.items[i].L; if (L < lo) lo = L; if (L > hi) hi = L; }
    for (let d = 1; d <= 9; d++) {
      mad += Math.abs(c[d] / n - BENFORD[d]);
      const e = n * BENFORD[d];
      chi += (c[d] - e) ** 2 / e;
    }
    mad /= 9;
    const span = hi - lo;
    $("spread").textContent = (span >= 100 ? Math.round(span) : span.toFixed(1)) + " powers of ten";
    $("share1").textContent = (100 * c[1] / n).toFixed(1) + "%";
    $("mad").textContent = mad.toFixed(4);
    const p = chiP8(chi);
    $("chi").textContent = (chi < 100 ? chi.toFixed(1) : Math.round(chi).toLocaleString()) + ", p " + (p < 0.001 ? "< 0.001" : "= " + p.toFixed(3));
    // Nigrini's first-digit MAD bands
    let label, good;
    if (n < 50) { label = "too few numbers to judge"; good = null; }
    else if (mad < 0.006) { label = "close conformity"; good = true; }
    else if (mad < 0.012) { label = "acceptable conformity"; good = true; }
    else if (mad < 0.015) { label = "marginal"; good = false; }
    else { label = "does not follow Benford"; good = false; }
    v.textContent = label;
    v.className = good === null ? "" : good ? "verdict-good" : "verdict-bad";
  }

  // ---------- Drawing ----------
  const by = (p) => BY1 - (p / state.yMax) * (BY1 - BY0);
  const sx = (f) => SX0 + f * (SX1 - SX0);

  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    const n = state.shown;
    const c = tally();
    const share = c.map((v) => (n ? v / n : 0));

    // Ease bars and y-scale
    const target = Math.max(0.35, ...share.slice(1).map((s) => s * 1.12));
    const k = Lab.reducedMotion ? 1 : 0.18;
    state.yMax += (target - state.yMax) * k;
    for (let d = 1; d <= 9; d++) state.bars[d] += (share[d] - state.bars[d]) * k;

    // Titles
    ctx.font = "12px " + MONO;
    ctx.fillStyle = DIM;
    ctx.textAlign = "left";
    ctx.fillText("SHARE OF NUMBERS BY LEADING DIGIT", BX0, 28);
    if (state.dataset === "growth") {
      ctx.textAlign = "right";
      ctx.fillStyle = state.growing ? AMBER : DIM;
      ctx.fillText("GENERATION " + state.gen + " OF " + GENERATIONS, BX1, 28);
    } else if (n > 0 && state.items[n - 1].label) {
      ctx.textAlign = "right";
      const it = state.items[n - 1];
      const txt = state.dataset === "custom" ? it.label : it.label + " = " + sci(it.L);
      ctx.fillText(txt, BX1, 28);
    }

    // Grid
    ctx.font = "10px " + MONO;
    const stepP = state.yMax > 0.6 ? 0.2 : 0.1;
    for (let p = 0; p <= state.yMax + 1e-9; p += stepP) {
      ctx.strokeStyle = GRID;
      ctx.beginPath(); ctx.moveTo(BX0, by(p) + 0.5); ctx.lineTo(BX1, by(p) + 0.5); ctx.stroke();
      ctx.fillStyle = FAINT;
      ctx.textAlign = "right";
      ctx.fillText(Math.round(p * 100) + "%", BX0 - 8, by(p) + 3);
    }

    // Bars
    const slot = (BX1 - BX0) / 9;
    const bw = slot * 0.56;
    for (let d = 1; d <= 9; d++) {
      const x = BX0 + slot * (d - 0.5);
      const h = Math.max(0, state.bars[d]);
      ctx.fillStyle = "rgba(143,166,255,0.75)";
      ctx.fillRect(x - bw / 2, by(h), bw, BY1 - by(h));
      ctx.fillStyle = "#c9d4e3";
      ctx.font = "600 18px 'Spectral', Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(String(d), x, BY1 + 22);
      if (n) {
        ctx.font = "11px " + MONO;
        ctx.fillStyle = BLUE;
        const yLab = Math.min(by(h) - 8, state.showBenford ? by(BENFORD[d]) - 8 : 1e9);
        ctx.fillText((100 * share[d]).toFixed(1) + "%", x, Math.max(BY0 - 10, yLab));
      }
      if (state.showBenford) {
        const yb = by(BENFORD[d]);
        ctx.strokeStyle = "#e9eef7";
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x - bw / 2 - 8, yb); ctx.lineTo(x + bw / 2 + 8, yb); ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
    if (state.showBenford) {
      // Benford curve through the marks
      ctx.strokeStyle = "rgba(233,238,247,0.35)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      for (let d = 1; d <= 9; d++) {
        const x = BX0 + slot * (d - 0.5);
        d === 1 ? ctx.moveTo(x, by(BENFORD[d])) : ctx.lineTo(x, by(BENFORD[d]));
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "11px " + SANS;
      ctx.fillStyle = "#e9eef7";
      ctx.textAlign = "right";
      ctx.fillText("white marks: Benford, log₁₀(1 + 1/d)", BX1, BY0 + 2);
    }

    // Log strip
    ctx.font = "12px " + MONO;
    ctx.fillStyle = DIM;
    ctx.textAlign = "left";
    ctx.fillText("EVERY NUMBER ON A LOG SCALE, FOLDED INTO ONE DECADE (1 TO 10)", SX0, SY0 - 14);
    for (let d = 1; d <= 9; d++) {
      const x0 = sx(Math.log10(d)), x1 = sx(Math.log10(d + 1));
      ctx.fillStyle = d % 2 ? "#0e1626" : "#0a101c";
      ctx.fillRect(x0, SY0, x1 - x0, SY1 - SY0);
      ctx.strokeStyle = "#26324a";
      ctx.beginPath(); ctx.moveTo(x0 + 0.5, SY0); ctx.lineTo(x0 + 0.5, SY1 + 6); ctx.stroke();
      ctx.fillStyle = FAINT;
      ctx.font = "10px " + MONO;
      ctx.textAlign = "center";
      ctx.fillText(String(d), x0, SY1 + 18);
      if (x1 - x0 > 80) {
        ctx.fillText((100 * BENFORD[d]).toFixed(1) + "% wide", (x0 + x1) / 2, SY1 + 18);
      }
    }
    ctx.strokeStyle = "#26324a";
    ctx.beginPath(); ctx.moveTo(SX1 - 0.5, SY0); ctx.lineTo(SX1 - 0.5, SY1 + 6); ctx.stroke();
    ctx.fillStyle = FAINT;
    ctx.fillText("10", SX1, SY1 + 18);

    ctx.fillStyle = n > 1500 ? "rgba(240,179,90,0.55)" : "rgba(240,179,90,0.8)";
    const r = n > 1500 ? 1.6 : 2.2;
    for (let i = 0; i < n; i++) {
      const it = state.items[i];
      const f = it.L - Math.floor(it.L);
      ctx.fillRect(sx(f) - r / 2, SY0 + 5 + it.j * (SY1 - SY0 - 10) - r / 2, r, r);
    }

    if (!n) {
      ctx.fillStyle = FAINT;
      ctx.font = "13px " + SANS;
      ctx.textAlign = "center";
      ctx.fillText(state.dataset === "custom" ? "Paste some numbers below the bench, then press Count my numbers." : "Counting…", (BX0 + BX1) / 2, (BY0 + BY1) / 2);
    }
  }

  // ---------- Loop ----------
  const REVEAL_MS = 2400;
  function frame(now) {
    if (!state.growing && state.shown < state.items.length) {
      const u = Math.min(1, (now - state.revealStart) / REVEAL_MS);
      state.shown = Math.max(state.shown, Math.round(state.items.length * u * u));
      updateStats();
    }
    if (state.growing && now >= state.genTimer) {
      stepGeneration();
      state.genTimer = now + (state.gen < 10 ? 160 : 80);
      if (state.gen >= GENERATIONS) state.growing = false;
      updateStats();
    }
    draw();
    requestAnimationFrame(frame);
  }

  // ---------- Controls ----------
  $("dataset").addEventListener("change", (e) => { state.dataset = e.target.value; start(); });
  $("size").addEventListener("input", (e) => {
    state.size = +e.target.value;
    $("sizeOut").textContent = state.size.toLocaleString();
  });
  $("size").addEventListener("change", start);
  $("replay").addEventListener("click", () => {
    if (state.dataset === "growth" || state.dataset === "uniform") start();
    else { state.shown = Lab.reducedMotion ? state.items.length : 0; state.revealStart = performance.now(); updateStats(); }
  });
  $("reroll").addEventListener("click", start);
  $("showBenford").addEventListener("change", (e) => { state.showBenford = e.target.checked; });
  $("custom").addEventListener("input", () => {
    $("customOut").textContent = parseCustom($("custom").value).length.toLocaleString() + " found";
  });
  $("useCustom").addEventListener("click", () => {
    state.dataset = "custom";
    $("dataset").value = "custom";
    start();
  });

  // Open with the populations growing from a single size toward Benford.
  state.dataset = $("dataset").value;
  state.size = +$("size").value;
  start();
  requestAnimationFrame(frame);
})();
