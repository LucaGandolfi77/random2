import queue
import threading
import pytest
from studio.version import __version__
from studio.registry import ExpiringRegistry
from studio.services.common import safe
from studio.services.source import ensure_buildable, scan
from studio.services import gdbmi


def test_version_unique(app, client):
    assert [r.rule for r in app.url_map.iter_rules() if r.rule == "/api/version"] == [
        "/api/version"
    ]
    assert client.get("/api/version").get_json()["version"] == __version__ == "0.8.0"


def test_routes_clean(app):
    assert all("&lt;" not in r.rule for r in app.url_map.iter_rules())


def test_request_id(client):
    assert (
        client.get("/api/version", headers={"X-Request-ID": "abc"}).headers[
            "X-Request-ID"
        ]
        == "abc"
    )


def test_unknown_project(client):
    assert client.get("/api/projects/missing/sources").status_code == 404


def test_source_scan(project_data):
    items = {x["path"]: x for x in scan(project_data)}
    assert (
        items["src/main.c"]["buildable"]
        and not items["include/main.h"]["buildable"]
        and "excluded/skip.c" not in items
    )


def test_safe(project_data):
    with pytest.raises(ValueError):
        safe(project_data, "../../outside")


@pytest.mark.parametrize("name", ["x.h", "x.o", "README.md"])
def test_reject_non_source(name):
    with pytest.raises(ValueError):
        ensure_buildable(name)


@pytest.mark.parametrize("name", ["x.c", "x.s", "X.S"])
def test_accept_source(name):
    assert ensure_buildable(name) == name


def test_preview(client):
    assert client.get("/api/projects/test/file?path=src/main.c").status_code == 200


def test_preview_large(client, project_root):
    (project_root / "large.txt").write_text("x" * 33)
    assert client.get("/api/projects/test/file?path=large.txt").status_code == 400


def test_preview_binary(client, project_root):
    (project_root / "binary.bin").write_bytes(b"a\x00b")
    assert client.get("/api/projects/test/file?path=binary.bin").status_code == 400


def test_registry_bound():
    registry = ExpiringRegistry(100, 2)
    registry["a"] = {}
    registry["b"] = {}
    registry["c"] = {}
    assert len(registry.snapshot()) == 2


class Input:
    def __init__(self):
        self.writes = []

    def write(self, value):
        self.writes.append(value)

    def flush(self):
        pass


class Process:
    def __init__(self):
        self.stdin = Input()
        self.returncode = None

    def poll(self):
        return None


def session(lines=()):
    output = queue.Queue()
    for line in lines:
        output.put(line)
    return {
        "gdb": Process(),
        "server": Process(),
        "lock": threading.Lock(),
        "profile": {},
        "queue": output,
        "stop_event": threading.Event(),
        "token": 0,
    }


def test_gdb_token():
    gdbmi.SESSIONS["x"] = session(["1^done"])
    try:
        assert gdbmi.command("x", "-stack-list-frames", 0.1)["token"] == "1"
    finally:
        gdbmi.SESSIONS.pop("x", None)


def test_gdb_timeout():
    gdbmi.SESSIONS["x"] = session()
    try:
        with pytest.raises(TimeoutError):
            gdbmi.command("x", "-exec-next", 0.01)
    finally:
        gdbmi.SESSIONS.pop("x", None)
