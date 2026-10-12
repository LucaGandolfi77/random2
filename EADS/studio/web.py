from __future__ import annotations

import fnmatch
import json
import logging
import os
import queue
from pathlib import Path

from flask import Blueprint, Response, current_app, g, jsonify, render_template, request, send_file
from werkzeug.exceptions import HTTPException

from .config import load, project, save
from .jobs import JOBS, cancel, create
from .services import analyze, build, gdbmi, inspect, runner, source
from .services.binaries import list_binaries
from .services.common import safe
from .version import __version__

bp = Blueprint("web", __name__)
LOG = logging.getLogger(__name__)


def _request_id() -> str:
    return g.get("request_id", "")


@bp.app_errorhandler(HTTPException)
def handle_http_exception(error: HTTPException):
    """Preserve HTTP status codes instead of turning 404 into 500."""
    LOG.info("http_exception", extra={
        "event": "http_exception", "status": error.code,
        "path": request.path, "request_id": _request_id(),
    })
    return jsonify(
        error=error.name,
        detail=error.description,
        request_id=_request_id(),
    ), error.code


@bp.app_errorhandler(KeyError)
def handle_key_error(error: KeyError):
    LOG.warning("resource_not_found", extra={
        "event": "resource_not_found", "detail": str(error),
        "path": request.path, "request_id": _request_id(),
    })
    return jsonify(error="Resource not found", detail=str(error), request_id=_request_id()), 404


@bp.app_errorhandler(FileNotFoundError)
def handle_file_not_found(error: FileNotFoundError):
    return jsonify(error="File not found", detail=str(error), request_id=_request_id()), 404


@bp.app_errorhandler(ValueError)
def handle_value_error(error: ValueError):
    return jsonify(error="Invalid request", detail=str(error), request_id=_request_id()), 400


@bp.app_errorhandler(Exception)
def handle_unexpected(error: Exception):
    LOG.exception("unhandled_exception", extra={
        "event": "unhandled_exception", "path": request.path,
        "request_id": _request_id(),
    })
    return jsonify(error="Internal server error", request_id=_request_id()), 500


@bp.get("/")
def home():
    return render_template("index.html", studio_version=__version__)


@bp.get("/favicon.ico")
def favicon():
    icon = Path(current_app.static_folder) / "favicon.svg"
    return send_file(icon, mimetype="image/svg+xml", max_age=86400)


@bp.get("/api/health")
def health():
    return jsonify(ok=True, version=__version__, projects=len(load().get("projects", [])))


@bp.get("/api/version")
def version_api():
    return jsonify(version=__version__, release=True)


@bp.get("/api/projects")
def projects_api():
    return jsonify(load())


@bp.put("/api/projects")
def put_projects():
    save(request.get_json(force=True))
    return jsonify(ok=True)


@bp.get("/api/projects/<pid>/sources")
def sources_api(pid):
    return jsonify(items=source.scan(project(pid)))


@bp.get("/api/projects/<pid>/file")
def file_api(pid):
    selected = project(pid)
    relative = request.args["path"]
    path = safe(selected, relative)
    if not path.is_file():
        raise FileNotFoundError(path)
    limit = int(selected.get("explorer_max_preview_bytes", current_app.config["PREVIEW_MAX_BYTES"]))
    size = path.stat().st_size
    if size > limit:
        raise ValueError(f"File too large to preview: {size} bytes; limit: {limit}")
    raw = path.read_bytes()
    if b"\x00" in raw[:8192]:
        raise ValueError("Binary file preview is not supported")
    return jsonify(path=relative, content=raw.decode("utf-8", errors="replace"), size=size)


@bp.post("/api/projects/<pid>/build")
def start_build(pid):
    files = request.get_json(force=True).get("files", [])
    if not files:
        raise ValueError("Select at least one buildable source file")
    return jsonify(job_id=create(build.compile_files, project(pid), files)), 202


