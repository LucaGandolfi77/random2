import inspect, logging, queue, threading, traceback, uuid
from datetime import datetime, timezone
from pathlib import Path
from .registry import ExpiringRegistry
from .version import __version__

LOG = logging.getLogger(__name__)
JOBS = ExpiringRegistry(3600, 1000)


def create(function, *args):
    jid = uuid.uuid4().hex
    events = queue.Queue()
    cancel_event = threading.Event()
    JOBS[jid] = {
        "queue": events,
        "status": "running",
        "history": [],
        "cancel_event": cancel_event,
    }

    def emit(event):
        event.setdefault("studio_version", __version__)
        event.setdefault("job_id", jid)
        event.setdefault("timestamp_utc", datetime.now(timezone.utc).isoformat())
        job = JOBS.get(jid)
        if job is not None:
            job["history"].append(event)
            events.put(event)

    def worker():
        try:
            kwargs = {"emit": emit}
            if "cancel_event" in inspect.signature(function).parameters:
                kwargs["cancel_event"] = cancel_event
            result = function(*args, **kwargs)
            status = "cancelled" if cancel_event.is_set() else "done"
            JOBS[jid]["status"] = status
            emit({"kind": "done", "message": status.title(), "result": result})
        except Exception as error:
            tb = traceback.format_exc()
            JOBS[jid]["status"] = "failed"
            folder = Path(__file__).resolve().parents[1] / "debug-logs"
            folder.mkdir(exist_ok=True)
            log = folder / f"job-{jid}.log"
            log.write_text(tb)
            LOG.exception("job_failed")
            emit(
                {
                    "kind": "error",
                    "message": f"{type(error).__name__}: {error}",
                    "traceback": tb,
                    "debug_log": str(log),
                }
            )
            emit({"kind": "done", "message": "Failed"})

    threading.Thread(target=worker, daemon=True).start()
    return jid


def cancel(jid):
    job = JOBS[jid]
    if job["status"] != "running":
        return {"ok": False, "status": job["status"]}
    job["cancel_event"].set()
    return {"ok": True, "status": "cancelling"}
