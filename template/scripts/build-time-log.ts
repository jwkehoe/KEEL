import { readFileSync, existsSync, appendFileSync, writeFileSync } from "node:fs";

// Parses a Claude Code session transcript (~/.claude/projects/<project>/<session>.jsonl)
// into dev/pm/idle time segments per the rule in 00_CONTROL/TIME_LOG_SCHEMA.md:
//   - First 30 min of a gap between turns = assumed think time, not logged.
//   - Minutes 30-45 of a gap = one `idle` row (max 15 min per gap).
//   - Beyond 45 min, nothing further accrues.
//   - Active turns are classified dev/pm by keyword heuristic over the
//     human message text and any tool names used in the following
//     assistant turns, up to the next human turn.
//
// Usage: npx tsx scripts/build-time-log.ts <path-to-session.jsonl> [tag]

const THINK_MINUTES = 30;
const IDLE_CAP_MINUTES = 15;

// Only tools that mutate code/data/infra count as a dev signal. Read-only
// investigation (Read, Grep, Glob, ToolSearch) happens during PM discussion
// too (checking a fact before answering) and is not itself dev signal.
const DEV_TOOLS = new Set(["Edit", "Write", "NotebookEdit"]);
// Bash is dev signal only when it's actually running/building/migrating
// something, not e.g. `git log`/`git status` read-only lookups during
// discussion.
const BASH_DEV_COMMAND = /\b(npm run|npx (tsx|prisma)|prisma migrate|git commit|git push|git add)\b/i;

const DEV_KEYWORDS = /\b(fix|bug|typecheck|lint|build|migrat|debug|wire|implement|refactor)\b/i;
const PM_KEYWORDS = /\b(should we|what do you think|option|tradeoff|decide|decision|scope|approach|recommend|discuss|status|track|link|explain|what is|how do|how can|examine)\b/i;

interface Row {
  timestamp_start: string;
  timestamp_end: string;
  duration_minutes: string;
  category: "dev" | "pm" | "idle";
  tag: string;
  session_id: string;
  commit_sha: string;
  notes: string;
}

function isGenuineUserTurn(obj: any): boolean {
  if (obj.type !== "user" || obj.message?.role !== "user") return false;
  const content = obj.message.content;
  if (typeof content === "string") return true;
  if (Array.isArray(content)) {
    return !content.some((c: any) => c?.type === "tool_result");
  }
  return false;
}

// A tool_result answering AskUserQuestion (or similar interactive-prompt
// tools) can arrive a long real-world time after the tool was invoked -
// the user genuinely paused mid-exchange to decide. That gap is real
// elapsed time and must be subject to the same think-time/idle rule as a
// gap between ordinary turns.
const GAP_ELIGIBLE_TOOL_RESULT_MARKER = "Your questions have been answered";

function isGapEligibleToolResult(obj: any): boolean {
  if (obj.type !== "user" || obj.message?.role !== "user") return false;
  const content = obj.message.content;
  if (!Array.isArray(content)) return false;

  return content.some(
    (c: any) => c?.type === "tool_result" && typeof c.content === "string" && c.content.includes(GAP_ELIGIBLE_TOOL_RESULT_MARKER)
  );
}

function extractText(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((c: any) => c?.type === "text")
      .map((c: any) => c.text)
      .join(" ");
  }
  return "";
}

// System-injected wrapper tags (IDE file-open notices, local-command
// caveats, slash-command echoes, etc.) precede the user's actual words in
// the raw turn text. Strip them first so `notes` reflects real user
// intent rather than the wrapper.
const SYSTEM_WRAPPER_TAG =
  /<(ide_opened_file|ide_selection|local-command-caveat|local-command-stdout|local-command-stderr|command-name|command-message|command-args|system-reminder)[^>]*>[\s\S]*?<\/\1>/gi;

function stripSystemWrappers(text: string): string {
  return text.replace(SYSTEM_WRAPPER_TAG, " ").replace(/\s+/g, " ").trim();
}

function classify(text: string, toolNames: Set<string>, bashCommands: string[]): "dev" | "pm" {
  // Tool usage is the dominant signal: what was actually done in response
  // is a stronger indicator than how the (often terse) human message was
  // phrased. Keyword matching on the human text is only a tiebreaker for
  // turns with no mutating tool activity at all.
  const hasDevTool = [...toolNames].some((t) => DEV_TOOLS.has(t));
  const hasDevBash = bashCommands.some((cmd) => BASH_DEV_COMMAND.test(cmd));

  if (hasDevTool || hasDevBash) return "dev";

  const devScore = text.match(DEV_KEYWORDS) ? 1 : 0;
  const pmScore = text.match(PM_KEYWORDS) ? 1 : 0;

  return devScore > pmScore ? "dev" : "pm";
}

