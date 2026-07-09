const DEFAULT_BASE_URLS = [
  "https://reperformance-homepage.vercel.app",
  "https://reperformance.the-house-exercise.com",
];

const REQUEST_TIMEOUT_MS = Number(process.env.RP_PUBLIC_CHECK_TIMEOUT_MS) || 12000;
const MAX_PAGE_RESPONSE_MS = Number(process.env.RP_PUBLIC_CHECK_MAX_PAGE_MS) || 8000;
const MAX_API_RESPONSE_MS = Number(process.env.RP_PUBLIC_CHECK_MAX_API_MS) || 8000;
const MAX_ASSET_RESPONSE_MS = Number(process.env.RP_PUBLIC_CHECK_MAX_ASSET_MS) || 8000;
const MAX_STATIC_ASSETS_PER_BASE = Number(process.env.RP_PUBLIC_CHECK_STATIC_ASSET_LIMIT) || 8;

const args = process.argv.slice(2);
const namedArgs = new Map(
  args
    .filter((arg) => arg.startsWith("--") && arg.includes("="))
    .map((arg) => {
      const [key, ...valueParts] = arg.slice(2).split("=");
      return [key, valueParts.join("=")];
    }),
);

const pageChecks = [
  { path: "/", label: "home", expectedText: "RePERFORMANCE" },
  { path: "/pe-exam", label: "PE exam hub", expectedText: "체대입시" },
  { path: "/services/pe-exam", label: "PE exam service", expectedText: "체대입시" },
  { path: "/login", label: "login", expectedText: "로그인" },
  { path: "/signup", label: "signup", expectedText: "회원가입" },
  { path: "/find-account", label: "account recovery", expectedText: "계정" },
];

const publicCachePagePaths = new Set(["/", "/pe-exam", "/services/pe-exam"]);

const protectedApiChecks = [
  {
    path: "/api/rp/maintenance/retention",
    label: "retention cron",
    expectedStatuses: [401],
    expectedBody: "Unauthorized maintenance request",
  },
  { path: "/api/rp/system-status", label: "system status", expectedStatuses: [401] },
  { path: "/api/rp/clients", label: "clients API", expectedStatuses: [401] },
  { path: "/api/rp/auth-accounts", label: "auth accounts API", expectedStatuses: [401] },
  { path: "/api/rp/security-events", label: "security events API", expectedStatuses: [401] },
];

const foreignOriginApiChecks = [
  { path: "/api/auth/login", method: "POST", label: "login POST" },
  { path: "/api/admin/login", method: "POST", label: "admin login POST" },
  { path: "/api/auth/logout", method: "POST", label: "member logout POST" },
  { path: "/api/admin/logout", method: "POST", label: "admin logout POST" },
  { path: "/api/auth/identity-verification", method: "POST", label: "identity verification POST" },
  { path: "/api/auth/account-recovery", method: "POST", label: "account recovery POST" },
  { path: "/api/rp/signup", method: "POST", label: "signup POST" },
  { path: "/api/rp/service-application", method: "POST", label: "service application POST" },
  { path: "/api/rp/pe-exam-question", method: "POST", label: "PE exam question POST" },
  { path: "/api/rp/pe-exam-ai-consult", method: "POST", label: "PE exam AI consult POST" },
  { path: "/api/rp/consultation-summary", method: "POST", label: "consultation summary POST" },
  { path: "/api/rp/clients", method: "POST", label: "clients POST" },
  { path: "/api/rp/auth-accounts", method: "PATCH", label: "auth accounts PATCH" },
];

const requiredPageHeaders = [
  { key: "x-content-type-options", includes: "nosniff" },
  { key: "x-frame-options", includes: "DENY" },
  { key: "referrer-policy", includes: "strict-origin-when-cross-origin" },
  { key: "permissions-policy", includes: "camera=()" },
  { key: "strict-transport-security", includes: "max-age=31536000" },
];

const requiredApiHeaders = [
  { key: "cache-control", includes: "no-store" },
  { key: "x-robots-tag", includes: "noindex" },
];

const staticAssetCacheHeaders = [
  { key: "cache-control", includes: "public" },
  { key: "cache-control", includes: "immutable" },
];

