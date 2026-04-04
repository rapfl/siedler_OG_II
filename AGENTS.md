# Codex Operating Rules

## Purpose
This repo is set up for repeated Codex delivery loops, not one-off patches.

The objective in every autonomous pass is:
1. detect current breakage or risk,
2. select the highest-value ready item,
3. implement with tests,
4. verify the repo is cleaner than before,
5. persist the outcome for the next pass.

## Canonical Inputs
Read these first before major implementation work:
1. `docs/START-HERE.md`
2. `docs/CODEX-BRIEFING.md`
3. `docs/CODEX-READINESS-REVIEW.md`
4. `docs/05-delivery/mvp-roadmap.md`
5. `docs/05-delivery/backlog-structure.md`
6. `docs/05-delivery/qa-test-strategy.md`
7. `ops/work-queue.json`
8. `ops/issue-log.md`

## Autonomous Loop
Run `npm run codex:loop` at the start of a pass.

That loop must:
- run baseline gates,
- inspect the tracked work queue,
- identify the next ready item,
- write a timestamped run report to `ops/runs/`,
- update `ops/work-queue.json` when an item is claimed.

After that:
- implement the selected item,
- add or update tests for critical paths,
- rerun relevant gates,
- update `ops/work-queue.json`,
- append a concise note to `ops/issue-log.md` if a new issue or risk was discovered.

## Queue Rules
- Do not invent priorities ad hoc. Use `ops/work-queue.json`.
- Prefer the highest-priority item whose dependencies are complete.
- If a new blocker is found, add it as a new queue item and link the dependency.
- Do not mark an item complete unless its exit criteria and relevant verification steps are satisfied.

## Verification Rules
- Minimum final gates for meaningful code changes: `npm test`, `npm run typecheck`, `npm run build`.
- If a change targets only one workspace and full build is unnecessarily expensive, run the narrow gate first, then the repo-wide gates before finishing.
- Do not leave the queue in a misleading state if verification failed.

## Delivery Bias
- Favor progress that unlocks later phases over cosmetic work.
- Prioritize state machine correctness, projection correctness, reconnect safety, and deterministic rules over UI polish.
- If specs conflict, follow the precedence documented in `docs/START-HERE.md`.
