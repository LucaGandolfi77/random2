import subprocess, threading, uuid
from .common import root, safe, output_dirs
from ..registry import ExpiringRegistry

RUNS = ExpiringRegistry(3600, 200)


def expand(p, s, elf):
    return s.replace("{rtems}", p["rtems_path"]).replace("{elf}", str(safe(p, elf)))


def start(p, profile_id, elf):
    profile = next(
        (x for x in p.get("execution_profiles", []) if x["id"] == profile_id), None
    )
    if profile is None:
        raise KeyError(profile_id)
    rid = uuid.uuid4().hex
    log = output_dirs(p)["runs"] / f"{rid}.log"
    argv = [
        expand(p, profile["executable"], elf),
        *[expand(p, x, elf) for x in profile.get("arguments", [])],
    ]
    f = log.open("w")
    proc = subprocess.Popen(
        argv,
        cwd=root(p),
        stdout=f,
        stderr=subprocess.STDOUT,
        text=True,
        start_new_session=True,
    )
    RUNS[rid] = {
        "process": proc,
        "log": log,
        "file": f,
        "argv": argv,
        "lock": threading.RLock(),
    }
    return rid


def state(rid):
    x = RUNS[rid]
    rc = x["process"].poll()
    if rc is not None and not x["file"].closed:
        x["file"].close()
    return {
        "running": rc is None,
        "returncode": rc,
        "log": x["log"].read_text(errors="replace"),
        "argv": x["argv"],
    }


def stop(rid):
    x = RUNS[rid]
    if x["process"].poll() is None:
        x["process"].terminate()
        try:
            x["process"].wait(timeout=5)
        except Exception:
            x["process"].kill()
            x["process"].wait()
    if not x["file"].closed:
        x["file"].close()
    return state(rid)
