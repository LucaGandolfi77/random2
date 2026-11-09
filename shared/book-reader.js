/*
 * random2 · The Reading Room
 * ---------------------------
 * A tiny, dependency-free Markdown reader for the hub page.
 *
 * Drop a .md file in books/, add one entry to books/books.json, and the shelf
 * picks it up. The renderer is deliberately small: headings, paragraphs,
 * emphasis, links, lists, blockquotes, code fences and scene breaks. Raw HTML
 * is escaped, not interpreted.
 *
 * Loaded as a plain script after the Reading Room markup:
 *   <script src="shared/book-reader.js"></script>
 *
 * Exposes no globals. State lives in localStorage under
 * `random2-reading-room-v1` (per-book progress) and `random2-reader-font`.
 */
(function () {
  "use strict";

  var section = document.getElementById("reading-room");
  if (!section) return;

  var scriptEl = document.currentScript;
  if (!scriptEl) {
    var scripts = document.getElementsByTagName("script");
    for (var s = scripts.length - 1; s >= 0; s--) {
      if (/book-reader\.js(\?|$)/.test(scripts[s].src)) {
        scriptEl = scripts[s];
        break;
      }
    }
  }
  var BOOKS_BASE = scriptEl
    ? new URL("../books/", scriptEl.src)
    : new URL("books/", document.baseURI);
  var MANIFEST_URL = new URL("books.json", BOOKS_BASE);

  var STORE_KEY = "random2-reading-room-v1";
  var FONT_KEY = "random2-reader-font";

  var shelfEl = document.getElementById("book-shelf");
  var shelfStatus = document.getElementById("book-shelf-status");
  var readerEl = document.getElementById("book-reader");
  var readerClose = document.getElementById("reader-close");
  var readerTitle = document.getElementById("reader-title");
  var readerKicker = document.getElementById("reader-kicker");
  var readerTocBtn = document.getElementById("reader-toc-btn");
  var readerSmaller = document.getElementById("reader-smaller");
  var readerLarger = document.getElementById("reader-larger");
  var readerDownload = document.getElementById("reader-download");
  var readerToc = document.getElementById("reader-toc");
  var readerProgress = document.getElementById("reader-progress");
  var readerProgressBar = document.getElementById("reader-progress-bar");
  var readerContent = document.getElementById("reader-content");
  var readerChapter = document.getElementById("reader-chapter");
  var readerEnd = document.getElementById("reader-end");
  var readerEndClose = document.getElementById("reader-end-close");

  if (!shelfEl || !readerEl || !readerContent) return;

  var reduceMotion = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var books = [];
  var currentBook = null;
  var currentChapters = [];
  var currentChapter = 1;
  var lastTrigger = null;
  var readerOpen = false;
  var tocOpen = false;
  var saveTimer = 0;
  var scrollRaf = 0;
  var storedFont = 19;

  try {
    var savedFont = parseInt(localStorage.getItem(FONT_KEY), 10);
    if (savedFont >= 15 && savedFont <= 26) storedFont = savedFont;
  } catch (e) {}

  /* ---------- small helpers ---------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function focusEl(node) {
    if (!node || typeof node.focus !== "function") return;
    try { node.focus({ preventScroll: true }); }
    catch (e) { node.focus(); }
  }

  function scrollToEl(node, smooth) {
    if (!node) return;
    try {
      node.scrollIntoView({
        behavior: smooth && !reduceMotion ? "smooth" : "auto",
        block: "start"
      });
    } catch (e) {
      node.scrollIntoView();
    }
  }

  function formatMinutes(minutes) {
    var value = Number(minutes);
    if (!value || value < 1) return "A short read";
    if (value < 60) return value + " min";
    var hours = Math.floor(value / 60);
    var rest = value % 60;
    return hours + " h" + (rest ? " " + rest + " min" : "");
  }

  function bookUrl(book) {
    try { return new URL(book.path, MANIFEST_URL).href; }
    catch (e) { return book.path; }
  }

  /* ---------- progress storage ---------- */

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function saveStore(store) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
  }

  function getProgress(slug) {
    var store = loadStore();
    var entry = store[slug];
    if (!entry || typeof entry.ratio !== "number" || isNaN(entry.ratio)) return null;
    return entry;
  }

  function setProgress(slug, ratio, chapter) {
    var store = loadStore();
    store[slug] = {
      ratio: clamp(ratio, 0, 1),
      chapter: chapter || 1,
      updated: Date.now()
    };
    saveStore(store);
  }

  /* ---------- Markdown ---------- */

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeUrl(url) {
    var value = String(url || "").trim();
    if (!value) return "";
    if (/^(javascript|data|vbscript):/i.test(value)) return "";
    return value;
  }

  function inline(text) {
    var codes = [];
    var s = escapeHtml(text);

    s = s.replace(/`([^`]+)`/g, function (_, code) {
      codes.push(code);
      return "\u0000" + (codes.length - 1) + "\u0000";
    });

    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
      var safe = sanitizeUrl(href);
      if (!safe) return label;
      var external = /^https?:/i.test(safe);
      return '<a href="' + safe + '"' +
        (external ? ' target="_blank" rel="noopener noreferrer"' : "") +
        ">" + label + "</a>";
    });

    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(/_([^_]+)_/g, "<em>$1</em>");

    s = s.replace(/\u0000(\d+)\u0000/g, function (_, n) {
      return "<code>" + codes[+n] + "</code>";
    });

    return s;
  }

  function isBlockStart(line) {
    return /^(#{1,6})\s+/.test(line) ||
      /^(```|~~~)/.test(line) ||
      /^(---|___|\*\s*\*\s*\*)\s*$/.test(line) ||
      /^>\s?/.test(line) ||
      /^[-*+]\s+/.test(line) ||
      /^\d+\.\s+/.test(line);
  }

  function renderBlockquote(lines) {
    var paragraphs = [];
    var current = [];
    for (var i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) {
        if (current.length) {
          paragraphs.push(current.join(" "));
          current = [];
        }
      } else {
        current.push(lines[i].trim());
      }
    }
    if (current.length) paragraphs.push(current.join(" "));
    if (!paragraphs.length) return "";
    return "<blockquote>" + paragraphs.map(function (paragraph) {
      return "<p>" + inline(paragraph) + "</p>";
    }).join("") + "</blockquote>";
  }

  function renderBlocks(lines) {
    var html = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (!line.trim()) { i++; continue; }

      if (/^(```|~~~)/.test(line)) {
        var fence = line.slice(0, 3);
        var code = [];
        i++;
        while (i < lines.length && lines[i].indexOf(fence) !== 0) {
          code.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++;
        html.push("<pre><code>" + escapeHtml(code.join("\n")) + "</code></pre>");
        continue;
      }

      var heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        var level = heading[1].length;
        html.push("<h" + level + ">" + inline(heading[2]) + "</h" + level + ">");
        i++;
        continue;
      }

      if (/^(---|___|\*\s*\*\s*\*)\s*$/.test(line)) {
        html.push('<hr class="scene-break">');
        i++;
        continue;
      }

      if (/^>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        html.push(renderBlockquote(quote));
        continue;
      }

      if (/^[-*+]\s+/.test(line)) {
        var items = [];
        while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^[-*+]\s+/, ""));
          i++;
        }
        html.push("<ul>" + items.map(function (item) {
          return "<li>" + inline(item) + "</li>";
        }).join("") + "</ul>");
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        var ordered = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          ordered.push(lines[i].replace(/^\d+\.\s+/, ""));
          i++;
        }
        html.push("<ol>" + ordered.map(function (item) {
          return "<li>" + inline(item) + "</li>";
        }).join("") + "</ol>");
        continue;
      }

      var paragraph = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
        paragraph.push(lines[i].trim());
        i++;
      }
      if (paragraph.length) {
        html.push("<p>" + inline(paragraph.join(" ")) + "</p>");
      } else {
        i++;
      }
    }

    return html.join("\n");
  }

  function parseBook(markdown) {
    var text = String(markdown || "").replace(/\r\n?/g, "\n");
    var lines = text.split("\n");
    var front = [];
    var chapters = [];
    var current = null;
    var inFence = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^(```|~~~)/.test(line)) inFence = !inFence;
      var match = !inFence && line.match(/^##\s+(.+?)\s*$/);
      if (match) {
        if (current) chapters.push(current);
        current = { title: match[1], lines: [] };
        continue;
      }
      if (current) current.lines.push(line);
      else front.push(line);
    }
    if (current) chapters.push(current);

    if (!chapters.length) {
      chapters.push({ title: "Read", lines: front });
      front = [];
    }

    return {
      frontHtml: renderBlocks(front),
      chapters: chapters.map(function (chapter) {
        return { title: chapter.title, html: renderBlocks(chapter.lines) };
      })
    };
  }

  /* ---------- shelf ---------- */

  function findCard(slug) {
    var cards = shelfEl.querySelectorAll(".book-card");
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute("data-book") === slug) return cards[i];
    }
    return null;
  }

  function updateCard(book) {
    var card = findCard(book.slug);
    if (!card) return;
    var button = card.querySelector(".book-open");
    var progress = card.querySelector(".book-progress");
    var fill = card.querySelector(".book-progress-fill");
    if (!button || !progress || !fill) return;

    var entry = getProgress(book.slug);
    var ratio = entry ? entry.ratio : 0;

    if (ratio >= 0.98) {
      button.textContent = "Read again";
      button.setAttribute("aria-label", "Read again: " + book.title);
      progress.hidden = false;
      fill.style.width = "100%";
    } else if (ratio > 0.02) {
      button.textContent = "Continue · " + Math.round(ratio * 100) + "%";
      button.setAttribute("aria-label", "Continue reading " + book.title);
      progress.hidden = false;
      fill.style.width = (ratio * 100).toFixed(1) + "%";
    } else {
      button.textContent = "Read";
      button.setAttribute("aria-label", "Read " + book.title);
      progress.hidden = true;
      fill.style.width = "0%";
    }
  }

  function updateAllCards() {
    for (var i = 0; i < books.length; i++) updateCard(books[i]);
  }

  function renderShelf() {
    shelfEl.innerHTML = "";

    books.forEach(function (book) {
      var card = el("article", "book-card");
      card.setAttribute("data-book", book.slug);
      card.style.setProperty("--book-accent", book.accent || "#c9a878");
      card.style.setProperty("--book-accent2", book.accent2 || "#7c3aed");

      var cover = el("div", "book-cover");
      cover.setAttribute("aria-hidden", "true");
      cover.appendChild(el("span", "book-cover-kicker", "The Reading Room"));
      cover.appendChild(el("span", "book-cover-title", book.title));
      cover.appendChild(el("span", "book-cover-rule"));
      cover.appendChild(el("span", "book-cover-author", book.author || "random2"));
      card.appendChild(cover);

      var info = el("div", "book-info");

      var eyebrowBits = [];
      if (book.author) eyebrowBits.push("by " + book.author);
      if (book.minutes) eyebrowBits.push(formatMinutes(book.minutes));
      info.appendChild(el("p", "book-eyebrow", eyebrowBits.join(" · ")));

      info.appendChild(el("h3", "book-title", book.title));
      if (book.subtitle) info.appendChild(el("p", "book-subtitle", book.subtitle));
      if (book.blurb) info.appendChild(el("p", "book-blurb", book.blurb));

      var chips = el("div", "book-chips");
      (book.chips || []).forEach(function (chip) {
        chips.appendChild(el("span", "book-chip", chip));
      });
      info.appendChild(chips);

      var actions = el("div", "book-actions");
      var open = el("button", "book-open");
      open.type = "button";
      open.setAttribute("data-book", book.slug);
      open.addEventListener("click", function () { openBook(book, open); });
      actions.appendChild(open);

      var download = el("a", "book-download", "↓ .md");
      download.href = bookUrl(book);
      download.setAttribute("download", book.slug + ".md");
      download.setAttribute("aria-label", "Download " + book.title + " as Markdown");
      actions.appendChild(download);
      info.appendChild(actions);

      var progress = el("div", "book-progress");
      progress.setAttribute("aria-hidden", "true");
      var fill = el("span", "book-progress-fill");
      progress.appendChild(fill);
      info.appendChild(progress);

      card.appendChild(info);
      shelfEl.appendChild(card);
      updateCard(book);
    });
  }

  function loadManifest() {
    if (!window.fetch) {
      shelfStatus.hidden = false;
      shelfStatus.textContent = "This browser cannot load the shelf.";
      return;
    }

    shelfStatus.hidden = false;
    shelfStatus.textContent = "Warming up the reading lamp…";

    fetch(MANIFEST_URL.href, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        var list = Array.isArray(data) ? data : (data && data.books);
        if (!Array.isArray(list) || !list.length) throw new Error("Empty manifest");
        books = list.filter(function (book) {
          return book &&
            typeof book.slug === "string" &&
            typeof book.title === "string" &&
            typeof book.path === "string";
        });
        if (!books.length) throw new Error("No valid books");
        renderShelf();
        shelfStatus.hidden = true;
        shelfStatus.textContent = "";
      })
      .catch(function () {
        shelfStatus.hidden = false;
        shelfStatus.textContent = "";

        var message = el("p", "book-shelf-error",
          "The shelf could not be loaded. If you opened this page as a local file, try a small web server instead.");
        shelfStatus.appendChild(message);

        var retry = el("button", "book-retry", "Try again");
        retry.type = "button";
        retry.addEventListener("click", loadManifest);
        shelfStatus.appendChild(retry);
      });
  }

  /* ---------- reader ---------- */

  function applyFont() {
    readerContent.style.fontSize = storedFont + "px";
    readerSmaller.disabled = storedFont <= 15;
    readerLarger.disabled = storedFont >= 26;
  }

  function setFont(delta) {
    // Keep the paragraph under the reading line in place when the type
    // reflows. Anchoring to the chapter heading alone drifts when the user
    // is halfway down a long chapter.
    var probe = document.elementFromPoint(
      Math.max(20, window.innerWidth / 2),
      160
    );
    var anchor = probe && probe.closest
      ? probe.closest("p, li, blockquote, h1, h2, h3, .book-chapter")
      : null;
    if (!anchor || !readerContent.contains(anchor)) {
      anchor = document.getElementById("book-chapter-" +
        (currentChapter || currentChapterFromScroll()));
    }
    var anchorTop = anchor ? anchor.getBoundingClientRect().top : 0;

    storedFont = clamp(storedFont + delta, 15, 26);
    try { localStorage.setItem(FONT_KEY, String(storedFont)); } catch (e) {}
    applyFont();

    if (anchor) {
      var newTop = anchor.getBoundingClientRect().top;
      window.scrollBy(0, newTop - anchorTop);
    }
    updateProgress();
  }

  function closeToc() {
    if (!tocOpen) return;
    tocOpen = false;
    readerToc.hidden = true;
    readerTocBtn.setAttribute("aria-expanded", "false");
  }

  function toggleToc() {
    tocOpen = !tocOpen;
    readerToc.hidden = !tocOpen;
    readerTocBtn.setAttribute("aria-expanded", tocOpen ? "true" : "false");
  }

  function jumpToChapter(number) {
    var target = document.getElementById("book-chapter-" + number);
    if (!target) return;
    closeToc();
    scrollToEl(target, true);
  }

  function computeProgress() {
    if (!readerOpen || !readerContent) return 0;
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
    var rect = readerContent.getBoundingClientRect();
    var contentTop = rect.top + scrollTop;
    var contentHeight = readerContent.offsetHeight;
    var viewport = window.innerHeight;
    var start = contentTop - 96;
    var end = contentTop + contentHeight - viewport + 96;
    if (end <= start) return 0;
    return clamp((scrollTop - start) / (end - start), 0, 1);
  }

  function currentChapterFromScroll() {
    var chapters = readerContent.querySelectorAll(".book-chapter");
    var index = 1;
    for (var i = 0; i < chapters.length; i++) {
      if (chapters[i].getBoundingClientRect().top <= 180) index = i + 1;
      else break;
    }
    return index;
  }

  function updateProgress() {
    if (!readerOpen || !currentBook) return;

    var ratio = computeProgress();
    readerProgressBar.style.width = (ratio * 100).toFixed(2) + "%";
    readerProgress.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));

    var chapter = currentChapterFromScroll();
    if (chapter !== currentChapter) {
      currentChapter = chapter;
      if (readerChapter) {
        readerChapter.textContent = chapter + " of " + currentChapters.length;
      }
      var links = readerToc.querySelectorAll(".toc-link");
      for (var i = 0; i < links.length; i++) {
        var linkChapter = Number(links[i].getAttribute("data-chapter"));
        if (linkChapter === chapter) links[i].setAttribute("aria-current", "true");
        else links[i].removeAttribute("aria-current");
      }
    }
  }

  function savePosition() {
    if (!currentBook || !readerOpen) return;
    setProgress(currentBook.slug, computeProgress(), currentChapter);
    updateCard(currentBook);
  }

  function scheduleSave() {
    if (!currentBook) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(savePosition, 300);
  }

  function restorePosition(book) {
    var entry = getProgress(book.slug);
    var ratio = entry && entry.ratio < 0.98 ? entry.ratio : 0;

    requestAnimationFrame(function () {
      if (currentBook !== book || !readerOpen) return;

      if (ratio <= 0.01) {
        scrollToEl(readerEl, false);
        updateProgress();
        return;
      }

      var scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
      var rect = readerContent.getBoundingClientRect();
      var contentTop = rect.top + scrollTop;
      var contentHeight = readerContent.offsetHeight;
      var viewport = window.innerHeight;
      var start = contentTop - 96;
      var end = contentTop + contentHeight - viewport + 96;
      var target = start + ratio * (end - start);

      window.scrollTo({ top: Math.max(0, target), behavior: "auto" });
      updateProgress();
    });
  }

  function showReaderError(book, trigger) {
    readerContent.innerHTML = "";

    var box = el("div", "reader-error");
    box.appendChild(el("p", "reader-error-title", "This book could not be opened."));
    box.appendChild(el("p", null,
      "The Markdown file may be missing, or the page may be offline and the book not cached yet."));

    var retry = el("button", "reader-btn", "Try again");
    retry.type = "button";
    retry.addEventListener("click", function () { openBook(book, trigger); });
    box.appendChild(retry);

    readerContent.appendChild(box);
    readerEnd.hidden = true;
  }

  function renderBook(parsed, book) {
    readerContent.innerHTML = "";
    currentChapters = parsed.chapters;
    currentChapter = 0;

    if (parsed.frontHtml) {
      var front = el("div", "book-front");
      front.innerHTML = parsed.frontHtml;
      readerContent.appendChild(front);
    }

    var tocList = document.createElement("ol");

    parsed.chapters.forEach(function (chapter, index) {
      var chapterNumber = index + 1;
      var chapterSection = el("section", "book-chapter");
      chapterSection.id = "book-chapter-" + chapterNumber;
      chapterSection.setAttribute("data-chapter", String(chapterNumber));

      var heading = el("h2", "chapter-title");
      heading.setAttribute("aria-label", chapter.title);
      var titleMatch = chapter.title.match(/^([IVXLCDM]+)\.\s*(.+)$/);
      if (titleMatch) {
        heading.appendChild(el("span", "chapter-num", titleMatch[1] + "."));
        heading.appendChild(document.createTextNode(titleMatch[2]));
      } else {
        heading.textContent = chapter.title;
      }
      chapterSection.appendChild(heading);

      var body = el("div", "chapter-body");
      body.innerHTML = chapter.html;
      chapterSection.appendChild(body);

      readerContent.appendChild(chapterSection);

      var item = document.createElement("li");
      var link = el("button", "toc-link", chapter.title);
      link.type = "button";
      link.setAttribute("data-chapter", String(chapterNumber));
      link.addEventListener("click", function () { jumpToChapter(chapterNumber); });
      item.appendChild(link);
      tocList.appendChild(item);
    });

    readerToc.innerHTML = "";
    readerToc.appendChild(tocList);
    readerEnd.hidden = false;
    if (readerChapter) {
      readerChapter.textContent = "1 of " + parsed.chapters.length;
    }

    applyFont();
    updateProgress();
  }

  function openBook(book, trigger) {
    lastTrigger = trigger || null;
    currentBook = book;
    currentChapters = [];
    currentChapter = 1;
    readerOpen = true;
    tocOpen = false;

    section.classList.add("is-reading");
    shelfEl.hidden = true;
    readerEl.hidden = false;
    readerEl.setAttribute("aria-busy", "true");
    document.body.classList.add("is-reading-room");

    readerTitle.textContent = book.title;
    readerKicker.textContent = "By " + (book.author || "random2") +
      " · " + formatMinutes(book.minutes) +
      (book.lang ? " · " + book.lang.toUpperCase() : "");

    var url = bookUrl(book);
    readerDownload.href = url;
    readerDownload.setAttribute("download", book.slug + ".md");

    readerContent.innerHTML = '<p class="reader-loading">Opening the book…</p>';
    readerEnd.hidden = true;
    readerToc.innerHTML = "";
    readerToc.hidden = true;
    readerTocBtn.setAttribute("aria-expanded", "false");
    readerProgressBar.style.width = "0%";
    readerProgress.setAttribute("aria-valuenow", "0");
    if (readerChapter) readerChapter.textContent = "";
    applyFont();

    focusEl(readerTitle);
    scrollToEl(readerEl, false);

    fetch(url, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.text();
      })
      .then(function (markdown) {
        if (currentBook !== book || !readerOpen) return;
        renderBook(parseBook(markdown), book);
        readerEl.removeAttribute("aria-busy");
        restorePosition(book);
      })
      .catch(function () {
        if (currentBook !== book || !readerOpen) return;
        readerEl.removeAttribute("aria-busy");
        showReaderError(book, trigger);
      });
  }

  function closeBook() {
    if (!readerOpen) return;

    savePosition();

    readerOpen = false;
    currentBook = null;
    currentChapters = [];
    currentChapter = 1;

    section.classList.remove("is-reading");
    readerEl.hidden = true;
    shelfEl.hidden = false;
    document.body.classList.remove("is-reading-room");

    readerContent.innerHTML = "";
    readerToc.innerHTML = "";
    readerToc.hidden = true;
    tocOpen = false;
    readerTocBtn.setAttribute("aria-expanded", "false");
    readerEl.removeAttribute("aria-busy");

    updateAllCards();

    var focusTarget = lastTrigger && document.contains(lastTrigger)
      ? lastTrigger
      : shelfEl.querySelector(".book-open");
    focusEl(focusTarget);
    scrollToEl(section, true);
  }

  /* ---------- events ---------- */

  readerClose.addEventListener("click", closeBook);
  readerEndClose.addEventListener("click", closeBook);
  readerTocBtn.addEventListener("click", toggleToc);
  readerSmaller.addEventListener("click", function () { setFont(-1); });
  readerLarger.addEventListener("click", function () { setFont(1); });

  window.addEventListener("scroll", function () {
    if (!readerOpen || scrollRaf) return;
    scrollRaf = requestAnimationFrame(function () {
      scrollRaf = 0;
      updateProgress();
      scheduleSave();
    });
  }, { passive: true });

  window.addEventListener("resize", function () {
    if (readerOpen) updateProgress();
  }, { passive: true });

  window.addEventListener("pagehide", function () {
    if (readerOpen) savePosition();
  });

  document.addEventListener("keydown", function (e) {
    if (!readerOpen || e.key !== "Escape") return;
    if (tocOpen) {
      closeToc();
      focusEl(readerTocBtn);
    } else {
      closeBook();
    }
    e.preventDefault();
  });

  loadManifest();
})();
