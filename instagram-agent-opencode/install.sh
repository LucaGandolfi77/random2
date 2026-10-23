#!/usr/bin/env bash
set -euo pipefail

BUNDLE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="${IG_SKILLS_DIR:-$HOME/.agents/skills/instagram}"
COMMAND_DIR="${IG_COMMAND_DIR:-$HOME/.config/opencode/command}"
STATE_DIR="${IG_STATE_DIR:-$HOME/.config/opencode/instagram}"
DRY_RUN=0

usage() {
  cat <<'EOF'
Install the Instagram skills for opencode.

Usage:
  ./install.sh [--dry-run]

Environment overrides:
  IG_SKILLS_DIR    default ~/.agents/skills/instagram
  IG_COMMAND_DIR   default ~/.config/opencode/command
  IG_STATE_DIR     default ~/.config/opencode/instagram

The installer backs up an existing skill pack and any existing ig-*.md
commands before replacing them. User state is never overwritten.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

say() { printf '%s\n' "$*"; }
run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '  would:'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

if ! command -v python3 >/dev/null 2>&1; then
  say "Warning: python3 is not on PATH. The skill tools will not run."
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$STATE_DIR/backups/$STAMP"

say "Instagram skill pack for opencode"
say "  bundle:  $BUNDLE"
say "  skills:  $SKILLS_DIR"
say "  commands:$COMMAND_DIR"
say "  state:   $STATE_DIR"
[ "$DRY_RUN" -eq 1 ] && say "  mode:    dry run"

run mkdir -p "$STATE_DIR" "$COMMAND_DIR"

# Migrate state from the old co-located layout before moving the old pack.
for name in voice.md log.md swipe.md plan.md; do
  if [ -f "$SKILLS_DIR/$name" ] && [ ! -e "$STATE_DIR/$name" ]; then
    say "  migrate state: $name"
    run cp "$SKILLS_DIR/$name" "$STATE_DIR/$name"
  fi
done

if [ ! -e "$STATE_DIR/voice.md" ]; then
  say "  seed state: voice.md"
  run cp "$BUNDLE/templates/voice.md" "$STATE_DIR/voice.md"
fi
if [ ! -e "$STATE_DIR/log.md" ]; then
  say "  seed state: log.md"
  run cp "$BUNDLE/templates/log.md" "$STATE_DIR/log.md"
fi
if [ ! -e "$STATE_DIR/swipe.md" ]; then
  say "  seed state: swipe.md"
  run cp "$BUNDLE/templates/swipe.md" "$STATE_DIR/swipe.md"
fi

# Back up the old skill pack outside ~/.agents/skills so opencode does not
# discover the backup as duplicate skills.
if [ -e "$SKILLS_DIR" ]; then
  say "  backup skills -> $BACKUP/skills"
  run mkdir -p "$BACKUP"
  if [ "$DRY_RUN" -eq 0 ]; then
    mv "$SKILLS_DIR" "$BACKUP/skills"
  fi
fi

# Back up only this pack's commands, not unrelated user commands.
shopt -s nullglob
existing_commands=("$COMMAND_DIR"/ig-*.md)
if [ "${#existing_commands[@]}" -gt 0 ]; then
  say "  backup commands -> $BACKUP/commands"
  run mkdir -p "$BACKUP/commands"
  for file in "${existing_commands[@]}"; do
    run cp "$file" "$BACKUP/commands/"
  done
fi

run mkdir -p "$SKILLS_DIR"
say "  install skills"
if [ "$DRY_RUN" -eq 0 ]; then
  cp -R "$BUNDLE/.opencode/skills/instagram/." "$SKILLS_DIR/"
else
  say "  would: cp -R $BUNDLE/.opencode/skills/instagram/. $SKILLS_DIR/"
fi

say "  install commands"
if [ "$DRY_RUN" -eq 0 ]; then
  cp "$BUNDLE"/.opencode/command/ig-*.md "$COMMAND_DIR/"
else
  say "  would: cp $BUNDLE/.opencode/command/ig-*.md $COMMAND_DIR/"
fi

say ""
if [ "$DRY_RUN" -eq 1 ]; then
  say "Dry run complete. Nothing was changed."
else
  say "Installed 13 skills and 13 commands."
  [ -d "$BACKUP" ] && say "Backup: $BACKUP"
  say "State:  $STATE_DIR"
  say ""
  say "Quit and restart opencode, then try /ig-human or ask for a Reel."
fi
