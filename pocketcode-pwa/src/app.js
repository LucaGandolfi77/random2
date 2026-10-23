import {
  $,
  $$,
  el,
  clear,
  timeAgo,
  formatCost,
  normalizeBaseUrl,
  isLoopback,
  errorMessage,
  shortPath,
} from "./util.js";
import {
  loadState,
  upsertConnection,
  removeConnection,
  setActiveConnection,
  getActiveConnection,
  updatePrefs,
  clearAll,
  createConnection,
  connectionLabel,
  hostLabel,
  demoConnection,
} from "./connections.js";
import { PiAdapter, pairPi } from "./pi.js";
import { OpenCodeAdapter } from "./opencode.js";
import { DemoAdapter } from "./demo.js";
import { Timeline } from "./timeline.js";
import { renderTimeline, renderDiffSheet, renderTodoSheet } from "./render.js";

const LAST_SESSION_KEY = "pocketcode.lastSession.v1";

const state = {
  connection: null,
  adapter: null,
  health: null,
  sessions: [],
  session: null,
  timeline: null,
  models: [],
  agents: [],
  selectedModel: null,
  selectedAgent: "",
  connected: false,
  sseStatus: "closed",
  subscription: null,
  sending: false,
  renderQueued: false,
  view: "connect",
  prefs: loadState().prefs,
  lastSessionId: localStorage.getItem(LAST_SESSION_KEY) || "",
};

function makeAdapter(connection) {
  if (connection.kind === "demo") return new DemoAdapter(connection);
  if (connection.kind === "opencode") return new OpenCodeAdapter(connection);
  return new PiAdapter(connection);
}

function toast(message, variant = "") {
  const node = $("#toast");
  node.textContent = message;
  node.className = `toast ${variant}`.trim();
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    node.hidden = true;
  }, 4200);
}

function setFormStatus(message, variant = "") {
  const node = $("#connectStatus");
  node.textContent = message;
  node.className = `form-status ${variant}`.trim();
}

function setSessionsStatus(message) {
  $("#sessionsStatus").textContent = message || "";
}

function setComposerStatus(message, variant = "") {
  const node = $("#composerStatus");
  node.textContent = message || "";
  node.className = `composer-status ${variant}`.trim();
  node.hidden = !message;
}

function showView(view) {
  state.view = view;
  for (const screen of $$(".screen")) {
    screen.hidden = screen.dataset.screen !== view;
  }
  const back = $("#backButton");
  back.hidden = view === "connect" || view === "sessions";
  const settings = $("#settingsButton");
  settings.hidden = view === "settings";

  const titles = {
    connect: ["PocketCode", "your agents, in your pocket"],
    sessions: ["Sessions", state.connection ? connectionLabel(state.connection) : "not connected"],
    chat: [state.session?.title || "Session", state.connection ? connectionLabel(state.connection) : "chat"],
    settings: ["Settings", "connections and display"],
  };
  const [title, subtitle] = titles[view] || titles.connect;
  $("#screenTitle").textContent = title;
  $("#screenSubtitle").textContent = subtitle;

  if (view === "connect") renderSaved();
  if (view === "settings") renderSettings();
  if (view === "sessions") renderSessions();
  if (view === "chat") renderChat();
}

function updateHash(view, sessionId) {
  const next = view === "chat" && sessionId
    ? `#/chat/${encodeURIComponent(sessionId)}`
    : `#/${view}`;
  if (location.hash !== next) history.pushState(null, "", next);
}

function navigate(view, sessionId) {
  updateHash(view, sessionId);
  showView(view);
}

async function handleRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [view, encoded] = raw.split("/");
  const sessionId = encoded ? decodeURIComponent(encoded) : "";
  if (view === "chat") {
    if (!state.adapter) {
      const restored = await restoreActive();
      if (!restored) {
        navigate("connect");
        return;
      }
    }
    if (sessionId) await openSession(sessionId, { fromRoute: true });
    else navigate("sessions");
    return;
  }
  if (view === "sessions") {
    if (!state.adapter) {
      const restored = await restoreActive();
      if (!restored) {
        navigate("connect");
        return;
      }
    }
    showView("sessions");
    return;
  }
  if (view === "settings") {
    showView("settings");
    return;
  }
  showView("connect");
}

