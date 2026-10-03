(function () {
  const canvas = document.getElementById("bench");
  const $ = (id) => document.getElementById(id);

  // Geometry (logical pixels). Wide screens: a fixed 960 x 440 drawing with the
  // ring and the chart side by side. Below 640 CSS px the drawing is laid out at
  // its displayed width (1:1) with the chart under the ring, so text stays legible.
  let W = 960, H = 440, ctx, N = false;
  let CX = 235, CY = 228, R = 150;
  let CH = { x0: 548, x1: 930, y0: 52, y1: 380 };
  let TITLE2_Y = 26, DATES_Y = 0;
  function layout() {
    const cw = canvas.clientWidth || 960;
    N = cw < 640;
    if (N) {
      W = Math.max(300, Math.round(cw));
      R = Math.min(110, Math.floor(W / 2 - 44));
      CX = W / 2; CY = 40 + R + 42;
      DATES_Y = CY + R + 58;
      TITLE2_Y = DATES_Y + 30;
      CH = { x0: 44, x1: W - 16, y0: TITLE2_Y + 38, y1: TITLE2_Y + 38 + 190 };
      H = CH.y1 + 50 + 4 * 18 + 8;
    } else {
      W = 960; H = 440;
      CX = 235; CY = 228; R = 150;
      CH = { x0: 548, x1: 930, y0: 52, y1: 380 };
      TITLE2_Y = 26;
    }
    ctx = Lab.setupCanvas(canvas, W, H);
  }
  layout();
  let lastCW = canvas.clientWidth;
  if (window.ResizeObserver) new ResizeObserver(() => {
    const cw = canvas.clientWidth;
    if (cw && cw !== lastCW) { lastCW = cw; layout(); }
  }).observe(canvas.parentElement);
  function wrapText(text, x, y, maxW, lh) {
    // Translate the whole sentence before wrapping; Chinese wraps per character.
    if (window.I18N) text = window.I18N.t(text);
    const cjk = /[\u3000-\u9fff]/.test(text);
    const words = cjk ? [...text] : text.split(" ");
    const sep = cjk ? "" : " ";
    let line = "";
    for (const w of words) {
      const t = line ? line + sep + w : w;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; }
      else line = t;
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  }
  const MAXN = 100;
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";
  const BLUE = "#8fa6ff", AMBER = "#f0b35a", DIM = "#7f8ea6", FAINT = "#56647c", GRID = "#1a2436";

  // ---------- Exact theory ----------
  // P[n] = 1 - 365!/((365-n)! 365^n), built as a running product to avoid huge numbers.
  const P = [0];
  { let q = 1; for (let n = 1; n <= MAXN; n++) { q *= (365 - (n - 1)) / 365; P[n] = 1 - q; } }
  const approx = (n) => 1 - Math.exp(-n * (n - 1) / 2 / 365);

  const state = {
    people: [],          // { day, born }
    showPairs: false,
    showApprox: true,
    firsts: [],          // simulated rooms: size at which the first match appeared
    simQueue: 0,
    filling: false, fillTimer: 0,
  };

  const randDay = () => Math.floor(Math.random() * 365);
  const fmtPct = (p) => {
    if (p >= 0.9995 && p < 1) {
      const s = (100 * p).toFixed(3);
      return s === "100.000" ? "> 99.999%" : s + "%";
    }
    return (100 * p).toFixed(1) + "%";
  };
  const dateLabel = (d) => {
    let m = 11; while (MONTH_START[m] > d) m--;
    return (d - MONTH_START[m] + 1) + " " + MONTHS[m];
  };

  // ---------- Room ----------
  function addPerson(delay) {
    if (state.people.length >= MAXN) return;
    state.people.push({ day: randDay(), born: performance.now() + (delay || 0) });
  }
  function setCount(n, stagger) {
    n = Math.max(1, Math.min(MAXN, n));
    if (n < state.people.length) state.people.length = n;
    let i = 0;
    while (state.people.length < n) addPerson(stagger ? (i++) * stagger : 0);
    syncSlider();
    updateStats();
  }
  function roomInfo() {
    const counts = new Array(365).fill(0);
    for (const p of state.people) counts[p.day]++;
    let pairs = 0, days = 0;
    for (const c of counts) if (c >= 2) { pairs += c * (c - 1) / 2; days++; }
    return { counts, pairs, days };
  }

  // ---------- Simulation ----------
  function simulateRoom() {
    const seen = new Uint8Array(365);
    let k = 0;
    for (;;) {
      k++;
      const d = randDay();
      if (seen[d]) return k;
      seen[d] = 1;
    }
  }
  const simP = (n) => {
    if (!state.firsts.length) return null;
    let c = 0;
    for (const k of state.firsts) if (k <= n) c++;
    return c / state.firsts.length;
  };

  // ---------- Drawing ----------
  const angleOf = (day) => (day + 0.5) / 365 * Math.PI * 2 - Math.PI / 2;
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  function drawRing(now, info) {
    // Day ticks
    ctx.strokeStyle = "#26324a";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.stroke();
    for (let d = 0; d < 365; d++) {
      const a = d / 365 * Math.PI * 2 - Math.PI / 2;
      const isMonth = MONTH_START.includes(d);
      const r0 = isMonth ? R - 14 : R - 4;
      ctx.strokeStyle = isMonth ? "#3a4760" : "#1c2639";
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0);
      ctx.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R);
      ctx.stroke();
    }
    ctx.font = (N ? "11px " : "10px ") + MONO;
    ctx.fillStyle = N ? DIM : FAINT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let m = 0; m < 12; m++) {
      const mid = MONTH_START[m] + ((m < 11 ? MONTH_START[m + 1] : 365) - MONTH_START[m]) / 2;
      const a = mid / 365 * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(MONTHS[m], CX + Math.cos(a) * (R - (N ? 24 : 26)), CY + Math.sin(a) * (R - (N ? 24 : 26)));
    }

    // Pairs: one chord per pair of people
    const n = state.people.length;
    if (state.showPairs && n > 1) {
      const pairs = n * (n - 1) / 2;
      ctx.strokeStyle = `rgba(143,166,255,${Math.min(0.4, 18 / pairs + 0.03).toFixed(3)})`;
      ctx.beginPath();
      const pts = state.people.map((p) => {
        const a = angleOf(p.day);
        return [CX + Math.cos(a) * (R - 40), CY + Math.sin(a) * (R - 40)];
      });
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]);
      }
      ctx.stroke();
    }

    // Matched days: amber spoke and label
    const labelled = info.days <= 6;
    for (let d = 0; d < 365; d++) {
      if (info.counts[d] < 2) continue;
      const a = angleOf(d);
      ctx.strokeStyle = "rgba(240,179,90,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(a) * (R - 40), CY + Math.sin(a) * (R - 40));
      ctx.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // People
    const stack = new Array(365).fill(0);
    const shown = new Array(365).fill(0);
    for (const p of state.people) {
      const t = (now - p.born) / 420;
      if (t < 0) continue;
      const k = stack[p.day]++;
      shown[p.day]++;
      const a = angleOf(p.day);
      const rr = R + 11 + k * 10;
      const u = Lab.reducedMotion ? 1 : ease(Math.min(1, t));
      const x = CX + Math.cos(a) * rr * u, y = CY + Math.sin(a) * rr * u;
      ctx.fillStyle = info.counts[p.day] >= 2 ? AMBER : BLUE;
      ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2); ctx.fill();
    }
    if (labelled && N) {
      // No room beside the ring on a phone: list the shared days under it.
      ctx.font = "12px " + MONO;
      ctx.fillStyle = AMBER;
      const labels = [];
      for (let d = 0; d < 365; d++) if (info.counts[d] >= 2 && shown[d] >= 2) labels.push(dateLabel(d));
      const widths = labels.map((l) => ctx.measureText(l).width);
      const gap = 16, total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, labels.length - 1);
      let x = Math.max(12, (W - total) / 2), y = DATES_Y;
      ctx.textAlign = "left";
      labels.forEach((l, i) => {
        if (x + widths[i] > W - 12) { x = 12; y += 18; }
        ctx.fillText(l, x, y);
        x += widths[i] + gap;
      });
    } else if (labelled) {
      ctx.font = "11px " + MONO;
      ctx.fillStyle = AMBER;
      for (let d = 0; d < 365; d++) {
        if (info.counts[d] < 2 || shown[d] < 2) continue;
        const a = angleOf(d);
        const rr = R + 11 + info.counts[d] * 10 + 16;
        const x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr;
        ctx.textAlign = Math.cos(a) > 0.3 ? "left" : Math.cos(a) < -0.3 ? "right" : "center";
        ctx.fillText(dateLabel(d), x, y);
      }
    }

    // Centre readout
    ctx.textAlign = "center";
    ctx.fillStyle = "#e9eef7";
    ctx.font = "600 34px 'Spectral', Georgia, serif";
    ctx.fillText(String(n), CX, CY - 22);
    ctx.font = "11px " + MONO;
    ctx.fillStyle = DIM;
    ctx.fillText(n === 1 ? "PERSON" : "PEOPLE", CX, CY + 2);
    const pairs = n * (n - 1) / 2;
    ctx.fillStyle = state.showPairs ? BLUE : DIM;
    ctx.fillText(pairs.toLocaleString() + (pairs === 1 ? " PAIR" : " PAIRS"), CX, CY + 20);
    ctx.fillStyle = info.pairs ? AMBER : FAINT;
    ctx.fillText(info.pairs ? (info.pairs === 1 ? "1 MATCH" : info.pairs + " MATCHES") : "NO MATCH", CX, CY + 38);
    ctx.textBaseline = "alphabetic";
  }

  const cx = (n) => CH.x0 + (n / MAXN) * (CH.x1 - CH.x0);
  const cy = (p) => CH.y1 - p * (CH.y1 - CH.y0);

  function drawChart() {
    ctx.font = "12px " + MONO;
    ctx.fillStyle = DIM;
    ctx.textAlign = "left";
    if (N) wrapText("CHANCE OF AT LEAST ONE SHARED BIRTHDAY", 12, TITLE2_Y, W - 24, 16);
    else ctx.fillText("CHANCE OF AT LEAST ONE SHARED BIRTHDAY", CH.x0 - 40, 26);
    ctx.fillText("A YEAR OF BIRTHDAYS", N ? 12 : 20, N ? 22 : 26);

    // Grid
    ctx.font = (N ? "11px " : "10px ") + MONO;
    ctx.strokeStyle = GRID;
    ctx.fillStyle = FAINT;
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.beginPath(); ctx.moveTo(CH.x0, cy(p) + 0.5); ctx.lineTo(CH.x1, cy(p) + 0.5); ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(Math.round(p * 100) + "%", CH.x0 - 8, cy(p) + 3);
    }
    ctx.textAlign = "center";
    for (let n = 0; n <= MAXN; n += N ? 20 : 10) {
      ctx.fillText(String(n), cx(n), CH.y1 + 16);
    }
    ctx.fillText("people in the room", (CH.x0 + CH.x1) / 2, CH.y1 + (N ? 36 : 34));

    // Landmarks: 23 and 70
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = "#2c3a55";
    for (const n of [23, 70]) {
      ctx.beginPath(); ctx.moveTo(cx(n), CH.y1); ctx.lineTo(cx(n), cy(P[n])); ctx.lineTo(CH.x0, cy(P[n])); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = DIM;
    ctx.textAlign = "left";
    const nNow = state.people.length;
    if (Math.abs(nNow - 23) > 4) ctx.fillText("23 → 50.7%", cx(23) + 8, cy(P[23]) + 16);
    if (Math.abs(nNow - 70) > 4) ctx.fillText("70 → 99.9%", cx(70) + 8, cy(P[70]) + 18);

    // Pairs estimate
    if (state.showApprox) {
      ctx.strokeStyle = "#7f8ea6";
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      for (let n = 1; n <= MAXN; n++) n === 1 ? ctx.moveTo(cx(n), cy(approx(n))) : ctx.lineTo(cx(n), cy(approx(n)));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Exact curve
    ctx.strokeStyle = "#e9eef7";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let n = 1; n <= MAXN; n++) n === 1 ? ctx.moveTo(cx(n), cy(P[n])) : ctx.lineTo(cx(n), cy(P[n]));
    ctx.stroke();
    ctx.lineWidth = 1;

    // Simulation
    if (state.firsts.length) {
      const hist = new Array(MAXN + 2).fill(0);
      for (const k of state.firsts) hist[Math.min(k, MAXN + 1)]++;
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let c = 0;
      for (let n = 1; n <= MAXN; n++) {
        c += hist[n];
        const y = cy(c / state.firsts.length);
        n === 1 ? ctx.moveTo(cx(n), y) : ctx.lineTo(cx(n), y);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Legend
    const lx = N ? 12 : cx(46);
    let ly = N ? CH.y1 + 62 : cy(0.36);
    ctx.font = (N ? "12px " : "11px ") + SANS;
    ctx.textAlign = "left";
    const legend = [["#e9eef7", "exact", false]];
    if (state.showApprox) legend.push(["#7f8ea6", "pairs estimate 1 − e^(−pairs/365)", true]);
    if (state.firsts.length) legend.push([AMBER, "simulated, " + state.firsts.length.toLocaleString() + " rooms", false]);
    for (const [col, txt, dash] of legend) {
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      if (dash) ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 22, ly); ctx.stroke();
      ctx.setLineDash([]); ctx.lineWidth = 1;
      ctx.fillStyle = "#c9d4e3";
      if (N) ly = wrapText(txt, lx + 30, ly + 4, W - lx - 42, 17) - 4 + 1;
      else { ctx.fillText(txt, lx + 30, ly + 4); ly += 18; }
    }

    // Current room marker
    const n = state.people.length;
    ctx.strokeStyle = BLUE;
    ctx.beginPath(); ctx.moveTo(cx(n) + 0.5, CH.y1); ctx.lineTo(cx(n) + 0.5, CH.y0); ctx.stroke();
    ctx.fillStyle = BLUE;
    ctx.beginPath(); ctx.arc(cx(n), cy(P[n]), 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = "12px " + MONO;
    const label = "n = " + n + ": " + fmtPct(P[n]);
    const right = cx(n) > CH.x1 - 120;
    ctx.textAlign = right ? "right" : "left";
    // On a phone, keep the label inside the plot when the point is near the top.
    const below = N && cy(P[n]) - 10 < CH.y0 + 16;
    ctx.fillText(label, cx(n) + (right ? -10 : 10), cy(P[n]) + (below ? 22 : -10));
  }

  // ---------- Stats ----------
  function syncSlider() {
    $("people").value = state.people.length;
    $("peopleOut").textContent = state.people.length;
  }
  function updateStats() {
    const n = state.people.length;
    const info = roomInfo();
    $("nPeople").textContent = n;
    $("nPairs").textContent = (n * (n - 1) / 2).toLocaleString();
    $("pTheory").textContent = fmtPct(P[n]);
    $("matchNow").textContent = info.pairs
      ? (info.days === 1 ? "1 shared day" : info.days + " shared days")
      : "no match";
    const s = simP(n);
    $("simRate").textContent = s === null ? "–" : fmtPct(s) + " of " + state.firsts.length.toLocaleString();
    $("simCount").textContent = state.firsts.length.toLocaleString() + " rooms";
  }

  // ---------- Narration and challenges ----------
  const tr = (x) => (window.I18N ? I18N.t(x) : x);
  function sayRoom() {
    const n = state.people.length, info = roomInfo();
    const a = n + " people make " + (n * (n - 1) / 2) + " pairs, and the exact chance of a shared birthday is " + fmtPct(P[n]) + ".";
    const b = info.pairs ? (info.days === 1 ? "This room has 1 shared birthday." : "This room has " + info.days + " shared birthdays.") : "This room has no shared birthday.";
    WONDERS.describe(tr(a) + " " + tr(b));
  }
  // After anything the user does to the room.
  function checkRoom() {
    const info = roomInfo();
    if (state.people.length >= 40 && info.pairs === 0) WONDERS.challenge("lucky-40");
  }
  function fillFound() {
    const n = state.people.length;
    WONDERS.sound("event");
    WONDERS.describe("A shared birthday turned up when person " + n + " walked in.", { now: true });
    if (n <= 20) WONDERS.challenge("early-match");
  }
  function simDone() {
    const n = state.people.length, s = simP(n);
    WONDERS.sound("event");
    WONDERS.describe(tr("Simulation: " + state.firsts.length + " rooms so far.") + " " + tr("At " + n + " people, " + fmtPct(s) + " of them had a match, and the exact chance is " + fmtPct(P[n]) + "."));
    checkSim();
  }
  function checkSim() {
    if (state.simQueue === 0 && state.firsts.length >= 5000 && state.people.length === 23 && Math.abs(simP(23) - P[23]) <= 0.01) WONDERS.challenge("close-sim");
  }

  // ---------- Loop ----------
  function frame(now) {
    if (state.simQueue > 0) {
      const batch = Math.min(state.simQueue, 25);
      for (let i = 0; i < batch; i++) state.firsts.push(simulateRoom());
      state.simQueue -= batch;
      updateStats();
      if (state.simQueue === 0) simDone();
    }
    if (state.filling && now >= state.fillTimer) {
      addPerson(0);
      state.fillTimer = now + 380;
      syncSlider();
      updateStats();
      const last = state.people[state.people.length - 1];
      WONDERS.sound("tick", { pitch: last.day / 365, pan: Math.cos(angleOf(last.day)) });
      if (roomInfo().pairs > 0) { stopFill(); fillFound(); }
      else if (state.people.length >= MAXN) stopFill();
    }
    const info = roomInfo();
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    drawRing(now, info);
    drawChart();
    requestAnimationFrame(frame);
  }

  // ---------- Controls ----------
  function stopFill() {
    state.filling = false;
    $("fillMatch").textContent = "Add people until a match";
  }
  function startFill() {
    state.people = [];
    if (Lab.reducedMotion) {
      do { addPerson(-1000); } while (roomInfo().pairs === 0 && state.people.length < MAXN);
      syncSlider(); updateStats();
      if (roomInfo().pairs > 0) fillFound();
      return;
    }
    addPerson(0);
    state.filling = true;
    state.fillTimer = performance.now() + 380;
    $("fillMatch").textContent = "Stop";
    syncSlider(); updateStats();
  }

  $("people").addEventListener("input", (e) => { stopFill(); setCount(+e.target.value, 0); checkRoom(); checkSim(); sayRoom(); });
  $("addOne").addEventListener("click", () => {
    stopFill(); setCount(state.people.length + 1, 0); checkRoom(); checkSim(); sayRoom();
    const last = state.people[state.people.length - 1];
    WONDERS.sound(roomInfo().counts[last.day] >= 2 ? "event" : "tick", { pitch: last.day / 365 });
  });
  $("newRoom").addEventListener("click", () => {
    stopFill();
    const n = state.people.length;
    state.people = [];
    setCount(n, Lab.reducedMotion ? 0 : Math.min(40, 900 / n));
    checkRoom(); sayRoom();
    WONDERS.sound(roomInfo().pairs ? "event" : "tick");
  });
  $("fillMatch").addEventListener("click", () => { state.filling ? stopFill() : startFill(); });
  $("runSim").addEventListener("click", () => {
    if (Lab.reducedMotion) { for (let i = 0; i < 1000; i++) state.firsts.push(simulateRoom()); updateStats(); simDone(); }
    else state.simQueue += 1000;
  });
  $("clearSim").addEventListener("click", () => { state.firsts = []; state.simQueue = 0; updateStats(); });
  $("showPairs").addEventListener("change", (e) => { state.showPairs = e.target.checked; });
  $("showApprox").addEventListener("change", (e) => { state.showApprox = e.target.checked; });

  WONDERS.describer(() => {
    const n = state.people.length, info = roomInfo(), s = simP(n);
    const out = [
      "A ring of 365 days shows the birthdays of " + n + " people. They make " + (n * (n - 1) / 2) + " pairs, and the exact chance that at least two share a birthday is " + fmtPct(P[n]) + ".",
      info.pairs ? (info.days === 1 ? "This room has 1 shared birthday." : "This room has " + info.days + " shared birthdays.") : "This room has no shared birthday.",
      s === null ? "No rooms have been simulated yet." : "In " + state.firsts.length + " simulated rooms, " + fmtPct(s) + " had a match by " + n + " people.",
    ];
    return out.map(tr).join(" ");
  });

  // Open with a room of 23 filling in and a 1,000-room simulation running.
  setCount(23, Lab.reducedMotion ? 0 : 55);
  if (Lab.reducedMotion) { for (let i = 0; i < 1000; i++) state.firsts.push(simulateRoom()); }
  else state.simQueue = 1000;
  updateStats();
  requestAnimationFrame(frame);
})();
