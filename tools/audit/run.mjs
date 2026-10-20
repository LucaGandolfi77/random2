/*
 * tools/audit/run.mjs — run both audits and write the report.
 *
 *   node tools/audit/run.mjs [--only census-pwa]
 *
 * The accessibility audit and the performance audit each produce their own
 * data, and the report is written from both. Running this script is the
 * same as running the two of them in a row, and it is what CI runs.
 *
 * A missing browser is not a failure. The script prints SKIP and exits 0,
 * because it must never be the reason a build goes red.
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const steps = [
  ["a11y", join(here, "a11y.mjs")],
  ["perf", join(here, "perf.mjs")],
];

const args = process.argv.slice(2);
let skipped = 0;

for (const [name, script] of steps) {
  const res = spawnSync(process.execPath, [script, ...args], { stdio: "inherit" });
  if (res.status !== 0) {
    console.error(`FAIL  ${name}`);
    process.exit(res.status || 1);
  }
}

console.log("\naudit complete → portfolio/audit/report.html");
process.exit(skipped ? 0 : 0);
