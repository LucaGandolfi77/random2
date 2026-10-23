# PocketCode bridge

Self-hosted bridge between the PocketCode PWA and Pi. It also serves the static
PWA when `--web-root` is supplied.

```sh
node cli.mjs --workspace ~/code/my-project --web-root ../pocketcode-pwa
```

The CLI prints a six-digit pairing code. Open the PWA at
`http://127.0.0.1:4319/`, choose **Pi · PocketCode bridge**, and enter the code.
Pairing returns a bearer token stored on the phone; the bridge keeps only a
SHA-256 hash.

## What it exposes

- `GET /api/health` (public)
- `POST /api/pair` (public, rate-limited)
- Authenticated: config, SSE events, models, sessions, messages, prompt, abort,
  steer, follow-up, model selection and permission responses
- Static PWA files from `--web-root`, without caching HTML entry points

The bridge spawns one Pi RPC process per session and stops it after the idle
timeout. It binds to `127.0.0.1` by default.

## Safety

The bridge grants control of a real coding agent and the tools it can run in
the workspace. Prefer a dedicated user and repository, a private Tailscale
endpoint, HTTPS, and an exact CORS allowlist. Never expose it directly to the
public internet.

See `../pocketcode-pwa/README.md` for setup, OpenCode configuration, flags and
tests.

```sh
npm start
npm test
```
