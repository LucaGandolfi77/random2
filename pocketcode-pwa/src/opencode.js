import { basicAuth, HttpError, request, stripSlash } from "./http.js";
import { SseClient } from "./sse.js";

function normalizeSession(session) {
  return {
    id: session.id,
    title: session.title || "Untitled session",
    updatedAt: session.time?.updated ? new Date(session.time.updated).toISOString() : "",
    createdAt: session.time?.created ? new Date(session.time.created).toISOString() : "",
    workspace: session.directory || "",
    cost: session.cost,
    tokens: session.tokens,
    model: session.model,
  };
}

export class OpenCodeAdapter {
  constructor(connection) {
    this.connection = connection;
    this.kind = "opencode";
    this.baseUrl = stripSlash(connection.baseUrl);
    this.username = connection.username || "opencode";
    this.password = connection.password || "";
    this.preferredModel = connection.model || null;
    this.preferredAgent = connection.agent || "";
  }

  get label() {
    return this.connection.name || this.baseUrl;
  }

  headers() {
    const headers = {};
    if (this.password) {
      headers.authorization = basicAuth(this.username, this.password);
    }
    return headers;
  }

  async health() {
    const data = await request(this.baseUrl, "/global/health", { headers: this.headers() });
    let workspace = "";
    try {
      const paths = await request(this.baseUrl, "/path", { headers: this.headers(), timeout: 10000 });
      workspace = paths?.worktree || paths?.directory || "";
    } catch {
      /* optional */
    }
    return {
      ok: Boolean(data?.healthy),
      name: "OpenCode",
      version: data?.version || "",
      agentVersion: data?.version || "",
      workspace,
    };
  }

  async listSessions() {
    const data = await request(this.baseUrl, "/session?limit=60", { headers: this.headers() });
    return (Array.isArray(data) ? data : []).map(normalizeSession);
  }

  async createSession({ title = "" } = {}) {
    const body = {};
    if (title) body.title = title;
    if (this.preferredModel) {
      body.model = {
        providerID: this.preferredModel.provider,
        id: this.preferredModel.id,
      };
    }
    const data = await request(this.baseUrl, "/session", {
      method: "POST",
      headers: this.headers(),
      body,
    });
    return normalizeSession(data);
  }

  async renameSession(sessionID, title) {
    const data = await request(this.baseUrl, `/session/${encodeURIComponent(sessionID)}`, {
      method: "PATCH",
      headers: this.headers(),
      body: { title },
    });
    return normalizeSession(data);
  }

  async deleteSession(sessionID) {
    await request(this.baseUrl, `/session/${encodeURIComponent(sessionID)}`, {
      method: "DELETE",
      headers: this.headers(),
    });
  }

  async history(sessionID) {
    const path = `/session/${encodeURIComponent(sessionID)}/message?limit=200`;
    const [messages, todos, diff] = await Promise.all([
      request(this.baseUrl, path, { headers: this.headers(), timeout: 45000 }),
      request(this.baseUrl, `/session/${encodeURIComponent(sessionID)}/todo`, {
        headers: this.headers(),
        timeout: 15000,
      }).catch(() => []),
      request(this.baseUrl, `/session/${encodeURIComponent(sessionID)}/diff`, {
        headers: this.headers(),
        timeout: 15000,
      }).catch(() => []),
    ]);
    return {
      messages: Array.isArray(messages) ? messages : [],
      todos: Array.isArray(todos) ? todos : [],
      diff: Array.isArray(diff) ? diff : [],
    };
  }

  async prompt(sessionID, text, { behavior } = {}) {
    const body = { parts: [{ type: "text", text }] };
    if (this.preferredModel) {
      body.model = {
        providerID: this.preferredModel.provider,
        modelID: this.preferredModel.id,
      };
    }
    if (this.preferredAgent) body.agent = this.preferredAgent;
    if (behavior === "steer") body.delivery = "steer";
    return request(this.baseUrl, `/session/${encodeURIComponent(sessionID)}/prompt_async`, {
      method: "POST",
      headers: this.headers(),
      body,
      timeout: 45000,
    });
  }

  async steer(sessionID, text) {
    return this.prompt(sessionID, text, { behavior: "steer" });
  }

  async abort(sessionID) {
    return request(this.baseUrl, `/session/${encodeURIComponent(sessionID)}/abort`, {
      method: "POST",
      headers: this.headers(),
    });
  }

  async models() {
    const data = await request(this.baseUrl, "/config/providers", {
      headers: this.headers(),
      timeout: 30000,
    });
    const models = [];
    for (const provider of data?.providers || []) {
      for (const model of Object.values(provider.models || {})) {
        models.push({
          id: model.id || model.name,
          provider: provider.id,
          providerName: provider.name || provider.id,
          name: model.name || model.id,
          reasoning: Boolean(model.capabilities?.reasoning || model.reasoning),
        });
      }
    }
    models.sort((a, b) => {
      const provider = String(a.providerName).localeCompare(String(b.providerName));
      return provider || String(a.name).localeCompare(String(b.name));
    });
    return models;
  }

  async agents() {
    const data = await request(this.baseUrl, "/agent", { headers: this.headers() });
    return (Array.isArray(data) ? data : [])
      .filter((agent) => agent && agent.name)
      .map((agent) => ({
        name: agent.name,
        description: agent.description || "",
        mode: agent.mode || "",
      }))
      .sort((a, b) => {
        if (a.mode === "primary" && b.mode !== "primary") return -1;
        if (b.mode === "primary" && a.mode !== "primary") return 1;
        return a.name.localeCompare(b.name);
      });
  }

  async setModel(sessionID, model) {
    this.preferredModel = model;
    if (!sessionID) return;
    try {
      await request(this.baseUrl, `/api/session/${encodeURIComponent(sessionID)}/model`, {
        method: "POST",
        headers: this.headers(),
        body: { model: { providerID: model.provider, id: model.id } },
        timeout: 15000,
      });
    } catch {
      /* The model is also sent with each prompt, so this endpoint is optional. */
    }
  }

  setAgent(agent) {
    this.preferredAgent = agent || "";
  }

  async respondPermission(sessionID, permission, action) {
    const reply = action === "reject" ? "reject" : action === "always" ? "always" : "once";
    try {
      await request(
        this.baseUrl,
        `/session/${encodeURIComponent(sessionID)}/permissions/${encodeURIComponent(permission.id)}`,
        {
          method: "POST",
          headers: this.headers(),
          body: { response: reply },
        },
      );
    } catch (error) {
      if (!(error instanceof HttpError) || ![404, 410].includes(error.status)) throw error;
      await request(
        this.baseUrl,
        `/permission/${encodeURIComponent(permission.id)}/reply`,
        {
          method: "POST",
          headers: this.headers(),
          body: { reply },
        },
      );
    }
  }

  async diff(sessionID) {
    return request(this.baseUrl, `/session/${encodeURIComponent(sessionID)}/diff`, {
      headers: this.headers(),
    });
  }

  subscribe({ onEvent, onStatus, onError }) {
    const client = new SseClient({
      urlFactory: () => `${this.baseUrl}/event`,
      headers: this.headers(),
      onEvent,
      onStatus,
      onError,
    });
    return client.start();
  }
}
