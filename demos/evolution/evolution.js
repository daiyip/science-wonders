(function () {
  const W = 960, H = 460;
  const canvas = document.getElementById("bench");
  const ctx = Lab.setupCanvas(canvas, W, H);
  const $ = (id) => document.getElementById(id);

  // Layout (logical pixels)
  const HX = 14, HY = 14, HW = 600, HH = 432;          // habitat
  const PX = 640, PW = 306;                             // chart column
  const C1 = { y: 34, h: 92 }, C2 = { y: 176, h: 72 }, C3 = { y: 300, h: 140 };
  const BINS = 20;

  // Rules of the world. Selection comes only from these.
  const N = 100;                 // population restored each generation
  const GEN_TICKS = 900;         // length of one generation
  const VIEW = 105;              // hawk sight radius (px)
  const HAWK_SEARCH_V = 1.5, HAWK_CHASE_V = 2.9;
  const CHASE_MAX = 75, EAT_TICKS = 45;
  const SPEED_COST = 0.3;        // fecundity = 1 - SPEED_COST * speed
  const ENVS = {
    sand:   { tone: 0.86, name: "Pale sand" },
    litter: { tone: 0.5,  name: "Leaf litter" },
    soot:   { tone: 0.12, name: "Sooty bark" },
  };

  const state = {
    env: "sand", hawks: 3, mut: 0.03, speed: 6, running: true,
    gen: 0, tick: 0, eaten: 0,
    pop: [], preds: [], puffs: [],
    startShade: new Array(BINS).fill(0), startSpeed: new Array(BINS).fill(0),
    history: [],
  };

  // ---------- Helpers ----------
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  function gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  // Shade 0..1 to a colour: soot black, through leaf brown, to pale sand.
  const DARK = [30, 27, 24], MID = [122, 100, 66], LIGHT = [234, 220, 184];
  function shadeRGB(t) {
    t = clamp01(t);
    const [a, b, u] = t < 0.5 ? [DARK, MID, t / 0.5] : [MID, LIGHT, (t - 0.5) / 0.5];
    return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * u));
  }
  const shadeCSS = (t, a = 1) => { const [r, g, b] = shadeRGB(t); return `rgba(${r},${g},${b},${a})`; };
  const bgTone = () => ENVS[state.env].tone;

  // ---------- Background texture ----------
  const ground = document.createElement("canvas");
  const gctx = Lab.setupCanvas(ground, HW, HH);
  function paintGround() {
    const t = bgTone();
    gctx.fillStyle = shadeCSS(t);
    gctx.fillRect(0, 0, HW, HH);
    // Mottling close to the base tone, so a well-matched creature really does blend in.
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * HW, y = Math.random() * HH;
      const r = 1 + Math.random() * 5;
      gctx.fillStyle = shadeCSS(t + (Math.random() - 0.5) * 0.16, 0.55);
      gctx.beginPath(); gctx.ellipse(x, y, r * 1.6, r, Math.random() * 3, 0, Math.PI * 2); gctx.fill();
    }
  }

  // ---------- Population ----------
  function newCreature(shade, speed) {
    return {
      x: HX + 8 + Math.random() * (HW - 16), y: HY + 8 + Math.random() * (HH - 16),
      a: Math.random() * Math.PI * 2, shade: clamp01(shade), speed: clamp01(speed),
      alive: true, fleeing: null,
    };
  }
  function newPopulation() {
    state.pop = [];
    for (let i = 0; i < N; i++) state.pop.push(newCreature(0.42 + gauss() * 0.16, 0.3 + gauss() * 0.14));
    state.gen = 0; state.tick = 0; state.eaten = 0; state.history = []; state.puffs = [];
    snapshotStart();
    record();
  }
  function placeHawks() {
    while (state.preds.length < state.hawks) {
      state.preds.push({
        x: HX + Math.random() * HW, y: HY + Math.random() * HH,
        a: Math.random() * Math.PI * 2, mode: "search", target: null, t: 0, cool: 0,
      });
    }
    while (state.preds.length > state.hawks) {
      const p = state.preds.pop();
      if (p.target) p.target.fleeing = null;
    }
  }

  function binsOf(key) {
    const b = new Array(BINS).fill(0);
    for (const c of state.pop) if (c.alive) b[Math.min(BINS - 1, Math.floor(c[key] * BINS))]++;
    return b;
  }
  function snapshotStart() { state.startShade = binsOf("shade"); state.startSpeed = binsOf("speed"); }
  function means() {
    let s = 0, v = 0, n = 0;
    for (const c of state.pop) if (c.alive) { s += c.shade; v += c.speed; n++; }
    return n ? { shade: s / n, speed: v / n, n } : { shade: NaN, speed: NaN, n: 0 };
  }
  function record() {
    const m = means();
    state.history.push({ shade: m.shade, speed: m.speed, tone: bgTone() });
    if (state.history.length > 400) state.history.shift();
  }

  // Survivors breed. Each baby copies one parent, chosen in proportion to how many young it can afford.
  function nextGeneration() {
    const survivors = state.pop.filter((c) => c.alive);
    const parents = survivors.length ? survivors : state.pop;
    const w = parents.map((c) => 1 - SPEED_COST * c.speed);
    const total = w.reduce((a, b) => a + b, 0);
    const kids = [];
    for (let i = 0; i < N; i++) {
      let r = Math.random() * total, k = 0;
      while (k < parents.length - 1 && (r -= w[k]) > 0) k++;
      const p = parents[k];
      kids.push(newCreature(p.shade + gauss() * state.mut, p.speed + gauss() * state.mut));
    }
    state.pop = kids;
    for (const h of state.preds) { h.mode = "search"; h.target = null; h.cool = 0; }
    state.gen++; state.tick = 0; state.eaten = 0;
    snapshotStart();
    record();
  }

  // ---------- One tick of the world ----------
  function step() {
    const tone = bgTone();
    // Creatures
    for (const c of state.pop) {
      if (!c.alive) continue;
      if (c.fleeing) {
        const h = c.fleeing;
        const dx = c.x - h.x, dy = c.y - h.y, d = Math.hypot(dx, dy) || 1;
        const v = 1.0 + 2.4 * c.speed;
        c.a = Math.atan2(dy, dx);
        c.x += dx / d * v; c.y += dy / d * v;
      } else {
        c.a += (Math.random() - 0.5) * 0.5;
        c.x += Math.cos(c.a) * 0.22; c.y += Math.sin(c.a) * 0.22;
      }
      if (c.x < HX + 4) { c.x = HX + 4; c.a = Math.PI - c.a; }
      if (c.x > HX + HW - 4) { c.x = HX + HW - 4; c.a = Math.PI - c.a; }
      if (c.y < HY + 4) { c.y = HY + 4; c.a = -c.a; }
      if (c.y > HY + HH - 4) { c.y = HY + HH - 4; c.a = -c.a; }
    }
    // Hawks
    for (const h of state.preds) {
      if (h.mode === "eat") {
        if (--h.t <= 0) { h.mode = "search"; h.cool = 10; }
        continue;
      }
      if (h.mode === "chase") {
        const c = h.target;
        const dx = c.x - h.x, dy = c.y - h.y, d = Math.hypot(dx, dy);
        h.a = Math.atan2(dy, dx);
        h.x += Math.cos(h.a) * HAWK_CHASE_V; h.y += Math.sin(h.a) * HAWK_CHASE_V;
        h.t++;
        if (d < 7) {
          c.alive = false; c.fleeing = null;
          state.eaten++;
          state.puffs.push({ x: c.x, y: c.y, shade: c.shade, t: 0 });
          h.mode = "eat"; h.t = EAT_TICKS; h.target = null;
        } else if (h.t > CHASE_MAX || d > VIEW * 1.4) {
          c.fleeing = null; h.mode = "search"; h.target = null; h.cool = 25;
        }
        continue;
      }
      // Searching: drift about, bounce off the edges.
      h.a += (Math.random() - 0.5) * 0.18;
      h.x += Math.cos(h.a) * HAWK_SEARCH_V; h.y += Math.sin(h.a) * HAWK_SEARCH_V;
      if (h.x < HX + 10 || h.x > HX + HW - 10) { h.a = Math.PI - h.a; h.x = Math.max(HX + 10, Math.min(HX + HW - 10, h.x)); }
      if (h.y < HY + 10 || h.y > HY + HH - 10) { h.a = -h.a; h.y = Math.max(HY + 10, Math.min(HY + HH - 10, h.y)); }
      if (h.cool > 0) { h.cool--; continue; }
      // Glance at one random creature in range. The chance of noticing it rises with contrast.
      const seen = [];
      for (const c of state.pop) {
        if (c.alive && !c.fleeing && Math.abs(c.x - h.x) < VIEW && Math.abs(c.y - h.y) < VIEW &&
            Math.hypot(c.x - h.x, c.y - h.y) < VIEW) seen.push(c);
      }
      if (!seen.length) continue;
      const c = seen[Math.floor(Math.random() * seen.length)];
      const contrast = Math.abs(c.shade - tone);
      if (Math.random() < 0.01 + 0.9 * contrast * contrast) {
        h.mode = "chase"; h.target = c; h.t = 0; c.fleeing = h;
      }
    }
    for (const p of state.puffs) p.t++;
    state.puffs = state.puffs.filter((p) => p.t < 40);
    if (++state.tick >= GEN_TICKS) nextGeneration();
  }

  // ---------- Drawing ----------
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  function drawHabitat() {
    ctx.save();
    ctx.beginPath(); ctx.rect(HX, HY, HW, HH); ctx.clip();
    ctx.drawImage(ground, HX, HY, HW, HH);
    // Creatures
    for (const c of state.pop) {
      if (!c.alive) continue;
      ctx.save();
      ctx.translate(c.x, c.y); ctx.rotate(c.a);
      ctx.fillStyle = shadeCSS(c.shade);
      ctx.beginPath(); ctx.ellipse(0, 0, 5.2, 3.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shadeCSS(c.shade * 0.85);
      ctx.beginPath(); ctx.arc(4.6, 0, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Feathers where something was eaten
    for (const p of state.puffs) {
      const a = 1 - p.t / 40;
      ctx.strokeStyle = shadeCSS(p.shade, a);
      for (let k = 0; k < 6; k++) {
        const ang = k * 1.05, r = 4 + p.t * 0.35;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(ang) * r * 0.5, p.y + Math.sin(ang) * r * 0.5);
        ctx.lineTo(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r);
        ctx.stroke();
      }
    }
    // Hawks
    for (const h of state.preds) {
      ctx.strokeStyle = h.mode === "chase" ? "rgba(240,90,70,0.55)" : "rgba(13,20,32,0.22)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(h.x, h.y, VIEW, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(h.x, h.y); ctx.rotate(h.a);
      ctx.fillStyle = h.mode === "eat" ? "#c76a3a" : "#e0573f";
      ctx.strokeStyle = "#0d1420"; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(10, 0); ctx.lineTo(-2, -12); ctx.lineTo(-5, -3); ctx.lineTo(-10, -4);
      ctx.lineTo(-8, 0); ctx.lineTo(-10, 4); ctx.lineTo(-5, 3); ctx.lineTo(-2, 12); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.lineWidth = 1;
    }
    ctx.restore();
    // Frame and label
    ctx.strokeStyle = "#26324a";
    ctx.strokeRect(HX + 0.5, HY + 0.5, HW - 1, HH - 1);
    const label = ENVS[state.env].name.toUpperCase() + " · GEN " + state.gen;
    ctx.font = "11px " + MONO;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(5,8,14,0.72)";
    ctx.fillRect(HX + 8, HY + 8, tw + 14, 20);
    ctx.fillStyle = "#c9d4e3";
    ctx.textAlign = "left";
    ctx.fillText(label, HX + 15, HY + 22);
    // Generation progress bar
    ctx.fillStyle = "rgba(5,8,14,0.6)";
    ctx.fillRect(HX, HY + HH - 4, HW, 4);
    ctx.fillStyle = "#8fa6ff";
    ctx.fillRect(HX, HY + HH - 4, HW * state.tick / GEN_TICKS, 4);
  }

  function histogram(cy, ch, bins, start, colourFor, title, leftLab, rightLab, marker) {
    ctx.fillStyle = "#7f8ea6";
    ctx.font = "11px " + MONO;
    ctx.textAlign = "left";
    ctx.fillText(title, PX, cy - 12);
    const bw = PW / BINS;
    const max = Math.max(8, ...bins, ...start);
    const base = cy + ch;
    for (let i = 0; i < BINS; i++) {
      if (!bins[i]) continue;
      const h = bins[i] / max * ch;
      ctx.fillStyle = colourFor(i);
      ctx.fillRect(PX + i * bw + 1, base - h, bw - 2, h);
      ctx.strokeStyle = "rgba(201,212,227,0.28)";
      ctx.strokeRect(PX + i * bw + 1.5, base - h + 0.5, bw - 3, h - 0.5);
    }
    // Outline: the distribution at the start of this generation
    ctx.strokeStyle = "rgba(201,212,227,0.55)";
    ctx.beginPath();
    for (let i = 0; i < BINS; i++) {
      const y = base - start[i] / max * ch;
      if (i === 0) ctx.moveTo(PX, y); else ctx.lineTo(PX + i * bw, y);
      ctx.lineTo(PX + (i + 1) * bw, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "#26324a";
    ctx.beginPath(); ctx.moveTo(PX, base + 0.5); ctx.lineTo(PX + PW, base + 0.5); ctx.stroke();
    ctx.fillStyle = "#56647c";
    ctx.font = "10px " + MONO;
    ctx.fillText(leftLab, PX, base + 13);
    ctx.textAlign = "right";
    ctx.fillText(rightLab, PX + PW, base + 13);
    if (marker != null) {
      const mx = PX + marker * PW;
      ctx.fillStyle = "#f0b35a";
      ctx.beginPath(); ctx.moveTo(mx, base + 2); ctx.lineTo(mx - 5, base + 9); ctx.lineTo(mx + 5, base + 9); ctx.closePath(); ctx.fill();
      ctx.textAlign = "center";
      ctx.fillText("ground", Math.max(PX + 22, Math.min(PX + PW - 22, mx)), base + 21);
    }
  }

  function drawHistory() {
    const { y, h } = C3;
    ctx.fillStyle = "#7f8ea6";
    ctx.font = "11px " + MONO;
    ctx.textAlign = "left";
    ctx.fillText("AVERAGE TRAITS BY GENERATION", PX, y - 12);
    ctx.strokeStyle = "#1a2436";
    for (const f of [0, 0.5, 1]) {
      ctx.beginPath(); ctx.moveTo(PX, y + h - f * h + 0.5); ctx.lineTo(PX + PW, y + h - f * h + 0.5); ctx.stroke();
    }
    const hist = state.history;
    const span = Math.max(30, hist.length - 1);
    const from = Math.max(0, hist.length - 1 - span);
    const X = (i) => PX + (i - from) / span * PW;
    const Y = (v) => y + h - v * h;
    // Ground tone, as a step line
    ctx.strokeStyle = "#f0b35a";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let i = from; i < hist.length; i++) {
      if (i === from) ctx.moveTo(X(i), Y(hist[i].tone));
      else { ctx.lineTo(X(i), Y(hist[i - 1].tone)); ctx.lineTo(X(i), Y(hist[i].tone)); }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const line = (key, col, w) => {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath();
      let started = false;
      for (let i = from; i < hist.length; i++) {
        const v = hist[i][key];
        if (!isFinite(v)) continue;
        if (!started) { ctx.moveTo(X(i), Y(v)); started = true; } else ctx.lineTo(X(i), Y(v));
      }
      ctx.stroke(); ctx.lineWidth = 1;
    };
    line("speed", "#7fb2ff", 1.5);
    line("shade", "#e9eef7", 2);
    ctx.font = "10px " + MONO;
    ctx.fillStyle = "#56647c";
    ctx.textAlign = "left";
    ctx.fillText("gen " + from, PX, y + h + 13);
    ctx.textAlign = "right";
    ctx.fillText("gen " + (from + span), PX + PW, y + h + 13);
    // Legend
    ctx.textAlign = "left";
    const ly = y + h + 13;
    const items = [["colour", "#e9eef7"], ["speed", "#7fb2ff"], ["ground", "#f0b35a"]];
    let lx = PX + 70;
    for (const [t, col] of items) {
      ctx.fillStyle = col; ctx.fillRect(lx, ly - 4, 10, 2);
      ctx.fillStyle = "#7f8ea6"; ctx.fillText(t, lx + 14, ly);
      lx += 62;
    }
  }

  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    drawHabitat();
    histogram(C1.y, C1.h, binsOf("shade"), state.startShade,
      (i) => shadeCSS((i + 0.5) / BINS), "COLOUR OF LIVING CREATURES", "dark", "pale", bgTone());
    histogram(C2.y, C2.h, binsOf("speed"), state.startSpeed,
      () => "#7fb2ff", "RUNNING SPEED", "slow", "fast", null);
    drawHistory();
  }

  function updateReadouts() {
    const m = means();
    $("gen").textContent = state.gen;
    $("alive").textContent = m.n;
    $("eaten").textContent = state.eaten;
    $("meanShade").textContent = isFinite(m.shade) ? m.shade.toFixed(2) + " (ground " + bgTone().toFixed(2) + ")" : "–";
    $("meanSpeed").textContent = isFinite(m.speed) ? m.speed.toFixed(2) : "–";
  }

  // ---------- Loop ----------
  let frameNo = 0;
  function frame() {
    if (state.running) for (let i = 0; i < state.speed; i++) step();
    draw();
    if (++frameNo % 5 === 0 || !state.running) updateReadouts();
    requestAnimationFrame(frame);
  }

  // ---------- Controls ----------
  const hint = (t) => { $("hint").textContent = t; };
  function setEnv(env, announce) {
    const before = state.env;
    state.env = env;
    for (const [id, e] of [["envSand", "sand"], ["envLitter", "litter"], ["envSoot", "soot"]]) {
      $(id).setAttribute("aria-pressed", String(e === env));
    }
    paintGround();
    if (state.history.length) state.history[state.history.length - 1].tone = bgTone();
    if (announce && before !== env) {
      hint(env === "soot"
        ? "The trees are black with soot. The pale creatures that were safe a moment ago now stand out. Watch the colour histogram slide left."
        : env === "sand"
          ? "The ground is pale again, as when clean-air laws cleared the soot. Now the dark creatures are easy to spot."
          : "A mid-brown floor. Both extremes now stand out, so selection squeezes the population toward the middle.");
    }
    if (!state.running) { draw(); updateReadouts(); }
  }
  $("envSand").addEventListener("click", () => setEnv("sand", true));
  $("envLitter").addEventListener("click", () => setEnv("litter", true));
  $("envSoot").addEventListener("click", () => setEnv("soot", true));
  $("envChange").addEventListener("click", () => setEnv(state.env === "soot" ? "sand" : "soot", true));

  $("predators").addEventListener("input", (e) => {
    state.hawks = +e.target.value;
    $("predatorsOut").textContent = state.hawks === 0 ? "none" : state.hawks + (state.hawks === 1 ? " hawk" : " hawks");
    placeHawks();
    if (state.hawks === 0) hint("No hawks: nothing removes the conspicuous creatures, so colour drifts at random and speed slowly falls because it costs offspring.");
    if (!state.running) draw();
  });
  $("mutation").addEventListener("input", (e) => {
    state.mut = +e.target.value;
    $("mutationOut").textContent = "± " + state.mut.toFixed(3);
  });
  $("speed").addEventListener("input", (e) => {
    state.speed = +e.target.value;
    $("speedOut").textContent = state.speed + "×";
  });
  function setRunning(on) {
    state.running = on;
    $("play").textContent = on ? "Pause" : "Play";
  }
  $("play").addEventListener("click", () => setRunning(!state.running));
  $("skip").addEventListener("click", () => {
    const target = state.gen + 10;
    let guard = 0;
    while (state.gen < target && guard++ < GEN_TICKS * 11) step();
    draw(); updateReadouts();
  });
  $("reset").addEventListener("click", () => {
    newPopulation(); draw(); updateReadouts();
    hint("A fresh, varied population. Every run differs, because the hawks and the mutations are random, but the outcome on each background is the same.");
  });

  // ---------- Start ----------
  paintGround();
  placeHawks();
  newPopulation();
  // Run a little so the first view already has some history.
  for (let i = 0; i < GEN_TICKS * 6 + 300; i++) step();
  if (Lab.reducedMotion) {
    for (let i = 0; i < GEN_TICKS * 10; i++) step();
    setRunning(false);
    hint("Animation is paused because your system asks for reduced motion. Use Skip 10 generations to step forward, or press Play.");
  } else {
    setRunning(true);
  }
  draw();
  updateReadouts();
  requestAnimationFrame(frame);
})();
