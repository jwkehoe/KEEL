import { execSync } from "node:child_process";
import { readFileSync as readFile, existsSync as fileExists } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Session-close checklist, run as a Stop hook (see .claude/settings.json).
// Reads the Stop hook's stdin JSON payload ({ session_id, ... }) to locate
// this session's transcript, then runs six advisory checks - none of them
// auto-act, all of them just report, since a real response needs judgment
// this script can't have:
// (1) runs build-time-log.ts against the transcript if not already logged,
// (2) reports whether CHANGELOG.md has a dated entry for today,
// (3) reports whether TEMP_FEATURES.md items look stale,
// (4) reports git status: uncommitted work becomes a safety-net PR
//     suggestion rather than being pushed automatically,
// (5) reports whether EC_Status (.Executive_Correspondence/) is stale -
//     commits landed since the last report's reportingWindowEnd,
// (6) reports deployment status for origin/main, if this project deploys
//     somewhere with a native GitHub status-check integration (Vercel,
//     Netlify, Railway, etc.) - remove or adapt this check if the project
//     doesn't have one,
// (7) generates/appends this session's report (generate-executive-report.ts).
//
// This is read-only/reporting by design - a real changelog entry or a real
// stakeholder report needs judgment about what mattered this session, not
// a mechanical placeholder.

