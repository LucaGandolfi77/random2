# Instagram agent skills for opencode

An opencode-compatible packaging of
[Jakeschincariol/instagram-agent-skill](https://github.com/Jakeschincariol/instagram-agent-skill):
thirteen skills and six dependency-free Python tools for writing Reels,
captions, carousels, stories, comments, replies, DMs, plans, profile rewrites,
repurposed content, audits, and humanized drafts.

Upstream is MIT licensed. This bundle restores the complete upstream skills at
commit `d03c56bb598be770c60b201f94237e5d1a4268a6` and adds only the OpenCode
integration described below.

**Nothing posts, follows, likes, DMs, or scrapes.** These skills draft; the user
posts.

## What is in the bundle

```text
.opencode/
  skills/instagram/ig-*/SKILL.md   13 OpenCode skills
  skills/instagram/ig-*/...         scripts and JSON assets
  command/ig-*.md                  13 /ig-* command wrappers
templates/                         voice, log, and swipe seeds
install.sh                         installer with backups and dry run
tests/                             static, tool, and install checks
```

The skills are complete upstream files, not the truncated copies that may
exist in an old local install. `ig-viral/swipe.py`, which is required by
`/ig-viral`, is included.

## Install

Preview first:

```bash
cd instagram-agent-opencode
./install.sh --dry-run
```

Install:

```bash
./install.sh
```

Then **quit and restart opencode**. Skills and commands are loaded at startup.

The installer uses these locations:

| What | Where |
| --- | --- |
| skills | `~/.agents/skills/instagram` |
| commands | `~/.config/opencode/command` |
| user state | `~/.config/opencode/instagram` |

Override them with `IG_SKILLS_DIR`, `IG_COMMAND_DIR`, and `IG_STATE_DIR`.

The installer:

- backs up an existing skill pack and any existing `ig-*.md` commands before
  replacing them;
- puts backups under `~/.config/opencode/instagram/backups/`, outside the
  skill scan path, so old skills are not discovered twice;
- migrates `voice.md`, `log.md`, `swipe.md`, and `plan.md` from the old
  co-located layout when present;
- seeds missing state files from `templates/`;
- never overwrites an existing `voice.md` or log.

## Use

Skills also trigger from natural language. For explicit control, use:

| Command | Job |
| --- | --- |
| `/ig-reel` | Reel hooks, script, on-screen text, beat sheet |
| `/ig-viral` | Niche research and swipe file |
| `/ig-caption` | Caption and feed-truncation linter |
| `/ig-carousel` | Carousel copy and 1080x1350 rendering |
| `/ig-story` | Daily Story sequence and DM funnel |
| `/ig-profile` | Profile score and rewrite |
| `/ig-plan` | Weekly plan and engagement list |
| `/ig-human` | Strip AI fingerprint and score the draft |
| `/ig-comment` | Comments for other people's posts |
| `/ig-reply` | Replies under your own posts |
| `/ig-dm` | Keyword delivery, outreach, follow-ups |
| `/ig-repurpose` | One long asset into a week of posts |
| `/ig-audit` | Post-mortem on published content |

Each command loads its matching skill rather than duplicating the instructions,
so the pack has one source of truth.

## State

| File | Purpose |
| --- | --- |
| `voice.md` | How you speak and what you never say. Fill this in first. |
| `log.md` | Published posts and engagement rounds. |
| `swipe.md` | Evidence from `/ig-viral`. |
| `plan.md` | The current weekly plan. |

Initial state lives in `~/.config/opencode/instagram/`. The voice template is
also at `templates/voice.md`. Do not put state back inside the skill folders.

## Accounts

`accounts/` holds portable, credential-free snapshots of real profiles: identity,
stats, current bio, highlights, pinned posts, the audit score, approved
rewrites, and the restore steps for a new machine.

```text
accounts/gandolfi_luca.md                  profile resume + audit + final copy
accounts/gandolfi_luca-voice.md            filled voice profile
accounts/gandolfi_luca-intro-reel.md       pinned intro script + beat sheet
accounts/gandolfi_luca-plan-2026-10-26.md  the week built on the audit
```

Copy the account and voice files into the state directory after installing on
another computer:

```bash
mkdir -p ~/.config/opencode/instagram
cp accounts/gandolfi_luca.md accounts/gandolfi_luca-voice.md \
   ~/.config/opencode/instagram/
mv ~/.config/opencode/instagram/gandolfi_luca.md \
   ~/.config/opencode/instagram/account.md
mv ~/.config/opencode/instagram/gandolfi_luca-voice.md \
   ~/.config/opencode/instagram/voice.md
cp accounts/gandolfi_luca-plan-2026-10-26.md \
   ~/.config/opencode/instagram/plan.md
```

Never put passwords, 2FA codes, cookies, or recovery addresses in `accounts/`.
These files are meant to be committed.

## OpenCode adaptations

Only these changes were made to upstream:

- `~/.claude/instagram/...` state paths now point at
  `~/.config/opencode/instagram/...`.
- Skills tell the model to resolve scripts and JSON against the skill's base
  directory, not the project working directory.
- Internal handoffs load sibling skills with the skill tool. User-facing
  `/ig-*` examples remain because command wrappers exist.
- The command wrappers and installer are new.
- `ig-viral` documents that `webfetch` cannot read logged-in Instagram pages.
  Use a user-driven browser MCP or pasted rows.
- `ig-carousel` documents a local Chrome headless screenshot recipe.
- Frontmatter adds `license`, `compatibility`, and upstream commit metadata.

### Optional tools

The Python tools use only the standard library. `yt-dlp` is optional and only
used by the public YouTube Shorts fallback in `ig-viral`:

```bash
python3 -m pip install --user yt-dlp
```

Chrome is optional for carousel PNG rendering. On macOS the bundle documents:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1080,1350 \
  --screenshot=slide-01.png "file:///absolute/path/slide-01.html"
```

If Chrome is absent, the skill delivers approved HTML and says the PNGs were not
rendered.

## Validation

```bash
cd instagram-agent-opencode
./tests/smoke.sh
```

The smoke test checks:

- all 13 skill names, folders, frontmatter, and local assets;
- all 13 command wrappers point at real skills;
- no stale `~/.claude` state paths;
- all six Python tools compile and run with sample input;
- `swipe.py` writes a swipe file;
- an isolated installer run creates the expected layout and preserves state;
- the installed bundle is discovered by `opencode debug skill` when a fresh
  isolated home is used;
- optional Chrome rendering works when Chrome exists.

The test does not call an LLM and does not modify your real `~/.agents` or
`~/.config/opencode` directories.

## Updating

Re-run `install.sh`. It backs up the current skill pack and commands, replaces
them with the bundle, and leaves state alone. Restart opencode afterwards.

If you previously installed the pack under `~/.agents/skills/instagram`, the
installer moves that directory into the backup. It does not leave a duplicate
tree under the skill scan path.

## Attribution

Upstream: <https://github.com/Jakeschincariol/instagram-agent-skill>

Copyright (c) 2026 Jake Schincariol. MIT. See `LICENSE` and `NOTICE.md`.

This is an independent OpenCode packaging. Upstream does not endorse it.
