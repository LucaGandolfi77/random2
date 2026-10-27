# Tools

Working tools:

- `validate-vaults.ts` — schema-check every vault, then replay every solution tape headlessly and assert a win.
- `record-vault-01-solution.ts` — records the canonical vault-01 solution tape.
- `record-vault-02-solution.ts` — records the guard-decoy solution tape.
- `record-vault-03-solution.ts` — records the two-plate solution tape.
- `record-vault-04-solution.ts` — records the whistle-decoy solution tape.
- `record-vault-05-solution.ts` — records the camera/lever solution tape.
- `record-vault-06-solution.ts` — records the dash/laser solution tape.
- `record-vault-07-solution.ts` — records the one-way gate solution tape.
- `record-vault-08-solution.ts` — records the gem-carry solution tape.
- `record-vault-09-solution.ts` — records the two-guard bait solution tape.
- `record-vault-10-solution.ts` — records the vault-door finale tape.
- `record-vault-11-solution.ts` — records the blackout-lever tape.
- `record-vault-12-solution.ts` — records the relay-lever tape.
- `record-vault-13-solution.ts` — records the safe-room/vent/gem tape.
- `record-vault-14-solution.ts` — records the timed-beam tape.
- `record-vault-15-solution.ts` — records the full-finale tape.

Planned tools:

- `record-solution.ts` — general dev helper to export a run tape from the browser.
- `pack-atlas.ts` — wrapper around the atlas packer.
- `gen-daily.ts` — publish a daily config to KV/D1.

```bash
pnpm validate:vaults
pnpm exec tsx tools/record-vault-01-solution.ts
pnpm exec tsx tools/record-vault-02-solution.ts
pnpm exec tsx tools/record-vault-03-solution.ts
pnpm exec tsx tools/record-vault-04-solution.ts
pnpm exec tsx tools/record-vault-05-solution.ts
pnpm exec tsx tools/record-vault-06-solution.ts
pnpm exec tsx tools/record-vault-07-solution.ts
pnpm exec tsx tools/record-vault-08-solution.ts
pnpm exec tsx tools/record-vault-09-solution.ts
pnpm exec tsx tools/record-vault-10-solution.ts
pnpm exec tsx tools/record-vault-11-solution.ts
pnpm exec tsx tools/record-vault-12-solution.ts
pnpm exec tsx tools/record-vault-13-solution.ts
pnpm exec tsx tools/record-vault-14-solution.ts
pnpm exec tsx tools/record-vault-15-solution.ts
```
