(function () {
  const canvas = document.getElementById("bench");
  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;

  // ---------- Layout ----------
  let W = 960, H = 560, ctx, compact = false;
  let SC, CU, SP;                 // regions: scene, curve panel, spiral panel {x, y, w, h}
  let LABEL_FONT = 12, TICK_FONT = 10;
  function setGeometry() {
    if (!compact) {
      W = 960; H = 560;
      SC = { x: 0, y: 0, w: 610, h: 350 };
      CU = { x: 0, y: 352, w: 610, h: 208 };
      SP = { x: 622, y: 0, w: 338, h: 560 };
      LABEL_FONT = 12; TICK_FONT = 10;
    } else {
      W = 340; H = 800;
      SC = { x: 0, y: 0, w: 340, h: 290 };
      CU = { x: 0, y: 292, w: 340, h: 180 };
      SP = { x: 0, y: 476, w: 340, h: 324 };
      LABEL_FONT = 12; TICK_FONT = 11;
    }
  }

  // ---------- State ----------
  const state = {
    mode: "free",        // free | mirror | refract
    rRel: 0.03,          // free flight: de Broglie wavelength ÷ distance A to B
    lambda: 550,         // nm, mirror and refraction
    surface: "whole",    // whole | ends | middle | grating
    det: 40,             // mirror: detector angle from straight up, degrees (+ = right)
    spacing: 1.2,        // grating spacing, µm
    n: 1.5,              // refraction: refractive index of the lower medium
    sel: null,           // selected path parameter u (null: none yet)
    build: 1,            // 0..1 progress of the "add the arrows" animation
    building: false,
  };

  // Mirror geometry in µm. The mirror runs along y = 0 from −HALF to +HALF;
  // the source and the detector sit on a circle of radius ARC around its centre.
  const HALF = 25, ARC = 50, SRC_ANG = -40, COVER = 8;
  const mirrorSrc = () => ({ x: ARC * Math.sin(SRC_ANG * Math.PI / 180), y: ARC * Math.cos(SRC_ANG * Math.PI / 180) });
  const mirrorDet = (deg) => ({ x: ARC * Math.sin(deg * Math.PI / 180), y: ARC * Math.cos(deg * Math.PI / 180) });
  // Refraction geometry in µm: interface along y = 0, glass below.
  const RS = { x: -30, y: 32 }, RD = { x: 30, y: -32 }, RHALF = 60;
  // Free flight: A at 0, B at 1 (units of the distance), bulge a in ±FREE_A.
  const FREE_A = 0.3;

  function mirrorMask(x, surface, spacing) {
    if (x < -HALF || x > HALF) return 0;
    if (surface === "ends") return Math.abs(x) < COVER ? 0 : 1;
    if (surface === "middle") return Math.abs(x) < COVER ? 1 : 0;
    if (surface === "grating") { const f = (x + HALF) / spacing; return f - Math.floor(f) < 0.5 ? 1 : 0; }
    return 1;
  }

  // ---------- Physics: one family of paths, each with a phase ----------
  // Every path gets an arrow of the same length that has turned by its phase:
  // S/ħ for a particle, 2π × (optical path length) ÷ λ for light. Phases are
  // measured from the stationary (classical) path, since only differences matter.
  let M = null;      // current model
  function buildModel() {
    const m = { mode: state.mode };
    let phase, g;
    if (state.mode === "free") {
      // Path x(t) = vt, y(t) = a·sin(πt/T). For a free particle the action is
      // S = S_cl + mπ²a²/(4T) exactly, so S/ħ − S_cl/ħ = π³a²/(2λL) with L = 1.
      const kap = Math.pow(Math.PI, 3) / (2 * state.rRel);
      m.u0 = -FREE_A; m.u1 = FREE_A; m.ustat = 0;
      phase = (u) => kap * u * u;
      m.phi2 = 2 * kap;
      g = 2 * kap * FREE_A;
      m.weight = () => 1;
      m.kap = kap;
      m.band = Math.sqrt(Math.PI / kap);      // arrows within half a turn of the classical one
    } else if (state.mode === "mirror") {
      const k = TAU / (state.lambda / 1000);
      const S = mirrorSrc(), D = mirrorDet(state.det);
      m.S = S; m.D = D; m.k = k;
      const len = (x) => Math.hypot(x - S.x, S.y) + Math.hypot(x - D.x, D.y);
      phase = (x) => k * len(x);
      m.len = len;
      m.ustat = (S.x * D.y + D.x * S.y) / (S.y + D.y);   // image-source construction
      const l1 = Math.hypot(m.ustat - S.x, S.y), l2 = Math.hypot(m.ustat - D.x, D.y);
      m.phi2 = k * (S.y * S.y / l1 ** 3 + D.y * D.y / l2 ** 3);
      m.u0 = -HALF - 3; m.u1 = HALF + 3;
      g = 2 * k;
      const surf = state.surface, sp = state.spacing;
      m.weight = (x) => mirrorMask(x, surf, sp);
    } else {
      const k = TAU / (state.lambda / 1000), n = state.n;
      m.S = RS; m.D = RD; m.k = k; m.n = n;
      const len = (x) => Math.hypot(x - RS.x, RS.y) + n * Math.hypot(x - RD.x, RD.y);
      const dlen = (x) => (x - RS.x) / Math.hypot(x - RS.x, RS.y) + n * (x - RD.x) / Math.hypot(x - RD.x, RD.y);
      let lo = RS.x, hi = RD.x;
      for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (dlen(mid) > 0) hi = mid; else lo = mid; }
      m.ustat = (lo + hi) / 2;
      m.len = len;
      phase = (x) => k * len(x);
      const l1 = Math.hypot(m.ustat - RS.x, RS.y), l2 = Math.hypot(m.ustat - RD.x, RD.y);
      m.phi2 = k * (RS.y * RS.y / l1 ** 3 + n * RD.y * RD.y / l2 ** 3);
      m.u0 = -RHALF; m.u1 = RHALF;
      g = k * (1 + n);
      m.weight = () => 1;
      m.theta1 = Math.atan2(Math.abs(m.ustat - RS.x), RS.y);
      m.theta2 = Math.atan2(Math.abs(RD.x - m.ustat), -RD.y);
    }
    const p0 = phase(m.ustat);
    m.rel = (u) => phase(u) - p0;
    // Enough samples that neighbouring arrows differ by at most 0.3 rad.
    const N = Math.max(2000, Math.min(60000, Math.ceil((m.u1 - m.u0) * g / 0.3)));
    m.N = N;
    const du = (m.u1 - m.u0) / N;
    m.du = du;
    m.aref = Math.sqrt(TAU / m.phi2);     // the arrow from an infinite, perfect family of paths
    const cx = new Float64Array(N + 1), cy = new Float64Array(N + 1), ph = new Float32Array(N), w = new Uint8Array(N);
    let x = 0, y = 0;
    const s = du / m.aref;                 // chain in units of the perfect arrow
    for (let i = 0; i < N; i++) {
      const u = m.u0 + (i + 0.5) * du;
      const p = m.rel(u);
      const wt = m.weight(u);
      ph[i] = p; w[i] = wt;
      if (wt) { x += s * Math.cos(p); y += s * Math.sin(p); }
      cx[i + 1] = x; cy[i + 1] = y;
    }
    m.cx = cx; m.cy = cy; m.ph = ph; m.w = w;
    m.amp = Math.hypot(x, y);
    m.bright = m.amp * m.amp;
    // Plain mirror at this detector position, for comparison.
    if (state.mode === "mirror") {
      if (state.surface === "whole") m.plain = m.bright;
      else {
        let px = 0, py = 0;
        for (let i = 0; i < N; i++) {
          const u = m.u0 + (i + 0.5) * du;
          if (u < -HALF || u > HALF) continue;
          px += s * Math.cos(ph[i]); py += s * Math.sin(ph[i]);
        }
        m.plain = px * px + py * py;
      }
    }
    // Chain view: fixed scale (the perfect arrow fills about half the panel), centred.
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    for (let i = 0; i <= N; i++) {
      if (cx[i] < minX) minX = cx[i]; if (cx[i] > maxX) maxX = cx[i];
      if (cy[i] < minY) minY = cy[i]; if (cy[i] > maxY) maxY = cy[i];
    }
    m.box = { minX, maxX, minY, maxY };
    M = m;
  }

  // Brightness at every detector angle (mirror mode): the glow on the arc.
  const ARC_STEP = 1, ARC_MIN = -80, ARC_MAX = 80;
  let arcKey = "", arcB = null;
  function buildArc() {
    const key = [state.lambda, state.surface, state.spacing].join("|");
    if (key === arcKey) return;
    arcKey = key;
    const k = TAU / (state.lambda / 1000);
    const S = mirrorSrc();
    const N = Math.ceil(2 * HALF * 2 * k / 0.6);
    const dx = 2 * HALF / N;
    const xs = new Float64Array(N), l1 = new Float64Array(N), wt = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      xs[i] = -HALF + (i + 0.5) * dx;
      l1[i] = Math.hypot(xs[i] - S.x, S.y);
      wt[i] = mirrorMask(xs[i], state.surface, state.spacing);
    }
    const out = [];
    for (let a = ARC_MIN; a <= ARC_MAX + 1e-9; a += ARC_STEP) {
      const D = mirrorDet(a);
      let re = 0, im = 0;
      for (let i = 0; i < N; i++) {
        if (!wt[i]) continue;
        const p = k * (l1[i] + Math.hypot(xs[i] - D.x, D.y));
        re += Math.cos(p); im += Math.sin(p);
      }
      const x0 = (S.x * D.y + D.x * S.y) / (S.y + D.y);
      const a1 = Math.hypot(x0 - S.x, S.y), a2 = Math.hypot(x0 - D.x, D.y);
      const phi2 = k * (S.y * S.y / a1 ** 3 + D.y * D.y / a2 ** 3);
      const ref = Math.sqrt(TAU / phi2);
      out.push((re * re + im * im) * dx * dx / (ref * ref));
    }
    arcB = out;
  }

  // ---------- Colours ----------
  // An arrow's colour shows which way it points: same colour, same direction.
  // The classical path's arrow is gold.
  const HUES = 36;
  const hueCol = [];
  for (let i = 0; i < HUES; i++) hueCol.push(`hsl(${(45 + i * 360 / HUES) % 360}, 78%, 64%)`);
  const hueIndex = (p) => { let f = (p / TAU) % 1; if (f < 0) f += 1; return Math.floor(f * HUES + 0.5) % HUES; };
  const colOf = (p) => hueCol[hueIndex(p)];
  const lightRGB = () => Lab.wavelengthToRGB(state.lambda);
  const lightA = (a) => { const [r, g, b] = state.mode === "free" ? [233, 238, 247] : lightRGB(); return `rgba(${r},${g},${b},${a})`; };

  // ---------- Mappings ----------
  let sceneMap;   // world -> screen for the scene
  function setSceneMap() {
    const m = state.mode;
    if (m === "free") {
      const left = SC.x + (compact ? 30 : 60), right = SC.x + SC.w - (compact ? 30 : 60);
      const cy = SC.y + SC.h / 2 + 6;
      const sy = (SC.h / 2 - 40) / FREE_A;
      sceneMap = { left, right, cy, sy,
        pt: (t, a) => [left + t * (right - left), cy - a * Math.sin(Math.PI * t) * sy] };
    } else if (m === "mirror") {
      const s = compact ? 3.0 : 5.0;
      const ox = SC.x + SC.w / 2, oy = SC.y + SC.h - (compact ? 40 : 44);
      sceneMap = { s, ox, oy, pt: (x, y) => [ox + x * s, oy - y * s] };
    } else {
      const s = compact ? 2.35 : 4.15;
      const ox = SC.x + SC.w / 2, oy = SC.y + SC.h / 2 + 6;
      sceneMap = { s, ox, oy, pt: (x, y) => [ox + x * s, oy - y * s] };
    }
  }
  // Curve panel x for a path parameter u. For the mirror and refraction it lines
  // up with the scene above, like the figures in Feynman's QED.
  function curveX(u) {
    if (state.mode === "free") {
      const l = CU.x + (compact ? 30 : 60), r = CU.x + CU.w - (compact ? 30 : 60);
      return l + (u - M.u0) / (M.u1 - M.u0) * (r - l);
    }
    return sceneMap.pt(u, 0)[0];
  }
  function curveU(px) {
    if (state.mode === "free") {
      const l = CU.x + (compact ? 30 : 60), r = CU.x + CU.w - (compact ? 30 : 60);
      return M.u0 + (px - l) / (r - l) * (M.u1 - M.u0);
    }
    return (px - sceneMap.ox) / sceneMap.s;
  }
  const clampU = (u) => Math.max(M.u0 + M.du, Math.min(M.u1 - M.du, u));
  const selStep = () => (M.u1 - M.u0) / 120;

  // ---------- Drawing helpers ----------
  const mono = (f) => f + "px 'IBM Plex Mono', ui-monospace, monospace";
  const sans = (f) => f + "px 'IBM Plex Sans', system-ui, sans-serif";
  function label(text, x, y, maxW, align, color) {
    let f = LABEL_FONT;
    ctx.font = mono(f);
    while (f > TICK_FONT && ctx.measureText(text).width > maxW) { f -= 0.5; ctx.font = mono(f); }
    const w = ctx.measureText(text).width;
    ctx.textAlign = "left";
    let lx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    lx = Math.max(4, Math.min(W - 4 - w, lx));
    // A dark halo keeps labels readable over the paths.
    ctx.strokeStyle = "rgba(5, 8, 14, 0.85)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
    ctx.strokeText(text, lx, y);
    ctx.lineWidth = 1;
    ctx.fillStyle = color || "#7f8ea6";
    ctx.fillText(text, lx, y);
  }
  function arrow(x0, y0, x1, y1, color, lw, head) {
    const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
    const h = Math.min(head || 8, L * 0.45);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * h * 0.6, y1 - Math.sin(a) * h * 0.6); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - h * Math.cos(a - 0.42), y1 - h * Math.sin(a - 0.42));
    ctx.lineTo(x1 - h * Math.cos(a + 0.42), y1 - h * Math.sin(a + 0.42));
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = 1;
  }
  function panelFrame(r) {
    ctx.strokeStyle = "#1a2436";
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  }

  // Display paths: a fixed sample of the family drawn in the scene and as arrows.
  const nDisplay = () => (compact ? 31 : 41);
  const displayU = (j, n) => M.u0 + (M.u1 - M.u0) * (j + 0.5) / n;

  // Screen points of one path.
  function pathPoints(u) {
    if (state.mode === "free") {
      const pts = [];
      for (let i = 0; i <= 40; i++) pts.push(sceneMap.pt(i / 40, u));
      return pts;
    }
    return [sceneMap.pt(M.S.x, M.S.y), sceneMap.pt(u, 0), sceneMap.pt(M.D.x, M.D.y)];
  }
  function strokePath(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  // ---------- Scene ----------
  function drawScene() {
    ctx.save();
    ctx.beginPath(); ctx.rect(SC.x, SC.y, SC.w, SC.h); ctx.clip();
    const n = nDisplay();
    const shown = state.building ? Math.floor(state.build * n) : n;
    const mode = state.mode;

    if (mode === "free") {
      const { left, right, cy } = sceneMap;
      // The bundle of paths whose arrows stay within half a turn of the classical one.
      const b = Math.min(FREE_A, M.band);
      ctx.fillStyle = "rgba(240, 200, 110, 0.10)";
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const [x, y] = sceneMap.pt(i / 40, b); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      for (let i = 40; i >= 0; i--) { const [x, y] = sceneMap.pt(i / 40, -b); ctx.lineTo(x, y); }
      ctx.fill();
      ctx.strokeStyle = "#1a2436"; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(right, cy); ctx.stroke(); ctx.setLineDash([]);
    } else if (mode === "mirror") {
      drawMirror();
    } else {
      drawInterface();
    }

    // The sample paths, coloured by the direction of their arrows.
    ctx.lineWidth = compact ? 1 : 1.25;
    for (let j = 0; j < shown; j++) {
      const u = displayU(j, n);
      const wt = M.weight(u);
      ctx.globalAlpha = wt ? 0.62 : 0.12;
      ctx.strokeStyle = colOf(M.rel(u));
      strokePath(pathPoints(u));
    }
    ctx.globalAlpha = 1;

    // The stationary path: classical / least time.
    // (Dimmed when that point has no mirror under it.)
    ctx.strokeStyle = M.weight(M.ustat) ? "rgba(255, 226, 150, 0.95)" : "rgba(255, 226, 150, 0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    strokePath(pathPoints(M.ustat));
    ctx.setLineDash([]);
    ctx.lineWidth = 1;

    if (mode === "refract") {
      // The straight line: shortest distance, not shortest time.
      const a = sceneMap.pt(RS.x, RS.y), b = sceneMap.pt(RD.x, RD.y);
      ctx.strokeStyle = "rgba(160, 175, 200, 0.55)";
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Selected path.
    if (state.sel != null) {
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.6;
      strokePath(pathPoints(state.sel));
      ctx.lineWidth = 1;
      // In flight: a stopwatch-hand dot running along it.
      if (!Lab.reducedMotion) {
        const pts = pathPoints(state.sel);
        const segs = [];
        let tot = 0;
        for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); tot += d; }
        let s = ((performance.now() / 1600) % 1) * tot;
        let i = 0;
        while (i < segs.length - 1 && s > segs[i]) { s -= segs[i]; i++; }
        const f = segs[i] ? s / segs[i] : 0;
        const px = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, py = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(px, py, 3.2, 0, TAU); ctx.fill();
      }
    }

    // End points.
    let A, B, la, lb;
    if (mode === "free") { A = sceneMap.pt(0, 0); B = sceneMap.pt(1, 0); la = "A"; lb = "B"; }
    else { A = sceneMap.pt(M.S.x, M.S.y); B = sceneMap.pt(M.D.x, M.D.y); la = "SOURCE"; lb = "DETECTOR"; }
    const g = ctx.createRadialGradient(A[0], A[1], 0, A[0], A[1], 22);
    g.addColorStop(0, lightA(0.9)); g.addColorStop(1, lightA(0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(A[0], A[1], 22, 0, TAU); ctx.fill();
    ctx.fillStyle = "#e9eef7"; ctx.beginPath(); ctx.arc(A[0], A[1], 4, 0, TAU); ctx.fill();
    const bright = Math.min(1, M.bright);
    ctx.fillStyle = mode === "free" ? "#e9eef7" : lightA(0.25 + 0.75 * bright);
    ctx.strokeStyle = "#e9eef7";
    ctx.beginPath(); ctx.arc(B[0], B[1], 6, 0, TAU); ctx.fill(); ctx.stroke();

    if (mode === "free") {
      label("A", A[0], A[1] - 14, 30, "center");
      label("B", B[0], B[1] - 14, 30, "center");
      label("EVERY PATH FROM A TO B", SC.x + SC.w / 2, SC.y + 22, SC.w - 20, "center");
      const b = Math.min(FREE_A, M.band);
      const top = sceneMap.pt(0.5, b);
      if (top[1] - 10 > SC.y + 34) label("paths that add up", top[0], top[1] - 6, 200, "center", "#d9be7c");
      label("classical path", sceneMap.left + 8, sceneMap.cy + 15, 150, "left", "#d9be7c");
    } else if (mode === "mirror") {
      // Labels sit just inside the arc, so the brightness bars outside stay clear.
      const inward = (P, ang) => [P[0] - Math.sin(ang * Math.PI / 180) * 30, P[1] + Math.cos(ang * Math.PI / 180) * 30 + 4];
      const ls = inward(A, SRC_ANG), ld = inward(B, state.det);
      label("SOURCE", ls[0], ls[1], 120, "center");
      if (Math.abs(state.det - SRC_ANG) > 12) label("DETECTOR", ld[0], ld[1], 120, "center");
      label("MIRROR", sceneMap.pt(HALF, 0)[0] + 8, sceneMap.oy + 4, 80, "left");
    } else {
      label("SOURCE", A[0] - 10, A[1] - 12, 120, "center");
      label("DETECTOR", B[0], B[1] + 22, 120, "center");
      const P = sceneMap.pt(M.ustat, 0);
      label("least time", P[0] + 8, P[1] - 8, 120, "left", "#d9be7c");
      const mid = sceneMap.pt((RS.x + RD.x) / 2 - 14, (RS.y + RD.y) / 2 + 6);
      label("shortest distance", mid[0] - 6, mid[1] - 4, 160, "right", "#a0afc8");
    }
    ctx.restore();
  }

  function drawMirror() {
    const s = sceneMap.s;
    // Detector arc, with the brightness the detector would see at each angle.
    ctx.strokeStyle = "#1a2436";
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    for (let a = ARC_MIN; a <= ARC_MAX; a += 2) {
      const p = mirrorDet(a), [x, y] = sceneMap.pt(p.x, p.y);
      a === ARC_MIN ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.setLineDash([]);
    if (arcB) {
      const barMax = compact ? 18 : 26;
      ctx.lineWidth = compact ? 1.5 : 2;
      arcB.forEach((b, i) => {
        if (b < 0.004) return;
        const a = ARC_MIN + i * ARC_STEP;
        const r = a * Math.PI / 180;
        const p = mirrorDet(a);
        const [x, y] = sceneMap.pt(p.x, p.y);
        const L = barMax * Math.min(1.3, Math.sqrt(b));
        ctx.strokeStyle = lightA(Math.min(0.9, 0.2 + 0.8 * b));
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(r) * L, y - Math.cos(r) * L); ctx.stroke();
      });
      ctx.lineWidth = 1;
    }
    // The mirror itself: shiny where it reflects, dark where covered or scraped.
    const [x0, y0] = sceneMap.pt(-HALF, 0);
    const len = 2 * HALF * s;
    ctx.fillStyle = "#0e1522";
    ctx.fillRect(x0, y0, len, 7);
    const steps = Math.ceil(len * 2);
    let runStart = -1;
    ctx.fillStyle = "#b9c5d8";
    for (let i = 0; i <= steps; i++) {
      const x = -HALF + (i + 0.5) / steps * 2 * HALF;
      const on = i < steps && mirrorMask(x, state.surface, state.spacing);
      if (on && runStart < 0) runStart = i;
      if (!on && runStart >= 0) {
        ctx.fillRect(x0 + runStart / steps * len, y0, (i - runStart) / steps * len, 3);
        runStart = -1;
      }
    }
    if (state.surface === "ends" || state.surface === "middle") {
      ctx.fillStyle = "#2a3448";
      const cover = (a, b) => { const [p] = sceneMap.pt(a, 0), [q] = sceneMap.pt(b, 0); ctx.fillRect(p, y0 - 3, q - p, 6); };
      if (state.surface === "ends") cover(-COVER, COVER);
      else { cover(-HALF, -COVER); cover(COVER, HALF); }
    }
  }

  function drawInterface() {
    const [, y0] = sceneMap.pt(0, 0);
    const g = ctx.createLinearGradient(0, y0, 0, SC.y + SC.h);
    g.addColorStop(0, "rgba(90, 140, 210, 0.20)"); g.addColorStop(1, "rgba(90, 140, 210, 0.06)");
    ctx.fillStyle = g;
    ctx.fillRect(SC.x, y0, SC.w, SC.y + SC.h - y0);
    ctx.strokeStyle = "#5c7aa8";
    ctx.beginPath(); ctx.moveTo(SC.x, y0 + 0.5); ctx.lineTo(SC.x + SC.w, y0 + 0.5); ctx.stroke();
    label("AIR", SC.x + 10, y0 - 10, 80, "left");
    label(glassName() + " n = " + state.n.toFixed(2), SC.x + 10, y0 + 20, 220, "left", "#8fb0dd");
  }
  function glassName() {
    const n = state.n;
    if (n < 1.02) return "AIR";
    if (Math.abs(n - 1.33) < 0.03) return "WATER";
    if (n >= 2.38) return "DIAMOND";
    if (n >= 1.45 && n <= 1.6) return "GLASS";
    return "MEDIUM";
  }

  // ---------- Curve panel: the time (or action) of each path, and its arrow ----------
  function drawCurve() {
    const r = CU;
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.fillStyle = "#070b13";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    panelFrame(r);
    const top = r.y + 34, base = r.y + r.h - (compact ? 56 : 62);
    const arrowsY = r.y + r.h - (compact ? 22 : 26);
    const titleTxt = state.mode === "free" ? "EXTRA ACTION, IN TURNS OF THE ARROW" : "EXTRA TRAVEL TIME, IN TURNS OF THE ARROW";
    label(titleTxt, r.x + 10, r.y + 18, compact ? r.w - 20 : r.w - 200, "left");

    // Curve: turns relative to the stationary path.
    const xL = curveX(M.u0), xR = curveX(M.u1);
    let maxT = 0;
    const pts = [];
    const K = 240;
    for (let i = 0; i <= K; i++) {
      const u = M.u0 + (M.u1 - M.u0) * i / K;
      const t = M.rel(u) / TAU;
      pts.push([u, t]);
      if (t > maxT) maxT = t;
    }
    maxT = Math.max(maxT, 1);
    const ty = (t) => base - (t / maxT) * (base - top);
    // Grid: one line per whole turn when they are far enough apart.
    let stepT = 1;
    while ((base - top) / maxT * stepT < 6) stepT *= stepT === 1 ? 5 : 2;
    ctx.strokeStyle = "#111a28";
    for (let t = stepT; t <= maxT; t += stepT) { const y = Math.round(ty(t)) + 0.5; ctx.beginPath(); ctx.moveTo(xL, y); ctx.lineTo(xR, y); ctx.stroke(); }
    ctx.strokeStyle = "#26324a";
    ctx.beginPath(); ctx.moveTo(xL, base + 0.5); ctx.lineTo(xR, base + 0.5); ctx.stroke();
    label(stepT === 1 ? "1 turn per line" : stepT + " turns per line", xR, base + 15, 160, "right", "#56647c");

    // Masked (covered) parts of the mirror, shaded.
    if (state.mode === "mirror") {
      ctx.fillStyle = "rgba(42, 52, 72, 0.35)";
      const steps = 400;
      for (let i = 0; i < steps; i++) {
        const u = M.u0 + (M.u1 - M.u0) * (i + 0.5) / steps;
        if (!M.weight(u)) { const a = curveX(M.u0 + (M.u1 - M.u0) * i / steps), b = curveX(M.u0 + (M.u1 - M.u0) * (i + 1) / steps); ctx.fillRect(a, top - 8, b - a + 0.3, arrowsY + 14 - top); }
      }
    }

    ctx.strokeStyle = "#c9d4e3"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach(([u, t], i) => { const x = curveX(u), y = ty(t); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke(); ctx.lineWidth = 1;

    // The stationary point: the bottom of the curve, where it is flat.
    const xs = curveX(M.ustat);
    ctx.strokeStyle = "rgba(255, 226, 150, 0.7)"; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(xs, top - 6); ctx.lineTo(xs, arrowsY + 12); ctx.stroke(); ctx.setLineDash([]);

    // One little arrow per sample path, like the stopwatch hands in Feynman's QED.
    const n = nDisplay();
    const shown = state.building ? Math.floor(state.build * n) : n;
    const aL = compact ? 8 : 10;
    for (let j = 0; j < shown; j++) {
      const u = displayU(j, n);
      const p = M.rel(u);
      const x = curveX(u);
      const wt = M.weight(u);
      ctx.globalAlpha = wt ? 1 : 0.2;
      arrow(x - Math.cos(p) * aL / 2, arrowsY + Math.sin(p) * aL / 2, x + Math.cos(p) * aL / 2, arrowsY - Math.sin(p) * aL / 2, colOf(p), 1.4, 5);
    }
    ctx.globalAlpha = 1;

    // Selected path: marker and an enlarged arrow (its stopwatch hand).
    if (state.sel != null) {
      const x = curveX(state.sel), t = M.rel(state.sel) / TAU;
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath(); ctx.moveTo(x + 0.5, top - 6); ctx.lineTo(x + 0.5, arrowsY + 12); ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(x, ty(Math.min(t, maxT)), 3.5, 0, TAU); ctx.fill();
      const R = compact ? 15 : 19;
      const cxd = r.x + r.w - R - 14, cyd = r.y + R + (compact ? 30 : 14);
      ctx.strokeStyle = "#3a4760"; ctx.fillStyle = "#0b111c";
      ctx.beginPath(); ctx.arc(cxd, cyd, R, 0, TAU); ctx.fill(); ctx.stroke();
      const p = M.rel(state.sel);
      arrow(cxd, cyd, cxd + Math.cos(p) * (R - 2), cyd - Math.sin(p) * (R - 2), "#ffffff", 2, 7);
      if (!compact) label("SELECTED ARROW", cxd - R - 8, cyd + 4, 150, "right");
    }
    ctx.restore();
  }

  // ---------- Spiral panel: all arrows head to tail ----------
  let view = null;
  function setView() {
    const pad = 26, top = SP.y + 40, bottom = SP.y + SP.h - (compact ? 44 : 58);
    const pw = SP.w - 2 * pad, ph = bottom - top;
    let scale = 0.5 * Math.min(pw, ph);
    const b = M.box;
    const bw = (b.maxX - b.minX) * scale, bh = (b.maxY - b.minY) * scale;
    const fit = Math.min(1, pw / Math.max(1e-9, bw), ph / Math.max(1e-9, bh));
    scale *= fit;
    const cx = SP.x + SP.w / 2 - ((b.minX + b.maxX) / 2) * scale;
    const cy = (top + bottom) / 2 + ((b.minY + b.maxY) / 2) * scale;
    view = { scale, cx, cy, fit };
  }
  const vx = (x) => view.cx + x * view.scale;
  const vy = (y) => view.cy - y * view.scale;

  function drawSpiral() {
    const r = SP;
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.fillStyle = "#070b13";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    panelFrame(r);
    label("ADDING THE ARROWS, HEAD TO TAIL", r.x + 12, r.y + 20, r.w - 24, "left");

    // Reference: how long the final arrow is for a perfect, endless family of paths.
    const ox = vx(0), oy = vy(0);
    ctx.strokeStyle = "#1c273a"; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(ox, oy, view.scale, 0, TAU); ctx.stroke(); ctx.setLineDash([]);

    // The chain, decimated to about one point per pixel, coloured by arrow direction.
    const N = M.N;
    const end = state.building ? Math.max(1, Math.floor(state.build * N)) : N;
    let lx = vx(M.cx[0]), ly = vy(M.cy[0]);
    let curHue = -1;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(lx, ly);
    for (let i = 1; i <= end; i++) {
      if (!M.w[i - 1]) continue;
      const x = vx(M.cx[i]), y = vy(M.cy[i]);
      if (i < end && (x - lx) ** 2 + (y - ly) ** 2 < 0.8) continue;
      const h = hueIndex(M.ph[i - 1]);
      if (h !== curHue) {
        if (curHue >= 0) ctx.stroke();
        ctx.strokeStyle = hueCol[h];
        ctx.beginPath(); ctx.moveTo(lx, ly);
        curHue = h;
      }
      ctx.lineTo(x, y);
      lx = x; ly = y;
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    // Start dot and the final (or running) arrow.
    const ex = vx(M.cx[end]), ey = vy(M.cy[end]);
    ctx.fillStyle = "#e9eef7";
    ctx.beginPath(); ctx.arc(ox, oy, 3, 0, TAU); ctx.fill();
    if (Math.hypot(ex - ox, ey - oy) > 3) arrow(ox, oy, ex, ey, state.building ? "rgba(233,238,247,0.55)" : lightA(0.95), 2.4, 11);

    // Selected path's position along the chain.
    if (state.sel != null && !state.building) {
      const i = Math.max(0, Math.min(N, Math.round((state.sel - M.u0) / M.du)));
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(vx(M.cx[i]), vy(M.cy[i]), 5, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Legend under the chain.
    const ly0 = r.y + r.h - (compact ? 28 : 36);
    ctx.font = mono(TICK_FONT); ctx.textAlign = "left"; ctx.fillStyle = "#7f8ea6";
    const pct = Math.round(M.bright * 100);
    const txt = state.mode === "mirror" ? `final arrow² = ${pct}% of a perfect mirror's` : `final arrow² = ${pct}% of a perfect arrow²`;
    label(txt, r.x + 12, ly0, r.w - 24, "left", "#c9d4e3");
    label(view.fit < 0.999 ? "dashed circle: perfect arrow (shrunk to fit)" : "dashed circle: length of a perfect arrow", r.x + 12, ly0 + (compact ? 16 : 18), r.w - 24, "left", "#56647c");
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    drawScene();
    drawCurve();
    drawSpiral();
  }

  // ---------- Animation loop ----------
  const BUILD_MS = 2600;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    if (state.building) {
      state.build = Math.min(1, state.build + dt / BUILD_MS);
      if (state.build >= 1) {
        state.building = false;
        WONDERS.sound("event", { pitch: Math.min(1, M.bright) });
        WONDERS.describe(finalSentence());
      }
    }
    draw();
    requestAnimationFrame(frame);
  }
  function replay() {
    if (Lab.reducedMotion) { state.build = 1; state.building = false; return; }
    state.build = 0; state.building = true;
  }

  // ---------- Readouts ----------
  const fmtPct = (b) => (b >= 0.1 ? Math.round(b * 100) + "%" : b >= 0.001 ? (b * 100).toFixed(1) + "%" : "under 0.1%");
  const fmtAng = (rad) => (rad * 180 / Math.PI).toFixed(1) + "°";
  const pctNum = (b) => (b * 100).toFixed(b < 0.01 ? 2 : 1);
  const tr = (x) => (window.I18N && window.I18N.t ? window.I18N.t(x) : x);
  function setStat(i, lab, val) { $("s" + i + "l").textContent = lab; $("s" + i).textContent = val; }
  function selTurns() { return state.sel == null ? "–" : (M.rel(state.sel) / TAU).toFixed(1) + " turns"; }
  function updateReadouts() {
    $("lamRelOut").textContent = state.rRel.toFixed(state.rRel < 0.01 ? 4 : 3) + " × distance";
    $("lambdaOut").textContent = state.lambda + " nm";
    $("detOut").textContent = (state.det > 0 ? "+" : "") + state.det.toFixed(1) + "°";
    $("spacingOut").textContent = state.spacing.toFixed(2) + " µm";
    $("indexOut").textContent = state.n.toFixed(2);
    const N = M.N.toLocaleString("en-US");
    if (state.mode === "free") {
      setStat(1, "Paths that add up", "±" + (Math.min(FREE_A, M.band) * 100).toFixed(1) + "% of the distance");
      setStat(2, "Arrows added", N);
      setStat(3, "Selected path bulges by", state.sel == null ? "–" : (state.sel * 100).toFixed(1) + "% of the distance");
      setStat(4, "Selected arrow turned", selTurns());
    } else if (state.mode === "mirror") {
      setStat(1, "Detector brightness", fmtPct(M.bright) + " of a perfect mirror");
      setStat(2, "Plain mirror here", fmtPct(M.plain));
      setStat(3, "Arrows added", N);
      setStat(4, "Selected arrow turned", selTurns());
    } else {
      setStat(1, "Least-time crossing", fmtAng(M.theta1) + " in air, " + fmtAng(M.theta2) + " below");
      setStat(2, "sin ratio", (Math.sin(M.theta1) / Math.sin(M.theta2)).toFixed(2));
      setStat(3, "Arrows added", N);
      setStat(4, "Selected arrow turned", selTurns());
    }
  }

  function finalSentence() {
    if (state.mode === "free") return `All ${M.N} arrows added. Only paths within ${(Math.min(FREE_A, M.band) * 100).toFixed(1)} percent of the distance from the straight line point the same way; the rest curl up and cancel.`;
    if (state.mode === "mirror") return `All ${M.N} arrows added. The detector gets ${pctNum(M.bright)} percent of what a perfect mirror would send it.`;
    return `All ${M.N} arrows added. The arrows line up around the least-time path, which bends from ${fmtAng(M.theta1)} to ${fmtAng(M.theta2)}.`;
  }

  // ---------- Challenges ----------
  let lastSelTurn = null;
  function checkChallenges() {
    if (state.mode === "free" && M.band < 0.05) WONDERS.challenge("band");
    if (state.mode === "refract" && state.n >= 1.3 && state.sel != null && Math.abs(state.sel - M.ustat) <= selStep() * 0.6) WONDERS.challenge("least-time");
    if (state.mode === "mirror" && state.surface === "grating" && M.bright > 0.05 && M.plain < 0.01) WONDERS.challenge("grating");
  }

  // ---------- Recompute ----------
  let prevBrightBand = null;
  function recompute(opts) {
    buildModel();
    if (state.mode === "mirror") buildArc();
    setSceneMap();
    setView();
    if (state.sel != null) state.sel = clampU(state.sel);
    updateReadouts();
    checkChallenges();
    if (state.mode === "mirror") {
      const band = M.bright > 0.5 ? "bright" : M.bright > 0.05 ? "dim" : "dark";
      if (prevBrightBand && band !== prevBrightBand) {
        WONDERS.describe(`The detector is now ${band}: ${pctNum(M.bright)} percent of what a perfect mirror gives.`);
        WONDERS.sound("event", { pitch: Math.min(1, M.bright) });
      }
      prevBrightBand = band;
    } else prevBrightBand = null;
    if (opts && opts.replay) replay();
  }

  // ---------- Controls ----------
  function showModeControls() {
    for (const el of document.querySelectorAll("[data-mode]")) {
      el.hidden = !el.dataset.mode.split(" ").includes(state.mode);
    }
    $("spacing").disabled = state.surface !== "grating";
  }
  function setMode(mode, quiet) {
    state.mode = mode;
    for (const [id, m] of [["modeFree", "free"], ["modeMirror", "mirror"], ["modeRefract", "refract"]]) $(id).setAttribute("aria-pressed", String(m === mode));
    showModeControls();
    recompute({ replay: !quiet });
    // Start with a path selected away from the classical one, so its arrow is visibly turned.
    state.sel = clampU(M.ustat + (M.u1 - M.u0) * 0.14);
    updateReadouts();
    if (!quiet) {
      const what = mode === "free" ? "Free flight: a particle going from A to B by every path." : mode === "mirror" ? "Mirror: light from the source reaching the detector by bouncing off every point of the mirror." : "Refraction: light going from air into glass by every crossing point.";
      WONDERS.describe(what, { now: true });
      WONDERS.sound("event", { pitch: 0.5 });
    }
  }
  function setSurface(s) {
    state.surface = s;
    for (const [id, v] of [["surfWhole", "whole"], ["surfEnds", "ends"], ["surfMiddle", "middle"], ["surfGrating", "grating"]]) $(id).setAttribute("aria-pressed", String(v === s));
    showModeControls();
    recompute({ replay: true });
  }

  // Free-flight wavelength slider is logarithmic: 0.2 down to 0.001 of the distance.
  const relFromSlider = (v) => Math.pow(10, -3 + 2.3 * v / 100);
  $("lamRel").addEventListener("input", (e) => { state.rRel = relFromSlider(+e.target.value); recompute(); });
  $("lambda").addEventListener("input", (e) => { state.lambda = +e.target.value; recompute(); });
  $("det").addEventListener("input", (e) => { state.det = +e.target.value; recompute(); });
  $("spacing").addEventListener("input", (e) => { state.spacing = +e.target.value; recompute(); });
  $("index").addEventListener("input", (e) => { state.n = +e.target.value; recompute(); });
  $("modeFree").addEventListener("click", () => setMode("free"));
  $("modeMirror").addEventListener("click", () => setMode("mirror"));
  $("modeRefract").addEventListener("click", () => setMode("refract"));
  $("surfWhole").addEventListener("click", () => setSurface("whole"));
  $("surfEnds").addEventListener("click", () => setSurface("ends"));
  $("surfMiddle").addEventListener("click", () => setSurface("middle"));
  $("surfGrating").addEventListener("click", () => setSurface("grating"));
  $("replay").addEventListener("click", replay);

  function selectU(u, sound) {
    state.sel = clampU(u);
    updateReadouts();
    checkChallenges();
    const turns = Math.floor(M.rel(state.sel) / TAU);
    if (sound && turns !== lastSelTurn) WONDERS.sound("tick", { pitch: ((M.rel(state.sel) / TAU) % 1) });
    lastSelTurn = turns;
  }

  // Pointer: pick the path nearest the pointer (scene or curve panel).
  function pointerU(ev) {
    const rect = canvas.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * W / rect.width, py = (ev.clientY - rect.top) * H / rect.height;
    const inScene = px >= SC.x && px <= SC.x + SC.w && py >= SC.y && py <= SC.y + SC.h;
    const inCurve = px >= CU.x && px <= CU.x + CU.w && py >= CU.y && py <= CU.y + CU.h;
    if (inCurve) return curveU(px);
    if (!inScene) return null;
    if (state.mode === "free") {
      const t = Math.max(0.05, Math.min(0.95, (px - sceneMap.left) / (sceneMap.right - sceneMap.left)));
      return -(py - sceneMap.cy) / sceneMap.sy / Math.sin(Math.PI * t);
    }
    return (px - sceneMap.ox) / sceneMap.s;
  }
  let dragging = false;
  canvas.addEventListener("pointerdown", (ev) => {
    const u = pointerU(ev);
    if (u == null) return;
    dragging = true;
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
    selectU(u, true);
  });
  canvas.addEventListener("pointermove", (ev) => { if (dragging) { const u = pointerU(ev); if (u != null) selectU(u, true); } });
  const endDrag = () => { if (dragging) { dragging = false; WONDERS.describe(selSentence()); } };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  function selSentence() {
    if (state.sel == null) return "";
    const t = (M.rel(state.sel) / TAU).toFixed(1);
    if (state.mode === "free") return `Selected the path that bulges ${(state.sel * 100).toFixed(1)} percent of the distance; its arrow has turned ${t} turns more than the classical path's.`;
    const where = state.mode === "mirror" ? "hits the mirror" : "crosses into the glass";
    const off = (state.sel - M.ustat);
    return `Selected the path that ${where} ${Math.abs(off).toFixed(1)} µm ${off < 0 ? "left" : "right"} of the least-time point; its arrow has turned ${t} turns more.`;
  }

  // Keyboard on the canvas: arrows choose a path, Enter replays the sum.
  canvas.addEventListener("keydown", (e) => {
    let u = state.sel == null ? M.ustat : state.sel;
    const step = selStep() * (e.shiftKey ? 10 : 1);
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") u -= step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") u += step;
    else if (e.key === "Home") u = M.u0;
    else if (e.key === "End") u = M.u1;
    else if (e.key === "Enter" || e.key === " ") { replay(); e.preventDefault(); return; }
    else return;
    e.preventDefault();
    selectU(u, true);
    WONDERS.describe(selSentence());
  });

  // ---------- Describer ----------
  WONDERS.describer(() => {
    let main;
    if (state.mode === "free") main = `Free flight. A particle goes from A to B by every path; each path's arrow turns by its action, with a wavelength of ${state.rRel.toFixed(4)} times the distance. Paths within ${(Math.min(FREE_A, M.band) * 100).toFixed(1)} percent of the distance from the straight line add up; the rest wind into tight spirals and cancel.`;
    else if (state.mode === "mirror") main = `Mirror. Light of ${state.lambda} nm reaches a detector at ${state.det.toFixed(1)} degrees by bouncing off every point of a ${2 * HALF} µm mirror. The detector gets ${pctNum(M.bright)} percent of what a perfect mirror gives; a plain mirror here would give ${pctNum(M.plain)} percent.`;
    else main = `Refraction. Light of ${state.lambda} nm goes from air into a medium with index ${state.n.toFixed(2)}. The arrows line up around the least-time path, which bends from ${fmtAng(M.theta1)} to ${fmtAng(M.theta2)}, so the sines are in the ratio ${(Math.sin(M.theta1) / Math.sin(M.theta2)).toFixed(2)}.`;
    // Translated as two whole sentences.
    return tr(main) + " " + tr(selSentence());
  });


  // ---------- Layout (desktop vs phone) ----------
  function layout() {
    const cssW = canvas.clientWidth || 960;
    const next = cssW < 640;
    if (ctx && next === compact) return;
    compact = next;
    setGeometry();
    ctx = Lab.setupCanvas(canvas, W, H);
    if (M) { setSceneMap(); setView(); }
  }
  layout();
  let resizeTimer = 0;
  const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); };
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvas.parentElement);
  else window.addEventListener("resize", onResize);

  // Initial values from the controls (they may be restored by the browser).
  state.rRel = relFromSlider(+$("lamRel").value);
  state.lambda = +$("lambda").value;
  state.det = +$("det").value;
  state.spacing = +$("spacing").value;
  state.n = +$("index").value;
  setMode("free", true);
  replay();

  // Replay the sum once the prediction card un-blurs the bench.
  const bench = canvas.parentElement;
  new MutationObserver(() => {
    if (!bench.classList.contains("bench-hidden") && bench.dataset.seen !== "1") { bench.dataset.seen = "1"; replay(); }
  }).observe(bench, { attributes: true, attributeFilter: ["class"] });

  requestAnimationFrame(frame);
})();
