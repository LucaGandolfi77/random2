#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILLS = ROOT / ".opencode" / "skills" / "instagram"
COMMANDS = ROOT / ".opencode" / "command"
EXPECTED = {
    "ig-audit",
    "ig-caption",
    "ig-carousel",
    "ig-comment",
    "ig-dm",
    "ig-human",
    "ig-plan",
    "ig-profile",
    "ig-reel",
    "ig-reply",
    "ig-repurpose",
    "ig-story",
    "ig-viral",
}
ASSETS = {
    "ig-caption": ["caption.py"],
    "ig-human": ["detect.py", "humanize.py", "slop.json"],
    "ig-profile": ["rubric.json"],
    "ig-reel": ["beats.py", "hooks.json", "hookscore.py"],
    "ig-viral": ["swipe.py"],
}

failures = []


def check(label, condition, detail=""):
    if condition:
        print(f"  ok    {label}")
        return
    failures.append(label)
    print(f"  FAIL  {label}" + (f" -> {detail}" if detail else ""))


def frontmatter(text):
    match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    return match.group(1) if match else ""


def run(args, stdin=None):
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    return subprocess.run(
        [sys.executable, *map(str, args)],
        input=stdin,
        text=True,
        capture_output=True,
        cwd=ROOT.parent,
        env=env,
    )


def main():
    dirs = {path.parent.name: path.parent for path in SKILLS.glob("ig-*/SKILL.md")}
    check("13 skill directories", set(dirs) == EXPECTED, f"found {sorted(dirs)}")

    for name in sorted(EXPECTED):
        skill = dirs.get(name)
        if not skill:
            continue
        text = (skill / "SKILL.md").read_text()
        fm = frontmatter(text)
        check(f"{name}: name matches folder", f"name: {name}" in fm)
        check(f"{name}: description present", "description:" in fm and len(fm) > 80)
        check(f"{name}: MIT metadata", "license: MIT" in fm and "compatibility: opencode" in fm)
        check(f"{name}: upstream commit", "d03c56bb598be770c60b201f94237e5d1a4268a6" in fm)
        check(f"{name}: OpenCode preamble", "**OpenCode:**" in text)
        check(f"{name}: no Claude state path", "~/.claude" not in text)
        for asset in ASSETS.get(name, []):
            check(f"{name}: asset {asset}", (skill / asset).is_file())

    all_text = "\n".join(path.read_text() for path in SKILLS.rglob("*") if path.is_file() and path.suffix in {".md", ".py"})
    check("no stale Claude state paths", "~/.claude/instagram" not in all_text)
    check("no unsupported Claude plugin files", not (ROOT / ".claude-plugin").exists())

    state_files = [
        SKILLS / "ig-audit" / "SKILL.md",
        SKILLS / "ig-comment" / "SKILL.md",
        SKILLS / "ig-plan" / "SKILL.md",
        SKILLS / "ig-reel" / "SKILL.md",
        SKILLS / "ig-viral" / "SKILL.md",
        ROOT / "templates" / "voice.md",
        SKILLS / "ig-viral" / "swipe.py",
    ]
    for path in state_files:
        check(f"{path.relative_to(ROOT)}: OpenCode state path", "~/.config/opencode/instagram/" in path.read_text())

    command_files = {path.stem: path for path in COMMANDS.glob("ig-*.md")}
    check("13 command wrappers", set(command_files) == EXPECTED, f"found {sorted(command_files)}")
    for name in sorted(EXPECTED):
        path = command_files.get(name)
        if not path:
            continue
        text = path.read_text()
        fm = frontmatter(text)
        check(f"{name}: command description", "description:" in fm and len(fm) > 30)
        check(f"{name}: loads matching skill", f"Load the `{name}` skill with the skill tool" in text)
        check(f"{name}: passes arguments", "$ARGUMENTS" in text)

    # The Python tools are intentionally stdlib-only and must run from any cwd.
    sample_hook = "I lost 18,000 dollars because of one missing contract."
    checks = [
        ("hookscore", [SKILLS / "ig-reel" / "hookscore.py", "--hook", sample_hook], None, "HOOK SCORE"),
        ("beats", [SKILLS / "ig-reel" / "beats.py", "-", "--target", "30"], "I lost 18,000 dollars because of one missing contract.\nHere is the clause I use now.\nThat one line is worth 18,000 dollars.\n", "BEAT SHEET"),
        ("caption", [SKILLS / "ig-caption" / "caption.py", "-", "--keywords", "client contracts"], "I lost $18,000 because of one missing client contracts clause.\n\nHere is the clause I use now. Comment CONTRACT and I will send it.\n", "CAPTION LINT"),
        ("humanize", [SKILLS / "ig-human" / "humanize.py", "-", "--report"], "In today's fast-paced world, we leverage robust solutions — it's a testament to innovation.\n", "HUMANIZE REPORT"),
        ("detect", [SKILLS / "ig-human" / "detect.py", "-"], "In today's fast-paced world, we leverage robust solutions — it's a testament to innovation.\n", "AI DETECTION PANEL"),
    ]
    for label, args, stdin, expected in checks:
        result = run(args, stdin)
        output = result.stdout + result.stderr
        allowed = {0, 1} if label == "detect" else {0}
        check(f"{label}: expected exit", result.returncode in allowed, output[-500:])
        check(f"{label}: expected output", expected in output, output[-500:])

    swipe_input = (
        "account\tfollowers\tmedian\tviews\thook\n"
        "@a\t48000\t11000\t412000\tnobody tells you your first 30 reels are supposed to flop\n"
        "@b\t2000000\t300000\t400000\tin this video I am going to show you my morning routine\n"
    )
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "swipe.md"
        result = run([SKILLS / "ig-viral" / "swipe.py", "-", "--out", out], swipe_input)
        output = result.stdout + result.stderr
        check("swipe: exit 0", result.returncode == 0, output[-500:])
        check("swipe: writes output", out.is_file() and out.stat().st_size > 100)
        check("swipe: ranks by outlier", out.is_file() and "# Swipe file" in out.read_text())

    # Keep the vendored JSON parseable.
    for path in [SKILLS / "ig-reel" / "hooks.json", SKILLS / "ig-human" / "slop.json", SKILLS / "ig-profile" / "rubric.json"]:
        try:
            json.loads(path.read_text())
            check(f"{path.name}: valid JSON", True)
        except Exception as exc:
            check(f"{path.name}: valid JSON", False, str(exc))

    if failures:
        print(f"\n{len(failures)} validation check(s) failed")
        return 1
    print("\nall validation checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
