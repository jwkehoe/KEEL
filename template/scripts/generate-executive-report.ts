import { execSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

// Generates a C-Suite/session-close report: what shipped in plain
// language, PR/commit status, dev/PM/idle hours, and executive decision
// points (closed / newly opened / still unaddressed), sourced from
// 00_CONTROL/DECISION_PATH.md and 00_CONTROL/RISK_REGISTER.md diffed
// against their state at session start.
//
// Usage: npx tsx scripts/generate-executive-report.ts <session_id> <first_transcript_timestamp_iso>
//
// ONE FILE PER SESSION, APPENDED TO EVERY TURN. Wired to Claude Code's
// `Stop` hook, which fires at the end of EVERY assistant turn, not at true
// session end - there's no separate "session actually over" event to bind
// to instead. Writing a brand-new file per fire produces near-duplicate
// files fast, since most turns land no commits. Every turn appends a
// "## Turn @ <timestamp>" section instead, and each section is the FULL
// current state (diffed from the fixed session-start baseline), not an
// incremental delta, so: the file is never more than one turn stale
// (complete record at any failure state), there's no pile-up (one file
// per session, not one per turn), and the full turn-by-turn history is
// preserved in one place. Core mechanism (reportPathForSession,
// appendTurnSection) originates from ~/Development/BLACKBOX - see that
// repo's README for the portable, project-agnostic version and how to
// re-derive this file for a different doc-tracking convention.

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function baselineCommit(beforeIso: string): string | null {
  const sha = sh(`git log --before="${beforeIso}" -1 --format=%H`);
  return sha || null;
}

function fileAtCommit(commitSha: string | null, path: string): string {
  if (!commitSha) return "";
  return sh(`git show ${commitSha}:${path} 2>/dev/null`);
}

function summarizeLine(line: string): string {
  // Reduce a raw "## N. Title" heading or a "| Rxx | risk | ... |" table
  // row to a short, readable label: an id and a one-line description.
  const headingMatch = line.match(/^## (\d+)\.\s*(.+)/);
  if (headingMatch) return `Decision ${headingMatch[1]}: ${headingMatch[2]}`;

  const riskMatch = line.match(/^\|\s*(R\d+)\s*\|\s*([^|]+)\|/);
  if (riskMatch) return `${riskMatch[1]}: ${riskMatch[2].trim()}`;

  return line;
}

function extractDecisionLines(content: string): Set<string> {
  // Each numbered "## N. Title" heading in DECISION_PATH.md, or each
  // "| Rxx |" row in RISK_REGISTER.md, is one trackable decision/risk
  // point. If this project's docs use different heading levels or table
  // conventions, adjust these two regexes to match - the diff logic below
  // only depends on being able to extract a stable, comparable line per
  // trackable item.
  const lines = content
    .split("\n")
    .filter((line) => /^## \d+\./.test(line) || /^\| R\d+ \|/.test(line));

  return new Set(lines.map((l) => l.trim()));
}

function diffDecisionPoints(beforeContent: string, afterContent: string) {
  const before = extractDecisionLines(beforeContent);
  const after = extractDecisionLines(afterContent);

  const closedOrChanged: string[] = [];
  const newlyOpened: string[] = [];
  const unaddressed: string[] = [];

  for (const line of after) {
    if (!before.has(line)) {
      // Present now, wasn't present (verbatim) before - either a brand new
      // decision/risk row, or an existing one whose text changed this
      // session (treated as "closed/changed" since its content moved).
      const idMatch = line.match(/R\d+|^## \d+/);
      const existedBeforeWithSameId =
        idMatch && [...before].some((b) => b.includes(idMatch[0]));
      (existedBeforeWithSameId ? closedOrChanged : newlyOpened).push(line);
    }
  }

  for (const line of before) {
    if (after.has(line)) {
      unaddressed.push(line);
    }
  }

  return { closedOrChanged, newlyOpened, unaddressed };
}

function reportPathForSession(dateStr: string, sessionId: string): string {
  const dir = "00_CONTROL/reports";
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  // Full session_id, not a prefix slice - a truncated prefix isn't
  // collision-safe (two session IDs sharing the same first few characters
  // would silently merge their reports into one file).
  return `${dir}/session-report-${dateStr}-${sessionId}.md`;
}

function countTurnSections(path: string): number {
  if (!existsSync(path)) return 0;
  const content = readFileSync(path, "utf8");
  return (content.match(/^## Turn @ /gm) ?? []).length;
}

function timeLogTotalsForSession(sessionTag: string): { dev: number; pm: number; idle: number } {
  const path = "00_CONTROL/time_log.csv";
  if (!existsSync(path)) return { dev: 0, pm: 0, idle: 0 };

  const lines = readFileSync(path, "utf8").split("\n").slice(1).filter(Boolean);
  const totals = { dev: 0, pm: 0, idle: 0 };

  for (const line of lines) {
    const cols = line.split(",");
    const [, , durationStr, category, , sessionIdCol] = cols;
    if (!sessionIdCol?.includes(sessionTag) && !line.includes(sessionTag)) continue;

    const minutes = parseFloat(durationStr);
    if (category === "dev") totals.dev += minutes;
    else if (category === "pm") totals.pm += minutes;
    else if (category === "idle") totals.idle += minutes;
  }

  return totals;
}

function commitsSince(beforeCommit: string | null): string[] {
  const range = beforeCommit ? `${beforeCommit}..HEAD` : "HEAD";
  const log = sh(`git log ${range} --pretty=format:"%h|%s"`);
  return log ? log.split("\n") : [];
}

function main() {
  const sessionId = process.argv[2];
  const firstTimestamp = process.argv[3];

  if (!sessionId || !firstTimestamp) {
    console.error("Usage: npx tsx scripts/generate-executive-report.ts <session_id> <first_transcript_timestamp_iso>");
    process.exit(1);
  }

  const beforeCommit = baselineCommit(firstTimestamp);
  const beforeDecisionPath = fileAtCommit(beforeCommit, "00_CONTROL/DECISION_PATH.md");
  const beforeRiskRegister = fileAtCommit(beforeCommit, "00_CONTROL/RISK_REGISTER.md");
  const afterDecisionPath = existsSync("00_CONTROL/DECISION_PATH.md") ? readFileSync("00_CONTROL/DECISION_PATH.md", "utf8") : "";
  const afterRiskRegister = existsSync("00_CONTROL/RISK_REGISTER.md") ? readFileSync("00_CONTROL/RISK_REGISTER.md", "utf8") : "";

  const decisionDiff = diffDecisionPoints(beforeDecisionPath, afterDecisionPath);
  const riskDiff = diffDecisionPoints(beforeRiskRegister, afterRiskRegister);

  const commits = commitsSince(beforeCommit);
  const gitStatus = sh("git status --short");
  const aheadOfOrigin = sh("git rev-list --count origin/main..HEAD 2>/dev/null") || "0";

  const totals = timeLogTotalsForSession(sessionId.slice(0, 8));
  const dateStr = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  const reportPath = reportPathForSession(dateStr, sessionId);

  const body: string[] = [];
  body.push("### What Shipped");
  body.push("");
  if (commits.length === 0) {
    body.push("No commits landed this session.");
  } else {
    for (const line of commits) {
      const [sha, subject] = line.split("|");
      body.push(`- **${subject}** (\`${sha}\`)`);
    }
  }
  body.push("");
  body.push("### PR / Merge Status");
  body.push("");
  if (gitStatus) {
    body.push("Uncommitted work as of this turn:");
    body.push("```");
    body.push(gitStatus);
    body.push("```");
  } else if (aheadOfOrigin !== "0") {
    body.push(`${aheadOfOrigin} commit(s) were ahead of \`origin/main\` — push status should be confirmed.`);
  } else {
    body.push("All work committed and pushed.");
  }
  body.push("");
  body.push("### Dev / PM / Idle Time (session total as of this turn)");
  body.push("");
  body.push(`- Dev: ${(totals.dev / 60).toFixed(2)}h`);
  body.push(`- PM: ${(totals.pm / 60).toFixed(2)}h`);
  body.push(`- Idle: ${(totals.idle / 60).toFixed(2)}h`);
  body.push("");
  body.push("### Executive Decision Points");
  body.push("");
  body.push("Sourced from `00_CONTROL/DECISION_PATH.md` and `00_CONTROL/RISK_REGISTER.md`, compared against their state at session start.");
  body.push("");
  body.push("#### Closed / Changed This Session");
  body.push("");
  const closed = [...decisionDiff.closedOrChanged, ...riskDiff.closedOrChanged];
  body.push(closed.length ? closed.map((l) => `- ${summarizeLine(l)}`).join("\n") : "None.");
  body.push("");
  body.push("#### Newly Opened This Session");
  body.push("");
  const opened = [...decisionDiff.newlyOpened, ...riskDiff.newlyOpened];
  body.push(opened.length ? opened.map((l) => `- ${summarizeLine(l)}`).join("\n") : "None.");
  body.push("");
  body.push("#### Still Unaddressed");
  body.push("");
  const unaddressed = [...decisionDiff.unaddressed, ...riskDiff.unaddressed];
  body.push(unaddressed.length ? unaddressed.map((l) => `- ${summarizeLine(l)}`).join("\n") : "None tracked.");
  body.push("");

  if (!existsSync(reportPath)) {
    writeFileSync(reportPath, `# Session Report — ${dateStr}\n\nSession: \`${sessionId}\`\n`);
  }
  const existedBefore = countTurnSections(reportPath);
  appendFileSync(reportPath, `\n---\n\n## Turn @ ${nowIso}\n\n${body.join("\n")}\n`);
  console.log(`[session-report] Appended turn section to ${reportPath} (${existedBefore} -> ${existedBefore + 1} sections)`);
}

main();
