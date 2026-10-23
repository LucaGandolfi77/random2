#!/usr/bin/env node
import { execFile } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createBridgeServer } from "./server.mjs";

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));

const HELP = `PocketCode bridge

Usage:
  pocketcode-bridge [options]

Options:
  --workspace <path>       Directory Pi is allowed to work in (default: cwd)
  --port <number>          Port to listen on (default: 4319)
  --host <host>            Interface to bind (default: 127.0.0.1)
  --web-root <path>        Serve the PocketCode PWA from this directory
  --data-dir <path>        Where devices and sessions are stored
  --allow-origin <origin>  Extra CORS origin (repeatable)
  --pi-bin <path>          Pi executable (default: pi)
  --pi-arg <arg>           Argument passed before Pi's RPC flags (repeatable)
  --idle-minutes <number>  Stop idle Pi processes after this long (default: 10)
  --pair-ttl-minutes <n>   Pairing code lifetime (default: 5)
  --help                   Show this help
  --version                Show the bridge version

Environment:
  POCKETCODE_DATA_DIR      Same as --data-dir
  POCKETCODE_WEB_ROOT      Same as --web-root
  PI_BIN                   Same as --pi-bin
  OPENCODE_AGENT_BRIDGE    Set to 1 when launched by an agent
`;

function takeValue(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

export function parseArgs(argv) {
  const options = {
    workspace: process.cwd(),
    host: "127.0.0.1",
    port: 4319,
    webRoot: process.env.POCKETCODE_WEB_ROOT || "",
    dataDir: process.env.POCKETCODE_DATA_DIR || "",
    allowOrigins: [],
    piBin: process.env.PI_BIN || "pi",
    piArgs: [],
    idleMinutes: 10,
    pairTtlMinutes: 5,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--workspace":
        options.workspace = takeValue(argv, i, arg);
        i += 1;
        break;
      case "--host":
        options.host = takeValue(argv, i, arg);
        i += 1;
        break;
      case "--port":
        options.port = Number(takeValue(argv, i, arg));
        i += 1;
        break;
      case "--web-root":
        options.webRoot = takeValue(argv, i, arg);
        i += 1;
        break;
      case "--data-dir":
        options.dataDir = takeValue(argv, i, arg);
        i += 1;
        break;
      case "--allow-origin":
        options.allowOrigins.push(takeValue(argv, i, arg));
        i += 1;
        break;
      case "--pi-bin":
        options.piBin = takeValue(argv, i, arg);
        i += 1;
        break;
      case "--pi-arg":
        options.piArgs.push(takeValue(argv, i, arg));
        i += 1;
        break;
      case "--idle-minutes":
        options.idleMinutes = Number(takeValue(argv, i, arg));
        i += 1;
        break;
      case "--pair-ttl-minutes":
        options.pairTtlMinutes = Number(takeValue(argv, i, arg));
        i += 1;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--version":
      case "-v":
        options.version = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    throw new Error("--port must be an integer between 0 and 65535");
  }
  if (!Number.isFinite(options.idleMinutes) || options.idleMinutes < 0) {
    throw new Error("--idle-minutes must be a positive number");
  }
  if (!Number.isFinite(options.pairTtlMinutes) || options.pairTtlMinutes <= 0) {
    throw new Error("--pair-ttl-minutes must be a positive number");
  }
  if (!options.webRoot) {
    const sibling = resolve(here, "..", "pocketcode-pwa");
    if (existsSync(sibling)) options.webRoot = sibling;
  }
  return options;
}

async function detectPiVersion(piBin, piArgs) {
  try {
    const { stdout, stderr } = await execFileAsync(piBin, [...piArgs, "--version"], {
      timeout: 15000,
      env: process.env,
    });
    const line = (stdout || stderr || "").trim().split(/\r?\n/)[0] || "";
    return line.replace(/^pi\s+/i, "").trim();
  } catch {
    return "";
  }
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export async function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    console.error("Run with --help for usage.");
    process.exitCode = 1;
    return null;
  }
  if (options.help) {
    console.log(HELP.trimEnd());
    return null;
  }
  if (options.version) {
    console.log("1.0.0");
    return null;
  }
  const workspace = resolve(options.workspace);
  if (!isDirectory(workspace)) {
    console.error(`Workspace is not a directory: ${workspace}`);
    process.exitCode = 1;
    return null;
  }
  const webRoot = options.webRoot ? resolve(options.webRoot) : null;
  if (webRoot && !existsSync(webRoot)) {
    console.error(`Web root does not exist: ${webRoot}`);
    process.exitCode = 1;
    return null;
  }

  const piVersion = await detectPiVersion(options.piBin, options.piArgs);
  if (!piVersion) {
    console.error(`Warning: could not run "${options.piBin} --version". Set --pi-bin or PI_BIN.`);
  }

  const onCode = (pairing) => {
    const minutes = Math.round(options.pairTtlMinutes);
    console.log(`\nPairing code: ${pairing.code}  (valid ${minutes} min)`);
  };

  let bridge;
  try {
    bridge = await createBridgeServer({
      workspace,
      dataDir: options.dataDir || undefined,
      host: options.host,
      port: options.port,
      webRoot,
      piBin: options.piBin,
      piPrefixArgs: options.piArgs,
      allowOrigins: options.allowOrigins,
      idleAfterMs: options.idleMinutes * 60 * 1000,
      pairTtlMs: options.pairTtlMinutes * 60 * 1000,
      piVersion,
      onCode,
    });
  } catch (error) {
    console.error(`Could not start the bridge: ${error.message}`);
    process.exitCode = 1;
    return null;
  }

  const shownHost = options.host === "0.0.0.0" || options.host === "::" ? "127.0.0.1" : options.host;
  console.log("PocketCode bridge");
  console.log(`  Listening: http://${shownHost}:${bridge.port}`);
  console.log(`  Workspace: ${workspace}`);
  console.log(`  Pi:        ${piVersion || "not found"}`);
  if (webRoot) console.log(`  PWA:       http://${shownHost}:${bridge.port}/`);
  if (options.host === "0.0.0.0" || options.host === "::") {
    console.log("  Warning:   Listening on all interfaces. Prefer Tailscale Serve over plain HTTP.");
  }
  console.log("");
  console.log(`Pairing code: ${bridge.pairing.code}  (valid ${Math.round(options.pairTtlMinutes)} min)`);
  console.log("Open PocketCode, choose Connect, and enter the URL and code.");
  if (!webRoot) {
    console.log("Tip: pass --web-root ./pocketcode-pwa to serve the app from this bridge.");
  }

  const shutdown = async () => {
    console.log("\nStopping...");
    try {
      await bridge.close();
    } finally {
      process.exit(0);
    }
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return bridge;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
