const DEFAULT_BASE_URLS = [
  "https://reperformance-homepage.vercel.app",
  "https://reperformance.the-house-exercise.com",
];

const STATUS_PATH = "/api/rp/system-status";
const REQUEST_TIMEOUT_MS = Number(process.env.RP_STATUS_CHECK_TIMEOUT_MS) || 12000;
const ADMIN_COOKIE_NAME = "rp_admin_session";

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

function normalizeBaseUrl(value) {
  const clean = String(value || "").trim().replace(/\/+$/, "");
  if (!clean) return "";
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
}

function baseUrls() {
  const configured = splitCsv(
    namedArgs.get("base-urls")
      || namedArgs.get("base-url")
      || process.env.RP_STATUS_BASE_URLS
      || process.env.RP_STATUS_BASE_URL
      || process.env.RP_PUBLIC_BASE_URLS
      || process.env.RP_PUBLIC_BASE_URL,
  );
  return (configured.length ? configured : DEFAULT_BASE_URLS).map(normalizeBaseUrl).filter(Boolean);
}

function getCookieHeader() {
  const value = String(
    process.env.RP_SYSTEM_STATUS_COOKIE
      || process.env.RP_STATUS_COOKIE
      || process.env.RP_ADMIN_SESSION_COOKIE
      || "",
  ).trim();

  if (!value) return "";
  if (value.includes("=") || value.includes(";")) return value;
  return `${ADMIN_COOKIE_NAME}=${value}`;
}

