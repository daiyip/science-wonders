// Shared features for every experiment page: predict-first, shareable setups,
// quiz, related experiments, guided-tour bar, presenter mode and progress.
// Load after the page's own script:
//   <script src="../../assets/wonders.js" data-slug="double-slit"></script>
(function () {
  const W = (window.WONDERS = window.WONDERS || {});
  const script = document.currentScript;
  const slug = script && script.dataset.slug;
  const content = (W.content || {})[slug] || null;
  const catalog = W.catalog || [];
  const tours = W.tours || [];
  const bySlug = Object.fromEntries(catalog.map((c) => [c.slug, c]));

  // ---------- Progress (per browser) ----------
  const KEY = "science-wonders-progress";
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
  }
  function update(fn) { const p = load(); fn(p); save(p); }
  W.progress = { load, update };

  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const k of kids) if (k != null) n.append(k);
    return n;
  };

  if (!slug) return;
  update((p) => { (p.visited = p.visited || {})[slug] = Date.now(); });

  const query = new URLSearchParams(location.search);
  const root = document.documentElement;

  // ---------- Embed mode (?embed=1): only the apparatus, for other sites ----------
  const embedded = query.get("embed") === "1";
  if (embedded) root.classList.add("embed");

  // ---------- Explanation depth: Simple (default) or Deeper ----------
  // Page content marks extra material with data-depth="deep" (and, optionally,
  // simpler alternatives with data-depth="simple"); CSS shows one or the other.
  const DEPTH_KEY = "science-wonders-depth";
  let depth = query.get("depth");
  if (depth !== "deep" && depth !== "simple") {
    try { depth = localStorage.getItem(DEPTH_KEY); } catch (e) {}
  }
  depth = depth === "deep" ? "deep" : "simple";
  root.classList.toggle("depth-deep", depth === "deep");

  const head = document.querySelector(".demo-head");
  const bench = document.querySelector(".bench");

  // ---------- Shareable setups ----------
  // Every input/select with an id inside .controls, plus pressed toggle buttons,
  // round-trips through the query string as ?x.<id>=value&p=<id>,<id>.
  const controls = document.querySelector(".controls");
  function controlInputs() {
    return controls ? [...controls.querySelectorAll("input[id], select[id]")].filter((i) => i.type !== "file" && i.type !== "button") : [];
  }
  function pressedButtons() {
    return controls ? [...controls.querySelectorAll('button[id][aria-pressed="true"]')] : [];
  }
  function setupURL() {
    const params = new URLSearchParams();
    for (const i of controlInputs()) {
      if (i.type === "checkbox") params.set("x." + i.id, i.checked ? "1" : "0");
      else if (i.type === "radio") { if (i.checked) params.set("x." + i.id, "1"); }
      else params.set("x." + i.id, i.value);
    }
    const pressed = pressedButtons().map((b) => b.id);
    if (pressed.length) params.set("p", pressed.join(","));
    const tour = currentTour();
    if (tour) params.set("tour", tour.id);
    if (depth === "deep") params.set("depth", "deep");
    return location.origin + location.pathname + "?" + params.toString();
  }
  function applySetup() {
    const params = new URLSearchParams(location.search);
    let applied = false;
    for (const [k, v] of params) {
      if (!k.startsWith("x.")) continue;
      const i = document.getElementById(k.slice(2));
      if (!i || !controls || !controls.contains(i)) continue;
      if (i.type === "checkbox") { const want = v === "1"; if (i.checked !== want) { i.checked = want; fire(i); } }
      else if (i.type === "radio") { if (!i.checked) { i.checked = true; fire(i); } }
      else if (i.value !== v) { i.value = v; fire(i); }
      applied = true;
    }
    for (const id of (params.get("p") || "").split(",").filter(Boolean)) {
      const b = document.getElementById(id);
      if (b && controls && controls.contains(b) && b.getAttribute("aria-pressed") === "false") { b.click(); applied = true; }
    }
    return applied;
  }
  function fire(i) {
    i.dispatchEvent(new Event("input", { bubbles: true }));
    i.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // ---------- Toolbar ----------
  const shareStatus = el("span", { class: "tool-status", role: "status" });
  const shareBtn = el("button", { id: "wShare", type: "button", text: "Copy link to this setup", onclick: async () => {
    const url = setupURL();
    try {
      await navigator.clipboard.writeText(url);
      shareStatus.textContent = "Link copied. It opens this page with your current settings.";
    } catch (e) {
      shareStatus.textContent = "";
      const box = el("input", { class: "share-box", value: url, readonly: "", "aria-label": "Link to this setup" });
      shareStatus.append(box);
      box.select();
    }
  } });
  const presentBtn = el("button", { id: "wPresent", type: "button", text: "Presenter mode", onclick: () => togglePresenter() });
  const quizLink = content ? el("a", { class: "tool-link", href: "#quiz", text: "Quiz" }) : null;

  // Embed code for other sites: the same setup, shown without the article.
  const embedBtn = el("button", { id: "wEmbed", type: "button", text: "Embed", onclick: () => {
    const url = new URL(setupURL());
    url.searchParams.delete("tour");
    url.searchParams.set("embed", "1");
    // Height for a ~940px-wide frame: the bench keeps its aspect ratio; the rest is measured as-is.
    const rest = [document.querySelector(".stats"), controls].filter(Boolean).reduce((a, n) => a + n.offsetHeight, 0);
    const benchH = bench ? bench.offsetHeight * 940 / Math.max(1, bench.offsetWidth) : 500;
    const h = Math.min(1200, Math.round(benchH + rest + 130));
    const title = (document.querySelector("h1") || {}).textContent || "Science Wonders";
    const code = `<iframe src="${url.href}" title="${title.replace(/"/g, "&quot;")}" width="100%" height="${h}" style="border:0;max-width:960px" loading="lazy" allow="fullscreen"></iframe>`;
    const box = el("textarea", { class: "share-box embed-box", readonly: "", rows: "3", "aria-label": "Embed code" });
    box.value = code;
    const copy = el("button", { type: "button", text: "Copy embed code", onclick: async () => {
      try { await navigator.clipboard.writeText(code); copy.textContent = "Copied"; } catch (e) { box.select(); }
    } });
    shareStatus.replaceChildren(el("span", { text: "Paste this into any web page to show the experiment with your current settings." }), box, copy);
    box.select();
  } });

  // Record a short video clip of the main canvas.
  const recordBtn = canRecord() ? el("button", { id: "wRecord", type: "button", text: "Record a clip", onclick: () => toggleRecording() }) : null;

  // Simple / Deeper explanations.
  const depthSeg = el("div", { class: "seg depth-seg", role: "group", "aria-label": "Explanations" },
    ...[["simple", "Simple"], ["deep", "Deeper"]].map(([v, label]) =>
      el("button", { type: "button", "data-depth-set": v, "aria-pressed": String(depth === v), text: label, onclick: () => setDepth(v) })));
  const depthCtl = document.querySelector(".explain") ? el("div", { class: "depth-ctl" }, el("span", { class: "eyebrow", text: "Explanations" }), depthSeg) : null;
  function setDepth(v) {
    depth = v;
    root.classList.toggle("depth-deep", v === "deep");
    try { localStorage.setItem(DEPTH_KEY, v); } catch (e) {}
    for (const b of depthSeg.children) b.setAttribute("aria-pressed", String(b.dataset.depthSet === v));
  }

  const toolbar = el("div", { class: "toolbar" }, shareBtn, embedBtn, recordBtn, presentBtn, quizLink, depthCtl, shareStatus);
  if (head) head.after(toolbar);

  // ---------- Clip recording ----------
  function mainCanvas() {
    const all = bench ? [...bench.querySelectorAll("canvas")] : [];
    return all.sort((a, b) => b.width * b.height - a.width * a.height)[0] || null;
  }
  function clipType() {
    if (!window.MediaRecorder) return null;
    for (const t of ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"]) {
      try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (e) {}
    }
    return null;
  }
  function canRecord() {
    return !!(bench && bench.querySelector("canvas") && HTMLCanvasElement.prototype.captureStream && clipType());
  }
  const MAX_CLIP = 20;
  let rec = null;
  function toggleRecording() {
    if (rec) { rec.stop(); return; }
    const canvas = mainCanvas();
    const type = clipType();
    let recorder;
    try { recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: type, videoBitsPerSecond: 5e6 }); }
    catch (e) { shareStatus.textContent = "This browser can't record the experiment."; return; }
    const chunks = [];
    const started = Date.now();
    const label = () => {
      const t = Math.floor((Date.now() - started) / 1000);
      recordBtn.textContent = `Stop recording (0:${String(t).padStart(2, "0")})`;
      if (t >= MAX_CLIP && rec) rec.stop();
    };
    const timer = setInterval(label, 250);
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      clearInterval(timer);
      rec = null;
      recordBtn.classList.remove("recording");
      recordBtn.textContent = "Record a clip";
      const blob = new Blob(chunks, { type: type.split(";")[0] });
      const href = URL.createObjectURL(blob);
      const name = `science-wonders-${slug}.${type.startsWith("video/mp4") ? "mp4" : "webm"}`;
      const a = el("a", { href, download: name, class: "tool-link", text: "Save the clip" });
      shareStatus.replaceChildren(el("span", { text: "Clip ready." }), " ", a);
      a.click();
    };
    rec = recorder;
    recorder.start(1000);
    recordBtn.classList.add("recording");
    label();
    shareStatus.textContent = `Recording the experiment. Play with the controls, then press stop (up to ${MAX_CLIP} seconds).`;
  }

  // ---------- Presenter mode ----------
  const exitBtn = el("button", { class: "present-exit", type: "button", text: "Exit presenter mode (Esc)", onclick: () => togglePresenter(false) });
  document.body.append(exitBtn);
  function togglePresenter(on) {
    const root = document.documentElement;
    on = on === undefined ? !root.classList.contains("presenting") : on;
    root.classList.toggle("presenting", on);
    if (on) {
      if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
      window.scrollTo(0, 0);
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) document.documentElement.classList.remove("presenting");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.documentElement.classList.contains("presenting")) togglePresenter(false);
  });

  // ---------- Guided tour bar ----------
  function currentTour() {
    const id = new URLSearchParams(location.search).get("tour");
    let t = tours.find((x) => x.id === id);
    if (!t) {
      try {
        const saved = sessionStorage.getItem("science-wonders-tour");
        t = tours.find((x) => x.id === saved && x.steps.some((s) => s.slug === slug));
      } catch (e) {}
    }
    return t && t.steps.some((s) => s.slug === slug) ? t : null;
  }
  const tour = currentTour();
  if (tour) {
    try { sessionStorage.setItem("science-wonders-tour", tour.id); } catch (e) {}
    const i = tour.steps.findIndex((s) => s.slug === slug);
    const step = tour.steps[i];
    const link = (s, cls, ...kids) => s ? el("a", { class: cls, href: `../${s.slug}/index.html?tour=${tour.id}` }, ...kids) : null;
    const prev = tour.steps[i - 1], next = tour.steps[i + 1];
    const bar = el("aside", { class: "tour-bar", "aria-label": "Guided tour" },
      el("div", { class: "tour-meta" },
        el("a", { href: "../../tours/index.html", class: "eyebrow", text: `Tour · ${tour.title}` }),
        el("span", { class: "eyebrow", text: `Step ${i + 1} of ${tour.steps.length}` })),
      el("p", { class: "tour-goal" }, el("b", { text: "Your goal:" }), " ", el("span", { text: step.goal })),
      el("div", { class: "tour-nav" },
        link(prev, "tour-prev", "← ", el("span", { text: (bySlug[prev && prev.slug] || {}).title })),
        next ? link(next, "tour-next", el("span", { text: "Next:" }), " ", el("span", { text: (bySlug[next.slug] || {}).title }), " →")
             : el("a", { class: "tour-next", href: "../../tours/index.html", text: "Finish the tour →", onclick: () => {
                 update((p) => { (p.tours = p.tours || {})[tour.id] = Date.now(); });
                 try { sessionStorage.removeItem("science-wonders-tour"); } catch (e) {}
               } })));
    (head || document.body).before(bar);
  }

  if (embedded) {
    // Credit line linking back to the full page.
    const full = new URL(location.href);
    full.searchParams.delete("embed");
    document.body.append(el("a", { class: "embed-credit", href: full.href, target: "_blank", rel: "noopener" },
      el("span", { text: "Science Wonders" }), " ↗"));
  }

  if (content && !embedded) {
    // ---------- Predict first ----------
    const pr = content.predict;
    const done = (load().predicted || {})[slug];
    const card = el("section", { class: "predict", id: "predict", "aria-label": "Make a prediction" });
    const blur = () => bench && bench.classList.add("bench-hidden");
    const unblur = () => bench && bench.classList.remove("bench-hidden");
    function reveal(choice) {
      const right = choice === pr.answer;
      if (choice !== null) update((p) => { (p.predicted = p.predicted || {})[slug] = right ? "right" : "wrong"; });
      card.replaceChildren(
        el("div", { class: "eyebrow", text: choice === null ? "The answer" : right ? "Your prediction was right" : "Most people guess that too" }),
        el("p", { class: "predict-answer" }, el("b", { text: pr.options[pr.answer] }), " ", el("span", { text: pr.reveal })),
        el("p", { class: "predict-try" }, el("b", { text: "See it yourself:" }), " ", el("span", { text: pr.tryIt })));
      card.classList.add("answered", choice === null ? "skipped" : right ? "right" : "wrong");
      unblur();
    }
    if (done) {
      reveal(null);
      card.querySelector(".eyebrow").textContent = done === "right" ? "You predicted this one correctly" : "You've predicted this one before";
    } else {
      blur();
      card.append(
        el("div", { class: "eyebrow", text: "Before you play: predict" }),
        el("p", { class: "predict-q", text: pr.question }),
        el("div", { class: "predict-options" }, ...pr.options.map((o, k) =>
          el("button", { type: "button", text: o, onclick: () => reveal(k) }))),
        el("button", { class: "predict-skip", type: "button", text: "Skip and show the experiment", onclick: () => reveal(null) }));
    }
    (toolbar || head).after(card);

    // ---------- Quiz ----------
    const apps = document.getElementById("applications");
    const quiz = el("section", { class: "quiz", id: "quiz" },
      el("div", { class: "eyebrow", text: "Check your understanding" }),
      el("h2", { text: "Three quick questions" }));
    const score = el("p", { class: "quiz-score", role: "status" });
    const answers = {};
    content.quiz.forEach((item, qi) => {
      const fb = el("p", { class: "quiz-why" });
      const opts = el("div", { class: "quiz-options" });
      item.options.forEach((o, k) => opts.append(el("button", { type: "button", text: o, onclick: (e) => {
        if (qi in answers) return;
        answers[qi] = k === item.answer;
        [...opts.children].forEach((b, j) => {
          b.disabled = true;
          if (j === item.answer) b.classList.add("correct");
          else if (j === k) b.classList.add("incorrect");
        });
        fb.replaceChildren(el("b", { text: answers[qi] ? "Right." : "Not quite." }), " ", el("span", { text: item.why }));
        const n = Object.keys(answers).length;
        if (n === content.quiz.length) {
          const s = Object.values(answers).filter(Boolean).length;
          score.textContent = `You got ${s} of ${n}.`;
          update((p) => { const q = (p.quiz = p.quiz || {}); q[slug] = Math.max(q[slug] || 0, s); });
        }
      } })));
      quiz.append(el("div", { class: "quiz-item" }, el("p", { class: "quiz-q" }, el("b", { text: `${qi + 1}. ` }), item.q), opts, fb));
    });
    quiz.append(score);
    const prevBest = (load().quiz || {})[slug];
    if (prevBest != null) score.textContent = `Your best so far: ${prevBest} of ${content.quiz.length}.`;
    if (apps) apps.before(quiz);

    // ---------- Related experiments ----------
    const rel = el("section", { class: "related", "aria-label": "Related experiments" },
      el("div", { class: "eyebrow", text: "Where to go next" }),
      el("div", { class: "related-grid" }, ...content.related.filter((r) => bySlug[r.slug]).map((r) =>
        el("a", { class: "related-card", href: `../${r.slug}/index.html` },
          el("span", { class: "eyebrow", text: W.categories ? W.categories[bySlug[r.slug].cat] : "" }),
          el("b", { text: bySlug[r.slug].title }),
          el("span", { class: "muted", text: r.why })))));
    const footer = document.querySelector(".footer");
    if (footer) footer.before(rel);
  }

  // Apply a shared setup last, once every control exists and has its listeners.
  if (applySetup()) {
    shareStatus.textContent = "Opened with shared settings.";
  }

  // ---------- Offline support ----------
  if ("serviceWorker" in navigator && location.protocol === "https:" && script) {
    const swURL = new URL("../sw.js", script.src);
    navigator.serviceWorker.register(swURL, { scope: new URL("../", script.src).pathname }).catch(() => {});
  }
})();