function main() {
  const transcriptPath = process.argv[2];
  const tagArg = process.argv[3] ?? "session";

  if (!transcriptPath) {
    console.error("Usage: npx tsx scripts/build-time-log.ts <path-to-session.jsonl> [tag]");
    process.exit(1);
  }

  const lines = readFileSync(transcriptPath, "utf8").split("\n").filter(Boolean);
  const events = lines.map((line) => JSON.parse(line));

  const sessionId = events.find((e) => e.sessionId)?.sessionId ?? "unknown";

  const turns: { timestamp: string; lastActivity: string; text: string; toolNames: Set<string>; bashCommands: string[] }[] = [];

  let currentTurn: (typeof turns)[number] | null = null;
  for (const event of events) {
    const isAnsweredQuestion = isGapEligibleToolResult(event);
    const gapSinceLastActivity =
      isAnsweredQuestion && currentTurn
        ? (new Date(event.timestamp).getTime() - new Date(currentTurn.lastActivity).getTime()) / 60000
        : 0;

    if (isGenuineUserTurn(event) || (isAnsweredQuestion && gapSinceLastActivity > THINK_MINUTES)) {
      currentTurn = { timestamp: event.timestamp, lastActivity: event.timestamp, text: extractText(event.message.content), toolNames: new Set(), bashCommands: [] };
      turns.push(currentTurn);
    } else if (currentTurn && event.type === "assistant" && event.timestamp && event.message?.content) {
      // Only real assistant activity (text/tool_use) extends this turn's
      // active window - a tool result can legitimately land hours/days
      // later if the session was reopened.
      currentTurn.lastActivity = event.timestamp;

      for (const block of event.message.content) {
        if (block?.type === "tool_use" && block.name) {
          currentTurn.toolNames.add(block.name);
          if (block.name === "Bash" && typeof block.input?.command === "string") {
            currentTurn.bashCommands.push(block.input.command);
          }
        }
      }
    }
  }

  const rows: Row[] = [];

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const intentText = stripSystemWrappers(turn.text);
    const category = classify(intentText, turn.toolNames, turn.bashCommands);
    const segmentEnd = turn.lastActivity;
    // Billed as actual raw elapsed time - no per-turn minimum floor. A
    // floor here double-counts across many short turns in one session.
    const rawMinutes = (new Date(segmentEnd).getTime() - new Date(turn.timestamp).getTime()) / 60000;
    const billedMinutes = rawMinutes;

    const noteSource = intentText.length > 0 ? intentText : "(system/slash-command turn, no user text)";

    rows.push({
      timestamp_start: turn.timestamp,
      timestamp_end: segmentEnd,
      duration_minutes: billedMinutes.toFixed(1),
      category,
      tag: tagArg,
      session_id: sessionId,
      commit_sha: "",
      notes: noteSource.slice(0, 80).replace(/[\n\r,]/g, " ")
    });

    if (i + 1 < turns.length) {
      const gapMs = new Date(turns[i + 1].timestamp).getTime() - new Date(segmentEnd).getTime();
      const gapMinutes = gapMs / 60000;

      if (gapMinutes > THINK_MINUTES) {
        const idleStart = new Date(new Date(segmentEnd).getTime() + THINK_MINUTES * 60000);
        const idleMinutes = Math.min(gapMinutes - THINK_MINUTES, IDLE_CAP_MINUTES);
        const idleEnd = new Date(idleStart.getTime() + idleMinutes * 60000);

        rows.push({
          timestamp_start: idleStart.toISOString(),
          timestamp_end: idleEnd.toISOString(),
          duration_minutes: idleMinutes.toFixed(1),
          category: "idle",
          tag: tagArg,
          session_id: sessionId,
          commit_sha: "",
          notes: `gap of ${gapMinutes.toFixed(1)} min between turns`
        });
      }
    }
  }

  const outputPath = "00_CONTROL/time_log.csv";
  const header = "timestamp_start,timestamp_end,duration_minutes,category,tag,session_id,commit_sha,notes\n";

  if (!existsSync(outputPath)) {
    writeFileSync(outputPath, header);
  }

  const existingContent = readFileSync(outputPath, "utf8");

  if (existingContent.includes(sessionId)) {
    console.error(
      `Session ${sessionId} already has rows in ${outputPath}. Remove them first if you intend to regenerate, to avoid duplicate entries.`
    );
    process.exit(1);
  }

  const csvLines = rows
    .map((r) =>
      [r.timestamp_start, r.timestamp_end, r.duration_minutes, r.category, r.tag, r.session_id, r.commit_sha, `"${r.notes}"`].join(",")
    )
    .join("\n");

  appendFileSync(outputPath, csvLines + "\n");

  const totals = rows.reduce(
    (acc, r) => {
      acc[r.category] += parseFloat(r.duration_minutes);
      return acc;
    },
    { dev: 0, pm: 0, idle: 0 }
  );

  console.log(`Wrote ${rows.length} rows to ${outputPath}`);
  console.log(`Totals — dev: ${(totals.dev / 60).toFixed(2)}h, pm: ${(totals.pm / 60).toFixed(2)}h, idle: ${(totals.idle / 60).toFixed(2)}h`);
}

main();
