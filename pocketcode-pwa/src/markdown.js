import { el } from "./util.js";

const SAFE_LINK = /^https?:\/\//i;

function appendInline(target, text) {
  let index = 0;
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]\([^)\s]+\))/g;
  for (const match of text.matchAll(pattern)) {
    if (match.index > index) target.append(text.slice(index, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      target.append(el("code", "", token.slice(1, -1)));
    } else if (token.startsWith("**") || token.startsWith("__")) {
      const strong = el("strong");
      appendInline(strong, token.slice(2, -2));
      target.append(strong);
    } else if (token.startsWith("*") || token.startsWith("_")) {
      const em = el("em");
      appendInline(em, token.slice(1, -1));
      target.append(em);
    } else if (token.startsWith("[")) {
      const split = token.indexOf("](");
      const label = token.slice(1, split);
      const href = token.slice(split + 2, -1);
      if (SAFE_LINK.test(href)) {
        const link = el("a", "", label);
        link.href = href;
        link.target = "_blank";
        link.rel = "noreferrer noopener";
        target.append(link);
      } else {
        target.append(document.createTextNode(label));
      }
    }
    index = match.index + token.length;
  }
  if (index < text.length) target.append(text.slice(index));
}

function inlineFragment(text) {
  const fragment = document.createDocumentFragment();
  const pieces = String(text).split("\n");
  pieces.forEach((piece, i) => {
    if (i > 0) fragment.append(el("br"));
    appendInline(fragment, piece);
  });
  return fragment;
}

export function renderMarkdown(container, text) {
  const source = String(text || "");
  const lines = source.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      const pre = el("pre");
      const node = el("code", "", code.join("\n"));
      if (language) node.dataset.language = language;
      pre.append(node);
      container.append(pre);
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const node = el(`h${heading[1].length}`);
      node.append(inlineFragment(heading[2]));
      container.append(node);
      i += 1;
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const list = el("ul");
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        const item = el("li");
        item.append(inlineFragment(lines[i].replace(/^\s*[-*+]\s+/, "")));
        list.append(item);
        i += 1;
      }
      container.append(list);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const list = el("ol");
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        const item = el("li");
        item.append(inlineFragment(lines[i].replace(/^\s*\d+[.)]\s+/, "")));
        list.append(item);
        i += 1;
      }
      container.append(list);
      continue;
    }
    if (line.startsWith(">")) {
      const quote = el("blockquote");
      const body = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        body.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      quote.append(inlineFragment(body.join("\n")));
      container.append(quote);
      continue;
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s-*_]*$/.test(line)) {
      container.append(el("hr"));
      i += 1;
      continue;
    }
    const paragraph = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !lines[i].startsWith(">")
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }
    const node = el("p");
    node.append(inlineFragment(paragraph.join("\n")));
    container.append(node);
  }
  return container;
}
