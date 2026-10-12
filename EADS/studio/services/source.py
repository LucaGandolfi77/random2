import fnmatch, os, re
from pathlib import Path
from .common import root

SOURCE_EXTENSIONS = {".c", ".s"}


def excluded(path, patterns):
    return any(
        fnmatch.fnmatch(path, p) or fnmatch.fnmatch(path + "/", p) for p in patterns
    )


def scan(p):
    base = root(p)
    out = []
    patterns = p.get("exclude_globs", [])
    for sr in p.get("source_roots", []):
        start = (base / sr).resolve()
        if not start.is_dir():
            continue
        for directory, dirnames, files in os.walk(start):
            cur = Path(directory)
            dirnames[:] = [
                n
                for n in dirnames
                if not excluded((cur / n).relative_to(base).as_posix(), patterns)
            ]
            for name in files:
                path = cur / name
                ext = path.suffix.lower()
                rel = path.relative_to(base).as_posix()
                if ext not in SOURCE_EXTENSIONS | {".h"} or excluded(rel, patterns):
                    continue
                out.append(
                    {
                        "path": rel,
                        "size": path.stat().st_size,
                        "kind": ext,
                        "buildable": ext in SOURCE_EXTENSIONS,
                    }
                )
    return sorted(out, key=lambda x: x["path"].lower())


def ensure_buildable(path):
    if Path(str(path)).suffix.lower() not in SOURCE_EXTENSIONS:
        raise ValueError(f"File is not a buildable translation unit: {path}")
    return str(path)