function absoluteUrl(baseUrl) {
  return new URL(STATUS_PATH, `${baseUrl}/`).toString();
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "RePERFORMANCE-system-status-check/1.0",
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function getNestedValue(source, path) {
  return path.split(".").reduce((current, key) => (
    current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined
  ), source);
}

function issueSummary(issues = []) {
  if (!Array.isArray(issues) || !issues.length) return "none";
  return issues.map((issue) => issue?.code || issue?.message || "unknown").join(", ");
}

function checkBooleanPath(label, status, path, expected = true) {
  const value = getNestedValue(status, path);
  addResult("status", `${label} ${path} is ${expected}`, value === expected, String(value));
}

function checkReadinessSection(label, status, key) {
  const section = status?.objectiveReadiness?.[key];
  addResult("objective-readiness", `${label} objectiveReadiness.${key} exists`, Boolean(section), section ? "present" : "missing");
  if (!section) return;

  addResult(
    "objective-readiness",
    `${label} objectiveReadiness.${key}.ready is true`,
    section.ready === true,
    `blockers=${issueSummary(section.blockers)}`,
  );
}

async function checkBaseUrl(baseUrl, cookieHeader) {
  const label = baseUrl;
  const url = absoluteUrl(baseUrl);
  const startedAt = Date.now();

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Cookie: cookieHeader,
      },
    });
    const durationMs = Date.now() - startedAt;
    const text = await response.text();
    let status = null;

    try {
      status = text ? JSON.parse(text) : null;
    } catch (_) {
      status = null;
    }

    addResult("transport", `${label} system-status returns 200`, response.status === 200, String(response.status));
    addResult("transport", `${label} system-status responds within ${REQUEST_TIMEOUT_MS}ms`, durationMs <= REQUEST_TIMEOUT_MS, `${durationMs}ms`);
    addResult("transport", `${label} system-status returns JSON`, Boolean(status && typeof status === "object"), status ? "json" : "not-json");

    if (!status || typeof status !== "object") return;

    checkBooleanPath(label, status, "ok", true);
    checkBooleanPath(label, status, "storage.postgres.configured", true);
    checkBooleanPath(label, status, "storage.postgres.runtimeSchemaSyncDisabled", true);
    checkBooleanPath(label, status, "storage.postgres.schema.allRequiredTablesPresent", true);
    checkBooleanPath(label, status, "storage.postgres.schema.allRequiredIndexesPresent", true);
    checkBooleanPath(label, status, "storage.postgres.schema.verifiedContactUniquenessReady", true);
    checkBooleanPath(label, status, "storage.postgres.schema.rateLimitBucketsReady", true);
    checkBooleanPath(label, status, "storage.postgres.schema.aiUsageBucketsReady", true);
    checkBooleanPath(label, status, "storage.postgres.schema.retentionIndexesReady", true);
    checkBooleanPath(label, status, "storage.postgres.schema.securityEventsReady", true);
    checkBooleanPath(label, status, "peExamData.ok", true);
    checkBooleanPath(label, status, "highTrafficReadiness.ready", true);

    const postgresPoolMaxPath = "storage.postgres.pool.max";
    const postgresPoolExplicitMaxPath = "storage.postgres.pool.explicitMax";
    const postgresPoolValidMaxPath = "storage.postgres.pool.validMax";
    const postgresPool = status.storage?.postgres?.pool;
    const postgresPoolMax = Number(postgresPool?.max);
    const postgresPoolMinRecommended = Number(postgresPool?.minRecommendedMax);
    const postgresPoolMaxRecommended = Number(postgresPool?.maxRecommendedMax);
    addResult(
      "storage",
      `${label} postgres pool max is reported at ${postgresPoolMaxPath}`,
      Number.isFinite(postgresPoolMax)
        && postgresPoolMax > 0
        && typeof postgresPool?.explicitMax === "boolean"
        && postgresPool?.validMax !== false,
      `max=${postgresPool?.max ?? "missing"} explicitMax=${postgresPool?.explicitMax ?? "missing"} validMax=${postgresPool?.validMax ?? "missing"}`,
    );
    addResult(
      "storage",
      `${label} ${postgresPoolExplicitMaxPath} is reported`,
      typeof postgresPool?.explicitMax === "boolean",
      `explicitMax=${postgresPool?.explicitMax ?? "missing"}`,
    );
    checkBooleanPath(label, status, postgresPoolValidMaxPath, true);
    addResult(
      "storage",
      `${label} postgres pool max is within reported guidance`,
      Number.isFinite(postgresPoolMax)
        && (!Number.isFinite(postgresPoolMinRecommended) || postgresPoolMax >= postgresPoolMinRecommended)
        && (!Number.isFinite(postgresPoolMaxRecommended) || postgresPoolMax <= postgresPoolMaxRecommended),
      `max=${postgresPool?.max ?? "missing"} range=${postgresPool?.minRecommendedMax ?? "?"}-${postgresPool?.maxRecommendedMax ?? "?"}`,
    );

    const sharedRateLimit = status.trafficControls?.sharedRateLimit;
    addResult(
      "traffic-controls",
      `${label} shared rate-limit failure mode is reported`,
      typeof sharedRateLimit?.failClosed === "boolean" && Boolean(sharedRateLimit?.failureMode),
      sharedRateLimit?.failureMode || "missing",
    );

    addResult(
      "high-traffic-readiness",
      `${label} highTrafficReadiness has no blockers`,
      Array.isArray(status.highTrafficReadiness?.blockers) && status.highTrafficReadiness.blockers.length === 0,
      `blockers=${issueSummary(status.highTrafficReadiness?.blockers)}`,
    );

    for (const key of [
      "customerDataSecurity",
      "signupLoginSecurity",
      "peExamDataMaintenance",
      "trafficSurgeReadiness",
      "dataScaleManagement",
    ]) {
      checkReadinessSection(label, status, key);
    }
  } catch (error) {
    addResult("transport", `${label} system-status fetch succeeds`, false, error?.message || String(error));
  }
}

function printResults(targets) {
  const byArea = new Map();
  for (const result of results) {
    if (!byArea.has(result.area)) byArea.set(result.area, []);
    byArea.get(result.area).push(result);
  }

  console.log("RePERFORMANCE production system-status check");
  console.log(`baseUrls=${targets.join(", ")}`);
  console.log("cookie=provided via env; value is never printed");

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
  const targets = baseUrls();
  const cookieHeader = getCookieHeader();

  if (!targets.length) {
    console.error("No production base URL is configured.");
    process.exitCode = 1;
    return;
  }

  if (!cookieHeader) {
    console.log("RePERFORMANCE production system-status check");
    console.log("Missing staff session cookie.");
    console.log("Set RP_SYSTEM_STATUS_COOKIE, RP_STATUS_COOKIE, or RP_ADMIN_SESSION_COOKIE to a valid staff rp_admin_session value.");
    console.log("Use --allow-missing-cookie only for local script wiring checks.");
    process.exitCode = flags.has("--allow-missing-cookie") ? 0 : 1;
    return;
  }

  for (const baseUrl of targets) {
    await checkBaseUrl(baseUrl, cookieHeader);
  }

  printResults(targets);
}

main().catch((error) => {
  console.error(`System status check failed: ${error?.message || error}`);
  process.exitCode = 1;
});