function setKindFields() {
  const kind = $("#connectKind").value;
  for (const field of $$("[data-kind]")) {
    field.classList.toggle("visible", field.dataset.kind === kind);
  }
}

function updateUrlHint() {
  const url = $("#connectUrl").value.trim();
  const hint = $("#urlHint");
  if (!url) {
    hint.textContent = "Use an HTTPS URL so this installed app can reach your machine.";
    return;
  }
  if (location.protocol === "https:" && /^http:\/\//i.test(url) && !isLoopback(url)) {
    hint.textContent = "Plain HTTP is blocked from an HTTPS app. Use Tailscale Serve or an HTTPS tunnel.";
    hint.style.color = "var(--amber)";
    return;
  }
  hint.style.color = "";
  const normalized = normalizeBaseUrl(url);
  if (!normalized) {
    hint.textContent = "That URL does not look valid.";
    return;
  }
  hint.textContent = isLoopback(normalized)
    ? "Local URL. Works when the browser is on the same device or network."
    : "Remote URL. Keep the bridge private — Tailscale or a private tunnel is best.";
}

function formConnection() {
  const kind = $("#connectKind").value;
  const url = normalizeBaseUrl($("#connectUrl").value);
  return {
    kind,
    name: $("#connectName").value.trim(),
    baseUrl: url,
    username: $("#connectUser").value.trim() || "opencode",
    password: $("#connectPassword").value,
    token: $("#connectToken").value.trim(),
  };
}

function renderSaved() {
  const cfg = loadState();
  const list = $("#savedList");
  const section = $("#savedConnections");
  clear(list);
  const connections = cfg.connections.filter((item) => item.kind !== "demo");
  section.hidden = !connections.length;
  for (const connection of connections) {
    const button = el("button", "saved-item");
    button.type = "button";
    const icon = el("span", "saved-icon", connection.kind === "pi" ? "π" : "OC");
    const info = el("span", "saved-info");
    info.append(el("strong", "", connectionLabel(connection)));
    info.append(el("small", "", `${connection.kind === "pi" ? "Pi bridge" : "OpenCode"} · ${hostLabel(connection.baseUrl)}`));
    const action = el("span", "saved-action", cfg.activeId === connection.id ? "active" : "open");
    button.append(icon, info, action);
    button.addEventListener("click", () => {
      activateConnection(connection).catch((error) => {
        setFormStatus(errorMessage(error), "error");
        toast(errorMessage(error), "error");
      });
    });
    list.append(button);
  }
}

function renderSettings() {
  const cfg = loadState();
  const list = $("#settingsConnections");
  clear(list);
  if (!cfg.connections.length) {
    list.append(el("p", "panel-copy", "No saved connections yet."));
  }
  for (const connection of cfg.connections) {
    const row = el("div", "settings-connection");
    const info = el("div", "saved-info");
    info.append(el("strong", "", connectionLabel(connection)));
    info.append(el("small", "", `${connection.kind === "pi" ? "Pi bridge" : "OpenCode"} · ${hostLabel(connection.baseUrl)}`));
    const actions = el("div", "row-actions");
    const open = el("button", "", "Connect");
    open.type = "button";
    open.addEventListener("click", () => {
      activateConnection(connection).catch((error) => toast(errorMessage(error), "error"));
    });
    const del = el("button", "danger", "Delete");
    del.type = "button";
    del.addEventListener("click", () => {
      if (!confirm(`Remove ${connectionLabel(connection)} from this device?`)) return;
      removeConnection(connection.id);
      if (state.connection?.id === connection.id) {
        disconnect();
        navigate("connect");
      }
      renderSettings();
      renderSaved();
    });
    actions.append(open, del);
    row.append(info, actions);
    list.append(row);
  }
}

