/*
 * tools/audit/page-audit.js — the accessibility checks, run inside the page.
 *
 * This file is evaluated in the browser by tools/audit/a11y.mjs, so it is a
 * plain expression that evaluates to a JSON string. It is not a module and
 * it is not loaded by anything else.
 *
 * The checks are the ones that can be decided from the DOM and the computed
 * style: a missing alt, a control with no name, a contrast ratio below the
 * WCAG threshold, a tap target under 48px, a heading that skips a level, a
 * document with no language, a canvas game that cannot announce its state,
 * a form control with no label, a duplicate id, an outline removed from a
 * focusable element, and Italian text with no lang attribute.
 *
 * Where a value cannot be measured this way — a gradient behind the text,
 * say — the check says so instead of guessing.
 */
(function () {
  const out = {
    alt: [], names: [], contrast: [], targets: [], headings: [],
    live: [], labels: [], ids: [], focus: [], inlineLang: [],
    lang: null, manual: 0, checked: 0,
  };
  const MAX = 25; /* per rule, per page: the report shows the shape of the problem, not every instance */

  function describe(el) {
    if (!el) return "?";
    let s = el.tagName ? el.tagName.toLowerCase() : String(el);
    if (el.id) s += "#" + el.id;
    if (el.className && typeof el.className === "string") {
      const c = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".");
      if (c) s += "." + c;
    }
    const t = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (t) s += " “" + t.slice(0, 44) + (t.length > 44 ? "…" : "") + "”";
    return s;
  }

  function push(rule, el, msg) {
    if (out[rule].length < MAX) out[rule].push({ el: describe(el), msg });
    else out.manual++;
  }

  /* ---- images without alt ---- */
  for (const img of document.querySelectorAll("img")) {
    if (!img.hasAttribute("alt")) push("alt", img, "no alt attribute");
  }

  /* ---- controls without an accessible name ---- */
  function hasName(el) {
    const label = el.getAttribute("aria-label");
    if (label && label.trim()) return true;
    const by = el.getAttribute("aria-labelledby");
    if (by) {
      for (const id of by.split(/\s+/)) {
        const t = document.getElementById(id);
        if (t && t.textContent.trim()) return true;
      }
    }
    const title = el.getAttribute("title");
    if (title && title.trim()) return true;
    if (el.tagName === "INPUT") {
      const v = el.getAttribute("value");
      if (v && v.trim() && (el.type === "button" || el.type === "submit")) return true;
      if (el.type === "image" && el.getAttribute("alt")) return true;
    }
    if ((el.textContent || "").trim()) return true;
    return false;
  }

  for (const el of document.querySelectorAll("button, a[href], [role=button], [role=link], [role=tab], [role=menuitem]")) {
    if (el.getAttribute("aria-hidden") === "true") continue;
    /* A control that is not rendered cannot be reached and cannot be
       announced, so it has no name to give. */
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (!hasName(el)) push("names", el, "control with no accessible name");
  }

  /* ---- form controls without a label ---- */
  for (const el of document.querySelectorAll("input, select, textarea")) {
    if (el.type === "hidden") continue;
    let ok = false;
    const label = el.getAttribute("aria-label");
    if (label && label.trim()) ok = true;
    const by = el.getAttribute("aria-labelledby");
    if (!ok && by) {
      for (const id of by.split(/\s+/)) {
        const t = document.getElementById(id);
        if (t && t.textContent.trim()) { ok = true; break; }
      }
    }
    if (!ok && el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')) ok = true;
    if (!ok && el.closest("label")) ok = true;
    if (!ok && el.getAttribute("title")) ok = true;
    if (!ok) push("labels", el, "form control with no label");
  }

  /* ---- duplicate ids ---- */
  const seenIds = new Set();
  for (const el of document.querySelectorAll("[id]")) {
    if (!el.id) continue;
    if (seenIds.has(el.id)) push("ids", el, "duplicate id “" + el.id + "”");
    else seenIds.add(el.id);
  }

  /* ---- heading order ---- */
  let lastLevel = 0;
  for (const h of document.querySelectorAll("h1,h2,h3,h4,h5,h6")) {
    const level = Number(h.tagName[1]);
    if (lastLevel && level > lastLevel + 1) {
      push("headings", h, "heading jumps from h" + lastLevel + " to h" + level);
    }
    lastLevel = level;
  }

  /* ---- document language ---- */
  const lang = document.documentElement.getAttribute("lang");
  out.lang = lang && /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$/.test(lang) ? lang : "MISSING";

  /* ---- inline non-English text needs a lang attribute ---- */
  for (const el of document.querySelectorAll(".it")) {
    if (!el.getAttribute("lang")) push("inlineLang", el, "Italian text with no lang=\"it\"");
  }

  /* ---- a canvas game should be able to announce its state ----
     A canvas that is aria-hidden is decorative and has nothing to announce;
     it is hidden from assistive technology on purpose. */
  const canvas = document.querySelector("canvas:not([aria-hidden='true'])");
  if (canvas && !document.querySelector("[aria-live]")) {
    push("live", canvas, "a canvas game with no aria-live region to announce its state");
  }

  /* ---- focus outlines removed ---- */
  for (const el of document.querySelectorAll("a[href], button, input, select, textarea, [tabindex]")) {
    const cs = getComputedStyle(el);
    if (cs.outlineStyle === "none" && parseFloat(cs.outlineWidth) === 0) {
      push("focus", el, "outline: none on a focusable element");
    }
  }

  /* ---- tap targets ----
     WCAG 2.5.8 exempts a target that is inline in a sentence: the size of
     a link inside a paragraph is constrained by the line height of the
     text around it, and making it 48px tall would break the paragraph. */
  for (const el of document.querySelectorAll("button, a[href], [role=button], [role=tab], input[type=checkbox], input[type=radio]")) {
    const cs = getComputedStyle(el);
    if (cs.display === "inline") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.width < 48 || r.height < 48) {
      push("targets", el, Math.round(r.width) + "×" + Math.round(r.height) + "px tap target");
    }
  }

  /* ---- contrast ---- */
  function parseColor(c) {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function hexColor(h) {
    let s = h.replace("#", "");
    if (s.length === 3) s = s.split("").map((c) => c + c).join("");
    if (s.length < 6) return null;
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16),
      a: s.length >= 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1,
    };
  }
  /* Source-over compositing: the foreground is painted on top of the
     background, and the result keeps whatever alpha is left. */
  function over(fg, bg) {
    const a = fg.a + bg.a * (1 - fg.a);
    if (a <= 0) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
      g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
      b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
      a: a,
    };
  }
  function luminance(c) {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function ratio(a, b) {
    const l1 = luminance(a);
    const l2 = luminance(b);
    const hi = Math.max(l1, l2);
    const lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }
  /* The colour stops of a gradient. The worst one is the worst case: if the
     text passes against all of them it passes against the gradient too. */
  function gradientStops(image) {
    const out = [];
    const re = /rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi;
    let m;
    while ((m = re.exec(image))) {
      const c = m[0][0] === "#" ? hexColor(m[0]) : parseColor(m[0]);
      if (c) out.push(c);
    }
    return out;
  }
  /* Walk the ancestors compositing their backgrounds. A gradient is not a
     single colour, so it comes back as its stops rather than a guess. */
  function backgroundOf(el, skipSelf) {
    let node = skipSelf ? el.parentElement : el;
    let acc = null;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      const c = parseColor(cs.backgroundColor);
      if (c && c.a > 0) {
        acc = acc ? over(acc, c) : c;
        if (acc.a >= 1) return { solid: acc };
      }
      if (cs.backgroundImage && cs.backgroundImage !== "none") {
        const stops = gradientStops(cs.backgroundImage);
        if (!stops.length) return null;
        return { gradient: stops, over: acc };
      }
      node = node.parentElement;
    }
    return { solid: acc || { r: 255, g: 255, b: 255, a: 1 } };
  }

  for (const el of document.querySelectorAll("body *")) {
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join("");
    if (!text) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    const need = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3 : 4.5;
    out.checked++;

    /* Text painted with a gradient: the visible colour is the gradient, not
       the `color` property, which is transparent. */
    const clip = cs.webkitBackgroundClip || cs.backgroundClip;
    if (clip === "text" && cs.backgroundImage && cs.backgroundImage !== "none") {
      const stops = gradientStops(cs.backgroundImage);
      const behind = backgroundOf(el, true);
      if (!stops.length || !behind || !behind.solid) continue;
      let worst = Infinity;
      for (const raw of stops) {
        const got = ratio(over(raw, behind.solid), behind.solid);
        if (got < worst) worst = got;
      }
      if (worst < need) {
        push("contrast", el, worst.toFixed(2) + ":1 at worst on gradient text — needs " + need + ":1");
      }
      continue;
    }

    const fg = parseColor(cs.color);
    if (!fg) continue;

    /* A transparent `color` means the text is painted by an ancestor that
       clips a gradient to its text. The visible colour is that gradient. */
    if (fg.a === 0) {
      let owner = el.parentElement;
      let found = null;
      while (owner && owner.nodeType === 1) {
        const ocs = getComputedStyle(owner);
        if ((ocs.webkitBackgroundClip || ocs.backgroundClip) === "text" &&
            ocs.backgroundImage && ocs.backgroundImage !== "none") {
          found = owner;
          break;
        }
        owner = owner.parentElement;
      }
      if (!found) continue;
      const stops = gradientStops(getComputedStyle(found).backgroundImage);
      const behind = backgroundOf(found, true);
      if (stops.length && behind && behind.solid) {
        let worst = Infinity;
        for (const raw of stops) {
          const got = ratio(over(raw, behind.solid), behind.solid);
          if (got < worst) worst = got;
        }
        if (worst < need) {
          push("contrast", el, worst.toFixed(2) + ":1 at worst on gradient text — needs " + need + ":1");
        }
      }
      continue;
    }

    const bg = backgroundOf(el);
    if (!bg) continue;

    if (bg.solid) {
      const got = ratio(over(fg, bg.solid), bg.solid);
      if (got < need) {
        push("contrast", el, got.toFixed(2) + ":1 on rgb(" +
          Math.round(bg.solid.r) + "," + Math.round(bg.solid.g) + "," + Math.round(bg.solid.b) +
          ") — needs " + need + ":1");
      }
      continue;
    }

    /* A gradient: the worst of its stops is the worst case, so the number
       below is a lower bound rather than a guess. */
    let worst = Infinity;
    let stop = null;
    for (const raw of bg.gradient) {
      const s = bg.over ? over(raw, bg.over) : raw;
      const got = ratio(over(fg, s), s);
      if (got < worst) { worst = got; stop = s; }
    }
    out.manual++;
    if (worst < need) {
      push("contrast", el, worst.toFixed(2) + ":1 at worst on a gradient (rgb(" +
        Math.round(stop.r) + "," + Math.round(stop.g) + "," + Math.round(stop.b) +
        ")) — needs " + need + ":1");
    }
  }

  return JSON.stringify(out);
})()
