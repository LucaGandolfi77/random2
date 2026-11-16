/* Shared UI: icons, Ada highlighting, typewriter, modals, toasts, confetti. */

import { companion } from "./art.js";
import { sfx } from "./audio.js";

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function icon(name, className = "") {
  return `<svg class="icon ${className}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
}

const KEYWORDS = new Set(
  "with use procedure function is begin end if then elsif else case when loop for in out return declare constant package body type subtype range record access null raise exception task generic private new separate others and or not mod rem exit while do accept entry requeue delay until abort select protected overriding abstract tagged limited all at pragma of aliased synchronized interface".split(
    " "
  )
);

const TYPES = new Set(
  "integer natural positive float boolean character string duration long_integer long_float short_integer short_float constraint_error program_error storage_error tasking_error status_error mode_error name_error use_error device_error end_error data_error layout_error ada text_io unchecked_deallocation".split(
    " "
  )
);

function tokenClass(word) {
  const lower = word.toLowerCase();
  if (KEYWORDS.has(lower)) return "tok-kw";
  if (TYPES.has(lower)) return "tok-type";
  if (/^[A-Z][A-Za-z0-9_]*$/.test(word)) return "tok-name";
  return "";
}

/** Conservative Ada highlighter. Tokenizes raw source, escapes every token. */
export function highlightAda(source) {
  let out = "";
  let i = 0;
  const text = String(source);
  while (i < text.length) {
    const c = text[i];

    if (c === "-" && text[i + 1] === "-") {
      let j = text.indexOf("\n", i);
      if (j === -1) j = text.length;
      out += `<span class="tok-comment">${escapeHtml(text.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    if (c === '"') {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === '"') {
          if (text[j + 1] === '"') {
            j += 2;
            continue;
          }
          j++;
          break;
        }
        j++;
      }
      out += `<span class="tok-string">${escapeHtml(text.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    if (c === "'" && /[A-Za-z]/.test(text[i + 1] || "")) {
      let j = i + 2;
      while (j < text.length && /[A-Za-z0-9_]/.test(text[j])) j++;
      out += `<span class="tok-attr">${escapeHtml(text.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    if (/[A-Za-z]/.test(c)) {
      let j = i + 1;
      while (j < text.length && /[A-Za-z0-9_]/.test(text[j])) j++;
      const word = text.slice(i, j);
      const cls = tokenClass(word);
      out += cls ? `<span class="${cls}">${escapeHtml(word)}</span>` : escapeHtml(word);
      i = j;
      continue;
    }

    if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < text.length && /[0-9_]/.test(text[j])) j++;
      if (text[j] === "." && /[0-9]/.test(text[j + 1] || "")) {
        j++;
        while (j < text.length && /[0-9_]/.test(text[j])) j++;
      }
      if ((text[j] === "e" || text[j] === "E") && /[0-9+-]/.test(text[j + 1] || "")) {
        j += 2;
        while (j < text.length && /[0-9]/.test(text[j])) j++;
      }
      out += `<span class="tok-num">${escapeHtml(text.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    if (c === ":" && text[i + 1] === "=") {
      out += `<span class="tok-op">:=</span>`;
      i += 2;
      continue;
    }
    if (c === "=" && text[i + 1] === ">") {
      out += `<span class="tok-op">=&gt;</span>`;
      i += 2;
      continue;
    }
    if (c === "." && text[i + 1] === ".") {
      out += `<span class="tok-op">..</span>`;
      i += 2;
      continue;
    }
    if (c === "/" && text[i + 1] === "=") {
      out += `<span class="tok-op">/=</span>`;
      i += 2;
      continue;
    }
    if (c === "&") {
      out += `<span class="tok-op">&amp;</span>`;
      i++;
      continue;
    }
    if ("()[]{};,.:".includes(c)) {
      out += `<span class="tok-punct">${escapeHtml(c)}</span>`;
      i++;
      continue;
    }
    out += escapeHtml(c);
    i++;
  }
  return out;
}

export function codeBlock(source, className = "") {
  return `<pre class="code-block ${className}"><code>${highlightAda(source)}</code></pre>`;
}

/** Escape text and turn `backticks` into inline code. */
export function inline(text) {
  return escapeHtml(String(text)).replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
}

export function stars(n, { compact = false } = {}) {
  const filled = Math.max(0, Math.min(3, Number(n) || 0));
  const star = `<svg class="star-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.4l6.2-.9z"/></svg>`;
  return `<span class="stars ${compact ? "stars--compact" : ""}" role="img" aria-label="${filled} of 3 stars">${Array.from(
    { length: 3 },
    (_, i) => `<span class="star ${i < filled ? "is-on" : ""}" aria-hidden="true">${star}</span>`
  ).join("")}</span>`;
}

export function chapterStars(nodeStars) {
  return `<span class="node-stars">${stars(nodeStars, { compact: true })}</span>`;
}

/** Render dialogue and type it in. Tap or the Skip button reveals it instantly. */
export function dialogue(el, lines, { speed = 9, reduced = false, onDone = null } = {}) {
  if (!el) return { skip() {}, cancel() {} };
  el.innerHTML = lines
    .map((line) => {
      const who = line.who || "GNAT";
      const name = who === "SELF" ? "A. LOVELACE" : who;
      return `<div class="dialogue-line" data-who="${escapeHtml(who)}">
        ${companion(who)}
        <div class="dialogue-body">
          <span class="dialogue-who">${escapeHtml(name)}</span>
          <p class="dialogue-text">
            <span class="sr-only">${escapeHtml(line.text)}</span>
            <span aria-hidden="true" data-type></span><span class="caret" aria-hidden="true"></span>
          </p>
        </div>
      </div>`;
    })
    .join("");

  const texts = [...el.querySelectorAll("[data-type]")];
  const wrappers = [...el.querySelectorAll(".dialogue-line")];
  let cancelled = false;
  let done = false;
  let timer = null;
  let lineIndex = 0;
  let charIndex = 0;

  el.classList.add("is-typing");
  wrappers.forEach((w, i) => w.classList.toggle("is-active", i === 0));

  function finish() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    texts.forEach((t, i) => {
      t.textContent = lines[i].text;
      wrappers[i].classList.remove("is-active");
    });
    el.classList.remove("is-typing");
    el.classList.add("is-done");
    if (onDone) onDone();
  }

  function step() {
    if (cancelled) return;
    if (lineIndex >= lines.length) {
      finish();
      return;
    }
    const current = texts[lineIndex];
    const full = lines[lineIndex].text;
    charIndex++;
    current.textContent = full.slice(0, charIndex);
    el.classList.add("is-typing");
    if (charIndex >= full.length) {
      wrappers[lineIndex].classList.add("is-done");
      wrappers[lineIndex].classList.remove("is-active");
      lineIndex++;
      charIndex = 0;
      if (lineIndex < wrappers.length) wrappers[lineIndex].classList.add("is-active");
      timer = setTimeout(step, 180);
      return;
    }
    const ch = full[charIndex - 1] || "";
    const pause = /[.!?]/.test(ch) ? 95 : ch === "," ? 42 : speed;
    timer = setTimeout(step, pause);
  }

  if (reduced) {
    finish();
  } else {
    timer = setTimeout(step, 90);
  }

  const skip = () => finish();
  const cancel = () => {
    cancelled = true;
    done = true;
    clearTimeout(timer);
  };

  el.addEventListener("click", (event) => {
    if (event.target.closest("[data-skip]")) return;
    if (!done) skip();
  });

  return { skip, cancel };
}

let toastCount = 0;
export function toast(message, { action = null, actionLabel = "Do it", tone = "default", timeout = 3400 } = {}) {
  const host = document.getElementById("toasts");
  if (!host) return () => {};
  const node = document.createElement("div");
  node.className = `toast toast--${tone}`;
  node.dataset.id = String(++toastCount);
  const text = document.createElement("span");
  text.className = "toast-text";
  text.textContent = message;
  node.appendChild(text);
  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "toast-action";
    button.textContent = actionLabel;
    button.addEventListener("click", () => {
      try {
        action();
      } finally {
        remove();
      }
    });
    node.appendChild(button);
  }
  host.appendChild(node);
  while (host.children.length > 3) host.firstElementChild.remove();
  const timer = timeout > 0 ? setTimeout(remove, timeout) : null;
  function remove() {
    if (timer) clearTimeout(timer);
    node.classList.add("is-out");
    setTimeout(() => node.remove(), 220);
  }
  return remove;
}

/**
 * Accessible modal. Actions: [{label, value, primary, danger}], resolves with
 * the chosen value, or null when escaped. Body is trusted HTML.
 */
export function modal({
  eyebrow = "",
  title,
  body,
  actions = [{ label: "Close", value: null, primary: true }],
  tone = "default",
  dismissible = true
}) {
  const host = document.getElementById("modal-root");
  if (!host) return Promise.resolve(null);
  sfx("modal");
  const id = `modal-title-${Date.now()}`;
  const previouslyFocused = document.activeElement;
  const wrap = document.createElement("div");
  wrap.className = `modal-backdrop modal-backdrop--${tone}`;
  wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${id}" tabindex="-1">
    <button class="modal-close" type="button" data-close aria-label="Close">${icon("close")}</button>
    ${eyebrow ? `<p class="modal-eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
    <h2 id="${id}">${escapeHtml(title)}</h2>
    <div class="modal-body">${body}</div>
    <div class="modal-actions">
      ${actions
        .map(
          (action) =>
            `<button type="button" class="btn ${action.primary ? "btn--primary" : "btn--ghost"} ${
              action.danger ? "btn--danger" : ""
            }" data-value="${escapeHtml(action.value ?? "")}">${escapeHtml(action.label)}</button>`
        )
        .join("")}
    </div>
  </div>`;
  document.body.classList.add("has-modal");
  host.appendChild(wrap);
  const box = wrap.querySelector(".modal");
  const focusables = () =>
    [...box.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter(
      (el) => !el.disabled
    );

  const first = wrap.querySelector(".modal-actions .btn--primary") || focusables()[0] || box;
  setTimeout(() => first.focus(), 30);

  return new Promise((resolve) => {
    let closed = false;
    function close(value) {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("hashchange", onHashChange);
      document.body.classList.remove("has-modal");
      wrap.classList.add("is-out");
      setTimeout(() => {
        wrap.remove();
        if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      }, 160);
      resolve(value);
    }
    function onHashChange() {
      close(null);
    }
    window.addEventListener("hashchange", onHashChange);
    function onKey(event) {
      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        close(null);
        return;
      }
      if (event.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);
    wrap.addEventListener("click", (event) => {
      if (event.target === wrap && dismissible) close(null);
      const closeButton = event.target.closest("[data-close]");
      if (closeButton && dismissible) close(null);
      const action = event.target.closest("[data-value]");
      if (action && !action.disabled) {
        sfx("tap");
        close(action.dataset.value === "" ? null : action.dataset.value);
      }
    });
  });
}

export function confirmModal({ title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false }) {
  return modal({
    eyebrow: "A point of order",
    title,
    body,
    actions: [
      { label: confirmLabel, value: "yes", primary: true, danger },
      { label: cancelLabel, value: null }
    ]
  }).then((value) => value === "yes");
}

export function reduceMotion() {
  return (
    document.documentElement.classList.contains("reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

let confettiRaf = 0;
let confettiTimer = 0;

export function stopConfetti() {
  if (confettiRaf) cancelAnimationFrame(confettiRaf);
  if (confettiTimer) clearTimeout(confettiTimer);
  confettiRaf = 0;
  confettiTimer = 0;
  const canvas = document.getElementById("confetti");
  const ctx = canvas?.getContext("2d");
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function confetti(colors = ["#ffb84d", "#7ef0c8", "#b79bff", "#f4ecd9"]) {
  stopConfetti();
  const canvas = document.getElementById("confetti");
  if (!canvas || reduceMotion()) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = window.innerWidth < 480 ? 52 : 76;
  const pieces = Array.from({ length: count }, (_, i) => ({
    x: width / 2 + (Math.random() - 0.5) * width * 0.45,
    y: height * 0.35 + (Math.random() - 0.5) * 40,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 9 - 2,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.35,
    w: 4 + Math.random() * 5,
    h: 7 + Math.random() * 7,
    color: colors[i % colors.length],
    life: 0,
    max: 90 + Math.random() * 40
  }));
  let raf = 0;
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, width, height);
    let alive = false;
    for (const p of pieces) {
      p.life++;
      if (p.life > p.max) continue;
      alive = true;
      p.vy += 0.16;
      p.vx *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive && elapsed < 3600) raf = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, width, height);
  }
  raf = requestAnimationFrame(tick);
  confettiRaf = raf;
  confettiTimer = setTimeout(stopConfetti, 3800);
}

export async function shareGame({ title, text, url }) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
  } catch (error) {
    if (error && error.name === "AbortError") return "cancelled";
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied";
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = `${text} ${url}`;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      return "copied";
    } catch {
      return "failed";
    }
  }
}

export function scrollTop() {
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}
