#!/usr/bin/env node
import { randomUUID } from "node:crypto";

const sessionFlag = process.argv.indexOf("--session-id");
const sessionID = sessionFlag >= 0 ? process.argv[sessionFlag + 1] : randomUUID();
let sessionName = "Fake Pi session";
let pendingApproval = null;
let turn = 0;
const messages = [];

function write(record) {
  process.stdout.write(JSON.stringify(record) + "\n");
}

function respond(command, data = {}, success = true) {
  write({ type: "response", command: command.type, success, id: command.id, data });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function usage() {
  return {
    input: 10,
    output: 20,
    cacheRead: 0,
    cacheWrite: 0,
    total: 30,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

async function runTurn(command, text) {
  respond(command, { accepted: true });
  const user = {
    role: "user",
    content: [{ type: "text", text }],
    timestamp: Date.now(),
  };
  messages.push(user);
  write({ type: "message_start", message: user });
  write({ type: "message_end", message: user });
  write({ type: "agent_start" });

  if (text.includes("approval")) {
    write({
      type: "extension_ui_request",
      id: "req-approval",
      method: "confirm",
      title: "Run a command?",
      message: "Allow this command?",
      options: ["Allow", "Deny"],
    });
    await new Promise((resolve) => {
      pendingApproval = resolve;
    });
  }

  await wait(20);
  turn += 1;
  const callID = `call-${turn}`;
  const assistant = {
    role: "assistant",
    provider: "fake",
    model: "fake-model",
    content: [],
    usage: usage(),
    stopReason: "stop",
    timestamp: Date.now(),
  };
  write({ type: "message_start", message: assistant });
  write({
    type: "message_update",
    message: assistant,
    usage: usage(),
    assistantMessageEvent: { type: "text_start", contentIndex: 0 },
  });
  write({
    type: "message_update",
    message: assistant,
    usage: usage(),
    assistantMessageEvent: { type: "text_delta", contentIndex: 0, delta: `Hello from turn ${turn}. ` },
  });
  write({
    type: "message_update",
    message: assistant,
    usage: usage(),
    assistantMessageEvent: {
      type: "toolcall_start",
      contentIndex: 1,
      id: callID,
      toolName: "bash",
    },
  });
  write({
    type: "message_update",
    message: assistant,
    usage: usage(),
    assistantMessageEvent: {
      type: "toolcall_delta",
      contentIndex: 1,
      id: callID,
      delta: '{"command":"echo hi"}',
    },
  });
  write({
    type: "message_update",
    message: assistant,
    usage: usage(),
    assistantMessageEvent: {
      type: "toolcall_end",
      contentIndex: 1,
      toolCall: { id: callID, name: "bash", arguments: { command: "echo hi" } },
    },
  });
  write({ type: "tool_execution_start", toolCallId: callID, toolName: "bash", args: { command: "echo hi" } });
  await wait(5);
  write({
    type: "tool_execution_update",
    toolCallId: callID,
    toolName: "bash",
    partialResult: { content: [{ type: "text", text: "hi" }] },
  });
  write({
    type: "tool_execution_end",
    toolCallId: callID,
    toolName: "bash",
    result: { content: [{ type: "text", text: "hi\n" }] },
    isError: false,
    durationMs: 5,
  });
  write({
    type: "message_update",
    message: assistant,
    usage: usage(),
    assistantMessageEvent: { type: "text_delta", contentIndex: 0, delta: "Tool finished." },
  });

  assistant.content = [
    { type: "text", text: `Hello from turn ${turn}. Tool finished.` },
    { type: "toolCall", id: callID, name: "bash", arguments: { command: "echo hi" } },
  ];
  messages.push(assistant);
  write({ type: "message_end", message: assistant });
  await wait(5);
  write({ type: "agent_settled" });
}

process.stdin.setEncoding("utf8");
let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index).replace(/\r$/, "");
    buffer = buffer.slice(index + 1);
    if (!line.trim()) continue;
    let command;
    try {
      command = JSON.parse(line);
    } catch {
      write({ type: "extension_error", error: "Invalid JSON command" });
      continue;
    }
    switch (command.type) {
      case "get_state":
        respond(command, {
          sessionId: sessionID,
          sessionFile: `/tmp/${sessionID}.jsonl`,
          sessionName,
          isStreaming: false,
          messageCount: messages.length,
          pendingMessageCount: 0,
        });
        break;
      case "get_messages":
        respond(command, { messages });
        break;
      case "get_available_models":
        respond(command, {
          models: [
            { provider: "fake", id: "fake-model", name: "Fake Model", reasoning: true },
            { provider: "fake", id: "fake-small", name: "Fake Small", reasoning: false },
          ],
        });
        break;
      case "prompt":
        runTurn(command, command.message || "").catch((error) => {
          write({ type: "extension_error", error: error.message });
        });
        break;
      case "abort":
        respond(command, { aborted: true });
        write({ type: "agent_settled" });
        break;
      case "steer":
      case "follow_up":
        respond(command, { accepted: true });
        break;
      case "set_model":
        respond(command, { provider: command.provider, id: command.modelId });
        break;
      case "set_session_name":
        sessionName = command.name;
        respond(command, { name: sessionName });
        write({ type: "session_info_changed", name: sessionName });
        break;
      case "extension_ui_response":
        if (pendingApproval) {
          const resolve = pendingApproval;
          pendingApproval = null;
          resolve(command);
        }
        break;
      default:
        respond(command, {}, false);
        write({ type: "extension_error", error: `Unknown command ${command.type}` });
        break;
    }
  }
});

process.stdin.on("end", () => {
  process.exit(0);
});
