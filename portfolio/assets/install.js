/*
 * portfolio · the install button.
 *
 * The page is a PWA: it has a manifest, a service worker and SVG icons. What
 * it did not have was a way to install it. The browser's install prompt
 * fires beforeinstallprompt, and only when it is going to work: iOS has no
 * such event, and a button that leads nowhere is worse than no button.
 *
 * So the button starts hidden and is revealed only when the browser has
 * actually said it can install. Everything else here is the same rule the
 * rest of the page follows: no dead controls.
 */
(function () {
  "use strict";

  var btn = document.getElementById("install-btn");
  if (!btn) return;

  var deferred = null;

  window.addEventListener("beforeinstallprompt", function (e) {
    /* The browser is offering to install: keep the event, show the button. */
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });

  btn.addEventListener("click", function () {
    if (!deferred) {
      btn.hidden = true;
      return;
    }
    deferred.prompt();
    deferred.userChoice.then(function (choice) {
      /* Whether it was accepted or dismissed, the offer is spent. */
      deferred = null;
      btn.hidden = true;
      if (choice && choice.outcome === "accepted") {
        btn.setAttribute("data-installed", "yes");
      }
    });
  });

  window.addEventListener("appinstalled", function () {
    deferred = null;
    btn.hidden = true;
  });
})();
