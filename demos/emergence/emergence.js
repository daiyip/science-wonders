(function () {
  const W = 960, H = 520;
  const canvas = document.getElementById("bench");
  const ctx = Lab.setupCanvas(canvas, W, H);
  const $ = (id) => document.getElementById(id);
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";

  // World on the left, rules panel on the right.
  const WX = 14, WY = 15, WW = 700, WH = 490;
  const PX = 736, PW = 210;

  const state = { mode: "life", running: true };

  // =====================================================================
  // Game of Life
  // =====================================================================
  const CELL = 7;
  const VW = WW / CELL, VH = WH / CELL;     // visible cells: 100 x 70
  const M = 40;                              // hidden margin on every side
  const GW = VW + 2 * M, GH = VH + 2 * M;
  let cur = new Uint8Array(GW * GH), nxt = new Uint8Array(GW * GH);
  let age = new Uint16Array(GW * GH);
  const life = { gen: 0, speed: 15, acc: 0, pop: [], painting: null, last: null };

  const idx = (x, y) => (y + M) * GW + (x + M);   // visible coords to array index

  function lifeStep() {
    // The outermost ring of the hidden grid stays dead, so escaping gliders die far from view.
    for (let y = 1; y < GH - 1; y++) {
      const row = y * GW;
      for (let x = 1; x < GW - 1; x++) {
        const i = row + x;
        const n = cur[i - GW - 1] + cur[i - GW] + cur[i - GW + 1] +
                  cur[i - 1] + cur[i + 1] +
                  cur[i + GW - 1] + cur[i + GW] + cur[i + GW + 1];
        const alive = cur[i] ? (n === 2 || n === 3) : n === 3;   // the whole rulebook
        nxt[i] = alive ? 1 : 0;
        age[i] = alive ? Math.min(age[i] + 1, 999) : 0;
      }
    }
    [cur, nxt] = [nxt, cur];
    life.gen++;
    life.pop.push(countVisible());
    if (life.pop.length > 200) life.pop.shift();
  }
  function countVisible() {
    let n = 0;
    for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) n += cur[idx(x, y)];
    return n;
  }
  function lifeClear() {
    cur.fill(0); nxt.fill(0); age.fill(0);
    life.gen = 0; life.pop = [0];
  }
  function stamp(cells, ox, oy) {
    for (const [x, y] of cells) { const i = idx(ox + x, oy + y); cur[i] = 1; age[i] = 1; }
    life.pop = [countVisible()];
  }
  const GLIDER = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
  const R_PENT = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]];
  const GUN = [
    [24, 0], [22, 1], [24, 1],
    [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2],
    [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3],
    [0, 4], [1, 4], [10, 4], [16, 4], [20, 4], [21, 4],
    [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5], [22, 5], [24, 5],
    [10, 6], [16, 6], [24, 6],
    [11, 7], [15, 7],
    [12, 8], [13, 8],
  ];
  const PRESETS = {
    glider: { cells: GLIDER, at: [10, 8], hint: "Five cells that rebuild themselves one square further along every 4 generations. Nobody wrote a rule about moving." },
    gun: { cells: GUN, at: [6, 4], hint: "Gosper's glider gun: two shuttles bounce back and forth and fire a glider every 30 generations. Its gliders fly off the grid forever, so the population never stops growing." },
    r: { cells: R_PENT, at: [48, 33], hint: "Just five cells. On an unlimited grid the R-pentomino churns for 1,103 generations, throwing off six gliders, before it settles. Here the edges cut it short." },
  };
  function loadPreset(name) {
    lifeClear();
    if (name === "random") {
      for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
        if (Math.random() < 0.3) { const i = idx(x, y); cur[i] = 1; age[i] = 1 + Math.floor(Math.random() * 3); }
      }
      life.pop = [countVisible()];
      hint("A random soup. Most of it burns out within a few hundred generations, leaving blinkers, blocks and the occasional glider sailing away.");
    } else {
      const p = PRESETS[name];
      stamp(p.cells, p.at[0], p.at[1]);
      hint(p.hint);
    }
    draw(); updateReadouts();
  }

  function drawLife() {
    ctx.fillStyle = "#070b13";
    ctx.fillRect(WX, WY, WW, WH);
    ctx.strokeStyle = "#0e1522";
    ctx.beginPath();
    for (let x = 0; x <= VW; x++) { ctx.moveTo(WX + x * CELL + 0.5, WY); ctx.lineTo(WX + x * CELL + 0.5, WY + WH); }
    for (let y = 0; y <= VH; y++) { ctx.moveTo(WX, WY + y * CELL + 0.5); ctx.lineTo(WX + WW, WY + y * CELL + 0.5); }
    ctx.stroke();
    for (let y = 0; y < VH; y++) {
      for (let x = 0; x < VW; x++) {
        const i = idx(x, y);
        if (!cur[i]) continue;
        const a = age[i];
        ctx.fillStyle = a <= 1 ? "#b8f0ff" : a < 4 ? "#7fd0ff" : a < 20 ? "#5f9cff" : "#4a6fd8";
        ctx.fillRect(WX + x * CELL + 1, WY + y * CELL + 1, CELL - 1, CELL - 1);
      }
    }
  }

  // Drawing cells with a mouse or finger. Map through the CSS scale.
  function cellAt(e) {
    const r = canvas.getBoundingClientRect();
    const X = (e.clientX - r.left) * (W / r.width);
    const Y = (e.clientY - r.top) * (H / r.height);
    const cx = Math.floor((X - WX) / CELL), cy = Math.floor((Y - WY) / CELL);
    return (cx >= 0 && cy >= 0 && cx < VW && cy < VH) ? [cx, cy] : null;
  }
  function paintLine(a, b, v) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
    for (let k = 0; k <= n; k++) {
      const x = Math.round(a[0] + (b[0] - a[0]) * k / n), y = Math.round(a[1] + (b[1] - a[1]) * k / n);
      const i = idx(x, y); cur[i] = v; age[i] = v ? 1 : 0;
    }
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (state.mode !== "life") return;
    const c = cellAt(e);
    if (!c) return;
    e.preventDefault();
    life.painting = cur[idx(c[0], c[1])] ? 0 : 1;
    life.last = c;
    paintLine(c, c, life.painting);
    canvas.setPointerCapture(e.pointerId);
    draw(); updateReadouts();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (state.mode !== "life" || life.painting === null) return;
    const c = cellAt(e);
    if (!c) return;
    paintLine(life.last, c, life.painting);
    life.last = c;
    draw();
  });
  const endPaint = () => { if (life.painting !== null) { life.painting = null; life.pop.push(countVisible()); updateReadouts(); } };
  canvas.addEventListener("pointerup", endPaint);
  canvas.addEventListener("pointercancel", endPaint);

  // =====================================================================
  // Boids
  // =====================================================================
  const VIEW = 50, PERSONAL = 20, MAX_V = 3, MAX_F = 0.06;
  const boids = { list: [], sep: 1.5, ali: 1.0, coh: 1.0, n: 200, hawk: null, order: [], flocks: null };

  function addBoid() {
    const a = Math.random() * Math.PI * 2;
    boids.list.push({ x: Math.random() * WW, y: Math.random() * WH, vx: Math.cos(a) * MAX_V * 0.7, vy: Math.sin(a) * MAX_V * 0.7 });
  }
  function setBoidCount(n) {
    boids.n = n;
    while (boids.list.length < n) addBoid();
    boids.list.length = n;
  }
  const wrapD = (d, span) => (d > span / 2 ? d - span : d < -span / 2 ? d + span : d);
  function limit(vx, vy, m) {
    const s = Math.hypot(vx, vy);
    return s > m ? [vx / s * m, vy / s * m] : [vx, vy];
  }
  // Classic steering: aim for a desired velocity at full speed, apply the difference, capped.
  function steer(dx, dy, b) {
    const s = Math.hypot(dx, dy);
    if (s === 0) return [0, 0];
    return limit(dx / s * MAX_V - b.vx, dy / s * MAX_V - b.vy, MAX_F);
  }

  function boidsStep() {
    const L = boids.list;
    const acc = [];
    for (const b of L) {
      let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, n = 0, ns = 0;
      for (const o of L) {
        if (o === b) continue;
        const dx = wrapD(o.x - b.x, WW), dy = wrapD(o.y - b.y, WH);
        if (dx > VIEW || dx < -VIEW || dy > VIEW || dy < -VIEW) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 > VIEW * VIEW) continue;
        n++;
        ax += o.vx; ay += o.vy;           // rule 2: alignment
        cx += dx; cy += dy;               // rule 3: cohesion (relative centre)
        if (d2 < PERSONAL * PERSONAL) {   // rule 1: separation, stronger when closer
          const d = Math.sqrt(d2) || 0.01;
          sx -= dx / d / d; sy -= dy / d / d; ns++;
        }
      }
      let fx = 0, fy = 0;
      if (ns) { const [x, y] = steer(sx, sy, b); fx += x * boids.sep; fy += y * boids.sep; }
      if (n) {
        const [x1, y1] = steer(ax / n, ay / n, b); fx += x1 * boids.ali; fy += y1 * boids.ali;
        const [x2, y2] = steer(cx / n, cy / n, b); fx += x2 * boids.coh; fy += y2 * boids.coh;
      }
      if (boids.hawk) {                   // rule 4: flee the predator
        const dx = wrapD(boids.hawk.x - b.x, WW), dy = wrapD(boids.hawk.y - b.y, WH);
        const d = Math.hypot(dx, dy);
        if (d < 80) { const [x, y] = steer(-dx, -dy, b); fx += x * 4; fy += y * 4; }
      }
      acc.push([fx, fy]);
    }
    for (let i = 0; i < L.length; i++) {
      const b = L[i];
      b.vx += acc[i][0]; b.vy += acc[i][1];
      [b.vx, b.vy] = limit(b.vx, b.vy, MAX_V);
      // Birds keep a minimum cruising speed.
      const s = Math.hypot(b.vx, b.vy);
      if (s < 1.2) { const a = s ? 1.2 / s : 1; b.vx = (b.vx || 0.5) * a; b.vy = (b.vy || 0.5) * a; }
      b.x = (b.x + b.vx + WW) % WW; b.y = (b.y + b.vy + WH) % WH;
    }
    // The hawk chases the nearest bird, a little faster than they fly.
    const h = boids.hawk;
    if (h) {
      let best = null, bd = Infinity;
      for (const b of L) {
        const dx = wrapD(b.x - h.x, WW), dy = wrapD(b.y - h.y, WH), d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = [dx, dy]; }
      }
      if (best) {
        const s = Math.hypot(best[0], best[1]) || 1;
        h.vx += (best[0] / s * 3.4 - h.vx) * 0.04; h.vy += (best[1] / s * 3.4 - h.vy) * 0.04;
      }
      h.x = (h.x + h.vx + WW) % WW; h.y = (h.y + h.vy + WH) % WH;
    }
    boids.tick = (boids.tick || 0) + 1;
    if (boids.tick % 4 === 0) { boids.order.push(alignment()); if (boids.order.length > 200) boids.order.shift(); }
    if (boids.tick % 20 === 0) boids.flocks = countFlocks();
  }

  // 1 = everyone flying the same way, near 0 = random headings.
  function alignment() {
    let x = 0, y = 0;
    for (const b of boids.list) { const s = Math.hypot(b.vx, b.vy) || 1; x += b.vx / s; y += b.vy / s; }
    return boids.list.length ? Math.hypot(x, y) / boids.list.length : 0;
  }
  // Groups of 3 or more birds linked by gaps under 30 px.
  function countFlocks() {
    const L = boids.list, n = L.length, parent = new Int32Array(n);
    for (let i = 0; i < n; i++) parent[i] = i;
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = wrapD(L[j].x - L[i].x, WW), dy = wrapD(L[j].y - L[i].y, WH);
      if (dx * dx + dy * dy < 900) parent[find(i)] = find(j);
    }
    const size = new Map();
    for (let i = 0; i < n; i++) { const r = find(i); size.set(r, (size.get(r) || 0) + 1); }
    let k = 0;
    for (const s of size.values()) if (s >= 3) k++;
    return k;
  }

  function drawBoids() {
    ctx.fillStyle = "#070b13";
    ctx.fillRect(WX, WY, WW, WH);
    ctx.save();
    ctx.beginPath(); ctx.rect(WX, WY, WW, WH); ctx.clip();
    for (const b of boids.list) {
      const a = Math.atan2(b.vy, b.vx);
      const hue = Math.round((a * 180 / Math.PI + 360) % 360);
      ctx.fillStyle = `hsl(${hue}, 70%, 68%)`;
      ctx.save();
      ctx.translate(WX + b.x, WY + b.y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -3.2); ctx.lineTo(-2, 0); ctx.lineTo(-4, 3.2); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    const h = boids.hawk;
    if (h) {
      ctx.strokeStyle = "rgba(255,107,90,0.35)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(WX + h.x, WY + h.y, 80, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(WX + h.x, WY + h.y); ctx.rotate(Math.atan2(h.vy, h.vx));
      ctx.fillStyle = "#ff6b5a";
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -7); ctx.lineTo(-4, 0); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // =====================================================================
  // Rules panel (shared)
  // =====================================================================
  function wrapText(text, x, y, maxW, lh) {
    const words = text.split(" ");
    let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; }
      else line = t;
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  }
  function drawPanel() {
    ctx.textAlign = "left";
    ctx.font = "11px " + MONO;
    ctx.fillStyle = "#7f8ea6";
    ctx.fillText("THE COMPLETE RULES", PX, WY + 12);
    let y = WY + 34;
    ctx.font = "12px " + SANS;
    ctx.fillStyle = "#97a6b9";
    const isLife = state.mode === "life";
    y = wrapText(isLife ? "Every cell counts its 8 neighbours, then all cells update together."
                        : "Every bird looks only at birds within 50 px.", PX, y, PW, 16) + 8;
    const rules = isLife
      ? [["Birth", "an empty cell with exactly 3 live neighbours comes alive"],
         ["Survival", "a live cell with 2 or 3 live neighbours stays alive"],
         ["Death", "any other cell is empty next turn"]]
      : [["Separation", "steer away from birds that are too close"],
         ["Alignment", "turn toward their average heading"],
         ["Cohesion", "steer toward their average position"]];
    if (!isLife && boids.hawk) rules.push(["Flee", "turn away from a hawk within 80 px"]);
    rules.forEach(([name, text], i) => {
      ctx.fillStyle = i === 3 ? "#ff6b5a" : "#8fa6ff";
      ctx.font = "500 12px " + MONO;
      ctx.fillText((i + 1) + "  " + name.toUpperCase(), PX, y);
      ctx.fillStyle = "#c9d4e3";
      ctx.font = "12px " + SANS;
      y = wrapText(text, PX + 20, y + 16, PW - 20, 15) + 8;
    });

    // What comes out
    y = Math.max(y + 6, 300);
    ctx.font = "11px " + MONO;
    ctx.fillStyle = "#7f8ea6";
    ctx.fillText("WHAT COMES OUT", PX, y);
    y += 22;
    const rows = isLife
      ? [["generation", life.gen.toLocaleString()], ["live cells", (life.pop[life.pop.length - 1] || 0).toLocaleString()]]
      : [["birds", String(boids.list.length)], ["flocks", boids.flocks == null ? "–" : String(boids.flocks)],
         ["alignment", (boids.order[boids.order.length - 1] || 0).toFixed(2)]];
    for (const [k, v] of rows) {
      ctx.fillStyle = "#7f8ea6"; ctx.font = "12px " + MONO; ctx.fillText(k, PX, y);
      ctx.fillStyle = "#e9eef7"; ctx.textAlign = "right"; ctx.fillText(v, PX + PW, y); ctx.textAlign = "left";
      y += 20;
    }
    // Sparkline
    const series = isLife ? life.pop : boids.order;
    const top = y + 6, h = WY + WH - 18 - top;
    ctx.strokeStyle = "#1a2436";
    ctx.strokeRect(PX + 0.5, top + 0.5, PW - 1, h);
    if (series.length > 1) {
      const max = isLife ? Math.max(10, ...series) : 1;
      ctx.strokeStyle = isLife ? "#7fd0ff" : "#f0b35a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      series.forEach((v, i) => {
        const x = PX + 2 + i / 199 * (PW - 4), yy = top + h - 2 - v / max * (h - 6);
        i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
      });
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = "#56647c";
    ctx.font = "10px " + MONO;
    ctx.fillText(isLife ? "live cells over time" : "alignment over time (0 to 1)", PX, WY + WH - 4);
  }

  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    if (state.mode === "life") drawLife(); else drawBoids();
    ctx.strokeStyle = "#26324a";
    ctx.strokeRect(WX + 0.5, WY + 0.5, WW - 1, WH - 1);
    drawPanel();
  }

  function updateReadouts() {
    $("ruleCount").textContent = state.mode === "life" ? "3" : (boids.hawk ? "4" : "3");
    $("lifeGen").textContent = life.gen.toLocaleString();
    $("lifeCells").textContent = (life.pop[life.pop.length - 1] || 0).toLocaleString();
    $("boidCount").textContent = boids.list.length;
    $("flocks").textContent = boids.flocks == null ? "–" : boids.flocks;
    $("order").textContent = boids.order.length ? boids.order[boids.order.length - 1].toFixed(2) : "–";
  }

  // ---------- Loop ----------
  let last = performance.now(), frameNo = 0;
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    if (state.running) {
      if (state.mode === "life") {
        life.acc += life.speed * dt / 1000;
        let n = Math.min(8, Math.floor(life.acc));
        life.acc -= Math.floor(life.acc);
        while (n-- > 0) lifeStep();
      } else {
        boidsStep();
      }
    }
    draw();
    if (++frameNo % 6 === 0) updateReadouts();
    requestAnimationFrame(frame);
  }

  // ---------- Controls ----------
  function hint(t) { $("hint").textContent = t; }
  function setRunning(on) { state.running = on; $("play").textContent = on ? "Pause" : "Play"; }
  function setMode(m) {
    state.mode = m;
    $("modeLife").setAttribute("aria-pressed", String(m === "life"));
    $("modeBoids").setAttribute("aria-pressed", String(m === "boids"));
    document.querySelectorAll("[data-mode]").forEach((el) => { el.hidden = el.dataset.mode !== m; });
    canvas.style.touchAction = m === "life" ? "none" : "";
    canvas.style.cursor = m === "life" ? "crosshair" : "";
    $("modeNote").textContent = m === "life"
      ? "Cells on a grid, updated all at once, one generation at a time."
      : "Each bird steers by three rules about its nearest neighbours. There is no leader.";
    hint(m === "life"
      ? "Click or drag on the grid to draw cells. Try the glider gun: a pattern of 36 cells that builds a new glider every 30 generations, forever."
      : "The birds started scattered in random directions. Watch the colours merge as flocks form, then try each slider at zero.");
    draw(); updateReadouts();
  }
  $("modeLife").addEventListener("click", () => setMode("life"));
  $("modeBoids").addEventListener("click", () => setMode("boids"));
  $("play").addEventListener("click", () => setRunning(!state.running));
  $("step").addEventListener("click", () => {
    setRunning(false);
    if (state.mode === "life") lifeStep(); else for (let i = 0; i < 4; i++) boidsStep();
    draw(); updateReadouts();
  });
  $("presetGlider").addEventListener("click", () => loadPreset("glider"));
  $("presetGun").addEventListener("click", () => loadPreset("gun"));
  $("presetR").addEventListener("click", () => loadPreset("r"));
  $("presetRandom").addEventListener("click", () => loadPreset("random"));
  $("clear").addEventListener("click", () => {
    lifeClear(); draw(); updateReadouts();
    hint("An empty grid. Click to draw cells, then press Play. Three in a row makes a blinker; a 2 by 2 square never changes.");
  });
  $("lifeSpeed").addEventListener("input", (e) => { life.speed = +e.target.value; $("lifeSpeedOut").textContent = life.speed; });
  for (const k of ["sep", "ali", "coh"]) {
    $(k).addEventListener("input", (e) => { boids[k] = +e.target.value; $(k + "Out").textContent = boids[k].toFixed(1); });
  }
  $("boidN").addEventListener("input", (e) => {
    setBoidCount(+e.target.value); $("boidNOut").textContent = boids.n;
    boids.flocks = countFlocks(); if (!state.running) draw(); updateReadouts();
  });
  $("predator").addEventListener("change", (e) => {
    boids.hawk = e.target.checked ? { x: WW / 2, y: WH / 2, vx: 2, vy: 0 } : null;
    hint(e.target.checked
      ? "A fourth rule: any bird within 80 px of the hawk turns away from it. Watch flocks tear open and close up again behind it."
      : "Back to three rules.");
    if (!state.running) draw();
    updateReadouts();
  });

  // ---------- Start ----------
  setBoidCount(boids.n);
  for (let i = 0; i < 60; i++) boidsStep();   // birds already beginning to group
  boids.flocks = countFlocks();
  // Opening scene: the gun, plus two famous oscillators well clear of its glider stream.
  loadPreset("gun");
  const PULSAR = [];
  for (const r of [0, 5, 7, 12]) for (const c of [2, 3, 4, 8, 9, 10]) { PULSAR.push([c, r]); PULSAR.push([r, c]); }
  const LINE10 = [...Array(10).keys()].map((i) => [i, 0]);
  stamp(PULSAR, 8, 44);
  stamp(LINE10, 30, 60);
  for (let i = 0; i < 40; i++) lifeStep();
  hint("Click or drag on the grid to draw cells. Top left, Gosper's glider gun fires a glider every 30 generations. Bottom left, a pulsar repeats every 3 generations and a pentadecathlon every 15.");
  if (Lab.reducedMotion) {
    for (let i = 0; i < 120; i++) lifeStep();
    setRunning(false);
    hint("Animation is paused because your system asks for reduced motion. Use Step to advance one generation at a time, or press Play.");
  } else {
    setRunning(true);
  }
  draw();
  updateReadouts();
  requestAnimationFrame(frame);
})();
