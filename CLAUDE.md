# StoneByStone — working notes for Claude

The project is being rebuilt as v2. **`docs/OVERHAUL_PLAN.md` is the spec**; read the relevant
sections before starting any task. §2 (decisions) and §2.2 (technical resolutions) override
anything that contradicts them elsewhere in the plan.

## Every session (full protocol: plan §2.1.1)

1. Read `docs/PROGRESS.md`. Take the first work package that is `todo` (or `in-progress`
   with handoff notes). If the next one is `blocked: check-in`, stop and tell the user.
2. Set the package to `in-progress`, commit, then read its issues (`gh issue view N`) and only
   the plan sections they cite.
3. Work the issues in order. Commit to `master` once lint, typecheck, and tests pass, with
   `Closes #N` in the message. Stay inside the package's scope.
4. Before ending (finished or not), check off the completed acceptance criteria, comment on any
   half-done issue, update `PROGRESS.md` (status, "Next session starts here", log line), and
   push.
5. **CI must be green.** After pushing, check the GitHub Actions run for your commit
   (`gh run list --branch master --limit 3`) and fix it until it passes; a red run skips the
   deploy. If master was already red when you started, fix that first or tell the user.
6. Keep output small: terse test reporters, no full-file or full-log dumps.

- If implementation forces a change to the plan, edit `docs/OVERHAUL_PLAN.md` in the same commit.
- v1 is preserved at git tag `v1-final`. Don't reference v1 code except to understand the
  `.cem.json` format (samples live in `tests/fixtures/v1/` after M0).

## Architecture rules (plan §23)

- `src/domain/` is pure TypeScript: no React, no Dexie, no imports from `data/` or `features/`.
- Features access storage only through the repositories in `src/data/`.
- No component file over ~300 lines.
- Hash routing only. Vite `base` is `/StoneByStone/`. The IndexedDB name is `stonebystone`.
