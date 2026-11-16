import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const iconsDir = join(here, "icons");
const require = createRequire(import.meta.url);
let sharp;

for (const spec of [join(here, "..", "bucio", "node_modules", "sharp"), "sharp"]) {
  try {
    sharp = require(spec);
    break;
  } catch {
    /* try the next one */
  }
}

if (!sharp) {
  console.error("sharp not found. Run: npm --prefix bucio ci");
  process.exit(1);
}

const normal = await readFile(join(iconsDir, "icon.svg"));
const maskable = await readFile(join(iconsDir, "icon-maskable.svg"));
await mkdir(iconsDir, { recursive: true });

const jobs = [
  [normal, "icon-192.png", 192],
  [normal, "icon-512.png", 512],
  [maskable, "icon-maskable-512.png", 512],
  [maskable, "apple-touch-icon.png", 180]
];

for (const [source, name, size] of jobs) {
  const png = await sharp(source, { density: 384 })
    .resize(size, size, { fit: "fill" })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
  await writeFile(join(iconsDir, name), png);
  console.log(`ok  ${name}  (${size}x${size}, ${(png.length / 1024).toFixed(1)} kB)`);
}
