/*
 * Headless smoke test for the LEGO Horizon fan store.
 *
 *   python3 -m http.server 8099 --directory .
 *   node lego-horizon-pwa/smoke.mjs http://localhost:8099/lego-horizon-pwa/
 *
 * Drives the real page at a 390x844 mobile viewport through the DevTools
 * protocol: gallery, wishlist, cart, demo checkout and an offline reload.
 * A missing Chromium prints SKIP and exits 0, like the other repo smokes.
 */
import { launch, sleep } from "../tools/cdp.mjs";
import { project, resetCameraToView } from "./game/projection.js";

const url = process.argv[2] || "http://localhost:8099/lego-horizon-pwa/";
const browser = await launch();
if (!browser) {
  console.log("SMOKE SKIPPED — no Chromium found.");
  process.exit(0);
}

const { cdp, sessionId } = browser;
let checks = 0;
let failures = 0;
const errors = [];

function ok(condition, label, extra) {
  checks += 1;
  if (condition) {
    console.log("  ok   " + label);
  } else {
    failures += 1;
    console.log("  FAIL " + label + (extra === undefined ? "" : "  (" + extra + ")"));
  }
}

async function evaluate(expression) {
  const result = await cdp.send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    sessionId
  );
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        "evaluation failed"
    );
  }
  return result.result?.value;
}

async function waitFor(expression, timeout = 6000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      if (await evaluate(expression)) return true;
    } catch {
      /* page still navigating */
    }
    await sleep(80);
  }
  return false;
}

const click = (selector) =>
  evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);

cdp.on("Runtime.exceptionThrown", (params) => {
  errors.push(
    params.exceptionDetails?.exception?.description ||
      params.exceptionDetails?.text ||
      "uncaught exception"
  );
});
cdp.on("Runtime.consoleAPICalled", (params) => {
  if (params.type === "error") {
    errors.push(params.args.map((arg) => arg.value || arg.description).join(" "));
  }
});

