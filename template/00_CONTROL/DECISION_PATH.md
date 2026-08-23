# {{PROJECT_NAME}} Decision Path

Last updated: {{DATE}}

Purpose: convert remaining ambiguity into explicit build decisions. This file should be updated when a decision is made so the PRD, implementation plan, and environment setup do not drift.

## Decision Order

List the open decisions here in the order they should be closed, e.g.:

1. Ownership and production control
2. Domain and deployment identity
3. ...

**Closure convention:** when a numbered decision (`## N. Title`) is resolved, strike through the *entire section* — the `## N.` heading and every line of body content below it (subheadings, paragraphs, bullets, table cells), down to the next `## ` heading — and append the resolution date to the title, e.g. `## 4. ~~MVP Channel Scope~~ (RESOLVED 2026-08-09)`. Wrap each line's text individually in `~~...~~` rather than spanning the strikethrough across blank lines (GFM strikethrough doesn't render across block boundaries); for a table row, wrap each cell's text, not the pipe/dash structure. Do this on the heading line itself, not only in a nested `### Resolved YYYY-MM-DD: ...` subsection — if this project uses `scripts/generate-executive-report.ts`'s session diff (see BLACKBOX), it only tracks `## N.` lines, not `###` subheadings, so a resolution recorded solely in a subsection is invisible to it. Keep the section in place either way; this file is a permanent record, not a pruned list.

## Closed Architecture Decisions

Record foundational, rarely-revisited architecture calls here (route conventions, naming schemes, etc.) as they're made.

## 1. First Decision Title

### Decision Needed

What needs to be decided?

### Options

| Option | Description | Pros | Risks / Costs | Use When |
|----|----|----|----|----|
| | | | | |

### Recommendation

### Decision Criteria

### Required Output
