/* Visual-regression capture for Machine Hunt.
 *
 *   python3 -m http.server 8099 --directory ..
 *   npm run shots -- http://localhost:8099/lego-horizon-pwa/
 *
 * Writes four baseline screenshots into screens/qa/. A missing Chromium is a
 * clean skip, matching every other smoke tool in this repository.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "../../tools/cdp.mjs";

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = process.env.SHOTS_DIR || join(here, "screens", "qa");
const base = process.argv[2] || "http://localhost:8099/lego-horizon-pwa/";

const browser = await launch();
if (!browser) {
  console.log("SHOTS SKIPPED — no Chromium found.");
  process.exit(0);
}
await mkdir(outDir, { recursive: true });
const { cdp, sessionId } = browser;
await cdp.send("Page.enable", {}, sessionId);
await cdp.send("Runtime.enable", {}, sessionId);

const evaluate = async (expression) => {
  const result = await cdp.send(
    "Runtime.evaluate", { expression, returnByValue: true }, sessionId
  );
  return result.result?.value;
};

for (const [name, width, height] of [
  ["phone", 390, 844],
  ["tablet", 768, 1024],
]) {
  await cdp.send(
    "Emulation.setDeviceMetricsOverride",
    { width, height, deviceScaleFactor: 2, mobile: name === "phone" },
    sessionId
  );
  await cdp.send("Page.navigate", { url: base }, sessionId);
  await sleep(900);

  await evaluate("document.querySelector('.play-open').click()");
  await sleep(600);
  let shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
  await writeFile(join(outDir, `hub-${name}.png`), Buffer.from(shot.data, "base64"));

  await evaluate(
    "document.querySelector('#game-hub [data-action=\"mode\"][data-key=\"campaign\"]').click();" +
    "document.getElementById('tut-skip')?.click()"
  );
  await sleep(1400);
  shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
  await writeFile(join(outDir, `hunt-${name}.png`), Buffer.from(shot.data, "base64"));

  if (name === "phone") {
    await cdp.send("Page.navigate", { url: `${base}?biome=desert` }, sessionId);
    await sleep(800);
    await evaluate("document.querySelector('.play-open').click()");
    await sleep(400);
    await evaluate("document.querySelector('#game-hub [data-action=\"mode\"][data-key=\"campaign\"]').click();document.getElementById('tut-skip')?.click()");
    await sleep(1200);
    shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
    await writeFile(join(outDir, "hunt-desert-phone.png"), Buffer.from(shot.data, "base64"));
  }
  if (name === "phone") {
    await cdp.send("Page.navigate", { url: `${base}play/index.html` }, sessionId);
    await sleep(1500);
    await evaluate("document.querySelector('#game-hub [data-action=\"mode\"][data-key=\"campaign\"]')?.blur(); document.activeElement?.blur?.()");
    shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
    await writeFile(join(outDir, "play-phone.png"), Buffer.from(shot.data, "base64"));
  }
  console.log(`ok  screens/qa/hub-${name}.png, hunt-${name}.png`);
}

try {
  browser.close();
} catch {
  /* Chromium's temporary profile can still be releasing files on macOS. */
}
console.log("\nVisual baselines written. Commit them or diff them in CI.");
