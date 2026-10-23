#!/usr/bin/env bash
set -euo pipefail

BUNDLE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PYTHONDONTWRITEBYTECODE=1

echo "== Static and tool validation =="
python3 "$BUNDLE/tests/validate.py"

echo
echo "== Isolated installer =="
TMP="$(mktemp -d "${TMPDIR:-/tmp}/instagram-opencode-test.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT "INT" "TERM"

HOME_DIR="$TMP/home"
PROJECT="$TMP/project"
mkdir -p "$HOME_DIR" "$PROJECT"
export HOME="$HOME_DIR"
export XDG_CONFIG_HOME="$HOME/.config"
export XDG_DATA_HOME="$HOME/.local/share"
export XDG_CACHE_HOME="$HOME/.cache"

"$BUNDLE/install.sh" >"$TMP/install.log"
grep -q "Installed 13 skills and 13 commands" "$TMP/install.log"
[ -f "$HOME/.agents/skills/instagram/ig-reel/SKILL.md" ]
[ -f "$HOME/.agents/skills/instagram/ig-viral/swipe.py" ]
[ -f "$HOME/.config/opencode/command/ig-reel.md" ]
[ -f "$HOME/.config/opencode/instagram/voice.md" ]
[ -f "$HOME/.config/opencode/instagram/log.md" ]
[ -f "$HOME/.config/opencode/instagram/swipe.md" ]
echo "  ok    installed skills, commands, and state"

# User state must survive an update.
printf '\nSENTINEL-DO-NOT-OVERWRITE\n' >>"$HOME/.config/opencode/instagram/voice.md"
"$BUNDLE/install.sh" >"$TMP/update.log"
grep -q "SENTINEL-DO-NOT-OVERWRITE" "$HOME/.config/opencode/instagram/voice.md"
find "$HOME/.config/opencode/instagram/backups" -type f -name SKILL.md | grep -q .
find "$HOME/.config/opencode/instagram/backups" -type f -name 'ig-reel.md' | grep -q .
! find "$HOME/.agents/skills" -type d -name 'backups' | grep -q .
echo "  ok    update preserved state and backed up old install"

# Dry run must not create anything.
DRY_HOME="$TMP/dry-home"
mkdir -p "$DRY_HOME"
HOME="$DRY_HOME" XDG_CONFIG_HOME="$DRY_HOME/.config" \
  "$BUNDLE/install.sh" --dry-run >"$TMP/dry.log"
grep -q "Dry run complete" "$TMP/dry.log"
[ ! -e "$DRY_HOME/.agents" ]
[ ! -e "$DRY_HOME/.config/opencode/command" ]
echo "  ok    dry run made no changes"

echo
echo "== OpenCode discovery =="
if command -v opencode >/dev/null 2>&1; then
  cd "$PROJECT"
  OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1 opencode debug skill >"$TMP/skills.json" 2>"$TMP/skills.err" || {
    cat "$TMP/skills.err" >&2
    echo "  FAIL  opencode debug skill failed" >&2
    exit 1
  }
  python3 - "$TMP/skills.json" <<'PY'
import json, sys
names = {item["name"] for item in json.load(open(sys.argv[1]))}
expected = {
    "ig-audit", "ig-caption", "ig-carousel", "ig-comment", "ig-dm",
    "ig-human", "ig-plan", "ig-profile", "ig-reel", "ig-reply",
    "ig-repurpose", "ig-story", "ig-viral",
}
missing = sorted(expected - names)
extra = sorted(name for name in names if name.startswith("ig-") and name not in expected)
if missing or extra:
    raise SystemExit(f"missing={missing} unexpected={extra}")
print(f"  ok    opencode discovered all {len(expected)} ig-* skills")
PY
else
  echo "  skip  opencode not on PATH"
fi

echo
echo "== Optional Chrome rendering =="
CHROME="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [ -x "$CHROME" ]; then
  cat >"$TMP/slide.html" <<'HTML'
<!doctype html><meta charset="utf-8">
<style>
  html, body { margin: 0; width: 1080px; height: 1350px; background: #101725; }
  h1 { color: #22d3ee; font: 700 72px -apple-system, sans-serif; padding: 120px; }
</style>
<h1>Slide one</h1>
HTML
  "$CHROME" --headless --disable-gpu --hide-scrollbars --no-first-run \
    --user-data-dir="$TMP/chrome-profile" \
    --force-device-scale-factor=1 --window-size=1080,1350 \
    --screenshot="$TMP/slide.png" "file://$TMP/slide.html" \
    >"$TMP/chrome.log" 2>&1 || true
  if [ -s "$TMP/slide.png" ] && file "$TMP/slide.png" | grep -q 'PNG image data'; then
    DIMENSIONS="$(python3 - "$TMP/slide.png" <<'PY'
import struct, sys
data = open(sys.argv[1], 'rb').read(24)
print(*struct.unpack('>II', data[16:24]))
PY
)"
    if [ "$DIMENSIONS" = "1080 1350" ]; then
      echo "  ok    Chrome rendered a 1080x1350 PNG"
    else
      echo "  FAIL  Chrome PNG has unexpected dimensions: $DIMENSIONS" >&2
      exit 1
    fi
  else
    echo "  FAIL  Chrome did not produce a PNG" >&2
    tail -40 "$TMP/chrome.log" >&2 || true
    exit 1
  fi
else
  echo "  skip  Chrome not found"
fi

echo
echo "All OpenCode bundle checks passed."