function renderSessions() {
  const list = $("#sessionList");
  const empty = $("#sessionsEmpty");
  clear(list);
  empty.hidden = state.sessions.length > 0;
  $("#newSessionButton").hidden = !state.adapter;
  if (!state.connection) {
    setSessionsStatus("No connection selected.");
    return;
  }
  $("#sessionsTitle").textContent = "Sessions";
  const bar = $("#sessionConnectionBar");
  clear(bar);
  const main = el("div", "connection-main");
  const dot = el("span", "connection-dot");
  if (!state.connected) dot.classList.add("offline");
  main.append(dot);
  main.append(el("strong", "", connectionLabel(state.connection)));
  main.append(el("span", "", state.health?.workspace ? shortPath(state.health.workspace, 26) : state.sseStatus === "open" ? "live" : ""));
  bar.append(main);
  const switchButton = el("button", "", "Switch");
  switchButton.type = "button";
  switchButton.addEventListener("click", () => navigate("connect"));
  bar.append(switchButton);

  if (!state.connected && !state.sessions.length) {
    setSessionsStatus("Connection lost. Open the connect screen to retry.");
  } else {
    setSessionsStatus("");
  }

  for (const session of state.sessions) {
    const button = el("button", "session-card");
    button.type = "button";
    const glyph = el("span", "session-glyph", ">_");
    const body = el("span", "session-body");
    body.append(el("strong", "", session.title || "Untitled session"));
    const meta = el("small");
    meta.append(el("span", "", timeAgo(session.updatedAt || session.createdAt)));
    if (session.workspace) meta.append(el("span", "", shortPath(session.workspace, 30)));
    body.append(meta);
    button.append(glyph, body);
    const cost = formatCost(session.cost);
    if (cost) button.append(el("span", "session-cost", cost));
    button.addEventListener("click", () => openSession(session.id));
    list.append(button);
  }
}

function updateChatHeader() {
  const connection = state.connection;
  const session = state.session;
  $("#chatConnection").textContent = connection ? connectionLabel(connection) : "—";
  $("#chatSessionTitle").textContent = session?.title || "Session";
  $("#screenTitle").textContent = session?.title || "Session";
  $("#screenSubtitle").textContent = connection ? connectionLabel(connection) : "chat";
  const dot = $("#chatDot");
  dot.classList.toggle("offline", !state.connected);
  const modelName = state.selectedModel
    ? state.selectedModel.name || state.selectedModel.id
    : connection?.kind === "opencode"
      ? "Default model"
      : "Default model";
  $("#modelLabel").textContent = modelName;
  const agentButton = $("#agentButton");
  const supportsAgents = state.adapter?.kind === "opencode" || state.adapter?.kind === "demo";
  agentButton.hidden = !supportsAgents;
  $("#agentLabel").textContent = state.selectedAgent || "Agent";
}

function renderChat(options) {
  if (!state.session || !state.timeline) return;
  options = options || {};
  updateChatHeader();
  const container = $("#timeline");
  renderTimeline(container, state.timeline, {
    showReasoning: state.prefs.showReasoning,
    compactTools: state.prefs.compactTools,
    canAlways: state.adapter?.kind !== "pi",
    scroll: options.scroll,
    onPermission: (permission, action) => {
      respondPermission(permission, action).catch((error) => toast(errorMessage(error), "error"));
    },
  });
  const busy = state.timeline.isBusy();
  $("#abortButton").hidden = !busy;
  const diffCount = state.timeline.diff?.length || 0;
  const todoCount = state.timeline.todos?.length || 0;
  $("#chatToolbar").hidden = !diffCount && !todoCount;
  $("#diffButton").hidden = !diffCount;
  $("#todoButton").hidden = !todoCount;
  $("#diffCount").textContent = diffCount ? String(diffCount) : "";
  $("#todoCount").textContent = todoCount ? String(todoCount) : "";
  if (busy) setComposerStatus(state.timeline.status?.type === "retry" ? "Retrying…" : "Agent is working…");
  else if (!$("#composerStatus").classList.contains("error")) setComposerStatus("");
  const input = $("#promptInput");
  $("#sendButton").disabled = state.sending || !state.connected;
  input.placeholder = state.connected ? "Ask your agent…" : "Reconnect to send a message";
}

function scheduleRender(options) {
  if (state.renderQueued) {
    state.pendingRenderOptions = options;
    return;
  }
  state.renderQueued = true;
  requestAnimationFrame(() => {
    state.renderQueued = false;
    const opts = state.pendingRenderOptions;
    state.pendingRenderOptions = null;
    renderChat(opts);
  });
}

function formatEventError(properties) {
  const error = properties?.error;
  if (!error) return "The agent reported an error.";
  if (typeof error === "string") return error;
  return error.message || error.title || error.code || JSON.stringify(error).slice(0, 300);
}

function eventSessionID(event) {
  const properties = event?.properties || {};
  return properties.sessionID || properties.info?.sessionID || event?.sessionID || "";
}

