(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $("bench");
  // Logical canvas size: 960 wide on desktop; a taller 480-wide layout when the bench is narrow (phones),
  // with the panels stacked under the interferometer so canvas text stays readable.
  let W = 960, H = 460, narrow = false, ctx;

  // ---------- Layout ----------
  const UP_Y = 150, LO_Y = 290;
  const BLOB_R = 16, P_R = 2.5;
  const blobs = [{ x: 295, y: UP_Y, flash: 0 }, { x: 295, y: LO_Y, flash: 0 }];
  let SRC, BS1, BS2, BOX, DX, RX, RW, MAT_Y, FR_Y, TR_Y;
  function setGeometry() {
    if (!narrow) {
      W = 960; H = 460;
      SRC = { x: 40, y: 220 }; BS1 = { x: 104, y: 220 }; BS2 = { x: 486, y: 220 };
      BOX = { x0: 170, y0: 78, x1: 420, y1: 362 };
      blobs[0].x = blobs[1].x = 295; DX = 542;
      RX = 566; RW = 380; MAT_Y = 28; FR_Y = 200; TR_Y = 340;
    } else {
      W = 480;
      SRC = { x: 24, y: 220 }; BS1 = { x: 66, y: 220 }; BS2 = { x: 412, y: 220 };
      BOX = { x0: 118, y0: 78, x1: 368, y1: 362 }; // same size as on desktop, so the rates match
      blobs[0].x = blobs[1].x = 243; DX = 454;
      RX = 16; RW = 448; MAT_Y = 462;
      // FR_Y, TR_Y and H depend on how long the (translated) labels are: see narrowFlow().
      FR_Y = 708; TR_Y = 892; H = 1048;
    }
  }
  function applyLayout(n) {
    const old = BOX;
    narrow = n;
    setGeometry();
    ctx = Lab.setupCanvas(canvas, W, H);
    if (narrow) { narrowFlow(); ctx = Lab.setupCanvas(canvas, W, H); }
    if (old) {
      // Carry the gas over into the new chamber.
      for (const p of state.particles) {
        p.x = BOX.x0 + (p.x - old.x0) * (BOX.x1 - BOX.x0) / (old.x1 - old.x0);
        p.y = BOX.y0 + (p.y - old.y0) * (BOX.y1 - BOX.y0) / (old.y1 - old.y0);
      }
    }
  }
  const wantNarrow = () => {
    const w = canvas.getBoundingClientRect().width;
    return w > 0 && w < (narrow ? 656 : 640);
  };

  const COL = {
    bg: "#05080e", label: "#7f8ea6", dim: "#56647c", rule: "#1f2a3f", metal: "#3a4760",
    obj: "#8fa6ff", coh: "#6fd8c4", record: "#f0b35a", gas: "#7f8ea6", white: "#e9eef7",
  };

  // ---------- State ----------
  const state = {
    N: 40, T: 300, coupling: 0.15, running: true, showAvg: true,
    particles: [],
    t: 0, C: 1, hits: 0, trace: [[0, 1]], win: 10, hold: 0,
  };

  const overlap = () => 1 - state.coupling;        // ⟨E_upper|E_lower⟩ per collision
  const speed = () => 70 * Math.sqrt(state.T / 300); // px per second

  // Expected collision rate in this 2D box: density × collision width × speed, for two blobs.
  function collisionRate() {
    const area = (BOX.x1 - BOX.x0) * (BOX.y1 - BOX.y0) - 2 * Math.PI * BLOB_R * BLOB_R;
    return (state.N / area) * 2 * (BLOB_R + P_R) * speed() * 2;
  }
  // Ensemble-averaged coherence: E[overlap^n] for Poisson n = exp(−Γ(1−overlap)t).
  const lambda = () => collisionRate() * (1 - overlap());

  function makeParticle() {
    for (;;) {
      const x = BOX.x0 + P_R + Math.random() * (BOX.x1 - BOX.x0 - 2 * P_R);
      const y = BOX.y0 + P_R + Math.random() * (BOX.y1 - BOX.y0 - 2 * P_R);
      if (blobs.every((b) => Math.hypot(x - b.x, y - b.y) > BLOB_R + P_R + 2)) {
        const a = Math.random() * Math.PI * 2;
        return { x, y, dx: Math.cos(a), dy: Math.sin(a), marked: false };
      }
    }
  }
  function setParticleCount(n) {
    while (state.particles.length < n) state.particles.push(makeParticle());
    state.particles.length = n;
  }

  function newRun() {
    saidHalf = false; saidGone = false;
    state.t = 0; state.C = 1; state.hits = 0; state.hold = 0;
    state.trace = [[0, 1]];
    for (const p of state.particles) p.marked = false;
    const L = lambda();
    state.win = L > 0 ? Math.min(30, Math.max(4, 5 / L)) : 10;
    updateStats(true);
  }

  // ---------- Simulation step ----------
  function step(dt) {
    const s = speed();
    const r = overlap();
    for (const p of state.particles) {
      p.x += p.dx * s * dt; p.y += p.dy * s * dt;
      if (p.x < BOX.x0 + P_R) { p.x = BOX.x0 + P_R; p.dx = Math.abs(p.dx); }
      if (p.x > BOX.x1 - P_R) { p.x = BOX.x1 - P_R; p.dx = -Math.abs(p.dx); }
      if (p.y < BOX.y0 + P_R) { p.y = BOX.y0 + P_R; p.dy = Math.abs(p.dy); }
      if (p.y > BOX.y1 - P_R) { p.y = BOX.y1 - P_R; p.dy = -Math.abs(p.dy); }
      for (const b of blobs) {
        const ox = p.x - b.x, oy = p.y - b.y;
        const d = Math.hypot(ox, oy);
        if (d < BLOB_R + P_R && d > 0) {
          const nx = ox / d, ny = oy / d;
          const dot = p.dx * nx + p.dy * ny;
          if (dot < 0) {
            p.dx -= 2 * dot * nx; p.dy -= 2 * dot * ny;
            // The bounce happened in this branch only: the particle now holds a partial record.
            const before = state.C;
            state.C *= r;
            state.hits++;
            if (r < 1) p.marked = true;
            b.flash = 1;
            state.trace.push([state.t, state.C]);
            onCollision(b, before);
          }
          p.x = b.x + nx * (BLOB_R + P_R); p.y = b.y + ny * (BLOB_R + P_R);
        }
      }
    }
    state.t += dt;
  }

  // ---------- Narration and challenges ----------
  let ready = false, saidHalf = false, saidGone = false;
  function onCollision(b, before) {
    if (!ready) return;
    WONDERS.sound("tick", { pitch: 0.3 + 0.7 * state.C, pan: b === blobs[0] ? -0.4 : 0.4 });
    if (!saidHalf && state.C < 0.5) {
      saidHalf = true;
      WONDERS.describe(`After ${state.hits} collisions, coherence has fallen below half. The fringes are fading.`);
    }
    if (!saidGone && state.C < 0.05) {
      saidGone = true;
      WONDERS.describe(`After ${state.hits} collisions, coherence is almost gone. The output shows no fringes: the gas holds the which-path record.`);
      WONDERS.sound("event", { pitch: 0.2 });
    }
    // One bounce takes visible fringes straight to none.
    if (state.coupling >= 1 && before >= 0.5 && state.C === 0) WONDERS.challenge("one-hit");
  }
  function runEnded() {
    if (!ready) return;
    if (state.N === 0 && state.C === 1 && state.t >= state.win) WONDERS.challenge("vacuum");
  }
  function checkSlow() {
    const L = lambda();
    if (ready && state.N >= 100 && state.coupling >= 0.01 && L > 0 && 1 / L >= 20) WONDERS.challenge("slow-decay");
  }
  function describeScene() {
    const L = lambda();
    const gas = state.N ? `The chamber holds ${state.N} gas particles at ${state.T} K, and each collision loses ${Math.round(state.coupling * 100)}% of the coherence.` : "The gas has been pumped out, so nothing collides with the object.";
    const now = `In this run ${state.hits} collisions have happened and coherence is ${(state.C * 100).toFixed(0)}%, so the fringes at the output have ${(state.C * 100).toFixed(0)}% visibility.`;
    const avg = L > 0 ? `On average coherence falls by a factor of e every ${(1 / L).toFixed(1)} s.` : "Coherence never decays.";
    return `The object is in a superposition of the upper and lower path. ${gas} ${now} ${avg}`;
  }
  WONDERS.describer(describeScene);

  // ---------- Drawing ----------
  function label(text, x, y, align, colour) {
    ctx.fillStyle = colour || COL.label;
    ctx.textAlign = align || "center";
    if (ctx.textAlign === "center") {
      // Keep centred labels (which may be translated and longer) inside the canvas.
      const half = ctx.measureText(text).width / 2;
      x = Math.max(half + 4, Math.min(W - half - 4, x));
    }
    ctx.fillText(text, x, y);
  }
  // Narrow layout: every font is 6 px larger (the canvas is drawn at about 0.64 scale on a phone).
  const fpx = (px) => (narrow ? px + 6 : px);
  const mono = (px) => { ctx.font = `${fpx(px)}px 'IBM Plex Mono', ui-monospace, monospace`; };
  const sans = (px) => { ctx.font = `${fpx(px)}px 'IBM Plex Sans', system-ui, sans-serif`; };
  // Wrap a sentence to maxW; translate it whole first (Chinese wraps per character).
  function wrapLines(text, maxW) {
    if (window.I18N) text = window.I18N.t(text);
    text = text.replace(/ →/g, "\u00a0→"); // never leave the arrow alone on a line
    const cjk = /[\u3000-\u9fff]/.test(text);
    const words = cjk ? [...text] : text.split(" ");
    const sep = cjk ? "" : " ";
    const lines = [];
    let line = "";
    for (const w of words) {
      const t = line ? line + sep + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  function wrapText(text, x, y, maxW, lh) {
    for (const l of wrapLines(text, maxW)) { ctx.fillText(l, x, y); y += lh; }
    return y;
  }

  // ---------- Narrow layout: matrix, fringes and trace flow down the page ----------
  let MAT = null, FR_TWO_ROWS = false;
  function matrixGeometry() {
    mono(10);
    const rowW = Math.max(ctx.measureText("upper").width, ctx.measureText("lower").width);
    if (!narrow) return { gx: RX + 34, gy: MAT_Y + 16, cell: 62 };
    // Cells wide enough for the (translated) column labels.
    const cell = Math.max(62, Math.ceil(rowW) + 10);
    const gx = RX + Math.max(34, rowW + 12);
    return { gx, gy: MAT_Y + 32, cell, tx: gx + 2 * cell + 18 };
  }
  // The key beside the matrix; returns the y below its last line.
  function drawMatrixKey(m, draw) {
    const mw = W - m.tx - 6;
    let y = m.gy + 14;
    const put = (text, colour, lh) => {
      ctx.fillStyle = colour; ctx.textAlign = "left";
      const lines = wrapLines(text, mw);
      if (draw) lines.forEach((l, k) => ctx.fillText(l, m.tx, y + k * lh));
      y += lines.length * lh;
    };
    mono(11); put("diagonal", COL.obj, 20);
    sans(12); put("odds of each path", "#aab6c8", 21);
    y += 14;
    mono(11); put("off-diagonal", COL.coh, 20);
    sans(12); put("how well the paths", "#aab6c8", 21);
    put("can still interfere", "#aab6c8", 21);
    return y;
  }
  function narrowFlow() {
    const m = matrixGeometry();
    const bottom = Math.max(m.gy + 2 * m.cell, drawMatrixKey(m, false) - 16);
    FR_Y = Math.round(bottom + 46);
    mono(11);
    FR_TWO_ROWS = ctx.measureText("OUTPUT IF RECOMBINED NOW").width + ctx.measureText("visibility 100%").width + 12 > RW;
    mono(10);
    const chance = wrapLines("chance at D0 as the path difference is scanned →", RW).length;
    const frBottom = FR_Y + (FR_TWO_ROWS ? 32 : 12) + 22 + 10 + 52 + 20 + (chance - 1) * 20;
    TR_Y = frBottom + 40;
    const legendLines = Math.max(...["dashed: average over many runs", "solid: this run · dashed: average", "solid: this run"].map((t) => wrapLines(t, RW).length));
    H = TR_Y + 16 + 82 + 20 + 24 + (legendLines - 1) * 20 + 14;
  }

  function drawApparatus() {
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, W, H);
    mono(12);

    // Chamber
    ctx.fillStyle = "#08101c";
    ctx.fillRect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0);
    ctx.strokeStyle = "#26324a";
    ctx.strokeRect(BOX.x0 + 0.5, BOX.y0 + 0.5, BOX.x1 - BOX.x0 - 1, BOX.y1 - BOX.y0 - 1);
    label(state.N ? `GAS CHAMBER · ${state.T} K` : "GAS CHAMBER · EMPTY", (BOX.x0 + BOX.x1) / 2, BOX.y0 - 10);

    // Beam paths (both branches exist at once)
    ctx.strokeStyle = `rgba(143,166,255,${0.18 + 0.4 * state.C})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(SRC.x + 8, SRC.y); ctx.lineTo(BS1.x, BS1.y);
    for (const y of [UP_Y, LO_Y]) {
      ctx.moveTo(BS1.x, BS1.y); ctx.lineTo(BOX.x0 - 10, y); ctx.lineTo(BOX.x1 + 10, y); ctx.lineTo(BS2.x, BS2.y);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(143,166,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(BS2.x, BS2.y); ctx.lineTo(DX - 6, 192);
    ctx.moveTo(BS2.x, BS2.y); ctx.lineTo(DX - 6, 248);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Source, beam splitters, detectors
    ctx.fillStyle = COL.obj;
    ctx.beginPath(); ctx.arc(SRC.x, SRC.y, 5, 0, Math.PI * 2); ctx.fill();
    if (narrow) label("SOURCE", 6, SRC.y - 16, "left");
    else label("SOURCE", SRC.x, SRC.y + 26);
    for (const [bs, name] of [[BS1, "SPLIT"], [BS2, "JOIN"]]) {
      ctx.save(); ctx.translate(bs.x, bs.y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "rgba(143,166,255,0.2)"; ctx.strokeStyle = COL.obj;
      ctx.fillRect(-8, -8, 16, 16); ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
      label(name, bs.x, bs.y + (narrow ? 34 : 30));
    }
    const p0 = (1 + state.C) / 2; // detector odds at zero phase
    for (const [y, name, p] of [[192, "D0", p0], [248, "D1", 1 - p0]]) {
      ctx.fillStyle = `rgba(143,166,255,${0.15 + 0.75 * p})`;
      ctx.beginPath(); ctx.arc(DX, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = COL.obj;
      ctx.beginPath(); ctx.arc(DX, y, 8, 0, Math.PI * 2); ctx.stroke();
      mono(10);
      label(name, DX, y + (y < 220 ? -14 : (narrow ? 28 : 24)));
      mono(12);
    }

    // The link between branches: brightness = remaining coherence
    ctx.strokeStyle = `rgba(111,216,196,${0.08 + 0.8 * state.C})`;
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = UP_Y + BLOB_R + 4; y <= LO_Y - BLOB_R - 4; y += 2) {
      const x = blobs[0].x + 6 * Math.sin((y - UP_Y) / 9 + state.t * 4);
      y === UP_Y + BLOB_R + 4 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    mono(10);
    label(`coherence ${(state.C * 100).toFixed(0)}%`, blobs[0].x + 14, (UP_Y + LO_Y) / 2 + 4, "left", COL.coh);
    mono(12);

    // Gas
    for (const p of state.particles) {
      ctx.fillStyle = p.marked ? COL.record : COL.gas;
      ctx.beginPath(); ctx.arc(p.x, p.y, P_R, 0, Math.PI * 2); ctx.fill();
    }

    // The object, half present in each branch
    for (const b of blobs) {
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, BLOB_R + 10);
      g.addColorStop(0, "rgba(143,166,255,0.75)");
      g.addColorStop(0.6, "rgba(143,166,255,0.35)");
      g.addColorStop(1, "rgba(143,166,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, BLOB_R + 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = COL.obj;
      ctx.beginPath(); ctx.arc(b.x, b.y, BLOB_R, 0, Math.PI * 2); ctx.stroke();
      if (b.flash > 0) {
        ctx.strokeStyle = `rgba(240,179,90,${b.flash})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, BLOB_R + 4 + 10 * (1 - b.flash), 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
    mono(10);
    label("upper path", blobs[0].x, UP_Y - BLOB_R - 14, "center", COL.obj);
    label("lower path", blobs[1].x, LO_Y + BLOB_R + (narrow ? 26 : 22), "center", COL.obj);
    // Legend (two rows on the narrow layout)
    const lx2 = narrow ? BOX.x0 : BOX.x0 + 110, ly2 = narrow ? BOX.y1 + 50 : BOX.y1 + 26;
    const ly1 = narrow ? BOX.y1 + 26 : BOX.y1 + 26;
    ctx.fillStyle = COL.gas; ctx.beginPath(); ctx.arc(BOX.x0 + 4, ly1 - 4 - (narrow ? 2 : 0), 3, 0, Math.PI * 2); ctx.fill();
    label("gas particle", BOX.x0 + 12, ly1, "left");
    ctx.fillStyle = COL.record; ctx.beginPath(); ctx.arc(lx2 + 4 - (narrow ? 0 : 4), ly2 - 4 - (narrow ? 2 : 0), 3, 0, Math.PI * 2); ctx.fill();
    label("carries a which-path record", lx2 + (narrow ? 12 : 8), ly2, "left", COL.record);
    mono(12);
  }

  function drawMatrix() {
    mono(11);
    label("DENSITY MATRIX ρ", RX, MAT_Y, "left");
    const rho = [[0.5, 0.5 * state.C], [0.5 * state.C, 0.5]];
    const m = matrixGeometry(), gx = m.gx, gy = m.gy, cell = m.cell;
    mono(10);
    label("upper", gx + cell / 2, gy - 4, "center", COL.dim);
    label("lower", gx + cell * 1.5, gy - 4, "center", COL.dim);
    label("upper", gx - 6, gy + cell / 2 + 3, "right", COL.dim);
    label("lower", gx - 6, gy + cell * 1.5 + 3, "right", COL.dim);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x = gx + j * cell, y = gy + i * cell;
      ctx.strokeStyle = COL.rule;
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
      const v = rho[i][j];
      const side = (cell - 12) * Math.sqrt(v / 0.5);
      ctx.fillStyle = i === j ? "rgba(143,166,255,0.8)" : "rgba(111,216,196,0.85)";
      ctx.fillRect(x + (cell - side) / 2, y + (cell - side) / 2, side, side);
      mono(11);
      ctx.fillStyle = COL.white;
      ctx.textAlign = "center";
      ctx.fillText(v.toFixed(2), x + cell / 2, y + cell / 2 + 4);
    }
    const tx = gx + 2 * cell + 22;
    if (narrow) { drawMatrixKey(m, true); return; }
    const ty = [16, 32, 66, 82, 97];
    mono(11);
    label("diagonal", tx, gy + ty[0], "left", COL.obj);
    sans(12);
    label("odds of each path", tx, gy + ty[1], "left", "#aab6c8");
    mono(11);
    label("off-diagonal", tx, gy + ty[2], "left", COL.coh);
    sans(12);
    label("how well the paths", tx, gy + ty[3], "left", "#aab6c8");
    label("can still interfere", tx, gy + ty[4], "left", "#aab6c8");
  }

  function drawFringes() {
    const top = FR_Y, x0 = RX, w = RW;
    mono(11);
    label("OUTPUT IF RECOMBINED NOW", x0, top, "left");
    const visText = `visibility ${(state.C * 100).toFixed(0)}%`;
    // Narrow: if the title and the visibility don't fit on one line, the visibility drops to a second line.
    const twoRows = narrow && FR_TWO_ROWS;
    label(visText, x0 + w, twoRows ? top + 22 : top, "right", COL.coh);
    // Stripe band: what a screen at the output would show as the phase is scanned
    const bandY = top + (narrow ? (twoRows ? 32 : 12) : 10), bandH = 22;
    for (let i = 0; i < w; i += 2) {
      const phi = (i / w) * 6 * Math.PI;
      const I = (1 + state.C * Math.cos(phi)) / 2;
      ctx.fillStyle = `rgba(143,166,255,${0.05 + 0.9 * I})`;
      ctx.fillRect(x0 + i, bandY, 2, bandH);
    }
    // Curve
    const cy0 = bandY + bandH + 10, ch = 52;
    ctx.strokeStyle = COL.rule;
    ctx.beginPath(); ctx.moveTo(x0, cy0 + ch + 0.5); ctx.lineTo(x0 + w, cy0 + ch + 0.5); ctx.stroke();
    ctx.strokeStyle = "rgba(233,238,247,0.3)";
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    for (let i = 0; i <= w; i += 2) {
      const phi = (i / w) * 6 * Math.PI;
      const y = cy0 + ch - ch * (1 + Math.cos(phi)) / 2;
      i === 0 ? ctx.moveTo(x0 + i, y) : ctx.lineTo(x0 + i, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = COL.obj; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= w; i += 2) {
      const phi = (i / w) * 6 * Math.PI;
      const y = cy0 + ch - ch * (1 + state.C * Math.cos(phi)) / 2;
      i === 0 ? ctx.moveTo(x0 + i, y) : ctx.lineTo(x0 + i, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    mono(10);
    ctx.fillStyle = COL.dim; ctx.textAlign = "left";
    wrapText("chance at D0 as the path difference is scanned →", x0, cy0 + ch + (narrow ? 20 : 14), w, 20);
  }

  function drawTrace() {
    const top = TR_Y, x0 = RX + 26, w = RW - 26, y0 = top + (narrow ? 16 : 12), h = 82;
    mono(11);
    label("COHERENCE OVER TIME", RX, top, "left");
    mono(10);
    label("1", x0 - 6, y0 + 4, "right", COL.dim);
    label("0", x0 - 6, y0 + h + 3, "right", COL.dim);
    ctx.strokeStyle = COL.rule;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h);
    const X = (t) => x0 + (t / state.win) * w;
    const Y = (c) => y0 + h - c * h;
    if (state.showAvg) {
      const L = lambda();
      ctx.strokeStyle = "rgba(233,238,247,0.6)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = (i / 60) * state.win;
        i === 0 ? ctx.moveTo(X(t), Y(Math.exp(-L * t))) : ctx.lineTo(X(t), Y(Math.exp(-L * t)));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (!Lab.reducedMotion) {
      ctx.strokeStyle = COL.coh; ctx.lineWidth = 1.6;
      ctx.beginPath();
      let prev = state.trace[0];
      ctx.moveTo(X(prev[0]), Y(prev[1]));
      for (let k = 1; k < state.trace.length; k++) {
        const pt = state.trace[k];
        ctx.lineTo(X(pt[0]), Y(prev[1]));
        ctx.lineTo(X(pt[0]), Y(pt[1]));
        prev = pt;
      }
      ctx.lineTo(X(Math.min(state.t, state.win)), Y(state.C));
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    const yl = y0 + h + (narrow ? 20 : 14);
    label("0 s", x0, yl, "left", COL.dim);
    label(`${state.win.toFixed(state.win < 10 ? 1 : 0)} s`, x0 + w, yl, "right", COL.dim);
    const legend = Lab.reducedMotion ? "dashed: average over many runs" : (state.showAvg ? "solid: this run · dashed: average" : "solid: this run");
    if (narrow) { ctx.fillStyle = COL.dim; ctx.textAlign = "left"; wrapText(legend, RX, yl + 24, RW, 20); }
    else label(legend, x0 + w / 2, yl, "center", COL.dim);
  }

  function draw() {
    drawApparatus();
    drawMatrix();
    drawFringes();
    drawTrace();
  }

  // ---------- Stats ----------
  let lastStats = 0;
  function updateStats(force) {
    const now = performance.now();
    if (!force && now - lastStats < 150) return;
    lastStats = now;
    $("hits").textContent = state.hits.toLocaleString();
    $("rho01").textContent = (0.5 * state.C).toFixed(3);
    $("vis").textContent = (state.C * 100).toFixed(state.C < 0.1 && state.C > 0 ? 1 : 0) + "%";
    $("info").textContent = Math.round(Math.sqrt(Math.max(0, 1 - state.C * state.C)) * 100) + "%";
    const L = lambda();
    $("tau").textContent = L > 0 ? (1 / L).toFixed(1) + " s" : "never";
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.running) {
      if (state.t < state.win) {
        // Substeps keep fast particles from skipping through the object.
        const n = Math.ceil(speed() * dt / 4) || 1;
        for (let i = 0; i < n; i++) step(dt / n);
      } else {
        if (state.hold === 0) runEnded();
        state.hold += dt;
        if (state.hold > 1.4) newRun();
      }
    }
    for (const b of blobs) b.flash = Math.max(0, b.flash - dt * 3);
    updateStats();
    draw();
    requestAnimationFrame(frame);
  }

  // Reduced motion: no moving gas. Show the average state one decoherence time in.
  function renderStatic() {
    const L = lambda();
    state.win = L > 0 ? Math.min(30, Math.max(4, 5 / L)) : 10;
    state.t = L > 0 ? 1 / L : 0;
    state.C = L > 0 ? Math.exp(-1) : 1;
    state.hits = Math.round(collisionRate() * state.t);
    updateStats(true);
    draw();
    // Reduced motion shows the average, so the challenges are judged from it.
    if (ready && state.N === 0) WONDERS.challenge("vacuum");
    if (ready && state.coupling >= 1 && state.N > 0) WONDERS.challenge("one-hit");
  }

  // ---------- Controls ----------
  function readouts() {
    $("pressureOut").textContent = state.N;
    $("tempOut").textContent = state.T + " K";
    $("couplingOut").textContent = Math.round(state.coupling * 100) + "% lost";
  }
  function changed() {
    readouts();
    checkSlow();
    if (Lab.reducedMotion) { renderStatic(); return; }
    const L = lambda();
    state.win = Math.max(state.win, state.t + 1);
    if (L > 0) state.win = Math.max(state.win, Math.min(30, 5 / L));
    updateStats(true);
  }
  $("pressure").addEventListener("input", (e) => { state.N = +e.target.value; setParticleCount(state.N); changed(); });
  $("temp").addEventListener("input", (e) => { state.T = +e.target.value; changed(); });
  $("coupling").addEventListener("input", (e) => { state.coupling = +e.target.value / 100; changed(); });
  $("avg").addEventListener("change", (e) => { state.showAvg = e.target.checked; if (Lab.reducedMotion) draw(); });
  $("play").addEventListener("click", () => {
    state.running = !state.running;
    $("play").textContent = state.running ? "Pause" : "Resume";
  });
  $("reset").addEventListener("click", () => { newRun(); WONDERS.describe("New superposition started with full coherence.", { now: true }); if (Lab.reducedMotion) renderStatic(); });
  $("vacuum").addEventListener("click", () => {
    state.N = 0; $("pressure").value = 0; setParticleCount(0);
    readouts();
    newRun();
    WONDERS.describe("Gas pumped out. A new superposition starts with nothing to collide with.", { now: true });
    if (Lab.reducedMotion) renderStatic();
  });

  // ---------- Scale it up ----------
  const OBJECTS = {
    c70: { r: 0.5e-9, name: "A C₇₀ molecule" },
    virus: { r: 50e-9, name: "A virus" },
    dust: { r: 5e-6, name: "A dust grain" },
    cat: { r: 0.15, name: "A cat" },
  };
  const ENVIRONS = { air: 101325, hv: 1e-4, uhv: 1e-8 }; // pascals
  const KB = 1.380649e-23, T_GAS = 293, V_GAS = 470, R_GAS = 0.18e-9; // nitrogen

  const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  function sci(x) {
    const e = Math.floor(Math.log10(x));
    let m = Math.round(x / 10 ** e);
    let ee = e;
    if (m === 10) { m = 1; ee++; }
    return `${m} × 10${String(ee).split("").map((c) => SUP[c]).join("")}`;
  }
  function formatTime(s) {
    if (s >= 3600) return `about ${(s / 3600).toPrecision(2)} hours`;
    if (s >= 60) return `about ${(s / 60).toPrecision(2)} minutes`;
    if (s >= 0.001) return `about ${s.toPrecision(2)} s`;
    return `about ${sci(s)} s`;
  }
  function updateScale() {
    const o = OBJECTS[$("object").value];
    const n = ENVIRONS[$("environ").value] / (KB * T_GAS);
    const sigma = Math.PI * (o.r + R_GAS) ** 2;
    const rate = n * sigma * V_GAS;
    const tau = 1 / rate;
    $("scaleOut").textContent = formatTime(tau);
    let compare;
    if (tau < 3.3e-19) compare = "That is less time than light takes to cross a single atom.";
    else if (tau < 2e-15) compare = "That is shorter than one wiggle of a visible light wave.";
    else if (tau < 1e-9) compare = "That is under a nanosecond: no interference experiment could ever catch it.";
    else if (tau < 1e-2) compare = "Short, but quantum experiments with fast molecules can sometimes beat it.";
    else compare = "Long enough that interference experiments can work. This is why they need a good vacuum.";
    $("scaleNote").textContent = `${o.name} is hit by about ${sci(rate)} gas molecules per second. ${compare}`;
  }
  $("object").addEventListener("change", updateScale);
  $("environ").addEventListener("change", updateScale);

  // ---------- Start ----------
  applyLayout(wantNarrow());
  new ResizeObserver(() => {
    const n = wantNarrow();
    if (n === narrow) return;
    applyLayout(n);
    if (Lab.reducedMotion) draw();
  }).observe(canvas.parentElement);
  // The narrow layout measures text, so redo it once the web fonts have arrived.
  if (document.fonts) document.fonts.ready.then(() => { if (narrow) { applyLayout(true); if (Lab.reducedMotion) draw(); } });
  setParticleCount(state.N);
  readouts();
  updateScale();
  newRun();
  if (Lab.reducedMotion) {
    renderStatic();
    ready = true;
  } else {
    // Start part-way into a run so the first view already shows some decay.
    for (let i = 0; i < 120; i++) step(1 / 60);
    ready = true;
    requestAnimationFrame(frame);
  }
})();
