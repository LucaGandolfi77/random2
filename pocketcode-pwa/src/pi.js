import { request, stripSlash } from "./http.js";
import { SseClient } from "./sse.js";

export class PiAdapter {
  constructor(connection) {
    this.connection = connection;
    this.kind = "pi";
    this.baseUrl = stripSlash(connection.baseUrl);
    this.token = connection.token || "";
  }

  get label() {
    return this.connection.name || this.baseUrl;
  }

  headers() {
    return this.token ? { authorization: `Bearer ${this.token}` } : {};
  }

  async health() {
    const data = await request(this.baseUrl, "/api/health", { headers: this.headers() });
    return {
      ok: Boolean(data?.ok),
      name: data?.name || "PocketCode bridge",
      version: data?.version || "",
      agentVersion: data?.pi?.version || "",
      workspace: data?.workspace?.name || data?.workspace?.path || "",
    };
  }

  async listSessions() {
    const data = await request(this.baseUrl, "/api/sessions", { headers: this.headers() });
    return (data?.sessions || []).map((session) => ({
      id: session.id,
      title: session.title || "Untitled session",
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
      workspace: session.workspace || "",
    }));
  }

  async createSession({ title = "" } = {}) {
    const data = await request(this.baseUrl, "/api/sessions", {
      method: "POST",
      headers: this.headers(),
      body: { title },
    });
    return data?.session;
  }

  async renameSession(sessionID, title) {
    const data = await request(this.baseUrl, `/api/sessions/${encodeURIComponent(sessionID)}`, {
      method: "PATCH",
      headers: this.headers(),
      body: { title },
    });
    return data?.session;
  }

  async deleteSession(sessionID) {
    await request(this.baseUrl, `/api/sessions/${encodeURIComponent(sessionID)}`, {
      method: "DELETE",
      headers: this.headers(),
    });
  }

  async history(sessionID) {
    return request(this.baseUrl, `/api/sessions/${encodeURIComponent(sessionID)}/messages`, {
      headers: this.headers(),
      timeout: 45000,
    });
  }

  async prompt(sessionID, text, { behavior } = {}) {
    return request(this.baseUrl, `/api/sessions/${encodeURIComponent(sessionID)}/prompt`, {
      method: "POST",
      headers: this.headers(),
      body: { text, ...(behavior ? { behavior } : {}) },
    });
  }

  async abort(sessionID) {
    return request(this.baseUrl, `/api/sessions/${encodeURIComponent(sessionID)}/abort`, {
      method: "POST",
      headers: this.headers(),
    });
  }

  async steer(sessionID, text, followUp = false) {
    return request(
      this.baseUrl,
      `/api/sessions/${encodeURIComponent(sessionID)}/${followUp ? "follow-up" : "steer"}`,
      { method: "POST", headers: this.headers(), body: { text } },
    );
  }

  async models() {
    const data = await request(this.baseUrl, "/api/models", { headers: this.headers(), timeout: 45000 });
    return (data?.models || []).map((model) => ({
      id: model.id,
      provider: model.provider,
      name: model.name || model.id,
      reasoning: Boolean(model.reasoning),
    }));
  }

  async agents() {
    return [];
  }

  async setModel(sessionID, model) {
    if (!sessionID) return;
    await request(this.baseUrl, `/api/sessions/${encodeURIComponent(sessionID)}/model`, {
      method: "POST",
      headers: this.headers(),
      body: { provider: model.provider, modelId: model.id },
    });
  }

  async respondPermission(sessionID, permission, action) {
    const value = action === "reject"
      ? "Deny"
      : action === "always"
        ? "Always allow"
        : "Allow";
    await request(
      this.baseUrl,
      `/api/sessions/${encodeURIComponent(sessionID)}/extension-ui/${encodeURIComponent(permission.id)}`,
      {
        method: "POST",
        headers: this.headers(),
        body: { value, ...(action === "reject" ? { cancelled: false } : {}) },
      },
    );
  }

  async diff(sessionID) {
    const snapshot = await this.history(sessionID);
    return snapshot?.diff || [];
  }

  subscribe({ onEvent, onStatus, onError }) {
    const client = new SseClient({
      urlFactory: (lastId) => {
        const numeric = Number(lastId);
        return `${this.baseUrl}/api/events${Number.isFinite(numeric) ? `?after=${numeric}` : ""}`;
      },
      headers: this.headers(),
      onEvent,
      onStatus,
      onError,
    });
    return client.start();
  }

  async pair(code, deviceName = "PocketCode") {
    const data = await request(this.baseUrl, "/api/pair", {
      method: "POST",
      body: { code, deviceName },
    });
    this.token = data?.token || "";
    return data;
  }
}

export async function pairPi(baseUrl, code, deviceName) {
  const clean = stripSlash(baseUrl);
  const data = await request(clean, "/api/pair", {
    method: "POST",
    body: { code, deviceName },
  });
  return { token: data?.token || "", device: data?.device, baseUrl: clean };
}