function handleAdapterEvent(event) {
  if (!event || typeof event !== "object") return;
  if (event.type === "session.created" || event.type === "session.updated") {
    const info = event.properties?.info;
    if (info?.id) {
      const index = state.sessions.findIndex((item) => item.id === info.id);
      const normalized = {
        id: info.id,
        title: info.title || info.slug || "Untitled session",
        updatedAt: info.time?.updated ? new Date(info.time.updated).toISOString() : info.updatedAt || "",
        createdAt: info.time?.created ? new Date(info.time.created).toISOString() : info.createdAt || "",
        workspace: info.directory || info.workspace || "",
      };
      if (index >= 0) state.sessions[index] = { ...state.sessions[index], ...normalized };
      else state.sessions.unshift(normalized);
      if (state.view === "sessions") renderSessions();
    }
  }
  if (event.type === "session.error") {
    toast(formatEventError(event.properties || {}), "error");
  }
  if (event.type === "extension.notification" && event.properties?.message) {
    toast(event.properties.message);
  }
  if (event.type === "session.updated" && event.properties?.info?.title && state.session?.id === eventSessionID(event)) {
    state.session.title = event.properties.info.title;
    scheduleRender();
  }
  if (!state.timeline || !state.session) return;
  const changed = state.timeline.apply(event);
  if (changed) scheduleRender();
}

function stopSubscription() {
  try {
    state.subscription?.stop?.();
  } catch {
    /* ignore */
  }
  state.subscription = null;
  state.sseStatus = "closed";
}

function ensureSubscription() {
  if (!state.adapter || state.subscription) return;
  state.subscription = state.adapter.subscribe({
    onEvent: handleAdapterEvent,
    onStatus: (status, detail) => {
      state.sseStatus = status;
      if (status === "reconnecting") {
        state.connected = false;
        if (state.view === "chat") $("#chatDot").classList.add("offline");
      }
      if (status === "open") {
        state.connected = true;
        if (state.view === "chat") $("#chatDot").classList.remove("offline");
        if (detail?.reconnect && state.session) reloadHistory({ quiet: true });
      }
      if (status === "closed") state.sseStatus = "closed";
    },
    onError: (error) => {
      if (state.view === "chat") setComposerStatus(errorMessage(error), "error");
    },
  });
}

async function activateConnection(connection, { route = "sessions" } = {}) {
  stopSubscription();
  state.connection = connection;
  state.adapter = makeAdapter(connection);
  state.health = null;
  state.sessions = [];
  state.session = null;
  state.timeline = null;
  state.models = [];
  state.agents = [];
  state.selectedModel = connection.model || null;
  state.selectedAgent = connection.agent || "";
  state.connected = false;
  if (connection.kind !== "demo") setActiveConnection(connection.id);
  setSessionsStatus("Connecting…");
  try {
    state.health = await state.adapter.health();
    state.connected = true;
    ensureSubscription();
    if (route === "sessions") navigate("sessions");
    await loadSessions();
    return true;
  } catch (error) {
    state.connected = false;
    stopSubscription();
    const message = errorMessage(error);
    setFormStatus(message, "error");
    toast(message, "error");
    navigate("connect");
    return false;
  }
}

async function restoreActive() {
  const connection = getActiveConnection();
  if (!connection) return false;
  try {
    return await activateConnection(connection);
  } catch {
    return false;
  }
}

async function loadSessions() {
  if (!state.adapter) return;
  if (state.view === "sessions") setSessionsStatus("Loading sessions…");
  try {
    state.sessions = await state.adapter.listSessions();
    state.connected = true;
    if (state.view === "sessions") renderSessions();
    if (!state.sessions.length && state.view === "sessions") setSessionsStatus("No sessions yet.");
  } catch (error) {
    state.connected = false;
    const message = errorMessage(error);
    if (state.view === "sessions") setSessionsStatus(message);
    toast(message, "error");
  }
}

async function openSession(sessionID, { fromRoute = false } = {}) {
  if (!state.adapter) return;
  const found = state.sessions.find((session) => session.id === sessionID) || null;
  state.session = found || { id: sessionID, title: "Session" };
  state.timeline = new Timeline(sessionID);
  localStorage.setItem(LAST_SESSION_KEY, sessionID);
  updateHash("chat", sessionID);
  showView("chat");
  await reloadHistory({ scroll: true });
  if (state.adapter.kind === "pi" && state.selectedModel) {
    state.adapter.setModel(sessionID, state.selectedModel).catch(() => {});
  }
  if (fromRoute) requestAnimationFrame(() => $("#promptInput").focus());
}

