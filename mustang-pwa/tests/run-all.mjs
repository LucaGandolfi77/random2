import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const suites = [
    ["syntax", "src/data.js"],
    ["syntax", "src/audio.js"],
    ["syntax", "src/art.js"],
    ["syntax", "src/game.js"],
    ["syntax", "service-worker.js"],
    ["data", "tests/check-data.mjs"],
    ["wiring", "tests/check-wiring.mjs"],
    ["smoke", "tests/smoke.mjs"],
];

let failed = 0;
for (const [label, file] of suites) {
    const args = label === "syntax" ? ["--check", file] : [file];
    const r = spawnSync(process.execPath, args, { cwd: root, stdio: label === "syntax" ? "pipe" : "inherit" });
    const ok = r.status === 0;
    if (!ok) failed++;
    console.log((ok ? "  ok    " : "  FAIL  ") + label.padEnd(7) + file);
    if (!ok && label === "syntax" && r.stderr) console.log(String(r.stderr).trim());
}

console.log(failed === 0
    ? "\nOK: " + suites.length + " suites passed"
    : "\nFAILED: " + failed + " of " + suites.length + " suites");
process.exit(failed === 0 ? 0 : 1);
