import { dailyPlan, vaultById, vaults } from '@crew-of-one/content';
import { applyModifier, DAILY_MODIFIER_IDS, replayTracks, validateTracks } from '@crew-of-one/sim';
import type { GhostTrack, ModifierId } from '@crew-of-one/sim';
import type { DailyConfig, Entitlement } from '@crew-of-one/shared';

type Env = {
  DB: D1Database;
  DAILY: KVNamespace;
  ENVIRONMENT?: string;
  ENTITLEMENT_SECRET?: string;
  LEMON_SQUEEZY_WEBHOOK_SECRET?: string;
};

type RunBody = {
  dailyId: string;
  playerId: string;
  vaultId: string;
  echoes: number;
  timeMs: number;
  alarms: number;
  tracks: GhostTrack[];
};

const DAILY_KEY = 'daily:current';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
    },
  });

const todayUtc = (): string => new Date().toISOString().slice(0, 10);

export const isModifierId = (value: string): value is ModifierId =>
  (DAILY_MODIFIER_IDS as string[]).includes(value);

export const defaultDaily = (dailyId = todayUtc()): DailyConfig => {
  const startsAt = Date.parse(`${dailyId}T00:00:00.000Z`);
  const plan = dailyPlan(dailyId, vaults);
  if (plan) {
    return {
      dailyId,
      vaultId: plan.baseVault.id,
      modifier: plan.modifier.id,
      loopSeconds: plan.vault.loopSeconds,
      maxEchoes: plan.vault.maxEchoes,
      startsAt,
      endsAt: startsAt + 86_400_000,
    };
  }
  return {
    dailyId,
    vaultId: 'vault-01',
    modifier: 'fog',
    loopSeconds: 30,
    maxEchoes: 3,
    startsAt,
    endsAt: startsAt + 86_400_000,
  };
};

const getDaily = async (env: Env): Promise<DailyConfig> => {
  const cached = await env.DAILY.get(DAILY_KEY);
  if (!cached) return defaultDaily();
  try {
    const parsed = JSON.parse(cached) as DailyConfig;
    if (parsed.dailyId !== todayUtc() || !isModifierId(parsed.modifier)) {
      return defaultDaily();
    }
    return parsed;
  } catch {
    return defaultDaily();
  }
};

const isRunBody = (input: unknown): input is RunBody => {
  if (!input || typeof input !== 'object') return false;
  const value = input as Record<string, unknown>;
  return (
    typeof value.dailyId === 'string' &&
    typeof value.playerId === 'string' &&
    typeof value.vaultId === 'string' &&
    typeof value.echoes === 'number' &&
    typeof value.timeMs === 'number' &&
    typeof value.alarms === 'number' &&
    Array.isArray(value.tracks)
  );
};

const sha256Hex = async (text: string): Promise<string> => {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const signEntitlement = async (
  secret: string,
  payload: string,
): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const handleDaily = async (env: Env): Promise<Response> => {
  const daily = await getDaily(env);
  return json(daily);
};

const handleRun = async (request: Request, env: Env): Promise<Response> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid-json' }, 400);
  }

  if (!isRunBody(body)) return json({ error: 'invalid-body' }, 400);

  const daily = await getDaily(env);
  if (body.dailyId !== daily.dailyId) return json({ error: 'stale-daily' }, 409);

  if (body.vaultId !== daily.vaultId) return json({ error: 'wrong-vault' }, 409);

  const vault = vaultById(body.vaultId);
  if (!vault) return json({ error: 'unknown-vault' }, 404);

  const effectiveVault = isModifierId(daily.modifier)
    ? applyModifier(vault, daily.modifier)
    : vault;

  const issues = validateTracks(effectiveVault, body.tracks);
  if (issues.length > 0) return json({ error: 'invalid-tape', issues }, 400);

  const replay = replayTracks(effectiveVault, body.tracks);
  if (!replay.won) return json({ error: 'run-not-verified', issues: replay.issues }, 400);

  if (body.echoes !== body.tracks.length - 1) {
    return json({ error: 'echo-count-mismatch' }, 400);
  }

  if (body.echoes > daily.maxEchoes) {
    return json({ error: 'too-many-echoes' }, 400);
  }

  const now = Date.now();
  const runId = crypto.randomUUID();
  const tapeHash = await sha256Hex(JSON.stringify(body.tracks));

  const duplicate = await env.DB.prepare(
    'SELECT id FROM runs WHERE tape_hash = ? LIMIT 1',
  ).bind(tapeHash).first<{ id: string }>();
  if (duplicate) return json({ error: 'duplicate-tape' }, 409);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO runs
        (id, player_id, daily_id, vault_id, echoes, time_ms, alarms, tape_hash, verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    ).bind(
      runId,
      body.playerId,
      daily.dailyId,
      vault.id,
      body.echoes,
      body.timeMs,
      body.alarms,
      tapeHash,
      now,
    ),
    env.DB.prepare(
      `INSERT INTO players (id, nickname, created_at, last_seen)
       VALUES (?, NULL, ?, ?)
       ON CONFLICT(id) DO UPDATE SET last_seen = excluded.last_seen`,
    ).bind(body.playerId, now, now),
    env.DB.prepare(
      `INSERT INTO leaderboard (daily_id, player_id, run_id, best_echoes, best_time_ms, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(daily_id, player_id) DO UPDATE SET
         run_id = excluded.run_id,
         best_echoes = excluded.best_echoes,
         best_time_ms = excluded.best_time_ms,
         updated_at = excluded.updated_at
       WHERE excluded.best_echoes < leaderboard.best_echoes
          OR (excluded.best_echoes = leaderboard.best_echoes
              AND excluded.best_time_ms < leaderboard.best_time_ms)`,
    ).bind(daily.dailyId, body.playerId, runId, body.echoes, body.timeMs, now),
  ]);

  const rankRow = await env.DB.prepare(
    `SELECT COUNT(*) + 1 AS rank
     FROM leaderboard
     WHERE daily_id = ?
       AND (best_echoes < ? OR (best_echoes = ? AND best_time_ms < ?))`,
  ).bind(daily.dailyId, body.echoes, body.echoes, body.timeMs).first<{ rank: number }>();

  return json({
    ok: true,
    runId,
    dailyId: daily.dailyId,
    rank: rankRow?.rank ?? null,
    timeMs: replay.timeMs,
  });
};

