# Issue Log

This file records newly discovered issues, blockers, and follow-up notes that matter across autonomous Codex passes.

## 2026-04-04

### Baseline
- Repo baseline verified green with `npm test`, `npm run typecheck`, and `npm run build`.

### Operational Notes
- Autonomous delivery loop installed.
- `SETUP-001` completed with deterministic board-generation coverage and graph invariants.
- Harbor slot generation had a real topology bug: one coastal intersection was assigned to two harbor pairs, yielding 17 harbor-access intersections instead of 18.
- The harbor selector now derives a non-overlapping pattern from the coastal edge ring instead of relying on brittle hard-coded indices.
- Current next ready item in `ops/work-queue.json` is `SETUP-002`.
- Match UI recovery bug found during the Pixi migration: a local board-render failure could escalate into the full-screen `Die Spielansicht muss neu geladen werden` fallback and stay latched until a browser reload.
- Fix: keep the Pixi host node mounted during renderer failures, surface board errors as an in-place overlay, and reset the client error boundary on match-state changes and manual retry.
- Match route layout also had a real playability regression: the fixed-height viewport shell could collapse forced-action UI and clip the Pixi board, which hid discard controls and made the board appear partially rendered.
- Fix: make the match content scrollable, size the board frame explicitly, clamp discard selections to legal card counts, and strengthen on-hex resource/token rendering so the board remains readable under real match states.
