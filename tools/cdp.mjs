/*
 * tools/cdp.mjs — a DevTools Protocol client with no dependencies.
 *
 * One promise-per-id client over Node's built-in WebSocket. Flat sessions
 * are used, so every message from a page carries the same sessionId and the
 * routing stays trivial.
 *
 * It lives here rather than inside portfolio/scripts/shots.mjs because three
 * tools need it: the screenshot generator, the accessibility audit and the
 * performance audit. One client, one place to fix it.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* Playwright's cache is the usual place a Chromium already exists on a
   developer machine. Chrome is the fallback so the script works without it. */
export function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;

  const home = process.env.HOME || "";
  for (const cache of [
    join(home, "Library/Caches/ms-playwright"),   // macOS
    join(home, ".cache/ms-playwright"),            // Linux
    join(home, "AppData/Local/ms-playwright"),    // Windows
  ]) {
    if (!existsSync(cache)) continue;
    for (const dir of readdirSync(cache).sort().reverse()) {
      if (!dir.startsWith("chromium")) continue;
      for (const rel of [
        "chrome-headless-shell-mac-arm64/chrome-headless-shell",
        "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
        "chrome-headless-shell-linux64/chrome-headless-shell",
        "chrome-linux64/chrome",
        "chrome-win/chrome.exe",
      ]) {
        const p = join(cache, dir, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  for (const p of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ]) {
    if (existsSync(p)) return p;
  }
  return null;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function connect(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  const waiters = new Map();
  let id = 0;

  const ready = new Promise((res, rej) => {
    ws.addEventListener("open", () => res());
    ws.addEventListener("error", (e) => rej(new Error("devtools socket failed: " + e.message)));
  });

  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined) {
      const slot = pending.get(msg.id);
      if (!slot) return;
      pending.delete(msg.id);
      if (msg.error) slot.reject(new Error(msg.error.message));
      else slot.resolve(msg.result);
      return;
    }
    const list = waiters.get(msg.method);
    if (!list) return;
    /* A one-shot listener is dropped after it fires; a persistent one stays. */
    const keep = [];
    for (const entry of list) {
      entry.fn(msg.params);
      if (!entry.once) keep.push(entry);
    }
    waiters.set(msg.method, keep);
  });

  const send = (method, params = {}, sessionId) => {
    const mid = ++id;
    return new Promise((resolve, reject) => {
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
    });
  };

  /* A persistent listener, for the events that arrive many times. */
  const on = (method, fn, once = false) => {
    const list = waiters.get(method) || [];
    list.push({ fn, once });
    waiters.set(method, list);
  };

  const once = (method) => new Promise((resolve) => on(method, resolve, true));

  return { ready, send, once, on, close: () => ws.close() };
}

/* Start a headless Chromium and attach to a fresh page. Returns null when
   there is no browser: every caller has to be able to skip cleanly rather
   than fail, because a missing Chromium must never be the reason a build
   goes red. */
export async function launch(options = {}) {
  const bin = options.bin || findChromium();
  if (!bin) return null;

  const profile = mkdtempSync(join(tmpdir(), "r2-cdp-"));
  const child = spawn(
    bin,
    [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--autoplay-policy=no-user-gesture-required",
      "--mute-audio",
      "--remote-debugging-port=0",
      "--user-data-dir=" + profile,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );

  /* Chromium prints the DevTools endpoint on stderr once it is listening. */
  const wsURL = await new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => reject(new Error("no devtools endpoint")), 20000);
    child.stderr.on("data", (d) => {
      buf += d.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1].trim());
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("browser exited early (" + code + ")\n" + buf.slice(-400)));
    });
  });

  const cdp = connect(wsURL);
  await cdp.ready;

  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

  return {
    cdp,
    sessionId,
    close() {
      cdp.close();
      child.kill();
      rmSync(profile, { recursive: true, force: true });
    },
  };
}
