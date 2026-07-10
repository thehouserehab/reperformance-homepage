import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const allowDirty = args.has("--allow-dirty");
const allowNonMain = args.has("--allow-non-main");
const allowAhead = args.has("--allow-ahead");
const allowBehind = args.has("--allow-behind");
const allowMissingUpstream = args.has("--allow-missing-upstream");
const expectedBranch = valueArg("branch") || process.env.RP_RELEASE_BRANCH || "main";

const results = [];

function valueArg(name) {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : "";
}

function addResult(area, name, ok, detail = "") {
  results.push({ area, name, ok: Boolean(ok), detail });
}

function runGit(argsToRun) {
  const result = spawnSync("git", argsToRun, {
    encoding: "utf8",
    shell: false,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
  };
}

function countStatusLines(statusText) {
  return String(statusText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function parseAheadBehind(value) {
  const [aheadRaw, behindRaw] = String(value || "").split(/\s+/);
  return {
    ahead: Number.parseInt(aheadRaw || "0", 10),
    behind: Number.parseInt(behindRaw || "0", 10),
  };
}

function printResults() {
  const byArea = new Map();
  for (const result of results) {
    if (!byArea.has(result.area)) byArea.set(result.area, []);
    byArea.get(result.area).push(result);
  }

  console.log("RePERFORMANCE release state check");
  console.log(`expectedBranch=${expectedBranch}`);

  for (const [area, areaResults] of byArea.entries()) {
    console.log(`\n[${area}]`);
    for (const result of areaResults) {
      console.log(`${result.ok ? "OK" : "FAIL"} ${result.name}${result.detail ? ` (${result.detail})` : ""}`);
    }
  }

  const failed = results.filter((result) => !result.ok);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

const inWorkTree = runGit(["rev-parse", "--is-inside-work-tree"]);
addResult("git", "repository is a git worktree", inWorkTree.ok && inWorkTree.stdout === "true", inWorkTree.stderr || inWorkTree.stdout || "missing");

if (inWorkTree.ok && inWorkTree.stdout === "true") {
  const branch = runGit(["branch", "--show-current"]);
  addResult(
    "git",
    `current branch is ${expectedBranch}`,
    allowNonMain || branch.stdout === expectedBranch,
    branch.stdout || "detached-or-missing",
  );

  const head = runGit(["rev-parse", "HEAD"]);
  addResult("git", "HEAD commit is available", head.ok && Boolean(head.stdout), head.stdout || head.stderr || "missing");

  const status = runGit(["status", "--porcelain"]);
  const dirtyCount = countStatusLines(status.stdout);
  addResult(
    "git",
    "working tree has no uncommitted changes",
    allowDirty || dirtyCount === 0,
    dirtyCount ? `${dirtyCount} changed paths` : "clean",
  );

  const upstream = runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
  addResult(
    "git",
    "upstream branch is configured",
    allowMissingUpstream || upstream.ok && Boolean(upstream.stdout),
    upstream.stdout || upstream.stderr || "missing",
  );

  if (upstream.ok && upstream.stdout) {
    const counts = runGit(["rev-list", "--left-right", "--count", "HEAD...@{upstream}"]);
    const { ahead, behind } = parseAheadBehind(counts.stdout);
    addResult(
      "git",
      "local HEAD is not ahead of upstream",
      allowAhead || ahead === 0,
      `ahead=${Number.isFinite(ahead) ? ahead : "?"}`,
    );
    addResult(
      "git",
      "local HEAD is not behind upstream",
      allowBehind || behind === 0,
      `behind=${Number.isFinite(behind) ? behind : "?"}`,
    );
  }
}

printResults();
