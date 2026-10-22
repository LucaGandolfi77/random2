/*
 * GULPER - regenerate the daily ledger.
 *
 * The daily hunt hands the player the biomass the campaign had in hand
 * when it walked into that level. Those numbers come from the campaign
 * the simulation proves winnable, so they are measured, never typed.
 *
 *   node tools/ledger.js          print the table
 *   node tools/ledger.js --write  rewrite src/modes.js in place
 *
 * The ledger is keyed by level id, so adding a level to the campaign
 * never moves the street a past date played.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { entryMass } = require("../tests/chain.js");

const SRC = path.join(__dirname, "..", "src", "modes.js");
const mass = entryMass();

/* The campaign's order, so the table reads in the order you play it. */
const ids = Object.keys(mass);

/* Wrap at four entries per line, or two when the ids are long. */
function format() {
    const lines = [];
    let line = "        ";
    for (const id of ids) {
        const piece = '"' + id + '": ' + mass[id];
        if (line.length + piece.length > 76) {
            lines.push(line.trimEnd());
            line = "        ";
        }
        line += piece + ", ";
    }
    if (line.trim()) lines.push(line.trimEnd().replace(/,$/, ","));
    return lines.join("\n");
}

const block = "    /* LEDGER:BEGIN */\n" +
    "    var ENTRY_MASS = {\n" + format() + "\n    };\n" +
    "    /* LEDGER:END */";

if (process.argv.indexOf("--write") >= 0) {
    const src = fs.readFileSync(SRC, "utf8");
    const re = /    \/\* LEDGER:BEGIN \*\/[\s\S]*?    \/\* LEDGER:END \*\//;
    if (!re.test(src)) {
        console.error("GULPER ledger: no LEDGER block found in src/modes.js");
        process.exit(1);
    }
    fs.writeFileSync(SRC, src.replace(re, block));
    console.log("GULPER ledger: wrote " + ids.length + " entries to src/modes.js");
} else {
    console.log(block);
}
