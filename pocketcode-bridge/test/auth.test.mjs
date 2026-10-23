import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../store.mjs";
import { Auth } from "../auth.mjs";

async function withStore(fn) {
  const dir = await mkdtemp(join(tmpdir(), "pocketcode-auth-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("pairs with a one-time code and verifies the hashed token", async () => {
  await withStore(async (dir) => {
    const store = new Store(dir);
    const auth = new Auth(store, { ttlMs: 60_000 });
    const { code } = auth.newCode();
    assert.throws(() => auth.pair("000000" === code ? "111111" : "000000", "phone"), /Wrong pairing code/);
    const { token, device } = auth.pair(code, "Test phone");
    assert.match(token, /^pc_/);
    assert.equal(device.name, "Test phone");
    const verified = auth.verify(token);
    assert.equal(verified.id, device.id);
    assert.equal(auth.verify("bad"), null);

    const reloaded = new Store(dir);
    assert.equal(new Auth(reloaded).verify(token).id, device.id);
    assert.equal(reloaded.listDevices().length, 1);
    assert.equal(reloaded.devicesFile.endsWith("devices.json"), true);
  });
});

test("expires codes and invalidates after too many attempts", async () => {
  await withStore(async (dir) => {
    const store = new Store(dir);
    const auth = new Auth(store, { ttlMs: 1, maxAttempts: 3 });
    auth.newCode();
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.throws(() => auth.pair("123456"), /expired/);

    const second = new Auth(store, { ttlMs: 60_000, maxAttempts: 3 });
    second.newCode();
    assert.throws(() => second.pair("000000"), /Wrong/);
    assert.throws(() => second.pair("000000"), /Wrong/);
    assert.throws(() => second.pair("000000"), /Too many/);
    assert.throws(() => second.pair("000000"), /No pairing code/);
  });
});

test("stores sessions with stable ordering and updates", async () => {
  await withStore(async (dir) => {
    const store = new Store(dir);
    const first = store.createSession({ title: "First", workspace: "/tmp" });
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = store.createSession({ title: "Second", workspace: "/tmp" });
    assert.equal(store.listSessions()[0].id, second.id);
    const updated = store.updateSession(first.id, { title: "Renamed" });
    assert.equal(updated.title, "Renamed");
    assert.equal(store.getSession("nope"), null);
    assert.equal(store.deleteSession(first.id), true);
    assert.equal(store.getSession(first.id), null);
  });
});
