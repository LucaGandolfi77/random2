function now() {
  return Date.now();
}

function permissionTitle(id, properties) {
  if (properties.title) return properties.title;
  if (properties.permission) {
    const target = Array.isArray(properties.patterns) && properties.patterns.length
      ? properties.patterns.join(", ")
      : properties.permission;
    return `Allow ${properties.permission}?`;
  }
  return "Agent approval requested";
}

function permissionDescription(properties) {
  if (properties.message) return properties.message;
  if (properties.metadata?.command) return properties.metadata.command;
  if (properties.metadata?.path) return properties.metadata.path;
  if (properties.patterns?.length) return properties.patterns.join("\n");
  if (properties.metadata) {
    try {
      return JSON.stringify(properties.metadata, null, 2);
    } catch {
      return "";
    }
  }
  return "";
}

export class Timeline {
  constructor(sessionID) {
    this.sessionID = sessionID;
    this.messages = new Map();
    this.order = [];
    this.permissions = new Map();
    this.todos = [];
    this.diff = null;
    this.status = { type: "idle" };
    this.error = "";
    this.notices = [];
    this.sessionInfo = null;
  }

  reset(snapshot) {
    this.messages.clear();
    this.order = [];
    this.permissions.clear();
    this.todos = Array.isArray(snapshot?.todos) ? snapshot.todos : [];
    this.diff = snapshot?.diff || null;
    this.status = { type: "idle" };
    this.error = "";
    for (const message of snapshot?.messages || []) {
      if (!message?.info?.id) continue;
      this._ensureMessage(message.info);
      for (const part of message.parts || []) this._putPart(part);
    }
  }

  _ensureMessage(info) {
    if (!info?.id) return null;
    if (!this.messages.has(info.id)) {
      this.messages.set(info.id, { info, parts: new Map(), order: [] });
      this.order.push(info.id);
    } else {
      this.messages.get(info.id).info = { ...this.messages.get(info.id).info, ...info };
    }
    return this.messages.get(info.id);
  }

  _guessRole(messageID) {
    if (messageID?.includes("-user-")) return "user";
    return "assistant";
  }

  _putPart(part) {
    if (!part?.id || !part.messageID) return false;
    let message = this.messages.get(part.messageID);
    if (!message) {
      message = this._ensureMessage({
        id: part.messageID,
        sessionID: part.sessionID || this.sessionID,
        role: this._guessRole(part.messageID),
        time: { created: now() },
      });
    }
    if (!message) return false;
    if (!message.parts.has(part.id)) message.order.push(part.id);
    const previous = message.parts.get(part.id);
    message.parts.set(part.id, previous ? { ...previous, ...part } : part);
    return true;
  }

  _sessionID(properties) {
    return properties?.sessionID || properties?.info?.sessionID || null;
  }

  apply(event) {
    if (!event || typeof event !== "object") return false;
    if (event.type === "server.connected" || event.type === "server.closed") return false;
    const properties = event.properties || event.payload?.properties || {};
    const sessionID =
      properties.sessionID ||
      properties.info?.sessionID ||
      properties.part?.sessionID ||
      event.sessionID ||
      null;
    if (sessionID && sessionID !== this.sessionID) return false;

    switch (event.type) {
      case "message.updated": {
        if (!properties.info) return false;
        return Boolean(this._ensureMessage(properties.info));
      }
      case "message.removed": {
        const id = properties.messageID || properties.info?.id;
        if (!id) return false;
        this.messages.delete(id);
        this.order = this.order.filter((item) => item !== id);
        return true;
      }
      case "message.part.updated":
        return this._putPart(properties.part);
      case "message.part.removed": {
        const message = this.messages.get(properties.messageID);
        if (!message) return false;
        message.parts.delete(properties.partID);
        message.order = message.order.filter((id) => id !== properties.partID);
        return true;
      }
      case "permission.updated":
      case "permission.asked": {
        const id = properties.id || properties.requestID;
        if (!id) return false;
        const title = permissionTitle(id, properties);
        this.permissions.set(id, {
          id,
          title,
          description: permissionDescription(properties),
          kind: properties.kind || properties.permission || "permission",
          metadata: properties.metadata || {},
          options: properties.options || null,
          patterns: properties.patterns || [],
          time: properties.time || { created: now() },
        });
        return true;
      }
      case "permission.replied": {
        const id = properties.requestID || properties.permissionID || properties.id;
        return this.permissions.delete(id);
      }
      case "session.status": {
        const next = properties.status || { type: "idle" };
        this.status = next;
        if (next.type === "busy" || next.type === "retry") this.error = "";
        return true;
      }
      case "session.idle":
        this.status = { type: "idle" };
        return true;
      case "session.error": {
        const error = properties.error;
        this.error = typeof error === "string"
          ? error
          : error?.message || error?.title || error?.code || "The agent reported an error.";
        this.status = { type: "idle" };
        return true;
      }
      case "todo.updated":
        this.todos = Array.isArray(properties.todos) ? properties.todos : [];
        return true;
      case "session.diff":
        this.diff = Array.isArray(properties.diff) ? properties.diff : [];
        return true;
      case "session.updated":
      case "session.created":
        if (properties.info?.id === this.sessionID || properties.sessionID === this.sessionID) {
          this.sessionInfo = { ...(this.sessionInfo || {}), ...properties.info };
          return true;
        }
        return false;
      case "extension.notification":
        this.notices.push({ message: properties.message, level: properties.level || "info", time: now() });
        if (this.notices.length > 4) this.notices.shift();
        return true;
      default:
        return false;
    }
  }

  isBusy() {
    return this.status?.type === "busy" || this.status?.type === "retry";
  }

  messagesInOrder() {
    return this.order
      .map((id) => this.messages.get(id))
      .filter(Boolean)
      .sort((a, b) => {
        const ta = Number(a.info?.time?.created || 0);
        const tb = Number(b.info?.time?.created || 0);
        if (ta !== tb) return ta - tb;
        return this.order.indexOf(a.info.id) - this.order.indexOf(b.info.id);
      })
      .map((message) => ({
        info: message.info,
        parts: message.order.map((id) => message.parts.get(id)).filter(Boolean),
      }));
  }

  pendingPermissions() {
    return [...this.permissions.values()];
  }
}
