import { randomUUID } from "node:crypto";

function event(type, properties) {
  return { type, properties };
}

export function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part) => part && part.type === "text")
    .map((part) => part.text || "")
    .join("");
}

export function outputFromResult(result) {
  if (!result) return "";
  if (typeof result === "string") return result;
  if (Array.isArray(result)) {
    return result
      .map((part) => {
        if (!part) return "";
        if (part.type === "text") return part.text || "";
        if (part.type === "image") return "[image]";
        return typeof part === "string" ? part : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof result.content !== "undefined") return outputFromResult(result.content);
  if (typeof result.output === "string") return result.output;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function isoNow() {
  return Date.now();
}

export class PiProjection {
  constructor(sessionID) {
    this.sessionID = sessionID;
    this._reset();
  }

  _reset() {
    this.messages = new Map();
    this.order = [];
    this.parts = new Map();
    this.partOrder = new Map();
    this.byToolCall = new Map();
    this.currentAssistantId = null;
    this.counter = 0;
    this.pendingUi = new Map();
    this.todos = [];
    this.diff = null;
  }

  _nextMessageId(role) {
    this.counter += 1;
    return `pc-${this.sessionID.slice(0, 8)}-${this.counter}-${role}-${randomUUID().slice(0, 8)}`;
  }

  _ensureMessage(info) {
    if (!this.messages.has(info.id)) {
      this.messages.set(info.id, { info, parts: [] });
      this.parts.set(info.id, new Map());
      this.partOrder.set(info.id, []);
      this.order.push(info.id);
    } else {
      const record = this.messages.get(info.id);
      record.info = { ...record.info, ...info };
    }
    return this.messages.get(info.id);
  }

  _putPart(messageId, part) {
    this._ensureMessage({
      id: messageId,
      role: this.messages.get(messageId)?.info.role || "assistant",
      sessionID: this.sessionID,
      time: { created: part.time?.created || isoNow() },
    });
    const parts = this.parts.get(messageId);
    const order = this.partOrder.get(messageId);
    if (!parts.has(part.id)) order.push(part.id);
    const previous = parts.get(part.id);
    parts.set(part.id, previous ? { ...previous, ...part } : part);
    return parts.get(part.id);
  }

  _getPart(messageId, partId) {
    return this.parts.get(messageId)?.get(partId) || null;
  }

  _removePart(messageId, partId) {
    const parts = this.parts.get(messageId);
    if (!parts || !parts.has(partId)) return false;
    parts.delete(partId);
    const order = this.partOrder.get(messageId) || [];
    this.partOrder.set(
      messageId,
      order.filter((id) => id !== partId),
    );
    return true;
  }

  _messageEvents(info) {
    const events = [event("message.updated", { info })];
    const parts = this.parts.get(info.id);
    const order = this.partOrder.get(info.id) || [];
    if (parts) {
      for (const id of order) {
        const part = parts.get(id);
        if (part) events.push(event("message.part.updated", { part }));
      }
    }
    return events;
  }

  _textPart(messageId, index, kind, text) {
    return {
      id: `${messageId}:${kind}:${index}`,
      messageID: messageId,
      sessionID: this.sessionID,
      type: kind,
      text: text || "",
    };
  }

  _toolPart(messageId, call, existing) {
    const id = `${messageId}:tool:${call.id}`;
    const state = existing?.state || {};
    return {
      id,
      messageID: messageId,
      sessionID: this.sessionID,
      type: "tool",
      callID: call.id,
      tool: existing?.tool || call.name || "tool",
      state: {
        status: state.status || "running",
        input: typeof call.arguments !== "undefined" ? call.arguments : state.input || {},
        output: state.output || "",
        title: state.title || call.name || "tool",
        time: { start: state.time?.start || isoNow(), end: state.time?.end || null },
        error: state.error || "",
        rawInput: state.rawInput || "",
      },
    };
  }

  _contentParts(messageId, content, existing = new Map()) {
    const result = [];
    const used = new Set();
    if (typeof content === "string") {
      const part = existing.get(`${messageId}:text:0`) || this._textPart(messageId, 0, "text", content);
      part.text = content;
      result.push(part);
      used.add(part.id);
      return { parts: result, used };
    }
    if (!Array.isArray(content)) return { parts: result, used };
    content.forEach((block, index) => {
      if (!block || typeof block !== "object") return;
      if (block.type === "text") {
        const part = existing.get(`${messageId}:text:${index}`) || this._textPart(messageId, index, "text", "");
        part.text = block.text || "";
        result.push(part);
        used.add(part.id);
      } else if (block.type === "thinking") {
        const part =
          existing.get(`${messageId}:reasoning:${index}`) ||
          this._textPart(messageId, index, "reasoning", "");
        part.text = block.thinking || "";
        result.push(part);
        used.add(part.id);
      } else if (block.type === "toolCall") {
        const part = this._toolPart(messageId, block, this.byToolCall.get(block.id));
        result.push(part);
        used.add(part.id);
      } else if (block.type === "image") {
        result.push({
          id: `${messageId}:file:${index}`,
          messageID: messageId,
          sessionID: this.sessionID,
          type: "file",
          filename: "image",
          mime: block.mimeType || "image/png",
          url: "",
        });
      }
    });
    return { parts: result, used };
  }

  hydrate(messages) {
    this._reset();
    const list = Array.isArray(messages) ? messages : [];
    let assistantId = null;
    list.forEach((message, index) => {
      if (!message || !message.role) return;
      if (message.role === "toolResult") {
        this._applyToolResultMessage(message);
        return;
      }
      const id = `h-${index}-${message.role}`;
      const info = this._info(id, message);
      this._ensureMessage(info);
      if (message.role === "assistant") assistantId = id;
      if (message.role === "bashExecution") {
        this._putPart(id, {
          id: `${id}:text:0`,
          messageID: id,
          sessionID: this.sessionID,
          type: "text",
          text: `$ ${message.command || ""}\n${message.output || ""}`.trim(),
        });
        return;
      }
      const { parts } = this._contentParts(id, message.content);
      for (const part of parts) {
        this._putPart(id, part);
        if (part.type === "tool") this.byToolCall.set(part.callID, part);
      }
    });
    this.currentAssistantId = assistantId;
    return this.snapshot();
  }

  _info(id, message) {
    const info = {
      id,
      role: message.role === "toolResult" ? "tool" : message.role,
      sessionID: this.sessionID,
      time: { created: message.timestamp || isoNow() },
    };
    if (message.provider) info.providerID = message.provider;
    if (message.model) info.modelID = message.model;
    if (message.usage) info.usage = message.usage;
    if (message.stopReason) info.stopReason = message.stopReason;
    if (message.errorMessage) info.error = message.errorMessage;
    if (message.role === "bashExecution") {
      info.role = "bash";
      info.exitCode = message.exitCode;
    }
    return info;
  }

  _applyToolResultMessage(message) {
    let part = this.byToolCall.get(message.toolCallId);
    if (!part) {
      const id = this._nextMessageId("tool");
      this._ensureMessage({
        id,
        role: "tool",
        sessionID: this.sessionID,
        time: { created: message.timestamp || isoNow() },
      });
      part = {
        id: `${id}:tool:${message.toolCallId || randomUUID()}`,
        messageID: id,
        sessionID: this.sessionID,
        type: "tool",
        callID: message.toolCallId,
        tool: message.toolName || "tool",
        state: { status: "completed", input: {}, output: "", title: message.toolName || "tool" },
      };
      this._putPart(id, part);
      this.byToolCall.set(part.callID, part);
    }
    const target = this._getPart(part.messageID, part.id) || part;
    target.state = {
      ...(target.state || {}),
      status: message.isError ? "error" : "completed",
      output: outputFromResult(message.content),
      error: message.isError ? outputFromResult(message.content) : "",
      time: { ...(target.state?.time || {}), end: message.timestamp || isoNow() },
    };
    this._putPart(target.messageID, target);
    return target;
  }

  snapshot() {
    return {
      messages: this.order
        .map((id) => this.messages.get(id))
        .filter(Boolean)
        .map((record) => ({
          info: record.info,
          parts: (this.partOrder.get(record.info.id) || [])
            .map((partId) => this.parts.get(record.info.id)?.get(partId))
            .filter(Boolean),
        })),
      todos: this.todos,
      diff: this.diff,
    };
  }

  handle(record) {
    if (!record || typeof record !== "object") return [];
    switch (record.type) {
      case "message_start":
        return this._onMessageStart(record);
      case "message_update":
        return this._onMessageUpdate(record);
      case "message_end":
        return this._onMessageEnd(record);
      case "tool_execution_start":
        return this._onToolExecution(record, "start");
      case "tool_execution_update":
        return this._onToolExecution(record, "update");
      case "tool_execution_end":
        return this._onToolExecution(record, "end");
      case "turn_end":
        return this._onTurnEnd(record);
      case "agent_start":
        return [event("session.status", { sessionID: this.sessionID, status: { type: "busy" } })];
      case "agent_settled":
        this.currentAssistantId = null;
        return [event("session.idle", { sessionID: this.sessionID })];
      case "auto_retry_start":
        return [
          event("session.status", {
            sessionID: this.sessionID,
            status: { type: "busy", message: `Retrying (${record.attempt}/${record.maxAttempts})` },
          }),
        ];
      case "compaction_start":
        return [
          event("session.status", {
            sessionID: this.sessionID,
            status: { type: "busy", message: "Compacting conversation" },
          }),
        ];
      case "session_info_changed":
        return [
          event("session.updated", {
            info: { sessionID: this.sessionID, title: record.name || "" },
          }),
        ];
      case "extension_ui_request":
        return this._onExtensionUi(record);
      case "extension_error":
        return [event("session.error", { sessionID: this.sessionID, error: record.error })];
      default:
        return [];
    }
  }

  _onMessageStart(record) {
    const message = record.message || {};
    const role = message.role || "assistant";
    const id = this._nextMessageId(role);
    if (role === "assistant") this.currentAssistantId = id;
    const info = this._info(id, message);
    this._ensureMessage(info);
    const events = [event("message.updated", { info })];
    if (role !== "assistant") {
      const { parts } = this._contentParts(id, message.content);
      for (const part of parts) {
        this._putPart(id, part);
        if (part.type === "tool") this.byToolCall.set(part.callID, part);
        events.push(event("message.part.updated", { part }));
      }
    }
    return events;
  }

  _currentAssistant() {
    if (!this.currentAssistantId) {
      const id = this._nextMessageId("assistant");
      this.currentAssistantId = id;
      this._ensureMessage({
        id,
        role: "assistant",
        sessionID: this.sessionID,
        time: { created: isoNow() },
      });
    }
    return this.currentAssistantId;
  }

  _onMessageUpdate(record) {
    const messageId = this._currentAssistant();
    const info = this.messages.get(messageId).info;
    if (record.usage) info.usage = record.usage;
    const update = record.assistantMessageEvent || {};
    const events = [];
    const existing = this.parts.get(messageId);
    if (!existing) return [];
    const put = (part, delta) => {
      const stored = this._putPart(messageId, part);
      events.push(event("message.part.updated", { part: stored, delta }));
    };
    const textPart = (index, kind) => {
      const id = `${messageId}:${kind}:${index}`;
      return (
        this._getPart(messageId, id) ||
        this._textPart(messageId, index, kind, "")
      );
    };
    switch (update.type) {
      case "text_start":
        put(textPart(update.contentIndex || 0, "text"));
        break;
      case "text_delta": {
        const part = textPart(update.contentIndex || 0, "text");
        part.text = (part.text || "") + (update.delta || "");
        put(part, update.delta || "");
        break;
      }
      case "text_end": {
        const part = textPart(update.contentIndex || 0, "text");
        part.text = update.content || part.text || "";
        put(part);
        break;
      }
      case "thinking_start":
        put(textPart(update.contentIndex || 0, "reasoning"));
        break;
      case "thinking_delta": {
        const part = textPart(update.contentIndex || 0, "reasoning");
        part.text = (part.text || "") + (update.delta || "");
        put(part, update.delta || "");
        break;
      }
      case "thinking_end": {
        const part = textPart(update.contentIndex || 0, "reasoning");
        part.text = update.content || part.text || "";
        put(part);
        break;
      }
      case "toolcall_start": {
        const call = {
          id: update.id,
          name: update.toolName,
          arguments: {},
        };
        const part = this._toolPart(messageId, call, this.byToolCall.get(update.id));
        part.state.status = "running";
        this.byToolCall.set(update.id, part);
        put(part);
        break;
      }
      case "toolcall_delta": {
        const part = this.byToolCall.get(update.id);
        if (part) {
          part.state.rawInput = (part.state.rawInput || "") + (update.delta || "");
          put(part);
        }
        break;
      }
      case "toolcall_end": {
        const call = update.toolCall || { id: update.id, name: update.toolName, arguments: {} };
        const part = this._toolPart(messageId, call, this.byToolCall.get(call.id));
        part.state.input = call.arguments || {};
        part.tool = call.name || part.tool;
        part.state.status = "running";
        this.byToolCall.set(call.id, part);
        put(part);
        break;
      }
      case "done":
        if (update.message && update.message.usage) info.usage = update.message.usage;
        break;
      case "error":
        info.error = update.error || update.reason || "Provider error";
        info.stopReason = "error";
        events.push(event("session.error", { sessionID: this.sessionID, error: info.error }));
        break;
      default:
        break;
    }
    if (record.usage) events.unshift(event("message.updated", { info }));
    return events;
  }

  _onMessageEnd(record) {
    const message = record.message || {};
    const role = message.role || "assistant";
    let messageId = role === "assistant" ? this.currentAssistantId : null;
    if (!messageId) {
      messageId = this.order
        .slice()
        .reverse()
        .map((id) => this.messages.get(id))
        .find((m) => m && m.info.role === role)?.info.id;
    }
    if (!messageId) {
      messageId = this._nextMessageId(role);
      this._ensureMessage(this._info(messageId, message));
    }
    const recordInfo = this.messages.get(messageId);
    recordInfo.info = { ...recordInfo.info, ...this._info(messageId, message) };
    const existing = this.parts.get(messageId) || new Map();
    const { parts, used } = this._contentParts(messageId, message.content, existing);
    const events = [event("message.updated", { info: recordInfo.info })];
    for (const part of parts) {
      this._putPart(messageId, part);
      if (part.type === "tool") this.byToolCall.set(part.callID, part);
      events.push(event("message.part.updated", { part }));
    }
    for (const [partId] of existing) {
      if (!used.has(partId)) {
        this._removePart(messageId, partId);
        events.push(event("message.part.removed", { sessionID: this.sessionID, messageID: messageId, partID: partId }));
      }
    }
    if (role === "assistant") this.currentAssistantId = null;
    if (recordInfo.info.stopReason === "error" && recordInfo.info.error) {
      events.push(event("session.error", { sessionID: this.sessionID, error: recordInfo.info.error }));
    }
    return events;
  }

  _onToolExecution(record, phase) {
    let part = this.byToolCall.get(record.toolCallId);
    if (!part) {
      const id = this._nextMessageId("tool");
      this._ensureMessage({
        id,
        role: "tool",
        sessionID: this.sessionID,
        time: { created: isoNow() },
      });
      part = {
        id: `${id}:tool:${record.toolCallId}`,
        messageID: id,
        sessionID: this.sessionID,
        type: "tool",
        callID: record.toolCallId,
        tool: record.toolName || "tool",
        state: { status: "running", input: record.args || {}, output: "", title: record.toolName, time: { start: isoNow() } },
      };
      this.byToolCall.set(record.toolCallId, part);
    }
    if (phase === "start") {
      part.state = {
        ...part.state,
        status: "running",
        input: record.args || part.state?.input || {},
        time: { start: part.state?.time?.start || isoNow() },
      };
    } else if (phase === "update") {
      const output = outputFromResult(record.partialResult);
      if (output) part.state.output = output;
    } else {
      const output = outputFromResult(record.result);
      part.state = {
        ...part.state,
        status: record.isError ? "error" : "completed",
        output: output || part.state?.output || "",
        error: record.isError ? output : part.state?.error || "",
        time: { ...(part.state?.time || {}), end: isoNow() },
        durationMs: record.durationMs,
      };
    }
    this._putPart(part.messageID, part);
    return [event("message.part.updated", { part })];
  }

  _onTurnEnd(record) {
    const events = [];
    for (const result of record.toolResults || []) {
      const part = this._applyToolResultMessage(result);
      if (part) events.push(event("message.part.updated", { part }));
    }
    return events;
  }

  _onExtensionUi(record) {
    if (record.method === "notify") {
      return [
        event("extension.notification", {
          sessionID: this.sessionID,
          message: record.message,
          level: record.notifyType || "info",
        }),
      ];
    }
    if (["setStatus", "setWidget", "setTitle", "set_editor_text"].includes(record.method)) {
      return [];
    }
    this.pendingUi.set(record.id, record);
    return [
      event("permission.updated", {
        id: record.id,
        sessionID: this.sessionID,
        title: record.title || record.message || "Agent request",
        metadata: record,
        kind: record.method,
        options:
          record.options ||
          (record.method === "confirm" ? ["Allow", "Deny"] : []),
        time: { created: isoNow() },
      }),
    ];
  }

  resolveUi(id, response) {
    if (!this.pendingUi.has(id)) return null;
    this.pendingUi.delete(id);
    return event("permission.replied", {
      sessionID: this.sessionID,
      permissionID: id,
      response: response?.cancelled ? "cancelled" : "replied",
    });
  }
}
