from __future__ import annotations
import logging
import time
import uuid
from pathlib import Path
from flask import Flask, g, request
from .logging_config import configure_logging
from .version import __version__


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(
        MAX_CONTENT_LENGTH=4 * 1024 * 1024,
        PREVIEW_MAX_BYTES=2_000_000,
    )
    if test_config:
        app.config.update(test_config)
    configure_logging(Path(__file__).resolve().parents[1])
    app.logger.info("application_start", extra={"event": "application_start", "version": __version__})
    from .web import bp
    app.register_blueprint(bp)

    @app.before_request
    def begin_request():
        g.request_id = request.headers.get("X-Request-ID", uuid.uuid4().hex)
        g.request_started = time.monotonic()

    @app.after_request
    def end_request(response):
        response.headers["X-Request-ID"] = g.get("request_id", "")
        logging.getLogger("studio.http").info("request_completed", extra={
            "event": "request_completed", "request_id": g.get("request_id"),
            "method": request.method, "path": request.path,
            "status": response.status_code,
            "duration_seconds": time.monotonic() - g.get("request_started", time.monotonic()),
            "remote_addr": request.remote_addr,
        })
        return response
    return app
