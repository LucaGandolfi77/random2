import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../cli.mjs";

test("parses bridge flags", () => {
  const options = parseArgs([
    "--workspace",
    "/tmp/work",
    "--port",
    "5000",
    "--host",
    "0.0.0.0",
    "--allow-origin",
    "https://one.example",
    "--allow-origin",
    "https://two.example",
    "--pi-bin",
    "npx",
    "--pi-arg",
    "-y",
    "--pi-arg",
    "@mariozechner/pi",
    "--idle-minutes",
    "2",
    "--pair-ttl-minutes",
    "1",
  ]);
  assert.equal(options.workspace, "/tmp/work");
  assert.equal(options.port, 5000);
  assert.equal(options.host, "0.0.0.0");
  assert.deepEqual(options.allowOrigins, ["https://one.example", "https://two.example"]);
  assert.equal(options.piBin, "npx");
  assert.deepEqual(options.piArgs, ["-y", "@mariozechner/pi"]);
  assert.equal(options.idleMinutes, 2);
  assert.equal(options.pairTtlMinutes, 1);
});

test("rejects bad values", () => {
  assert.throws(() => parseArgs(["--port", "nope"]), /--port/);
  assert.throws(() => parseArgs(["--idle-minutes", "-1"]), /--idle-minutes/);
  assert.throws(() => parseArgs(["--unknown"]), /Unknown argument/);
  assert.throws(() => parseArgs(["--workspace"]), /requires a value/);
});
