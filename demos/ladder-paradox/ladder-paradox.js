(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $("bench");
  const tr = (t) => (window.I18N ? I18N.t(t) : t);
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";

  // Units: c = 1. Lengths in metres, times as c·t in metres; shown in ns.
  const M_PER_NS = 0.299792458;
  const ns = (m) => m / M_PER_NS;
  const W_SHUT = 0.3;      // each door stays shut for 0.3 m of c·t, about 1 ns
  const FAR = 1e4;         // worldlines run from t = -FAR to +FAR (barn frame)
  const PLAY_MS = 7000;    // one pass of the animation, before slow motion near events

  const COL = {
    barn: "143,166,255", ladder: "240,179,90", shut: "233,238,247",
    clash: "255,107,107", signal: "228,139,208", light: "255,226,140", now: "233,238,247",
  };

  // ---------- Layout ----------
  let W = 960, H = 600, narrow = false, ctx;
  let R = {};
  function layout() {
    const pw = canvas.parentElement.clientWidth;
    const cw = Math.round(canvas.clientWidth || (pw ? pw - 28 : 960));
    narrow = cw < 640;
    if (!narrow) {
      W = 960; H = 600;
      R.scene = { x: 20, y: 10, w: 610, h: 150 };
      R.diag = { x: 20, y: 176, w: 610, h: 412 };
      R.panel = { x: 660, y: 10, w: 284, h: 578 };
    } else {
      W = Math.max(280, cw);
      const iw = W - 16;
      R.scene = { x: 8, y: 8, w: iw, h: 170 };
      R.diag = { x: 8, y: 190, w: iw, h: Math.round(Math.min(420, Math.max(300, iw * 1.08))) };
      R.panel = { x: 8, y: R.diag.y + R.diag.h + 18, w: iw, h: 330 };
      H = R.panel.y + R.panel.h + 8;
    }
    ctx = Lab.setupCanvas(canvas, W, H);
  }
  const fpx = (n) => (narrow ? Math.max(11, n) : n) + "px ";

  // ---------- State ----------
  const state = {
    v: 0.8, L: 10, B: 8, u: 0, mode: "barn", wall: false, simul: true,
    playing: !Lab.reducedMotion, T: 0, hold: 0,
  };
  let M = null;      // model in the barn frame
  let V = null;      // model seen from the observer

  // ---------- Model (barn frame) ----------
  // A worldline is a list of events {t, x, tau}: straight pieces between them.
  function worldline(pts, tau0) {
    let tau = tau0;
    pts[0].tau = tau;
    for (let i = 1; i < pts.length; i++) {
      const dt = pts[i].t - pts[i - 1].t, dx = pts[i].x - pts[i - 1].x;
      tau += Math.sqrt(Math.max(0, dt * dt - dx * dx));
      pts[i].tau = tau;
    }
    return pts;
  }

  function build() {
    const v = state.v, L = state.L, B = state.B;
    const g = 1 / Math.sqrt(1 - v * v);
    const Lc = L / g;                       // ladder length in the barn frame
    const x0r = B / 2 - Lc / 2;             // rear end at t = 0 if nothing stops it
    const th = (B - Lc) / (2 * v);          // front reaches the exit
    const m = { g, Lc, th, rungs: [], events: [] };
    const nR = Math.max(5, Math.round(L) + 1);
    // The ladder's own clocks are synchronised in the ladder frame: they read g(t - v x).
    const ladderTime = (t, x) => g * (t - v * x);
    for (let k = 0; k < nR; k++) {
      const s = (L * k) / (nR - 1);
      const x0 = x0r + s / g;
      const pts = [{ t: -FAR, x: x0 - v * FAR }];
      if (state.wall) {
        // The front stops at the wall at t = th; the news runs back along the ladder at c.
        const ts = (B + th - x0) / (1 + v);
        pts.push({ t: ts, x: x0 + v * ts }, { t: FAR, x: x0 + v * ts });
      } else pts.push({ t: FAR, x: x0 + v * FAR });
      m.rungs.push(worldline(pts, ladderTime(pts[0].t, pts[0].x)));
    }
    const rear = m.rungs[0], front = m.rungs[nR - 1];
    m.rear = rear; m.front = front;
    m.ent = { pts: worldline([{ t: -FAR, x: 0 }, { t: FAR, x: 0 }], -FAR), shut: [0, 0] };
    m.ext = { pts: worldline([{ t: -FAR, x: B }, { t: FAR, x: B }], -FAR), shut: [0, 0] };

    const tA = -(B / 2 + Lc / 2) / v;   // front reaches the entrance
    const tP = -(B / 2 - Lc / 2) / v;   // rear passes the entrance (while still moving)
    const tC = th;                       // front reaches the exit
    const tD = (B / 2 + Lc / 2) / v;    // rear leaves through the exit
    m.events.push({ id: "A", name: "Front reaches entrance", t: tA, x: 0, who: "ladder" });

    if (!state.wall) {
      m.ent.shut = [-W_SHUT / 2, W_SHUT / 2];
      m.ext.shut = [-W_SHUT / 2, W_SHUT / 2];
      m.clashEnt = m.ent.shut[0] < tP && m.ent.shut[1] > tA;
      m.clashExt = m.ext.shut[0] < tD && m.ext.shut[1] > tC;
      m.clash = m.clashEnt || m.clashExt;
      m.events.push(
        { id: "P", name: "Rear passes entrance", t: tP, x: 0, who: "ladder" },
        { id: "C", name: "Front reaches exit", t: tC, x: B, who: "ladder" },
        { id: "D", name: "Rear leaves exit", t: tD, x: B, who: "ladder" },
        { id: "Db", name: "Entrance door shuts", t: 0, x: 0, who: "door", clash: m.clashEnt },
        { id: "Df", name: "Exit door shuts", t: 0, x: B, who: "door", clash: m.clashExt });
      m.spare = B - Lc;
    } else {
      const rs = rear[1];                 // the rear end's stopping event
      m.xStop = rs.x;
      m.squashed = B - rs.x;              // final length, at rest in the barn
      m.trapped = rs.x > 0;
      m.ext.shut = [-Infinity, Infinity];
      m.events.push(
        { id: "H", name: "Front hits the wall", t: th, x: B, who: "ladder" },
        { id: "R", name: "Rear end stops", t: rs.t, x: rs.x, who: "ladder" });
      if (m.trapped) {
        const tb = Math.max(0, tP + W_SHUT);
        m.ent.shut = [tb, Infinity];
        m.events.push(
          { id: "P", name: "Rear passes entrance", t: tP, x: 0, who: "ladder" },
          { id: "Db", name: "Entrance door shuts", t: tb, x: 0, who: "door" });
      } else m.ent.shut = [Infinity, Infinity];
      m.signal = [{ t: th, x: B }, { t: rs.t, x: rs.x }];
    }
    M = m;
    view();
  }

  // ---------- The observer's view ----------
  function boost(e) {
    const u = state.u, gu = 1 / Math.sqrt(1 - u * u);
    return { t: gu * (e.t - u * e.x), x: gu * (e.x - u * e.t) };
  }
  function view() {
    const u = state.u, gu = 1 / Math.sqrt(1 - u * u);
    const conv = (wl) => wl.map((p) => Object.assign(boost(p), { tau: p.tau, tb: p.t }));
    const v = {
      gu,
      rungs: M.rungs.map(conv),
      ent: conv(M.ent.pts), ext: conv(M.ext.pts),
      events: M.events.map((e) => Object.assign({}, e, boost(e))),
    };
    v.rear = v.rungs[0]; v.front = v.rungs[v.rungs.length - 1];
    v.ev = Object.fromEntries(v.events.map((e) => [e.id, e]));
    let t0 = Infinity, t1 = -Infinity;
    for (const e of v.events) { t0 = Math.min(t0, e.t); t1 = Math.max(t1, e.t); }
    const pad = 0.1 * (t1 - t0) + 0.8;
    v.t0 = t0 - pad; v.t1 = t1 + (state.wall ? 2.2 * pad : pad);
    v.span = v.t1 - v.t0;
    let x0 = Infinity, x1 = -Infinity;
    for (const wl of [v.rear, v.front, v.ent, v.ext]) for (const T of [v.t0, v.t1]) {
      const x = at(wl, T).x; x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    }
    const xp = 0.04 * (x1 - x0) + 0.5;
    v.x0 = x0 - xp; v.x1 = x1 + xp;
    // Lengths in this view (at any instant before anything stops).
    const wLad = (state.v - u) / (1 - u * state.v);
    v.wLad = wLad; v.wBarn = -u;
    v.ladLen = state.L * Math.sqrt(1 - wLad * wLad);
    v.barnLen = state.B * Math.sqrt(1 - u * u);
    // Signed gap: positive when the exit-side event comes first.
    if (!state.wall) v.gap = v.ev.Db.t - v.ev.Df.t;
    else if (M.trapped) v.gap = v.ev.H.t - v.ev.Db.t;
    V = v;
  }
  // Interpolate a converted worldline at observer time T.
  function at(wl, T) {
    for (let i = 0; i < wl.length - 1; i++) {
      const a = wl[i], b = wl[i + 1];
      if (T <= b.t || i === wl.length - 2) {
        const f = (T - a.t) / (b.t - a.t);
        return { x: a.x + f * (b.x - a.x), tau: a.tau + f * (b.tau - a.tau), tb: a.tb + f * (b.tb - a.tb) };
      }
    }
    return { x: wl[0].x, tau: wl[0].tau, tb: wl[0].tb };
  }
  const isShut = (door, tb) => tb >= door.shut[0] && tb <= door.shut[1];

  // ---------- Formatting ----------
  const fm = (x) => x.toFixed(1) + " m";
  const fns = (m) => {
    const n = ns(m);
    const a = Math.abs(n);
    const s = a >= 100 ? a.toFixed(0) : a.toFixed(1);
    return (n < -0.05 ? "−" : "") + s;
  };
  const fb = (b) => (b < -0.0005 ? "−" : "") + Math.abs(b).toFixed(3) + "c";
  function frameName() {
    if (state.mode === "barn") return "BARN FRAME";
    if (state.mode === "ladder") return "LADDER FRAME";
    if (state.mode === "mid") return "MIDWAY FRAME";
    return "OBSERVER AT " + fb(state.u).toUpperCase();
  }
  function niceStep(span, n) {
    const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
    return 10 * p;
  }
  function fit(text, x, y, maxW) {
    const t = tr(text);
    if (ctx.measureText(t).width > maxW) ctx.fillText(t, x, y, maxW); else ctx.fillText(t, x, y);
  }
  function wrapText(text, x, y, maxW, lh) {
    text = tr(text);
    const cjk = /[　-鿿]/.test(text);
    const words = cjk ? [...text] : text.split(" ");
    let line = "";
    for (const w of words) {
      const t = line ? line + (cjk ? "" : " ") + w : w;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; }
      else line = t;
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  }

  // ---------- Drawing: the scene ----------
  function drawScene(T) {
    const S = R.scene;
    const sx = S.w / (V.x1 - V.x0);
    const X = (x) => S.x + (x - V.x0) * sx;
    const ground = S.y + S.h - 34, roof = ground - 62;

    ctx.font = "500 " + fpx(12) + MONO;
    ctx.textAlign = "left";
    ctx.fillStyle = "#c9d4e3";
    fit(frameName(), S.x, S.y + 12, S.w * 0.45);
    ctx.font = fpx(11) + MONO;
    ctx.textAlign = "right";
    const motion = [];
    motion.push(Math.abs(V.wLad) < 0.0005 ? "ladder at rest" : V.wLad > 0 ? "ladder " + fb(V.wLad) + " →" : "ladder ← " + fb(-V.wLad));
    motion.push(Math.abs(V.wBarn) < 0.0005 ? "barn at rest" : V.wBarn > 0 ? "barn " + fb(V.wBarn) + " →" : "barn ← " + fb(-V.wBarn));
    ctx.fillStyle = `rgb(${COL.ladder})`;
    const m1 = tr(motion[0]), m2 = tr(motion[1]);
    if (narrow) {
      ctx.fillText(m1, S.x + S.w, S.y + 12);
      ctx.fillStyle = `rgb(${COL.barn})`;
      ctx.fillText(m2, S.x + S.w, S.y + 27);
    } else {
      ctx.fillStyle = `rgb(${COL.barn})`;
      ctx.fillText(m2, S.x + S.w, S.y + 12);
      ctx.fillStyle = `rgb(${COL.ladder})`;
      ctx.fillText(m1, S.x + S.w - ctx.measureText(m2).width - 18, S.y + 12);
    }

    // Ground
    ctx.strokeStyle = "#26324a";
    ctx.beginPath(); ctx.moveTo(S.x, ground + 0.5); ctx.lineTo(S.x + S.w, ground + 0.5); ctx.stroke();

    // Barn
    const pe = at(V.ent, T), px = at(V.ext, T);
    const xe = X(pe.x), xx = X(px.x);
    ctx.fillStyle = "rgba(143,166,255,0.08)";
    ctx.fillRect(xe, roof, xx - xe, ground - roof);
    ctx.strokeStyle = `rgba(${COL.barn},0.75)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xe, roof); ctx.lineTo((xe + xx) / 2, roof - 16); ctx.lineTo(xx, roof);
    ctx.lineTo(xe, roof);
    ctx.stroke();
    ctx.lineWidth = 1;
    // Wall planks: material points of the barn every metre, so they contract with it.
    ctx.strokeStyle = `rgba(${COL.barn},0.14)`;
    for (let k = 1; k < state.B; k++) {
      const x = xe + (xx - xe) * (k / state.B);
      ctx.beginPath(); ctx.moveTo(x + 0.5, roof + 4); ctx.lineTo(x + 0.5, ground); ctx.stroke();
    }

    // Ladder
    const pts = V.rungs.map((wl) => at(wl, T));
    const xr = X(pts[0].x), xf = X(pts[pts.length - 1].x);
    const yTop = ground - 40, yBot = ground - 20;
    ctx.strokeStyle = `rgb(${COL.ladder})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(xr, yTop); ctx.lineTo(xf, yTop);
    ctx.moveTo(xr, yBot); ctx.lineTo(xf, yBot);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const p of pts) { const x = X(p.x); ctx.moveTo(x, yTop); ctx.lineTo(x, yBot); }
    ctx.stroke();
    ctx.lineWidth = 1;

    // Doors, drawn last so a shut door sits over the ladder.
    const doors = [[pe, xe, M.ent, "entrance"], [px, xx, M.ext, "exit"]];
    for (const [p, x, door] of doors) {
      const shut = isShut(door, p.tb);
      const through = pts[0].x < p.x - 1e-9 && pts[pts.length - 1].x > p.x + 1e-9;
      const clash = shut && through && !state.wall;
      if (shut) {
        const col = clash ? COL.clash : COL.shut;
        const g = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
        g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},0.35)`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - 14, roof - 2, 28, ground - roof + 2);
        ctx.fillStyle = `rgb(${col})`;
        ctx.fillRect(x - 2.5, roof, 5, ground - roof);
      } else {
        ctx.strokeStyle = `rgba(${COL.barn},0.75)`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, roof); ctx.lineTo(x, roof + 10); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = `rgba(${COL.barn},0.35)`;
        ctx.beginPath(); ctx.moveTo(x + 0.5, roof + 10); ctx.lineTo(x + 0.5, ground); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Clocks: the barn's at the doors (above), the ladder's at its ends (below).
    ctx.font = fpx(10) + MONO;
    ctx.textAlign = "center";
    const clockRow = (items, y, col) => {
      items.sort((a, b) => a.x - b.x);
      let last = -Infinity;
      for (const it of items) {
        const t = fns(it.tau) + " ns";
        const w = ctx.measureText(t).width;
        let x = Math.max(S.x + w / 2, Math.min(S.x + S.w - w / 2, it.x));
        if (x - w / 2 < last + 6) x = last + 6 + w / 2;
        ctx.fillStyle = `rgba(${col},0.95)`;
        ctx.fillText(t, x, y);
        last = x + w / 2;
      }
    };
    clockRow([{ x: xe, tau: pe.tau }, { x: xx, tau: px.tau }], roof - 22, COL.barn);
    clockRow([{ x: xr, tau: pts[0].tau }, { x: xf, tau: pts[pts.length - 1].tau }], ground + 15, COL.ladder);
    ctx.textAlign = "left";
    ctx.fillStyle = "#56647c";
    fit("clocks: barn above, ladder below", S.x, ground + 30, S.w);
  }

  // ---------- Drawing: the spacetime diagram ----------
  function diagGeom(topY) {
    const D = R.diag;
    const top = topY, bottom = D.y + D.h - 22, left = D.x + 34, right = D.x + D.w - 6;
    const xspan = V.x1 - V.x0, tspan = V.span;
    const s = Math.min((right - left) / xspan, (bottom - top) / tspan);
    const pw = xspan * s, ph = tspan * s;
    const ox = left + ((right - left) - pw) / 2, oy = bottom - ((bottom - top) - ph) / 2;
    return { s, ox, oy, pw, ph, X: (x) => ox + (x - V.x0) * s, Y: (t) => oy - (t - V.t0) * s };
  }
  function drawDiagram(T) {
    const D = R.diag;

    ctx.font = "500 " + fpx(12) + MONO;
    ctx.textAlign = "left";
    ctx.fillStyle = "#7f8ea6";
    fit("SPACETIME DIAGRAM", D.x, D.y + 12, D.w);
    // Legend
    ctx.font = fpx(10) + MONO;
    const leg = [
      ["barn's \"same moment\"", COL.barn, [5, 4]],
      ["ladder's \"same moment\"", COL.ladder, [5, 4]],
      ["now, in this view", COL.now, []],
    ];
    let lx = D.x, ly = D.y + 30;
    for (const [label, col, dash] of leg) {
      if (!state.simul && dash.length) continue;
      const w = 22 + ctx.measureText(tr(label)).width + 16;
      if (lx + w > D.x + D.w) { lx = D.x; ly += 16; }
      ctx.strokeStyle = `rgba(${col},0.9)`; ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(lx, ly - 4); ctx.lineTo(lx + 18, ly - 4); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#97a6b9"; ctx.fillText(tr(label), lx + 22, ly);
      lx += w;
    }
    const G = diagGeom(ly + 14);
    const { X, Y } = G;

    const x0 = G.ox, x1 = G.ox + G.pw, yTop = G.oy - G.ph, yBot = G.oy;
    ctx.fillStyle = "#0a0f19";
    ctx.fillRect(x0, yTop, G.pw, G.ph);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, yTop, G.pw, G.ph); ctx.clip();

    // Grid
    const step = niceStep(Math.max(V.x1 - V.x0, V.span), narrow ? 6 : 9);
    ctx.strokeStyle = "#131c2c";
    for (let x = Math.ceil(V.x0 / step) * step; x <= V.x1; x += step) { ctx.beginPath(); ctx.moveTo(X(x) + 0.5, yTop); ctx.lineTo(X(x) + 0.5, yBot); ctx.stroke(); }
    for (let t = Math.ceil(V.t0 / step) * step; t <= V.t1; t += step) { ctx.beginPath(); ctx.moveTo(x0, Y(t) + 0.5); ctx.lineTo(x1, Y(t) + 0.5); ctx.stroke(); }

    // World-sheets: the region the barn and the ladder sweep out.
    const sheet = (a, b, fill) => {
      const n = 60;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const t = V.t0 + (V.span * i) / n; const x = at(a, t).x; i ? ctx.lineTo(X(x), Y(t)) : ctx.moveTo(X(x), Y(t)); }
      for (let i = n; i >= 0; i--) { const t = V.t0 + (V.span * i) / n; ctx.lineTo(X(at(b, t).x), Y(t)); }
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    };
    sheet(V.ent, V.ext, "rgba(143,166,255,0.09)");
    sheet(V.rear, V.front, "rgba(240,179,90,0.16)");

    // Light rays through the entrance door event, to show the door events can't affect each other.
    const e0 = V.ev.Db || V.ev.H;
    if (e0) {
      ctx.strokeStyle = `rgba(${COL.light},0.22)`;
      ctx.setLineDash([2, 4]);
      const big = 3 * (V.span + V.x1 - V.x0);
      ctx.beginPath();
      ctx.moveTo(X(e0.x - big), Y(e0.t - big)); ctx.lineTo(X(e0.x + big), Y(e0.t + big));
      ctx.moveTo(X(e0.x + big), Y(e0.t - big)); ctx.lineTo(X(e0.x - big), Y(e0.t + big));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Worldlines
    const line = (wl, col, w) => {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath();
      wl.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.t)) : ctx.moveTo(X(p.x), Y(p.t))));
      ctx.stroke(); ctx.lineWidth = 1;
    };
    if (state.wall) for (let k = 1; k < V.rungs.length - 1; k++) line(V.rungs[k], "rgba(240,179,90,0.22)", 1);
    line(V.ent, `rgba(${COL.barn},0.8)`, 1.5);
    line(V.ext, `rgba(${COL.barn},0.8)`, 1.5);
    line(V.rear, `rgb(${COL.ladder})`, 2);
    line(V.front, `rgb(${COL.ladder})`, 2);

    // Shut intervals on the door worldlines
    for (const [wl, door, clash] of [[V.ent, M.ent, M.clashEnt], [V.ext, M.ext, M.clashExt]]) {
      if (door.shut[0] === Infinity) continue;
      const a = Math.max(door.shut[0], -FAR), b = Math.min(door.shut[1], FAR);
      const dx = door === M.ent ? 0 : state.B;
      const pa = boost({ t: a, x: dx }), pb = boost({ t: b, x: dx });
      ctx.strokeStyle = clash ? `rgb(${COL.clash})` : `rgb(${COL.shut})`;
      ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(X(pa.x), Y(pa.t)); ctx.lineTo(X(pb.x), Y(pb.t)); ctx.stroke();
      ctx.lineWidth = 1;
    }

    // The stop signal running back along the ladder at c
    if (state.wall) {
      const a = boost(M.signal[0]), b = boost(M.signal[1]);
      ctx.strokeStyle = `rgb(${COL.signal})`; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.t)); ctx.lineTo(X(b.x), Y(b.t)); ctx.stroke();
      ctx.setLineDash([]); ctx.lineWidth = 1;
    }

    // Lines of simultaneity through the key events, for the barn and the ladder.
    const keyEvents = state.wall ? [V.ev.H, V.ev.Db].filter(Boolean) : [V.ev.Db, V.ev.Df];
    if (state.simul) {
      const big = 3 * (V.span + V.x1 - V.x0);
      const simLine = (e, w, col) => {
        // In this view, frame moving at w has "same moment" lines of slope dt/dx = w.
        ctx.strokeStyle = `rgba(${col},0.85)`; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(X(e.x - big), Y(e.t - w * big)); ctx.lineTo(X(e.x + big), Y(e.t + w * big)); ctx.stroke();
        ctx.setLineDash([]); ctx.lineWidth = 1;
      };
      for (const e of keyEvents) simLine(e, V.wLad, COL.ladder);
      for (const e of keyEvents) simLine(e, V.wBarn, COL.barn);
    }

    // Now line
    ctx.strokeStyle = `rgba(${COL.now},0.7)`;
    ctx.beginPath(); ctx.moveTo(x0, Y(T) + 0.5); ctx.lineTo(x1, Y(T) + 0.5); ctx.stroke();

    // Event dots
    for (const e of V.events) {
      const key = e.who === "door" || e.id === "H" || e.id === "R";
      const passed = T >= e.t;
      ctx.beginPath(); ctx.arc(X(e.x), Y(e.t), key ? 5 : 3, 0, Math.PI * 2);
      if (key) {
        ctx.fillStyle = e.clash ? `rgb(${COL.clash})` : passed ? "#ffffff" : "#0a0f19";
        ctx.fill();
        ctx.strokeStyle = e.clash ? `rgb(${COL.clash})` : "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1;
      } else { ctx.fillStyle = `rgba(${COL.ladder},0.9)`; ctx.fill(); }
    }
    ctx.restore();

    // Labels on the key events (outside the clip so they can overhang a little)
    ctx.font = fpx(10) + MONO;
    for (const e of keyEvents) {
      const short = e.id === "Db" ? "entrance shuts" : e.id === "Df" ? "exit shuts" : "wall hit";
      const left = e.id !== "Df";
      ctx.textAlign = left ? "right" : "left";
      ctx.fillStyle = "#e9eef7";
      const lx2 = X(e.x) + (left ? -9 : 9);
      ctx.fillText(tr(short), Math.max(x0 + ctx.measureText(tr(short)).width * (left ? 1 : 0) + 2, Math.min(lx2, x1 - (left ? 0 : ctx.measureText(tr(short)).width) - 2)), Y(e.t) + (left ? -6 : 14));
    }
    if (state.wall && V.ev.R) {
      ctx.textAlign = "left"; ctx.fillStyle = `rgb(${COL.signal})`;
      const e = V.ev.R;
      fit("rear learns, stops", Math.max(x0 + 2, X(e.x) - 30), Y(e.t) - 10, x1 - x0);
    }

    // Axes
    ctx.strokeStyle = "#1f2a3f";
    ctx.strokeRect(x0 + 0.5, yTop + 0.5, G.pw - 1, G.ph - 1);
    ctx.fillStyle = "#56647c";
    ctx.textAlign = "center";
    ctx.font = fpx(10) + MONO;
    const lab = step * Math.max(1, Math.ceil(28 / (step * G.s)));
    for (let x = Math.ceil(V.x0 / lab) * lab; x <= V.x1; x += lab) ctx.fillText(String(+x.toFixed(6)), X(x), yBot + 12);
    ctx.textAlign = "right";
    for (let t = Math.ceil(V.t0 / lab) * lab; t <= V.t1; t += lab) ctx.fillText(String(+t.toFixed(6)), x0 - 4, Y(t) + 3);
    ctx.textAlign = "left";
    fit("position x (m) →", x0, yBot + 24, G.pw);
    ctx.save(); ctx.translate(Math.max(D.x + 9, x0 - 32), yBot); ctx.rotate(-Math.PI / 2);
    fit("time ct (m) →", 0, 0, G.ph); ctx.restore();
  }

  // ---------- Drawing: the order of events ----------
  function drawPanel(T) {
    const P = R.panel;
    ctx.font = "500 " + fpx(12) + MONO;
    ctx.textAlign = "left";
    ctx.fillStyle = "#7f8ea6";
    fit("ORDER OF EVENTS IN THIS VIEW", P.x, P.y + 12, P.w);
    ctx.font = fpx(11) + SANS;
    ctx.fillStyle = "#56647c";
    const subEnd = wrapText("time runs down; t = 0 when the entrance door shuts in the barn frame", P.x, P.y + 30, P.w, 15);

    const top = subEnd + 14, bottom = P.y + P.h - 12;
    const ax = P.x + 10;
    const Yt = (t) => top + (bottom - top) * (t - V.t0) / V.span;
    ctx.strokeStyle = "#26324a";
    ctx.beginPath(); ctx.moveTo(ax + 0.5, top); ctx.lineTo(ax + 0.5, bottom); ctx.stroke();

    const evs = V.events.slice().sort((a, b) => a.t - b.t);
    const lh = narrow ? 34 : 36;
    // Place labels in time order without overlap, then pull them up if they run off the end.
    const ys = [];
    let y = -Infinity;
    for (const e of evs) { y = Math.max(Yt(e.t), y + lh); ys.push(y); }
    const over = ys.length ? ys[ys.length - 1] - (bottom - 18) : 0;
    if (over > 0) for (let i = ys.length - 1, lim = bottom - 18; i >= 0; i--) { ys[i] = Math.min(ys[i], lim); lim = ys[i] - lh; }

    evs.forEach((e, i) => {
      const yy = Yt(e.t), ly = ys[i];
      const passed = T >= e.t;
      const key = e.who === "door" || e.id === "H" || e.id === "R";
      const col = e.clash ? COL.clash : e.who === "door" ? COL.shut : e.id === "R" ? COL.signal : COL.ladder;
      ctx.strokeStyle = `rgba(${col},${passed ? 0.6 : 0.25})`;
      ctx.beginPath(); ctx.moveTo(ax + 6, yy); ctx.lineTo(ax + 22, ly - 4); ctx.stroke();
      ctx.beginPath(); ctx.arc(ax, yy, key ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${col},${passed ? 1 : 0.35})`; ctx.fill();
      ctx.textAlign = "left";
      ctx.font = (key ? "600 " : "") + fpx(12) + SANS;
      ctx.fillStyle = `rgba(${col},${passed ? 1 : 0.5})`;
      let name = e.name;
      if (e.clash) name = e.id === "Db" ? "Entrance door hits the ladder" : "Exit door hits the ladder";
      fit(name, ax + 26, ly, P.w - 40);
      ctx.font = fpx(10) + MONO;
      ctx.fillStyle = passed ? "#97a6b9" : "#56647c";
      ctx.fillText("t = " + fns(e.t) + " ns", ax + 26, ly + 14);
    });
    // Simultaneous door events get a bracket.
    for (let i = 0; i < evs.length - 1; i++) {
      const a = evs[i], b = evs[i + 1];
      if (Math.abs(a.t - b.t) < 0.01 && a.who === "door" && b.who === "door") {
        ctx.strokeStyle = "#4cc48d";
        const bx = P.x + P.w - 8;
        ctx.beginPath(); ctx.moveTo(bx - 6, ys[i] - 8); ctx.lineTo(bx, ys[i] - 8); ctx.lineTo(bx, ys[i + 1] + 14); ctx.lineTo(bx - 6, ys[i + 1] + 14); ctx.stroke();
        ctx.save(); ctx.translate(bx + 4, (ys[i] + ys[i + 1]) / 2 + 3); ctx.rotate(Math.PI / 2);
        ctx.font = fpx(10) + MONO; ctx.fillStyle = "#4cc48d"; ctx.textAlign = "center";
        ctx.fillText(tr("same instant"), 0, 0); ctx.restore();
      }
    }
    // Playhead
    const py = Yt(Math.max(V.t0, Math.min(V.t1, T)));
    ctx.fillStyle = "#e9eef7";
    ctx.beginPath(); ctx.moveTo(ax - 9, py - 5); ctx.lineTo(ax - 3, py); ctx.lineTo(ax - 9, py + 5); ctx.closePath(); ctx.fill();
  }

  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#121b2b";
    if (narrow) {
      ctx.fillRect(12, R.diag.y - 9, W - 24, 1);
      ctx.fillRect(12, R.panel.y - 10, W - 24, 1);
    } else {
      ctx.fillRect(R.panel.x - 14, 20, 1, H - 40);
      ctx.fillRect(R.scene.x, R.diag.y - 9, R.scene.w, 1);
    }
    const T = state.T;
    drawScene(T);
    drawDiagram(T);
    drawPanel(T);
  }

  // ---------- Readouts and narration ----------
  function gapText(gap, wall) {
    if (gap === undefined) return "entrance never shuts";
    const a = Math.abs(ns(gap));
    if (a < 0.05) return "same instant";
    const n = fns(Math.abs(gap));
    if (!wall) return gap > 0 ? "exit shuts " + n + " ns earlier" : "entrance shuts " + n + " ns earlier";
    return gap > 0 ? "wall hit " + n + " ns after entrance shuts" : "wall hit " + n + " ns before entrance shuts";
  }
  function gapIn(u) {
    const gu = 1 / Math.sqrt(1 - u * u);
    const tp = (e) => gu * (e.t - u * e.x);
    const ev = Object.fromEntries(M.events.map((e) => [e.id, e]));
    if (!state.wall) return tp(ev.Db) - tp(ev.Df);
    return M.trapped ? tp(ev.H) - tp(ev.Db) : undefined;
  }
  function orderSentence() {
    if (!state.wall) {
      if (M.clash) return "At this speed the ladder is too long: the doors hit it.";
      const a = Math.abs(ns(V.gap));
      if (a < 0.05) return "Both doors shut at the same instant, with the ladder inside.";
      return V.gap > 0 ? "The exit door shuts " + fns(V.gap) + " ns before the entrance door."
        : "The entrance door shuts " + fns(-V.gap) + " ns before the exit door.";
    }
    return M.trapped ? "The exit door is a solid wall. The ladder ends up squashed to " + M.squashed.toFixed(1) + " m inside the barn."
      : "The exit door is a solid wall. The ladder stops with its rear still outside the entrance.";
  }
  function updateReadouts() {
    $("speedOut").textContent = fb(state.v);
    $("ladderOut").textContent = state.L.toFixed(1) + " m";
    $("barnOut").textContent = state.B.toFixed(1) + " m";
    $("observerOut").textContent = fb(state.u);
    $("gamma").textContent = M.g.toFixed(3);
    $("ladderInBarn").textContent = fm(M.Lc);
    $("barnInLadder").textContent = fm(state.B / M.g);
    $("gapBarn").textContent = gapText(gapIn(0), state.wall);
    $("gapLadder").textContent = gapText(gapIn(state.v), state.wall);
    $("gapView").textContent = gapText(V.gap, state.wall);
    let verdict;
    if (!state.wall) verdict = M.clash ? "too long: the doors hit it" : "fits, " + M.spare.toFixed(1) + " m to spare";
    else verdict = M.trapped ? "trapped, squashed to " + M.squashed.toFixed(1) + " m" : "rear end stays outside";
    $("verdict").textContent = verdict;
    $("verdict").style.color = (state.wall ? M.trapped : !M.clash) ? "var(--good)" : "var(--warn)";
    canvas.setAttribute("aria-label", "Animated barn and ladder seen from the " + frameWord() + ", above a spacetime diagram of the ladder ends and the barn doors with lines of simultaneity, beside a list of events in the order this observer sees them");
  }
  function frameWord() {
    return state.mode === "barn" ? "barn frame" : state.mode === "ladder" ? "ladder frame" : state.mode === "mid" ? "midway frame" : "chosen observer's frame";
  }
  WONDERS.describer(() => {
    let s1;
    if (state.mode === "barn") s1 = tr("Barn frame: the barn is at rest and " + state.B.toFixed(1) + " m long; the " + state.L.toFixed(1) + " m ladder moves at " + fb(state.v) + " and measures " + V.ladLen.toFixed(1) + " m.");
    else if (state.mode === "ladder") s1 = tr("Ladder frame: the ladder is at rest and " + state.L.toFixed(1) + " m long; the " + state.B.toFixed(1) + " m barn moves at " + fb(state.v) + " and measures " + V.barnLen.toFixed(1) + " m.");
    else s1 = tr("Observer moving at " + fb(state.u) + " relative to the barn: the ladder measures " + V.ladLen.toFixed(1) + " m and the barn " + V.barnLen.toFixed(1) + " m.");
    return s1 + " " + tr(orderSentence());
  });

  // ---------- Challenges ----------
  let crossed = new Set();
  function resetCrossed() { crossed = new Set(); }
  function onCross(e) {
    crossed.add(e.id);
    if (e.who === "door" || e.id === "H" || e.id === "R") {
      if (e.clash) WONDERS.sound("fail");
      else WONDERS.sound("event", { pitch: e.x > state.B / 2 ? 0.8 : 0.35, pan: e.x > state.B / 2 ? 0.5 : -0.5 });
    }
    const keys = state.wall ? ["H", "R"].concat(M.trapped ? ["Db"] : []) : ["Db", "Df"];
    if (!keys.includes(e.id) || !keys.every((k) => crossed.has(k))) return;
    WONDERS.describe(orderSentence(), { now: true });
    if (!state.wall && !M.clash) {
      if (Math.abs(state.u - state.v) < 0.003) WONDERS.challenge("ladder-order");
      if (V.gap < -0.03) WONDERS.challenge("reverse-order");
    }
    if (state.wall && M.trapped && state.L >= 2 * state.B - 1e-9) WONDERS.challenge("trap-long");
  }

  // ---------- Loop ----------
  // Playback slows down near the door events so they are easy to see.
  function rate(T) {
    let d = Infinity;
    for (const e of V.events) if (e.who === "door" || e.id === "H" || e.id === "R") d = Math.min(d, Math.abs(T - e.t));
    const k = Math.min(1, d / (0.07 * V.span));
    return (V.span / (PLAY_MS / 1000)) * (0.18 + 0.82 * k * k);
  }
  function setT(T, fromPlay) {
    const prev = state.T;
    state.T = T;
    if (fromPlay || T > prev) for (const e of V.events) if (e.t > prev && e.t <= T) onCross(e);
    if (T < prev) resetCrossed();
  }
  let last = performance.now(), lastUI = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.playing) {
      if (state.hold > 0) {
        state.hold -= dt;
        if (state.hold <= 0) { state.T = V.t0; resetCrossed(); }
      } else {
        const T = Math.min(V.t1, state.T + rate(state.T) * dt);
        setT(T, true);
        if (T >= V.t1) state.hold = 1.4;
      }
      if (now - lastUI > 100) { lastUI = now; syncScrub(); }
    }
    draw();
    requestAnimationFrame(frame);
  }
  function syncScrub() { $("scrub").value = String(Math.round(1000 * (state.T - V.t0) / V.span)); }

  // ---------- Controls ----------
  function setPlay(on) {
    state.playing = on;
    $("play").textContent = on ? "Pause" : "Play";
  }
  function setMode(mode) {
    state.mode = mode;
    if (mode === "barn") state.u = 0;
    else if (mode === "ladder") state.u = state.v;
    else if (mode === "mid") state.u = Math.tanh(Math.atanh(state.v) / 2);
    for (const [id, m] of [["frameBarn", "barn"], ["frameLadder", "ladder"], ["frameMid", "mid"]]) $(id).setAttribute("aria-pressed", String(m === mode));
    if (mode !== "custom") $("observer").value = String(state.u.toFixed(3));
  }
  // Rebuild after any change, keeping the same fraction of the way through the pass.
  function rebuild(keepFrac) {
    const f = V ? (state.T - V.t0) / V.span : 0;
    build();
    state.T = V.t0 + (keepFrac ? Math.max(0, Math.min(1, f)) : 0) * V.span;
    state.hold = 0;
    resetCrossed();
    updateReadouts();
    syncScrub();
    if (!state.playing) draw();
  }

  $("speed").addEventListener("input", (e) => {
    state.v = +e.target.value;
    if (state.mode !== "custom") setMode(state.mode);
    else state.u = Math.max(-0.99, Math.min(0.99, state.u));
    rebuild(true);
  });
  $("ladderLen").addEventListener("input", (e) => { state.L = +e.target.value; rebuild(true); });
  $("barnLen").addEventListener("input", (e) => { state.B = +e.target.value; rebuild(true); });
  $("observer").addEventListener("input", (e) => {
    state.u = +e.target.value;
    const m = Math.abs(state.u) < 1e-9 ? "barn" : Math.abs(state.u - state.v) < 1e-9 ? "ladder" : "custom";
    setMode(m);
    rebuild(true);
  });
  for (const [id, m] of [["frameBarn", "barn"], ["frameLadder", "ladder"], ["frameMid", "mid"]]) {
    $(id).addEventListener("click", () => {
      setMode(m); rebuild(true);
      WONDERS.describe(tr("Now viewing from the " + frameWord() + ".") + " " + tr(orderSentence()));
    });
  }
  $("wall").addEventListener("change", (e) => { state.wall = e.target.checked; rebuild(false); if (!state.playing) setPlay(true); });
  $("simul").addEventListener("change", (e) => { state.simul = e.target.checked; if (!state.playing) draw(); });
  $("play").addEventListener("click", () => { if (state.T >= V.t1) { state.T = V.t0; resetCrossed(); } setPlay(!state.playing); });
  $("restart").addEventListener("click", () => { state.T = V.t0; state.hold = 0; resetCrossed(); setPlay(true); });
  $("scrub").addEventListener("input", (e) => {
    setPlay(false);
    state.hold = 0;
    setT(V.t0 + (+e.target.value / 1000) * V.span, false);
    draw();
  });

  // Re-layout when the bench changes width; the simulation state is kept.
  let lastCW = 0;
  function onResize() {
    const cw = Math.round(canvas.parentElement.clientWidth);
    if (cw === lastCW) return;
    lastCW = cw;
    layout();
    draw();
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvas.parentElement);
  else window.addEventListener("resize", onResize);

  // ---------- Start ----------
  layout();
  state.v = +$("speed").value; state.L = +$("ladderLen").value; state.B = +$("barnLen").value;
  state.wall = $("wall").checked; state.simul = $("simul").checked;
  setMode("barn");
  build();
  updateReadouts();
  if (Lab.reducedMotion) {
    // A still picture at the moment both doors are shut.
    setPlay(false);
    state.T = Math.min(V.t1, 0.0001);
  } else {
    setPlay(true);
    state.T = V.t0 + 0.12 * V.span;
  }
  syncScrub();
  draw();
  requestAnimationFrame(frame);
})();
