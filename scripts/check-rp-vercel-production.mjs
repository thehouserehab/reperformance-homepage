import { spawnSync } from "node:child_process";
import { analyzeRpFirewallConfig } from "./lib/rpVercelFirewallPolicy.mjs";

const DEFAULT_TEAM_ID = "team_EfbUpj6INJBMbI08rWAvGdof";
const DEFAULT_PROJECTS = [
  {
    id: "prj_W2sXR8dobiMSH9QGksPYnwbhX03Z",
    name: "reperformance-homepage",
    label: "reperformance-homepage.vercel.app",
  },
  {
    id: "prj_VOlVshBafX9Njmw5ZzgVDc9b2syC",
    name: "project-7r7l8",
    label: "reperformance.the-house-exercise.com",
  },
];
const API_BASE = "https://api.vercel.com";

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--") && !arg.includes("=")));
const namedArgs = new Map(
  args
    .filter((arg) => arg.startsWith("--") && arg.includes("="))
    .map((arg) => {
      const [key, ...valueParts] = arg.slice(2).split("=");
      return [key, valueParts.join("=")];
    }),
);

const token = process.env.VERCEL_TOKEN || process.env.RP_VERCEL_TOKEN || "";
const teamId = namedArgs.get("team-id") || process.env.RP_VERCEL_TEAM_ID || DEFAULT_TEAM_ID;
const allowMissingToken = flags.has("--allow-missing-token");
const requireCommitMatch = flags.has("--require-commit-match");
const expectedCommit = namedArgs.get("expected-commit") || getGitHead();

const requiredEnvGroups = [
  {
    name: "production database url",
    anyOf: ["DATABASE_URL", "POSTGRES_URL", "RP_DATABASE_URL"],
  },
  {
    name: "database-only data source mode flag",
    anyOf: ["RP_DATA_SOURCE"],
  },
  {
    name: "runtime schema sync disable flag",
    anyOf: ["RP_DISABLE_RUNTIME_SCHEMA_SYNC", "RP_RUNTIME_SCHEMA_SYNC"],
  },
  {
    name: "database pool max",
    anyOf: ["RP_DATABASE_POOL_MAX"],
  },
  {
    name: "admin session signing secret",
    anyOf: ["RP_ADMIN_SESSION_SECRET", "RP_API_SECRET"],
  },
  {
    name: "password hash secret",
    anyOf: ["RP_PASSWORD_HASH_SECRET"],
  },
  {
    name: "identity verification secret",
    anyOf: ["RP_IDENTITY_VERIFICATION_SECRET", "RP_ADMIN_SESSION_SECRET", "RP_API_SECRET"],
  },
  {
    name: "account recovery secret",
    anyOf: ["RP_ACCOUNT_RECOVERY_SECRET", "RP_ADMIN_SESSION_SECRET", "RP_API_SECRET"],
  },
  {
    name: "phone verification delivery webhook",
    anyOf: ["RP_SMS_WEBHOOK_URL", "SMS_WEBHOOK_URL"],
  },
  {
    name: "canonical site origin",
    anyOf: ["NEXT_PUBLIC_SITE_URL", "RP_SITE_URL"],
  },
  {
    name: "shared rate-limit fail-closed flag",
    anyOf: ["RP_RATE_LIMIT_FAIL_CLOSED"],
  },
  {
    name: "maintenance cron secret",
    anyOf: ["CRON_SECRET", "RP_MAINTENANCE_CRON_SECRET"],
  },
];

const results = [];

function addResult(area, name, ok, detail = "") {
  results.push({ area, name, ok: Boolean(ok), detail });
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildProjectTargets() {
  const configuredIds = splitCsv(
    namedArgs.get("project-ids")
      || namedArgs.get("project-id")
      || process.env.RP_VERCEL_PROJECT_IDS
      || process.env.RP_VERCEL_PROJECT_ID,
  );

  if (!configuredIds.length) return DEFAULT_PROJECTS;

  const configuredName = namedArgs.get("project-name") || process.env.RP_VERCEL_PROJECT_NAME || "";
  return configuredIds.map((id, index) => {
    const known = DEFAULT_PROJECTS.find((project) => project.id === id);
    return {
      id,
      name: known?.name || (configuredIds.length === 1 ? configuredName : ""),
      label: known?.label || `project ${index + 1}`,
    };
  });
}

const projectTargets = buildProjectTargets();

function getGitHead() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    shell: false,
  });

  return result.status === 0 ? result.stdout.trim() : "";
}

