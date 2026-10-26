/*
 * Friend dares - a seeded run in a URL.
 *
 * The link carries the seed, target score, mode and rule id. It never carries
 * photos, names of the roster, or any account data. Encoding is UTF-8 JSON in
 * base64url so a named challenger can use emoji and still produce a clean URL.
 */

const MAX_TARGET = 100_000_000;

function numberOrNull(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeDare(input) {
  if (!input || typeof input !== "object") return null;
  const seed = numberOrNull(input.seed != null ? input.seed : input.s);
  const target = numberOrNull(input.target != null ? input.target : input.t);
  if (seed == null || seed < 0 || seed > 0xffffffff) return null;
  if (target == null || target < 0 || target > MAX_TARGET) return null;

  const rawName = input.name != null ? input.name : input.n;
  const name = String(rawName == null ? "A friend" : rawName)
    .replace(/[\u0000-\u001f]/g, " ")
    .trim()
    .slice(0, 22) || "A friend";

  const mode = (input.mode != null ? input.mode : input.m) === "daily" ? "daily" : "classic";
  const rawRule = String(input.ruleId != null ? input.ruleId : input.r || "");
  const ruleId = /^[a-z0-9-]{1,24}$/.test(rawRule) ? rawRule : "";
  const createdAt = Math.max(0, Math.round(numberOrNull(input.createdAt != null ? input.createdAt : input.c) || 0));

  return {
    seed: Math.floor(seed) >>> 0,
    target: Math.round(target),
    name,
    mode,
    ruleId,
    createdAt,
  };
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeDare(input) {
  const dare = normalizeDare(input);
  if (!dare) throw new Error("Invalid dare");
  return toBase64Url(JSON.stringify({
    v: 1,
    s: dare.seed,
    t: dare.target,
    n: dare.name,
    m: dare.mode,
    r: dare.ruleId,
    c: dare.createdAt,
  }));
}

export function decodeDare(code) {
  if (typeof code !== "string" || !code || code.length > 1024) return null;
  try {
    const data = JSON.parse(fromBase64Url(code));
    if (!data || data.v !== 1) return null;
    return normalizeDare({
      seed: data.s,
      target: data.t,
      name: data.n,
      mode: data.m,
      ruleId: data.r,
      createdAt: data.c,
    });
  } catch (e) {
    return null;
  }
}

export function dareUrl(dare, baseUrl = "http://localhost/inner-circle-pwa/") {
  const code = encodeDare(dare);
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("dare", code);
  return url.toString();
}

export function dareFromSearch(search) {
  const params = new URLSearchParams(search || "");
  return decodeDare(params.get("dare"));
}

export { MAX_TARGET };
