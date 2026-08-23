<!--
EC_Status template — Executive Correspondence status report.

How to generate a new report:
1. Read .Executive_Correspondence/.last-status.json for reportingWindowEnd —
   that's this report's window START. Window END is now.
2. Gather real evidence for the window: `git log --since=<window start>`,
   00_CONTROL/FUNCTIONAL_MATRIX.md, 00_CONTROL/reports/ (BLACKBOX-generated
   session reports), 00_CONTROL/RISK_REGISTER.md, and direct code checks for
   anything claimed as done/blocked. Do not narrate from memory of the
   conversation.
3. Fill in every section below. Delete this comment block in the final file.
4. Save as .Executive_Correspondence/EC_Status_<YYYY-MM-DD>.md
   (append -A, -B... if more than one report is generated the same day).
5. Update .last-status.json: lastReportFile, lastReportGeneratedAt,
   reportingWindowStart (= previous reportingWindowEnd),
   reportingWindowEnd (= now).

Tone: founder/stakeholder readable. Plain language over engineering jargon —
name things by what a non-technical reader recognizes, not internal
implementation terms. Every claim should be checked against real evidence,
not assumed from earlier conversation.

Tables: use properly defined Markdown tables — every row (header,
separator, and data) padded consistently with single spaces around each
cell, e.g. `| Col A | Col B |` / `| --- | --- |`, not a compact/unpadded
separator row (`|---|---|`) under a padded header.
-->

# {{PROJECT_NAME}} — Status for [FILL: audience/purpose]
**Date:** [YYYY-MM-DD]
**Reporting window:** [window start] to [window end] (event horizon: prior EC_Status flag, see `.Executive_Correspondence/.last-status.json`)

---

## Bottom Line Up Front

**[One pithy sentence — the whole report compressed to a single punchy line a reader gets even if they read nothing else.]**

1. [State the real state in plain language, for the specific goal this report exists to inform. Lead with what's actually working.]
2. [Name the single biggest gap plainly — don't bury it.]
3. [Additional points as needed — each its own numbered line, not folded into one paragraph.]

**Critical Path to [stated goal]:**

[A numbered, dependency-ordered list — only numbered because it IS a real sequence. Each item: one concrete action, who owns it, and why it's a blocker. Lives in the BLUF, not at the bottom, so the next-actions are the last thing a reader sees, not something they only reach if they read the whole report.]

1. [Action] — [owner] — [why it blocks the goal]

---

## Accomplished During the Reporting Window

[2-4 "above the fold" headline items — the things that actually matter for the stated goal, each with a 🔑 emoji and a bolded plain-language headline. Not every commit; only what matters. Each headline gets 2-4 sentences of concrete, verifiable detail.]

### 🔑 [Headline 1]
[Detail.]

---

### Everything else that shipped

[Grouped by theme, not chronology. Bullet points, plain language, one line each where possible.]

**Net result:** [one sentence tying the window's work back to the stated goal.]

---

## Current Working Feature Matrix

[Pull the current real table from `00_CONTROL/FUNCTIONAL_MATRIX.md` rather than re-deriving it — copy it faithfully, don't summarize away real/fake distinctions.]

| Screen/Area | Real? | Primary action works? | Notes |
|---|---|---|---|

**What's honestly still fake or missing:**
- [bullet — be specific and honest; this section exists to prevent the BLUF from overselling readiness]

---

## Open Issues

[Pull real current data via `gh issue list --state open` (or the project's equivalent issue tracker), don't narrate from memory - this section goes stale the fastest of anything in the report. Group by priority label if the project uses one; note if a meaningful number carry no priority at all, since that's itself a gap. One line per issue - reference list, not prose.]

**P0**
- #[N] — [title]