async function reloadHistory({ quiet = false, scroll = false } = {}) {
  if (!state.adapter || !state.session) return;
  if (!quiet) setComposerStatus("Loading conversation…");
  try {
    const snapshot = await state.adapter.history(state.session.id);
    if (!state.timeline) return;
    state.timeline.reset(snapshot);
    state.connected = true;
    renderChat({ scroll: true });
    if (state.view === "sessions") renderSessions();
  } catch (error) {
    if (!quiet) {
      setComposerStatus(errorMessage(error), "error");
      toast(errorMessage(error), "error");
    }
  }
}

async function newSession() {
  if (!state.adapter) return;
  try {
    const session = await state.adapter.createSession({});
    if (!session?.id) throw new Error("The server did not return a session.");
    state.sessions.unshift({
      id: session.id,
      title: session.title || "New session",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      workspace: session.workspace || "",
    });
    await openSession(session.id);
    $("#promptInput").focus();
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function sendPrompt(event) {
  event?.preventDefault();
  const input = $("#promptInput");
  const text = input.value.trim();
  if (!text || !state.adapter || !state.session || state.sending) return;
  state.sending = true;
  input.value = "";
  autoResize();
  setComposerStatus("Sending…");
  const behavior =
    state.adapter.kind === "pi" && state.timeline?.isBusy() ? "followUp" : undefined;
  if (state.timeline) {
    state.timeline.error = "";
    state.timeline.status = { type: "busy" };
    scheduleRender();
  }
  try {
    await state.adapter.prompt(state.session.id, text, { behavior });
  } catch (error) {
    setComposerStatus(errorMessage(error), "error");
    toast(errorMessage(error), "error");
    if (!input.value) input.value = text;
    if (state.timeline) state.timeline.status = { type: "idle" };
    scheduleRender();
  } finally {
    state.sending = false;
    $("#sendButton").disabled = !state.connected;
    input.focus();
  }
}

async function abortRun() {
  if (!state.adapter || !state.session) return;
  try {
    await state.adapter.abort(state.session.id);
    setComposerStatus("Stopping…");
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function respondPermission(permission, action) {
  if (!state.adapter || !state.session) return;
  try {
    await state.adapter.respondPermission(state.session.id, permission, action);
    state.timeline?.permissions.delete(permission.id);
    scheduleRender();
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

function autoResize() {
  const input = $("#promptInput");
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
}

function disconnect() {
  stopSubscription();
  state.connection = null;
  state.adapter = null;
  state.session = null;
  state.timeline = null;
  state.sessions = [];
  state.connected = false;
  state.health = null;
}

function closeSheet() {
  $("#sheet").hidden = true;
  document.body.style.overflow = "";
}

function openSheet(title, build) {
  $("#sheetTitle").textContent = title;
  const body = $("#sheetBody");
  clear(body);
  body.className = "";
  build(body);
  $("#sheet").hidden = false;
  document.body.style.overflow = "hidden";
}

async function openModelPicker() {
  if (!state.adapter) return;
  openSheet("Choose a model", (body) => {
    const search = el("input", "sheet-search");
    search.placeholder = "Filter models…";
    search.type = "search";
    body.append(search);
    const list = el("div");
    body.append(list);
    const draw = (filter = "") => {
      clear(list);
      if (!state.models.length) {
        list.append(el("p", "panel-copy", "Loading models…"));
        return;
      }
      const query = filter.trim().toLowerCase();
      const matches = state.models.filter((model) => {
        if (!query) return true;
        return `${model.name} ${model.id} ${model.provider} ${model.providerName || ""}`
          .toLowerCase()
          .includes(query);
      });
      if (!matches.length) {
        list.append(el("p", "panel-copy", "No matching models."));
        return;
      }
      const group = el("div", "picker-group");
      for (const model of matches.slice(0, 120)) {
        const item = el("button", "picker-item");
        item.type = "button";
        const selected =
          state.selectedModel?.id === model.id &&
          (!state.selectedModel.provider || state.selectedModel.provider === model.provider);
        if (selected) item.classList.add("selected");
        const main = el("span", "picker-main");
        main.append(el("span", "", model.name || model.id));
        main.append(el("span", "picker-id", `${model.providerName || model.provider} · ${model.id}`));
        item.append(main);
        if (selected) item.append(el("span", "check", "✓"));
        item.addEventListener("click", () => selectModel(model));
        group.append(item);
      }
      list.append(group);
    };
    search.addEventListener("input", () => draw(search.value));
    draw();
    if (state.models.length) {
      search.focus({ preventScroll: true });
    } else {
      state.adapter
        .models()
        .then((models) => {
          state.models = models;
          draw(search.value);
        })
        .catch((error) => {
          clear(list);
          list.append(el("p", "panel-copy", errorMessage(error)));
        });
    }
  });
}

async function selectModel(model) {
  state.selectedModel = model;
  if (state.connection) state.connection.model = model;
  if (state.connection && state.connection.kind !== "demo") {
    upsertConnection({ ...state.connection, model });
  }
  closeSheet();
  updateChatHeader();
  try {
    await state.adapter.setModel(state.session?.id, model);
    toast(`Model: ${model.name || model.id}`);
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function openAgentPicker() {
  if (!state.adapter) return;
  openSheet("Choose an agent", (body) => {
    const list = el("div");
    body.append(list);
    if (!state.agents.length) {
      list.append(el("p", "panel-copy", "Loading agents…"));
      state.adapter
        .agents()
        .then((agents) => {
          state.agents = agents;
          clear(list);
          drawAgents(list);
        })
        .catch((error) => {
          clear(list);
          list.append(el("p", "panel-copy", errorMessage(error)));
        });
    } else {
      drawAgents(list);
    }
  });
}

function drawAgents(list) {
  const group = el("div", "picker-group");
  for (const agent of state.agents) {
    const item = el("button", "picker-item");
    item.type = "button";
    if (state.selectedAgent === agent.name) item.classList.add("selected");
    const main = el("span", "picker-main");
    main.append(el("span", "", agent.name));
    if (agent.description) main.append(el("span", "picker-id", agent.description));
    item.append(main);
    if (state.selectedAgent === agent.name) item.append(el("span", "check", "✓"));
    item.addEventListener("click", () => {
      state.selectedAgent = agent.name;
      state.adapter.setAgent(agent.name);
      if (state.connection) state.connection.agent = agent.name;
      if (state.connection && state.connection.kind !== "demo") {
        upsertConnection({ ...state.connection, agent: agent.name });
      }
      closeSheet();
      updateChatHeader();
      toast(`Agent: ${agent.name}`);
    });
    group.append(item);
  }
  list.append(group);
}

function openDiffSheet() {
  openSheet("File changes", (body) => {
    renderDiffSheet(body, state.timeline?.diff || []);
  });
}

function openTodoSheet() {
  openSheet("Todos", (body) => {
    renderTodoSheet(body, state.timeline?.todos || []);
  });
}

async function pairFromForm() {
  const url = normalizeBaseUrl($("#connectUrl").value);
  const code = $("#connectCode").value.trim();
  if (!url) {
    setFormStatus("Enter the bridge URL first.", "error");
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    setFormStatus("Enter the six-digit code from the bridge.", "error");
    return;
  }
  const button = $("#pairButton");
  button.disabled = true;
  setFormStatus("Pairing…");
  try {
    const result = await pairPi(url, code, `PocketCode on ${navigator.platform || "phone"}`);
    $("#connectToken").value = result.token;
    setFormStatus("Paired. Now press Connect.", "ok");
  } catch (error) {
    setFormStatus(errorMessage(error), "error");
  } finally {
    button.disabled = false;
  }
}

async function connectFromForm(event) {
  event.preventDefault();
  const raw = formConnection();
  if (!raw.baseUrl) {
    setFormStatus("Enter a server URL.", "error");
    return;
  }
  if (raw.kind === "pi" && !raw.token) {
    setFormStatus("Pair with a code, or paste a device token.", "error");
    return;
  }
  if (raw.kind === "opencode" && !raw.password) {
    const proceed = confirm(
      "No password entered. If the OpenCode server has OPENCODE_SERVER_PASSWORD set, the connection will fail. Continue?",
    );
    if (!proceed) return;
  }
  const button = $("#connectButton");
  button.disabled = true;
  setFormStatus("Checking the server…");
  try {
    const connection = createConnection(raw);
    const saved = raw.kind === "demo" ? connection : upsertConnection(connection).connections.find((item) => item.id === connection.id) || connection;
    const ok = await activateConnection(saved);
    if (ok) {
      setFormStatus("Connected.", "ok");
      const input = $("#promptInput");
      if (input) input.value = "";
      if (state.view === "chat") input?.focus();
    }
  } catch (error) {
    setFormStatus(errorMessage(error), "error");
  } finally {
    button.disabled = false;
  }
}

function startDemo() {
  const connection = { ...demoConnection, createdAt: new Date().toISOString() };
  activateConnection(connection).catch((error) => toast(errorMessage(error), "error"));
}

function bindEvents() {
  $("#connectKind").addEventListener("change", () => {
    setKindFields();
    updateUrlHint();
  });
  $("#connectUrl").addEventListener("input", updateUrlHint);
  $("#pairButton").addEventListener("click", pairFromForm);
  $("#connectForm").addEventListener("submit", connectFromForm);
  $("#demoButton").addEventListener("click", startDemo);
  $("#manageConnections").addEventListener("click", () => navigate("settings"));
  $("#settingsButton").addEventListener("click", () => navigate("settings"));
  $("#backButton").addEventListener("click", () => {
    if (state.view === "settings") navigate(state.adapter ? "sessions" : "connect");
    else navigate("sessions");
  });
  $("#newSessionButton").addEventListener("click", newSession);
  $("#sessionsEmpty").addEventListener("click", (event) => {
    if (event.target.closest("[data-action='new-session']")) newSession();
  });
  $("#composerForm").addEventListener("submit", sendPrompt);
  $("#abortButton").addEventListener("click", abortRun);
  $("#modelButton").addEventListener("click", openModelPicker);
  $("#agentButton").addEventListener("click", openAgentPicker);
  $("#diffButton").addEventListener("click", openDiffSheet);
  $("#todoButton").addEventListener("click", openTodoSheet);
  $("#addConnectionButton").addEventListener("click", () => navigate("connect"));
  $("#promptInput").addEventListener("input", autoResize);
  $("#promptInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !window.matchMedia("(pointer: coarse)").matches) {
      event.preventDefault();
      sendPrompt(event);
    }
  });
  $("#showReasoning").addEventListener("change", (event) => {
    state.prefs = updatePrefs({ showReasoning: event.target.checked });
    renderChat();
  });
  $("#compactTools").addEventListener("change", (event) => {
    state.prefs = updatePrefs({ compactTools: event.target.checked });
    renderChat();
  });
  $("#clearDataButton").addEventListener("click", () => {
    if (!confirm("Forget every saved connection on this device?")) return;
    clearAll();
    disconnect();
    navigate("connect");
    toast("Connections removed.");
  });
  for (const close of $$("[data-close-sheet]")) {
    close.addEventListener("click", closeSheet);
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("#sheet").hidden) closeSheet();
  });
  window.addEventListener("online", () => {
    state.connected = Boolean(state.adapter);
  });
  window.addEventListener("offline", () => {
    state.connected = false;
    if (state.view === "chat") $("#chatDot").classList.add("offline");
  });
  window.addEventListener("popstate", handleRoute);
  window.addEventListener("hashchange", handleRoute);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && !isLoopback(location.href)) return;
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

async function boot() {
  $("#showReasoning").checked = state.prefs.showReasoning !== false;
  $("#compactTools").checked = state.prefs.compactTools !== false;
  setKindFields();
  updateUrlHint();
  bindEvents();
  document.documentElement.dataset.appReady = "true";
  renderSaved();
  registerServiceWorker();

  const raw = location.hash.replace(/^#\/?/, "");
  const view = raw.split("/")[0] || "";
  if (view === "settings") {
    showView("settings");
    return;
  }
  if (view === "chat" || view === "sessions") {
    const ok = await restoreActive();
    if (!ok) {
      navigate("connect");
      return;
    }
    await handleRoute();
    return;
  }
  const connection = getActiveConnection();
  if (connection) {
    const ok = await restoreActive();
    if (ok) return;
  }
  showView("connect");
}

boot().catch((error) => {
  console.error(error);
  showView("connect");
  setFormStatus(errorMessage(error), "error");
});
