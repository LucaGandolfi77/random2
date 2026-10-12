"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  let sources = [];
  let projectFiles = [];
  let activePath = null;
  let buildJobId = null;
  let analysisJobId = null;
  let runId = null;
  let debugId = null;
  const selectedSources = new Set();
  const openFiles = new Map();

  function status(message, error = false) {
    $("#appStatus").textContent = message;
    $("#appStatus").classList.toggle("error", error);
  }

  function toast(message, error = false) {
    const node = $("#toast");
    node.textContent = message;
    node.className = error ? "show error" : "show";
    window.setTimeout(() => { node.className = ""; }, 3500);
  }

  function show(selector, value) {
    const node = $(selector);
    if (node) node.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }

  function append(selector, value) {
    const node = $(selector);
    if (!node) return;
    node.textContent += value;
    node.scrollTop = node.scrollHeight;
  }

  async function api(url, options = {}) {
    const response = await fetch(url, { cache: "no-store", ...options });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch { data = { error: text || response.statusText }; }
    if (!response.ok) throw new Error(data.detail || data.error || `HTTP ${response.status}`);
    return data;
  }

  const post = (url, payload = {}) => api(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const projectId = () => $("#project").value;
  const guard = handler => async event => {
    try { await handler(event); }
    catch (error) { console.error(error); status(error.message, true); toast(error.message, true); }
  };

  function extensionIcon(name) {
    const extension = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
    return ({ c: "C", h: "H", cpp: "C++", hpp: "H++", s: "ASM", py: "PY", js: "JS", json: "{}", md: "MD", html: "<>" })[extension] || "FILE";
  }

  function language(path) {
    const extension = path.split(".").pop().toLowerCase();
    return ({ c: "C", h: "C Header", cpp: "C++", hpp: "C++ Header", s: "Assembly", py: "Python", js: "JavaScript", json: "JSON", md: "Markdown", html: "HTML", css: "CSS", xml: "XML", sh: "Shell" })[extension] || "Plain Text";
  }

  function createTree(items) {
    const root = { name: "", path: "", type: "directory", children: new Map() };
    for (const item of items) {
      const parts = item.path.split("/").filter(Boolean);
      let current = root;
      parts.forEach((part, index) => {
        if (!current.children.has(part)) {
          current.children.set(part, {
            name: part,
            path: parts.slice(0, index + 1).join("/"),
            type: index === parts.length - 1 ? "file" : "directory",
            children: new Map(),
            previewable: item.previewable,
          });
        }
        current = current.children.get(part);
      });
    }
    return root;
  }

  function sortedChildren(node) {
    return [...node.children.values()].sort((left, right) => {
      if (left.type !== right.type) return left.type === "directory" ? -1 : 1;
      return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" });
    });
  }

  function nodeMatches(node, query) {
    if (!query || node.path.toLowerCase().includes(query)) return true;
    return node.type === "directory" && [...node.children.values()].some(child => nodeMatches(child, query));
  }

  function fileNode(node, depth) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tree-file${node.path === activePath ? " active" : ""}`;
    button.style.setProperty("--depth", depth);
    button.title = node.path;
    const icon = document.createElement("span");
    icon.className = "tree-file-icon";
    icon.textContent = extensionIcon(node.name);
    const name = document.createElement("span");
    name.textContent = node.name;
    button.append(icon, name);
    button.addEventListener("click", guard(() => openFile(node.path)));
    return button;
  }

  function directoryNode(node, query, depth) {
    const details = document.createElement("details");
    details.className = "tree-directory";
    details.open = depth === 0 || Boolean(query);
    const summary = document.createElement("summary");
    summary.style.setProperty("--depth", depth);
    const arrow = document.createElement("span");
    arrow.className = "tree-arrow";
    arrow.textContent = "›";
    const folder = document.createElement("span");
    folder.className = "tree-folder";
    folder.textContent = "▰";
    const name = document.createElement("span");
    name.textContent = node.name || $("#workspaceName").textContent;
    summary.append(arrow, folder, name);
    details.append(summary);
    for (const child of sortedChildren(node)) {
      if (!nodeMatches(child, query)) continue;
      details.append(child.type === "directory" ? directoryNode(child, query, depth + 1) : fileNode(child, depth + 1));
    }
    return details;
  }

  function renderTree() {
    const query = $("#explorerFilter").value.trim().toLowerCase();
    const count = projectFiles.filter(item => item.path.toLowerCase().includes(query)).length;
    $("#explorerCount").textContent = `${count}/${projectFiles.length}`;
    const container = $("#projectTree");
    container.replaceChildren();
    if (!projectFiles.length) { container.textContent = "No project files found."; return; }
    container.append(directoryNode(createTree(projectFiles), query, 0));
  }

  async function loadTree() {
    status("Loading Explorer...");
    const data = await api(`/api/projects/${encodeURIComponent(projectId())}/tree`);
    projectFiles = data.items || [];
    const option = $("#project").selectedOptions[0];
    $("#workspaceName").textContent = (option ? option.textContent : projectId()).toUpperCase();
    renderTree();
    status(`${projectFiles.length} project files loaded`);
  }

  function renderTabs() {
    const tabs = $("#editorTabs");
    tabs.replaceChildren();
    if (!openFiles.size) {
      const welcome = document.createElement("div");
      welcome.className = "editor-welcome-tab";
      welcome.textContent = "Welcome";
      tabs.append(welcome);
      return;
    }
    for (const path of openFiles.keys()) {
      const tab = document.createElement("div");
      tab.className = `editor-tab${path === activePath ? " active" : ""}`;
      tab.title = path;
      const name = document.createElement("span");
      name.className = "editor-tab-name";
      name.textContent = path.split("/").pop();
      const close = document.createElement("button");
      close.type = "button";
      close.className = "editor-tab-close";
      close.textContent = "×";
      close.addEventListener("click", event => { event.stopPropagation(); closeFile(path); });
      tab.append(name, close);
      tab.addEventListener("click", () => activateFile(path));
      tabs.append(tab);
    }
  }

  async function openFile(path) {
    if (!openFiles.has(path)) {
      status(`Opening ${path}...`);
      const data = await api(`/api/projects/${encodeURIComponent(projectId())}/file?path=${encodeURIComponent(path)}`);
      openFiles.set(path, { content: data.content || "", size: data.size || 0 });
    }
    activateFile(path);
  }

  function activateFile(path) {
    const file = openFiles.get(path);
    if (!file) return;
    activePath = path;
    const content = file.content;
    $("#editorEmpty").hidden = true;
    $("#codeViewport").hidden = false;
    $("#explorerPreview").textContent = content;
    const lineCount = Math.max(1, content.split("\n").length);
    $("#lineNumbers").textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join("\n");
    $("#editorBreadcrumbs").textContent = path.split("/").join("  ›  ");
    $("#editorStatusPath").textContent = `${path} · ${file.size} bytes`;
    $("#editorLanguage").textContent = language(path);
    $("#editorPosition").textContent = "Ln 1, Col 1";
    renderTabs();
    renderTree();
    $("#codeViewport").scrollTop = 0;
    $("#codeViewport").scrollLeft = 0;
    status(`Opened ${path}`);
  }

  function closeFile(path) {
    const keys = [...openFiles.keys()];
    const index = keys.indexOf(path);
    openFiles.delete(path);
    if (path === activePath) {
      activePath = keys[index + 1] || keys[index - 1] || null;
      if (activePath) activateFile(activePath);
      else {
        $("#codeViewport").hidden = true;
        $("#editorEmpty").hidden = false;
        $("#editorBreadcrumbs").textContent = "Select a file from the tree";
        $("#editorStatusPath").textContent = "Ready";
      }
    }
    renderTabs();
    renderTree();
  }

  function installResizer() {
    const shell = $(".explorer-shell");
    const resizer = $("#explorerResizer");
    resizer.addEventListener("mousedown", event => {
      event.preventDefault();
      resizer.classList.add("dragging");
      const move = moveEvent => {
        const bounds = shell.getBoundingClientRect();
        const width = Math.max(210, Math.min(650, moveEvent.clientX - bounds.left));
        shell.style.gridTemplateColumns = `${width}px 5px minmax(0,1fr)`;
      };
      const stop = () => {
        resizer.classList.remove("dragging");
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", stop);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    });
  }

  function renderSources() {
    const query = $("#filter").value.toLowerCase();
    const container = $("#sources");
    container.replaceChildren();
    for (const item of sources.filter(entry => entry.path.toLowerCase().includes(query))) {
      const row = document.createElement("div");
      row.className = "row";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.disabled = !item.buildable;
      checkbox.checked = selectedSources.has(item.path);
      checkbox.addEventListener("change", () => {
        checkbox.checked ? selectedSources.add(item.path) : selectedSources.delete(item.path);
        $("#count").textContent = `${selectedSources.size} selected / ${sources.length}`;
      });
      const button = document.createElement("button");
      button.type = "button";
      button.className = "file-link";
      button.textContent = item.path;
      button.addEventListener("click", guard(async () => {
        const data = await api(`/api/projects/${projectId()}/file?path=${encodeURIComponent(item.path)}`);
        show("#previewTitle", item.path);
        show("#preview", data.content);
      }));
      row.append(checkbox, button);
      container.append(row);
    }
    $("#count").textContent = `${selectedSources.size} selected / ${sources.length}`;
  }

  async function scanSources() {
    sources = (await api(`/api/projects/${encodeURIComponent(projectId())}/sources`)).items || [];
    selectedSources.clear();
    renderSources();
  }

  function streamJob(jobId, outputSelector, onFinish) {
    const stream = new EventSource(`/api/jobs/${encodeURIComponent(jobId)}/events`);
    stream.onmessage = event => {
      const item = JSON.parse(event.data);
      append(outputSelector, `[${item.kind}] ${item.message || ""}\n`);
      if (item.result) append(outputSelector, `${JSON.stringify(item.result, null, 2)}\n`);
      if (item.traceback) append(outputSelector, `${item.traceback}\n`);
      if (item.kind === "done") { stream.close(); onFinish(); }
    };
    stream.onerror = () => { append(outputSelector, "[warning] Event stream interrupted.\n"); stream.close(); onFinish(); };
  }

  async function startBuild() {
    if (!selectedSources.size) throw new Error("Select at least one buildable source file");
    show("#buildlog", "");
    buildJobId = (await post(`/api/projects/${projectId()}/build`, { files: [...selectedSources] })).job_id;
    $("#buildStop").disabled = false;
    streamJob(buildJobId, "#buildlog", () => { buildJobId = null; $("#buildStop").disabled = true; });
  }

  async function loadAnalysisProfiles() {
    const profiles = (await api(`/api/projects/${projectId()}/analysis-profiles`)).items || [];
    const container = $("#analysisToolStatus");
    container.replaceChildren();
    for (const profile of profiles) {
      const row = document.createElement("div");
      row.className = `tool-pill ${profile.available ? "available" : "missing"}`;
      row.innerHTML = `<strong>${profile.id}</strong><span></span>`;
      row.lastChild.textContent = profile.available ? profile.resolved_executable : "Not installed";
      container.append(row);
    }
    const cppcheck = profiles.find(item => item.id === "cppcheck");
    const doxygen = profiles.find(item => item.id === "doxygen");
    $("#cppcheckRun").disabled = !cppcheck?.available;
    $("#doxygenRun").disabled = !doxygen?.available;
  }

  async function startAnalysis(profile) {
    show("#analysisOut", "");
    const data = await post(`/api/projects/${projectId()}/static-analysis`, {
      profile,
      files: [...selectedSources],
    });
    analysisJobId = data.job_id;
    $("#analysisStop").disabled = false;
    $("#cppcheckRun").disabled = true;
    $("#doxygenRun").disabled = true;
    streamJob(analysisJobId, "#analysisOut", async () => {
      analysisJobId = null;
      $("#analysisStop").disabled = true;
      await loadAnalysisProfiles();
    });
  }

  $("#tabs").addEventListener("click", event => {
    const button = event.target.closest("button[data-tab]");
    if (!button) return;
    $$("#tabs button").forEach(item => item.classList.toggle("active", item === button));
    $$(".panel").forEach(panel => panel.classList.toggle("active", panel.id === button.dataset.tab));
  });
  $("#project").addEventListener("change", guard(async () => {
    openFiles.clear(); activePath = null; renderTabs();
    await Promise.all([scanSources(), loadTree(), loadAnalysisProfiles()]);
  }));
  $("#scan").addEventListener("click", guard(scanSources));
  $("#filter").addEventListener("input", renderSources);
  $("#all").addEventListener("click", () => { sources.filter(item => item.buildable).forEach(item => selectedSources.add(item.path)); renderSources(); });
  $("#none").addEventListener("click", () => { selectedSources.clear(); renderSources(); });
  $("#build").addEventListener("click", guard(startBuild));
  $("#buildStop").addEventListener("click", guard(() => buildJobId && post(`/api/jobs/${buildJobId}/cancel`)));
  $("#explorerRefresh").addEventListener("click", guard(loadTree));
  $("#explorerFilter").addEventListener("input", renderTree);
  $("#explorerClear").addEventListener("click", () => { $("#explorerFilter").value = ""; renderTree(); });
  $("#explorerExpand").addEventListener("click", () => $$("#projectTree details").forEach(item => { item.open = true; }));
  $("#explorerCollapse").addEventListener("click", () => { $$("#projectTree details").forEach(item => { item.open = false; }); const root = $("#projectTree > details"); if (root) root.open = true; });
  $("#cppcheckRun").addEventListener("click", guard(() => startAnalysis("cppcheck")));
  $("#doxygenRun").addEventListener("click", guard(() => startAnalysis("doxygen")));
  $("#analysisStop").addEventListener("click", guard(() => analysisJobId && post(`/api/jobs/${analysisJobId}/cancel`)));
  $("#stackLoad").addEventListener("click", guard(async () => show("#analysisOut", await api(`/api/projects/${projectId()}/stack`))));
  $("#inspect").addEventListener("click", guard(async () => show("#elfTabs", await post(`/api/projects/${projectId()}/inspect`, { path: $("#elfPath").value }))));
  $("#addr2line").addEventListener("click", guard(async () => show("#elfTabs", await post(`/api/projects/${projectId()}/addr2line`, { elf: $("#elfPath").value, addresses: $("#addresses").value.split(/\s+/).filter(Boolean) }))));
  $("#inspectToolchain").addEventListener("click", guard(async () => show("#toolchainOut", await api(`/api/projects/${projectId()}/toolchain`))));
  $("#runStart").addEventListener("click", guard(async () => { runId = (await post(`/api/projects/${projectId()}/run`, { profile: $("#runProfile").value, elf: $("#runElf").value })).run_id; }));
  $("#runStop").addEventListener("click", guard(() => runId && post(`/api/runs/${runId}/stop`)));
  $("#debugStart").addEventListener("click", guard(async () => { debugId = (await post(`/api/projects/${projectId()}/debug`, { profile: $("#debugProfile").value, elf: $("#debugElf").value })).session_id; show("#debugOut", `Session ${debugId}`); }));
  $("#debugStop").addEventListener("click", guard(() => debugId && post(`/api/debug/${debugId}/stop`)));
  $("#sendMi").addEventListener("click", guard(async () => append("#debugOut", `\n${JSON.stringify(await post(`/api/debug/${debugId}/command`, { command: $("#miCommand").value }), null, 2)}`)));

  installResizer();
  (async () => {
    const health = await api("/api/health");
    const config = await api("/api/projects");
    for (const item of config.projects || []) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name || item.id;
      $("#project").append(option);
    }
    if (!projectId()) throw new Error("No projects configured");
    await Promise.all([scanSources(), loadTree(), loadAnalysisProfiles()]);
    status(`Studio v${health.version} ready`);
  })().catch(error => { status(error.message, true); toast(error.message, true); });
});
