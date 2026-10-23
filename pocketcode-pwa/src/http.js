export class HttpError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

export async function request(baseUrl, path, { method = "GET", headers = {}, body, timeout = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!response.ok) {
      const detail =
        data?.error?.message ||
        data?.message ||
        data?.error ||
        (typeof data === "string" ? data.slice(0, 300) : "") ||
        `Request failed (${response.status})`;
      throw new HttpError(String(detail), response.status, data);
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new HttpError("The server took too long to respond.", 0, null);
    }
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      error.message === "Load failed" || error.message === "Failed to fetch"
        ? "Could not reach the server. Check the URL and network."
        : error.message,
      0,
      null,
    );
  } finally {
    clearTimeout(timer);
  }
}

export function basicAuth(username, password) {
  const raw = `${username || "opencode"}:${password || ""}`;
  try {
    return `Basic ${btoa(unescape(encodeURIComponent(raw)))}`;
  } catch {
    return `Basic ${btoa(raw)}`;
  }
}

export function stripSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}
