# Autonomous Delivery Loop

## Purpose
This project already has specs, a monorepo, and working quality gates.

What it needed was an execution layer that lets Codex move through repeated passes with minimal supervision:
- detect issues,
- choose work intentionally,
- implement against explicit exit criteria,
- verify hard,
- leave a persistent trail for the next pass.

The loop is intentionally strict and operational rather than aspirational.

## Working Model

### 1. Detect
Run:

```bash
npm run codex:loop
```

This does three things:
- runs the repo gates (`test`, `typecheck`, `build`),
- inspects the machine-readable queue in `ops/work-queue.json`,
- writes a timestamped report to `ops/runs/` plus `ops/runs/latest.md`.

### 2. Choose
The queue item selection rule is:
- highest priority first,
- only items with satisfied dependencies,
- prefer existing `in_progress` work before claiming a new item.

This prevents drift into random opportunistic patching.

### 3. Implement
For the chosen item:
- read the referenced specs,
- implement the smallest complete slice that satisfies the item,
- add or extend tests for the critical path,
- avoid unrelated refactors.

### 4. Verify
Before closing an item, rerun:

```bash
npm test
npm run typecheck
npm run build
```

If verification fails:
- keep the item `in_progress`,
- capture the failure in `ops/issue-log.md`,
- do not mark the item complete.

### 5. Persist
At the end of a pass:
- update `ops/work-queue.json`,
- append any new risks or blockers to `ops/issue-log.md`,
- rely on the run report in `ops/runs/latest.md` as the handoff artifact for the next pass.

## Files

### `ops/work-queue.json`
Machine-readable backlog and state store for autonomous passes.

### `ops/issue-log.md`
Human-readable ledger for discovered issues, blockers, and follow-up notes.

### `ops/runs/latest.md`
Latest generated triage report.

### `docs/CODEX-BRIEFING.md`
Repo-local Codex briefing with the implementation context and priority order.

## Queue Design
Each work item should include:
- stable `id`
- short `title`
- `status`
- `priority`
- `area`
- `dependencies`
- `specRefs`
- `exitCriteria`
- `verification`

This is enough structure for Codex to make disciplined choices without creating a heavyweight ticket system inside the repo.

## What This Solves
- Issue discovery is tied to hard gates, not memory.
- Planning is tied to a tracked queue, not ad hoc judgment every turn.
- Implementation is constrained by explicit exit criteria.
- Verification is mandatory before completion.
- Every pass leaves artifacts the next pass can trust.

## Current Baseline
At the time this loop was installed, the repo baseline was green for:
- `npm test`
- `npm run typecheck`
- `npm run build`

That means the next autonomous passes should focus on advancing roadmap work, not stabilizing a broken trunk.
