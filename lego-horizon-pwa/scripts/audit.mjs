/* Browser-level PWA audit for the fan store and the standalone play app.
 * Skips cleanly when no Chromium is available, like other repo tools. */
import { launch, sleep } from "../../tools/cdp.mjs";

const base = process.argv[2] || "http://localhost:8099/lego-horizon-pwa/";
const browser = await launch();
if (!browser) {
  console.log("AUDIT SKIPPED — no Chromium found.");
  process.exit(0);
}
const { cdp, sessionId } = browser;
const send = (method, params) => cdp.send(method, params, sessionId);
await send("Page.enable", {});
await send("Runtime.enable", {});

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return result.result?.value;
};

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${detail === undefined ? "" : ` (${detail})`}`);
  if (!ok) failures++;
}

for (const [name, url] of [["store", base], ["play app", `${base}play/index.html`]]) {
  await send("Page.navigate", { url });
  await sleep(900);
  check(`${name}: manifest linked`, await evaluate("!!document.querySelector('link[rel=\"manifest\"]')"));
  check(`${name}: viewport meta`, await evaluate("!!document.querySelector('meta[name=\"viewport\"]')"));
  check(`${name}: apple touch icon`, await evaluate("!!document.querySelector('link[rel=\"apple-touch-icon\"]')"));
  check(`${name}: theme color`, await evaluate("!!document.querySelector('meta[name=\"theme-color\"]')"));
  const remote = await evaluate(`[...document.querySelectorAll('script[src],link[rel="stylesheet"],link[rel="icon"],link[rel="manifest"],link[rel="preload"],img[src]')]
    .filter(el => {
      const value = el.getAttribute('src') || el.getAttribute('href') || '';
      if (!/^https?:\\/\\//.test(value)) return false;
      try { return new URL(value).origin !== location.origin; } catch { return true; }
    }).length`);
  check(`${name}: no remote resources`, remote === 0, remote);
}

await send("Page.navigate", { url: base });
await sleep(700);
const sw = await evaluate(`navigator.serviceWorker.getRegistration().then(r => !!r)`);
check("store: service worker registered", sw === true);
try { browser.close(); } catch { /* macOS profile cleanup */ }
console.log(`\n${failures === 0 ? "PASS" : "FAIL"}  ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
