import test from "node:test";
import assert from "node:assert/strict";
import {
    readFileSync,
    readdirSync,
    existsSync,
    statSync
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { STORAGE_KEY, STORAGE_VERSION, SLUG, THEMES } from "../src/config.js";
import { loadPrefs, savePrefs } from "../src/storage.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
    return readFileSync(join(root, relativePath), "utf8");
}

function pngSize(relativePath) {
    const buffer = readFileSync(join(root, relativePath));
    assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG", relativePath + " is not a PNG");
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
    };
}

function prefStore(initial) {
    const map = new Map(Object.entries(initial || {}));
    return {
        getItem(key) {
            return map.has(key) ? map.get(key) : null;
        },
        setItem(key, value) {
            map.set(key, String(value));
        }
    };
}

const manifest = JSON.parse(read("manifest.json"));
const sw = read("service-worker.js");

test("the manifest is a complete installable PWA contract", () => {
    assert.equal(manifest.name, "Plane Shooter");
    assert.equal(manifest.short_name, "Plane");
    assert.equal(manifest.start_url, "./");
    assert.equal(manifest.scope, "./");
    assert.equal(manifest.display, "standalone");
    assert.equal(manifest.orientation, "portrait-primary");
    assert.equal(manifest.lang, "en");
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4);

    const names = manifest.icons.map((icon) => icon.src);
    assert.ok(names.includes("icons/icon-192.png"));
    assert.ok(names.includes("icons/icon-512.png"));
    assert.ok(names.includes("icons/icon-maskable-512.png"));
});

test("icon files exist and have the advertised dimensions", () => {
    const expected = {
        "icons/icon-192.png": 192,
        "icons/icon-512.png": 512,
        "icons/icon-maskable-512.png": 512,
        "icons/apple-touch-icon.png": 180
    };

    for (const [file, size] of Object.entries(expected)) {
        assert.ok(existsSync(join(root, file)), file + " is missing");
        assert.deepEqual(pngSize(file), { width: size, height: size });
    }
});

test("index.html wires the manifest, module entry point and iOS icon", () => {
    const html = read("index.html");

    assert.ok(html.includes('rel="manifest" href="manifest.json"'));
    assert.ok(html.includes('type="module" src="src/main.js"'));
    assert.ok(html.includes('rel="apple-touch-icon" href="icons/apple-touch-icon.png"'));
    assert.ok(html.includes("viewport-fit=cover"));
    assert.ok(html.includes('aria-live="polite"'));
    assert.equal(html.includes("user-scalable=no"), false);
    assert.equal(html.includes('src="game.js"'), false);
});

test("the service worker precaches every local file the game needs", () => {
    const match = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
    assert.ok(match, "ASSETS list not found");

    const assets = Array.from(match[1].matchAll(/"([^"]+)"/g), (item) => item[1]);
    assert.ok(assets.includes("./index.html"));
    assert.ok(assets.includes("./styles.css"));
    assert.ok(assets.includes("../shared/arcade.js"));
    assert.ok(assets.includes("./src/main.js"));

    for (const asset of assets) {
        const target = join(root, asset);
        assert.ok(existsSync(target), "precache target is missing: " + asset);
    }

    const srcFiles = readdirSync(join(root, "src")).filter((file) => file.endsWith(".js"));
    for (const file of srcFiles) {
        assert.ok(
            assets.includes("./src/" + file),
            "service worker does not precache src/" + file
        );
    }
});

test("every relative module import is covered by the precache list", () => {
    const match = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
    const assets = new Set(
        Array.from(match[1].matchAll(/"([^"]+)"/g), (item) => item[1])
    );

    const srcDir = join(root, "src");
    for (const file of readdirSync(srcDir).filter((name) => name.endsWith(".js"))) {
        const source = readFileSync(join(srcDir, file), "utf8");
        const imports = source.matchAll(/(?:from\s+|import\s*\(\s*)["'](\.[^"']+)["']/g);

        for (const entry of imports) {
            const absolute = resolve(srcDir, entry[1]);
            const rel = "./" + relative(root, absolute).split(sep).join("/");
            assert.ok(assets.has(rel), file + " imports " + rel + " but it is not precached");
        }
    }
});

test("the service worker only deletes caches with its own prefix", () => {
    assert.ok(sw.includes('const CACHE_PREFIX = "plane-pwa-";'));
    assert.ok(sw.includes("key.indexOf(CACHE_PREFIX) === 0"));
    assert.ok(sw.includes('CACHE_NAME = "plane-pwa-v5"'));
});

test("storage key, slug and theme table are stable contracts", () => {
    assert.equal(STORAGE_KEY, "plane-pwa");
    assert.equal(STORAGE_VERSION, 2);
    assert.equal(SLUG, "plane-pwa/");
    assert.deepEqual(Object.keys(THEMES).sort(), ["forest", "neon", "ocean", "retro"]);
});

test("loadPrefs migrates the old highScore/theme save", () => {
    const store = prefStore({
        [STORAGE_KEY]: JSON.stringify({ highScore: 420, theme: "ocean" })
    });

    const prefs = loadPrefs(store);
    assert.equal(prefs.highScore, 420);
    assert.equal(prefs.bestWave, 1);
    assert.equal(prefs.theme, "ocean");
    assert.equal(prefs.installDismissed, false);
    assert.equal(prefs.version, STORAGE_VERSION);
});

test("loadPrefs honours the old separate install-dismissal key", () => {
    const store = prefStore({
        [STORAGE_KEY]: JSON.stringify({ highScore: 10, theme: "neon" }),
        "plane-install-dismissed": "true"
    });

    assert.equal(loadPrefs(store).installDismissed, true);
});

test("loadPrefs survives corrupt data and unknown themes", () => {
    const corrupt = prefStore({ [STORAGE_KEY]: "{not json" });
    assert.equal(loadPrefs(corrupt).theme, "neon");

    const unknown = prefStore({
        [STORAGE_KEY]: JSON.stringify({ highScore: -2, theme: "banana" })
    });
    const prefs = loadPrefs(unknown);
    assert.equal(prefs.highScore, 0);
    assert.equal(prefs.theme, "neon");
});

test("savePrefs writes the versioned shape and sanitises values", () => {
    const store = prefStore();
    const saved = savePrefs({
        highScore: 120.7,
        bestWave: 0,
        theme: "forest",
        installDismissed: true
    }, store);

    assert.equal(saved, true);
    assert.deepEqual(JSON.parse(store.getItem(STORAGE_KEY)), {
        version: 2,
        highScore: 120,
        bestWave: 1,
        theme: "forest",
        installDismissed: true
    });
});

test("there are no remote runtime resources in the shell or the modules", () => {
    const files = [
        "index.html",
        "styles.css",
        "src/config.js",
        "src/sim.js",
        "src/render.js",
        "src/input.js",
        "src/storage.js",
        "src/ui.js",
        "src/main.js"
    ];

    for (const file of files) {
        const text = read(file);
        assert.equal(/https?:\/\//.test(text), false, file + " references a remote URL");
    }
});

test("the package declares ESM so node runs the same modules as the browser", () => {
    const pkg = JSON.parse(read("package.json"));
    assert.equal(pkg.type, "module");
    assert.ok(pkg.scripts.test.includes("node --test"));
});

test("the old monolithic game.js is gone", () => {
    assert.equal(existsSync(join(root, "game.js")), false);
    assert.equal(statSync(join(root, "src")).isDirectory(), true);
});
