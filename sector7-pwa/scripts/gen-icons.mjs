/**
 * Rasterise the PWA icons from their SVG sources.
 *
 *   node --experimental-default-type=module sector7-pwa/scripts/gen-icons.mjs
 *
 * `sharp` is not a dependency of this game - the game itself ships no build
 * step and no node_modules. This script exists so the icon PNGs can be
 * regenerated on demand from the reviewed SVG; the PNGs it produces are
 * committed. sharp is already present in bucio/node_modules, so the import
 * below resolves from there without installing anything.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const icons = join(here, "icons");

/* Reach for sharp in bucio's tree, then fall back to the normal resolution
 * so the script also works if sharp is installed at the repo root. */
const require = createRequire(import.meta.url);
let sharp;
for (const spec of [
  join(here, "..", "bucio", "node_modules", "sharp"),
  "sharp",
]) {
  try {
    sharp = require(spec);
    break;
  } catch {
    /* try the next one */
  }
}
if (!sharp) {
  console.error(
    "sharp not found.\n" +
    "  Run: npm --prefix bucio ci   (or install sharp anywhere reachable)"
  );
  process.exit(1);
}

const JOBS = [
  { svg: "icon-192.svg", png: "icon-192.png", size: 192 },
  { svg: "icon-512.svg", png: "icon-512.png", size: 512 },
  { svg: "icon-512-maskable.svg", png: "icon-512-maskable.png", size: 512 },
];

await mkdir(icons, { recursive: true });

for (const job of JOBS) {
  const svg = await readFile(join(icons, job.svg));
  const png = await sharp(svg, { density: 384 })
    .resize(job.size, job.size, { fit: "fill" })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
  await writeFile(join(icons, job.png), png);
  console.log(`ok  ${job.png}  (${job.size}x${job.size}, ${(png.length / 1024).toFixed(1)} kB)`);
}

console.log("\nIcons regenerated. The PNGs are committed; this script never runs in CI.");