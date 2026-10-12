from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from .common import output_dirs, root, run, safe

Emit = Callable[[dict[str, Any]], None]
SOURCE_EXTENSIONS = {".c", ".h", ".cc", ".cpp", ".cxx", ".hh", ".hpp", ".s", ".S"}

DEFAULT_PROFILES = {
    "cppcheck": {
        "id": "cppcheck",
        "kind": "cppcheck",
        "executable": "cppcheck",
        "arguments": [
            "--enable=warning,style,performance,portability",
            "--inline-suppr",
            "--force",
            "--language=c",
            "--std=c99",
            "--template=gcc",
        ],
        "timeout_seconds": 1800,
    },
    "doxygen": {
        "id": "doxygen",
        "kind": "doxygen",
        "executable": "doxygen",
        "arguments": [],
        "timeout_seconds": 1800,
    },
}


def available_profiles(project: dict[str, Any]) -> list[dict[str, Any]]:
    """Return configured profiles merged with safe built-in defaults."""
    merged = {name: dict(value) for name, value in DEFAULT_PROFILES.items()}
    for profile in project.get("static_analysis", []):
        profile_id = str(profile.get("id", "")).strip()
        if profile_id:
            base = merged.get(profile_id, {})
            merged[profile_id] = {**base, **profile}
    result = []
    for profile in merged.values():
        executable = str(profile.get("executable", profile["id"]))
        resolved = shutil.which(executable)
        result.append({
            "id": profile["id"],
            "kind": profile.get("kind", profile["id"]),
            "executable": executable,
            "available": resolved is not None,
            "resolved_executable": resolved,
        })
    return sorted(result, key=lambda item: item["id"])


def _profile(project: dict[str, Any], profile_id: str) -> dict[str, Any]:
    profiles = {item["id"]: item for item in DEFAULT_PROFILES.values()}
    for configured in project.get("static_analysis", []):
        configured_id = str(configured.get("id", "")).strip()
        if configured_id:
            profiles[configured_id] = {**profiles.get(configured_id, {}), **configured}
    if profile_id not in profiles:
        available = ", ".join(sorted(profiles))
        raise ValueError(f"Unknown analysis profile '{profile_id}'. Available: {available}")
    return profiles[profile_id]


def _executable(profile: dict[str, Any]) -> str:
    requested = str(profile.get("executable", profile["id"]))
    resolved = shutil.which(requested)
    if resolved is None:
        raise RuntimeError(
            f"Required tool '{requested}' was not found in PATH. "
            f"Install it in WSL, then restart the application."
        )
    return resolved


def _all_sources(project: dict[str, Any]) -> list[str]:
    project_root = root(project)
    paths: set[str] = set()
    for relative_root in project.get("source_roots", ["."]):
        source_root = safe(project, str(relative_root))
        if not source_root.is_dir():
            continue
        for path in source_root.rglob("*"):
            if path.is_file() and path.suffix in SOURCE_EXTENSIONS:
                paths.add(path.relative_to(project_root).as_posix())
    return sorted(paths, key=str.casefold)


def _selected_files(project: dict[str, Any], files: list[str]) -> list[str]:
    selected = files or _all_sources(project)
    return [str(safe(project, item)) for item in selected]


def _cppcheck_common_flags(project: dict[str, Any], profile: dict[str, Any]) -> list[str]:
    """Build the preprocessor flags shared by every cppcheck invocation.

    The text and XML reports must observe the same include paths and defines,
    otherwise they describe different translation units.
    """
    flags = [str(item) for item in profile.get("arguments", [])]
    for directory in project.get("include_dirs", []):
        include = safe(project, str(directory))
        if include.is_dir():
            flags.append(f"-I{include}")
    for name, value in project.get("defines", {}).items():
        if value is False:
            continue
        flags.append(f"-D{name}" if value is None or value is True else f"-D{name}={value}")
    return flags


def _cppcheck(
    project: dict[str, Any],
    profile: dict[str, Any],
    files: list[str],
    emit: Emit,
    cancel_event: Any,
) -> dict[str, Any]:
    executable = _executable(profile)
    evidence = output_dirs(project)["evidence"]
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    xml_path = evidence / f"cppcheck-{timestamp}.xml"
    text_path = evidence / f"cppcheck-{timestamp}.txt"
    targets = _selected_files(project, files)
    shared_flags = _cppcheck_common_flags(project, profile)

    command = [executable, *shared_flags, *targets]

    emit({"kind": "progress", "message": f"Cppcheck: analyzing {len(targets)} files"})
    if cancel_event is not None and cancel_event.is_set():
        return {"cancelled": True}
    result = run(
        command,
        cwd=root(project),
        timeout=int(profile.get("timeout_seconds", 1800)),
    )
    text_path.write_text(result["stderr"], encoding="utf-8")

    xml_command = [executable, "--xml", "--xml-version=2"]
    xml_command.extend(item for item in shared_flags if not item.startswith("--template"))
    xml_command.extend(targets)
    xml_result = run(
        xml_command,
        cwd=root(project),
        timeout=int(profile.get("timeout_seconds", 1800)),
    )
    xml_path.write_text(xml_result["stderr"], encoding="utf-8")
    result.update({
        "profile": "cppcheck",
        "analyzed_files": len(targets),
        "text_report": str(text_path),
        "xml_report": str(xml_path),
    })
    return result


