/*
 * Everything below is progressive enhancement. With JavaScript off the page
 * is still complete and readable: the markup carries both languages and CSS
 * shows the English one, so the only things lost are the remembered
 * preferences.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var LANG_KEY = "portfolio-lang";
  var THEME_KEY = "portfolio-theme";

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  /* ---- Language ----
     English is the default because it is what the markup contains; the
     toggle only ever switches away from it and back. */
  var lang = read(LANG_KEY);
  if (!lang) {
    var nav = (navigator.language || "en").toLowerCase();
    lang = nav.indexOf("it") === 0 ? "it" : "en";
  }

  function setLang(next) {
    lang = next;
    root.setAttribute("data-lang", next);
    /* Keep the document language honest so screen readers switch voice
       rather than reading Italian with an English pronunciation. */
    root.setAttribute("lang", next);
    store(LANG_KEY, next);
    var btn = document.getElementById("lang-btn");
    btn.setAttribute("aria-label", next === "it" ? "Passa all'italiano" : "Switch to Italian");
  }

  document.getElementById("lang-btn").addEventListener("click", function () {
    setLang(lang === "it" ? "en" : "it");
  });
  setLang(lang);

  /* ---- Theme ---- */
  var theme = read(THEME_KEY);
  if (theme !== "light") theme = "dark";

  function setTheme(next) {
    theme = next;
    root.setAttribute("data-theme", next);
    store(THEME_KEY, next);
    document.getElementById("theme-label-en").textContent = next === "dark" ? "Light" : "Dark";
    document.getElementById("theme-label-it").textContent = next === "dark" ? "Chiaro" : "Scuro";
    document.getElementById("theme-btn").setAttribute(
      "aria-label", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }

  document.getElementById("theme-btn").addEventListener("click", function () {
    setTheme(theme === "dark" ? "light" : "dark");
  });
  setTheme(theme);

  /* ---- Top bar hairline, only once the page has actually scrolled ---- */
  var bar = document.getElementById("topbar");
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      bar.classList.toggle("stuck", window.scrollY > 8);
      ticking = false;
    });
  }, { passive: true });

  /* ---- Contact links ----
     The email and LinkedIn buttons ship hidden because the details are not
     filled in yet. If one still has its placeholder href, keep it hidden
     rather than shipping a link that goes nowhere. */
  var EMPTY = "#";
  Array.prototype.forEach.call(document.querySelectorAll("[data-fill]"), function (a) {
    if (!a.getAttribute("href") || a.getAttribute("href") === EMPTY) {
      a.hidden = true;
    } else {
      a.removeAttribute("data-fill");
    }
  });

  /* ---- Offline ----
     The page is a PWA: it has a manifest and it should have a service
     worker behind it. The worker used to be pulled in with a plain
     <script src="service-worker.js">, which does nothing at all — a
     worker is not a script, it has to be registered. */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(function () {
      /* Private mode, or a file:// URL: not worth breaking the page over. */
    });
  }
})();