@bp.get("/api/jobs/<jid>/events")
def job_events(jid):
    def generate():
        job = JOBS[jid]
        index = 0
        while True:
            history = job["history"]
            while index < len(history):
                yield f"data: {json.dumps(history[index])}\n\n"
                index += 1
            if job["status"] != "running":
                break
            try:
                job["queue"].get(timeout=10)
            except queue.Empty:
                yield ": ping\n\n"

    return Response(generate(), mimetype="text/event-stream", headers={
        "Cache-Control": "no-cache, no-store",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    })


@bp.post("/api/jobs/<jid>/cancel")
def cancel_job(jid):
    return jsonify(cancel(jid))


@bp.post("/api/projects/<pid>/inspect")
def inspect_api(pid):
    return jsonify(inspect.inspect_binary(project(pid), request.get_json(force=True)["path"]))


@bp.get("/api/projects/<pid>/toolchain")
def toolchain_api(pid):
    return jsonify(inspect.toolchain(project(pid)))


@bp.post("/api/projects/<pid>/addr2line")
def addr2line_api(pid):
    data = request.get_json(force=True)
    return jsonify(inspect.addr2line(project(pid), data["elf"], data["addresses"]))


@bp.post("/api/projects/<pid>/run")
def run_api(pid):
    data = request.get_json(force=True)
    return jsonify(run_id=runner.start(project(pid), data["profile"], data["elf"])), 202


@bp.get("/api/runs/<rid>")
def run_state(rid):
    return jsonify(runner.state(rid))


@bp.post("/api/runs/<rid>/stop")
def run_stop(rid):
    return jsonify(runner.stop(rid))


@bp.get("/api/projects/<pid>/analysis-profiles")
def analysis_profiles_api(pid):
    return jsonify(items=analyze.available_profiles(project(pid)))


@bp.post("/api/projects/<pid>/static-analysis")
def static_analysis_api(pid):
    data = request.get_json(force=True)
    return jsonify(job_id=create(
        analyze.static_analysis, project(pid), data["profile"], data.get("files", [])
    )), 202


@bp.get("/api/projects/<pid>/stack")
def stack_api(pid):
    return jsonify(items=analyze.stack_usage(project(pid)))


@bp.post("/api/projects/<pid>/debug")
def debug_start(pid):
    data = request.get_json(force=True)
    return jsonify(session_id=gdbmi.start(project(pid), data["profile"], data["elf"])), 202


@bp.post("/api/debug/<sid>/command")
def debug_command(sid):
    data = request.get_json(force=True)
    return jsonify(gdbmi.command(sid, data["command"], float(data.get("timeout", 10))))


@bp.post("/api/debug/<sid>/stop")
def debug_stop(sid):
    return jsonify(gdbmi.stop(sid))


@bp.get("/api/projects/<pid>/tree")
def tree_api(pid):
    selected = project(pid)
    base = safe(selected, ".")
    patterns = list(selected.get("exclude_globs", [])) + [
        ".git/**", "**/.git/**", ".venv/**", "**/.venv/**",
        "**/__pycache__/**", "**/node_modules/**", "**/.idea/**", "**/.vscode/**",
    ]
    limit = int(selected.get("explorer_max_files", 20000))
    preview_limit = int(selected.get("explorer_max_preview_bytes", 2000000))
    items = []
    truncated = False
    for directory, dirnames, filenames in os.walk(base):
        parent = os.path.relpath(directory, base).replace(os.sep, "/")
        dirnames[:] = [name for name in dirnames if not any(
            fnmatch.fnmatch((name if parent == "." else f"{parent}/{name}") + "/", pattern)
            for pattern in patterns
        )]
        for name in filenames:
            path = os.path.join(directory, name)
            relative = os.path.relpath(path, base).replace(os.sep, "/")
            if any(fnmatch.fnmatch(relative, pattern) for pattern in patterns):
                continue
            try:
                size = os.stat(path).st_size
            except OSError:
                continue
            items.append({"path": relative, "size": size, "previewable": size <= preview_limit})
            if len(items) >= limit:
                truncated = True
                break
        if truncated:
            break
    items.sort(key=lambda item: item["path"].lower())
    return jsonify(items=items, truncated=truncated, project_root=str(base))


@bp.get("/api/projects/<pid>/binaries")
def binaries_api(pid):
    return jsonify(items=list_binaries(project(pid)))
