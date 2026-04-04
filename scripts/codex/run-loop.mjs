import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const queuePath = path.join(repoRoot, "ops", "work-queue.json");
const runsDir = path.join(repoRoot, "ops", "runs");
const latestReportPath = path.join(runsDir, "latest.md");

mkdirSync(runsDir, { recursive: true });

if (!existsSync(queuePath)) {
  console.error(`Missing queue file: ${queuePath}`);
  process.exit(1);
}

const queue = JSON.parse(readFileSync(queuePath, "utf8"));
const timestamp = new Date().toISOString();

const priorities = { P0: 0, P1: 1, P2: 2, P3: 3 };
const doneStatuses = new Set(["completed"]);

function summarizeOutput(output) {
  const lines = output.trim().split("\n").filter(Boolean);
  return lines.slice(-12).join("\n");
}

function runCommand(command) {
  try {
    const output = execSync(command, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    return {
      command,
      ok: true,
      summary: summarizeOutput(output) || "Command completed without notable output."
    };
  } catch (error) {
    const stdout = error.stdout?.toString() ?? "";
    const stderr = error.stderr?.toString() ?? "";
    const combined = [stdout, stderr].filter(Boolean).join("\n");

    return {
      command,
      ok: false,
      summary: summarizeOutput(combined) || `${command} failed without captured output.`
    };
  }
}

function dependenciesSatisfied(item, itemsById) {
  return item.dependencies.every((dependencyId) => {
    const dependency = itemsById.get(dependencyId);
    return dependency && doneStatuses.has(dependency.status);
  });
}

function selectItem(items) {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const inProgress = items.find((item) => item.status === "in_progress");
  if (inProgress) {
    return { item: inProgress, reason: "Continuing existing in-progress item." };
  }

  const ready = items
    .filter((item) => item.status === "ready" && dependenciesSatisfied(item, itemsById))
    .sort((a, b) => {
      const priorityDelta = priorities[a.priority] - priorities[b.priority];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return a.id.localeCompare(b.id);
    });

  if (ready.length === 0) {
    return { item: null, reason: "No ready item with satisfied dependencies." };
  }

  return { item: ready[0], reason: "Highest-priority ready item with satisfied dependencies." };
}

const gateResults = [
  runCommand("npm test"),
  runCommand("npm run typecheck"),
  runCommand("npm run build")
];

const selected = selectItem(queue.items);

if (selected.item && selected.item.status === "ready") {
  selected.item.status = "in_progress";
  selected.item.claimedAt = timestamp;
  queue.updatedAt = timestamp;
  writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
}

const gateSummary = gateResults
  .map((result) => `- ${result.ok ? "PASS" : "FAIL"} \`${result.command}\``)
  .join("\n");

const detailedGates = gateResults
  .map(
    (result) =>
      `### ${result.ok ? "PASS" : "FAIL"}: \`${result.command}\`\n\n\`\`\`\n${result.summary}\n\`\`\``
  )
  .join("\n\n");

const selectedSection = selected.item
  ? [
      `- Selected item: \`${selected.item.id}\``,
      `- Title: ${selected.item.title}`,
      `- Priority: ${selected.item.priority}`,
      `- Area: ${selected.item.area}`,
      `- Status: ${selected.item.status}`,
      `- Reason: ${selected.reason}`,
      `- Exit criteria:`,
      ...selected.item.exitCriteria.map((criterion) => `  - ${criterion}`),
      `- Verification:`,
      ...selected.item.verification.map((check) => `  - ${check}`)
    ].join("\n")
  : `- No item selected.\n- Reason: ${selected.reason}`;

const report = `# Codex Loop Report

- Generated at: ${timestamp}
- Repo: ${path.basename(repoRoot)}

## Gates
${gateSummary}

## Next Item
${selectedSection}

## Gate Details
${detailedGates}
`;

const timestampSafe = timestamp.replaceAll(":", "-");
const reportPath = path.join(runsDir, `${timestampSafe}.md`);
writeFileSync(reportPath, report);
writeFileSync(latestReportPath, report);

console.log(`Wrote ${path.relative(repoRoot, latestReportPath)}`);
console.log(`Wrote ${path.relative(repoRoot, reportPath)}`);
if (selected.item) {
  console.log(`Selected ${selected.item.id}: ${selected.item.title}`);
} else {
  console.log("No ready item was selected.");
}
