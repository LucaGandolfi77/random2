import test from "node:test";
import assert from "node:assert/strict";
import { PiProjection, outputFromResult, textFromContent } from "../projection.mjs";

const usage = { input: 10, output: 5, total: 15 };

function streamAssistant() {
  const projection = new PiProjection("session-1");
  const events = [];
  events.push(
    ...projection.handle({
      type: "message_start",
      message: { role: "user", content: [{ type: "text", text: "Run it" }], timestamp: 1 },
    }),
  );
  events.push(
    ...projection.handle({
      type: "message_end",
      message: { role: "user", content: [{ type: "text", text: "Run it" }], timestamp: 1 },
    }),
  );
  events.push(...projection.handle({ type: "agent_start" }));
  events.push(
    ...projection.handle({
      type: "message_start",
      message: { role: "assistant", content: [], usage, timestamp: 2 },
    }),
  );
  events.push(
    ...projection.handle({
      type: "message_update",
      usage,
      assistantMessageEvent: { type: "text_start", contentIndex: 0 },
    }),
  );
  events.push(
    ...projection.handle({
      type: "message_update",
      usage,
      assistantMessageEvent: { type: "text_delta", contentIndex: 0, delta: "Sure" },
    }),
  );
  events.push(
    ...projection.handle({
      type: "message_update",
      usage,
      assistantMessageEvent: {
        type: "toolcall_start",
        contentIndex: 1,
        id: "call-1",
        toolName: "bash",
      },
    }),
  );
  events.push(
    ...projection.handle({
      type: "message_update",
      usage,
      assistantMessageEvent: {
        type: "toolcall_delta",
        contentIndex: 1,
        id: "call-1",
        delta: '{"command":"echo hi"}',
      },
    }),
  );
  events.push(
    ...projection.handle({
      type: "message_update",
      usage,
      assistantMessageEvent: {
        type: "toolcall_end",
        contentIndex: 1,
        toolCall: { id: "call-1", name: "bash", arguments: { command: "echo hi" } },
      },
    }),
  );
  events.push(
    ...projection.handle({
      type: "tool_execution_start",
      toolCallId: "call-1",
      toolName: "bash",
      args: { command: "echo hi" },
    }),
  );
  events.push(
    ...projection.handle({
      type: "tool_execution_end",
      toolCallId: "call-1",
      toolName: "bash",
      result: { content: [{ type: "text", text: "hi\n" }] },
      isError: false,
    }),
  );
  events.push(
    ...projection.handle({
      type: "message_update",
      usage,
      assistantMessageEvent: { type: "text_delta", contentIndex: 0, delta: "!" },
    }),
  );
  events.push(
    ...projection.handle({
      type: "message_end",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "Sure!" },
          { type: "toolCall", id: "call-1", name: "bash", arguments: { command: "echo hi" } },
        ],
        usage,
        stopReason: "stop",
        timestamp: 3,
      },
    }),
  );
  events.push(...projection.handle({ type: "agent_settled" }));
  return { projection, events };
}

test("projects streaming text, tools, and idle state", () => {
  const { projection, events } = streamAssistant();
  const types = new Set(events.map((event) => event.type));
  assert.ok(types.has("message.updated"));
  assert.ok(types.has("message.part.updated"));
  assert.ok(types.has("session.status"));
  assert.ok(types.has("session.idle"));

  const toolEvent = events.find(
    (event) => event.type === "message.part.updated" && event.properties.part.type === "tool",
  );
  assert.ok(toolEvent);
  assert.equal(toolEvent.properties.part.tool, "bash");

  const snapshot = projection.snapshot();
  const assistant = snapshot.messages.find((message) => message.info.role === "assistant");
  assert.ok(assistant);
  const text = assistant.parts.find((part) => part.type === "text");
  const tool = assistant.parts.find((part) => part.type === "tool");
  assert.equal(text.text, "Sure!");
  assert.equal(tool.state.status, "completed");
  assert.deepEqual(tool.state.input, { command: "echo hi" });
  assert.equal(tool.state.output, "hi\n");
});

test("hydrates history and applies tool results to the assistant part", () => {
  const projection = new PiProjection("session-2");
  const snapshot = projection.hydrate([
    { role: "user", content: [{ type: "text", text: "Read it" }], timestamp: 1 },
    {
      role: "assistant",
      content: [
        { type: "text", text: "Reading" },
        { type: "toolCall", id: "call-9", name: "read", arguments: { path: "a.txt" } },
      ],
      timestamp: 2,
    },
    {
      role: "toolResult",
      toolCallId: "call-9",
      toolName: "read",
      content: [{ type: "text", text: "file data" }],
      isError: false,
      timestamp: 3,
    },
  ]);
  assert.equal(snapshot.messages.length, 2);
  const tool = snapshot.messages[1].parts.find((part) => part.type === "tool");
  assert.equal(tool.state.status, "completed");
  assert.equal(tool.state.output, "file data");
});

test("maps extension UI requests to permission events", () => {
  const projection = new PiProjection("session-3");
  const events = projection.handle({
    type: "extension_ui_request",
    id: "approval-1",
    method: "confirm",
    title: "Run rm?",
    options: ["Allow", "Deny"],
  });
  assert.equal(events[0].type, "permission.updated");
  assert.equal(events[0].properties.id, "approval-1");
  const reply = projection.resolveUi("approval-1", { value: "Allow" });
  assert.equal(reply.type, "permission.replied");
  assert.equal(projection.resolveUi("approval-1", {}), null);
});

test("extracts text and tool output from content", () => {
  assert.equal(textFromContent([{ type: "text", text: "a" }, { type: "text", text: "b" }]), "ab");
  assert.equal(outputFromResult({ content: [{ type: "text", text: "ok" }] }), "ok");
  assert.equal(outputFromResult([{ type: "image" }]), "[image]");
});