await cdp.send("Page.enable", {}, sessionId);
await cdp.send("Runtime.enable", {}, sessionId);
await cdp.send("Network.enable", {}, sessionId);
await cdp.send(
  "Emulation.setDeviceMetricsOverride",
  { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  sessionId
);

await cdp.send("Page.navigate", { url }, sessionId);
ok(await waitFor("document.readyState === 'complete'"), "the page loads");
ok(
  (await evaluate("document.title")).includes("LEGO® Horizon Adventures"),
  "the store title is set"
);
ok(await evaluate("document.querySelectorAll('[data-lang]').length === 25"), "25 languages listed");

const layout = await evaluate(`(() => ({
  width: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  hero: document.getElementById('hero-img')?.naturalWidth || 0,
  buybar: !!document.getElementById('buybar')
}))()`);
ok(layout.scrollWidth <= layout.width + 1, "no horizontal overflow on a phone", layout.scrollWidth);
ok(layout.hero > 0, "the hero concept art rendered", layout.hero);
ok(layout.buybar, "the sticky purchase bar exists");

/* gallery */
await click("#hero-gallery-btn");
ok(await evaluate("document.getElementById('gallery-dialog').open"), "the gallery opens from the hero");
ok(await evaluate("document.getElementById('lb-counter').textContent.trim() === '1 / 7'"), "gallery starts at image 1");
await click("#lb-next");
ok(await evaluate("document.getElementById('lb-counter').textContent.trim() === '2 / 7'"), "next arrow advances");
await evaluate("document.querySelector('#gallery-dialog [data-close]').click()");
ok(await evaluate("!document.getElementById('gallery-dialog').open"), "the gallery closes");

/* tags */
await click("#tags-toggle");
ok(
  await evaluate("document.querySelectorAll('.tag.extra').length === 10 && [...document.querySelectorAll('.tag.extra')].every(t => getComputedStyle(t).display !== 'none')"),
  "show all reveals the remaining tags"
);

/* wishlist */
await click("#wish-btn");
ok(
  await evaluate("document.getElementById('wish-btn').getAttribute('aria-pressed') === 'true'"),
  "wishlist toggles on"
);
ok(
  await evaluate("JSON.parse(localStorage.getItem('lego-horizon-store-v1')).wishlist === true"),
  "wishlist is persisted"
);

/* cart */
await click("#buy-cta");
ok(await evaluate("document.getElementById('buy-dialog').open"), "the edition picker opens");
await evaluate("document.querySelector('.choice[data-choice=\"deluxe\"]').click()");
ok(await evaluate("document.getElementById('cart-badge').textContent === '1'"), "cart badge counts the bundle");
ok(await evaluate("document.getElementById('cart-total').textContent === '49,99€'"), "cart total is the bundle price");
await click("#cart-btn");
ok(await evaluate("document.getElementById('cart-dialog').open"), "the cart sheet opens");
ok(
  await evaluate("document.querySelectorAll('#cart-items .cart-row').length === 1"),
  "the cart lists one edition"
);
await click("#checkout-btn");
ok(await evaluate("document.getElementById('cart-badge').hidden"), "demo checkout empties the cart");
ok(
  await evaluate("JSON.parse(localStorage.getItem('lego-horizon-store-v1')).wishlist === true"),
  "checkout keeps the wishlist"
);

/* playable demo */
ok(await evaluate("document.querySelectorAll('[data-play]').length >= 3"), "play buttons are present");
await click(".play-open");
ok(await waitFor("!document.getElementById('game-layer').hidden"), "the playable demo opens");
ok(await evaluate("document.getElementById('game-hub').hidden === false"), "the village hub is shown");
ok(await evaluate("!!document.querySelector('#game-hub [data-action=\"mode\"][data-key=\"daily\"]')"), "the daily hunt button exists");
ok(await evaluate("document.querySelectorAll('#game-hub [data-action=\"mode\"]').length === 4"), "the world map lists four modes");
ok(await evaluate("!!document.querySelector('#game-hub [data-action=\"skill\"][data-key=\"combat\"]')"), "the skill tree is shown");
ok(await evaluate("!!document.querySelector('#game-hub [data-action=\"craft\"]')"), "the crafting bench is shown");
ok(await evaluate("!!document.querySelector('#game-hub [data-action=\"party\"]')"), "companion slots are shown");
ok(await evaluate("!!document.querySelector('#game-hub .season-banner')"), "the daily season banner is shown");
ok(await evaluate("!!document.querySelector('#game-hub [data-action=\"job\"]')"), "villager jobs are shown");
ok(await evaluate("!!document.getElementById('game-story')"), "the story dialog exists");
ok(await evaluate("!!document.querySelector('#game-hub [data-action=\"challenge\"]')"), "challenge codes are available");
ok(await evaluate("!!document.querySelector('#game-hub [data-action=\"lang\"]')"), "the language toggle is available");
ok(
  await evaluate("document.getElementById('game-hub').textContent.includes('Achievements')"),
  "the achievement list is shown"
);
ok(await evaluate("!!document.querySelector('#game-hub .bounty-bar')"), "the community bounty is shown");
resetCameraToView();
const aloy = project(150, 158, 0);
await evaluate(`(() => {
  const c = document.getElementById('game-canvas');
  const r = c.getBoundingClientRect();
  const scale = Math.min(r.width / 600, r.height / 1080);
  const oy = (r.height - 1080 * scale) / 2;
  const opts = {
    clientX: r.left + ${aloy.x.toFixed(2)} * scale,
    clientY: r.top + oy + ${(aloy.y - 36 * aloy.scale).toFixed(2)} * scale,
    pointerId: 7, bubbles: true
  };
  c.dispatchEvent(new PointerEvent('pointerdown', opts));
  c.dispatchEvent(new PointerEvent('pointerup', opts));
})()`);
ok(await evaluate("document.getElementById('game-toast').textContent.includes('Aloy')"), "tapping a villager starts a dialogue");
await evaluate("document.querySelector('#game-hub [data-action=\"scheme\"][data-key=\"stick\"]').click()");
ok(await evaluate("!document.getElementById('game-stick').hidden"), "stick controls appear when selected");
await evaluate("document.querySelector('#game-hub [data-action=\"scheme\"][data-key=\"drag\"]').click()");
ok(await evaluate("document.getElementById('game-stick').hidden"), "drag scheme hides the stick");
await evaluate("document.querySelector('#game-hub [data-action=\"mode\"][data-key=\"campaign\"]').click()");
ok(await waitFor("document.getElementById('game-hub').hidden === true"), "starting a hunt hides the hub");
ok(
  await evaluate("document.getElementById('game-biome').textContent.length > 0"),
  "the hunt shows its biome"
);
ok(await evaluate("!document.getElementById('game-tutorial').hidden"), "the first-run tutorial appears");
await click("#tut-skip");
ok(await evaluate("document.getElementById('game-tutorial').hidden"), "the tutorial can be skipped");
await sleep(1200);
ok(
  await evaluate(`(() => {
    const c = document.getElementById('game-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 10) lit++;
    return lit > 500;
  })()`),
  "the game canvas is painted"
);
await evaluate("document.querySelector('[data-weapon=\"spear\"]').click()");
await sleep(120);
ok(
  await evaluate("document.querySelector('[data-weapon=\"spear\"]').classList.contains('is-active')"),
  "weapon swapping updates the combat HUD"
);
await evaluate("window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', bubbles: true }))");
await sleep(120);
ok(
  await evaluate("parseFloat(document.getElementById('stamina-bar').style.width) < 100"),
  "dodging spends stamina"
);
await click("#game-pause-btn");
ok(await evaluate("!document.getElementById('game-pause').hidden"), "the pause panel opens");
await click("#pause-settings");
ok(await evaluate("!document.getElementById('game-settings').hidden"), "settings open from pause");
await evaluate("document.querySelector('#game-settings [data-setting=\"music\"]').click()");
await click("#settings-close");
ok(await evaluate("document.getElementById('game-settings').hidden"), "settings close cleanly");
await click("#game-pause-btn");
await click("#pause-resume");
ok(await evaluate("document.getElementById('game-pause').hidden"), "pausing resumes the hunt");
await click("#game-exit-btn");
ok(await waitFor("document.getElementById('game-layer').hidden"), "the game returns to the store");

/* offline */
const swReady = await waitFor(
  "navigator.serviceWorker && navigator.serviceWorker.controller !== null",
  9000
);
if (swReady) {
  await cdp.send(
    "Network.emulateNetworkConditions",
    { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
    sessionId
  );
  await cdp.send("Page.reload", {}, sessionId);
  await sleep(800);
  ok(
    await waitFor("document.title.includes('LEGO® Horizon Adventures')", 6000),
    "the store boots offline through its service worker"
  );
  ok(
    await evaluate("document.querySelectorAll('[data-lang]').length === 25"),
    "offline copy still has all content"
  );
  await click(".play-open");
  ok(await waitFor("!document.getElementById('game-layer').hidden"), "the game opens offline");
  await click("#game-hub [data-action='mode'][data-key='campaign']");
  await sleep(800);
  ok(
    await evaluate(`(() => {
      const c = document.getElementById('game-canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 10) lit++;
      return lit > 500;
    })()`),
    "the game renders offline"
  );
  await click("#game-exit-btn");
  await cdp.send(
    "Network.emulateNetworkConditions",
    { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
    sessionId
  );
} else {
  ok(false, "the service worker takes control of the page");
}

ok(errors.length === 0, "no uncaught errors or console errors", errors.slice(0, 3).join(" | "));

console.log("\n" + (checks - failures) + "/" + checks + " checks passed.");
try {
  browser.close();
} catch {
  /* temporary profile can still be releasing files on macOS */
}
process.exit(failures === 0 ? 0 : 1);
