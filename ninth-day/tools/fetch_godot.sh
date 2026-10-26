#!/usr/bin/env bash
set -euo pipefail

# Fetches the pinned headless Godot build used by the prototype.
# Godot itself is not committed to the repository.

VERSION="4.7.2-stable"
DEST="${1:-/tmp/opencode/godot}"
ARCH="linux.x86_64"
ZIP="Godot_v${VERSION}_${ARCH}.zip"
URL="https://github.com/godotengine/godot/releases/download/${VERSION}/${ZIP}"
BIN="${DEST}/Godot_v${VERSION}_${ARCH}"

mkdir -p "$DEST"

if [[ -x "$BIN" ]]; then
  echo "Godot already present: $BIN"
  "$BIN" --version
  exit 0
fi

echo "Downloading ${URL}"
curl -L --fail --silent --show-error -o "${DEST}/${ZIP}" "$URL"
unzip -o -q "${DEST}/${ZIP}" -d "$DEST"
chmod +x "$BIN"
echo "Installed: $BIN"
"$BIN" --version
