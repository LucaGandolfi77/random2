from __future__ import annotations
import fnmatch
import os
from pathlib import Path
from .common import root

EXTENSIONS = {".elf", ".exe", ".out", ".o", ".a"}


def list_binaries(project, max_files=5000):
    base = root(project)
    excluded = [
        str(item)
        for item in project.get("exclude_globs", [])
        if "build-analysis-studio" not in str(item)
    ]
    items = []
    for directory, dirnames, filenames in os.walk(base):
        current = Path(directory)
        parent = current.relative_to(base).as_posix() if current != base else ""
        dirnames[:] = [
            name
            for name in dirnames
            if not any(
                fnmatch.fnmatch(f"{parent}/{name}/".lstrip("/"), pattern)
                for pattern in excluded
            )
        ]
        for name in filenames:
            path = current / name
            if path.is_symlink() or path.suffix.lower() not in EXTENSIONS:
                continue
            relative = path.relative_to(base).as_posix()
            if any(fnmatch.fnmatch(relative, pattern) for pattern in excluded):
                continue
            stat = path.stat()
            items.append(
                {
                    "path": relative,
                    "name": path.name,
                    "extension": path.suffix.lower(),
                    "size": stat.st_size,
                    "modified": stat.st_mtime,
                }
            )
            if len(items) >= max_files:
                break
        if len(items) >= max_files:
            break
    return sorted(items, key=lambda item: (-item["modified"], item["path"].lower()))