const externalBrand = ["NO", "RE"].join("");
const externalServiceChecks = [
  {
    label: "external management brand",
    matches: (body) => new RegExp(`(^|[^a-z0-9])${externalBrand.toLowerCase()}([^a-z0-9]|$)`, "i").test(body),
  },
  {
    label: "external management domain",
    matches: (body) => body.includes(["no", "re", "app", ".com"].join("")),
  },
  {
    label: "external management path",
    matches: (body) => body.includes(["trainer", "/", "home"].join("")),
  },
  {
    label: "external management invite code",
    matches: (body) => body.includes(["7977", "D6D6"].join("").toLowerCase()),
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

function normalizeBaseUrl(value) {
  const clean = String(value || "").trim().replace(/\/+$/, "");
  if (!clean) return "";
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
}

function baseUrls() {
  const configured = splitCsv(
    namedArgs.get("base-urls")
      || namedArgs.get("base-url")
      || process.env.RP_PUBLIC_BASE_URLS
      || process.env.RP_PUBLIC_BASE_URL,
  );
  return (configured.length ? configured : DEFAULT_BASE_URLS).map(normalizeBaseUrl).filter(Boolean);
}

function absoluteUrl(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).toString();
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        "User-Agent": "RePERFORMANCE-public-production-check/1.0",
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTimed(url, init = {}) {
  const startedAt = Date.now();
  const response = await fetchWithTimeout(url, init);
  return { response, durationMs: Date.now() - startedAt };
}

function getHeader(response, key) {
  return response.headers.get(key) || "";
}

function checkHeaders(area, label, response, headers) {
  for (const header of headers) {
    const value = getHeader(response, header.key);
    addResult(
      area,
      `${label} header ${header.key} includes ${header.includes}`,
      value.toLowerCase().includes(header.includes.toLowerCase()),
      value || "missing",
    );
  }
}

function checkResponseTime(area, label, durationMs, maxMs) {
  addResult(area, `${label} responds within ${maxMs}ms`, durationMs <= maxMs, `${durationMs}ms`);
}

function checkPublicPageCache(label, response) {
  const cacheControl = getHeader(response, "cache-control").toLowerCase();
  addResult(
    "page-cache",
    `${label} is not marked no-store`,
    !cacheControl.includes("no-store") && !cacheControl.includes("private"),
    cacheControl || "missing",
  );
  addResult(
    "page-cache",
    `${label} has cache-aware response header`,
    ["public", "s-maxage", "stale-while-revalidate", "must-revalidate"].some((token) => cacheControl.includes(token)),
    cacheControl || "missing",
  );
}

function extractStaticAssetPaths(body) {
  const assetPaths = new Set();
  const patterns = [
    /(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/gi,
    /url\(["']?([^"')]*\/_next\/static\/[^"')]+)["']?\)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      const cleanPath = String(match[1] || "").replace(/&amp;/g, "&");
      if (cleanPath) assetPaths.add(cleanPath);
    }
  }

  return [...assetPaths];
}

function checkNoExternalServiceText(area, label, body) {
  const lowerBody = String(body || "").toLowerCase();
  const found = externalServiceChecks.filter((check) => check.matches(lowerBody));
  addResult(
    area,
    `${label} keeps external management service separated`,
    found.length === 0,
    found.length ? `found ${found.map((check) => check.label).join(", ")}` : "no forbidden markers",
  );
}

async function checkPage(baseUrl, page) {
  const label = `${baseUrl} ${page.label}`;
  const url = absoluteUrl(baseUrl, page.path);

  try {
    const { response, durationMs } = await fetchTimed(url);
    const body = await response.text();

    addResult("pages", `${label} returns 200`, response.status === 200, String(response.status));
    addResult("pages", `${label} contains expected text`, body.includes(page.expectedText), page.expectedText);
    checkResponseTime("latency", label, durationMs, MAX_PAGE_RESPONSE_MS);
    checkHeaders("headers", label, response, requiredPageHeaders);
    if (publicCachePagePaths.has(page.path)) checkPublicPageCache(label, response);
    checkNoExternalServiceText("separation", label, body);

    return body;
  } catch (error) {
    addResult("pages", `${label} fetch succeeds`, false, error?.message || String(error));
    return "";
  }
}

async function checkProtectedApi(baseUrl, api) {
  const label = `${baseUrl} ${api.label}`;
  const url = absoluteUrl(baseUrl, api.path);

  try {
    const { response, durationMs } = await fetchTimed(url);
    const body = await response.text();

    addResult(
      "apis",
      `${label} rejects unauthenticated request`,
      api.expectedStatuses.includes(response.status),
      String(response.status),
    );
    checkResponseTime("latency", label, durationMs, MAX_API_RESPONSE_MS);

    if (api.expectedBody) {
      addResult("apis", `${label} returns expected auth body`, body.includes(api.expectedBody), api.expectedBody);
    }

    checkHeaders("api-cache", label, response, requiredApiHeaders);
    checkNoExternalServiceText("separation", label, body);
  } catch (error) {
    addResult("apis", `${label} fetch succeeds`, false, error?.message || String(error));
  }
}

async function checkForeignOriginApi(baseUrl, api) {
  const label = `${baseUrl} ${api.label}`;
  const url = absoluteUrl(baseUrl, api.path);

  try {
    const { response, durationMs } = await fetchTimed(url, {
      method: api.method,
      headers: {
        "Content-Type": "application/json",
        Origin: "https://malicious.example",
        Referer: "https://malicious.example/form",
      },
      body: JSON.stringify({ publicProductionSmokeTest: true }),
    });
    const body = await response.text();

    addResult("origin-guards", `${label} rejects foreign origin`, response.status === 403, String(response.status));
    checkResponseTime("latency", label, durationMs, MAX_API_RESPONSE_MS);
    addResult(
      "origin-guards",
      `${label} returns expected origin guard body`,
      body.includes("Request origin is not allowed."),
      "Request origin is not allowed.",
    );
    checkHeaders("api-cache", label, response, requiredApiHeaders);
    checkNoExternalServiceText("separation", label, body);
  } catch (error) {
    addResult("origin-guards", `${label} fetch succeeds`, false, error?.message || String(error));
  }
}

async function checkStaticAsset(baseUrl, assetPath) {
  const url = /^https?:\/\//i.test(assetPath) ? assetPath : absoluteUrl(baseUrl, assetPath);
  const label = `${baseUrl} ${new URL(url).pathname}`;

  try {
    const { response, durationMs } = await fetchTimed(url, {
      headers: {
        Accept: "*/*",
      },
    });

    await response.arrayBuffer();
    addResult("static-assets", `${label} returns 200`, response.status === 200, String(response.status));
    checkResponseTime("latency", label, durationMs, MAX_ASSET_RESPONSE_MS);
    checkHeaders("asset-cache", label, response, staticAssetCacheHeaders);
  } catch (error) {
    addResult("static-assets", `${label} fetch succeeds`, false, error?.message || String(error));
  }
}

function printResults(targets) {
  const byArea = new Map();
  for (const result of results) {
    if (!byArea.has(result.area)) byArea.set(result.area, []);
    byArea.get(result.area).push(result);
  }

  console.log("RePERFORMANCE public production check");
  console.log(`baseUrls=${targets.join(", ")}`);

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
  if (!targets.length) {
    console.error("No public production base URL is configured.");
    process.exitCode = 1;
    return;
  }

  for (const baseUrl of targets) {
    const parsed = new URL(baseUrl);
    addResult("targets", `${baseUrl} uses HTTPS`, parsed.protocol === "https:", parsed.protocol);

    const staticAssetPaths = new Set();

    for (const page of pageChecks) {
      const body = await checkPage(baseUrl, page);
      for (const assetPath of extractStaticAssetPaths(body)) {
        staticAssetPaths.add(assetPath);
      }
    }

    const selectedStaticAssets = [...staticAssetPaths].slice(0, MAX_STATIC_ASSETS_PER_BASE);
    addResult(
      "static-assets",
      `${baseUrl} exposes hashed Next static assets`,
      selectedStaticAssets.length > 0,
      `${selectedStaticAssets.length} checked`,
    );

    for (const assetPath of selectedStaticAssets) {
      await checkStaticAsset(baseUrl, assetPath);
    }

    for (const api of protectedApiChecks) {
      await checkProtectedApi(baseUrl, api);
    }

    for (const api of foreignOriginApiChecks) {
      await checkForeignOriginApi(baseUrl, api);
    }
  }

  printResults(targets);
}

main().catch((error) => {
  console.error(`Public production check failed: ${error?.message || error}`);
  process.exitCode = 1;
});
