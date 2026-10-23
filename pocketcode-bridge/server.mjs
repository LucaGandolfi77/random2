import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { Auth } from "./auth.mjs";
import { Store } from "./store.mjs";
import { PiSession, listPiModels } from "./pi-session.mjs";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

const DEFAULT_ORIGINS = [
  "https://lucagandolfi77.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:8099",
  "http://127.0.0.1:8099",
];

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function errorJson(res, status, code, message) {
  json(res, status, { error: { code, message } });
}

async function readJsonBody(req, limit = 512 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      const error = new Error("Request body is too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body is not valid JSON");
    error.status = 400;
    throw error;
  }
}

function bearer(req) {
  const value = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match ? match[1].trim() : "";
}

function titleFromText(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > 64 ? clean.slice(0, 61) + "..." : clean;
}

function safeStaticPath(root, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const clean = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = resolve(root, "." + (clean.startsWith("/") ? clean : "/" + clean));
  if (full !== root && !full.startsWith(root + sep)) return null;
  return full;
}

class SseHub {
  constructor() {
    this.seq = 0;
    this.log = [];
    this.clients = new Set();
    this.max = 4000;
  }

  broadcast(event) {
    const seq = ++this.seq;
    const payload = { ...event, seq };
    this.log.push(payload);
    if (this.log.length > this.max) this.log.splice(0, this.log.length - this.max);
    for (const client of this.clients) {
      client.send(payload);
    }
    return payload;
  }

  replay(after) {
    if (!Number.isFinite(after)) return [];
    return this.log.filter((event) => event.seq > after);
  }

  add(client) {
    this.clients.add(client);
    return () => this.clients.delete(client);
  }
}

class PiManager {
  constructor({ workspace, store, hub, piBin, piPrefixArgs, env, idleAfterMs = 10 * 60 * 1000 }) {
    this.workspace = workspace;
    this.store = store;
    this.hub = hub;
    this.piBin = piBin;
    this.piPrefixArgs = piPrefixArgs;
    this.env = env;
    this.idleAfterMs = idleAfterMs;
    this.entries = new Map();
    this.modelsCache = null;
    this.modelsAt = 0;
  }

  _emit(sessionID, event) {
    this.hub.broadcast({ ...event, sessionID });
  }

  async _entry(sessionID) {
    const existing = this.entries.get(sessionID);
    if (existing?.starting) return existing.starting;
    if (existing?.session?.alive) return existing;
    const session = this.store.getSession(sessionID);
    if (!session) {
      const error = new Error("Unknown session");
      error.status = 404;
      throw error;
    }
    const entry = { session: null, starting: null, idleTimer: null, sessionFile: null };
    entry.starting = (async () => {
      const pi = new PiSession({
        sessionID,
        cwd: this.workspace,
        bin: this.piBin,
        prefixArgs: this.piPrefixArgs,
        env: this.env,
        idleAfterMs: this.idleAfterMs,
      });
      pi.on("event", (event) => {
        this._touch(entry);
        this._emit(sessionID, event);
      });
      pi.on("stderr", (line) => {
        if (process.env.POCKETCODE_DEBUG) console.error(`[pi:${sessionID.slice(0, 8)}] ${line}`);
      });
      pi.on("protocol-error", (error) => {
        this._emit(sessionID, {
          type: "session.error",
          properties: { sessionID, error: error.message },
        });
      });
      pi.on("exit", ({ code, signal, stderr }) => {
        if (this.entries.get(sessionID)?.session === pi) this.entries.delete(sessionID);
        this._emit(sessionID, {
          type: "session.error",
          properties: {
            sessionID,
            error: `Pi process exited (${code ?? signal ?? "unknown"})${stderr ? ": " + stderr.slice(-400) : ""}`,
          },
        });
      });
      await pi.start();
      const state = await pi.getState();
      entry.session = pi;
      entry.sessionFile = state?.sessionFile || null;
      this._touch(entry);
      this.entries.set(sessionID, entry);
      return entry;
    })();
    try {
      return await entry.starting;
    } catch (error) {
      this.entries.delete(sessionID);
      throw error;
    }
  }

