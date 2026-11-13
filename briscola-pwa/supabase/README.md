# Briscola — Supabase backend

> Guida completa e best practice: [`../docs/SUPABASE_GUIDE.md`](../docs/SUPABASE_GUIDE.md).

The online rooms are intentionally server-authoritative:

- the browser only reads rooms it belongs to and **its own hand**;
- the full deck and both hands live in `room_secrets`, which has RLS enabled and no client policies;
- `rooms.public_state` is the only game state broadcast to the other player;
- the `briscola` Edge Function uses the service role key to deal, validate and persist moves.

## 1. Create the project

1. Create a project at [supabase.com](https://supabase.com).
2. In **Authentication → Providers**, enable **Anonymous Sign-Ins**. The game does not ask for email or a password.
3. Copy the project URL and the **anon/public** key. Never use the service role key in the client.

## 2. Apply the schema

From this folder:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste `migrations/20261112090000_briscola.sql` into the Supabase SQL editor.

The migration creates:

- `rooms` — public lobby and broadcast state;
- `room_hands` — one row per player, readable only by that player;
- `room_secrets` — full engine state, inaccessible to clients;
- RLS policies, indexes, and the `rooms` realtime publication.

## 3. Deploy the Edge Function

```bash
npm run sync:engine
supabase functions deploy briscola
```

The function is called with the player's anonymous JWT. It receives the action:

- `create` — create a room and a five-character code;
- `join` — join by code;
- `start` — host starts and the server deals;
- `play` — play one card and resolve the trick;
- `leave` — leave or resign;
- `state` — reload a room.

Do not deploy with `--no-verify-jwt`: the function relies on `auth.uid()`.

## 4. Configure the frontend

Create `briscola-pwa/.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Then restart the dev server. Without these variables the PWA still works against the CPU and shows an “online non configurato” notice.

For the GitHub Pages workflow, add repository secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

The `pages.yml` build passes them to Vite. If they are missing, the deployed PWA remains offline/local only.

## Security notes

- `room_secrets` must never receive a client grant or RLS policy.
- `room_hands` is readable only by `auth.uid() = user_id`; it is written by the service role only.
- The public room state contains hand **counts**, never the cards.
- The Edge Function validates turn order, card ownership and the finished state on every move.
- Room codes are invite codes, not passwords. Do not put personal data in a room name.
- This is an MVP. It does not implement rate limiting, room cleanup jobs or moderation.

## Local development caveat

`supabase start` needs Docker. If Docker is unavailable, the SQL and Edge Function can be reviewed but the online mode cannot be exercised end-to-end. The local CPU game remains fully playable.
