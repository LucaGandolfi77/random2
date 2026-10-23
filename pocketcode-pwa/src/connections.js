const KEY = "pocketcode.connections.v2";

const EMPTY = {
  connections: [],
  activeId: "",
  prefs: { showReasoning: true, compactTools: true },
};

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!parsed || typeof parsed !== "object") return { ...EMPTY, prefs: { ...EMPTY.prefs } };
    return {
      connections: Array.isArray(parsed.connections) ? parsed.connections : [],
      activeId: typeof parsed.activeId === "string" ? parsed.activeId : "",
      prefs: { ...EMPTY.prefs, ...(parsed.prefs || {}) },
    };
  } catch {
    return { ...EMPTY, prefs: { ...EMPTY.prefs } };
  }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage may be unavailable in private contexts */
  }
}

export function loadState() {
  const state = read();
  state.connections = state.connections.filter((item) => item && item.id && item.kind);
  return state;
}

export function saveState(state) {
  write(state);
  return state;
}

export function getState() {
  return read();
}

export function newConnectionId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createConnection({ kind, name, baseUrl, username, password, token }) {
  return {
    id: newConnectionId(),
    kind,
    name: String(name || "").trim(),
    baseUrl: String(baseUrl || "").trim().replace(/\/+$/, ""),
    username: String(username || "").trim(),
    password: String(password || ""),
    token: String(token || ""),
    createdAt: new Date().toISOString(),
  };
}

export function upsertConnection(connection) {
  const state = loadState();
  const index = state.connections.findIndex((item) => item.id === connection.id);
  if (index >= 0) state.connections[index] = { ...state.connections[index], ...connection };
  else state.connections.push(connection);
  if (!state.activeId) state.activeId = connection.id;
  saveState(state);
  return state;
}

export function removeConnection(id) {
  const state = loadState();
  state.connections = state.connections.filter((item) => item.id !== id);
  if (state.activeId === id) state.activeId = state.connections[0]?.id || "";
  saveState(state);
  return state;
}

export function setActiveConnection(id) {
  const state = loadState();
  if (state.connections.some((item) => item.id === id)) state.activeId = id;
  saveState(state);
  return state;
}

export function getActiveConnection() {
  const state = loadState();
  return state.connections.find((item) => item.id === state.activeId) || state.connections[0] || null;
}

export function updatePrefs(patch) {
  const state = loadState();
  state.prefs = { ...state.prefs, ...patch };
  saveState(state);
  return state.prefs;
}

export function clearAll() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem("pocketcode.lastSession.v1");
  } catch {
    /* ignore */
  }
}

export function connectionLabel(connection) {
  if (!connection) return "";
  if (connection.kind === "demo") return "Demo workspace";
  return connection.name || hostLabel(connection.baseUrl) || "Agent";
}

export function hostLabel(url) {
  try {
    return new URL(url).host;
  } catch {
    return String(url || "").replace(/^https?:\/\//, "");
  }
}

export const demoConnection = {
  id: "demo",
  kind: "demo",
  name: "Demo workspace",
  baseUrl: "",
  username: "",
  password: "",
  token: "",
  createdAt: "2026-01-01T00:00:00.000Z",
};
