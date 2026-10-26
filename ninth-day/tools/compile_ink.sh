#!/usr/bin/env bash
set -euo pipefail

# Compiles every Ink source in content/ink to the JSON consumed by inkgd.
# inklecate is not vendored; download it from https://github.com/inkle/ink/releases.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INK_DIR="$PROJECT_DIR/content/ink"

INKLECATE_BIN="${INKLECATE_BIN:-}"
if [[ -z "$INKLECATE_BIN" ]]; then
  for candidate in inklecate /tmp/opencode/ink/inklecate/inklecate; do
    if command -v "$candidate" >/dev/null 2>&1; then
      INKLECATE_BIN="$candidate"
      break
    fi
    if [[ -x "$candidate" ]]; then
      INKLECATE_BIN="$candidate"
      break
    fi
  done
fi

if [[ -z "$INKLECATE_BIN" ]]; then
  echo "inklecate not found. Set INKLECATE_BIN." >&2
  exit 1
fi

shopt -s nullglob
for source in "$INK_DIR"/*.ink; do
  output="${source}.json"
  echo "Compiling $(basename "$source")"
  "$INKLECATE_BIN" -o "$output" "$source"
done
