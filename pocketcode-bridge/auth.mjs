import { randomInt, timingSafeEqual } from "node:crypto";

function same(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export class Auth {
  constructor(store, { ttlMs = 5 * 60 * 1000, maxAttempts = 5 } = {}) {
    this.store = store;
    this.ttlMs = ttlMs;
    this.maxAttempts = maxAttempts;
    this.code = null;
    this.expiresAt = 0;
    this.attempts = 0;
  }

  newCode() {
    this.code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    this.expiresAt = Date.now() + this.ttlMs;
    this.attempts = 0;
    return { code: this.code, expiresAt: this.expiresAt };
  }

  clear() {
    this.code = null;
    this.expiresAt = 0;
    this.attempts = 0;
  }

  pair(code, name) {
    if (!this.code) {
      const error = new Error("No pairing code is active. Restart the bridge to get a new one.");
      error.code = "no_code";
      throw error;
    }
    if (Date.now() > this.expiresAt) {
      this.clear();
      const error = new Error("The pairing code has expired. Restart the bridge for a new one.");
      error.code = "expired";
      throw error;
    }
    if (!same(code, this.code)) {
      this.attempts += 1;
      if (this.attempts >= this.maxAttempts) {
        this.clear();
        const error = new Error("Too many attempts. The pairing code has been invalidated.");
        error.code = "too_many_attempts";
        throw error;
      }
      const error = new Error("Wrong pairing code.");
      error.code = "wrong_code";
      throw error;
    }
    this.clear();
    return this.store.addDevice(name);
  }

  verify(token) {
    return this.store.verifyToken(token);
  }
}