def _doxygen_config(project: dict[str, Any], output: Path, warning_log: Path) -> str:
    inputs = []
    for relative in project.get("source_roots", ["."]):
        directory = safe(project, str(relative))
        if directory.is_dir():
            inputs.append(f'"{directory}"')
    if not inputs:
        inputs.append(f'"{root(project)}"')
    project_name = str(project.get("name", project.get("id", "Embedded project"))).replace('"', "'")
    return "\n".join([
        f'PROJECT_NAME = "{project_name}"',
        f'OUTPUT_DIRECTORY = "{output}"',
        f'INPUT = {" ".join(inputs)}',
        'FILE_PATTERNS = *.c *.h *.cc *.cpp *.cxx *.hh *.hpp *.S *.s',
        'RECURSIVE = YES',
        'EXTRACT_ALL = YES',
        'EXTRACT_STATIC = YES',
        'SOURCE_BROWSER = YES',
        'REFERENCES_RELATION = YES',
        'REFERENCED_BY_RELATION = YES',
        'HAVE_DOT = NO',
        'GENERATE_HTML = YES',
        'GENERATE_XML = YES',
        'GENERATE_LATEX = NO',
        'QUIET = YES',
        'WARNINGS = YES',
        'WARN_IF_UNDOCUMENTED = YES',
        f'WARN_LOGFILE = "{warning_log}"',
        'INPUT_ENCODING = UTF-8',
    ]) + "\n"


def _doxygen(
    project: dict[str, Any],
    profile: dict[str, Any],
    emit: Emit,
    cancel_event: Any,
) -> dict[str, Any]:
    executable = _executable(profile)
    evidence = output_dirs(project)["evidence"]
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output = evidence / f"doxygen-{timestamp}"
    output.mkdir(parents=True, exist_ok=True)
    warning_log = output / "doxygen-warnings.log"
    config = output / "Doxyfile"
    config.write_text(_doxygen_config(project, output, warning_log), encoding="utf-8")
    emit({"kind": "progress", "message": "Doxygen: generating HTML and XML documentation"})
    if cancel_event is not None and cancel_event.is_set():
        return {"cancelled": True}
    result = run(
        [executable, str(config)],
        cwd=root(project),
        timeout=int(profile.get("timeout_seconds", 1800)),
    )
    result.update({
        "profile": "doxygen",
        "config": str(config),
        "output_directory": str(output),
        "html_index": str(output / "html" / "index.html"),
        "xml_index": str(output / "xml" / "index.xml"),
        "warning_log": str(warning_log),
    })
    return result


def static_analysis(
    project: dict[str, Any],
    profile_id: str,
    files: list[str],
    emit: Emit = lambda event: None,
    cancel_event: Any = None,
) -> dict[str, Any]:
    profile = _profile(project, profile_id)
    kind = str(profile.get("kind", profile_id)).lower()
    if kind == "cppcheck":
        result = _cppcheck(project, profile, files, emit, cancel_event)
    elif kind == "doxygen":
        result = _doxygen(project, profile, emit, cancel_event)
    else:
        executable = _executable(profile)
        command = [executable]
        command.extend(str(item) for item in profile.get("arguments", []))
        command.extend(_selected_files(project, files))
        result = run(command, cwd=root(project), timeout=int(profile.get("timeout_seconds", 1800)))

    evidence = output_dirs(project)["evidence"]
    latest = evidence / f"latest-{profile_id}.json"
    latest.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    emit({"kind": "analysis-result", "message": f"{profile_id} completed", "result": result})
    return result


def stack_usage(project: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    project_root = root(project)
    for path in project_root.rglob("*.su"):
        for line in path.read_text(errors="replace").splitlines():
            parts = line.split("\t")
            if len(parts) >= 3:
                rows.append({
                    "location": parts[0],
                    "bytes": parts[1],
                    "kind": parts[2],
                    "file": str(path.relative_to(project_root)),
                })
    return rows
