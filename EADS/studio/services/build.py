from __future__ import annotations

import json
import os
import re
import shlex
from concurrent.futures import Future, ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from threading import Event
from typing import Any, Callable

from ..version import __version__
from .common import output_dirs, root, run, safe, sha256, tool
from .source import ensure_buildable


DIAGNOSTIC_RE = re.compile(
    r"^(.*?):(\d+):(\d+):\s+"
    r"(fatal error|error|warning|note):\s+(.*)$"
)

DEFAULT_OBJDUMP_FLAGS = ["-d", "-r", "-S", "-l", "-C", "-w"]
DEFAULT_COMMAND_TIMEOUT_SECONDS = 120

EmitFunction = Callable[[dict[str, Any]], None]


def bsp_pc_file(project: dict[str, Any]) -> Path:
    """Return the RTEMS BSP pkg-config file expected for the project."""
    prefix = str(project.get("target_prefix", "sparc-rtems6-"))
    target = prefix[:-1] if prefix.endswith("-") else prefix

    return (
        Path(str(project["rtems_path"])).expanduser().resolve()
        / "lib"
        / "pkgconfig"
        / f"{target}-{project['bsp']}.pc"
    )


def pkg_flags(project: dict[str, Any]) -> list[str]:
    """Load BSP compiler flags through pkg-config."""
    pc_file = bsp_pc_file(project)

    if not pc_file.is_file():
        raise RuntimeError(f"BSP pkg-config file not found: {pc_file}")

    result = run(["pkg-config", "--cflags", str(pc_file)])

    if result["returncode"] != 0:
        detail = result["stderr"].strip() or f"pkg-config failed: {pc_file}"
        raise RuntimeError(detail)

    return shlex.split(result["stdout"])


def parse_diagnostics(text: str, source: str) -> list[dict[str, Any]]:
    """Convert GCC-style diagnostics into structured records."""
    diagnostics: list[dict[str, Any]] = []

    for line in text.splitlines():
        match = DIAGNOSTIC_RE.match(line)

        if match:
            diagnostics.append(
                {
                    "source": source,
                    "file": match.group(1),
                    "line": int(match.group(2)),
                    "column": int(match.group(3)),
                    "severity": match.group(4),
                    "message": match.group(5),
                    "raw": line,
                }
            )
        elif line.strip():
            diagnostics.append(
                {
                    "source": source,
                    "severity": "unclassified",
                    "message": line,
                    "raw": line,
                }
            )

    return diagnostics


def _configured_defines(project: dict[str, Any]) -> list[str]:
    """Translate the projects.json defines mapping into GCC -D options."""
    options: list[str] = []

    for name, value in project.get("defines", {}).items():
        if value is False:
            continue

        if value is None or value is True:
            options.append(f"-D{name}")
        else:
            options.append(f"-D{name}={value}")

    return options


def _configured_include_flags(project: dict[str, Any]) -> list[str]:
    """Build -I and -idirafter options from existing project directories."""
    options: list[str] = []

    for relative in project.get("include_dirs", []):
        directory = safe(project, str(relative))

        if directory.is_dir():
            options.append(f"-I{directory}")

    for relative in project.get("idirafter_dirs", []):
        directory = safe(project, str(relative))

        if directory.is_dir():
            options.extend(["-idirafter", str(directory)])

    return options


def _compiler_flags(project: dict[str, Any]) -> list[str]:
    """Assemble compiler flags while ensuring that -c is added only once later."""
    flags = pkg_flags(project)
    flags.extend(str(item) for item in project.get("compiler_flags", []))

    # compile_files owns the compile-only mode. Remove configuration duplicates.
    flags = [flag for flag in flags if flag != "-c"]
    flags.extend(_configured_defines(project))
    flags.extend(_configured_include_flags(project))

    return flags


