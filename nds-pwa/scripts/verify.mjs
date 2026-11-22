/*
 * nds-pwa/scripts/verify.mjs — PWA build/contract check (no dependencies).
 *
 * Pocket DS is a static PWA: GitHub Pages publishes the folder as-is. This
 * script is the "build" step — it fails the pipeline before deployment if a
 * source module, icon or precache entry is missing, which would otherwise
 * ship a broken offline app.
 *
 *   node nds-pwa/scripts/verify.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

let failures = 0;
const ok = (msg) => console.log(`OK   ${msg}`);
const bad = (msg) => { failures++; console.log(`FAIL ${msg}`); };
const exists = (p, label) => (existsSync(p) ? ok(label) : bad(label));

/* 1. Required sources. */
for (const file of [
    'index.html', 'styles.css', 'manifest.json', 'service-worker.js',
    'src/main.js', 'src/config.js', 'src/core/core-api.js',
    'icons/icon-192.svg', 'icons/icon-512.svg',
    'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png',
]) {
    exists(join(root, file), file);
}

/* 2. Manifest is valid and every icon exists. */
let manifest = null;
try {
    manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
    ok('manifest.json parses');
} catch (err) {
    bad(`manifest.json: ${err.message}`);
}
if (manifest) {
    if (!manifest.name && !manifest.short_name) bad('manifest has no name/short_name');
    else ok('manifest has a name');
    if (!/^\.\//.test(manifest.start_url || '')) bad('manifest start_url must be relative (./)');
    else ok('manifest start_url is relative');
    for (const icon of manifest.icons || []) {
        exists(join(root, icon.src), `manifest icon ${icon.src}`);
    }
}

/* 3. Service-worker precache list matches real files. */
const sw = readFileSync(join(root, 'service-worker.js'), 'utf8');
const block = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
if (!block) {
    bad('service-worker.js has no ASSETS array');
} else {
    const assets = [...block[1].matchAll(/['"](\.\/[^'"]+)['"]/g)].map((m) => m[1]);
    if (!assets.length) bad('service-worker ASSETS is empty');
    for (const asset of assets) {
        const file = asset.replace(/^\.\//, '') || 'index.html';
        exists(join(root, file), `precache ${asset}`);
    }
    ok(`service worker precaches ${assets.length} entries`);
}

/* 4. index.html local references resolve. */
const html = readFileSync(join(root, 'index.html'), 'utf8');
if (/rel=["']manifest["']/i.test(html)) ok('index.html links the manifest');
else bad('index.html does not link the manifest');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1].split('#')[0].split('?')[0])
    .filter((p) => p && !/^(?:https?:|data:|mailto:)/.test(p));
for (const ref of refs) exists(join(root, ref), `html ref ${ref}`);

/* 5. ES module imports resolve. */
function walk(dir) {
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name);
        return statSync(p).isDirectory() ? walk(p) : [p];
    });
}
const modules = walk(join(root, 'src')).filter((f) => f.endsWith('.js'));
let imports = 0;
for (const file of modules) {
    const code = readFileSync(file, 'utf8');
    for (const m of code.matchAll(/(?:from\s+|import\s+)['"](\.[^'"]+)['"]/g)) {
        imports++;
        const target = resolve(dirname(file), m[1]);
        if (!existsSync(target)) bad(`${relative(root, file)} imports missing ${m[1]}`);
    }
}
ok(`${modules.length} modules, ${imports} local imports resolve`);

/* 6. No runtime network dependencies (the app must open offline). */
const remoteScript = /<script\b[^>]*\bsrc\s*=\s*["']https?:/i.test(html);
const remoteLink = /<link\b[^>]*\brel\s*=\s*["'][^"']*(?:stylesheet|preload|modulepreload|icon)[^"']*["'][^>]*\bhref\s*=\s*["']https?:/i.test(html);
if (remoteScript || remoteLink) {
    bad('index.html loads a remote script/stylesheet');
} else ok('no remote script/stylesheet in index.html');
const css = readFileSync(join(root, 'styles.css'), 'utf8');
if (/@import|url\(\s*['"]?https?:/i.test(css)) bad('styles.css has a remote resource');
else ok('no remote resources in styles.css');

if (failures) {
    console.error(`\nPocket DS: ${failures} problem(s) found.`);
    process.exit(1);
}
console.log('\nPocket DS PWA contract OK — safe to publish to Pages.');
