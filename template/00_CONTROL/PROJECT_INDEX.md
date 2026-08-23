# {{PROJECT_NAME}} Project Index

Last organized: {{DATE}}

## Current Directory Contract

- `00_CONTROL/` contains local operating rules and project navigation.
- `01_PRODUCT_REQUIREMENTS/` contains product-scope and MVP decision documents.
- `02_IMPLEMENTATION_SPECS/` contains schema, route/table mapping, and implementation checklist controls.
- `03_DESIGN_ASSETS/` contains design source files and exported assets.
- `04_USE_CASES_AND_SEQUENCES/` contains domain examples and reusable reference content.
- `05_TRANSCRIPTS/` contains meeting or prototype discussion transcripts.
- `src/` contains the application source.
- `docs/` contains software-project alignment notes.
- `tests/` contains automated tests.
- `99_ARCHIVE/` contains raw downloads, duplicates, and predecessor-name context that should not drive active implementation.

## Build-Control Reading Order

Fill this in as real documents accumulate. Each numbered document should say, in one line, what it controls — so a new reader (human or agent) knows what's binding without opening every file.

1. `01_PRODUCT_REQUIREMENTS/` — canonical PRD, when it exists.
2. `00_CONTROL/DECISION_PATH.md` — active decision path for unresolved build, launch, scope, and demo choices.
3. `00_CONTROL/RISK_REGISTER.md` — active risk register.

## Reference-Only Material

List anything here that explains intent but should not override the PRD/specs/decision path.

## Evidence And Archive Notes

- `05_TRANSCRIPTS/` is raw discussion evidence. Use it to understand intent, not as final build law.
- `99_ARCHIVE/` is preserved original material, retained to avoid silent deletion, not to be treated as controlling.

## Current Locked Stack

Fill in as the stack is decided. Keep this section current — it's the fastest way for a new reader (or a new agent session) to know what's actually being built with.

## Software Entry Points

- `CLAUDE.md` documents agent-facing project conventions.
- `CHANGELOG.md` is the running flight recorder for notable cross-session changes and the reasoning behind them.
- `00_CONTROL/TIME_LOG_SCHEMA.md` and `00_CONTROL/time_log.csv` track dev/PM/idle time derived from session transcripts.
- `00_CONTROL/reports/` holds append-only per-session close-out reports (see `scripts/session-close.ts` / `scripts/generate-executive-report.ts`, built on the BLACKBOX pattern — see `~/Development/BLACKBOX`).
- `.Executive_Correspondence/` (local, gitignored) holds founder/stakeholder-facing status reports, built from that directory's `TEMPLATE.md`.
- `00_CONTROL/FUNCTIONAL_MATRIX.md` tracks which parts of the product are real vs. hardoded/placeholder, once there's a product to track.
- `00_CONTROL/RISK_REGISTER.md` tracks active product, compliance, security, operations, and architecture risks.
- `package.json` (or equivalent) defines the local scripts and runtime dependencies.