const handleLeaderboard = async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url);
  const dailyId = url.searchParams.get('daily') ?? (await getDaily(env)).dailyId;
  const playerId = url.searchParams.get('player');

  const rows = await env.DB.prepare(
    `SELECT
       l.player_id AS playerId,
       COALESCE(p.nickname, 'Thief-' || substr(l.player_id, 1, 4)) AS nickname,
       l.best_echoes AS echoes,
       l.best_time_ms AS timeMs,
       r.alarms AS alarms
     FROM leaderboard l
     LEFT JOIN players p ON p.id = l.player_id
     LEFT JOIN runs r ON r.id = l.run_id
     WHERE l.daily_id = ?
     ORDER BY l.best_echoes ASC, l.best_time_ms ASC
     LIMIT 100`,
  ).bind(dailyId).all<{
    playerId: string;
    nickname: string;
    echoes: number;
    timeMs: number;
    alarms: number;
  }>();

  const entries = (rows.results ?? []).map((row, index) => ({
    rank: index + 1,
    ...row,
    verified: true,
  }));

  let playerRank: number | null = null;
  if (playerId) {
    const row = await env.DB.prepare(
      `SELECT rank FROM (
         SELECT player_id,
                ROW_NUMBER() OVER (ORDER BY best_echoes ASC, best_time_ms ASC) AS rank
         FROM leaderboard
         WHERE daily_id = ?
       ) WHERE player_id = ?`,
    ).bind(dailyId, playerId).first<{ rank: number }>();
    playerRank = row?.rank ?? null;
  }

  return json({ dailyId, entries, playerRank });
};

const handlePlayer = async (request: Request, env: Env): Promise<Response> => {
  const body = (await request.json().catch(() => null)) as
    | { playerId?: string; nickname?: string }
    | null;
  if (!body?.playerId) return json({ error: 'missing-player-id' }, 400);
  const nickname = (body.nickname ?? '').trim().slice(0, 16);
  if (nickname.length > 0 && nickname.length < 3) return json({ error: 'nickname-too-short' }, 400);

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO players (id, nickname, created_at, last_seen)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET nickname = excluded.nickname, last_seen = excluded.last_seen`,
  ).bind(body.playerId, nickname || null, now, now).run();

  return json({ ok: true, playerId: body.playerId, nickname: nickname || null });
};

const handleUnlock = async (request: Request, env: Env): Promise<Response> => {
  const body = (await request.json().catch(() => null)) as
    | { licenseKey?: string; playerId?: string }
    | null;
  if (!body?.licenseKey || !body.playerId) return json({ error: 'missing-license' }, 400);
  if (!body.licenseKey.startsWith('CO1-')) return json({ error: 'invalid-license' }, 400);

  const entitlements: Entitlement[] = ['full-campaign', 'cosmetics'];
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 1000 * 60 * 60 * 24 * 365;
  const payload = JSON.stringify({ playerId: body.playerId, entitlements, issuedAt, expiresAt });
  const signature = await signEntitlement(
    env.ENTITLEMENT_SECRET ?? 'dev-only-change-me',
    payload,
  );

  return json({ ok: true, token: { playerId: body.playerId, entitlements, issuedAt, expiresAt, signature } });
};

const handleLemonWebhook = async (request: Request, env: Env): Promise<Response> => {
  const raw = await request.text();
  const secret = env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get('X-Signature') ?? '';
    const expected = await signEntitlement(secret, raw);
    if (header !== expected) return json({ error: 'invalid-signature' }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: 'invalid-json' }, 400);
  }

  const event = payload as {
    meta?: { event_name?: string };
    data?: { attributes?: { user_email?: string; order_number?: number } };
  };
  const email = event.data?.attributes?.user_email;
  if (event.meta?.event_name !== 'order_created' || !email) {
    return json({ ok: true, ignored: true });
  }

  const now = Date.now();
  const licenseKey = `CO1-${(event.data?.attributes?.order_number ?? now).toString(36).toUpperCase()}`;
  await env.DB.prepare(
    `INSERT INTO entitlements (email, license_key, platform, created_at)
     VALUES (?, ?, 'web', ?)
     ON CONFLICT(email) DO UPDATE SET license_key = excluded.license_key, created_at = excluded.created_at`,
  ).bind(email, licenseKey, now).run();

  return json({ ok: true });
};

const route = async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  if (path === '/api/health') return json({ ok: true, service: 'crew-of-one-api' });
  if (path === '/api/daily' && request.method === 'GET') return handleDaily(env);
  if (path === '/api/run' && request.method === 'POST') return handleRun(request, env);
  if (path === '/api/leaderboard' && request.method === 'GET') return handleLeaderboard(request, env);
  if (path === '/api/player' && request.method === 'POST') return handlePlayer(request, env);
  if (path === '/api/unlock' && request.method === 'POST') return handleUnlock(request, env);
  if (path === '/api/webhook/lemonsqueezy' && request.method === 'POST') {
    return handleLemonWebhook(request, env);
  }

  return json({ error: 'not-found' }, 404);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown-error';
      return json({ error: 'internal-error', message }, 500);
    }
  },
};
