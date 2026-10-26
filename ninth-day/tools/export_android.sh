#!/usr/bin/env bash
set -euo pipefail

# Builds the Android debug APK from the checked-in export preset.
# Requires:
#   - Godot 4.7.x with Android export templates installed
#   - Android SDK with build-tools 35 and platform 35
#   - JDK 17
#
# Set GODOT_BIN / ANDROID_HOME / JAVA_HOME if they are not on PATH.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT="${1:-$PROJECT_DIR/build/ninth-day-debug.apk}"

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
  echo "Godot not found. Set GODOT_BIN." >&2
  exit 1
fi

if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" ]]; then
  echo "Set ANDROID_HOME (or ANDROID_SDK_ROOT) to the Android SDK path." >&2
  exit 1
fi

export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi

mkdir -p "$(dirname "$OUTPUT")"
echo "Using Godot: $GODOT_BIN"
echo "Android SDK: $ANDROID_HOME"
echo "Output: $OUTPUT"

"$GODOT_BIN" --headless --path "$PROJECT_DIR" --export-debug "Android" "$OUTPUT"

if [[ -f "$OUTPUT" ]]; then
  echo "Built: $OUTPUT"
  ls -lh "$OUTPUT"
else
  echo "Export finished but no APK was produced." >&2
  exit 1
fi
