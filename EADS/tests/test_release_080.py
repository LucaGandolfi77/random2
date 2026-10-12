from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from studio.services import analyze
from studio.version import __version__


def test_release_version(client):
    assert __version__ == "0.8.0"
    assert client.get("/api/version").get_json()["version"] == "0.8.0"


def test_explorer_complete_markup(client):
    response = client.get("/")
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    required = {
        "projectTree", "explorerFilter", "explorerRefresh", "explorerExpand",
        "explorerCollapse", "explorerClear", "explorerResizer", "editorTabs",
        "editorBreadcrumbs", "editorEmpty", "codeViewport", "lineNumbers",
        "explorerPreview", "editorStatusPath", "cppcheckRun", "doxygenRun",
        "analysisStop", "analysisOut", "analysisToolStatus",
    }
    ids = re.findall(r'id="([^"]+)"', html)
    assert required <= set(ids)
    assert len(ids) == len(set(ids)), "HTML contains duplicate IDs"


def test_explorer_css_owns_scrolling_and_hidden_state():
    root = Path(__file__).resolve().parents[1]
    css = (root / "studio/static/style.css").read_text(encoding="utf-8")
    assert "[hidden]{display:none!important}" in css
    assert "overflow-y:scroll" in css
    assert ".project-tree" in css
    assert ".code-viewport" in css
    assert "min-height:0" in css


def test_explorer_javascript_renders_file_content():
    root = Path(__file__).resolve().parents[1]
    javascript = (root / "studio/static/app.js").read_text(encoding="utf-8")
    assert ".textContent = content" in javascript
    assert '$("#codeViewport").hidden = false' in javascript
    assert "createTree" in javascript
    assert "directoryNode" in javascript
    assert "openFile" in javascript


def test_analysis_profiles_endpoint(client, monkeypatch, project_data):
    monkeypatch.setattr(
        analyze,
        "available_profiles",
        lambda project: [
            {"id": "cppcheck", "available": True},
            {"id": "doxygen", "available": False},
        ],
    )
    response = client.get("/api/projects/test/analysis-profiles")
    assert response.status_code == 200
    assert [item["id"] for item in response.get_json()["items"]] == ["cppcheck", "doxygen"]


def test_builtin_profiles_exist_without_project_configuration(project_data):
    project_data.pop("static_analysis", None)
    assert analyze._profile(project_data, "cppcheck")["kind"] == "cppcheck"
    assert analyze._profile(project_data, "doxygen")["kind"] == "doxygen"


def test_unknown_analysis_profile_is_clear(project_data):
    with pytest.raises(ValueError, match="Unknown analysis profile"):
        analyze._profile(project_data, "missing")


def test_doxygen_configuration(project_data, tmp_path):
    output = tmp_path / "docs"
    warning_log = output / "warnings.log"
    text = analyze._doxygen_config(project_data, output, warning_log)
    assert "GENERATE_HTML = YES" in text
    assert "GENERATE_XML = YES" in text
    assert "SOURCE_BROWSER = YES" in text
    assert str(warning_log) in text


def test_projects_json_configures_both_tools():
    root = Path(__file__).resolve().parents[1]
    data = json.loads((root / "projects.json").read_text(encoding="utf-8"))
    profiles = {item["id"] for item in data["projects"][0]["static_analysis"]}
    assert profiles == {"cppcheck", "doxygen"}
