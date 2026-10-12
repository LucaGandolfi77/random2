from pathlib import Path
import pytest
from studio import create_app


@pytest.fixture
def project_root(tmp_path: Path):
    (tmp_path / "src").mkdir()
    (tmp_path / "include").mkdir()
    (tmp_path / "src" / "main.c").write_text("int main(void){return 0;}\n", encoding="utf-8")
    (tmp_path / "include" / "main.h").write_text("#pragma once\n", encoding="utf-8")
    return tmp_path


@pytest.fixture
def project_data(project_root):
    return {
        "id":"test", "name":"Test", "project_root":str(project_root),
        "rtems_path":str(project_root / "rtems"), "target_prefix":"sparc-rtems6-",
        "bsp":"test", "source_roots":["src","include"], "include_dirs":["include"],
        "exclude_globs":[], "explorer_max_preview_bytes":32,
        "execution_profiles":[], "debug_profiles":[], "static_analysis":[],
    }


@pytest.fixture
def app(monkeypatch, project_data):
    application = create_app({"TESTING": True})
    monkeypatch.setattr("studio.web.load", lambda: {"projects":[project_data]})
    def get_project(pid):
        if pid != "test": raise KeyError(pid)
        return project_data
    monkeypatch.setattr("studio.web.project", get_project)
    return application


@pytest.fixture
def client(app):
    return app.test_client()