  _touch(entry) {
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    entry.idleTimer = setTimeout(() => {
      if (entry.session) {
        entry.session.stop().catch(() => {});
        this.entries.delete(entry.session.sessionID);
      }
    }, this.idleAfterMs);
    entry.idleTimer.unref?.();
  }

  async history(sessionID) {
    const entry = await this._entry(sessionID);
    return entry.session.getMessages();
  }

  async prompt(sessionID, text, behavior) {
    const entry = await this._entry(sessionID);
    const session = this.store.getSession(sessionID);
    if (session && !session.title) {
      const title = titleFromText(text);
      if (title) this.store.updateSession(sessionID, { title });
    }
    const fields = behavior ? { streamingBehavior: behavior } : {};
    const response = await entry.session.prompt(text, fields);
    return response.data || {};
  }

  async abort(sessionID) {
    const entry = await this._entry(sessionID);
    return entry.session.abort();
  }

  async steer(sessionID, text, followUp = false) {
    const entry = await this._entry(sessionID);
    return followUp ? entry.session.followUp(text) : entry.session.steer(text);
  }

  async setModel(sessionID, provider, modelId) {
    const entry = await this._entry(sessionID);
    return entry.session.setModel(provider, modelId);
  }

  async respondUi(sessionID, requestID, response) {
    const entry = await this._entry(sessionID);
    entry.session.respondExtensionUi(requestID, response);
    return { ok: true };
  }

  async models(force = false) {
    if (!force && this.modelsCache && Date.now() - this.modelsAt < 5 * 60 * 1000) {
      return this.modelsCache;
    }
    this.modelsCache = await listPiModels({
      bin: this.piBin,
      prefixArgs: this.piPrefixArgs,
      cwd: this.workspace,
      env: this.env,
    });
    this.modelsAt = Date.now();
    return this.modelsCache;
  }

  async delete(sessionID) {
    const entry = this.entries.get(sessionID);
    if (entry?.session) {
      await entry.session.stop();
      this.entries.delete(sessionID);
    }
    this.store.deleteSession(sessionID);
  }

  async shutdown() {
    const entries = [...this.entries.values()];
    this.entries.clear();
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.idleTimer) clearTimeout(entry.idleTimer);
        if (entry.session) await entry.session.stop();
      }),
    );
  }
}

