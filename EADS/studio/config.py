from pathlib import Path
import json
import threading

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "projects.json"
LOCK = threading.RLock()


def load():
    with LOCK:
        return json.loads(PATH.read_text(encoding="utf-8"))


def save(data):
    if not isinstance(data, dict) or not isinstance(data.get("projects"), list):
        raise ValueError("projects list required")
    with LOCK:
        temporary = PATH.with_suffix(".tmp")
        temporary.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        temporary.replace(PATH)


def project(project_id):
    try:
        return next(item for item in load()["projects"] if item["id"] == project_id)
    except StopIteration as error:
        raise KeyError(f"Unknown project: {project_id}") from error
