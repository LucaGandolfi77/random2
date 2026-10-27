# 07 — Level Design

## Constraint

Every vault fits on **one screen**: 10 × 16 tiles at 32px. No scrolling, no hidden information. The player sees the whole puzzle.

## Design method

1. Start with one “aha” per vault.
2. Place the locked path first: plate, door, guard, camera, or laser.
3. Ask: what does the player need a second body to do?
4. Set the par: the minimum number of echoes.
5. Record a solution tape.
6. Playtest; if the solution is fiddly, simplify.

## Mechanic ladder

| # | Vault | Teaches | Par |
|---|---|---|---|
| 1 | The Gallery | A plate holds a door | 1 |
| 2 | The Night Watch | Echoes distract guards | 1 |
| 3 | Two Hands | Two bodies, two plates | 2 |
| 4 | The Whistle | Noise moves guards | 2 |
| 5 | The Archive | A lever blinds a camera | 2 |
| 6 | Red Lines | Dash through lasers | 2 |
| 7 | The Long Way | One-way door from inside | 2 |
| 8 | The Handoff | Echo carries the gem | 3 |
| 9 | Double Watch | Split two guards | 3 |
| 10 | The Vault Door | Two plates + lever | 3 |
| 11 | The Power Cut | Lights out, vision shrinks | 3 |
| 12 | The Relay | Sequenced levers | 4 |
| 13 | The Safe Room | One-way vent | 3 |
| 14 | The False Gem | Decoy triggers alarm | 4 |
| 15 | After You | Finale, all mechanics | 5 |

All fifteen are implemented with solution tapes. Chapter 3 added two shared rules:

- **Blackout levers:** a held lever whose `targetIds` include a guard id shrinks that guard's vision to 35% while it is pressed. The cone renders at the reduced size.
- **Lever doors:** a door with `mode: "lever"` opens while every lever whose `targetIds` include the door is live. Toggle levers use `disableMs` as their window, which makes relay timing possible.

" The Power Cut uses a blackout lever. "The Relay" uses two toggle levers on one lever door. "The Safe Room" combines a one-way vent, two plates, a camera lever, and gem carrying. "The Long Count" pairs a disabled beam with a timed beam and a dash. "After You" combines plates, camera and blackout levers, a guard, a beam, a one-way vent, and the gem.

## Vault format

Vaults are JSON validated by Zod. Use Tiled for layout, export object layers, and merge with metadata.

```json
{
  "id": "vault-01",
  "name": "The Gallery",
  "chapter": 1,
  "loopSeconds": 30,
  "maxEchoes": 3,
  "parEchoes": 1,
  "tilesX": 10,
  "tilesY": 16,
  "tileSize": 32,
  "playerStart": { "x": 160, "y": 464 },
  "exit": { "x": 288, "y": 96, "w": 32, "h": 32 },
  "walls": [{ "x": 0, "y": 0, "w": 320, "h": 32 }],
  "plates": [{ "id": "plate-a", "x": 96, "y": 288, "radius": 18, "mode": "hold", "targets": ["door-a"] }],
  "doors": [{ "id": "door-a", "x": 192, "y": 128, "w": 32, "h": 96, "mode": "plate" }],
  "levers": [],
  "guards": [],
  "cameras": [],
  "lasers": [],
  "gem": { "x": 256, "y": 96 },
  "hints": ["The plate only holds while someone stands on it."]
}
```

## Solution tapes

Every vault ships with a recorded solution tape. CI loads the vault, replays the tape, and asserts:

- win,
- echo count ≤ max,
- time ≤ loop,
- no validation errors.

A vault without a passing tape is not shippable.

## Difficulty curve

- Vaults 1–3: one idea each, generous timers, no guards or one slow guard.
- Vaults 4–7: one new mechanic + one old mechanic.
- Vaults 8–10: two simultaneous constraints.
- Vaults 11–14: subversions (lights, decoys, sequences).
- Vault 15: all mechanics, 45s, 5 echoes.

## Hints

- After 2 failed loops, offer a nudge: highlight the next required action.
- After 4, offer a short “ghost guide” for the first step.
- Hints never solve the whole vault. They do not affect rank.

## Daily heist

- Curated vault + modifier, same for everyone.
- Modifiers: Blackout (hidden guard cones), Short Fuse (20s loop), No Sprint (dash offline), Solo Loop (one echo). Double Time (faster guards) is implemented but held for later until every vault is replay-verified with it.
- Do not procedurally generate layouts for the daily until the validator is very strong. The current daily picks from authored vaults and safe modifiers; a content test replays every generated pair against an existing solution tape.
- UTC reset; config published a week ahead.

## Level review checklist

- Is the “aha” clear in one sentence?
- Can the player see every required object?
- Is there a solution with par echoes?
- Is there a brute-force solution that feels bad?
- Does the vault teach without text?
- Is the timer generous enough for the solution + 20%?
- Does the solution tape pass?
