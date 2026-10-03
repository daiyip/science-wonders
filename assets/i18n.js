// Language support. Load first in <head> on every page:
//   <script src="<root>/assets/i18n.js" data-page="double-slit"></script>
// The page itself stays in English. When another language is chosen, this
// translates text nodes, short inline-markup blocks, a few attributes and
// canvas text as they appear, using dictionaries in i18n/<lang>/<page>.js.
// Strings containing numbers are matched as templates, so "t = 55 fs" uses
// the dictionary entry for "t = {0} fs".
(function () {
  const LANGS = { en: "English", "zh-CN": "简体中文", es: "Español" };
  const KEY = "science-wonders-lang";
  const script = document.currentScript;
  const root = new URL("../", script.src).href;
  const page = script.dataset.page || "common";

  function pick() {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "collect") return q;
    const norm = (l) => {
      if (!l) return null;
      l = l.toLowerCase();
      if (l.startsWith("zh")) return "zh-CN";
      if (l.startsWith("es")) return "es";
      if (l.startsWith("en")) return "en";
      return null;
    };
    if (norm(q)) { try { localStorage.setItem(KEY, norm(q)); } catch (e) {} return norm(q); }
    try { const s = norm(localStorage.getItem(KEY)); if (s) return s; } catch (e) {}
    for (const l of navigator.languages || [navigator.language]) { const n = norm(l); if (n) return n; }
    return "en";
  }
  const lang = pick();
  const dict = Object.create(null);
  const I = (window.I18N = { lang, langs: LANGS, dict, add: (d) => Object.assign(dict, d), seen: new Set(), missed: new Set() });
  if (lang !== "collect") document.documentElement.lang = lang;
  const collecting = lang === "collect";
  if (lang !== "en" && !collecting) {
    document.write(`<script src="${root}i18n/${lang}/common.js"><\/script>`);
    if (page !== "common") document.write(`<script src="${root}i18n/${lang}/${page}.js"><\/script>`);
  }

  // ---------- Lookup ----------
  const NUM = /[−-]?\d+(?:[.,]\d+)*(?:\s?[×x]\s?10[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+|e[-+]?\d+)?/g;
  const cache = new Map();
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  function lookup(s) {
    const k = norm(s);
    if (!k || !/[A-Za-z]/.test(k)) return null;
    if (collecting) { I.seen.add(/\d/.test(k) ? template(k).key : k); return null; }
    if (k in dict) return dict[k];
    const t = template(k);
    if (!(t.key in dict)) { if (I.missed.size < 3000) I.missed.add(t.key); return null; }
    return dict[t.key].replace(/\{(\d+)\}/g, (m, i) => (t.nums[i] !== undefined ? t.nums[i] : m));
  }
  function template(k) {
    const nums = [];
    const key = k.replace(NUM, (m) => { nums.push(m); return "{" + (nums.length - 1) + "}"; });
    return { key, nums };
  }
  function lookupHtml(html) {
    if (("<html>" + html) in dict) return dict["<html>" + html];
    if (!/\d/.test(html)) return null;
    const t = template(html);
    const v = dict["<html>" + t.key];
    return v == null ? null : v.replace(/\{(\d+)\}/g, (m, i) => (t.nums[i] !== undefined ? t.nums[i] : m));
  }
  function translate(s) {
    if (lang === "en" || typeof s !== "string") return s;
    if (cache.has(s)) return cache.get(s);
    const t = lookup(s);
    let out = s;
    if (t != null) {
      const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
      out = lead + t + trail;
    }
    if (cache.size > 5000) cache.clear();
    cache.set(s, out);
    return out;
  }
  I.t = translate;
  if (lang === "en") return;

  // ---------- Canvas ----------
  const P = CanvasRenderingContext2D.prototype;
  for (const fn of ["fillText", "strokeText", "measureText"]) {
    const orig = P[fn];
    P[fn] = function (text, ...rest) { return orig.call(this, translate(String(text)), ...rest); };
  }

  // ---------- DOM ----------
  const INLINE = new Set(["B", "I", "EM", "STRONG", "A", "CODE", "SUB", "SUP", "SPAN", "BR", "SMALL", "ABBR", "U", "S", "MARK", "VAR"]);
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "SVG"]);
  const done = new WeakMap();
  const ATTRS = ["placeholder", "aria-label", "title"];

  // A block of text with inline markup (a sentence with a <b> in it) is
  // translated as a whole, so word order can change. Never for elements that
  // hold ids or controls, because page scripts keep references to those.
  const BLOCKS = new Set(["P", "LI", "A", "H1", "H2", "H3", "H4", "TD", "TH", "LABEL", "FIGCAPTION", "DT", "DD", "FOOTER", "SPAN", "SMALL"]);
  function isBlock(el) {
    if (!BLOCKS.has(el.tagName) || !el.firstElementChild) return false;
    if (el.querySelector("[id], input, select, textarea, button, canvas, svg")) return false;
    for (const d of el.querySelectorAll("*")) if (!INLINE.has(d.tagName)) return false;
    return /[A-Za-z]/.test(el.textContent);
  }
  function visitText(node) {
    const v = node.nodeValue;
    if (done.get(node) === v) return;
    const t = translate(v);
    done.set(node, t);
    if (t !== v) node.nodeValue = t;
  }
  function visitAttrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      const mark = "data-i18n-" + a;
      if (el.getAttribute(mark) === v) continue;
      const t = translate(v);
      if (t !== v) el.setAttribute(a, t);
      el.setAttribute(mark, t);
    }
  }
  function visit(node) {
    if (node.nodeType === 3) {
      const par = node.parentElement;
      if (par && !SKIP.has(par.nodeName.toUpperCase()) && !par.closest("[translate=no]")) visitText(node);
      return;
    }
    if (node.nodeType !== 1 || SKIP.has(node.nodeName.toUpperCase()) || node.getAttribute("translate") === "no") return;
    visitAttrs(node);
    if (isBlock(node)) {
      const html = norm(node.innerHTML);
      if (done.get(node) === html) return;
      if (collecting) { I.seen.add("<html>" + (/\d/.test(html) ? template(html).key : html)); done.set(node, html); return; }
      else {
        const t = lookupHtml(html);
        if (t != null) { node.innerHTML = t; done.set(node, norm(node.innerHTML)); return; }
      }
    }
    for (let c = node.firstChild; c; c = c.nextSibling) visit(c);
  }
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") visit(m.target);
      else if (m.type === "attributes") visitAttrs(m.target);
      else {
        for (const n of m.addedNodes) visit(n);
        if (m.target.nodeType === 1 && isBlock(m.target)) visit(m.target);
      }
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  document.addEventListener("DOMContentLoaded", () => visit(document.documentElement));
})();

// Language menu in the top bar. Runs in every language, including English.
document.addEventListener("DOMContentLoaded", () => {
  const I = window.I18N;
  const nav = document.querySelector(".topbar nav");
  if (!I || !nav) return;
  const sel = document.createElement("select");
  sel.className = "lang-select";
  sel.setAttribute("aria-label", "Language");
  for (const [code, name] of Object.entries(I.langs)) {
    const o = document.createElement("option");
    o.value = code;
    o.textContent = name;
    o.selected = code === I.lang;
    o.setAttribute("translate", "no");
    sel.append(o);
  }
  sel.addEventListener("change", () => {
    try { localStorage.setItem("science-wonders-lang", sel.value); } catch (e) {}
    // Put the choice in the URL: a navigation to the same URL (e.g. one with a
    // #hash) would only scroll, not reload.
    const u = new URL(location.href);
    u.searchParams.set("lang", sel.value);
    if (u.href === location.href) location.reload();
    else location.replace(u.href);
  });
  nav.append(sel);
});
