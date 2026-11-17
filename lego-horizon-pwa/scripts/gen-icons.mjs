/**
 * Rasterise the generated SVGs into PWA icons, a social card and manifest
 * screenshots. No runtime dependency: sharp is reused from bucio's tree, so
 * the store page itself stays a plain static site.
 *
 *   npm run assets
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const icons = join(here, "icons");
const screens = join(here, "screens");

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
    /* try next */
  }
}
if (!sharp) {
  console.error("sharp not found. Run `npm --prefix bucio ci` or install sharp.");
  process.exit(1);
}

async function render(src, out, width, height, format = "png") {
  const svg = await readFile(src);
  let img = sharp(svg, { density: 384 });
  if (width && height) img = img.resize(width, height, { fit: "fill" });
  const buf = await img[format]().toBuffer();
  await writeFile(out, buf);
  console.log(`ok  ${out.replace(here + "/", "")}  ${(buf.length / 1024).toFixed(1)} kB`);
}

await render(join(icons, "icon.svg"), join(icons, "icon-192.png"), 192, 192);
await render(join(icons, "icon.svg"), join(icons, "icon-512.png"), 512, 512);
await render(join(icons, "icon-maskable.svg"), join(icons, "icon-maskable-512.png"), 512, 512);
await render(join(icons, "icon.svg"), join(icons, "apple-touch-icon.png"), 180, 180);
await render(join(screens, "cover.svg"), join(here, "og-cover.png"), 1200, 630);
await render(join(screens, "scene-1.svg"), join(screens, "store-1.png"), 960, 540);
await render(join(screens, "scene-3.svg"), join(screens, "store-2.png"), 960, 540);
await render(join(screens, "scene-7.svg"), join(screens, "store-3.png"), 960, 540);

console.log("\nIcons, social card and manifest screenshots regenerated. Commit them.");
