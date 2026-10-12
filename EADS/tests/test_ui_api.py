import re
from pathlib import Path

REQUIRED_IDS = {
    "project","tabs","scan","all","none","build","buildStop","filter","sources",
    "preview","projectTree","explorerFilter","explorerRefresh","inspect","addr2line",
    "inspectToolchain","runStart","runStop","debugStart","debugStop","sendMi",
    "cppcheckRun","doxygenRun","analysisStop","stackLoad","appStatus","toast",
}


def test_home_contains_all_required_controls(client):
    response = client.get("/")
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    ids = set(re.findall(r'id="([^"]+)"', html))
    assert REQUIRED_IDS <= ids
    assert "app.js?v=0.8.0" in html


def test_static_assets_are_served(client):
    assert client.get("/static/app.js?v=0.8.0").status_code == 200
    assert client.get("/static/style.css?v=0.8.0").status_code == 200
    assert client.get("/favicon.ico").status_code == 200


def test_favicon_and_unknown_route_do_not_become_500(client):
    favicon = client.get("/favicon.ico")
    missing = client.get("/definitely-missing")
    assert favicon.status_code == 200
    assert missing.status_code == 404
    assert missing.is_json


def test_health_and_version(client):
    health = client.get("/api/health")
    version = client.get("/api/version")
    assert health.status_code == 200
    assert health.get_json()["ok"] is True
    assert health.get_json()["version"] == "0.8.0"
    assert version.get_json()["version"] == "0.8.0"


def test_projects_sources_tree_and_preview(client):
    assert client.get("/api/projects").status_code == 200
    sources = client.get("/api/projects/test/sources")
    tree = client.get("/api/projects/test/tree")
    preview = client.get("/api/projects/test/file?path=src/main.c")
    assert sources.status_code == 200
    assert tree.status_code == 200
    assert preview.status_code == 200
    assert "int main" in preview.get_json()["content"]


def test_build_without_files_is_400(client):
    response = client.post("/api/projects/test/build", json={"files":[]})
    assert response.status_code == 400
    assert response.is_json


def test_unknown_project_is_404_json(client):
    response = client.get("/api/projects/missing/sources")
    assert response.status_code == 404
    assert response.is_json
    assert response.get_json()["request_id"]


def test_app_js_has_no_old_release_references():
    root = Path(__file__).resolve().parents[1]
    javascript = (root / "studio/static/app.js").read_text(encoding="utf-8")
    assert "0.5.0" not in javascript
    assert "2.2.0" not in javascript
    assert "DOMContentLoaded" in javascript
    assert "addEventListener" in javascript
