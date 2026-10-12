#!/usr/bin/env bash
set -eu
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
python -m compileall studio tests
pytest -vv --no-cov
