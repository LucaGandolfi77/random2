from __future__ import annotations
from .common import root, safe, tool, run, sha256


def _execute(project, name, arguments, binary):
    executable = tool(project, name)
    if not executable.is_file():
        return {
            "command": str(executable),
            "returncode": 127,
            "stdout": "",
            "stderr": f"Tool not found: {executable}",
            "timed_out": False,
        }
    return run(
        [str(executable), *arguments, str(binary)], cwd=root(project), timeout=120
    )


def inspect_binary(project, relative):
    binary = safe(project, relative)
    if not binary.is_file():
        raise FileNotFoundError(f"Binary not found: {binary}")
    result = {
        "path": str(relative),
        "absolute_path": str(binary),
        "sha256": sha256(binary),
        "size_bytes": binary.stat().st_size,
    }
    commands = {
        "header": ("readelf", ["-h"]),
        "sections": ("readelf", ["-SW"]),
        "segments": ("readelf", ["-lW"]),
        "symbols": ("readelf", ["-sW"]),
        "relocations": ("readelf", ["-rW"]),
        "dwarf_lines": ("readelf", ["--debug-dump=decodedline"]),
        "size": ("size", ["-A"]),
        "nm": ("nm", ["-n", "-S", "--size-sort"]),
    }
    for key, (name, arguments) in commands.items():
        result[key] = _execute(project, name, arguments, binary)
    return result


def toolchain(project):
    compiler, objdump = tool(project, "gcc"), tool(project, "objdump")
    checks = {
        "gcc_version": [compiler, "--version"],
        "target": [compiler, "-dumpmachine"],
        "sysroot": [compiler, "-print-sysroot"],
        "multilib": [compiler, "-print-multi-lib"],
        "search_dirs": [compiler, "-print-search-dirs"],
        "objdump_version": [objdump, "--version"],
        "bfd_targets": [objdump, "-i"],
    }
    return {key: run(command, cwd=root(project)) for key, command in checks.items()}


def addr2line(project, elf, addresses):
    return run(
        [tool(project, "addr2line"), "-e", safe(project, elf), "-f", "-C", *addresses],
        cwd=root(project),
    )
