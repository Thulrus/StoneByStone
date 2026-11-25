# StoneByStone — working notes for Claude

The project is being rebuilt as v2. **`docs/OVERHAUL_PLAN.md` is the spec**; read the relevant
sections before starting any task. §2 (decisions) and §2.2 (technical resolutions) override
anything that contradicts them elsewhere in the plan.

## Workflow

- Work is tracked as GitHub milestones `M0`–`M8`, with one issue per task. Pick the lowest open
  milestone and work its issues in order. Reference the issue in commits (`Closes #N`).
- Work autonomously: commit to `master` once lint, typecheck and tests pass. Stop and check in
  with the user at the end of each milestone and before each field trial (after M3 and M4).
- If implementation forces a change to the plan, edit `docs/OVERHAUL_PLAN.md` in the same commit.
- v1 is preserved at git tag `v1-final`. Don't reference v1 code except to understand the
  `.cem.json` format (samples live in `tests/fixtures/v1/` after M0).

## Architecture rules (plan §23)

- `src/domain/` is pure TypeScript: no React, no Dexie, no imports from `data/` or `features/`.
- Features access storage only through the repositories in `src/data/`.
- No component file over ~300 lines.
- Hash routing only. Vite `base` is `/StoneByStone/`. The IndexedDB name is `stonebystone`.