function buildUrl(path, params = {}) {
  const url = new URL(path, API_BASE);
  const allParams = { teamId, ...params };
  Object.entries(allParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  return url;
}

async function requestJson(path, params = {}) {
  const response = await fetch(buildUrl(path, params), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = { raw: text.slice(0, 500) };
  }

  if (!response.ok) {
    const error = new Error(data?.error?.message || data?.message || `${response.status} ${response.statusText}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function envTargetsProduction(env) {
  const target = env?.target;
  if (Array.isArray(target)) return target.includes("production");
  if (typeof target === "string") return target === "production";
  if (Array.isArray(env?.targets)) return env.targets.includes("production");
  return true;
}

function envKeys(envResponse) {
  const envs = envResponse?.envs || envResponse?.env || envResponse?.environmentVariables || [];
  return new Set(
    envs
      .filter(envTargetsProduction)
      .map((env) => env?.key || env?.name)
      .filter(Boolean),
  );
}

async function checkProject(projectTarget) {
  const project = await requestJson(`/v9/projects/${projectTarget.id}`);
  const prefix = projectTarget.label;
  addResult("vercel", `${prefix} project exists`, project?.id === projectTarget.id, `${project?.name || "unknown"} (${project?.framework || "unknown"})`);
  if (projectTarget.name) {
    addResult("vercel", `${prefix} project name matches`, project?.name === projectTarget.name, project?.name || "missing");
  } else {
    addResult("vercel", `${prefix} project name is recorded`, Boolean(project?.name), project?.name || "missing");
  }
  addResult("vercel", `${prefix} Next.js framework configured`, project?.framework === "nextjs", project?.framework || "missing");
}

async function checkDeployment(projectTarget) {
  const deployments = await requestJson("/v13/deployments", {
    projectId: projectTarget.id,
    target: "production",
    limit: "1",
  });
  const latest = deployments?.deployments?.[0];
  const sha = latest?.meta?.githubCommitSha || "";
  const prefix = projectTarget.label;

  addResult("deployment", `${prefix} latest production deployment exists`, Boolean(latest?.id), latest?.id || "missing");
  addResult("deployment", `${prefix} latest production deployment is READY`, latest?.state === "READY" || latest?.readyState === "READY", latest?.state || latest?.readyState || "missing");
  addResult("deployment", `${prefix} latest deployment is from main`, latest?.meta?.githubCommitRef === "main", latest?.meta?.githubCommitRef || "missing");

  if (requireCommitMatch) {
    addResult("deployment", `${prefix} latest deployment commit matches expected`, sha === expectedCommit, `latest=${sha || "missing"} expected=${expectedCommit || "missing"}`);
  } else {
    addResult("deployment", `${prefix} latest deployment commit recorded`, Boolean(sha), sha || "missing");
  }
}

async function checkEnvironment(projectTarget) {
  const envResponse = await requestJson(`/v9/projects/${projectTarget.id}/env`);
  const keys = envKeys(envResponse);
  const prefix = projectTarget.label;

  for (const group of requiredEnvGroups) {
    const present = group.anyOf.filter((key) => keys.has(key));
    addResult("env", `${prefix} production env has ${group.name}`, present.length > 0, present.length ? present.join(", ") : `missing one of ${group.anyOf.join(", ")}`);
  }
}

async function checkFirewall(projectTarget) {
  try {
    const config = await requestJson("/v1/security/firewall/config/active", { projectId: projectTarget.id });
    const analysis = analyzeRpFirewallConfig(config);
    const prefix = projectTarget.label;

    addResult("firewall", `${prefix} firewall config is readable`, true, "active config returned");
    addResult(
      "firewall",
      `${prefix} firewall is enabled`,
      analysis.firewallEnabled,
      `activeRules=${analysis.activeRuleCount} actions=${analysis.actions.join(",") || "none"}`,
    );
    addResult(
      "firewall",
      `${prefix} protected RP routes have active mitigation`,
      analysis.missingProtectedPaths.length === 0,
      analysis.missingProtectedPaths.length
        ? `missing=${analysis.missingProtectedPaths.join(",")}`
        : `covered=${analysis.protectedPaths.length}`,
    );
    addResult(
      "firewall",
      `${prefix} public abuse-sensitive routes are edge rate limited`,
      analysis.missingRateLimitedPaths.length === 0,
      analysis.missingRateLimitedPaths.length
        ? `missing=${analysis.missingRateLimitedPaths.join(",")}`
        : `covered=${analysis.rateLimitedPaths.length}`,
    );
    addResult(
      "firewall",
      `${prefix} Bot Protection is active`,
      analysis.botProtectionActive,
      analysis.botProtectionActive ? "challenge or deny" : "missing or inactive",
    );
  } catch (error) {
    addResult("firewall", `${projectTarget.label} firewall config is readable`, false, `${error.status || "error"} ${error.message}`);
  }
}

function printResults() {
  const byArea = new Map();
  for (const result of results) {
    if (!byArea.has(result.area)) byArea.set(result.area, []);
    byArea.get(result.area).push(result);
  }

  console.log("RePERFORMANCE Vercel production check");
  console.log(`teamId=${teamId}`);
  console.log(`projects=${projectTargets.map((project) => `${project.label}:${project.id}`).join(", ")}`);

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

async function main() {
  if (!token) {
    console.log("RePERFORMANCE Vercel production check");
    console.log("No VERCEL_TOKEN or RP_VERCEL_TOKEN is configured.");
    console.log("Set one of those variables to verify production project, deployment, env, and firewall state.");
    console.log("Use --allow-missing-token only for local script wiring checks.");
    process.exitCode = allowMissingToken ? 0 : 1;
    return;
  }

  for (const projectTarget of projectTargets) {
    await checkProject(projectTarget);
    await checkDeployment(projectTarget);
    await checkEnvironment(projectTarget);
    await checkFirewall(projectTarget);
  }
  printResults();
}

main().catch((error) => {
  console.error(`Vercel production check failed: ${error?.message || error}`);
  process.exitCode = 1;
});
