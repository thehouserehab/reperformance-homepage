import { spawnSync } from "node:child_process";

const DEFAULT_TEAM_ID = "team_EfbUpj6INJBMbI08rWAvGdof";
const DEFAULT_PROJECT_ID = "prj_W2sXR8dobiMSH9QGksPYnwbhX03Z";
const DEFAULT_PROJECT_NAME = "reperformance-homepage";
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
const projectId = namedArgs.get("project-id") || process.env.RP_VERCEL_PROJECT_ID || DEFAULT_PROJECT_ID;
const allowMissingToken = flags.has("--allow-missing-token");
const requireCommitMatch = flags.has("--require-commit-match");
const expectedCommit = namedArgs.get("expected-commit") || getGitHead();

const requiredEnvGroups = [
  {
    name: "production database url",
    anyOf: ["DATABASE_URL", "POSTGRES_URL", "RP_DATABASE_URL"],
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
];

const recommendedFirewallTerms = [
  "/api/auth",
  "/api/rp/signup",
  "/api/rp/service-application",
  "/api/rp/pe-exam-ai-consult",
  "/api/rp/clients",
];

const results = [];

function addResult(area, name, ok, detail = "") {
  results.push({ area, name, ok: Boolean(ok), detail });
}

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

function summarizeFirewall(config) {
  return JSON.stringify(config || {}).toLowerCase();
}

async function checkProject() {
  const project = await requestJson(`/v9/projects/${projectId}`);
  addResult("vercel", "Project exists", project?.id === projectId, `${project?.name || "unknown"} (${project?.framework || "unknown"})`);
  addResult("vercel", "Project name matches", project?.name === DEFAULT_PROJECT_NAME, project?.name || "missing");
  addResult("vercel", "Next.js framework configured", project?.framework === "nextjs", project?.framework || "missing");
}

async function checkDeployment() {
  const deployments = await requestJson("/v13/deployments", {
    projectId,
    target: "production",
    limit: "1",
  });
  const latest = deployments?.deployments?.[0];
  const sha = latest?.meta?.githubCommitSha || "";

  addResult("deployment", "Latest production deployment exists", Boolean(latest?.id), latest?.id || "missing");
  addResult("deployment", "Latest production deployment is READY", latest?.state === "READY" || latest?.readyState === "READY", latest?.state || latest?.readyState || "missing");
  addResult("deployment", "Latest deployment is from main", latest?.meta?.githubCommitRef === "main", latest?.meta?.githubCommitRef || "missing");

  if (requireCommitMatch) {
    addResult("deployment", "Latest deployment commit matches expected", sha === expectedCommit, `latest=${sha || "missing"} expected=${expectedCommit || "missing"}`);
  } else {
    addResult("deployment", "Latest deployment commit recorded", Boolean(sha), sha || "missing");
  }
}

async function checkEnvironment() {
  const envResponse = await requestJson(`/v9/projects/${projectId}/env`);
  const keys = envKeys(envResponse);

  for (const group of requiredEnvGroups) {
    const present = group.anyOf.filter((key) => keys.has(key));
    addResult("env", `Production env has ${group.name}`, present.length > 0, present.length ? present.join(", ") : `missing one of ${group.anyOf.join(", ")}`);
  }
}

async function checkFirewall() {
  try {
    const config = await requestJson("/v1/security/firewall/config/active", { projectId });
    const text = summarizeFirewall(config);
    const hasAnyRecommendedPath = recommendedFirewallTerms.some((term) => text.includes(term.toLowerCase()));

    addResult("firewall", "Firewall config is readable", true, "active config returned");
    addResult("firewall", "Firewall references protected RP routes", hasAnyRecommendedPath, hasAnyRecommendedPath ? "protected route term found" : "no protected route term found");
  } catch (error) {
    addResult("firewall", "Firewall config is readable", false, `${error.status || "error"} ${error.message}`);
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
  console.log(`projectId=${projectId}`);

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

  await checkProject();
  await checkDeployment();
  await checkEnvironment();
  await checkFirewall();
  printResults();
}

main().catch((error) => {
  console.error(`Vercel production check failed: ${error?.message || error}`);
  process.exitCode = 1;
});
