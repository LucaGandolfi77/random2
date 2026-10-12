import hashlib, logging, shlex, subprocess, time
from pathlib import Path

LOG = logging.getLogger(__name__)


def root(p):
    return Path(str(p["project_root"])).expanduser().resolve()


def safe(p, relative):
    base = root(p)
    value = Path(str(relative))
    candidate = (
        value.expanduser().resolve()
        if value.is_absolute()
        else (base / value).resolve()
    )
    if candidate != base and base not in candidate.parents:
        raise ValueError(f"Path outside project root: {relative}")
    return candidate


def tool(p, name):
    return (
        Path(str(p["rtems_path"])).expanduser().resolve()
        / "bin"
        / f"{p.get('target_prefix', '')}{name}"
    )


def run(argv, cwd=None, timeout=60):
    values = [str(x) for x in argv]
    started = time.monotonic()
    LOG.info(
        "external_command_started",
        extra={
            "event": "external_command_started",
            "argv": values,
            "cwd": str(cwd) if cwd else None,
        },
    )
    try:
        cp = subprocess.run(
            values,
            cwd=str(cwd) if cwd else None,
            text=True,
            capture_output=True,
            timeout=timeout,
        )
        return {
            "argv": values,
            "command": shlex.join(values),
            "returncode": cp.returncode,
            "stdout": cp.stdout,
            "stderr": cp.stderr,
            "timed_out": False,
            "duration_seconds": time.monotonic() - started,
        }
    except subprocess.TimeoutExpired as e:
        out = e.stdout or ""
        err = e.stderr or f"Timed out after {timeout}s"
        out = out.decode(errors="replace") if isinstance(out, bytes) else out
        err = err.decode(errors="replace") if isinstance(err, bytes) else err
        return {
            "argv": values,
            "command": shlex.join(values),
            "returncode": 124,
            "stdout": out,
            "stderr": err,
            "timed_out": True,
            "duration_seconds": time.monotonic() - started,
        }


def sha256(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for block in iter(lambda: f.read(1048576), b""):
            h.update(block)
    return h.hexdigest()


def output_dirs(p):
    out = safe(p, p.get("output_dir", "build-analysis-studio"))
    dirs = {
        n: out / n
        for n in [
            "objects",
            "disassembly",
            "logs",
            "runs",
            "evidence",
            "stack",
            "reports",
        ]
    }
    for d in dirs.values():
        d.mkdir(parents=True, exist_ok=True)
    dirs["root"] = out
    return dirs
