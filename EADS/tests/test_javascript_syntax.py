from pathlib import Path
import shutil
import subprocess
import pytest


def test_app_javascript_syntax():
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is not installed")
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run([node, "--check", str(root / "studio/static/app.js")], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
