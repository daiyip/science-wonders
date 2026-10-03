(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $("bench");
  // Logical canvas size: 960 wide on desktop; a taller 480-wide layout when the bench is narrow (phones),
  // so canvas text stays readable. Simulation state survives a layout switch.
  let W = 960, H = 500, narrow = false, ctx;
  const MONO = "'IBM Plex Mono', ui-monospace, monospace", SANS = "'IBM Plex Sans', system-ui, sans-serif";
  const font = (px, fam) => { ctx.font = `${narrow ? px + 6 : px}px ${fam || MONO}`; };
  const DEG = Math.PI / 180;

  // ---------- Physics (real units, mm) ----------
  const LAMBDA_MM = 702e-6, L_MM = 1000, D_MM = 0.2, A_MM = 0.04;
  const HALF = 12;            // screen shows ±12 mm
  const BINS = 96;
  const K = Math.PI / (LAMBDA_MM * L_MM);
  const sinc2 = (u) => (Math.abs(u) < 1e-9 ? 1 : (Math.sin(u) / u) ** 2);
  const envelope = (x) => sinc2(K * A_MM * x);   // single-slit diffraction envelope
  const phase = (x) => K * D_MM * x;              // half the phase difference between the slits

  // Pair state (|top>|H> + |bottom>|V>)/√2 when tagged.
  // Screen alone: |ψtop|² + |ψbot|², no cross term. Untagged: |ψtop + ψbot|².
  function screenProb(x) {
    return state.tags ? envelope(x) : envelope(x) * Math.cos(phase(x)) ** 2;
  }
  // Probability the twin goes to D1 (polarizer axis at θ from H), given the hit at x.
  function probD1(x, angleDeg) {
    const th = angleDeg * DEG;
    if (!state.tags) return Math.cos(th - Math.PI / 4) ** 2; // untagged twin is fixed at 45°, uncorrelated
    return (1 + Math.sin(2 * th) * Math.cos(2 * phase(x))) / 2;
  }

  const state = {
    tags: true, angle: 45, delay: false, colour: true,
    rate: 24, running: true, pending: 0,
    hits: [], flights: [],
    cAll: new Array(BINS).fill(0), c1: new Array(BINS).fill(0), c2: new Array(BINS).fill(0),
    n1: 0, n2: 0, waiting: 0,
    pAll: new Array(BINS).fill(0), p1: new Array(BINS).fill(0), p2: new Array(BINS).fill(0),
    flash1: 0, flash2: 0, flashScreen: null, coil: 0,
  };

  function sampleX() {
    for (let i = 0; i < 20000; i++) {
      const x = (Math.random() * 2 - 1) * HALF;
      if (Math.random() < screenProb(x)) return x;
    }
    return 0;
  }

  function computePdf() {
    let total = 0;
    for (let b = 0; b < BINS; b++) {
      let s = 0, s1 = 0;
      for (let j = 0; j < 6; j++) {
        const x = -HALF + (b + (j + 0.5) / 6) * (2 * HALF / BINS);
        const p = screenProb(x);
        s += p; s1 += p * probD1(x, state.angle);
      }
      state.pAll[b] = s; state.p1[b] = s1; state.p2[b] = s - s1;
      total += s;
    }
    for (let b = 0; b < BINS; b++) { state.pAll[b] /= total; state.p1[b] /= total; state.p2[b] /= total; }
  }

  // ---------- Layout ----------
  let LASER, CRY, SIG_Y, BAR_X, SCR_X, SCR_TOP, SCR_BOT, IDL_Y, COIL_X, PBS, D1, D2, SORT;
  let PX, PW, PANEL_H, PANEL_GAP, PANEL_TOP, Y_AXIS;
  const FILM_H = 30, HIST_H = 78;
  const SLIT_GAP = 22;
  function setGeometry() {
    LASER = { x: 40, y: 250 }; CRY = { x: 110, y: 250 };
    SIG_Y = 140; BAR_X = 250; SCR_X = 400; SCR_TOP = 60; SCR_BOT = 220;
    if (!narrow) {
      W = 960; H = 500;
      IDL_Y = 360; COIL_X = 232; PBS = { x: 320, y: IDL_Y }; D1 = { x: 408, y: IDL_Y }; D2 = { x: PBS.x, y: 448 };
      SORT = { x: 408, y: 290 };
      PX = 486; PW = 458; PANEL_H = 140; PANEL_GAP = 12; PANEL_TOP = 40;
      Y_AXIS = PANEL_TOP + 3 * (PANEL_H + PANEL_GAP) - 2;
    } else {
      // Apparatus on top, the three sorted panels stacked underneath.
      W = 480;
      IDL_Y = 380; COIL_X = 232; PBS = { x: 320, y: IDL_Y }; D1 = { x: 408, y: IDL_Y }; D2 = { x: PBS.x, y: 468 };
      SORT = { x: 428, y: 270 };
      PX = 16; PW = 448; PANEL_H = 140; PANEL_GAP = 26; PANEL_TOP = 556;
      Y_AXIS = PANEL_TOP + 2 * (PANEL_H + PANEL_GAP) + FILM_H + 6 + HIST_H + 26;
      H = Y_AXIS + 14;
    }
  }

  const COL = {
    bg: "#05080e", label: "#7f8ea6", dim: "#56647c", rule: "#1f2a3f",
    metal: "#3a4760", photon: "#ff6f5e", pump: "#a98bff",
    grey: "#aab6c8", d1: "#6fd8c4", d2: "#f0b35a", white: "#e9eef7",
  };

  const yOnScreen = (x) => SIG_Y - (x / HALF) * ((SCR_BOT - SCR_TOP) / 2);
  const xOnPanel = (x) => PX + ((x + HALF) / (2 * HALF)) * PW;
  const binOf = (x) => Math.min(BINS - 1, Math.max(0, Math.floor((x + HALF) / (2 * HALF) * BINS)));

  // Offscreen films for the three panels, so thousands of dots cost nothing per frame.
  let films = [];
  function applyLayout(n) {
    narrow = n;
    setGeometry();
    ctx = Lab.setupCanvas(canvas, W, H);
    films = [0, 1, 2].map(() => {
      const c = document.createElement("canvas");
      return { c, g: Lab.setupCanvas(c, PW, FILM_H) };
    });
    rebuild();
  }
  const wantNarrow = () => {
    const w = canvas.getBoundingClientRect().width;
    return w > 0 && w < (narrow ? 656 : 640);
  };
  function dot(film, x, fy, colour) {
    film.g.fillStyle = colour;
    film.g.fillRect(((x + HALF) / (2 * HALF)) * PW - 0.8, 2 + fy * (FILM_H - 5), 1.6, 1.6);
  }

  // ---------- Hits and sorting ----------
  function land(x) {
    const h = { x, fy: Math.random(), o: 0 };
    state.hits.push(h);
    state.cAll[binOf(x)]++;
    dot(films[0], x, h.fy, COL.grey);
    if (state.delay) state.waiting++;
    else sortHit(h, false);
  }

  function sortHit(h, wasWaiting) {
    h.o = Math.random() < probD1(h.x, state.angle) ? 1 : 2;
    const b = binOf(h.x);
    if (h.o === 1) { state.c1[b]++; state.n1++; state.flash1 = 1; dot(films[1], h.x, h.fy, COL.d1); }
    else { state.c2[b]++; state.n2++; state.flash2 = 1; dot(films[2], h.x, h.fy, COL.d2); }
    if (state.colour) dot(films[0], h.x, h.fy, h.o === 1 ? COL.d1 : COL.d2);
    if (wasWaiting) state.waiting--;
  }

  function measureStored() {
    const stored = state.waiting;
    for (const h of state.hits) if (!h.o) sortHit(h, true);
    state.waiting = 0;
    updateReadouts();
    if (!stored) return;
    const v = visibility();
    WONDERS.describe(state.tags && v > 0.5
      ? `Measured ${stored.toLocaleString()} stored twins at ${state.angle}°. The dots already on the screen split into a striped D1 group and a matching D2 group with the gaps; the bare screen is unchanged.`
      : `Measured ${stored.toLocaleString()} stored twins at ${state.angle}°. The dots already on the screen split into two groups; the bare screen is unchanged.`, { now: true });
    WONDERS.sound("event", { pitch: 0.7 });
    if (state.tags && stored >= 500 && v >= 0.98) WONDERS.challenge("delayed-choice");
  }
  const visibility = () => (state.tags ? Math.abs(Math.sin(2 * state.angle * DEG)) : 1);

  // Redraw films and counts from the hit list.
  function rebuild() {
    for (const f of films) f.g.clearRect(0, 0, PW, FILM_H);
    state.cAll.fill(0); state.c1.fill(0); state.c2.fill(0);
    state.n1 = 0; state.n2 = 0; state.waiting = 0;
    for (const h of state.hits) {
      const b = binOf(h.x);
      state.cAll[b]++;
      if (!h.o) { state.waiting++; dot(films[0], h.x, h.fy, COL.grey); continue; }
      const c = h.o === 1 ? COL.d1 : COL.d2;
      dot(films[0], h.x, h.fy, state.colour ? c : COL.grey);
      if (h.o === 1) { state.c1[b]++; state.n1++; dot(films[1], h.x, h.fy, c); }
      else { state.c2[b]++; state.n2++; dot(films[2], h.x, h.fy, c); }
    }
  }

  function clearAll() {
    state.hits = [];
    state.flights = [];
    rebuild();
    updateReadouts();
  }

  // A new polarizer angle: hits already sorted at the old angle are removed so data never mixes.
  // Twins still waiting in the delay line have not been measured, so their hits stay.
  function dropSorted() {
    state.hits = state.hits.filter((h) => !h.o);
    rebuild();
  }

  // ---------- Firing ----------
  const FLIGHT_MS = 1000;
  function fire(animate) {
    const x = sampleX();
    if (animate && !Lab.reducedMotion && state.flights.length < 12) {
      state.flights.push({ x, t: 0, stored: state.delay });
    } else {
      land(x);
    }
  }

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

  function pathPoint(pts, u) {
    let len = 0;
    const segs = [];
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      segs.push(l); len += l;
    }
    let d = Math.max(0, Math.min(1, u)) * len;
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i] || i === segs.length - 1) {
        const f = segs[i] ? Math.min(1, d / segs[i]) : 0;
        return [pts[i][0] + f * (pts[i + 1][0] - pts[i][0]), pts[i][1] + f * (pts[i + 1][1] - pts[i][1])];
      }
      d -= segs[i];
    }
    return pts[pts.length - 1];
  }

  function drawApparatus() {
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, W, H);
    font(12);

    // Beams
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(169,139,255,0.55)";
    ctx.beginPath(); ctx.moveTo(LASER.x + 14, LASER.y); ctx.lineTo(CRY.x - 10, CRY.y); ctx.stroke();
    ctx.strokeStyle = "rgba(255,111,94,0.28)";
    ctx.beginPath();
    ctx.moveTo(CRY.x + 6, CRY.y - 6); ctx.lineTo(170, SIG_Y); ctx.lineTo(BAR_X - 4, SIG_Y);
    ctx.moveTo(CRY.x + 6, CRY.y + 6); ctx.lineTo(170, IDL_Y);
    if (state.delay) { ctx.lineTo(COIL_X - 22, IDL_Y); ctx.moveTo(COIL_X + 22, IDL_Y); }
    ctx.lineTo(PBS.x - 11, IDL_Y);
    ctx.moveTo(PBS.x + 11, IDL_Y); ctx.lineTo(D1.x - 10, IDL_Y);
    ctx.moveTo(PBS.x, IDL_Y + 11); ctx.lineTo(PBS.x, D2.y - 10);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Laser and crystal
    ctx.fillStyle = "#2a3550";
    ctx.fillRect(LASER.x - 26, LASER.y - 10, 40, 20);
    ctx.fillStyle = COL.pump;
    ctx.fillRect(LASER.x + 12, LASER.y - 3, 4, 6);
    label("PUMP", LASER.x - 6, LASER.y - 18);
    ctx.save();
    ctx.translate(CRY.x, CRY.y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "rgba(143,166,255,0.25)"; ctx.strokeStyle = "#8fa6ff";
    ctx.fillRect(-9, -9, 18, 18); ctx.strokeRect(-9, -9, 18, 18);
    ctx.restore();
    // On the narrow layout the crystal label sits under the pump, clear of the twin's beam.
    const cryLx = narrow ? 58 : CRY.x;
    label("CRYSTAL", cryLx, CRY.y + (narrow ? 36 : 30));
    font(10);
    label("makes twins", cryLx, CRY.y + (narrow ? 56 : 43), "center", COL.dim);
    font(12);

    // Double slit
    label("DOUBLE SLIT", BAR_X, 32);
    ctx.fillStyle = COL.metal;
    const hw = 3;
    const sTop = SIG_Y - SLIT_GAP / 2, sBot = SIG_Y + SLIT_GAP / 2;
    ctx.fillRect(BAR_X - 3, SCR_TOP - 10, 6, sTop - hw - (SCR_TOP - 10));
    ctx.fillRect(BAR_X - 3, sTop + hw, 6, sBot - hw - sTop - hw);
    ctx.fillRect(BAR_X - 3, sBot + hw, 6, SCR_BOT + 10 - sBot - hw);
    if (state.tags) {
      // Tag markers: H (horizontal arrow) on top slit, V (vertical arrow) on bottom
      ctx.strokeStyle = COL.d1; ctx.fillStyle = COL.d1;
      ctx.beginPath(); ctx.moveTo(BAR_X + 9, sTop); ctx.lineTo(BAR_X + 23, sTop); ctx.stroke();
      font(10);
      label("H", BAR_X + 30, sTop + 4, "left", COL.d1);
      ctx.strokeStyle = COL.d2;
      ctx.beginPath(); ctx.moveTo(BAR_X + 16, sBot - 6); ctx.lineTo(BAR_X + 16, sBot + 7); ctx.stroke();
      label("V", BAR_X + 30, sBot + 4, "left", COL.d2);
      label("tags", BAR_X + 20, SCR_BOT + (narrow ? 30 : 26), "center", COL.dim);
      font(12);
    }

    // Screen (side view) with the accumulated glow
    label("SCREEN", SCR_X, 32);
    ctx.fillStyle = "#1c2639";
    ctx.fillRect(SCR_X - 3, SCR_TOP, 6, SCR_BOT - SCR_TOP);
    const maxC = Math.max(1, ...state.cAll);
    for (let b = 0; b < BINS; b++) {
      if (!state.cAll[b]) continue;
      const y0 = yOnScreen(-HALF + (b + 1) * 2 * HALF / BINS);
      const y1 = yOnScreen(-HALF + b * 2 * HALF / BINS);
      ctx.fillStyle = `rgba(201,212,227,${0.12 + 0.8 * state.cAll[b] / maxC})`;
      ctx.fillRect(SCR_X - 3, y0, 6, y1 - y0 + 0.5);
    }

    // Twin path: delay coil, polarizer, detectors
    if (narrow) label("TWIN", 150, IDL_Y - 8, "right");
    else label("TWIN", 170, IDL_Y - 14, "center");
    if (state.delay) {
      ctx.strokeStyle = state.coil > 0 ? `rgba(240,179,90,${0.5 + 0.4 * state.coil})` : "#5c6a86";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.ellipse(COIL_X - 12 + i * 6, IDL_Y, 6, 16, 0, 0, Math.PI * 2); ctx.stroke();
      }
      label("DELAY LINE", COIL_X, IDL_Y - (narrow ? 30 : 26));
      font(10);
      label(`${state.waiting.toLocaleString()} waiting`, COIL_X, IDL_Y + (narrow ? 40 : 32), "center", state.waiting ? COL.d2 : COL.dim);
      font(12);
    }
    // Polarizing beam splitter, with a dial showing its axis
    ctx.fillStyle = "rgba(143,166,255,0.18)"; ctx.strokeStyle = "#8fa6ff";
    ctx.fillRect(PBS.x - 11, PBS.y - 11, 22, 22); ctx.strokeRect(PBS.x - 11, PBS.y - 11, 22, 22);
    ctx.beginPath(); ctx.moveTo(PBS.x - 11, PBS.y + 11); ctx.lineTo(PBS.x + 11, PBS.y - 11); ctx.stroke();
    const dial = { x: PBS.x, y: PBS.y - 38 };
    ctx.strokeStyle = "#3a4760"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(dial.x, dial.y, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#8fa6ff"; ctx.lineWidth = 2.2;
    const th = state.angle * DEG;
    ctx.beginPath();
    ctx.moveTo(dial.x - 11 * Math.cos(th), dial.y + 11 * Math.sin(th));
    ctx.lineTo(dial.x + 11 * Math.cos(th), dial.y - 11 * Math.sin(th));
    ctx.stroke();
    ctx.lineWidth = 1;
    label(`POLARIZER ${state.angle}°`, dial.x, dial.y - 20);

    drawDetector(D1, "D1", COL.d1, state.flash1);
    drawDetector(D2, "D2", COL.d2, state.flash2);

    // Sorter: matches each hit with its twin's detector
    font(11);
    const sw = Math.max(72, ctx.measureText("SORTER").width + 16), sh = narrow ? 28 : 24;
    if (narrow) SORT.x = Math.min(428, W - 10 - sw / 2);
    ctx.strokeStyle = "#2c3a55"; ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(SCR_X, SCR_BOT + 4); ctx.lineTo(SORT.x, SORT.y - sh / 2);
    ctx.moveTo(D1.x, D1.y - 12); ctx.lineTo(SORT.x, SORT.y + sh / 2);
    if (!narrow) {
      ctx.moveTo(D2.x + 12, D2.y - 6); ctx.quadraticCurveTo(D1.x + 30, D2.y - 10, SORT.x + 30, SORT.y + 8);
      ctx.moveTo(SORT.x + 36, SORT.y); ctx.lineTo(PX - 8, SORT.y);
    } else {
      // Sorted hits feed the panels stacked below.
      ctx.moveTo(D2.x + 12, D2.y - 6); ctx.quadraticCurveTo(W - 10, D2.y + 2, SORT.x + 30, SORT.y + 14);
      ctx.moveTo(SORT.x + sw / 2, SORT.y); ctx.lineTo(W - 8, SORT.y); ctx.lineTo(W - 8, PANEL_TOP - 32);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#0b1220"; ctx.strokeStyle = "#3a4760";
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(SORT.x - sw / 2, SORT.y - sh / 2, sw, sh, 5) : ctx.rect(SORT.x - sw / 2, SORT.y - sh / 2, sw, sh);
    ctx.fill(); ctx.stroke();
    label("SORTER", SORT.x, SORT.y + (narrow ? 6 : 4), "center", COL.white);
    font(12);
  }

  function drawDetector(d, name, colour, flash) {
    ctx.fillStyle = "#1c2639";
    ctx.beginPath(); ctx.arc(d.x, d.y, 10, 0, Math.PI * 2); ctx.fill();
    if (flash > 0) {
      ctx.fillStyle = colour;
      ctx.globalAlpha = flash;
      ctx.beginPath(); ctx.arc(d.x, d.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = colour;
    ctx.beginPath(); ctx.arc(d.x, d.y, 10, 0, Math.PI * 2); ctx.stroke();
    label(name, d.x, d.y + (narrow ? 32 : 28), "center", colour);
  }

  function drawPanels() {
    const nAll = state.hits.length, nSorted = state.n1 + state.n2;
    let scale = Math.max(1, ...state.cAll, nAll * Math.max(...state.pAll)) * 1.08;
    const panels = [
      { title: "SCREEN: ALL HITS", sub: "the only thing the screen records", counts: state.cAll, n: nAll, pdf: state.pAll, nTheory: nAll, bar: "rgba(170,182,200,0.6)", film: films[0], colour: COL.white },
      { title: "HITS WHOSE TWIN REACHED D1", sub: "", counts: state.c1, n: state.n1, pdf: state.p1, nTheory: nSorted, bar: "rgba(111,216,196,0.75)", film: films[1], colour: COL.d1 },
      { title: "HITS WHOSE TWIN REACHED D2", sub: "", counts: state.c2, n: state.n2, pdf: state.p2, nTheory: nSorted, bar: "rgba(240,179,90,0.75)", film: films[2], colour: COL.d2 },
    ];
    const bw = PW / BINS;
    panels.forEach((p, i) => {
      const top = PANEL_TOP + i * (PANEL_H + PANEL_GAP);
      font(11);
      label(p.title, PX, top - 6, "left", p.colour);
      label(p.n.toLocaleString(), PX + PW, top - 6, "right", COL.label);
      // Film strip
      ctx.fillStyle = "#0a0f19";
      ctx.fillRect(PX, top, PW, FILM_H);
      ctx.drawImage(p.film.c, PX, top, PW, FILM_H);
      ctx.strokeStyle = COL.rule;
      ctx.strokeRect(PX + 0.5, top + 0.5, PW - 1, FILM_H - 1);
      // Histogram
      const base = top + FILM_H + 6 + HIST_H;
      for (let b = 0; b < BINS; b++) {
        const c = p.counts[b];
        if (!c) continue;
        const h = (c / scale) * HIST_H;
        ctx.fillStyle = p.bar;
        ctx.fillRect(PX + b * bw + 0.3, base - h, bw - 0.6, h);
      }
      ctx.strokeStyle = COL.rule;
      ctx.beginPath(); ctx.moveTo(PX, base + 0.5); ctx.lineTo(PX + PW, base + 0.5); ctx.stroke();
      if (p.nTheory > 0) {
        ctx.strokeStyle = "rgba(233,238,247,0.85)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let b = 0; b < BINS; b++) {
          const x = PX + (b + 0.5) * bw;
          const y = base - (p.nTheory * p.pdf[b] / scale) * HIST_H;
          b === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      if (i > 0 && p.n === 0) {
        font(12, SANS);
        label(state.waiting ? "Twins not measured yet: nothing to sort" : "Waiting for photons…", PX + PW / 2, base - HIST_H / 2, "center", COL.dim);
      }
    });
    // Axis note under the last panel
    font(10);
    const yAxis = Y_AXIS;
    label("−12 mm", PX, yAxis, "left", COL.dim);
    label("position on screen", PX + PW / 2, yAxis, "center", COL.dim);
    label("+12 mm", PX + PW, yAxis, "right", COL.dim);
  }

  function drawFlights(dt) {
    const done = [];
    const sigPts = [[CRY.x + 6, CRY.y - 6], [170, SIG_Y], [BAR_X, SIG_Y]];
    for (const f of state.flights) {
      f.t += dt / FLIGHT_MS;
      const legSlit = 0.55;
      // Signal photon
      let sp;
      if (f.t < legSlit) sp = pathPoint(sigPts, f.t / legSlit);
      else {
        const u = (f.t - legSlit) / (1 - legSlit);
        sp = [BAR_X + u * (SCR_X - BAR_X), SIG_Y + u * (yOnScreen(f.x) - SIG_Y)];
        if (u < 0.25) {
          // Brief glow at both slits: the photon's wave passes through both
          ctx.fillStyle = `rgba(255,111,94,${0.6 * (1 - u / 0.25)})`;
          ctx.beginPath(); ctx.arc(BAR_X, SIG_Y - SLIT_GAP / 2, 4, 0, Math.PI * 2); ctx.arc(BAR_X, SIG_Y + SLIT_GAP / 2, 4, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.fillStyle = COL.photon;
      ctx.beginPath(); ctx.arc(sp[0], sp[1], 3, 0, Math.PI * 2); ctx.fill();
      // Twin photon
      const idlPts = f.stored
        ? [[CRY.x + 6, CRY.y + 6], [170, IDL_Y], [COIL_X - 18, IDL_Y]]
        : [[CRY.x + 6, CRY.y + 6], [170, IDL_Y], [PBS.x, IDL_Y]];
      if (f.t < 1) {
        const ip = pathPoint(idlPts, f.t);
        ctx.fillStyle = COL.photon;
        ctx.beginPath(); ctx.arc(ip[0], ip[1], 3, 0, Math.PI * 2); ctx.fill();
      }
      if (f.t >= 1) done.push(f);
    }
    for (const f of done) {
      state.flights.splice(state.flights.indexOf(f), 1);
      land(f.x); // if the delay was switched mid-flight, land() follows the current setting
      WONDERS.sound("tick", { pitch: (f.x + HALF) / (2 * HALF) });
      if (state.delay) state.coil = 1;
      state.flashScreen = { y: yOnScreen(f.x), a: 1 };
      updateReadouts();
    }
    if (state.flashScreen && state.flashScreen.a > 0) {
      ctx.fillStyle = `rgba(255,255,255,${state.flashScreen.a})`;
      ctx.beginPath(); ctx.arc(SCR_X, state.flashScreen.y, 4, 0, Math.PI * 2); ctx.fill();
      state.flashScreen.a -= dt / 300;
    }
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    if (state.running && state.rate > 0) {
      state.pending += state.rate * dt / 1000;
      let n = Math.min(200, Math.floor(state.pending));
      state.pending -= n;
      const animate = state.rate <= 40;
      let landedNow = false;
      while (n-- > 0) { fire(animate); landedNow = true; }
      if (landedNow && !animate) updateReadouts();
    }
    state.flash1 = Math.max(0, state.flash1 - dt / 250);
    state.flash2 = Math.max(0, state.flash2 - dt / 250);
    state.coil = Math.max(0, state.coil - dt / 400);
    drawApparatus();
    drawPanels();
    drawFlights(dt);
    requestAnimationFrame(frame);
  }

  // ---------- Controls ----------
  function updateReadouts() {
    $("count").textContent = state.hits.length.toLocaleString();
    $("split").textContent = `${state.n1.toLocaleString()} · ${state.n2.toLocaleString()}`;
    $("waiting").textContent = state.delay || state.waiting ? state.waiting.toLocaleString() : "delay off";
    const v = visibility();
    $("vis").textContent = Math.round(v * 100) + "%";
    $("visAll").textContent = state.tags ? "none" : "full";
    let note = "";
    if (state.tags) {
      if (state.angle === 45) note = " · eraser";
      else if (state.angle === 0 || state.angle === 90) note = " · reads the path";
    }
    $("angleOut").textContent = state.angle + "°" + note;
    $("angle0").setAttribute("aria-pressed", String(state.angle === 0));
    $("angle45").setAttribute("aria-pressed", String(state.angle === 45));
    $("measure").disabled = state.waiting === 0;
    const sorted = state.n1 + state.n2;
    if (state.tags && (state.angle === 0 || state.angle === 90) && sorted >= 1000) WONDERS.challenge("read-path");
    if (state.tags && v >= 0.45 && v <= 0.55 && sorted >= 2000) WONDERS.challenge("half-erased");
  }

  // ---------- Narration ----------
  function describeScene() {
    const v = Math.round(visibility() * 100);
    const n = state.hits.length.toLocaleString();
    let s = state.tags
      ? `Which-path tags are on, so the bare screen shows ${n} hits in one smooth blob with no stripes.`
      : `Which-path tags are off, so the bare screen shows ${n} hits in clear stripes.`;
    s += ` The twin's polarizer is at ${state.angle}°. ${state.n1.toLocaleString()} twins reached D1 and ${state.n2.toLocaleString()} reached D2; each sorted group has ${v}% fringe visibility.`;
    if (state.waiting) s += ` ${state.waiting.toLocaleString()} twins are waiting in the delay line, so their screen hits are not sorted yet.`;
    return s;
  }
  WONDERS.describer(describeScene);

  function setAngle(a) {
    state.angle = a;
    $("angle").value = a;
    computePdf();
    dropSorted();
    updateReadouts();
  }

  $("angle").addEventListener("input", (e) => setAngle(+e.target.value));
  $("angle0").addEventListener("click", () => {
    setAngle(0);
    WONDERS.describe("Polarizer at 0°: the twin's result now reveals which slit was used. Sorted hits were cleared; neither group can show stripes.", { now: true });
  });
  $("angle45").addEventListener("click", () => {
    setAngle(45);
    WONDERS.describe("Polarizer at 45°: the which-path record is erased. Sorted hits were cleared; the D1 group will show stripes and D2 the gaps.", { now: true });
  });
  $("tags").addEventListener("change", (e) => {
    state.tags = e.target.checked;
    computePdf();
    clearAll();
    WONDERS.describe(state.tags ? "Which-path tags on. The screen was cleared; the bare screen will show a blob." : "Which-path tags off. The screen was cleared; stripes will appear directly on the bare screen.", { now: true });
  });
  $("delay").addEventListener("change", (e) => {
    state.delay = e.target.checked;
    if (!state.delay && state.waiting) measureStored(); // the stored twins come out to the polarizer
    updateReadouts();
    if (state.delay) WONDERS.describe("Delay on. New twins are held in a fibre, so their screen hits stay grey until you measure.", { now: true });
  });
  $("measure").addEventListener("click", measureStored);
  $("colour").addEventListener("change", (e) => { state.colour = e.target.checked; rebuild(); });
  $("rate").addEventListener("input", (e) => {
    state.rate = Math.max(1, Math.round(Math.pow(200, e.target.value / 100)));
    $("rateOut").textContent = state.rate;
  });
  $("play").addEventListener("click", () => {
    state.running = !state.running;
    $("play").textContent = state.running ? "Pause" : "Resume";
  });
  $("clear").addEventListener("click", () => { clearAll(); WONDERS.describe("Screen cleared.", { now: true }); });

  // Start with a sorted pattern already on screen so the first view tells the story.
  state.rate = Math.max(1, Math.round(Math.pow(200, $("rate").value / 100)));
  $("rateOut").textContent = state.rate;
  applyLayout(wantNarrow());
  new ResizeObserver(() => { const n = wantNarrow(); if (n !== narrow) applyLayout(n); }).observe(canvas.parentElement);
  computePdf();
  for (let i = 0; i < 2400; i++) land(sampleX());
  updateReadouts();
  requestAnimationFrame(frame);
})();
