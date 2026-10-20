/*
 * portfolio · the CV — the print button.
 *
 * The button starts hidden and is revealed here, so a visitor without
 * JavaScript never sees a button that does nothing. Printing is the
 * browser's job, not ours: window.print() opens the same dialog a reader
 * would reach with Ctrl+P, and "Save as PDF" is one of its targets.
 */
(function () {
  "use strict";

  var btn = document.getElementById("print-btn");
  if (!btn) return;

  btn.hidden = false;
  btn.addEventListener("click", function () {
    window.print();
  });
})();
