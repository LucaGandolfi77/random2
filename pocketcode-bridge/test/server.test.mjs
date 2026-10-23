import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createBridgeServer } from "../server.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fakePi = join(here, "fixtures", "fake-pi.mjs");

async function withBridge(options, fn) {
  const root = await mkdtemp(join(tmpdir(), "pocketcode-workspace-"));
  const data = await mkdtemp(join(tmpdir(), "pocketcode-data-"));
  const bridge = await createBridgeServer({
    workspace: root,
    dataDir: data,
    host: "127.0.0.1",
    port: 0,
    piBin: process.execPath,
    piPrefixArgs: [fakePi],
    idleAfterMs: 30_000,
    ...options,
  });
  try {
    return await fn(bridge, { root, data });
  } finally {
    await bridge.close();
    await rm(root, { recursive: true, force: true });
    await rm(data, { recursive: true, force: true });
  }
}

function authHeaders(token, extra = {}) {
  return { authorization: `Bearer ${token}`, ...extra };
}

async function pair(bridge) {
  const response = await fetch(`${bridge.url}/api/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: bridge.pairing.code, deviceName: "Test phone" }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  return body.token;
}

async function collectSse(base, token, { after = 0, until, timeout = 5000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const events = [];
  try {
    const response = await fetch(`${base}/api/events?after=${after}`, {
      headers: authHeaders(token, { accept: "text/event-stream" }),
      signal: controller.signal,
    });
    assert.equal(response.status, 200);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index;
      while ((index = buffer.indexOf("\n\n")) >= 0) {
        const chunk = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          let event;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          events.push(event);
          if (until && until(event)) return events;
        }
      }
    }
  } catch (error) {
    if (error.name !== "AbortError") throw error;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
  if (until) throw new Error(`SSE stream ended before the expected event. Saw: ${events.map((e) => e.type).join(", ")}`);
  return events;
}

test("health is public and protected routes require a token", async () => {
  await withBridge({}, async (bridge) => {
    const health = await fetch(`${bridge.url}/api/health`);
    assert.equal(health.status, 200);
    const healthBody = await health.json();
    assert.equal(healthBody.ok, true);
    assert.equal(healthBody.authRequired, true);
    assert.ok(healthBody.workspace.name);

    const denied = await fetch(`${bridge.url}/api/sessions`);
    assert.equal(denied.status, 401);
    assert.equal((await denied.json()).error.code, "unauthorized");
  });
});

test("CORS only allows configured origins", async () => {
  await withBridge({ allowOrigins: ["https://phone.example"] }, async (bridge) => {
    const allowed = await fetch(`${bridge.url}/api/sessions`, {
      method: "OPTIONS",
      headers: {
        origin: "https://phone.example",
        "access-control-request-method": "GET",
        "access-control-request-headers": "authorization",
      },
    });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get("access-control-allow-origin"), "https://phone.example");
    assert.match(allowed.headers.get("access-control-allow-headers"), /authorization/);

    const denied = await fetch(`${bridge.url}/api/sessions`, {
      method: "OPTIONS",
      headers: { origin: "https://evil.example", "access-control-request-method": "GET" },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
  });
});

test("pairs, lists models, runs a prompt, and projects SSE events", async () => {
  await withBridge({}, async (bridge) => {
    const wrong = await fetch(`${bridge.url}/api/pair`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "000000" }),
    });
    assert.equal(wrong.status, 401);

    const token = await pair(bridge);
    const config = await fetch(`${bridge.url}/api/config`, { headers: authHeaders(token) });
    assert.equal(config.status, 200);
    assert.equal((await config.json()).device.name, "Test phone");

    const models = await fetch(`${bridge.url}/api/models`, { headers: authHeaders(token) });
    assert.equal(models.status, 200);
    const modelList = (await models.json()).models;
    assert.equal(modelList.length, 2);
    assert.equal(modelList[0].id, "fake-model");

    const created = await fetch(`${bridge.url}/api/sessions`, {
      method: "POST",
      headers: authHeaders(token, { "content-type": "application/json" }),
      body: JSON.stringify({}),
    });
    assert.equal(created.status, 201);
    const session = (await created.json()).session;

    const prompt = await fetch(`${bridge.url}/api/sessions/${session.id}/prompt`, {
      method: "POST",
      headers: authHeaders(token, { "content-type": "application/json" }),
      body: JSON.stringify({ text: "Run the test" }),
    });
    assert.equal(prompt.status, 202);
    assert.equal((await prompt.json()).accepted, true);

    const events = await collectSse(bridge.url, token, {
      after: 0,
      until: (event) => event.type === "session.idle" && event.sessionID === session.id,
    });
    assert.ok(events.some((event) => event.type === "session.status"));
    assert.ok(events.some((event) => event.type === "message.updated"));
    const completedTool = events.find(
      (event) =>
        event.type === "message.part.updated" &&
        event.sessionID === session.id &&
        event.properties.part.type === "tool" &&
        event.properties.part.state.status === "completed",
    );
    assert.ok(completedTool);
    assert.equal(completedTool.properties.part.state.output, "hi\n");

    const history = await fetch(`${bridge.url}/api/sessions/${session.id}/messages`, {
      headers: authHeaders(token),
    });
    assert.equal(history.status, 200);
    const snapshot = await history.json();
    const assistant = snapshot.messages.find((message) => message.info.role === "assistant");
    assert.ok(assistant.parts.some((part) => part.type === "text" && part.text.includes("Tool finished")));

    const list = await fetch(`${bridge.url}/api/sessions`, { headers: authHeaders(token) });
    const sessions = (await list.json()).sessions;
    assert.equal(sessions[0].title, "Run the test");
  });
});

test("maps Pi extension UI prompts to permission cards and replies", async () => {
  await withBridge({}, async (bridge) => {
    const token = await pair(bridge);
    const created = await fetch(`${bridge.url}/api/sessions`, {
      method: "POST",
      headers: authHeaders(token, { "content-type": "application/json" }),
      body: JSON.stringify({ title: "Approval test" }),
    });
    const session = (await created.json()).session;
    const startSeq = bridge.hub.seq;
    const prompt = await fetch(`${bridge.url}/api/sessions/${session.id}/prompt`, {
      method: "POST",
      headers: authHeaders(token, { "content-type": "application/json" }),
      body: JSON.stringify({ text: "Please ask for approval" }),
    });
    assert.equal(prompt.status, 202);
    const events = await collectSse(bridge.url, token, {
      after: startSeq,
      until: (event) => event.type === "permission.updated",
    });
    const permission = events.find((event) => event.type === "permission.updated");
    assert.equal(permission.properties.title, "Run a command?");

    const reply = await fetch(
      `${bridge.url}/api/sessions/${session.id}/extension-ui/${permission.properties.id}`,
      {
        method: "POST",
        headers: authHeaders(token, { "content-type": "application/json" }),
        body: JSON.stringify({ value: "Allow" }),
      },
    );
    assert.equal(reply.status, 200);
    const rest = await collectSse(bridge.url, token, {
      after: bridge.hub.seq,
      until: (event) => event.type === "session.idle",
      timeout: 5000,
    });
    assert.ok(rest.length > 0);
  });
});

test("serves the PWA shell and falls back to index for navigation", async () => {
  const webRoot = await mkdtemp(join(tmpdir(), "pocketcode-web-"));
  await writeFile(join(webRoot, "index.html"), "<!doctype html><title>PocketCode</title>");
  await writeFile(join(webRoot, "app.js"), "console.log('ok')");
  try {
    await withBridge({ webRoot }, async (bridge) => {
      const index = await fetch(bridge.url + "/");
      assert.equal(index.status, 200);
      assert.match(index.headers.get("content-type"), /text\/html/);
      assert.match(await index.text(), /PocketCode/);

      const navigation = await fetch(bridge.url + "/sessions/abc");
      assert.equal(navigation.status, 200);
      assert.match(await navigation.text(), /PocketCode/);

      const script = await fetch(bridge.url + "/app.js");
      assert.equal(script.status, 200);
      assert.match(script.headers.get("content-type"), /javascript/);

      const missing = await fetch(bridge.url + "/missing.js");
      assert.equal(missing.status, 404);
    });
  } finally {
    await rm(webRoot, { recursive: true, force: true });
  }
});
