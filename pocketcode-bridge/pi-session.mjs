import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import { PiProjection } from "./projection.mjs";

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export class PiSession extends EventEmitter {
  constructor({
    sessionID,
    cwd,
    bin = process.env.PI_BIN || "pi",
    prefixArgs = [],
    args = [],
    env = process.env,
    noSession = false,
    idleAfterMs = 10 * 60 * 1000,
  } = {}) {
    super();
    this.sessionID = sessionID;
    this.cwd = cwd;
    this.bin = bin;
    this.prefixArgs = prefixArgs;
    this.args = args;
    this.env = env;
    this.noSession = noSession;
    this.idleAfterMs = idleAfterMs;
    this.proc = null;
    this.decoder = new StringDecoder("utf8");
    this.buffer = "";
    this.pending = new Map();
    this.stderr = [];
    this.projection = new PiProjection(sessionID);
    this.busy = false;
    this.everStarted = false;
    this.lastActivity = Date.now();
  }

  get alive() {
    return Boolean(this.proc && !this.proc.killed && this.proc.exitCode === null);
  }

  async start({ timeout = 20000 } = {}) {
    if (this.alive) return this;
    const args = [...this.prefixArgs, "--mode", "rpc"];
    if (this.noSession) {
      args.push("--no-session");
    } else {
      args.push("--session-id", this.sessionID);
    }
    args.push(...this.args);
    this.proc = spawn(this.bin, args, {
      cwd: this.cwd,
      env: this.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.proc.stdout.on("data", (chunk) => this._onStdout(chunk));
    this.proc.stderr.on("data", (chunk) => this._onStderr(chunk));
    this.proc.on("error", (error) => this._fail(error));
    this.proc.on("exit", (code, signal) => this._onExit(code, signal));
    this.everStarted = true;
    await withTimeout(
      new Promise((resolve, reject) => {
        const onSpawn = () => {
          cleanup();
          resolve();
        };
        const onError = (error) => {
          cleanup();
          reject(error);
        };
        const cleanup = () => {
          this.proc?.off("spawn", onSpawn);
          this.proc?.off("error", onError);
        };
        this.proc.once("spawn", onSpawn);
        this.proc.once("error", onError);
      }),
      timeout,
      "pi startup",
    );
    return this;
  }

  _onStdout(chunk) {
    this.buffer += this.decoder.write(chunk);
    let index;
    while ((index = this.buffer.indexOf("\n")) >= 0) {
      const raw = this.buffer.slice(0, index).replace(/\r$/, "");
      this.buffer = this.buffer.slice(index + 1);
      if (!raw.trim()) continue;
      this.lastActivity = Date.now();
      let record;
      try {
        record = JSON.parse(raw);
      } catch (error) {
        this.emit("protocol-error", new Error(`Invalid Pi JSONL record: ${error.message}`));
        continue;
      }
      if (record.type === "response" && record.id && this.pending.has(record.id)) {
        const waiter = this.pending.get(record.id);
        this.pending.delete(record.id);
        if (record.success === false) {
          const error = new Error(record.error || "Pi command failed");
          error.command = record.command;
          waiter.reject(error);
        } else {
          waiter.resolve(record);
        }
        continue;
      }
      if (record.type === "agent_start") this.busy = true;
      if (record.type === "agent_settled") this.busy = false;
      const normalized = this.projection.handle(record);
      for (const item of normalized) this.emit("event", item);
      this.emit("record", record);
    }
  }

  _onStderr(chunk) {
    const text = chunk.toString().trimEnd();
    if (!text) return;
    this.stderr.push(text);
    if (this.stderr.length > 40) this.stderr.shift();
    this.emit("stderr", text);
  }

  _fail(error) {
    for (const waiter of this.pending.values()) waiter.reject(error);
    this.pending.clear();
    this.emit("failure", error);
  }

  _onExit(code, signal) {
    const error = new Error(`Pi exited (${code ?? signal ?? "unknown"})`);
    this.proc = null;
    this.busy = false;
    for (const waiter of this.pending.values()) waiter.reject(error);
    this.pending.clear();
    this.emit("exit", { code, signal, stderr: this.stderr.join("\n") });
  }

  _write(record) {
    if (!this.alive) throw new Error("Pi is not running");
    this.lastActivity = Date.now();
    this.proc.stdin.write(JSON.stringify(record) + "\n");
  }

  send(type, fields = {}, { timeout = 20000, id = randomUUID() } = {}) {
    if (!this.alive) return Promise.reject(new Error("Pi is not running"));
    const command = { id, type, ...fields };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Pi command ${type} timed out`));
      }, timeout);
      this.pending.set(id, {
        resolve: (record) => {
          clearTimeout(timer);
          resolve(record);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      try {
        this._write(command);
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  async getState() {
    return this.send("get_state").then((r) => r.data);
  }

  async getMessages() {
    const response = await this.send("get_messages", {}, { timeout: 30000 });
    this.projection.hydrate(response.data?.messages || []);
    return this.projection.snapshot();
  }

  async history() {
    return this.getMessages();
  }

  async prompt(text, { streamingBehavior, timeout = 20000 } = {}) {
    const fields = { message: text };
    if (streamingBehavior) fields.streamingBehavior = streamingBehavior;
    return this.send("prompt", fields, { timeout });
  }

  async steer(text) {
    return this.send("steer", { message: text });
  }

  async followUp(text) {
    return this.send("follow_up", { message: text });
  }

  async abort() {
    return this.send("abort", {}, { timeout: 30000 });
  }

  async setModel(provider, modelId) {
    return this.send("set_model", { provider, modelId });
  }

  async setSessionName(name) {
    return this.send("set_session_name", { name });
  }

  async getAvailableModels() {
    const response = await this.send("get_available_models", {}, { timeout: 30000 });
    return response.data?.models || [];
  }

  respondExtensionUi(id, response) {
    this._write({ type: "extension_ui_response", id, ...response });
    const normalized = this.projection.resolveUi(id, response);
    if (normalized) this.emit("event", normalized);
  }

  snapshot() {
    return this.projection.snapshot();
  }

  async stop({ timeout = 3000 } = {}) {
    if (!this.proc) return;
    const proc = this.proc;
    try {
      proc.stdin.end();
    } catch {
      /* ignore */
    }
    await new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        try {
          proc.kill("SIGTERM");
        } catch {
          /* ignore */
        }
        setTimeout(() => {
          try {
            proc.kill("SIGKILL");
          } catch {
            /* ignore */
          }
          finish();
        }, 1000);
      }, timeout);
      proc.once("exit", finish);
    });
    this.proc = null;
  }
}

export async function listPiModels({ bin, prefixArgs, cwd, env, timeout = 30000 }) {
  const probe = new PiSession({
    sessionID: "pocketcode-model-probe",
    cwd,
    bin,
    prefixArgs,
    env,
    noSession: true,
  });
  await probe.start({ timeout });
  try {
    return await probe.getAvailableModels();
  } finally {
    await probe.stop();
  }
}
