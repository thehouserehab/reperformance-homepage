import {
  RP_FIREWALL_CUSTOM_RULES,
  RP_FIREWALL_MANAGED_RULES,
  analyzeRpFirewallConfig,
  buildDesiredRpFirewallConfig,
} from "./lib/rpVercelFirewallPolicy.mjs";

const DEFAULT_TEAM_ID = "team_EfbUpj6INJBMbI08rWAvGdof";
const DEFAULT_PROJECTS = [
  { id: "prj_W2sXR8dobiMSH9QGksPYnwbhX03Z", label: "reperformance-homepage.vercel.app" },
  { id: "prj_VOlVshBafX9Njmw5ZzgVDc9b2syC", label: "reperformance.the-house-exercise.com" },
];
const API_BASE = "https://api.vercel.com";
const CONFIRM_TOKEN = "APPLY_RP_VERCEL_FIREWALL";

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

function clean(value) {
  return String(value || "").trim();
}

function enabled(value) {
  return ["1", "true", "yes", "on", "enabled"].includes(clean(value).toLowerCase());
}

function splitCsv(value) {
  return clean(value).split(",").map((item) => item.trim()).filter(Boolean);
}

const token = process.env.VERCEL_TOKEN || process.env.RP_VERCEL_TOKEN || "";
const teamId = namedArgs.get("team-id") || process.env.RP_VERCEL_TEAM_ID || DEFAULT_TEAM_ID;
const apply = flags.has("--apply");
const validateOnly = flags.has("--validate-only");
const allowApply = enabled(process.env.RP_VERCEL_FIREWALL_ALLOW_APPLY);
const confirm = namedArgs.get("confirm") || "";
const configuredProjectIds = splitCsv(
  namedArgs.get("project-ids")
  || namedArgs.get("project-id")
  || process.env.RP_VERCEL_PROJECT_IDS
  || process.env.RP_VERCEL_PROJECT_ID,
);
const projects = configuredProjectIds.length
  ? configuredProjectIds.map((id, index) => ({
    id,
    label: DEFAULT_PROJECTS.find((project) => project.id === id)?.label || `project ${index + 1}`,
  }))
  : DEFAULT_PROJECTS;

function buildUrl(path, projectId) {
  const url = new URL(path, API_BASE);
  url.searchParams.set("teamId", teamId);
  if (projectId) url.searchParams.set("projectId", projectId);
  return url;
}

async function requestJson(path, { projectId, method = "GET", body } = {}) {
  const response = await fetch(buildUrl(path, projectId), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = { raw: text.slice(0, 500) };
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `${response.status} ${response.statusText}`);
  }
  return data;
}

function printAnalysis(label, analysis) {
  console.log(`\n[${label}]`);
  console.log(`ready=${analysis.ready}`);
  console.log(`firewallEnabled=${analysis.firewallEnabled}`);
  console.log(`botProtectionActive=${analysis.botProtectionActive}`);
  console.log(`activeRules=${analysis.activeRuleCount}`);
  console.log(`protectiveRules=${analysis.protectiveRuleCount}`);
  console.log(`rateLimitRules=${analysis.rateLimitRuleCount}`);
  console.log(`missingProtectedPaths=${analysis.missingProtectedPaths.join(",") || "none"}`);
  console.log(`missingRateLimitedPaths=${analysis.missingRateLimitedPaths.join(",") || "none"}`);
}

async function patchFirewall(projectId, body) {
  return requestJson("/v1/security/firewall/config", {
    projectId,
    method: "PATCH",
    body,
  });
}

async function syncProject(project) {
  const current = await requestJson("/v1/security/firewall/config/active", { projectId: project.id });
  const before = analyzeRpFirewallConfig(current);
  printAnalysis(project.label, before);
  if (before.ready) {
    console.log("No change required.");
    return true;
  }

  const serialized = JSON.stringify(current).toLowerCase();
  const missingCustomRules = RP_FIREWALL_CUSTOM_RULES.filter((policy) => (
    !serialized.includes(policy.name.toLowerCase())
  ));
  const missingManagedRules = RP_FIREWALL_MANAGED_RULES.filter((policy) => (
    policy.id === "bot_protection" && !before.botProtectionActive
  ));

  console.log(`plannedCustomRules=${missingCustomRules.map((policy) => policy.name).join(",") || "none"}`);
  console.log(`plannedManagedRules=${missingManagedRules.map((policy) => policy.id).join(",") || "none"}`);

  if (!apply) {
    console.log("Plan only. Re-run with the explicit apply gates after reviewing the policy.");
    return false;
  }

  if (!before.firewallEnabled) {
    await patchFirewall(project.id, { action: "firewallEnabled", value: true });
  }
  for (const policy of missingCustomRules) {
    await patchFirewall(project.id, { action: "rules.insert", value: policy.value });
  }
  for (const policy of missingManagedRules) {
    await patchFirewall(project.id, { action: "managedRules.update", id: policy.id, value: policy.value });
  }

  const updated = await requestJson("/v1/security/firewall/config/active", { projectId: project.id });
  const after = analyzeRpFirewallConfig(updated);
  printAnalysis(`${project.label} after apply`, after);
  if (!after.ready) {
    console.error(
      "Firewall remains incomplete. Review any staged Firewall draft in Vercel, publish it, or correct an existing same-name rule, then rerun the strict check.",
    );
  }
  return after.ready;
}

async function main() {
  const desiredAnalysis = analyzeRpFirewallConfig(buildDesiredRpFirewallConfig());
  if (!desiredAnalysis.ready) throw new Error("Repository firewall policy failed its self-analysis.");

  console.log("RePERFORMANCE Vercel Firewall sync");
  console.log(`mode=${validateOnly ? "validate-only" : apply ? "apply" : "plan"}`);
  console.log(`projects=${projects.map((project) => project.label).join(",")}`);

  if (validateOnly) {
    printAnalysis("repository policy", desiredAnalysis);
    return;
  }
  if (!token) {
    throw new Error("Set VERCEL_TOKEN or RP_VERCEL_TOKEN to inspect or apply production Firewall state.");
  }
  if (apply && (!allowApply || confirm !== CONFIRM_TOKEN)) {
    throw new Error(
      `Apply requires RP_VERCEL_FIREWALL_ALLOW_APPLY=true and --confirm=${CONFIRM_TOKEN}.`,
    );
  }

  let allReady = true;
  for (const project of projects) {
    allReady = await syncProject(project) && allReady;
  }

  if (!allReady) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Vercel Firewall sync failed: ${error?.message || error}`);
  process.exitCode = 1;
});
