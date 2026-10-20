/*
 * tools/audit/serve.mjs — a static file server, in twenty lines.
 *
 * The audits have to run against served pages, not file:// URLs: service
 * workers, fetch and module imports all behave differently, and an audit
 * that measures the wrong thing is worse than no audit.
 *
 * No dependencies, because the house rule is that a tool that audits a
 * zero-dependency site should not be the exception.
 */
import { createServer } from "node:http";
import { createReadStream, statSync, existsSync } from "node:fs";
import { join, extname, normalize } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

export function serve(root, port = 0) {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    /* normalize() collapses "..", so a request cannot climb out of the root. */
    let path = join(root, normalize(url).replace(/^(\.\.[/\\])+/, ""));
    if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
    if (!existsSync(path)) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, {
      "content-type": TYPES[extname(path)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(path).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const addr = server.address();
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}
