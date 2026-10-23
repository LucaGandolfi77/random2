import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "../../tools/cdp.mjs";
import { createBridgeServer } from "../../pocketcode-bridge/server.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const pwaRoot = join(here, "..");
const fakePi = join(here, "..", "..", "pocketcode-bridge", "test", "fixtures", "fake-pi.mjs");

let failures = 0;
function ok(label, condition, detail = "") {
  if (condition) {
    console.log("  ok    " + label);
    return;
  }
  failures += 1;
  console.error("  FAIL  " + label + (detail ? " -> " + detail : ""));
}

async function main() {
  const browser = await launch();
  if (!browser) {
    console.log("  skip  no Chromium available");
    return;
  }
  const workspace = await mkdtemp(join(tmpdir(), "pocketcode-pwa-ws-"));
  const data = await mkdtemp(join(tmpdir(), "pocketcode-pwa-data-"));
  const bridge = await createBridgeServer({
    workspace,
    dataDir: data,
    host: "127.0.0.1",
    port: 0,
    webRoot: pwaRoot,
    piBin: process.execPath,
    piPrefixArgs: [fakePi],
    idleAfterMs: 60_000,
  });
  const page = browser;
  const { cdp, sessionId } = page;
  const errors = [];

  const send = (method, params = {}) => cdp.send(method, params, sessionId);
  await send("Runtime.enable");
  await send("Page.enable");
  cdp.on("Runtime.exceptionThrown", (params) => {
    errors.push(params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || "exception");
  });
  cdp.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error") {
      errors.push(params.args.map((arg) => arg.value || arg.description || "").join(" "));
    }
  });

  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result?.value;
  }

  async function waitFor(expression, label, timeout = 8000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      try {
        if (await evaluate(`Boolean(${expression})`)) return true;
      } catch {
        /* page may still be loading */
      }
      await sleep(120);
    }
    let debug = "";
    try {
      debug = await evaluate(`JSON.stringify({
        hash: location.hash,
        view: [...document.querySelectorAll('.screen')].filter((n) => !n.hidden).map((n) => n.dataset.screen),
        messages: document.querySelectorAll('#timeline .message').length,
        status: document.querySelector('#composerStatus')?.textContent,
        session: document.querySelector('#chatSessionTitle')?.textContent,
        body: document.body.innerText.slice(0, 500)
      })`);
    } catch {
      /* ignore */
    }
    throw new Error(`Timed out waiting for ${label}${debug ? " :: " + debug : ""}`);
  }

  async function waitForValue(expression, label, timeout = 8000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      try {
        if (await evaluate(expression)) return true;
      } catch {
        /* page may still be loading */
      }
      await sleep(120);
    }
    throw new Error(`Timed out waiting for ${label}`);
  }

  async function click(selector) {
    await evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`);
  }

  async function fill(selector, value) {
    await evaluate(`(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      node.value = ${JSON.stringify(value)};
      node.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
  }

  try {
    await send("Page.navigate", { url: bridge.url + "/" });
    await waitFor("document.documentElement.dataset.appReady === 'true'", "app boot");
    await waitFor("document.querySelector('#screen-connect:not([hidden])')", "connect screen");
    ok("PWA shell loads", true);
    await waitForValue(
      "navigator.serviceWorker.getRegistration().then((r) => Boolean(r?.active))",
      "service worker",
    );
    const shellCached = await evaluate("caches.match('./index.html').then(Boolean)");
    ok("service worker caches app shell", shellCached);

    await click("#demoButton");
    await waitFor("document.querySelector('#screen-sessions:not([hidden])')", "sessions screen");
    await waitFor("document.querySelectorAll('#sessionList .session-card').length > 0", "demo sessions");
    ok("demo lists sessions", true);
    await click("#sessionList .session-card");
    await waitFor("document.querySelector('#screen-chat:not([hidden])')", "chat screen");
    await waitFor("document.querySelectorAll('#timeline .message').length > 0", "demo history");
    ok("demo loads history", true);

    await fill("#promptInput", "please run the tests");
    await click("#sendButton");
    await waitFor("document.querySelector('.permission-card')", "demo permission");
    ok("demo asks for permission", true);
    await click(".permission-card .allow");
    await waitFor("document.body.innerText.includes('All 142 tests pass')", "demo reply", 12000);
    await waitFor("document.querySelector('.tool-card.completed')", "completed tool card");
    ok("demo streams tools and replies", true);

    await click("#modelButton");
    await waitFor("document.querySelectorAll('#sheetBody .picker-item').length > 0", "model picker");
    ok("model picker lists models", true);
    await click("#sheetBody .picker-item");
    await waitFor("document.querySelector('#modelLabel').textContent.length > 0", "selected model");
    ok("model can be selected", true);

    await send("Network.enable");
    await waitForValue("navigator.serviceWorker.controller !== null", "service worker control");
    await send("Network.emulateNetworkConditions", {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
    await send("Page.reload", {});
    await waitForValue("document.documentElement.dataset.appReady === 'true'", "offline app boot");
    const offlineShell = await evaluate(
      "Boolean(document.querySelector('.app') && document.querySelector('#screen-connect'))",
    );
    ok("app shell starts offline", offlineShell);
    await send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });

    await evaluate("localStorage.clear(); location.hash = '#/connect'; location.reload()");
    await waitFor("document.documentElement.dataset.appReady === 'true'", "app boot after reload");
    await waitFor("document.querySelector('#screen-connect:not([hidden])')", "connect screen after reload");
    await evaluate(`(() => {
      const select = document.querySelector('#connectKind');
      select.value = 'pi';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('#connectUrl').value = location.origin;
      document.querySelector('#connectUrl').dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#connectCode').value = ${JSON.stringify(bridge.pairing.code)};
    })()`);
    await click("#pairButton");
    await waitFor("document.querySelector('#connectToken').value.length > 0", "device token");
    ok("Pi pairing works", true);
    await click("#connectButton");
    await waitFor("document.querySelector('#screen-sessions:not([hidden])')", "Pi sessions screen");
    ok("Pi connection opens sessions", true);

    await click("#newSessionButton");
    await waitFor("document.querySelector('#screen-chat:not([hidden])')", "Pi chat screen");
    await fill("#promptInput", "please ask for approval");
    await click("#sendButton");
    await waitFor("document.querySelector('.permission-card')", "Pi permission", 10000);
    ok("Pi permission reaches the phone", true);
    await click(".permission-card .allow");
    await waitFor("document.body.innerText.includes('Tool finished.')", "Pi assistant reply", 12000);
    await waitFor("document.querySelector('.tool-card.completed')", "Pi completed tool");
    ok("Pi streams tools and replies", true);

    ok("no browser errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  } finally {
    try {
      page.close();
    } catch {
      /* ignore */
    }
    await bridge.close();
    await rm(workspace, { recursive: true, force: true });
    await rm(data, { recursive: true, force: true });
  }
}

main()
  .catch((error) => {
    failures += 1;
    console.error("  FAIL  smoke test crashed -> " + error.message);
  })
  .finally(() => {
    if (failures) {
      console.error(`\n${failures} smoke check(s) failed`);
      process.exit(1);
    }
    console.log("\nsmoke checks passed");
  });
