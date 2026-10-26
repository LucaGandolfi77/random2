# 11 — AI Agent Workflow

## Operating model

One human, many agents. The human is the creative director, final decision-maker, playtester, and community voice. Agents are the staff.

## Roles

### Producer agent
- Maintains the roadmap and task board.
- Turns goals into small, testable tickets.
- Runs a daily standup summary: done, next, blockers.
- Flags scope creep and missing acceptance criteria.

### Sim agent
- Owns `packages/sim`.
- Implements fixed-step simulation, recording, ghosts, guards, collision, validation.
- Writes unit tests and solution-tape harnesses.
- Never imports Phaser or DOM APIs.

### Phaser agent
- Owns `apps/web`.
- Scenes, rendering, input, particles, PWA shell, performance.
- Reads sim state; never mutates it.
- Adds accessibility and safe-area handling.

### Backend agent
- Owns `apps/api`.
- Worker endpoints, D1 migrations, KV, entitlements, leaderboard.
- Imports `@crew-of-one/sim` for replay validation.
- Writes integration tests and rate limits.

### Level agent
- Proposes vault layouts and solution tapes.
- Runs the validator and difficulty simulation.
- Produces candidates for human curation; never ships a vault without a passing solution tape.

### Art agent
- Moodboards, palette studies, UI mockups, marketing image drafts, room composition studies.
- Does not produce final sprites, tiles, animations, logo, key art, or store screenshots.
- Writes briefs for the human pixel artist.

### Audio agent
- Synth patch sketches, SFX variations, music ideas.
- Does not produce the final mix.
- Writes briefs for the human sound designer.

### QA agent
- Fuzzes the sim and API.
- Generates Playwright tests.
- Runs device checklists.
- Writes bug reports with repro steps.

### Marketing agent
- Devlog drafts, store copy, press kit, social posts, localization drafts.
- Human edits for tone and accuracy.

### Legal/ops agent
- Drafts checklists only. Human/attorney review required before publishing terms, privacy, or store submissions.

## Workflow

1. Human sets the weekly goal.
2. Producer agent writes tickets from `docs/tasks/TEMPLATE.md`.
3. Agents work in isolated git worktrees/branches.
4. CI runs typecheck, tests, vault solution tapes, build.
5. Human reviews the PR and playtests when relevant.
6. Merge to `main`; deploy preview.
7. Weekly build + playtest + metrics review.

## Guardrails

- No direct pushes to `main`.
- One behavior per PR.
- No new dependencies without human approval.
- No secrets in prompts, code, or logs.
- No gameplay rule changes without updating `docs/01-game-design.md`.
- No weakening tests to make CI pass.
- No final AI art/audio without written human approval.
- No monetization/legal/store changes without human approval.

## What AI is good at

- Boilerplate, sim logic, backend, tests, refactors.
- Docs, changelogs, task breakdowns.
- Level candidate generation and validation.
- QA scripts, fuzzing, bug summaries.
- Marketing and localization drafts.

## What AI is bad at

- Final pixel art consistency and animation.
- Game feel and juice.
- Puzzle elegance and difficulty pacing.
- Tone and narrative voice.
- Legal judgment.
- Community trust.

The human owns those.

## Recommended tooling

- OpenCode subagents/worktrees for parallel work.
- GitHub Actions for CI.
- Vitest for unit/integration.
- Playwright for e2e.
- Wrangler for local API.
- Aseprite CLI and Tiled for content pipelines.
- A simple task board in `docs/tasks/` if no external tracker.

## Prompt hygiene

Every task prompt should include:

- Goal and context.
- Exact files likely touched.
- Acceptance criteria.
- Test commands.
- Out-of-scope list.
- Relevant docs links.
- Performance/accessibility notes.

## Definition of done

See `AGENTS.md`. A task is not done until tests, docs, and playtest notes are updated.
