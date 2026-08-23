# KEEL

Project scaffold template, distilled from Thalam's file structure and development approach: numbered control directories, a PRD-freeze/as-built-annex pattern, strikethrough-on-close decision/risk tracking, and the BLACKBOX-based session-close automation.

Used by the `new-project` skill (`~/.claude/skills/new-project/SKILL.md`) to scaffold new GitHub projects. Not meant to be used directly — the skill handles filling in placeholders (`{{PROJECT_NAME}}`, `{{DATE}}`, etc.), wiring in BLACKBOX, and the `git init`/`gh repo create` steps.

## What's in `template/`

The full directory skeleton: `00_CONTROL/` through `99_ARCHIVE/`, `.github/workflows/ci.yml`, `.claude/settings.json` (Stop hook), `.Executive_Correspondence/`, `scripts/` (session-close.ts, generate-executive-report.ts, build-time-log.ts — the BLACKBOX pattern wired in), `CLAUDE.md`, `CHANGELOG.md`, `TEMP_FEATURES.md`, `README.md`, `package.json`, `.gitignore`.

See each file's own content for what it's for — most are self-documenting (e.g. `00_CONTROL/FILE_DISCIPLINE.md` explains the folder contract, `DECISION_PATH.md`/`RISK_REGISTER.md` document their own closure convention).

## Related

- `~/Development/BLACKBOX` — the portable append-only report core this template's `scripts/` wires in.
- `~/.claude/skills/close-session/` — the judgment half (what to check at session close), global, works in any project.
- `~/.claude/skills/new-project/` — the skill that actually applies this template to scaffold a new project.
- Thalam (`~/Development/Thalam`) — the real project this pattern was distilled from; still the fullest working reference for how it looks once actually lived-in.
