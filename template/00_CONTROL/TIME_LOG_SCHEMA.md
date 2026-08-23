# Time Log Schema

Defines `00_CONTROL/time_log.csv`, the structured dev/PM/idle time log generated from Claude Code session transcripts.

## Purpose

A timestamped, auditable record derived directly from session transcripts — not manually estimated after the fact.

## Timing Rule

- Measure the gap between the end of one assistant turn and the start of the next user turn.
- The first 30 minutes of that gap are assumed user think-time — not logged.
- Minutes 30–45 of the gap are logged as a single `idle` row (max 15 minutes per gap).
- Any gap beyond 45 minutes is not counted further (no additional idle accrues).
- Active turns (user message through the assistant's response, including tool calls) are logged as `dev` or `pm` based on content.
- Active-turn duration is the actual raw elapsed time from turn start to the assistant's last activity in that turn — no minimum-duration floor. A floor here double-counts: many short turns in one active session each get rounded up independently, so their sum can wildly exceed the real wall-clock time actually spent.

## Classification Heuristic (dev vs pm)

A turn/segment is `dev` if its dominant activity is: writing or editing code, running builds/tests/typecheck/lint, debugging, running migrations, git operations tied to a code change.

A turn/segment is `pm` if its dominant activity is: discussing approach or tradeoffs, scoping a feature before implementation, reviewing/approving a plan, vendor/account setup guidance, decision-making without code changes, documentation-only changes describing decisions (not implementation).

Tool usage is the dominant signal, stronger than how the human message is phrased — a turn where files were edited or build/test/migrate commands ran is `dev` regardless of prompt wording. Keyword matching on the human text is only a tiebreaker for turns with no mutating tool activity at all.

## Columns

| Column | Description |
|---|---|
| `timestamp_start` | ISO 8601 UTC, start of the logged segment |
| `timestamp_end` | ISO 8601 UTC, end of the logged segment |
| `duration_minutes` | Decimal, rounded to nearest 0.1 |
| `category` | `dev`, `pm`, or `idle` |
| `tag` | Short slug describing the work |
| `session_id` | The Claude Code session UUID (transcript filename) this segment was derived from |
| `commit_sha` | Git commit SHA if this segment's work landed in a specific commit; blank otherwise |
| `notes` | Free text, optional |

## Regeneration

This log is derived data. It can be regenerated or extended from session transcript files; it is not meant to be hand-edited except to add `commit_sha`/`notes` after the fact once commits exist.
