# PocketCode

A mobile command deck for your own coding agents. PocketCode is a static PWA
that talks either to the self-hosted PocketCode bridge (for Pi) or to a
running official `opencode serve`.

- Chat with the agent and watch the tool timeline update live.
- Answer permission requests, inspect diffs and todos, switch model/agent.
- Pair a phone with a short-lived code; the device gets a revocable token.
- Run the built-in **Try the demo** without any backend, even from GitHub Pages.
- No framework, no build step, no analytics, no third-party requests.

## Try the demo

Open `index.html` from any static server and choose **Try the demo**. The demo
uses no network and works offline once the service worker has cached the shell.

```sh
cd pocketcode-pwa
python3 -m http.server 8080
# http://localhost:8080
```

## Run the bridge (Pi)

The bridge is dependency-free Node 20+.

```sh
cd pocketcode-bridge
node cli.mjs \
  --workspace ~/code/my-project \
  --port 4319 \
  --web-root ../pocketcode-pwa
```

Open <http://127.0.0.1:4319/>, keep **Pi · PocketCode bridge** selected, enter
the bridge URL, paste the pairing code printed by the CLI, and connect.

Useful flags:

| Flag | Purpose |
| --- | --- |
| `--workspace <path>` | Directory the agent may work in. Defaults to `cwd`. |
| `--port <n>` | Listen port. Default `4319`. |
| `--host <addr>` | Bind address. Default `127.0.0.1`. |
| `--web-root <path>` | Serve this PWA from the bridge. |
| `--allow-origin <origin>` | Extra CORS origin for a hosted PWA. Repeatable. |
| `--data-dir <path>` | Device/session store. Default `~/.config/pocketcode`. |
| `--pi-bin <path>` | Pi executable if `pi` is not on `PATH`. |
| `--idle-minutes <n>` | Stop an idle Pi process. Default `10`. |
| `--pair-ttl-minutes <n>` | Pairing code lifetime. Default `5`. |

```sh
node cli.mjs --help
```

### Pairing a hosted PWA

The default CORS allowlist includes
`https://lucagandolfi77.github.io`, `http://localhost:8080` and
`http://localhost:8099`. If you host the PWA elsewhere, add its exact origin:

```sh
node cli.mjs --web-root ../pocketcode-pwa \
  --allow-origin https://your-phone-app.example
```

The bridge must be reachable over HTTPS from the phone. A private Tailscale
Serve endpoint is the recommended setup. Do **not** expose the bridge directly
to the public internet.

### Pi

Pi must be installed and runnable as `pi --version`. PocketCode starts:

```sh
pi --mode rpc --session-id <id>
```

The bridge keeps one Pi process per session, streams JSONL events over SSE, and
stops idle processes. The agent inherits the bridge's user and can run tools in
`--workspace`; use a dedicated user or a disposable checkout if you do not want
it to have broad access.

## Run against OpenCode

Start the official server with a password and the PWA origin allowed:

```sh
OPENCODE_SERVER_PASSWORD='pick-a-long-password' \
  opencode serve --port 4096 \
  --cors https://lucagandolfi77.github.io \
  --cors http://localhost:8080
```

Expose port 4096 over HTTPS (Tailscale Serve or a private reverse proxy). In
PocketCode choose **OpenCode · official server**, enter that HTTPS URL, username
`opencode`, and the password. OpenCode uses HTTP Basic auth for its API.

PocketCode uses the current official API:

- `GET /session`, `POST /session`, `GET /session/:id/message`
- `POST /session/:id/prompt_async`, `POST /session/:id/abort`
- `GET /session/:id/todo`, `GET /session/:id/diff`
- `GET /config/providers`, `GET /agent`, `GET /event`
- permission replies through `/session/:id/permissions/:id`, with the
  `/permission/:id/reply` fallback

Model preference is saved through `/api/session/:id/model` when available; the
model is also sent with each prompt, so a missing preference endpoint is
non-fatal.

## Security model

- Pairing codes are six digits, expire after five minutes, allow five attempts,
  and are rate-limited per address.
- Successful pairing returns a `pc_...` bearer token. Only its SHA-256 hash is
  stored (`~/.config/pocketcode`, mode `0600`).
- `/api/health` and `/api/pair` are public; every other API route requires a
  device token. CORS is an exact-origin allowlist, not `*`.
- Tokens can be revoked by deleting the device through the bridge store.
- The bridge is not a sandbox. Anyone with a valid token can drive the agent and
  the tools it may execute in the configured workspace.

## Development

```sh
cd pocketcode-pwa
npm test          # shell checks + headless browser smoke test
npm run icons     # regenerate PNG icons after editing icon-192.svg
```

The smoke test starts the real bridge with a fake Pi, then exercises demo mode,
pairing, chat, permission approval, tool cards and model selection in headless
Chromium. It skips cleanly if no Chromium is installed.

Bridge tests:

```sh
cd pocketcode-bridge
npm test
```

## Deployment

`pocketcode-pwa/` is plain static files. On GitHub Pages it lives at
`/random2/pocketcode-pwa/`; relative URLs and the manifest scope keep it
self-contained. Bump `CACHE_NAME` in `service-worker.js` when changing the app
shell. The service worker never caches `/api/*`.

## Browser support

Modern iOS Safari and Chromium browsers. The PWA uses `fetch` streaming for SSE
and `safe-area-inset-*` for installed iOS layouts. OpenCode CORS must allow the
`Authorization` header.

## License

Same license as the parent repository.
