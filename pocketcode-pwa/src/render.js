import { el, formatDuration } from "./util.js";
import { renderMarkdown } from "./markdown.js";

function textFromParts(message) {
  return (message.parts || [])
    .filter((part) => part.type === "text" && !part.synthetic && !part.ignored)
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

function statusLabel(status) {
  if (status === "running") return "running";
  if (status === "completed") return "done";
  if (status === "error") return "error";
  return "pending";
}

function toolIcon(tool) {
  const name = String(tool || "tool").toLowerCase();
  if (name.includes("bash") || name.includes("shell") || name.includes("exec")) return "$";
  if (name.includes("edit") || name.includes("write") || name.includes("patch")) return "<>";
  if (name.includes("read") || name.includes("view")) return "[]";
  if (name.includes("search") || name.includes("grep") || name.includes("find")) return "?";
  if (name.includes("browser") || name.includes("fetch")) return "//";
  return "·";
}

function toolCard(part, { compactTools }) {
  const state = part.state || {};
  const status = state.status || "pending";
  const card = el("details", `tool-card ${status}`);
  if (!compactTools) card.open = true;
  const summary = el("summary", "tool-head");
  summary.append(el("span", "tool-icon", toolIcon(part.tool)));
  summary.append(el("span", "tool-name", part.tool || "tool"));
  const title = el("span", "tool-title", state.title || "");
  summary.append(title);
  const duration = formatDuration(
    state.time?.end && state.time?.start ? state.time.end - state.time.start : 0,
  );
  summary.append(el("span", "tool-state", duration || statusLabel(status)));
  card.append(summary);

  const detail = el("div", "tool-detail");
  const input = state.input && Object.keys(state.input).length
    ? JSON.stringify(state.input, null, 2)
    : "";
  const output = state.error || state.output || "";
  if (input) {
    const inputDetails = el("details");
    inputDetails.open = !compactTools;
    inputDetails.append(el("summary", "", "Input"));
    inputDetails.append(el("pre", "", input));
    detail.append(inputDetails);
  }
  if (output) {
    const outputDetails = el("details");
    outputDetails.open = !compactTools || status === "error";
    outputDetails.append(el("summary", "", state.error ? "Error" : "Output"));
    outputDetails.append(el("pre", "", output));
    detail.append(outputDetails);
  }
  if (!input && !output) {
    detail.append(el("div", "tool-title", "Waiting for the tool…"));
  }
  card.append(detail);
  return card;
}

function permissionCard(permission, { onPermission, canAlways }) {
  const card = el("div", "permission-card");
  const head = el("div", "permission-head");
  head.append(el("span", "", "Approval needed"));
  card.append(head);
  card.append(el("h4", "", permission.title));
  if (permission.description) {
    const body = el("p", "", permission.description);
    if (body.textContent.length > 600) body.textContent = body.textContent.slice(0, 600) + "…";
    card.append(body);
  }
  const actions = el("div", "permission-actions");
  const allow = el("button", "allow", canAlways ? "Allow once" : "Allow");
  allow.type = "button";
  allow.addEventListener("click", () => onPermission(permission, "once"));
  actions.append(allow);
  if (canAlways) {
    const always = el("button", "always", "Always allow");
    always.type = "button";
    always.addEventListener("click", () => onPermission(permission, "always"));
    actions.append(always);
  }
  const deny = el("button", "deny", "Deny");
  deny.type = "button";
  deny.addEventListener("click", () => onPermission(permission, "reject"));
  actions.append(deny);
  card.append(actions);
  return card;
}

function messageNode(record, opts) {
  const { info, parts } = record;
  const role = info.role || "assistant";
  const wrapper = el("div", `message ${role === "user" ? "user" : "assistant"}`);
  const label = el("div", "message-role");
  label.append(el("span", "dot"));
  label.append(
    el(
      "span",
      "",
      role === "user" ? "You" : info.modelID ? info.modelID : "Agent",
    ),
  );
  wrapper.append(label);

  if (role === "user") {
    const bubble = el("div", "bubble");
    bubble.textContent = textFromParts(record) || "…";
    wrapper.append(bubble);
    return wrapper;
  }

  const bubble = el("div", "bubble");
  for (const part of parts) {
    if (part.type === "reasoning") {
      if (!opts.showReasoning || !part.text) continue;
      const details = el("details", "reasoning");
      details.append(el("summary", "", "Reasoning"));
      details.append(el("div", "reasoning-body", part.text));
      bubble.append(details);
    } else if (part.type === "text") {
      if (!part.text || part.synthetic || part.ignored) continue;
      const block = el("div", "markdown");
      renderMarkdown(block, part.text);
      bubble.append(block);
    } else if (part.type === "tool") {
      bubble.append(toolCard(part, opts));
    } else if (part.type === "file") {
      if (part.url) {
        const link = el("a", "chip", part.filename || "attachment");
        link.href = part.url;
        link.target = "_blank";
        link.rel = "noreferrer noopener";
        bubble.append(link);
      }
    }
  }
  if (!bubble.childNodes.length) {
    if (info.error) {
      bubble.append(el("div", "error-card", typeof info.error === "string" ? info.error : info.error.message || "The agent reported an error."));
    } else {
      const note = el("div", "status-note");
      note.append(el("span", "typing", ""));
      note.lastChild.append(el("i"), el("i"), el("i"));
      bubble.append(note);
    }
  }
  wrapper.append(bubble);
  return wrapper;
}

export function renderTimeline(container, timeline, options) {
  const nearBottom =
    container.scrollHeight - container.scrollTop - container.clientHeight < 130;
  const previousTop = container.scrollTop;
  while (container.firstChild) container.removeChild(container.firstChild);

  const messages = timeline.messagesInOrder();
  if (!messages.length) {
    const empty = el("div", "timeline-empty");
    empty.append(el("span", "prompt-mark", ">_"));
    empty.append(el("div", "", "Ask your agent to inspect a file, run a command, or explain a bug. Tool calls and approvals appear here as they happen."));
    container.append(empty);
  } else {
    for (const message of messages) {
      if (message.info.role === "assistant" && !message.parts.length && message.info.error) {
        container.append(el("div", "error-card", String(message.info.error.message || message.info.error)));
        continue;
      }
      container.append(messageNode(message, options));
    }
  }

  for (const permission of timeline.pendingPermissions()) {
    container.append(permissionCard(permission, options));
  }

  if (timeline.error) {
    container.append(el("div", "error-card", timeline.error));
  }

  if (timeline.isBusy() && !timeline.pendingPermissions().length) {
    const note = el("div", "status-note");
    const text =
      timeline.status?.type === "retry"
        ? timeline.status.message || "Retrying…"
        : "Agent is working";
    note.append(el("span", "", text));
    const typing = el("span", "typing");
    typing.append(el("i"), el("i"), el("i"));
    note.append(typing);
    container.append(note);
  }

  if (options.scroll ?? nearBottom) {
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  } else {
    container.scrollTop = previousTop;
  }
}

export function renderDiffSheet(body, diff) {
  body.classList.add("diff-sheet");
  if (!diff?.length) {
    body.append(el("p", "panel-copy", "No file changes recorded for this session."));
    return;
  }
  for (const file of diff) {
    const card = el("div", "diff-file");
    const header = el("header");
    header.append(el("span", "", file.file || "file"));
    const counts = el("span", "");
    counts.append(el("span", "add", `+${file.additions || 0} `));
    counts.append(el("span", "del", `−${file.deletions || 0}`));
    header.append(counts);
    card.append(header);
    const pre = el("pre");
    for (const line of String(file.patch || "").split("\n")) {
      const span = el("div", line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : "", line);
      pre.append(span);
    }
    card.append(pre);
    body.append(card);
  }
}

export function renderTodoSheet(body, todos) {
  body.classList.add("todo-sheet");
  if (!todos?.length) {
    body.append(el("p", "panel-copy", "No todos for this session."));
    return;
  }
  for (const todo of todos) {
    const row = el("div", "todo-item");
    const status = el("span", `todo-status ${todo.status || ""}`, todo.status === "completed" ? "✓" : todo.status === "in_progress" ? "•" : "");
    row.append(status);
    row.append(el("span", "", todo.content || ""));
    body.append(row);
  }
}
