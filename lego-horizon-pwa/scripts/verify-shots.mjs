/* Visual regression smoke: regenerate baselines into a temp folder and compare
 * dimensions and byte size against the committed screenshots. Exact hash
 * comparison is deliberately avoided because animated frames vary in time.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const baseline = join(here, "screens", "qa");
const target = mkdtempSync(join(tmpdir(), "lego-shots-"));
const base = process.argv[2] || "http://localhost:8099/lego-horizon-pwa/";

let failed = false;
try {
  execFileSync("npm", ["run", "shots", "--", base], {
    cwd: here,
    env: { ...process.env, SHOTS_DIR: target },
    stdio: "inherit",
  });

  const dims = (file) => {
    const b = readFileSync(file);
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  };

  for (const name of readdirSync(baseline).filter((f) => f.endsWith(".png"))) {
    const oldFile = join(baseline, name);
    const newFile = join(target, name);
    if (!readdirSync(target).includes(name)) {
      console.log(`FAIL  ${name} was not regenerated`);
      failed = true;
      continue;
    }
    const oldSize = statSync(oldFile).size;
    const newSize = statSync(newFile).size;
    const drift = Math.abs(newSize - oldSize) / Math.max(1, oldSize);
    const sameDims = JSON.stringify(dims(oldFile)) === JSON.stringify(dims(newFile));
    const ok = sameDims && drift < 0.2;
    console.log(`${ok ? "ok  " : "FAIL"}  ${name}  size ${oldSize} → ${newSize} (${(drift * 100).toFixed(1)}%)`);
    if (!ok) failed = true;
  }
} finally {
  try { rmSync(target, { recursive: true, force: true }); } catch { /* busy profile */ }
}

process.exit(failed ? 1 : 0);
