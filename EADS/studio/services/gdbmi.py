import queue, subprocess, threading, time, uuid
from .common import root, safe
from ..registry import ExpiringRegistry

SESSIONS = ExpiringRegistry(1800, 100)


def expand(p, s, elf=""):
    return s.replace("{rtems}", p["rtems_path"]).replace(
        "{elf}", str(safe(p, elf)) if elf else ""
    )


def reader(stream, out, stop):
    try:
        for line in iter(stream.readline, ""):
            if stop.is_set():
                break
            out.put(line.rstrip())
    finally:
        out.put(None)


def start(p, profile_id, elf):
    profile = next(
        (x for x in p.get("debug_profiles", []) if x["id"] == profile_id), None
    )
    if profile is None:
        raise KeyError(profile_id)
    sid = uuid.uuid4().hex
    server = subprocess.Popen(
        [
            expand(p, profile["server_executable"], elf),
            *[expand(p, x, elf) for x in profile.get("server_arguments", [])],
        ],
        cwd=root(p),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    time.sleep(0.5)
    if server.poll() is not None:
        raise RuntimeError("Debug server failed")
    gdb = subprocess.Popen(
        [
            expand(p, profile["gdb_executable"], elf),
            "--interpreter=mi3",
            str(safe(p, elf)),
        ],
        cwd=root(p),
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    out = queue.Queue()
    stop = threading.Event()
    threading.Thread(target=reader, args=(gdb.stdout, out, stop), daemon=True).start()
    SESSIONS[sid] = {
        "server": server,
        "gdb": gdb,
        "lock": threading.Lock(),
        "queue": out,
        "stop_event": stop,
        "token": 0,
    }
    command(
        sid,
        f"-target-select remote {profile['remote']}",
        float(profile.get("command_timeout", 10)),
    )
    return sid


def command(sid, text, timeout=10):
    s = SESSIONS[sid]
    with s["lock"]:
        s["token"] += 1
        token = str(s["token"])
        deadline = time.monotonic() + timeout
        lines = []
        s["gdb"].stdin.write(token + text + "\n")
        s["gdb"].stdin.flush()
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError(f"GDB/MI command timed out after {timeout}s: {text}")
            try:
                line = s["queue"].get(timeout=remaining)
            except queue.Empty:
                continue
            if line is None:
                raise RuntimeError("GDB output closed")
            lines.append(line)
            if line.startswith((token + "^done", token + "^error", token + "^running")):
                break
        return {"command": text, "token": token, "lines": lines}


def stop(sid):
    s = SESSIONS.pop(sid, None)
    if s is None:
        return {"ok": True}
    s["stop_event"].set()
    for name in ("gdb", "server"):
        if s[name].poll() is None:
            s[name].terminate()
    return {"ok": True}