function readStdin(): string {
  try {
    return readFile(0, "utf8");
  } catch {
    return "";
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function findTranscriptPath(sessionId: string): string | null {
  const cwd = process.cwd();
  const sanitized = cwd.replace(/[^a-zA-Z0-9]/g, "-");
  const candidateDir = join(homedir(), ".claude", "projects", sanitized);
  const candidatePath = join(candidateDir, `${sessionId}.jsonl`);

  return fileExists(candidatePath) ? candidatePath : null;
}

function checkTimeLog(sessionId: string, transcriptPath: string | null) {
  const timeLogPath = "00_CONTROL/time_log.csv";
  const alreadyLogged = fileExists(timeLogPath) && readFile(timeLogPath, "utf8").includes(sessionId);

  if (alreadyLogged) {
    console.log(`[time-log] Session ${sessionId} already logged in ${timeLogPath}.`);
    return;
  }

  if (!transcriptPath) {
    console.log(`[time-log] Could not locate transcript for session ${sessionId}; skipped.`);
    return;
  }

  try {
    execSync(`npx tsx scripts/build-time-log.ts "${transcriptPath}" session-${sessionId.slice(0, 8)}`, {
      stdio: "inherit"
    });
  } catch (error) {
    console.log(`[time-log] build-time-log.ts failed: ${(error as Error).message}`);
  }
}

function checkChangelog() {
  const changelogPath = "CHANGELOG.md";
  if (!fileExists(changelogPath)) {
    console.log("[changelog] CHANGELOG.md not found.");
    return;
  }

  const content = readFile(changelogPath, "utf8");
  const hasToday = content.includes(`## ${todayIso()}`);

  console.log(
    hasToday
      ? `[changelog] Has an entry for today (${todayIso()}).`
      : `[changelog] NO entry for today (${todayIso()}) — review whether this session's work warrants one.`
  );
}

function checkTempFeatures() {
  const path = "TEMP_FEATURES.md";
  if (!fileExists(path)) {
    console.log("[temp-features] TEMP_FEATURES.md not found (none tracked, or file removed).");
    return;
  }

  const content = readFile(path, "utf8");
  const headingCount = (content.match(/^## /gm) ?? []).length;
  console.log(`[temp-features] ${headingCount} temp feature(s) tracked in TEMP_FEATURES.md — review before shipping toward real users.`);
}

function checkEcStatusStaleness() {
  const statusPath = ".Executive_Correspondence/.last-status.json";
  if (!fileExists(statusPath)) {
    console.log("[ec-status] No .Executive_Correspondence/.last-status.json found — EC_Status has never been generated.");
    return;
  }

  let windowEnd: string | undefined;
  try {
    windowEnd = JSON.parse(readFile(statusPath, "utf8")).reportingWindowEnd;
  } catch {
    console.log("[ec-status] Could not parse .last-status.json.");
    return;
  }

  if (!windowEnd) {
    console.log("[ec-status] .last-status.json has no reportingWindowEnd recorded.");
    return;
  }

  const daysSince = Math.floor((Date.now() - new Date(windowEnd).getTime()) / 86400000);
  let commitsSince = "0";
  try {
    commitsSince = execSync(`git log --since="${windowEnd}" --oneline`, { encoding: "utf8" }).trim().split("\n").filter(Boolean).length.toString();
  } catch {
    // git log failure - report what we know without the commit count
  }

  if (parseInt(commitsSince, 10) > 0) {
    console.log(
      `[ec-status] ${commitsSince} commit(s) have landed since the last EC_Status report (${daysSince} day(s) ago, window ended ${windowEnd}). Consider generating a new one.`
    );
  } else {
    console.log(`[ec-status] EC_Status up to date — no commits since the last report (${daysSince} day(s) ago).`);
  }
}

function checkDeploymentStatus() {
  // Reads a native GitHub commit status posted by a deploy host's own
  // GitHub App integration (Vercel, Netlify, Railway, etc.) - a separate
  // mechanism from this repo's own ci.yml (GitHub Actions), which only
  // confirms the code compiles, not that a real deployment succeeded.
  // Requires `gh` CLI authenticated with `repo` scope (no extra token) and
  // assumes this project is on GitHub with such an integration installed -
  // remove this check if neither is true.
  try {
    const sha = execSync("git rev-parse origin/main", { encoding: "utf8" }).trim();
    const statusJson = execSync(`gh api repos/{owner}/{repo}/commits/${sha}/status`, { encoding: "utf8" });
    const data = JSON.parse(statusJson);
    const statuses: { context?: string; state?: string; description?: string; target_url?: string }[] = data.statuses ?? [];

    if (statuses.length === 0) {
      console.log(`[deploy] No deployment status found for origin/main (${sha.slice(0, 7)}).`);
      return;
    }

    for (const s of statuses) {
      console.log(`[deploy] origin/main (${sha.slice(0, 7)}) — ${s.context}: ${s.state} — ${s.description}`);
      if (s.state !== "success" && s.target_url) console.log(`[deploy]   ${s.target_url}`);
    }
  } catch (error) {
    console.log(`[deploy] Could not check deployment status: ${(error as Error).message}`);
  }
}

function firstTranscriptTimestamp(transcriptPath: string): string | null {
  try {
    const firstLine = readFile(transcriptPath, "utf8").split("\n").find(Boolean);
    if (!firstLine) return null;
    const obj = JSON.parse(firstLine);
    return obj.timestamp ?? null;
  } catch {
    return null;
  }
}

function generateExecutiveReport(sessionId: string, transcriptPath: string | null) {
  if (!transcriptPath) {
    console.log("[session-report] Could not locate transcript; skipped.");
    return;
  }

  const firstTimestamp = firstTranscriptTimestamp(transcriptPath);
  if (!firstTimestamp) {
    console.log("[session-report] Could not read transcript's first timestamp; skipped.");
    return;
  }

  try {
    execSync(`npx tsx scripts/generate-executive-report.ts "${sessionId}" "${firstTimestamp}"`, {
      stdio: "inherit"
    });
  } catch (error) {
    console.log(`[session-report] generate-executive-report.ts failed: ${(error as Error).message}`);
  }
}

function checkGitStatus() {
  try {
    const status = execSync("git status --short", { encoding: "utf8" }).trim();
    const ahead = execSync("git rev-list --count origin/main..HEAD 2>/dev/null || echo 0", { encoding: "utf8" }).trim();

    if (status) {
      console.log("[git] Uncommitted changes at session close:");
      console.log(status);
      console.log("[git] Recommend: commit + push directly, OR if unsure, push a branch and open a PR as a safety net rather than leaving this uncommitted.");
    } else {
      console.log("[git] Working tree clean.");
    }

    if (ahead !== "0") {
      console.log(`[git] ${ahead} commit(s) ahead of origin/main — push if not already done.`);
    }
  } catch (error) {
    console.log(`[git] Could not check status: ${(error as Error).message}`);
  }
}

function main() {
  const stdin = readStdin();
  let sessionId = "unknown";

  try {
    const payload = JSON.parse(stdin);
    sessionId = payload.session_id ?? "unknown";
  } catch {
    // No valid JSON on stdin - proceed with best-effort checks that don't
    // need a session id.
  }

  console.log(`\n=== Session Close Checklist (session ${sessionId}) ===\n`);

  const transcriptPath = sessionId !== "unknown" ? findTranscriptPath(sessionId) : null;

  checkTimeLog(sessionId, transcriptPath);
  checkChangelog();
  checkTempFeatures();
  checkGitStatus();
  checkEcStatusStaleness();
  checkDeploymentStatus();
  generateExecutiveReport(sessionId, transcriptPath);

  console.log("\n=== End Session Close Checklist ===\n");
}

main();