def _requested_workers(project: dict[str, Any], file_count: int) -> tuple[int, int]:
    """Return the effective worker count and the detected logical CPU count."""
    host_cpus = os.cpu_count() or 1
    configured = project.get("parallel_jobs")

    if configured is None:
        # A conservative default is preferable for projects stored under /mnt/c.
        requested = max(1, host_cpus // 2)
    else:
        try:
            requested = int(configured)
        except (TypeError, ValueError) as error:
            raise ValueError("parallel_jobs must be an integer") from error

    if requested < 1:
        raise ValueError("parallel_jobs must be greater than or equal to 1")

    effective = max(1, min(requested, file_count or 1))
    return effective, host_cpus


def _compile_one_file(
    project: dict[str, Any],
    relative: str,
    base: Path,
    output: dict[str, Path],
    compiler: Path,
    objdump: Path,
    flags: list[str],
    cancel_event: Event | None,
) -> dict[str, Any]:
    """Compile and disassemble one translation unit."""
    if cancel_event is not None and cancel_event.is_set():
        return {
            "file": relative,
            "cancelled": True,
            "commands": [],
            "diagnostics": [],
        }

    source = safe(project, relative)
    relative_path = Path(relative)
    object_file = output["objects"] / relative_path.with_suffix(".o")
    disassembly_file = output["disassembly"] / relative_path.with_suffix(".dis")

    object_file.parent.mkdir(parents=True, exist_ok=True)
    disassembly_file.parent.mkdir(parents=True, exist_ok=True)

    compile_command = [
        str(compiler),
        *flags,
        "-c",
        str(source),
        "-o",
        str(object_file),
    ]
    commands = [shlex.join(compile_command)]

    compile_result = run(
        compile_command,
        cwd=base,
        timeout=int(
            project.get(
                "compile_timeout_seconds",
                DEFAULT_COMMAND_TIMEOUT_SECONDS,
            )
        ),
    )

    diagnostics = parse_diagnostics(compile_result["stderr"], relative)
    row: dict[str, Any] = {
        "file": relative,
        "compile": compile_result,
        "ok": False,
        "cancelled": False,
        "warnings": sum(
            item["severity"] == "warning"
            for item in diagnostics
        ),
        "errors": sum(
            item["severity"] in {"error", "fatal error"}
            for item in diagnostics
        ),
    }

    if compile_result["returncode"] != 0:
        object_file.unlink(missing_ok=True)
        disassembly_file.unlink(missing_ok=True)
        return {
            "file": relative,
            "row": row,
            "commands": commands,
            "diagnostics": diagnostics,
        }

    if cancel_event is not None and cancel_event.is_set():
        row["cancelled"] = True
        return {
            "file": relative,
            "row": row,
            "commands": commands,
            "diagnostics": diagnostics,
        }

    objdump_flags = [
        str(item)
        for item in project.get("objdump_flags", DEFAULT_OBJDUMP_FLAGS)
    ]
    objdump_command = [str(objdump), *objdump_flags, str(object_file)]
    commands.append(shlex.join(objdump_command))

    objdump_result = run(
        objdump_command,
        cwd=base,
        timeout=int(
            project.get(
                "objdump_timeout_seconds",
                DEFAULT_COMMAND_TIMEOUT_SECONDS,
            )
        ),
    )
    row["objdump"] = objdump_result
    diagnostics.extend(parse_diagnostics(objdump_result["stderr"], relative))

    if objdump_result["returncode"] == 0:
        disassembly_file.write_text(
            objdump_result["stdout"],
            encoding="utf-8",
        )
        row.update(
            ok=True,
            object=str(object_file.relative_to(base)),
            disassembly=str(disassembly_file.relative_to(base)),
            object_sha256=sha256(object_file),
        )
    else:
        disassembly_file.unlink(missing_ok=True)

    return {
        "file": relative,
        "row": row,
        "commands": commands,
        "diagnostics": diagnostics,
    }


def _worker_failure(relative: str, error: Exception) -> dict[str, Any]:
    """Convert a Python worker failure into the normal result structure."""
    message = f"Internal build worker failure: {type(error).__name__}: {error}"
    row = {
        "file": relative,
        "ok": False,
        "cancelled": False,
        "warnings": 0,
        "errors": 1,
        "internal_error": message,
    }

    return {
        "file": relative,
        "row": row,
        "commands": [],
        "diagnostics": [
            {
                "source": relative,
                "file": relative,
                "severity": "error",
                "message": message,
            }
        ],
    }


def compile_files(
    project: dict[str, Any],
    files: list[str],
    emit: EmitFunction = lambda event: None,
    cancel_event: Event | None = None,
) -> dict[str, Any]:
    """Compile files in parallel and generate deterministic JSON reports."""
    started = datetime.now(timezone.utc)
    base = root(project)
    output = output_dirs(project)
    compiler = tool(project, "gcc")
    objdump = tool(project, "objdump")

    buildable_files = [ensure_buildable(item) for item in files]
    flags = _compiler_flags(project)
    max_workers, host_cpus = _requested_workers(project, len(buildable_files))

    results: list[dict[str, Any]] = []
    diagnostics: list[dict[str, Any]] = []
    commands: list[str] = []
    completed = 0

    emit(
        {
            "kind": "debug",
            "message": (
                f"Parallel build started: workers={max_workers}, "
                f"files={len(buildable_files)}, host_cpus={host_cpus}"
            ),
            "parallel_jobs": max_workers,
            "host_cpus": host_cpus,
            "total": len(buildable_files),
        }
    )

    future_to_file: dict[Future[dict[str, Any]], str] = {}

    with ThreadPoolExecutor(
        max_workers=max_workers,
        thread_name_prefix="studio-build",
    ) as executor:
        for relative in buildable_files:
            if cancel_event is not None and cancel_event.is_set():
                break

            future = executor.submit(
                _compile_one_file,
                project,
                relative,
                base,
                output,
                compiler,
                objdump,
                flags,
                cancel_event,
            )
            future_to_file[future] = relative

        for future in as_completed(future_to_file):
            relative = future_to_file[future]

            if cancel_event is not None and cancel_event.is_set():
                for pending in future_to_file:
                    pending.cancel()

            if future.cancelled():
                continue

            try:
                worker_result = future.result()
            except Exception as error:
                worker_result = _worker_failure(relative, error)

            if worker_result.get("cancelled"):
                continue

            row = worker_result["row"]
            results.append(row)
            diagnostics.extend(worker_result.get("diagnostics", []))
            commands.extend(worker_result.get("commands", []))
            completed += 1

            emit(
                {
                    "kind": "result",
                    "message": (
                        f"[{completed}/{len(buildable_files)}] "
                        f"{'OK' if row['ok'] else 'FAILED'} {relative}"
                    ),
                    "current": completed,
                    "total": len(buildable_files),
                    "row": row,
                }
            )

    # Parallel tasks finish in a non-deterministic order; reports should not.
    results.sort(key=lambda item: item["file"].lower())
    diagnostics.sort(
        key=lambda item: (
            str(item.get("file", item.get("source", ""))).lower(),
            int(item.get("line", 0) or 0),
            int(item.get("column", 0) or 0),
        )
    )

    finished = datetime.now(timezone.utc)
    cancelled = bool(cancel_event is not None and cancel_event.is_set())
    summary = {
        "requested": len(buildable_files),
        "total": len(results),
        "succeeded": sum(item["ok"] for item in results),
        "failed": sum(not item["ok"] for item in results),
        "cancelled": cancelled,
        "parallel_jobs": max_workers,
        "host_cpus": host_cpus,
    }
    report = {
        "studio_version": __version__,
        "project": project["id"],
        "started_utc": started.isoformat(),
        "finished_utc": finished.isoformat(),
        "duration_seconds": (finished - started).total_seconds(),
        "cancelled": cancelled,
        "parallel": {
            "enabled": max_workers > 1,
            "workers": max_workers,
            "host_cpus": host_cpus,
        },
        "summary": summary,
        "commands": commands,
        "diagnostics": diagnostics,
        "files": results,
    }

    timestamp = started.strftime("%Y%m%dT%H%M%SZ")
    report_filename = f"build-report-{project['id']}-{timestamp}.json"
    report_path = output["reports"] / report_filename
    latest_report_path = output["reports"] / "latest-build-report.json"
    report_content = json.dumps(report, indent=2) + "\n"

    report_path.write_text(report_content, encoding="utf-8")
    latest_report_path.write_text(report_content, encoding="utf-8")

    emit(
        {
            "kind": "report",
            "message": (
                f"Report: {report_path}; "
                f"Latest report: {latest_report_path}; "
                f"Parallel jobs: {max_workers}"
            ),
            "report_json": str(report_path),
            "latest_report_json": str(latest_report_path),
            "report_filename": report_filename,
            "timestamp_utc": started.isoformat(),
            "parallel_jobs": max_workers,
            "summary": summary,
        }
    )

    return report
