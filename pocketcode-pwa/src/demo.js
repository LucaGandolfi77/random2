function id(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const now = () => Date.now();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MODELS = [
  { id: "deepseek-v4.1-flash", provider: "opencode", providerName: "OpenCode", name: "DeepSeek V4.1 Flash", reasoning: true },
  { id: "claude-sonnet", provider: "anthropic", providerName: "Anthropic", name: "Claude Sonnet", reasoning: true },
  { id: "gpt-5.1-codex", provider: "openai", providerName: "OpenAI", name: "GPT-5.1 Codex", reasoning: true },
  { id: "gemini-3-flash", provider: "google", providerName: "Google", name: "Gemini 3 Flash", reasoning: true },
  { id: "qwen3-coder", provider: "local", providerName: "Local", name: "Qwen3 Coder", reasoning: false },
];

const AGENTS = [
  { name: "build", description: "Writes code and runs tools.", mode: "primary" },
  { name: "plan", description: "Reads and proposes without editing.", mode: "primary" },
  { name: "explore", description: "Searches the codebase.", mode: "subagent" },
];

function initialSessions() {
  const created = now() - 1000 * 60 * 47;
  const updated = now() - 1000 * 60 * 6;
  return [
    {
      id: "demo_session_1",
      title: "Polish the settings screen",
      createdAt: new Date(created).toISOString(),
      updatedAt: new Date(updated).toISOString(),
      workspace: "~/projects/pocketcode",
    },
    {
      id: "demo_session_2",
      title: "Find the flaky checkout test",
      createdAt: new Date(now() - 1000 * 60 * 60 * 20).toISOString(),
      updatedAt: new Date(now() - 1000 * 60 * 60 * 19).toISOString(),
      workspace: "~/projects/pocketcode",
    },
  ];
}

function initialSnapshot(sessionID) {
  if (sessionID !== "demo_session_1") return { messages: [], todos: [], diff: [] };
  const t = now() - 1000 * 60 * 6;
  return {
    messages: [
      {
        info: { id: "demo_msg_u1", sessionID, role: "user", time: { created: t } },
        parts: [
          {
            id: "demo_prt_u1",
            messageID: "demo_msg_u1",
            sessionID,
            type: "text",
            text: "Can you make the settings screen feel less cramped on an iPhone?",
          },
        ],
      },
      {
        info: {
          id: "demo_msg_a1",
          sessionID,
          role: "assistant",
          time: { created: t + 1200 },
          modelID: "deepseek-v4.1-flash",
          providerID: "opencode",
        },
        parts: [
          {
            id: "demo_prt_a1",
            messageID: "demo_msg_a1",
            sessionID,
            type: "reasoning",
            text: "The settings screen stacks four panels with identical spacing. I should inspect the CSS, then increase the breathing room between sections and make the toggles easier to hit.",
          },
          {
            id: "demo_prt_a2",
            messageID: "demo_msg_a1",
            sessionID,
            type: "text",
            text: "I found it. The panels were using the same vertical gap as list rows, so on a narrow screen everything pressed together.\n\nI increased the spacing, widened the toggle hit area, and kept the bottom safe area clear.",
          },
          {
            id: "demo_prt_a3",
            messageID: "demo_msg_a1",
            sessionID,
            type: "tool",
            callID: "demo_call_1",
            tool: "edit",
            state: {
              status: "completed",
              title: "styles.css",
              input: { file: "pocketcode-pwa/styles.css", change: "panel spacing and toggle rows" },
              output: "Updated styles.css (+18 −6)",
              time: { start: t + 1800, end: t + 2600 },
            },
          },
        ],
      },
    ],
    todos: [
      { content: "Inspect settings layout", status: "completed", priority: "high" },
      { content: "Increase panel spacing on narrow screens", status: "completed", priority: "medium" },
    ],
    diff: [
      {
        file: "pocketcode-pwa/styles.css",
        patch: "@@ -921,7 +921,9 @@\n .panel + .panel {\n-  margin-top: 8px;\n+  margin-top: 14px;\n }\n+\n+.toggle-row { padding: 12px 0; }",
        additions: 3,
        deletions: 1,
        status: "modified",
      },
    ],
  };
}

export class DemoAdapter {
  constructor(connection) {
    this.connection = connection;
    this.kind = "demo";
    this.baseUrl = "";
    this.sessions = initialSessions();
    this.snapshots = new Map();
    this.subscribers = new Set();
    this.seq = 0;
    this.preferredModel = MODELS[0];
    this.preferredAgent = "build";
    this.aborted = false;
    this.run = 0;
    this.pendingPermission = null;
    this.permissionSeq = 0;
  }

  get label() {
    return "Demo workspace";
  }

  _emit(event) {
    this.seq += 1;
    const payload = { ...event, seq: this.seq };
    for (const subscriber of this.subscribers) subscriber(payload);
  }

  _snapshot(sessionID) {
    if (!this.snapshots.has(sessionID)) this.snapshots.set(sessionID, initialSnapshot(sessionID));
    return this.snapshots.get(sessionID);
  }

  _addMessage(sessionID, info) {
    const snapshot = this._snapshot(sessionID);
    const existing = snapshot.messages.find((message) => message.info.id === info.id);
    if (!existing) snapshot.messages.push({ info, parts: [] });
    this._emit({ type: "message.updated", sessionID, properties: { sessionID, info } });
    return existing || snapshot.messages.at(-1);
  }

  _addPart(sessionID, part) {
    const snapshot = this._snapshot(sessionID);
    let message = snapshot.messages.find((item) => item.info.id === part.messageID);
    if (!message) {
      message = this._addMessage(sessionID, {
        id: part.messageID,
        sessionID,
        role: "assistant",
        time: { created: now() },
      });
    }
    const existing = message.parts.find((item) => item.id === part.id);
    if (existing) Object.assign(existing, part);
    else message.parts.push(part);
    this._emit({ type: "message.part.updated", sessionID, properties: { sessionID, part } });
    return part;
  }

  async health() {
    return {
      ok: true,
      name: "PocketCode demo",
      version: "1.0",
      agentVersion: "demo",
      workspace: "~/projects/pocketcode",
    };
  }

  async listSessions() {
    return this.sessions.map((session) => ({ ...session }));
  }

  async createSession({ title = "" } = {}) {
    const session = {
      id: id("demo_session"),
      title: title || "New demo session",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workspace: "~/projects/pocketcode",
    };
    this.sessions.unshift(session);
    this.snapshots.set(session.id, { messages: [], todos: [], diff: [] });
    return { ...session };
  }

  async renameSession(sessionID, title) {
    const session = this.sessions.find((item) => item.id === sessionID);
    if (session) {
      session.title = title;
      session.updatedAt = new Date().toISOString();
    }
    return session ? { ...session } : null;
  }

  async deleteSession(sessionID) {
    this.sessions = this.sessions.filter((item) => item.id !== sessionID);
    this.snapshots.delete(sessionID);
  }

  async history(sessionID) {
    return structuredClone(this._snapshot(sessionID));
  }

  async models() {
    return MODELS.slice();
  }

  async agents() {
    return AGENTS.slice();
  }

  async setModel(sessionID, model) {
    this.preferredModel = model;
  }

  setAgent(agent) {
    this.preferredAgent = agent;
  }

  async prompt(sessionID, text) {
    const run = ++this.run;
    this.aborted = false;
    this._run(sessionID, text, run);
    return { accepted: true };
  }

  async _run(sessionID, text, run) {
    const userID = id("demo_msg");
    this._addMessage(sessionID, {
      id: userID,
      sessionID,
      role: "user",
      time: { created: now() },
    });
    this._addPart(sessionID, {
      id: id("demo_prt"),
      messageID: userID,
      sessionID,
      type: "text",
      text,
    });
    const session = this.sessions.find((item) => item.id === sessionID);
    if (session && /^(new demo session|new session)$/i.test(session.title)) session.title = text.slice(0, 54);
    this._emit({ type: "session.status", sessionID, properties: { sessionID, status: { type: "busy" } } });
    await delay(420);
    if (this.aborted || run !== this.run) return;

    const assistantID = id("demo_msg");
    this._addMessage(sessionID, {
      id: assistantID,
      sessionID,
      role: "assistant",
      time: { created: now() },
      modelID: this.preferredModel?.id,
      providerID: this.preferredModel?.provider,
    });
    const textID = id("demo_prt");
    const intro = this.preferredAgent === "plan"
      ? "Here is the plan I would follow.\n\n"
      : "On it. Let me look at the project first.\n\n";
    this._addPart(sessionID, {
      id: textID,
      messageID: assistantID,
      sessionID,
      type: "text",
      text: intro,
    });
    await delay(650);
    if (this.aborted || run !== this.run) return;

    const callID = id("demo_call");
    this._addPart(sessionID, {
      id: `${assistantID}:tool:${callID}`,
      messageID: assistantID,
      sessionID,
      type: "tool",
      callID,
      tool: "bash",
      state: {
        status: "running",
        title: "Run the test suite",
        input: { command: "npm test" },
        output: "",
        time: { start: now() },
      },
    });
    this._emit({
      type: "permission.updated",
      sessionID,
      properties: {
        id: `demo_per_${++this.permissionSeq}`,
        sessionID,
        title: "Run the test suite?",
        message: "The agent wants to run `npm test` in ~/projects/pocketcode.",
        kind: "confirm",
        options: ["Allow", "Deny"],
        metadata: { command: "npm test" },
        time: { created: now() },
      },
    });

    const permissionID = `demo_per_${this.permissionSeq}`;
    const action = await new Promise((resolve) => {
      this.pendingPermission = { id: permissionID, resolve };
    });
    this.pendingPermission = null;
    if (this.aborted || run !== this.run) return;

    if (action === "reject") {
      const snapshot = this._snapshot(sessionID);
      const assistant = snapshot.messages.find((item) => item.info.id === assistantID);
      const tool = assistant?.parts.find((part) => part.callID === callID);
      if (tool) {
        tool.state = {
          ...tool.state,
          status: "error",
          error: "Permission denied by the user.",
          output: "",
          time: { start: tool.state.time?.start, end: now() },
        };
        this._emit({ type: "message.part.updated", sessionID, properties: { sessionID, part: tool } });
      }
      this._addPart(sessionID, {
        id: id("demo_prt"),
        messageID: assistantID,
        sessionID,
        type: "text",
        text: "Understood. I stopped before running anything. Tell me if you want a different approach.",
      });
      this._emit({ type: "session.idle", sessionID, properties: { sessionID } });
      return;
    }

    await delay(700);
    if (this.aborted || run !== this.run) return;
    const snapshot = this._snapshot(sessionID);
    const assistant = snapshot.messages.find((item) => item.info.id === assistantID);
    const tool = assistant?.parts.find((part) => part.callID === callID);
    if (tool) {
      tool.state = {
        ...tool.state,
        status: "completed",
        output: "Test Files  18 passed (18)\nTests       142 passed (142)\nDuration    4.21s",
        time: { start: tool.state.time?.start, end: now() },
      };
      this._emit({ type: "message.part.updated", sessionID, properties: { sessionID, part: tool } });
    }
    this._addPart(sessionID, {
      id: id("demo_prt"),
      messageID: assistantID,
      sessionID,
      type: "text",
      text: "All 142 tests pass. I also tightened the settings spacing. The demo keeps everything on this device — pair a real bridge when you want your own files.",
    });
    this._emit({ type: "session.idle", sessionID, properties: { sessionID } });
  }

  async abort(sessionID) {
    this.aborted = true;
    this.pendingPermission?.resolve("reject");
    this._emit({ type: "session.idle", sessionID, properties: { sessionID } });
  }

  async respondPermission(sessionID, permission, action) {
    this._emit({
      type: "permission.replied",
      sessionID,
      properties: { sessionID, requestID: permission.id, reply: action },
    });
    if (this.pendingPermission?.id === permission.id) {
      this.pendingPermission.resolve(action);
    }
  }

  async diff() {
    return [];
  }

  subscribe({ onEvent, onStatus, onError }) {
    const subscriber = (event) => onEvent(event);
    this.subscribers.add(subscriber);
    onStatus?.("open", { reconnect: false });
    return {
      stop: () => {
        this.subscribers.delete(subscriber);
        onStatus?.("closed");
      },
      fail: (error) => onError?.(error),
    };
  }
}
