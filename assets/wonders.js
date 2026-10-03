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
  const toolbar = el("div", { class: "toolbar" }, shareBtn, presentBtn, quizLink, shareStatus);
  if (head) head.after(toolbar);

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

  if (content) {
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
