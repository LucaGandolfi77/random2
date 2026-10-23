import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  existsSync,
  chmodSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomUUID, createHash } from "node:crypto";

export function defaultDataDir() {
  if (process.env.POCKETCODE_DATA_DIR) return process.env.POCKETCODE_DATA_DIR;
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return join(xdg, "pocketcode");
  return join(homedir(), ".config", "pocketcode");
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  renameSync(tmp, file);
  try {
    chmodSync(file, 0o600);
  } catch {
    /* best effort on platforms without chmod */
  }
}

export class Store {
  constructor(dir = defaultDataDir()) {
    this.dir = dir;
    mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    this.devicesFile = join(this.dir, "devices.json");
    this.sessionsFile = join(this.dir, "sessions.json");
    this.devices = readJson(this.devicesFile, { devices: [] });
    this.sessions = readJson(this.sessionsFile, { sessions: [] });
    if (!Array.isArray(this.devices.devices)) this.devices = { devices: [] };
    if (!Array.isArray(this.sessions.sessions)) this.sessions = { sessions: [] };
  }

  saveDevices() {
    writeJson(this.devicesFile, this.devices);
  }

  saveSessions() {
    writeJson(this.sessionsFile, this.sessions);
  }

  listDevices() {
    return this.devices.devices.map((d) => ({
      id: d.id,
      name: d.name,
      createdAt: d.createdAt,
      lastSeenAt: d.lastSeenAt || null,
    }));
  }

  addDevice(name) {
    const token = "pc_" + randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
    const device = {
      id: randomUUID(),
      name: String(name || "phone").slice(0, 80),
      tokenHash: hashToken(token),
      createdAt: new Date().toISOString(),
      lastSeenAt: null,
    };
    this.devices.devices.push(device);
    this.saveDevices();
    return {
      token,
      device: { id: device.id, name: device.name, createdAt: device.createdAt },
    };
  }

  verifyToken(token) {
    if (!token) return null;
    const hash = hashToken(token);
    const device = this.devices.devices.find((d) => d.tokenHash === hash);
    if (!device) return null;
    device.lastSeenAt = new Date().toISOString();
    this.saveDevices();
    return { id: device.id, name: device.name };
  }

  removeDevice(id) {
    const before = this.devices.devices.length;
    this.devices.devices = this.devices.devices.filter((d) => d.id !== id);
    if (this.devices.devices.length !== before) this.saveDevices();
    return this.devices.devices.length !== before;
  }

  listSessions() {
    return this.sessions.sessions
      .slice()
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  getSession(id) {
    return this.sessions.sessions.find((s) => s.id === id) || null;
  }

  createSession({ title = "", workspace = "" } = {}) {
    const now = new Date().toISOString();
    const session = {
      id: randomUUID(),
      title: String(title || "").slice(0, 200),
      workspace,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.sessions.push(session);
    this.saveSessions();
    return session;
  }

  updateSession(id, patch) {
    const session = this.getSession(id);
    if (!session) return null;
    Object.assign(session, patch, { updatedAt: new Date().toISOString() });
    this.saveSessions();
    return session;
  }

  deleteSession(id) {
    const before = this.sessions.sessions.length;
    this.sessions.sessions = this.sessions.sessions.filter((s) => s.id !== id);
    if (this.sessions.sessions.length !== before) this.saveSessions();
    return this.sessions.sessions.length !== before;
  }
}

export function fileExists(file) {
  return existsSync(file);
}

export function removeFile(file) {
  try {
    unlinkSync(file);
  } catch {
    /* ignore */
  }
}
