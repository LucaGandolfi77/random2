/*
 * Extract the bilingual prose corpus out of the book PWAs.
 *
 *   node tools/corpora/extract.mjs
 *   node tools/corpora/extract.mjs --out tools/corpora/out/corpus.json
 *
 * The literary PWAs keep their text inside ES modules as object literals,
 * which is convenient for the game and useless for statistics. This writes
 * the prose out as one JSON file that tools/corpora/analyze.py can read.
 *
 * Standard library only. The extraction is deliberately regex-based rather
 * than a full JS parse: the corpora are hand-authored literals, and a parse
 * would mean dragging in a parser for a one-shot export.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

function arg(name, fallback) {
    const i = process.argv.indexOf("--" + name);
    if (i === -1) return fallback;
    const v = process.argv[i + 1];
    return v === undefined || v.startsWith("--") ? true : v;
}

const OUT = String(arg("out", join(here, "out/corpus.json")));

/* The literary PWAs that hold prose. Each entry names a file and the
   directory it lives in; the shape of the data differs between them, so
   each source lists its own extraction pattern. */
const SOURCES = [
    { id: "bible", dir: "bible-pwa", file: "src/main.js" },
    { id: "recherche", dir: "recherche-pwa", file: "src/main.js" },
    { id: "crime-and-punishment", dir: "crime-and-punishment-pwa", file: "src/main.js" }
];

/*
 * Every prose string in these files appears as `text: { en: '...', it: '...' }`
 * or `en: '...'` / `it: '...'` on its own. Matching the two-language object
 * first and the bare strings after keeps a passage from being counted twice.
 */

/* Two shapes are in use across the literary PWAs:
     bible-pwa:  text: { en: '...', it: '...' }
     the novels: textEn: '...'  followed by  textIt: '...'
   Both must be recognised, and both must blank out the region they matched
   so the bare pass cannot see the same strings a second time. */
const PAIR_RE = /text:\s*\{\s*en:\s*(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*,\s*it:\s*(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\}/g;
const PREFIX_PAIR_RE = /textEn:\s*(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*,\s*textIt:\s*(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
const BARE_RE = /\b(?:textEn|textIt|en|it):\s*(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;

function langOf(key) {
    return key === "textEn" ? "en" : key === "textIt" ? "it" : key;
}

function unquote(s) {
    const body = s.slice(1, -1);
    return body
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, "\\");
}

function extractFrom(source, code) {
    const passages = [];
    const spans = [];

    // 1. text: { en, it }
    PAIR_RE.lastIndex = 0;
    let m;
    while ((m = PAIR_RE.exec(code)) !== null) {
        passages.push({ en: unquote(m[1]), it: unquote(m[2]) });
        spans.push([m.index, PAIR_RE.lastIndex]);
    }

    // 2. textEn / textIt, which may be far apart, so match them as one
    //    region bounded from the start of textEn to the end of textIt.
    PREFIX_PAIR_RE.lastIndex = 0;
    while ((m = PREFIX_PAIR_RE.exec(code)) !== null) {
        passages.push({ en: unquote(m[1]), it: unquote(m[2]) });
        spans.push([m.index, PREFIX_PAIR_RE.lastIndex]);
    }

    // Blank every matched region in a copy used only for the bare scan, so
    // an already-paired string cannot be counted a second time.
    let blanked = code;
    spans.sort((a, b) => b[0] - a[0]);
    for (const [a, b] of spans) {
        blanked = blanked.slice(0, a) + " ".repeat(b - a) + blanked.slice(b);
    }

    BARE_RE.lastIndex = 0;
    const singles = [];
    while ((m = BARE_RE.exec(blanked)) !== null) {
        const lang = langOf(m[0].slice(0, m[0].indexOf(":")));
        const text = unquote(m[1]);
        // Skip strings that are clearly not prose: short labels, paths, ids.
        if (text.length < 12) continue;
        if (/^[./\\a-z0-9_-]+$/i.test(text)) continue;
        singles.push({ [lang]: text });
    }

    return {
        id: source.id,
        paired: passages,
        singles
    };
}

function main() {
    const out = { generated: new Date().toISOString(), sources: [] };
    let totalPaired = 0, totalSingles = 0;

    for (const src of SOURCES) {
        const path = join(root, src.dir, src.file);
        if (!existsSync(path)) {
            console.warn("  skip  " + src.dir + " (missing " + src.file + ")");
            continue;
        }
        const code = readFileSync(path, "utf8");
        const got = extractFrom(src, code);
        out.sources.push(got);
        totalPaired += got.paired.length;
        totalSingles += got.singles.length;
        console.log("  " + src.id.padEnd(22) +
            String(got.paired.length).padStart(4) + " paired  " +
            String(got.singles.length).padStart(4) + " single-language");
    }

    if (!out.sources.length) {
        console.error("no sources found — are the paths right?");
        process.exit(1);
    }

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(out, null, 1));
    const bytes = JSON.stringify(out).length;
    console.log("\n" + totalPaired + " paired passages, " + totalSingles +
        " single-language strings");
    console.log("wrote " + OUT + " (" + Math.round(bytes / 1024) + " KB)");
    void readdirSync; void totalSingles;
}

main();