# {{PROJECT_NAME}} Risk Register

Last updated: {{DATE}}

## Risk Posture

Describe the project's risk posture and boundaries here — what it is, what it deliberately is not, and what the MVP/current phase is meant to test.

## Active Risks

**Closure convention:** when a risk is fully closed (not just downgraded or mitigated), strike through the *entire row* — every cell's text (`Risk`, `Likelihood`, `Impact`, `Current Position`, `Mitigation`, `Owner`), not just the `Risk` cell — wrapping each cell's text individually in `~~...~~` (not the pipe structure), and prepend `Current Position` with `**CLOSED YYYY-MM-DD:**` explaining why before wrapping it. Keep the row in the table — do not delete it. Rows are kept in `R##` order regardless of open/closed status; this register is a permanent history, not just an active-risk list. A downgrade/mitigation short of full closure stays un-struck and keeps its normal prose annotation, since the risk category is still live even though the acute instance was fixed. Deleting a row instead of striking it defeats `generate-executive-report.ts`'s session-diff (see BLACKBOX), which detects closures by finding a changed `R##` row between sessions — a row that's gone entirely leaves no trace for it to find.

| ID | Risk | Likelihood | Impact | Current Position | Mitigation | Owner |
|----|----|----|----|----|----|----|
| R1 | | | | | | |

## Current Founder/Product Positions

Record standing decisions/positions here as they get made, so they don't need re-litigating each session.
