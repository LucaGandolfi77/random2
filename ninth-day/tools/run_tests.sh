#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

GODOT_BIN="${GODOT_BIN:-}"

if [[ -z "$GODOT_BIN" ]]; then
  for candidate in godot godot4 /tmp/opencode/godot/Godot_v4.7.2-stable_linux.x86_64; do
    if command -v "$candidate" >/dev/null 2>&1; then
      GODOT_BIN="$candidate"
      break
    fi
    if [[ -x "$candidate" ]]; then
      GODOT_BIN="$candidate"
      break
    fi
  done
fi

if [[ -z "$GODOT_BIN" ]]; then
  echo "Godot not found. Set GODOT_BIN or run tools/fetch_godot.sh." >&2
  exit 1
fi

echo "Using: $GODOT_BIN"

# Populate .godot so class_name globals and imported resources exist.
# Without this, a fresh checkout fails to resolve autoloads and scripts.
"$GODOT_BIN" --headless --path "$PROJECT_DIR" --editor --quit

"$GODOT_BIN" --headless --path "$PROJECT_DIR" -s tests/test_battle.gd

echo
echo "Running the end-to-end flow test..."
"$GODOT_BIN" --headless --path "$PROJECT_DIR" res://tests/flow_bootstrap.tscn
