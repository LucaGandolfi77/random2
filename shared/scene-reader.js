/*
 * random2 · shared scene reader for the Library story PWAs
 * ---------------------------------------------------------
 * One tiny no-dependency file shared by the classic book PWAs, so every
 * standalone "Act II" scene ships the same reader as the anthology:
 *
 *   <script src="../shared/scene-reader.js"></script>
 *   <script>
 *     LibraryScene.open({
 *       mount:    document.getElementById("scene"),
 *       title:    { en: "...", it: "..." },
 *       place:    { en: "...", it: "..." },
 *       backHref: "../anthology-pwa/",
 *       lines:    [{ s: "Name" | {en,it}, t: { en: "...", it: "..." } }, ...],
 *       choices:  [{ text: {en,it}, lines: [{s,t}, ...] }, ...],
 *       outro:    { en: "...", it: "..." }
 *     });
 *   </script>
 *
 * Lines advance by tap / click / Space / Enter / ArrowRight; Escape returns
 * to backHref. The language follows the anthology PWA's saved choice when
 * both share an origin (localStorage "anthology-state"), with an in-page
 * toggle that writes it back. Loaded as a plain script (no modules) so every
 * book stays a static site, like ../shared/arcade.js.
 */
(function () {
  "use strict";

  var STATE_KEY = "anthology-state";

  function readLang() {
    try {
      var s = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      return s && s.language === "it" ? "it" : "en";
    } catch (e) { return "en"; }
  }

  function writeLang(l) {
    try {
      var s = {};
      try { s = JSON.parse(localStorage.getItem(STATE_KEY) || "{}") || {}; } catch (e) {}
      s.language = l;
      localStorage.setItem(STATE_KEY, JSON.stringify(s));
    } catch (e) { /* private mode, etc. */ }
  }

  var lang = readLang();
  var D = null, idx = 0, phase = "lines", branch = null;

  function $(id) { return document.getElementById(id); }
  function txt(t) { if (t == null) return ""; return lang === "it" ? (t.it || t.en || "") : (t.en || t.it || ""); }
  function spk(s) { if (!s) return ""; return typeof s === "string" ? s : txt(s); }
  function label(k) {
    var L = {
      en: { hint: "▸ tap to continue", again: "↻ Read the scene again",
            back: "← Return to the Library", langBtn: "Lingua: Italiano" },
      it: { hint: "▸ tocca per continuare", again: "↻ Rileggi la scena",
            back: "← Ritorna alla Biblioteca", langBtn: "Language: English" }
    };
    return L[lang][k];
  }

  var CSS = [
    ".ls-reader{max-width:820px;margin:0 auto;font-family:Georgia,'Cormorant Garamond',serif;}",
    ".ls-head{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;flex-wrap:wrap;border-bottom:1px solid rgba(201,184,168,0.12);padding-bottom:0.7rem;margin-bottom:1.3rem;}",
    ".ls-title{font-size:1.3rem;color:#c9b8a8;letter-spacing:0.08em;}",
    ".ls-place{font-size:0.8rem;color:#8a7862;font-style:italic;letter-spacing:0.12em;margin-top:0.15rem;}",
    ".ls-lang{background:rgba(15,6,18,0.5);border:1px solid rgba(201,184,168,0.18);border-radius:4px;color:#8a7b65;font-family:Georgia,serif;font-size:0.72rem;letter-spacing:0.1em;padding:0.3rem 0.6rem;cursor:pointer;transition:all .25s;}",
    ".ls-lang:hover{border-color:rgba(201,184,168,0.35);color:#b8a898;}",
    ".ls-stage{background:rgba(15,6,18,0.72);border:1px solid rgba(201,184,168,0.14);border-radius:14px;padding:1.7rem 1.6rem;min-height:210px;cursor:pointer;position:relative;}",
    ".ls-speaker{font-size:0.75rem;color:#bfa07a;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:0.7rem;opacity:0.9;}",
    ".ls-text{font-size:1.1rem;color:#d8c8b2;line-height:1.75;letter-spacing:0.03em;}",
    ".ls-text.ls-in{animation:lsIn .5s ease both;}",
    "@keyframes lsIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}",
    ".ls-hint{position:absolute;right:1.1rem;bottom:0.8rem;color:#8a7862;font-size:0.7rem;letter-spacing:0.12em;animation:lsPulse 1.8s ease-in-out infinite;}",
    "@keyframes lsPulse{0%,100%{opacity:.35;}50%{opacity:.9;}}",
    ".ls-choices{margin-top:1.1rem;display:flex;flex-direction:column;gap:0.6rem;}",
    ".ls-choices.ls-hidden,.ls-end.ls-hidden{display:none;}",
    ".ls-choice{background:rgba(201,184,168,0.06);border:1px solid rgba(201,184,168,0.22);color:#c9b8a8;font-family:Georgia,serif;font-size:0.98rem;letter-spacing:0.04em;padding:0.8rem 1.1rem;border-radius:8px;cursor:pointer;text-align:left;transition:all .25s;}",
    ".ls-choice:hover{background:rgba(201,184,168,0.14);border-color:rgba(218,165,120,0.5);color:#e6d2b4;}",
    ".ls-end{margin-top:1.1rem;background:rgba(20,10,24,0.6);border:1px solid rgba(218,165,120,0.25);border-radius:12px;padding:1.4rem 1.5rem;text-align:center;}",
    ".ls-end p{font-style:italic;color:#b8a48c;line-height:1.7;margin:0 0 1.2rem;}",
    ".ls-btn{display:block;max-width:360px;margin:0.35rem auto;padding:0.7rem 1.2rem;background:rgba(201,184,168,0.08);border:1px solid rgba(201,184,168,0.25);color:#c9b8a8;border-radius:6px;font-family:Georgia,serif;font-size:0.92rem;letter-spacing:0.06em;cursor:pointer;text-decoration:none;transition:all .25s;text-align:center;}",
    ".ls-btn:hover{background:rgba(201,184,168,0.16);border-color:rgba(218,165,120,0.5);color:#e6d2b4;}"
  ].join("\n");

  function ensureStyles() {
    if ($("ls-style")) return;
    var st = document.createElement("style");
    st.id = "ls-style";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function buildDOM(mount) {
    mount.innerHTML =
      '<div class="ls-reader">' +
        '<div class="ls-head">' +
          '<div><div class="ls-title" id="ls-title"></div><div class="ls-place" id="ls-place"></div></div>' +
          '<button class="ls-lang" id="ls-lang" type="button"></button>' +
        '</div>' +
        '<div class="ls-stage" id="ls-stage">' +
          '<div class="ls-speaker" id="ls-speaker"></div>' +
          '<div class="ls-text" id="ls-text"></div>' +
          '<div class="ls-hint" id="ls-hint"></div>' +
        '</div>' +
        '<div class="ls-choices ls-hidden" id="ls-choices"></div>' +
        '<div class="ls-end ls-hidden" id="ls-end">' +
          '<p class="ls-outro" id="ls-outro"></p>' +
          '<a class="ls-btn" id="ls-back" href="#"></a>' +
          '<button class="ls-btn" id="ls-again" type="button"></button>' +
        '</div>' +
      '</div>';
    $("ls-stage").addEventListener("click", advance);
    $("ls-lang").addEventListener("click", function () {
      lang = lang === "en" ? "it" : "en";
      writeLang(lang);
      render();
    });
    $("ls-again").addEventListener("click", function () {
      idx = 0; phase = "lines"; branch = null;
      $("ls-end").classList.add("ls-hidden");
      $("ls-choices").classList.add("ls-hidden");
      $("ls-stage").classList.remove("ls-hidden");
      render();
    });
    $("ls-back").addEventListener("click", function () { window.location.href = D.backHref; });
    document.addEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (!D) return;
    if (e.key === "Escape") { window.location.href = D.backHref; return; }
    if (e.target && /BUTTON|A|INPUT|TEXTAREA/.test(e.target.tagName || "")) return;
    if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
      e.preventDefault();
      advance();
    }
  }

  function currentLines() {
    return (phase === "branch" && branch) ? branch.lines : D.lines;
  }

  function render() {
    if (!D) return;
    $("ls-title").textContent = txt(D.title);
    $("ls-place").textContent = txt(D.place || "");
    $("ls-lang").textContent = label("langBtn");
    if (phase === "choices") { renderChoices(); return; }
    if (phase === "end") { renderEnd(); return; }
    var arr = currentLines();
    var line = arr[idx];
    if (!line) { advance(); return; }
    $("ls-speaker").textContent = spk(line.s);
    var tx = $("ls-text");
    tx.classList.remove("ls-in"); void tx.offsetWidth; tx.classList.add("ls-in");
    tx.textContent = txt(line.t);
    var hint = $("ls-hint");
    hint.textContent = label("hint");
    hint.style.visibility = (phase === "branch" && idx >= arr.length - 1) ? "hidden" : "visible";
  }

  function renderChoices() {
    var box = $("ls-choices");
    box.innerHTML = "";
    D.choices.forEach(function (c, i) {
      var b = document.createElement("button");
      b.className = "ls-choice";
      b.type = "button";
      b.textContent = txt(c.text);
      b.addEventListener("click", function (ev) { ev.stopPropagation(); choose(i); });
      box.appendChild(b);
    });
    box.classList.remove("ls-hidden");
    $("ls-stage").classList.add("ls-hidden");
    $("ls-end").classList.add("ls-hidden");
  }

  function choose(i) {
    var c = D.choices[i];
    if (!c) return;
    branch = c; idx = 0; phase = "branch";
    $("ls-choices").classList.add("ls-hidden");
    $("ls-stage").classList.remove("ls-hidden");
    render();
  }

  function renderEnd() {
    $("ls-stage").classList.add("ls-hidden");
    $("ls-choices").classList.add("ls-hidden");
    $("ls-outro").textContent = D.outro ? txt(D.outro) : "";
    $("ls-back").textContent = label("back");
    $("ls-back").setAttribute("href", D.backHref);
    $("ls-again").textContent = label("again");
    $("ls-end").classList.remove("ls-hidden");
  }

  function advance() {
    if (!D) return;
    if (phase === "choices" || phase === "end") return;
    var arr = currentLines();
    if (idx < arr.length - 1) { idx++; render(); return; }
    if (phase === "lines") { phase = "choices"; renderChoices(); return; }
    phase = "end";
    renderEnd();
  }

  window.LibraryScene = {
    open: function (opts) {
      if (!opts || !opts.lines || !opts.lines.length) return;
      D = opts;
      idx = 0; phase = "lines"; branch = null;
      lang = readLang();
      ensureStyles();
      buildDOM(typeof opts.mount === "string" ? $(opts.mount) : (opts.mount || document.body));
      render();
    }
  };
})();
