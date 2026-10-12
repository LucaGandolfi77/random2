import json, logging, logging.handlers, os
from datetime import datetime, timezone
from pathlib import Path


class JsonFormatter(logging.Formatter):
    def format(self, record):
        data = {
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "thread": record.threadName,
        }
        for k, v in record.__dict__.items():
            if k.startswith("_") or k in data:
                continue
            try:
                json.dumps(v)
                data[k] = v
            except TypeError:
                pass
        if record.exc_info:
            data["exception"] = self.formatException(record.exc_info)
        return json.dumps(data, ensure_ascii=False)


def configure_logging(app_root: Path):
    folder = Path(os.getenv("STUDIO_LOG_DIR", app_root / "logs"))
    folder.mkdir(parents=True, exist_ok=True)
    level = getattr(
        logging, os.getenv("STUDIO_LOG_LEVEL", "INFO").upper(), logging.INFO
    )
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    console = logging.StreamHandler()
    normal = logging.handlers.RotatingFileHandler(
        folder / "studio.jsonl", maxBytes=10485760, backupCount=10, encoding="utf-8"
    )
    normal.setFormatter(JsonFormatter())
    errors = logging.handlers.RotatingFileHandler(
        folder / "studio-errors.jsonl",
        maxBytes=10485760,
        backupCount=20,
        encoding="utf-8",
    )
    errors.setLevel(logging.ERROR)
    errors.setFormatter(JsonFormatter())
    root.addHandler(console)
    root.addHandler(normal)
    root.addHandler(errors)
    return folder
