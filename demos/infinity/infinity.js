(function () {
  const $ = (id) => document.getElementById(id);
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";
  const BLUE = "#8fa6ff", AMBER = "#f0b35a", DIM = "#7f8ea6", FAINT = "#56647c", INK = "#e9eef7", GOOD = "#4cc48d";
  const BUS_COLOURS = ["#f0b35a", "#5fd3c1", "#f08ab0", "#9bd37a", "#c49bff", "#f59e6b", "#6cc4f5"];
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // Translate a whole sentence first, then wrap it (Chinese wraps per character).
  function wrapText(ctx, text, x, y, maxW, lh, measureOnly) {
    if (window.I18N) text = window.I18N.t(text);
    const cjk = /[　-鿿]/.test(text);
    const lead = text.match(/^ */)[0];  // keep an indented line indented
    const words = cjk ? [...text.trim()] : text.trim().split(" ");
    const sep = cjk ? "" : " ";
    let line = lead;
    for (const w of words) {
      const t = line.trim() ? line + sep + w : line + w;
      if (ctx.measureText(t).width > maxW && line.trim()) { if (!measureOnly) ctx.fillText(line, x, y); y += lh; line = w; }
      else line = t;
    }
    if (line) { if (!measureOnly) ctx.fillText(line, x, y); y += lh; }
    return y;
  }

  // Wide screens use a fixed 960-wide drawing. Below 640 CSS px the drawing is
  // laid out at the displayed width (1:1), with rooms in two rows and the rule
  // under the arrivals, so the text stays readable on a phone.
  const NARROW = 640;
  const cssWidth = (c) => c.clientWidth || c.parentElement.clientWidth || 960;

  /* =========================================================
     Part 1: Hilbert's Grand Hotel
     ========================================================= */
  const hcv = $("hotel");
  let HW = 960, HH = 440, hc, HN = false;
  const ROOMS = 16;
  const ODD_PRIMES = [3, 5, 7, 11, 13, 17, 19, 23];
  // Layout (set by layoutHotel). Rooms: rx, ry = top-left of each room box.
  let RW, RH, ROOM_TOP = [], PITCH, RX0, ABUSES = 5, ASEATS = 7, AX0, ACOL, AY0, AROW, ARR_Y, RULE_X, RULE_Y, SEP_Y;
  function layoutHotel() {
    const cw = cssWidth(hcv);
    HN = cw < NARROW;
    if (HN) {
      HW = Math.max(300, Math.round(cw));
      RX0 = 12; PITCH = (HW - 2 * RX0 - 14) / 8; RW = PITCH - 4; RH = 64;
      ROOM_TOP = [58, 130];
      SEP_Y = 206; ARR_Y = 230;
      ASEATS = 4; AX0 = 58; AY0 = 256; AROW = 31;
      RULE_X = 12; RULE_Y = 468;
      HH = 770;
    } else {
      HW = 960; HH = 440;
      RX0 = 28; PITCH = 56; RW = 50; RH = 80;
      ROOM_TOP = [52];
      SEP_Y = 158; ARR_Y = 182;
      ASEATS = 7; AX0 = 104; ACOL = 62; AY0 = 200; AROW = 36;
      RULE_X = 610; RULE_Y = 182;
    }
    hc = Lab.setupCanvas(hcv, HW, HH);
    if (HN) {
      // Make room for the longest row label in the current language.
      hc.font = "12px " + MONO;
      AX0 = Math.max(58, Math.ceil(hc.measureText("Bus 5").width) + 14);
      ASEATS = (HW - AX0 - 12) / 4 >= 56 ? 4 : 3;
      ACOL = (HW - AX0 - 12) / ASEATS;
      // Height: enough for the longest wrapped rule plus the two closing lines.
      const mw = HW - 2 * RULE_X;
      let need = 0;
      for (const op of [null, { kind: "guest" }, { kind: "bus" }, { kind: "buses", method: "diag" }, { kind: "buses", method: "prime" }]) {
        hc.font = "13px " + MONO;
        let y = 0;
        for (const line of ruleText(op)) y = wrapText(hc, line, 0, y, mw, 21, true);
        hc.font = "13px " + SANS;
        y = wrapText(hc, "Every guest has a room. Nobody shares.", 0, y + 8, mw, 18, true);
        const m2 = op && op.method === "prime" ? "Many rooms stay empty, and that is allowed." : "No room is left empty either.";
        y = wrapText(hc, m2, 0, y + 4, mw, 18, true);
        need = Math.max(need, y);
      }
      const h = Math.ceil(RULE_Y + 32 + need);
      if (h !== HH) { HH = h; hc = Lab.setupCanvas(hcv, HW, HH); }
    }
  }
  const perRow = () => (HN ? 8 : ROOMS);
  const roomBox = (r) => {
    const i = r - 1, row = Math.floor(i / perRow()), col = i % perRow();
    return [RX0 + col * PITCH, ROOM_TOP[row]];
  };
  const roomPos = (r) => { const [x, y] = roomBox(r); return [x + RW / 2, y + (HN ? 40 : 52)]; };
  // Where a guest goes when its new room is past the last visible one.
  const offscreen = () => [HW + 30, roomPos(ROOMS)[1]];
  const cellPos = (vrow, seat) => [AX0 + 20 + (seat - 1) * ACOL, AY0 + vrow * AROW];

  const hotel = {
    rooms: [],          // rooms[1..16] = guest or null
    op: null,           // current animated operation
    gaps: false,        // true once any room is left empty
    tally: { guest: 0, bus: 0, buses: 0 },
    method: "diag",
    nextBusColour: 0,
  };

  function fullHotel() {
    hotel.rooms = [null];
    for (let r = 1; r <= ROOMS; r++) hotel.rooms.push({ colour: BLUE, label: String(r) });
    hotel.op = null;
    hotel.gaps = false;
    hotel.tally = { guest: 0, bus: 0, buses: 0 };
    hotel.nextBusColour = 0;
    hotel.lastKind = null;
  }

  // Diagonal (Cantor) pairing: bus b (0 = guests already inside), seat k (1, 2, …).
  const diagRoom = (b, k) => { const s = b + k - 1; return s * (s + 1) / 2 + b + 1; };
  const primeRoom = (b, k) => Math.pow(b === 0 ? 2 : ODD_PRIMES[b - 1], k);

  // Positions are stored as (room) or (visual row, seat) and turned into
  // coordinates when drawn, so a resize mid-animation keeps working.
  function buildOp(kind) {
    const moves = [];     // guests already in visible rooms
    const arrivals = [];  // new guests, drawn in the arrivals area
    const rule = (n) => kind === "guest" ? n + 1 : kind === "bus" ? 2 * n
      : hotel.method === "diag" ? diagRoom(0, n) : primeRoom(0, n);
    for (let r = 1; r <= ROOMS; r++) {
      const g = hotel.rooms[r];
      if (g) moves.push({ g, room: r, to: rule(r) });
    }
    const grid = [];      // rows of cells for drawing the arrivals area
    const seats = ASEATS;
    if (kind === "guest") {
      const g = { colour: BUS_COLOURS[hotel.nextBusColour++ % BUS_COLOURS.length], label: "new" };
      const a = { g, vrow: 1, to: 1, row: 0, seat: 1 };
      arrivals.push(a);
      grid.push({ name: "Guest", cells: [a], more: false });
    } else if (kind === "bus") {
      const colour = BUS_COLOURS[hotel.nextBusColour++ % BUS_COLOURS.length];
      const cells = [];
      for (let k = 1; k <= seats; k++) {
        const a = { g: { colour, label: String(k) }, vrow: 1, to: 2 * k - 1, row: 0, seat: k };
        arrivals.push(a); cells.push(a);
      }
      grid.push({ name: "Bus", cells, more: true });
    } else {
      // Row 0 shows the current guests as seats of "bus 0" so the zigzag covers them too.
      const insideCells = [];
      for (let k = 1; k <= seats; k++) {
        const g = hotel.rooms[k];
        insideCells.push({ g: g || null, ghost: true, vrow: 0, to: rule(k), row: 0, seat: k });
      }
      grid.push({ name: "Hotel", cells: insideCells, more: true });
      for (let b = 1; b <= ABUSES; b++) {
        const colour = BUS_COLOURS[hotel.nextBusColour++ % BUS_COLOURS.length];
        const cells = [];
        for (let k = 1; k <= seats; k++) {
          const to = hotel.method === "diag" ? diagRoom(b, k) : primeRoom(b, k);
          const a = { g: { colour, label: String(k) }, vrow: b, to, row: b, seat: k };
          arrivals.push(a); cells.push(a);
        }
        grid.push({ name: "Bus " + b, cells, more: true });
      }
    }
    // Guests whose new room is visible
    const next = [null];
    for (let r = 1; r <= ROOMS; r++) next.push(null);
    for (const m of moves.concat(arrivals)) if (m.to <= ROOMS) next[m.to] = m.g;
    return { kind, moves, arrivals, grid, next, method: hotel.method, start: performance.now() };
  }
  const fromOf = (m) => (m.room ? roomPos(m.room) : cellPos(m.vrow, m.seat));

  const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const sup = (n) => String(n).split("").map((ch) => SUP[+ch]).join("");
  // Big prime-power rooms are written as powers so they fit.
  const toLabel = (c, op) => {
    if (c.to < 1000 || op.kind !== "buses" || op.method !== "prime") return String(c.to);
    return (c.row === 0 ? 2 : ODD_PRIMES[c.row - 1]) + sup(c.seat);
  };

  const ruleText = (op) => {
    if (!op) return ["Every room is taken.", "Choose who arrives."];
    if (op.kind === "guest") return ["guest in room n → room n + 1", "new guest → room 1"];
    if (op.kind === "bus") return ["guest in room n → room 2n", "passenger k → room 2k − 1", "(old guests: even rooms;", " passengers: odd rooms)"];
    if (op.method === "diag") return ["walk the grid along its", "diagonals, in order:", "bus b, seat k → room", "  s(s+1)/2 + b + 1, s = b + k − 1", "(hotel guests are bus 0)"];
    return ["guest in room n → room 2ⁿ", "bus 1, seat k → room 3ᵏ", "bus 2, seat k → room 5ᵏ", "bus b → (b-th odd prime)ᵏ", "unique primes: no clashes"];
  };
  layoutHotel();
  const ruleShort = (op) => {
    if (!op) return "–";
    if (op.kind === "guest") return "n → n + 1";
    if (op.kind === "bus") return "n → 2n, k → 2k − 1";
    return op.method === "diag" ? "diagonal zigzag" : "prime powers";
  };

  function commit() {
    const op = hotel.op;
    if (!op || op.done) return;
    hotel.rooms = op.next;
    op.done = true;
    if (op.kind === "buses" && op.method === "prime") hotel.gaps = true;
    hotel.tally[op.kind]++;
    updateHotelStats();
    if (op.kind === "buses" && op.method === "prime") WONDERS.challenge("prime");
    const said = {
      guest: "1 new guest checked in. Every guest moved from room n to room n + 1, room 1 went to the newcomer, and no one was turned away.",
      bus: "A bus of infinitely many guests checked in. Old guests moved to the even rooms, passengers took the odd rooms, and no one was turned away.",
      diag: "Infinitely many buses checked in using the diagonal zigzag. Every guest has a room, no room is empty, and no one was turned away.",
      prime: "Infinitely many buses checked in using prime powers. Every guest has a room, infinitely many rooms such as room 6 stay empty, and no one was turned away.",
    }[op.kind === "buses" ? op.method : op.kind];
    WONDERS.describe(said);
  }

  function runOp(kind) {
    commit();
    WONDERS.sound("event", { pitch: kind === "guest" ? 0.2 : kind === "bus" ? 0.5 : 0.8 });
    hotel.op = buildOp(kind);
    if (Lab.reducedMotion) commit();
    updateHotelStats();
  }

  function updateHotelStats() {
    const op = hotel.op;
    $("rule").textContent = ruleShort(op);
    $("turnedAway").textContent = "0";
    const empties = [];
    for (let r = 1; r <= ROOMS; r++) if (!hotel.rooms[r]) empties.push(r);
    $("emptyRooms").textContent = hotel.gaps
      ? "infinitely many (" + empties.slice(0, 4).join(", ") + ", …)"
      : "none";
    const t = hotel.tally, parts = [];
    if (t.guest) parts.push(t.guest + (t.guest === 1 ? " guest" : " guests"));
    if (t.bus) parts.push(t.bus + (t.bus === 1 ? " bus" : " buses"));
    if (t.buses) parts.push(t.buses + (t.buses === 1 ? " fleet of ∞ buses" : " fleets of ∞ buses"));
    // Translate each part on its own so any combination reads correctly.
    const tr = (x) => (window.I18N ? I18N.t(x) : x);
    $("checkins").textContent = parts.length ? parts.map(tr).join(", ") : "0";
  }

  function drawGuest(x, y, g, alpha, r) {
    r = r || 13;
    hc.globalAlpha = alpha;
    hc.fillStyle = g.colour;
    hc.beginPath(); hc.arc(x, y, r, 0, Math.PI * 2); hc.fill();
    hc.fillStyle = "#05080e";
    hc.font = (HN ? "600 11px " : g.label.length > 2 ? "600 10px " : "600 11px ") + MONO;
    hc.textAlign = "center";
    hc.textBaseline = "middle";
    hc.fillText(g.label, x, y + 0.5);
    hc.textBaseline = "alphabetic";
    hc.globalAlpha = 1;
  }

  function drawHotel(now) {
    hc.fillStyle = "#05080e";
    hc.fillRect(0, 0, HW, HH);
    hc.font = "12px " + MONO;
    hc.fillStyle = DIM;
    hc.textAlign = "left";
    const title = "ROOMS 1, 2, 3, …  (EVERY ROOM EXISTS; ONLY THE FIRST 16 FIT HERE)";
    if (HN) { hc.font = "11px " + MONO; wrapText(hc, title, RX0, 16, HW - 2 * RX0, 14); }
    else hc.fillText(title, RX0, 28);

    // Building
    for (let r = 1; r <= ROOMS; r++) {
      const [x, y] = roomBox(r);
      hc.fillStyle = "#0e1626";
      hc.fillRect(x, y, RW, RH);
      hc.strokeStyle = "#26324a";
      hc.strokeRect(x + 0.5, y + 0.5, RW - 1, RH - 1);
      hc.fillStyle = FAINT;
      hc.font = "11px " + MONO;
      hc.textAlign = "center";
      hc.fillText(String(r), x + RW / 2, y + 16);
    }
    hc.fillStyle = DIM;
    hc.font = "18px " + MONO;
    { const [x] = roomBox(ROOMS), y = roomPos(ROOMS)[1]; hc.fillText("…", x + PITCH + (HN ? 2 : 8), y + 6); }

    const op = hotel.op;
    const t = op && !op.done ? (now - op.start) : Infinity;
    const PLAN = 700, MOVE = 1700;
    const u = op && !op.done ? Math.max(0, Math.min(1, (t - PLAN) / MOVE)) : 1;

    // Guests in rooms
    if (!op || op.done) {
      for (let r = 1; r <= ROOMS; r++) {
        const g = hotel.rooms[r];
        const [x, y] = roomPos(r);
        if (g) drawGuest(x, y, g, 1);
        else {
          hc.fillStyle = HN ? "#56647c" : "#3a4760";
          hc.font = (HN ? "11px " : "10px ") + MONO;
          hc.textAlign = "center";
          if (HN) {
            // Too narrow for the word: a dashed empty seat instead.
            hc.strokeStyle = "#3a4760"; hc.setLineDash([3, 3]);
            hc.beginPath(); hc.arc(x, y, 12, 0, Math.PI * 2); hc.stroke(); hc.setLineDash([]);
          } else hc.fillText("empty", x, y + 4);
        }
      }
    }

    // Arrivals area
    hc.strokeStyle = "#1a2436";
    hc.beginPath(); hc.moveTo(HN ? 8 : 20, SEP_Y + 0.5); hc.lineTo(HW - (HN ? 8 : 20), SEP_Y + 0.5); hc.stroke();
    hc.font = "12px " + MONO;
    hc.fillStyle = DIM;
    hc.textAlign = "left";
    hc.fillText("ARRIVALS", RX0, ARR_Y);
    if (HN) {
      hc.beginPath(); hc.moveTo(8, RULE_Y - 24.5); hc.lineTo(HW - 8, RULE_Y - 24.5); hc.stroke();
    }
    hc.fillText("THE RULE", RULE_X, RULE_Y);

    const cellFont = (HN ? "11px " : "10px ") + MONO;
    if (op) {
      const isGrid = op.kind === "buses";
      // Zigzag / row labels
      for (const row of op.grid) {
        const cells = row.cells.filter((c) => c.seat <= ASEATS);
        const y = cellPos(row.cells[0].vrow, 1)[1];
        hc.fillStyle = DIM;
        hc.font = (HN ? "12px " : "11px ") + MONO;
        hc.textAlign = "right";
        hc.fillText(row.name, AX0 - 6, y + 4);
        if (row.more && cells.length) {
          hc.textAlign = "left";
          const lx = cellPos(0, cells[cells.length - 1].seat)[0] + 46;
          if (lx + 10 < HW) hc.fillText("…", lx, y + 4);
        }
      }
      if (isGrid) {
        hc.fillStyle = DIM;
        hc.textAlign = "right";
        hc.fillText("⋮", AX0 - 6, AY0 + (ABUSES + 1) * AROW - 6);
        if (op.method === "diag") {
          // The zigzag path through the grid, in room order
          const maxS = Math.min(5, ASEATS - 1);
          const pts = [];
          for (let b = 0; b <= ABUSES; b++) for (let k = 1; k <= ASEATS; k++) {
            if (b + k - 1 <= maxS) pts.push([diagRoom(b, k), ...cellPos(b, k)]);
          }
          pts.sort((a, b) => a[0] - b[0]);
          // Solid along each diagonal, faint dashes for the jump back to the top row.
          hc.lineWidth = 1.5;
          for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            const jump = b[2] <= a[2];
            hc.strokeStyle = jump ? "rgba(240,179,90,0.18)" : "rgba(240,179,90,0.6)";
            hc.setLineDash(jump ? [2, 4] : []);
            hc.beginPath(); hc.moveTo(a[1], a[2]); hc.lineTo(b[1], b[2]); hc.stroke();
          }
          hc.setLineDash([]);
          hc.lineWidth = 1;
        }
      }
      // Cells: dot plus the room it is assigned
      const cells = op.grid.flatMap((r) => r.cells).filter((c) => c.seat <= ASEATS);
      for (const c of cells) {
        const [x, y] = cellPos(c.vrow, c.seat);
        if (c.ghost) {
          hc.strokeStyle = c.g ? c.g.colour : "#3a4760";
          hc.globalAlpha = 0.6;
          hc.beginPath(); hc.arc(x, y, HN ? 10 : 9, 0, Math.PI * 2); hc.stroke();
          hc.globalAlpha = 1;
          hc.fillStyle = HN ? DIM : FAINT;
          hc.font = (HN ? "11px " : "9px ") + MONO;
          hc.textAlign = "center";
          hc.fillText(String(c.seat), x, y + 3);
        } else if (op.done || u === 0) {
          drawGuest(x, y, c.g, op.done ? 0.25 : 1, HN ? 11 : 10);
        } else {
          hc.strokeStyle = c.g.colour;
          hc.globalAlpha = 0.35;
          hc.beginPath(); hc.arc(x, y, 10, 0, Math.PI * 2); hc.stroke();
          hc.globalAlpha = 1;
        }
        hc.fillStyle = c.to <= ROOMS ? INK : (HN ? DIM : FAINT);
        hc.font = cellFont;
        hc.textAlign = "left";
        const showTo = t > 250 || op.done;
        if (showTo) hc.fillText("→" + toLabel(c, op), x + (HN ? 14 : 13), y + 4);
      }

      // Rule text
      hc.fillStyle = INK;
      hc.font = (HN ? "13px " : "14px ") + MONO;
      hc.textAlign = "left";
      const lh = HN ? 21 : 24;
      let ry = RULE_Y + 32;
      if (HN) for (const line of ruleText(op)) ry = wrapText(hc, line, RULE_X, ry, HW - 2 * RULE_X, lh);
      else ruleText(op).forEach((line, i) => hc.fillText(line, RULE_X, RULE_Y + 32 + i * lh));
      if (op.done) {
        hc.fillStyle = GOOD;
        hc.font = "13px " + SANS;
        const msg2 = op.kind === "buses" && op.method === "prime" ? "Many rooms stay empty, and that is allowed." : "No room is left empty either.";
        if (HN) {
          let y = wrapText(hc, "Every guest has a room. Nobody shares.", RULE_X, ry + 8, HW - 2 * RULE_X, 18);
          hc.fillStyle = DIM;
          wrapText(hc, msg2, RULE_X, y + 4, HW - 2 * RULE_X, 18);
        } else {
          hc.fillText("Every guest has a room. Nobody shares.", 610, 214 + 5 * 24 + 16);
          hc.fillStyle = DIM;
          hc.fillText(msg2, 610, 214 + 5 * 24 + 38);
        }
      }
    } else {
      hc.fillStyle = INK;
      hc.font = (HN ? "13px " : "14px ") + MONO;
      hc.textAlign = "left";
      if (HN) { let ry = RULE_Y + 32; for (const line of ruleText(null)) ry = wrapText(hc, line, RULE_X, ry, HW - 2 * RULE_X, 21); }
      else ruleText(null).forEach((line, i) => hc.fillText(line, RULE_X, RULE_Y + 32 + i * 24));
    }

    // Moving guests
    if (op && !op.done) {
      const all = op.moves.concat(op.arrivals).filter((m) => m.room || m.seat <= ASEATS);
      for (const m of all) {
        const [x0, y0] = fromOf(m);
        const visible = m.to <= ROOMS;
        const [x1, y1] = visible ? roomPos(m.to) : offscreen();
        const e = ease(u);
        const x = x0 + (x1 - x0) * e;
        const lift = m.room ? Math.min(60, 12 + Math.abs(x1 - x0) * 0.25) : 30;
        const y = y0 + (y1 - y0) * e - Math.sin(Math.PI * e) * lift;
        const alpha = visible ? 1 : 1 - Math.max(0, (e - 0.55) / 0.45);
        drawGuest(x, y, m.g, alpha);
      }
      if (t >= PLAN + MOVE) commit();
    }
  }

  function setMethod(m) {
    hotel.method = m;
    $("methodDiag").setAttribute("aria-pressed", String(m === "diag"));
    $("methodPrime").setAttribute("aria-pressed", String(m === "prime"));
  }
  $("oneGuest").addEventListener("click", () => runOp("guest"));
  $("oneBus").addEventListener("click", () => runOp("bus"));
  $("manyBuses").addEventListener("click", () => runOp("buses"));
  $("methodDiag").addEventListener("click", () => setMethod("diag"));
  $("methodPrime").addEventListener("click", () => setMethod("prime"));
  $("resetHotel").addEventListener("click", () => { fullHotel(); updateHotelStats(); });

  /* =========================================================
     Part 2: Cantor's diagonal argument
     ========================================================= */
  const cv = $("cantor");
  let CW = 960, CHt = 440, cc, CN = false;
  let GX = 128, COLW = 32, VC = 21, GTOP = 58, ROWH = 28, VR = 10, NEWY, FOLLOW = 6, FADE = 60;
  function layoutCantor() {
    const cw = cssWidth(cv);
    CN = cw < NARROW;
    if (CN) {
      CW = Math.max(300, Math.round(cw));
      COLW = 30; ROWH = 30; VR = 8; GTOP = 92;
      GX = cantor.base === 10 ? 76 : 60;
      VC = Math.floor((CW - GX - 22) / COLW);
      FOLLOW = Math.max(3, VC - 2); FADE = 36;
      NEWY = GTOP + VR * ROWH + 44;
      CHt = NEWY + 110;
    } else {
      CW = 960; CHt = 440;
      GX = 128; COLW = 32; VC = 21; GTOP = 58; ROWH = 28; VR = 10; FOLLOW = 6; FADE = 60;
      NEWY = GTOP + VR * ROWH + 46;
    }
    cc = Lab.setupCanvas(cv, CW, CHt);
  }

  const cantor = {
    base: 2,
    list: null,
    k: 0,                 // diagonal digits processed
    view: 0,              // smoothed scroll offset
    playing: true,
    nextStep: 0,
    flash: -1, flashAt: 0,
    inserted: 0,
  };

  layoutCantor();

  const hash = (seed, i, j) => {
    let h = (seed ^ Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(j + 1, 0x85ebca6b)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
  };
  const newList = () => ({ prefix: [], edits: new Map(), seed: (Math.random() * 2 ** 32) >>> 0 });
  function digitOf(L, i, j) {
    const key = i + "," + j;
    if (L.edits.has(key)) return L.edits.get(key);
    if (i < L.prefix.length) return L.prefix[i](j);
    return hash(L.seed, i - L.prefix.length, j) % cantor.base;
  }
  // Binary: flip. Decimal: 5, or 4 if it was 5 (never 0 or 9, so no 0.0999… = 0.1000… ties).
  const change = (d) => (cantor.base === 2 ? 1 - d : d === 5 ? 4 : 5);
  const newDigit = (j) => change(digitOf(cantor.list, j, j));

  function restartDiag(play) {
    cantor.k = Lab.reducedMotion ? 12 : 0;
    cantor.playing = play && !Lab.reducedMotion;
    cantor.nextStep = performance.now() + 500;
    $("playDiag").textContent = cantor.playing ? "Pause" : "Play";
    updateCantorStats();
  }
  function step() {
    cantor.flash = cantor.k;
    cantor.flashAt = performance.now();
    WONDERS.sound("tick", { pitch: newDigit(cantor.k) / (cantor.base - 1) });
    cantor.k++;
    updateCantorStats();
  }
  function updateCantorStats() {
    const k = cantor.k;
    $("steps").textContent = k;
    $("ruledOut").textContent = k === 0 ? "none yet" : k === 1 ? "row 1" : "rows 1 to " + k;
    let s = cantor.base === 10 ? "0." : "";
    for (let j = 0; j < Math.min(k, 12); j++) s += newDigit(j);
    $("newStart").textContent = k ? s + "…" : "–";
    $("inserted").textContent = cantor.inserted;
  }

  function drawCantor(now) {
    const k = cantor.k;
    const target = Math.max(0, k - FOLLOW);
    cantor.view += (target - cantor.view) * (Lab.reducedMotion ? 1 : 0.12);
    if (Math.abs(target - cantor.view) < 0.002) cantor.view = target;
    const v = cantor.view;
    const L = cantor.list;
    const dec = cantor.base === 10;

    cc.fillStyle = "#05080e";
    cc.fillRect(0, 0, CW, CHt);
    cc.font = "12px " + MONO;
    cc.fillStyle = DIM;
    cc.textAlign = "left";
    const title = dec ? "A LIST OF REAL NUMBERS BETWEEN 0 AND 1" : "A LIST OF INFINITE STRINGS OF 0s AND 1s";
    if (CN) {
      cc.font = "11px " + MONO;
      wrapText(cc, title, 12, 20, CW - 24, 15);
      cc.font = "12px " + MONO;
      cc.fillText("DIGIT POSITION →", GX, GTOP - 36);
    } else {
      cc.fillText(title, 20, 26);
      cc.textAlign = "right";
      cc.fillText("DIGIT POSITION →", GX - 8, GTOP - 14);
    }

    const first = Math.floor(v), last = first + VR;
    const cy = (i) => GTOP + (i - v) * ROWH + ROWH / 2;
    const cx = (j) => GX + (j - v) * COLW + COLW / 2;
    const gridRight = GX + VC * COLW;

    // Column headers
    cc.save();
    cc.beginPath(); cc.rect(GX, 0, VC * COLW, CHt); cc.clip();
    cc.font = (CN ? "11px " : "10px ") + MONO;
    cc.textAlign = "center";
    for (let j = first; j <= first + VC; j++) {
      cc.fillStyle = j === k ? AMBER : CN ? DIM : FAINT;
      cc.fillText(String(j + 1), cx(j), GTOP - 14);
    }
    cc.restore();

    // Rows
    cc.save();
    cc.beginPath(); cc.rect(0, GTOP, CW, VR * ROWH); cc.clip();
    for (let i = first; i <= last; i++) {
      const y = cy(i);
      // row label
      cc.font = "12px " + MONO;
      cc.textAlign = "right";
      cc.fillStyle = i < k ? FAINT : DIM;
      cc.fillText(CN ? String(i + 1) : "row " + (i + 1), dec ? (CN ? GX - 26 : 92) : GX - (CN ? 10 : 14), y + 4);
      if (dec) { cc.fillStyle = "#c9d4e3"; cc.fillText("0.", GX - 6, y + 4); }
      if (i < k) {
        cc.fillStyle = AMBER;
        cc.textAlign = "left";
        if (CN) cc.fillText("≠", gridRight + 6, y + 4);
        else cc.fillText("≠ at digit " + (i + 1), gridRight + 18, y + 4);
      }
      cc.save();
      cc.beginPath(); cc.rect(GX, GTOP, VC * COLW, VR * ROWH); cc.clip();
      for (let j = first; j <= first + VC; j++) {
        const x = cx(j);
        const d = digitOf(L, i, j);
        if (i === j) {
          const done = j < k;
          cc.fillStyle = done ? "rgba(240,179,90,0.18)" : "rgba(143,166,255,0.08)";
          cc.fillRect(x - COLW / 2 + 2, y - ROWH / 2 + 2, COLW - 4, ROWH - 4);
          cc.strokeStyle = done ? AMBER : j === k ? BLUE : "#2c3a55";
          cc.lineWidth = j === k ? 1.6 : 1;
          cc.strokeRect(x - COLW / 2 + 2.5, y - ROWH / 2 + 2.5, COLW - 5, ROWH - 5);
          cc.lineWidth = 1;
          cc.fillStyle = done ? AMBER : INK;
        } else {
          cc.fillStyle = i < cantor.inserted ? "#d9c7ff" : "#9fb0c8";
        }
        cc.font = (i === j ? "500 " : "") + "15px " + MONO;
        cc.textAlign = "center";
        cc.fillText(String(d), x, y + 5);
      }
      cc.restore();
    }
    cc.restore();

    // Fade at the right edge of the grid
    const fade = cc.createLinearGradient(gridRight - FADE, 0, gridRight, 0);
    fade.addColorStop(0, "rgba(5,8,14,0)");
    fade.addColorStop(1, "rgba(5,8,14,1)");
    cc.fillStyle = fade;
    cc.fillRect(gridRight - FADE, GTOP, FADE, VR * ROWH);
    cc.fillStyle = DIM;
    cc.font = "16px " + MONO;
    cc.textAlign = "left";
    if (!CN) cc.fillText("…", gridRight - 8, GTOP + ROWH * 0.6);
    cc.textAlign = "center";
    cc.fillText("⋮", CN ? GX / 2 : 70, GTOP + VR * ROWH + 18);

    // New string row
    const ny = NEWY;
    cc.strokeStyle = "#26324a";
    cc.beginPath(); cc.moveTo(CN ? 8 : 20, ny - 26.5); cc.lineTo(CW - (CN ? 8 : 20), ny - 26.5); cc.stroke();
    cc.font = "500 12px " + MONO;
    cc.fillStyle = AMBER;
    cc.textAlign = "right";
    cc.fillText("new", dec ? (CN ? GX - 26 : 92) : GX - (CN ? 10 : 14), ny + 4);
    if (dec) { cc.fillStyle = AMBER; cc.fillText("0.", GX - 6, ny + 4); }
    cc.save();
    cc.beginPath(); cc.rect(GX, ny - 22, VC * COLW, 44); cc.clip();
    for (let j = first; j <= first + VC; j++) {
      const x = cx(j);
      if (j < k) {
        cc.fillStyle = "rgba(240,179,90,0.15)";
        cc.fillRect(x - COLW / 2 + 2, ny - 12, COLW - 4, 24);
        cc.fillStyle = AMBER;
        cc.font = "500 15px " + MONO;
        cc.textAlign = "center";
        cc.fillText(String(newDigit(j)), x, ny + 5);
      } else {
        cc.fillStyle = "#3a4760";
        cc.font = "15px " + MONO;
        cc.textAlign = "center";
        cc.fillText("?", x, ny + 5);
      }
    }
    cc.restore();
    cc.fillStyle = fade;
    cc.fillRect(gridRight - FADE, ny - 22, FADE, 44);

    // Flash: arrow from the diagonal cell down to the new digit
    if (cantor.flash >= 0) {
      const a = 1 - (now - cantor.flashAt) / 900;
      if (a > 0) {
        const j = cantor.flash;
        const x = cx(j), y0 = cy(j) + ROWH / 2 - 2;
        if (x > GX && x < gridRight && y0 > GTOP && y0 < GTOP + VR * ROWH + 4) {
          cc.globalAlpha = a;
          cc.strokeStyle = AMBER;
          cc.lineWidth = 1.5;
          cc.setLineDash([3, 3]);
          cc.beginPath(); cc.moveTo(x, y0); cc.lineTo(x, ny - 14); cc.stroke();
          cc.setLineDash([]);
          cc.lineWidth = 1;
          cc.beginPath(); cc.moveTo(x - 4, ny - 20); cc.lineTo(x, ny - 14); cc.lineTo(x + 4, ny - 20); cc.stroke();
          cc.globalAlpha = 1;
        }
      }
    }

    // Keyboard cursor
    if (document.activeElement === cv && cantor.cursor) {
      const [ci, cj] = clampCursor();
      cc.strokeStyle = "#ffffff";
      cc.lineWidth = 2;
      cc.strokeRect(cx(cj) - COLW / 2 + 1, cy(ci) - ROWH / 2 + 1, COLW - 2, ROWH - 2);
      cc.lineWidth = 1;
    }

    // Caption
    cc.font = "13px " + SANS;
    cc.textAlign = "left";
    cc.fillStyle = "#c9d4e3";
    let cap;
    if (k === 0) cap = "Start at row 1, digit 1. Change it, and the new string already differs from row 1.";
    else {
      const d0 = digitOf(L, k - 1, k - 1), d1 = newDigit(k - 1);
      cap = "Row " + k + " has " + d0 + " in position " + k + ", so the new string gets " + d1 + " there. It cannot be row " + k + ".";
    }
    if (CN) {
      const y = wrapText(cc, cap, 12, NEWY + 46, CW - 24, 18);
      if (!cantor.playing && k >= 20) {
        cc.fillStyle = AMBER;
        wrapText(cc, "…and so on for every row, forever.", 12, y + 4, CW - 24, 18);
      }
    } else {
      cc.fillText(cap, 20, CHt - 16);
      if (!cantor.playing && k >= 20) {
        cc.fillStyle = AMBER;
        cc.textAlign = "right";
        cc.fillText("…and so on for every row, forever.", CW - 20, CHt - 16);
      }
    }
  }

  function cellAt(evt) {
    const rect = cv.getBoundingClientRect();
    const x = (evt.clientX - rect.left) / rect.width * CW;
    const y = (evt.clientY - rect.top) / rect.height * CHt;
    if (x < GX || x > GX + VC * COLW - FADE / 2 || y < GTOP || y > GTOP + VR * ROWH) return null;
    const i = Math.floor(cantor.view + (y - GTOP) / ROWH);
    const j = Math.floor(cantor.view + (x - GX) / COLW);
    return i >= 0 && j >= 0 ? [i, j] : null;
  }
  function editCell(i, j) {
    const d = digitOf(cantor.list, i, j);
    cantor.list.edits.set(i + "," + j, cantor.base === 2 ? 1 - d : (d + 1) % 10);
    updateCantorStats();
    const nd = digitOf(cantor.list, i, j);
    WONDERS.sound("tick", { pitch: nd / (cantor.base - 1) });
    if (i === j && j < cantor.k) {
      WONDERS.challenge("dodge");
      WONDERS.describe("Row " + (i + 1) + ", digit " + (j + 1) + " is now " + nd + ", so the new string's digit " + (j + 1) + " changed to " + newDigit(j) + ".", { now: true });
    } else {
      WONDERS.describe("Row " + (i + 1) + ", digit " + (j + 1) + " is now " + nd + ".", { now: true });
    }
  }
  cv.addEventListener("click", (e) => {
    const c = cellAt(e);
    if (!c) return;
    cantor.cursor = c;
    editCell(c[0], c[1]);
  });
  // Keyboard: a cursor cell inside the visible part of the grid.
  function clampCursor() {
    const f = Math.floor(cantor.view + 0.5);
    const maxCol = f + Math.max(1, VC - Math.ceil(FADE / COLW)) - 1;
    if (!cantor.cursor) cantor.cursor = [f, f];
    let [i, j] = cantor.cursor;
    i = Math.max(f, Math.min(f + VR - 1, i));
    j = Math.max(f, Math.min(maxCol, j));
    cantor.cursor = [i, j];
    return cantor.cursor;
  }
  function sayCursor() {
    const [i, j] = cantor.cursor;
    const d = digitOf(cantor.list, i, j);
    WONDERS.describe(i === j ? "Row " + (i + 1) + ", digit " + (j + 1) + ": " + d + ", on the diagonal." : "Row " + (i + 1) + ", digit " + (j + 1) + ": " + d + ".", { now: true });
  }
  cv.addEventListener("focus", () => { clampCursor(); sayCursor(); });
  cv.addEventListener("keydown", (e) => {
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      const [i, j] = clampCursor();
      cantor.cursor = [i + moves[e.key][0], j + moves[e.key][1]];
      clampCursor();
      sayCursor();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const [i, j] = clampCursor();
      editCell(i, j);
    }
  });
  cv.addEventListener("mousemove", (e) => { cv.style.cursor = cellAt(e) ? "pointer" : "default"; });

  function setMode(base) {
    cantor.base = base;
    $("modeBinary").setAttribute("aria-pressed", String(base === 2));
    $("modeDecimal").setAttribute("aria-pressed", String(base === 10));
    cantor.list = newList();
    cantor.inserted = 0;
    if (CN) layoutCantor();
    restartDiag(true);
  }
  $("modeBinary").addEventListener("click", () => setMode(2));
  $("modeDecimal").addEventListener("click", () => setMode(10));
  $("playDiag").addEventListener("click", () => {
    cantor.playing = !cantor.playing;
    if (cantor.playing && cantor.k >= 60) cantor.k = 0;
    cantor.nextStep = performance.now() + 200;
    $("playDiag").textContent = cantor.playing ? "Pause" : "Play";
  });
  $("stepDiag").addEventListener("click", () => {
    cantor.playing = false;
    $("playDiag").textContent = "Play";
    step();
  });
  $("restartDiag").addEventListener("click", () => restartDiag(true));
  $("newList").addEventListener("click", () => {
    cantor.list = newList();
    cantor.inserted = 0;
    restartDiag(true);
  });
  $("insertNew").addEventListener("click", () => {
    // Freeze the current list, then put its diagonal string on top as row 1.
    const old = cantor.list;
    const snap = { prefix: old.prefix.slice(), edits: new Map(old.edits), seed: old.seed };
    const base = cantor.base;
    const flipOld = (j) => {
      const d = digitOf(snap, j, j);
      return base === 2 ? 1 - d : d === 5 ? 4 : 5;
    };
    const edits = new Map();
    for (const [key, val] of old.edits) {
      const [i, j] = key.split(",").map(Number);
      edits.set((i + 1) + "," + j, val);
    }
    cantor.list = { prefix: [flipOld].concat(old.prefix), edits, seed: old.seed };
    cantor.inserted++;
    restartDiag(true);
    WONDERS.sound("event");
    WONDERS.describe("The new string is now row 1 and every other row moved down one. The diagonal runs again and builds another string the list missed.", { now: true });
    if (cantor.inserted >= 3) WONDERS.challenge("three-escapees");
  });

  /* =========================================================
     Loop
     ========================================================= */
  function frame(now) {
    if (cantor.playing && now >= cantor.nextStep) {
      step();
      cantor.nextStep = now + (cantor.k < 8 ? 750 : 420);
      if (cantor.k >= 60) {
        cantor.playing = false;
        $("playDiag").textContent = "Play";
        WONDERS.describe("The diagonal has passed 60 rows. The new string differs from each of them, and the same holds for every row, forever.");
      }
    }
    drawHotel(now);
    drawCantor(now);
    requestAnimationFrame(frame);
  }

  // Re-run the layouts when the displayed width changes; the state is kept.
  const lastW = new Map();
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      for (const [c, fn] of [[hcv, layoutHotel], [cv, layoutCantor]]) {
        const w = cssWidth(c);
        if (w !== lastW.get(c)) { lastW.set(c, w); fn(); }
      }
    });
    ro.observe(hcv.parentElement); ro.observe(cv.parentElement);
  }

  // ---------- Screen-reader description ----------
  const tr = (x) => (window.I18N ? I18N.t(x) : x);
  WONDERS.describer(() => {
    const out = [];
    const t = hotel.tally;
    const empties = [];
    for (let r = 1; r <= ROOMS; r++) if (!hotel.rooms[r]) empties.push(r);
    out.push("Hilbert's hotel check-ins so far: single guests " + t.guest + ", buses " + t.bus + ", fleets of infinitely many buses " + t.buses + ". No guest was turned away.");
    out.push(hotel.gaps ? "Infinitely many rooms are empty, starting with room " + (empties[0] || 1) + "." : "Every room is full.");
    const k = cantor.k;
    let s = cantor.base === 10 ? "0." : "";
    for (let j = 0; j < Math.min(k, 12); j++) s += newDigit(j);
    out.push(cantor.base === 10 ? "Cantor's list holds decimal numbers between 0 and 1." : "Cantor's list holds infinite strings of 0s and 1s.");
    out.push(k ? "The diagonal has changed " + k + " digits, so the new string, which starts " + s + ", differs from rows 1 to " + k + "." : "The diagonal has not started yet.");
    if (cantor.inserted) out.push("You have added the new string to the top " + cantor.inserted + " times.");
    return out.map(tr).join(" ");
  });

  fullHotel();
  updateHotelStats();
  cantor.list = newList();
  restartDiag(true);
  // Open with a busload of infinitely many guests checking in.
  if (Lab.reducedMotion) runOp("bus");
  else setTimeout(() => { if (!hotel.op) runOp("bus"); }, 700);
  requestAnimationFrame(frame);
})();
