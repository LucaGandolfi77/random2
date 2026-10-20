/*
 * portfolio · the claims ledger — copy buttons.
 *
 * The command in every row is plain text in a <pre><code>, so it can be
 * selected and read with JavaScript switched off. The button is an
 * enhancement on top of that: it starts hidden and is revealed here, so a
 * visitor without JavaScript never sees a button that does nothing.
 */
(function () {
  "use strict";

  var buttons = document.querySelectorAll("[data-copy]");
  if (!buttons.length) return;

  Array.prototype.forEach.call(buttons, function (btn) {
    btn.hidden = false;
    btn.addEventListener("click", function () {
      var cell = btn.closest("td");
      var code = cell && cell.querySelector("code");
      if (!code) return;
      var text = code.textContent;

      var done = function () {
        btn.textContent = "Copied";
        btn.classList.add("done");
        window.setTimeout(function () {
          btn.textContent = "Copy";
          btn.classList.remove("done");
        }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {
          /* Clipboard API refused (no permission, insecure context): fall
             back to selecting the text so the reader can copy it by hand. */
          var range = document.createRange();
          range.selectNodeContents(code);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        });
        return;
      }

      var range = document.createRange();
      range.selectNodeContents(code);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
  });
})();
