(function () {
  const canvas = document.getElementById("bench");
  const $ = (id) => document.getElementById(id);
  const tr = (s) => (window.I18N ? window.I18N.t(s) : s);
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";

  // ---------- Colours (the bench is always dark) ----------
  const C = {
    bg: "#05080e", cell: "#0e1624", cellText: "#4a5870", prime: "#7fd0ff", primeText: "#05080e",
    random: "#e48bd0", hiPrime: "#f0b35a", hiComp: "#b0445c", label: "#7f8ea6", dim: "#56647c",
    ink: "#e9eef7", grid: "#151e2e", frame: "#1f2a3f", li: "#f0b35a",
  };

  // ---------- Layout (logical pixels) ----------
  // Wide: the spiral on the left, the selected number and the prime-count chart on
  // the right. Narrow (phones): the logical width is the CSS width so text keeps its
  // real size, and the panel moves under the spiral.
  let W = 960, H = 620, narrow = false, ctx;
  let SX = 20, SY = 40, S = 560;           // spiral square
  let PX = 616, PW = 324, PY = 0;           // panel
  let CHART = { x: 660, y: 300, w: 270, h: 230 };
  function layout() {
    const cw = Math.round(canvas.clientWidth || canvas.parentElement.clientWidth || 960);
    narrow = cw < 640;
    if (!narrow) {
      W = 960; H = 620; SX = 20; SY = 40; S = 560;
      PX = 616; PW = 324; PY = 0;
      CHART = { x: PX + 46, y: 322, w: PW - 58, h: 214 };
    } else {
      W = Math.max(280, cw);
      SX = 6; SY = 26; S = W - 12;
      PX = 10; PW = W - 20; PY = SY + S + 8;
      CHART = { x: PX + 42, y: PY + 282, w: PW - 50, h: Math.round(Math.min(200, W * 0.5)) };
      H = Math.round(CHART.y + CHART.h + 76);
    }
    ctx = Lab.setupCanvas(canvas, W, H);
    view.dirty = true;
  }

  // ---------- Primes: sieve with smallest prime factors ----------
  let LIMIT = 0, spf = new Uint32Array(0), primeList = [];
  function sieve(need) {
    if (need <= LIMIT) return;
    const M = Math.max(300000, Math.ceil(need * 1.15));
    spf = new Uint32Array(M + 1);
    const primes = [];
    for (let i = 2; i <= M; i++) {
      if (spf[i] === 0) { spf[i] = i; primes.push(i); }
      const si = spf[i];
      for (let j = 0; j < primes.length; j++) {
        const p = primes[j], ip = i * p;
        if (p > si || ip > M) break;
        spf[ip] = p;
      }
    }
    primeList = primes;
    LIMIT = M;
  }
  // π(x): how many primes are ≤ x, by binary search in the list of primes.
  function countUpTo(x) {
    let lo = 0, hi = primeList.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (primeList[m] <= x) lo = m + 1; else hi = m; }
    return lo;
  }
  const isPrime = (v) => v >= 2 && v <= LIMIT && spf[v] === v;
  function factorise(v) {
    const out = [];
    while (v > 1) {
      const p = spf[v];
      let e = 0;
      while (v % p === 0) { v /= p; e++; }
      out.push([p, e]);
    }
    return out;
  }
  const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const sup = (e) => String(e).split("").map((d) => SUP[+d]).join("");
  const factorText = (f) => f.map(([p, e]) => fmt(p) + (e > 1 ? sup(e) : "")).join(" × ");

  // The fair test: each odd number lights with chance 2 / ln n, from a fixed hash.
  function hash01(v) {
    let h = (v ^ 0x9e3779b9) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  }
  const randomLit = (v) => v === 2 || (v >= 3 && (v & 1) === 1 && hash01(v) < 2 / Math.log(v));

  // ---------- Square spiral geometry ----------
  // Index 0 is the centre; index 1 is to its right; the walk turns anticlockwise.
  // Coordinates have y pointing up.
  function idxOf(x, y) {
    const k = Math.max(Math.abs(x), Math.abs(y));
    if (k === 0) return 0;
    const s = (2 * k - 1) * (2 * k - 1);
    if (x === k && y > -k) return s + (y + k - 1);
    if (y === k) return s + 2 * k - 1 + (k - x);
    if (x === -k) return s + 4 * k - 1 + (k - y);
    return s + 6 * k - 1 + (x + k);
  }
  function posOf(i) {
    if (i === 0) return [0, 0];
    let k = Math.ceil((Math.sqrt(i + 1) - 1) / 2);
    while ((2 * k - 1) * (2 * k - 1) > i) k--;
    while ((2 * k + 1) * (2 * k + 1) <= i) k++;
    const off = i - (2 * k - 1) * (2 * k - 1);
    if (off < 2 * k) return [k, -k + 1 + off];
    if (off < 4 * k) return [k - 1 - (off - 2 * k), k];
    if (off < 6 * k) return [-k, k - 1 - (off - 4 * k)];
    return [-k + 1 + (off - 6 * k), -k];
  }

  // ---------- State ----------
  const state = {
    mode: "square", side: 201, start: 1, poly: "none", a: 4, b: 18, c: 19,
    random: false, sel: 1,
    // derived
    end: 0, count: 0, primes: 0, gap: null, hl: null, polyInfo: null, piSamples: null,
  };
  const view = { canvas: document.createElement("canvas"), ctx: null, dirty: true, reveal: 1, revealStart: 0 };

  function rebuild() {
    state.count = state.side * state.side;
    state.end = state.start + state.count - 1;
    sieve(state.end);
    // Primes shown and the longest gap between neighbouring primes in the range.
    const i0 = countUpTo(state.start - 1), i1 = countUpTo(state.end);
    let best = null;
    for (let i = i0 + 1; i < i1; i++) {
      const g = primeList[i] - primeList[i - 1];
      if (!best || g > best.size) best = { size: g, from: primeList[i - 1], to: primeList[i] };
    }
    state.primes = i1 - i0;
    state.gap = best;
    // π(x), x/ln x and li(x) at sample points from 2 to the end.
    const SAMPLES = 160, xs = [], pi = [], li = [];
    let liAcc = 0, lx = 2;
    for (let s = 1; s <= SAMPLES; s++) {
      const x = Math.max(2, Math.round(2 + (state.end - 2) * s / SAMPLES));
      const cnt = countUpTo(x);
      // Simpson's rule for the integral of 1 / ln t from the previous sample.
      if (x > lx) {
        const K = 24, hh = (x - lx) / K;
        for (let j = 0; j < K; j++) {
          const t0 = lx + j * hh, t1 = t0 + hh;
          liAcc += hh / 6 * (1 / Math.log(t0) + 4 / Math.log((t0 + t1) / 2) + 1 / Math.log(t1));
        }
      }
      lx = x;
      xs.push(x); pi.push(cnt); li.push(liAcc);
    }
    state.piSamples = { xs, pi, li };
    if (state.sel < state.start || state.sel > state.end) state.sel = state.start;
    computePoly();
    view.dirty = true;
    updateReadouts();
    checkChallenges();
  }

  // ---------- Highlighted polynomial ----------
  const PRESETS = { euler: [1, 1, 41], landau: [1, 0, 1], even: [1, 1, 2] };
  function coeffs() {
    if (state.poly === "custom") return [state.a, state.b, state.c];
    return PRESETS[state.poly] || null;
  }
  function polyText(a, b, c) {
    const term = (k, v, first) => {
      if (k === 0) return "";
      const sign = k < 0 ? (first ? "−" : " − ") : (first ? "" : " + ");
      const m = Math.abs(k);
      return sign + (m === 1 && v ? "" : fmt(m)) + v;
    };
    let s = term(a, "n²", true);
    s += term(b, "n", s === "");
    if (c !== 0 || s === "") s += s === "" ? (c < 0 ? "−" : "") + fmt(Math.abs(c)) : (c < 0 ? " − " : " + ") + fmt(Math.abs(c));
    return s;
  }
  // Hardy–Littlewood / Bateman–Horn constant: product over primes p < 100,000 of
  // (1 − ω(p)/p) / (1 − 1/p), where ω(p) counts roots of f mod p.
  function hlConstant(a, b, c) {
    const D = b * b - 4 * a * c;
    let prod = 1;
    const mod = (x, p) => ((x % p) + p) % p;
    for (const p of primeList) {
      if (p >= 100000) break;
      let w;
      if (p < 50) {
        w = 0;
        for (let n = 0; n < p; n++) if (mod(mod(a * n, p) * n + b * n + c, p) === 0) w++;
      } else if (mod(a, p) === 0) {
        w = mod(b, p) !== 0 ? 1 : (mod(c, p) === 0 ? p : 0);
      } else {
        const d = mod(D, p);
        if (d === 0) w = 1;
        else {
          let r = 1, base = d, e = (p - 1) / 2;
          while (e > 0) { if (e & 1) r = (r * base) % p; base = (base * base) % p; e = Math.floor(e / 2); }
          w = r === 1 ? 2 : 0;
        }
      }
      prod *= (1 - w / p) / (1 - 1 / p);
      if (prod === 0) break;
    }
    return prod;
  }
  function computePoly() {
    state.hl = null; state.polyInfo = null;
    const k = coeffs();
    if (!k) return;
    const [a, b, c] = k;
    const info = { a, b, c, text: polyText(a, b, c), n: 0, p: 0, expect: 0, measured: null, predicted: null, kind: "quad", nOf: new Map() };
    state.polyInfo = info;
    if (a < 0 || (a === 0 && b <= 0)) { info.kind = "bad"; return; }
    const hl = new Uint8Array(state.count);
    const vertex = a > 0 ? -b / (2 * a) : -Infinity;
    for (let n = 0; n < 3000000; n++) {
      const v = a * n * n + b * n + c;
      if (v > state.end && n > vertex) break;
      if (v < state.start || v > state.end) continue;
      const i = v - state.start;
      if (hl[i]) continue;
      hl[i] = isPrime(v) ? 2 : 1;
      info.nOf.set(v, n);
      info.n++;
      if (hl[i] === 2) info.p++;
      if (v >= 2) info.expect += 1 / Math.log(v);
    }
    state.hl = hl;
    if (info.expect > 0) info.measured = info.p / info.expect;
    const D = b * b - 4 * a * c;
    const r = a > 0 && D >= 0 ? Math.round(Math.sqrt(D)) : -1;
    if (a > 0 && r * r === D) info.kind = "factors";
    else info.kind = a === 0 ? "line" : "quad";
    if (info.kind !== "factors") info.predicted = hlConstant(a, b, c);
  }

  // Fit the quadratic along the diagonal ray through the selected cell, heading away
  // from the centre, then extend it inward as far as the same formula holds.
  function traceDiagonal() {
    if (state.mode !== "square") return false;
    const [x, y] = posOf(state.sel - state.start);
    const sx = x >= 0 ? 1 : -1, sy = y >= 0 ? 1 : -1;
    const val = (k) => state.start + idxOf(x + k * sx, y + k * sy);
    const v0 = val(0), v1 = val(1), v2 = val(2);
    const a = (v2 - 2 * v1 + v0) / 2, b = v1 - v0 - a, c = v0;
    const f = (n) => a * n * n + b * n + c;
    for (let k = 3; k < 7; k++) if (val(k) !== f(k)) return false;
    let K = 0;
    for (;;) {
      const k = -(K + 1), cx = x + k * sx, cy = y + k * sy;
      if ((cx !== 0 && Math.sign(cx) !== sx) || (cy !== 0 && Math.sign(cy) !== sy)) break;
      if (val(k) !== f(k)) break;
      K++;
      if (cx === 0 && cy === 0) break;
    }
    state.a = a; state.b = b - 2 * a * K; state.c = f(-K);
    $("polyA").value = state.a; $("polyB").value = state.b; $("polyC").value = state.c;
    state.poly = "custom";
    $("poly").value = "custom";
    computePoly();
    view.dirty = true;
    updateReadouts();
    const info = state.polyInfo;
    WONDERS.sound("event", { pitch: Math.min(1, info.p / Math.max(1, info.n) * 1.6) });
    WONDERS.describe(tr(`Traced the diagonal ray through ${fmt(state.sel)}: ${info.p} of ${info.n} values shown are prime.`) + " f(n) = " + info.text, { now: true });
    checkChallenges();
    return true;
  }

  // ---------- Rendering the spiral into an offscreen layer ----------
  function litAt(v) { return state.random ? randomLit(v) : (v >= 2 && spf[v] === v); }

  function renderSquare(g) {
    const side = state.side, h = (side - 1) / 2, cs = S / side;
    const litCol = state.random ? C.random : C.prime;
    g.fillStyle = C.bg; g.fillRect(0, 0, S, S);
    if (cs >= 4) {
      const gap = cs >= 9 ? 1 : cs >= 6 ? 0.6 : 0;
      // Numbers go in the cells only when the longest one fits at 10 px or more.
      let fs = Math.min(14, cs * 0.46);
      g.font = `${fs}px ${MONO}`;
      const widest = g.measureText(fmt(state.end)).width;
      if (widest > cs - 3) fs *= (cs - 3) / widest;
      const showNum = fs >= 10;
      if (showNum) { g.textAlign = "center"; g.textBaseline = "middle"; g.font = `${fs}px ${MONO}`; }
      for (let row = 0; row < side; row++) {
        for (let col = 0; col < side; col++) {
          const i = idxOf(col - h, h - row), v = state.start + i;
          const hv = state.hl ? state.hl[i] : 0;
          const lit = litAt(v);
          g.fillStyle = hv === 2 ? C.hiPrime : hv === 1 ? C.hiComp : lit ? litCol : C.cell;
          g.fillRect(col * cs + gap / 2, row * cs + gap / 2, cs - gap, cs - gap);
          if (showNum) {
            const txt = fmt(v);
            g.fillStyle = hv || lit ? C.primeText : C.cellText;
            g.fillText(txt, col * cs + cs / 2, row * cs + cs / 2 + 0.5);
          }
        }
      }
      g.textBaseline = "alphabetic";
    } else {
      // Small cells: one anti-aliased square per lit cell keeps every cell the same size.
      g.fillStyle = "#0a111d";
      g.fillRect(0, 0, S, S);
      const cols = { 1: C.hiComp, 2: C.hiPrime };
      const sz = cs + 0.15;
      g.fillStyle = litCol;
      g.beginPath();
      for (let v = state.start; v <= state.end; v++) {
        if (!litAt(v)) continue;
        const i = v - state.start;
        if (state.hl && state.hl[i]) continue;
        const [x, y] = posOf(i);
        g.rect((x + h) * cs, (h - y) * cs, sz, sz);
      }
      g.fill();
      if (state.hl) {
        for (let i = 0; i < state.count; i++) {
          const hv = state.hl[i];
          if (!hv) continue;
          const [x, y] = posOf(i);
          g.fillStyle = cols[hv];
          g.fillRect((x + h) * cs, (h - y) * cs, sz, sz);
        }
      }
    }
  }

  // Sacks spiral: number v at radius √v, angle 2π√v (anticlockwise from the right).
  const sacksScale = () => (S / 2 - 6) / Math.sqrt(state.end);
  function sacksXY(v) {
    const s = Math.sqrt(v), r = s * sacksScale(), th = 2 * Math.PI * s;
    return [S / 2 + r * Math.cos(th), S / 2 - r * Math.sin(th)];
  }
  function renderSacks(g) {
    g.fillStyle = C.bg; g.fillRect(0, 0, S, S);
    const k = sacksScale();
    // The ray of perfect squares.
    g.strokeStyle = "#1f2a3f"; g.setLineDash([3, 4]);
    g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S - 2, S / 2); g.stroke(); g.setLineDash([]);
    // The spiral path itself, faint, when the turns are far enough apart.
    if (k >= 5) {
      g.strokeStyle = "#121b2a"; g.lineWidth = 1;
      g.beginPath();
      const smax = Math.sqrt(state.end);
      for (let s = Math.sqrt(state.start); s <= smax + 1e-9; s += 0.01) {
        const r = s * k, th = 2 * Math.PI * s;
        const x = S / 2 + r * Math.cos(th), y = S / 2 - r * Math.sin(th);
        s === Math.sqrt(state.start) ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
    const dot = Math.max(1.1, Math.min(7, k * 0.75));
    const litCol = state.random ? C.random : C.prime;
    if (k >= 3) {
      g.fillStyle = "#1a2436";
      for (let v = state.start; v <= state.end; v++) {
        if (litAt(v)) continue;
        const [x, y] = sacksXY(v);
        g.fillRect(x - dot * 0.3, y - dot * 0.3, dot * 0.6, dot * 0.6);
      }
    }
    g.fillStyle = litCol;
    g.beginPath();
    for (let v = state.start; v <= state.end; v++) {
      if (!litAt(v)) continue;
      const [x, y] = sacksXY(v);
      if (k >= 4) { g.beginPath(); g.arc(x, y, dot / 2 + 0.3, 0, Math.PI * 2); g.fill(); }
      else g.rect(x - dot / 2, y - dot / 2, dot, dot);
    }
    if (k < 4) g.fill();
    if (state.hl) {
      const hd = Math.max(2, dot * 1.25);
      for (let i = 0; i < state.count; i++) {
        const hv = state.hl[i];
        if (!hv) continue;
        const [x, y] = sacksXY(state.start + i);
        g.fillStyle = hv === 2 ? C.hiPrime : C.hiComp;
        g.beginPath(); g.arc(x, y, hd / 2 + 0.4, 0, Math.PI * 2); g.fill();
      }
    }
    if (k >= 14) {
      g.font = `${Math.min(12, k * 0.5)}px ${MONO}`;
      g.textAlign = "center";
      for (let v = state.start; v <= state.end; v++) {
        const [x, y] = sacksXY(v);
        g.fillStyle = litAt(v) ? "#a9dcff" : C.cellText;
        g.fillText(fmt(v), x, y - dot - 2);
      }
    }
  }

  function renderView() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (view.canvas.width !== Math.round(S * dpr)) view.ctx = null;
    if (!view.ctx) view.ctx = Lab.setupCanvas(view.canvas, S, S);
    const g = view.ctx;
    g.save();
    if (state.mode === "square") renderSquare(g); else renderSacks(g);
    g.restore();
    view.dirty = false;
  }

  // ---------- Drawing the frame ----------
  function selXY() {
    if (state.mode === "square") {
      const cs = S / state.side, h = (state.side - 1) / 2;
      const [x, y] = posOf(state.sel - state.start);
      return { x: SX + (x + h) * cs, y: SY + (h - y) * cs, cs };
    }
    const [x, y] = sacksXY(state.sel);
    return { x: SX + x, y: SY + y, cs: 0 };
  }

  function draw(now) {
    if (view.dirty) renderView();
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // Title above the spiral.
    ctx.fillStyle = C.label;
    ctx.textAlign = "left";
    ctx.font = (narrow ? 11 : 12) + "px " + MONO;
    const range = `${fmt(state.start)} TO ${fmt(state.end)}`;
    const title = state.random
      ? `RANDOM ODD NUMBERS, NOT PRIMES · ${range}`
      : state.mode === "square" ? `ULAM SPIRAL · PRIMES FROM ${range}` : `SACKS SPIRAL · PRIMES FROM ${range}`;
    fitText(title, SX + 2, SY - 10, S - 4, narrow ? 10 : 10.5);

    // The spiral, revealed from the centre after a change of view.
    const p = view.reveal;
    ctx.save();
    if (p < 1) {
      ctx.beginPath();
      if (state.mode === "square") {
        const r = Math.max(4, p * S / 2);
        ctx.rect(SX + S / 2 - r, SY + S / 2 - r, 2 * r, 2 * r);
      } else ctx.arc(SX + S / 2, SY + S / 2, Math.max(4, p * S * 0.71), 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(view.canvas, SX, SY, S, S);
    ctx.restore();
    if (state.mode === "sacks") {
      ctx.fillStyle = C.dim;
      ctx.textAlign = "left";
      ctx.font = "11px " + MONO;
      ctx.fillText("SQUARES n² →", SX + S / 2 + 8, SY + S / 2 + 15);
    }

    // Selection cursor.
    const s = selXY();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5;
    if (state.mode === "square") {
      const pad = s.cs < 6 ? 3 : 1;
      ctx.strokeRect(s.x - pad + 0.5, s.y - pad + 0.5, s.cs + 2 * pad - 1, s.cs + 2 * pad - 1);
      if (s.cs < 6) {
        ctx.strokeStyle = "rgba(233,238,247,0.35)";
        ctx.lineWidth = 1;
        const cx = s.x + s.cs / 2, cy = s.y + s.cs / 2;
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 5, cy); ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 14, cy);
        ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 5); ctx.moveTo(cx, cy + 5); ctx.lineTo(cx, cy + 14);
        ctx.stroke();
      }
    } else {
      ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.lineWidth = 1;
    if (document.activeElement === canvas) {
      ctx.strokeStyle = "rgba(143,166,255,0.5)";
      ctx.strokeRect(SX + 0.5, SY + 0.5, S - 1, S - 1);
    }

    // Divider.
    ctx.strokeStyle = "#1a2436";
    ctx.beginPath();
    if (narrow) { ctx.moveTo(12, PY + 0.5); ctx.lineTo(W - 12, PY + 0.5); }
    else { ctx.moveTo(PX - 14.5, 24); ctx.lineTo(PX - 14.5, H - 24); }
    ctx.stroke();

    drawPanel();
    drawChart();
  }

  function drawPanel() {
    const v = state.sel;
    let y = PY + (narrow ? 22 : 28);
    const x = PX + (narrow ? 0 : 6);
    const maxW = PW - (narrow ? 0 : 12);
    ctx.textAlign = "left";
    ctx.fillStyle = C.label;
    ctx.font = (narrow ? 11 : 12) + "px " + MONO;
    fitText("SELECTED NUMBER", x, y, maxW, 10);
    y += narrow ? 34 : 44;
    const prime = isPrime(v);
    ctx.fillStyle = prime ? C.prime : C.ink;
    ctx.font = `500 ${narrow ? 28 : 36}px ${MONO}`;
    const big = fmt(v);
    ctx.fillText(big, x, y);
    // Status beside or below the big number.
    const bw = ctx.measureText(big).width;
    ctx.font = (narrow ? 13 : 14) + "px " + SANS;
    const status = v === 1 ? "neither prime nor composite" : v === 2 ? "prime, and the only even one" : prime ? "prime" : "composite";
    ctx.fillStyle = prime ? C.prime : C.label;
    if (bw + 14 + ctx.measureText(tr(status)).width <= maxW) ctx.fillText(status, x + bw + 12, y);
    else { y += 20; ctx.fillText(status, x, y); }
    y += narrow ? 24 : 28;
    // Factorisation.
    ctx.font = (narrow ? 13 : 15) + "px " + MONO;
    ctx.fillStyle = C.ink;
    const f = v > 1 ? factorise(v) : [];
    const fstr = v === 1 ? tr("1 has no prime factors") : big + " = " + factorText(f);
    fitText(fstr, x, y, maxW, 10);
    y += narrow ? 20 : 24;
    ctx.font = (narrow ? 12 : 13) + "px " + SANS;
    ctx.fillStyle = C.label;
    const prev = prevPrime(v), next = nextPrime(v);
    if (prev && next) fitText(`Nearest primes ${fmt(prev)} and ${fmt(next)}, gap ${fmt(next - prev)}`, x, y, maxW, 10);
    else if (next) fitText(`Next prime ${fmt(next)}`, x, y, maxW, 10);
    y += narrow ? 18 : 21;
    if (state.mode === "square") {
      const [cx, cy] = posOf(v - state.start);
      fitText(`Position x = ${minus(cx)}, y = ${minus(cy)}, ring ${Math.max(Math.abs(cx), Math.abs(cy))}`, x, y, maxW, 10);
    } else {
      const s = Math.sqrt(v), turn = Math.floor(s), ang = Math.round((s - turn) * 360) % 360;
      fitText(`Radius √n = ${s.toFixed(2)}, angle ${ang}°`, x, y, maxW, 10);
    }
    y += narrow ? 18 : 21;
    const info = state.polyInfo;
    if (info && info.nOf.has(v)) {
      ctx.fillStyle = prime ? C.hiPrime : "#d9707f";
      fitText(`On the highlighted formula, at n = ${fmt(info.nOf.get(v))}`, x, y, maxW, 10);
    }

    // Summary of everything in view.
    y = PY + (narrow ? 182 : 214);
    ctx.font = (narrow ? 11 : 12) + "px " + MONO;
    ctx.fillStyle = C.label;
    fitText("IN VIEW", x, y, maxW, 10);
    ctx.font = (narrow ? 12 : 13) + "px " + SANS;
    y += narrow ? 20 : 22;
    ctx.fillStyle = C.ink;
    fitText(`${fmt(state.primes)} primes among ${fmt(state.count)} numbers (${(100 * state.primes / state.count).toFixed(1)}%)`, x, y, maxW, 10);
    y += narrow ? 18 : 20;
    if (state.gap) fitText(`Longest gap ${state.gap.size}, from ${fmt(state.gap.from)} to ${fmt(state.gap.to)}`, x, y, maxW, 10);
    y += narrow ? 18 : 20;
    if (info && info.n && info.kind !== "bad") {
      ctx.fillStyle = C.hiPrime;
      fitText(`Highlighted: ${fmt(info.p)} of ${fmt(info.n)} values prime (${Math.round(100 * info.p / info.n)}%)`, x, y, maxW, 10);
    }
  }
  const minus = (n) => (n < 0 ? "−" + Math.abs(n) : String(n));
  function prevPrime(v) { for (let u = v - 1; u >= 2; u--) if (spf[u] === u) return u; return 0; }
  function nextPrime(v) { for (let u = v + 1; u <= LIMIT; u++) if (spf[u] === u) return u; return 0; }

  function drawChart() {
    const P = CHART, d = state.piSamples;
    if (!d) return;
    ctx.textAlign = "left";
    ctx.fillStyle = C.label;
    ctx.font = (narrow ? 11 : 12) + "px " + MONO;
    fitText("PRIMES UP TO x", P.x - (narrow ? 32 : 40), P.y - 14, P.w + 40, 10);
    ctx.fillStyle = "#0a0f19";
    ctx.fillRect(P.x, P.y, P.w, P.h);
    const xmax = d.xs[d.xs.length - 1];
    const ymax = Math.max(d.pi[d.pi.length - 1], d.li[d.li.length - 1]) * 1.08;
    const X = (x) => P.x + (x / xmax) * P.w, Y = (y) => P.y + P.h - (y / ymax) * P.h;
    // Grid.
    ctx.font = (narrow ? 10.5 : 10) + "px " + MONO;
    ctx.strokeStyle = C.grid;
    ctx.fillStyle = C.dim;
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const yy = P.y + P.h - f * P.h / 1.08;
      ctx.beginPath(); ctx.moveTo(P.x, Math.round(yy) + 0.5); ctx.lineTo(P.x + P.w, Math.round(yy) + 0.5); ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(short(f * ymax / 1.08), P.x - 5, yy + 3);
    }
    ctx.textAlign = "center";
    for (const f of [0, 0.5, 1]) ctx.fillText(short(f * xmax), Math.min(P.x + P.w - 12, Math.max(P.x + 8, P.x + f * P.w)), P.y + P.h + 14);
    // Curves: x / ln x (dashed), li(x) (amber), π(x) (blue).
    const line = (fy, col, dash, w) => {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash);
      ctx.beginPath();
      d.xs.forEach((x, i) => { const yy = Y(fy(x, i)); i === 0 ? ctx.moveTo(X(x), yy) : ctx.lineTo(X(x), yy); });
      ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    };
    line((x) => x / Math.log(x), C.label, [4, 4], 1.4);
    line((x, i) => d.li[i], C.li, [1.5, 3], 1.6);
    line((x, i) => d.pi[i], C.prime, [], 2);
    ctx.strokeStyle = C.frame;
    ctx.strokeRect(P.x + 0.5, P.y + 0.5, P.w - 1, P.h - 1);
    // Legend under the chart, one curve per line.
    const N = xmax, piN = d.pi[d.pi.length - 1];
    const lx = P.x - (narrow ? 32 : 40), lw = P.w + (narrow ? 32 : 40);
    let ly = P.y + P.h + 34;
    ctx.font = "11px " + MONO;
    ctx.textAlign = "left";
    ctx.fillStyle = C.prime; fitText(`━ π(x), the true count: ${fmt(piN)}`, lx, ly, lw, 10); ly += 16;
    ctx.fillStyle = C.li; fitText(`┅ li(x) estimate: ${fmt(d.li[d.li.length - 1])}`, lx, ly, lw, 10); ly += 16;
    ctx.fillStyle = C.label; fitText(`╌ x / ln x estimate: ${fmt(N / Math.log(N))}`, lx, ly, lw, 10);
  }
  const short = (v) => v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M" : v >= 1e4 ? Math.round(v / 1e3) + "k" : v >= 1000 ? (v / 1e3).toFixed(1) + "k" : String(Math.round(v));

  // Shrink a one-line label (down to minSize px) only if it would not fit.
  function fitText(text, x, y, maxW, minSize) {
    const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
    let size = m ? +m[1] : 12;
    const base = ctx.font;
    while (size > (minSize || 10) && ctx.measureText(text).width > maxW) {
      size -= 0.5;
      ctx.font = base.replace(/\d+(?:\.\d+)?px/, size + "px");
    }
    ctx.fillText(text, x, y);
    ctx.font = base;
  }

  // ---------- Readouts ----------
  function updateReadouts() {
    $("sizeOut").textContent = `${state.side} × ${state.side} = ${fmt(state.count)}`;
    $("startOut").textContent = `ends at ${fmt(state.end)}`;
    $("range").textContent = `${fmt(state.start)} to ${fmt(state.end)}`;
    $("primeCount").textContent = `${fmt(state.primes)} (${(100 * state.primes / state.count).toFixed(1)}%)`;
    const d = state.piSamples, N = state.end, piN = d.pi[d.pi.length - 1];
    $("piRatio").textContent = `${fmt(piN)} vs ${fmt(N / Math.log(N))} (ratio ${(piN / (N / Math.log(N))).toFixed(3)})`;
    $("gap").textContent = state.gap ? `${state.gap.size}, from ${fmt(state.gap.from)} to ${fmt(state.gap.to)}` : "fewer than two primes";
    updateSelReadout();
    const info = state.polyInfo;
    $("polyName").textContent = info ? info.text : "";
    if (!info) $("polyStat").textContent = "nothing";
    else if (info.kind === "bad") $("polyStat").textContent = "needs a > 0, or a = 0 and b > 0";
    else if (info.n === 0) $("polyStat").textContent = "no values in this range";
    else {
      const pct = Math.round(100 * info.p / info.n);
      let s = `${fmt(info.p)} of ${fmt(info.n)} values prime (${pct}%)`;
      if (info.kind === "factors") s += "; this formula factors, so it is almost never prime";
      else if (info.measured != null) {
        s = `${fmt(info.p)} of ${fmt(info.n)} values prime (${pct}%), ${info.measured.toFixed(2)}× random`;
        if (info.predicted === 0) s += "; a fixed factor rules out primes";
        else if (info.kind === "line") s += `; proven long-run ${info.predicted.toFixed(2)}×`;
        else s += `; conjecture F predicts ${info.predicted.toFixed(2)}×`;
      }
      $("polyStat").textContent = s;
    }
  }
  function updateSelReadout() {
    const v = state.sel;
    $("selStat").textContent = v === 1 ? "1, neither prime nor composite" : isPrime(v) ? `${fmt(v)}, prime` : `${fmt(v)} = ${factorText(factorise(v))}`;
  }

  // ---------- Selection ----------
  function select(v, how) {
    v = Math.max(state.start, Math.min(state.end, Math.round(v)));
    if (v === state.sel && how !== "force") return;
    state.sel = v;
    updateSelReadout();
    const prime = isPrime(v);
    WONDERS.sound(prime ? "tick" : "tick", { pitch: prime ? 0.9 : 0.25 });
    let text;
    if (v === 1) text = tr("Selected 1, which is neither prime nor composite.");
    else if (prime) text = tr(`Selected ${fmt(v)}, a prime.`);
    else text = tr(`Selected ${fmt(v)}, a composite number.`) + " " + fmt(v) + " = " + factorText(factorise(v)) + ".";
    WONDERS.describe(text);
  }

  function pickAt(mx, my) {
    const x = mx - SX, y = my - SY;
    if (x < 0 || y < 0 || x > S || y > S) return;
    if (state.mode === "square") {
      const cs = S / state.side, h = (state.side - 1) / 2;
      const col = Math.min(state.side - 1, Math.floor(x / cs)), row = Math.min(state.side - 1, Math.floor(y / cs));
      select(state.start + idxOf(col - h, h - row));
    } else {
      const k = sacksScale();
      const dx = x - S / 2, dy = S / 2 - y;
      const r = Math.hypot(dx, dy) / k;
      let th = Math.atan2(dy, dx) / (2 * Math.PI); if (th < 0) th += 1;
      let best = null, bd = Infinity;
      for (let t = -1; t <= 1; t++) {
        const s = Math.round(r - th) + t + th;
        if (s <= 0) continue;
        const v0 = Math.round(s * s);
        for (let v = v0 - 2; v <= v0 + 2; v++) {
          if (v < state.start || v > state.end) continue;
          const [px, py] = sacksXY(v);
          const dd = Math.hypot(px - x, py - y);
          if (dd < bd) { bd = dd; best = v; }
        }
      }
      if (best != null && bd < Math.max(12, k * 1.5)) select(best);
    }
  }
  canvas.addEventListener("click", (e) => {
    const r = canvas.getBoundingClientRect();
    pickAt((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height);
  });

  canvas.addEventListener("keydown", (e) => {
    let handled = true;
    if (state.mode === "square" && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      const h = (state.side - 1) / 2;
      let [x, y] = posOf(state.sel - state.start);
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") x -= step; if (e.key === "ArrowRight") x += step;
      if (e.key === "ArrowUp") y += step; if (e.key === "ArrowDown") y -= step;
      x = Math.max(-h, Math.min(h, x)); y = Math.max(-h, Math.min(h, y));
      select(state.start + idxOf(x, y));
    } else if (state.mode === "sacks" && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      const v = state.sel, s = Math.sqrt(v);
      if (e.key === "ArrowRight") select(v + (e.shiftKey ? 10 : 1));
      else if (e.key === "ArrowLeft") select(v - (e.shiftKey ? 10 : 1));
      else if (e.key === "ArrowUp") select(Math.round((s + 1) * (s + 1)));
      else select(Math.round(Math.max(0, s - 1) ** 2));
    } else if (e.key === "Enter") {
      if (state.mode === "square") traceDiagonal();
    } else if (e.key === "+" || e.key === "=") {
      setSize(state.side + (state.side < 61 ? 2 : 10));
    } else if (e.key === "-" || e.key === "_") {
      setSize(state.side - (state.side <= 61 ? 2 : 10));
    } else if (e.key === "Home") {
      select(state.start, "force");
    } else handled = false;
    if (handled) e.preventDefault();
  });
  canvas.addEventListener("focus", () => { needDraw = true; });
  canvas.addEventListener("blur", () => { needDraw = true; });

  // ---------- Challenges ----------
  function checkChallenges() {
    if (state.mode === "square" && state.start === 41 && state.poly === "euler") WONDERS.challenge("euler-line");
    const info = state.polyInfo;
    if (state.poly === "custom" && info && info.n >= 20 && info.p / info.n >= 0.4) WONDERS.challenge("rich-diagonal");
    if (state.gap && state.gap.size >= 100) WONDERS.challenge("big-gap");
  }

  // ---------- Controls ----------
  function setSize(side) {
    side = Math.max(11, Math.min(501, side | 1));
    $("size").value = side;
    state.side = side;
    rebuild();
  }
  $("size").addEventListener("input", (e) => { state.side = +e.target.value; rebuild(); });
  $("start").addEventListener("change", (e) => {
    let v = Math.round(+e.target.value);
    if (!isFinite(v) || v < 1) v = 1;
    v = Math.min(1000000, v);
    e.target.value = v;
    if (v === state.start) return;
    // Keep the same cell selected if it is still on screen.
    const off = state.sel - state.start;
    state.start = v;
    state.sel = v + off;
    rebuild();
    WONDERS.describe(tr(`The spiral now starts at ${fmt(state.start)} and ends at ${fmt(state.end)}. ${fmt(state.primes)} of the numbers shown are prime.`));
  });
  $("start").addEventListener("input", (e) => {
    // Apply typed values without waiting for blur, but not while the field is empty.
    if (e.target.value !== "" && +e.target.value >= 1) e.target.dispatchEvent(new Event("change"));
  });
  $("poly").addEventListener("change", (e) => {
    state.poly = e.target.value;
    computePoly(); view.dirty = true; updateReadouts(); checkChallenges();
    const info = state.polyInfo;
    if (info && info.n) WONDERS.describe(tr(`Highlighted ${info.n} values of the formula; ${info.p} of them are prime.`) + " f(n) = " + info.text, { now: true });
  });
  for (const id of ["polyA", "polyB", "polyC"]) {
    $(id).addEventListener("input", (e) => {
      if (e.target.value === "" || e.target.value === "-") return;
      const lim = { polyA: [0, 100], polyB: [-10000, 10000], polyC: [-10000000, 10000000] }[id];
      const v = Math.max(lim[0], Math.min(lim[1], Math.round(+e.target.value)));
      if (!isFinite(v)) return;
      state[{ polyA: "a", polyB: "b", polyC: "c" }[id]] = v;
      if (state.poly !== "custom") { state.poly = "custom"; $("poly").value = "custom"; }
      computePoly(); view.dirty = true; updateReadouts(); checkChallenges();
    });
  }
  $("trace").addEventListener("click", () => { traceDiagonal(); });
  $("random").addEventListener("change", (e) => {
    state.random = e.target.checked;
    view.dirty = true;
    WONDERS.sound("event", { pitch: state.random ? 0.3 : 0.7 });
    WONDERS.describe(state.random
      ? "Fair test on: random odd numbers with the same density as the primes are lit instead. The long diagonal streaks are gone."
      : "Fair test off: the real primes are lit again, with their diagonal streaks.", { now: true });
  });
  function setMode(m) {
    if (state.mode === m) return;
    state.mode = m;
    $("viewSquare").setAttribute("aria-pressed", String(m === "square"));
    $("viewSacks").setAttribute("aria-pressed", String(m === "sacks"));
    $("trace").disabled = m !== "square";
    view.dirty = true;
    startReveal();
    checkChallenges();
    WONDERS.describe(m === "square"
      ? "Square Ulam spiral: the numbers wind outward in square rings, and the primes gather on diagonals."
      : "Sacks spiral: each number n sits at distance √n from the centre, the perfect squares lie on the ray to the right, and the primes gather on curves.", { now: true });
  }
  $("viewSquare").addEventListener("click", () => setMode("square"));
  $("viewSacks").addEventListener("click", () => setMode("sacks"));

  WONDERS.describer(() => {
    const parts = [];
    parts.push(state.mode === "square"
      ? tr(`A square Ulam spiral of the numbers ${fmt(state.start)} to ${fmt(state.end)}, ${state.side} cells across, with ${fmt(state.primes)} primes lit.`)
      : tr(`A Sacks spiral of the numbers ${fmt(state.start)} to ${fmt(state.end)}, with ${fmt(state.primes)} primes lit and the perfect squares on the ray to the right.`));
    parts.push(tr(state.random ? "The fair test is on, so random odd numbers are lit instead of primes, and there are no long streaks."
      : state.mode === "square" ? "The primes crowd onto diagonal streaks and leave other lines empty." : "The primes gather on curved arcs and leave other arcs empty."));
    const info = state.polyInfo;
    if (info && info.n) parts.push(tr(`The highlighted formula has ${info.n} values here, of which ${info.p} are prime.`) + " f(n) = " + info.text + ".");
    const v = state.sel;
    parts.push(v === 1 ? tr("Selected 1, which is neither prime nor composite.") : isPrime(v) ? tr(`Selected ${fmt(v)}, a prime.`) : tr(`Selected ${fmt(v)}, a composite number.`) + " " + fmt(v) + " = " + factorText(factorise(v)) + ".");
    return parts.join(" ");
  });

  // ---------- Loop ----------
  let needDraw = true, lastSel = -1, lastRevealing = false;
  function startReveal() {
    if (Lab.reducedMotion) { view.reveal = 1; return; }
    view.reveal = 0; view.revealStart = performance.now();
  }
  function frame(now) {
    if (view.reveal < 1) {
      view.reveal = Math.min(1, (now - view.revealStart) / 750);
      view.reveal = 1 - Math.pow(1 - view.reveal, 2);
      if ((now - view.revealStart) >= 750) view.reveal = 1;
      needDraw = true;
    }
    if (view.dirty || needDraw || state.sel !== lastSel || lastRevealing) {
      draw(now);
      needDraw = false; lastSel = state.sel;
    }
    lastRevealing = view.reveal < 1;
    requestAnimationFrame(frame);
  }
  // Redraw whenever a readout changes (cheap enough to do on any input).
  document.querySelector(".controls").addEventListener("input", () => { needDraw = true; });
  document.querySelector(".controls").addEventListener("change", () => { needDraw = true; });
  document.querySelector(".controls").addEventListener("click", () => { needDraw = true; });

  // Re-layout when the bench changes width; the state is kept.
  let lastCW = 0;
  function onResize() {
    const cw = Math.round(canvas.parentElement.clientWidth);
    if (cw === lastCW) return;
    lastCW = cw;
    layout();
    needDraw = true;
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvas.parentElement);
  else window.addEventListener("resize", onResize);

  layout();
  rebuild();
  startReveal();
  requestAnimationFrame(frame);
})();