export async function createBridgeServer({
  workspace,
  dataDir,
  host = "127.0.0.1",
  port = 4319,
  webRoot = null,
  piBin = process.env.PI_BIN || "pi",
  piPrefixArgs = [],
  allowOrigins = [],
  idleAfterMs = 10 * 60 * 1000,
  piVersion = "",
  pairTtlMs = 5 * 60 * 1000,
  onCode = null,
  env = process.env,
  log = console.log,
} = {}) {
  if (!workspace) throw new Error("workspace is required");
  const root = resolve(workspace);
  const store = new Store(dataDir);
  const auth = new Auth(store, { ttlMs: pairTtlMs });
  const hub = new SseHub();
  const manager = new PiManager({
    workspace: root,
    store,
    hub,
    piBin,
    piPrefixArgs,
    env,
    idleAfterMs,
  });
  const origins = new Set([...DEFAULT_ORIGINS, ...allowOrigins]);
  const pairAttempts = new Map();
  let closed = false;

  function applyCors(req, res) {
    const origin = req.headers.origin;
    if (!origin) return false;
    if (!origins.has("*") && !origins.has(origin)) return false;
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "authorization, content-type, last-event-id",
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    return true;
  }

  function authorized(req) {
    return auth.verify(bearer(req));
  }

  function requireAuth(req, res) {
    const device = authorized(req);
    if (!device) {
      errorJson(res, 401, "unauthorized", "A valid bearer token is required.");
      return null;
    }
    return device;
  }

  function pairRateLimited(ip) {
    const now = Date.now();
    const list = (pairAttempts.get(ip) || []).filter((t) => now - t < 60_000);
    if (list.length >= 10) return true;
    list.push(now);
    pairAttempts.set(ip, list);
    return false;
  }

  async function serveStatic(req, res, pathname) {
    if (!webRoot) return false;
    let file = safeStaticPath(resolve(webRoot), pathname === "/" ? "/index.html" : pathname);
    if (!file) {
      errorJson(res, 403, "forbidden", "Invalid path.");
      return true;
    }
    let info;
    try {
      info = await stat(file);
    } catch {
      if (!extname(pathname)) {
        file = join(resolve(webRoot), "index.html");
        try {
          info = await stat(file);
        } catch {
          return false;
        }
      } else {
        return false;
      }
    }
    if (info.isDirectory()) {
      file = join(file, "index.html");
      try {
        info = await stat(file);
      } catch {
        return false;
      }
    }
    const data = await readFile(file);
    const name = file.slice(file.lastIndexOf("/") + 1);
    const noCache = name === "index.html" || name === "service-worker.js" || name === "manifest.json";
    res.writeHead(200, {
      "content-type": MIME[extname(file).toLowerCase()] || "application/octet-stream",
      "content-length": data.length,
      "cache-control": noCache ? "no-cache" : "public, max-age=300",
      "x-content-type-options": "nosniff",
    });
    if (req.method === "HEAD") res.end();
    else res.end(data);
    return true;
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const corsAllowed = applyCors(req, res);
      if (req.method === "OPTIONS") {
        res.writeHead(corsAllowed ? 204 : 403);
        res.end();
        return;
      }

      if (url.pathname === "/api/health") {
        json(res, 200, {
          ok: true,
          name: "pocketcode-bridge",
          version: "1.0.0",
          pi: { found: Boolean(piVersion), version: piVersion || null },
          workspace: { name: root.split(sep).filter(Boolean).pop() || root },
          authRequired: true,
        });
        return;
      }

      if (url.pathname === "/api/pair" && req.method === "POST") {
        const ip = req.socket.remoteAddress || "unknown";
        if (pairRateLimited(ip)) {
          errorJson(res, 429, "rate_limited", "Too many pairing attempts. Try again in a minute.");
          return;
        }
        const body = await readJsonBody(req);
        try {
          const result = auth.pair(String(body.code || ""), body.deviceName || "phone");
          const next = auth.newCode();
          if (onCode) onCode(next);
          json(res, 200, {
            token: result.token,
            device: result.device,
            nextCodeExpiresAt: next.expiresAt,
          });
        } catch (error) {
          errorJson(res, 401, error.code || "pair_failed", error.message);
        }
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        const device = requireAuth(req, res);
        if (!device) return;

        if (url.pathname === "/api/config" && req.method === "GET") {
          json(res, 200, {
            name: "pocketcode-bridge",
            version: "1.0.0",
            pi: { found: Boolean(piVersion), version: piVersion || null },
            workspace: { path: root, name: root.split(sep).filter(Boolean).pop() || root },
            device,
            origins: [...origins],
          });
          return;
        }

        if (url.pathname === "/api/events" && req.method === "GET") {
          const after = Number(url.searchParams.get("after") || req.headers["last-event-id"] || "");
          res.writeHead(200, {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
            "x-accel-buffering": "no",
          });
          res.write("retry: 2000\n\n");
          const connectSeq = hub.seq;
          res.write(`data: ${JSON.stringify({ type: "server.connected", seq: connectSeq })}\n\n`);
          for (const event of hub.replay(after)) {
            res.write(`id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`);
          }
          const client = {
            send(event) {
              try {
                res.write(`id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`);
              } catch {
                /* ignore a closed stream */
              }
            },
            close() {
              try {
                res.end();
              } catch {
                /* ignore */
              }
            },
          };
          const remove = hub.add(client);
          const heartbeat = setInterval(() => {
            try {
              res.write(": ping\n\n");
            } catch {
              /* ignore */
            }
          }, 15000);
          heartbeat.unref?.();
          const cleanup = () => {
            clearInterval(heartbeat);
            remove();
          };
          req.on("close", cleanup);
          res.on("close", cleanup);
          return;
        }

        const parts = url.pathname.split("/").filter(Boolean);
        if (parts[1] === "models" && req.method === "GET") {
          const models = await manager.models(url.searchParams.get("refresh") === "1");
          json(res, 200, { models });
          return;
        }

        if (parts[1] === "sessions") {
          const sessionID = parts[2] || "";
          const action = parts[3] || "";
          if (!sessionID) {
            if (req.method === "GET") {
              json(res, 200, { sessions: store.listSessions() });
              return;
            }
            if (req.method === "POST") {
              const body = await readJsonBody(req);
              const session = store.createSession({
                title: String(body.title || ""),
                workspace: root,
              });
              json(res, 201, { session });
              return;
            }
          }
          const session = store.getSession(sessionID);
          if (!session) {
            errorJson(res, 404, "not_found", "Session not found.");
            return;
          }
          if (!action) {
            if (req.method === "GET") {
              json(res, 200, { session });
              return;
            }
            if (req.method === "PATCH") {
              const body = await readJsonBody(req);
              if (typeof body.title === "string") {
                const updated = store.updateSession(sessionID, {
                  title: body.title.slice(0, 200),
                });
                const entry = manager.entries.get(sessionID);
                if (entry?.session?.alive) {
                  entry.session.setSessionName(body.title).catch(() => {});
                }
                hub.broadcast({
                  type: "session.updated",
                  sessionID,
                  properties: { info: { sessionID, title: updated.title } },
                });
                json(res, 200, { session: updated });
                return;
              }
              errorJson(res, 400, "bad_request", "Expected a title.");
              return;
            }
            if (req.method === "DELETE") {
              await manager.delete(sessionID);
              hub.broadcast({
                type: "session.deleted",
                sessionID,
                properties: { sessionID },
              });
              json(res, 200, { ok: true });
              return;
            }
          }
          if (action === "messages" && req.method === "GET") {
            const snapshot = await manager.history(sessionID);
            json(res, 200, snapshot);
            return;
          }
          if (action === "prompt" && req.method === "POST") {
            const body = await readJsonBody(req);
            const text = String(body.text || "").trim();
            if (!text) {
              errorJson(res, 400, "bad_request", "Prompt text is required.");
              return;
            }
            const behavior = ["steer", "followUp"].includes(body.behavior)
              ? body.behavior
              : undefined;
            const result = await manager.prompt(sessionID, text, behavior);
            json(res, 202, { accepted: true, ...result });
            return;
          }
          if (action === "abort" && req.method === "POST") {
            await manager.abort(sessionID);
            json(res, 200, { ok: true });
            return;
          }
          if ((action === "steer" || action === "follow-up") && req.method === "POST") {
            const body = await readJsonBody(req);
            await manager.steer(sessionID, String(body.text || ""), action === "follow-up");
            json(res, 200, { ok: true });
            return;
          }
          if (action === "model" && req.method === "POST") {
            const body = await readJsonBody(req);
            const model = await manager.setModel(sessionID, body.provider, body.modelId);
            json(res, 200, { model: model.data });
            return;
          }
          if (action === "extension-ui" && req.method === "POST") {
            const requestID = parts[4];
            const body = await readJsonBody(req);
            await manager.respondUi(sessionID, requestID, body);
            json(res, 200, { ok: true });
            return;
          }
          errorJson(res, 404, "not_found", "Unknown session action.");
          return;
        }

        errorJson(res, 404, "not_found", "Unknown API route.");
        return;
      }

      if (req.method === "GET" || req.method === "HEAD") {
        if (await serveStatic(req, res, url.pathname)) return;
      }
      errorJson(res, 404, "not_found", "Not found.");
    } catch (error) {
      if (res.headersSent) {
        try {
          res.end();
        } catch {
          /* ignore */
        }
        return;
      }
      errorJson(res, error.status || 500, error.code || "internal", error.message || "Internal error");
    }
  });

  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolvePromise();
    });
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const displayHost = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
  const pairing = auth.newCode();
  if (onCode) onCode(pairing);

  return {
    server,
    port: actualPort,
    url: `http://${displayHost}:${actualPort}`,
    root,
    auth,
    store,
    manager,
    hub,
    pairing,
    async close() {
      if (closed) return;
      closed = true;
      for (const client of hub.clients) {
        client.send({ type: "server.closed", seq: hub.seq });
        client.close();
      }
      hub.clients.clear();
      await manager.shutdown();
      await new Promise((resolvePromise) => {
        server.close(() => resolvePromise());
        server.closeAllConnections?.();
      });
    },
    requestPairCode() {
      const next = auth.newCode();
      if (onCode) onCode(next);
      return next;
    },
    log,
  };
}
