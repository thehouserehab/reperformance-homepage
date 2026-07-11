import { performance } from "node:perf_hooks";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const REMOTE_CONFIRMATION = "RUN_RP_PUBLIC_LOAD_TEST";
const DEFAULT_PATHS = ["/", "/services", "/pe-exam"];

function getNamedArg(name) {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : "";
}

function parseInteger(name, fallback, min, max) {
  const raw = getNamedArg(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`--${name} must be an integer from ${min} to ${max}.`);
  }
  return value;
}

function parseRate(name, fallback) {
  const raw = getNamedArg(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`--${name} must be a number from 0 to 1.`);
  }
  return value;
}

function parseBaseUrl() {
  const raw = getNamedArg("base-url") || "http://127.0.0.1:3000";
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("--base-url must use HTTP or HTTPS.");
  if (url.username || url.password) throw new Error("--base-url must not contain credentials.");
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function parsePaths() {
  const raw = getNamedArg("paths");
  const paths = raw ? raw.split(",").map((value) => value.trim()).filter(Boolean) : DEFAULT_PATHS;
  if (!paths.length || paths.length > 12) throw new Error("--paths must contain 1 to 12 comma-separated paths.");

  for (const path of paths) {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("..") || path.includes("#")) {
      throw new Error(`Unsafe public load-test path: ${path}`);
    }
    if (path.toLowerCase().startsWith("/api/")) {
      throw new Error(`API paths are not allowed in the public read-only load test: ${path}`);
    }
  }
  return [...new Set(paths)];
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index];
}

function round(value) {
  return Math.round(value * 10) / 10;
}

async function requestPage(baseUrl, path, timeoutMs) {
  const target = new URL(path, baseUrl);
  if (target.origin !== baseUrl.origin) throw new Error(`Cross-origin path is not allowed: ${path}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(target, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "RePERFORMANCE-ReadOnly-Load-Test/1.0",
      },
    });
    await response.arrayBuffer();
    const finalUrl = new URL(response.url);
    if (finalUrl.origin !== baseUrl.origin) throw new Error(`Cross-origin redirect blocked: ${response.url}`);

    return {
      path,
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      durationMs: performance.now() - startedAt,
      error: "",
    };
  } catch (error) {
    return {
      path,
      ok: false,
      status: 0,
      durationMs: performance.now() - startedAt,
      error: error?.name === "AbortError" ? `timeout after ${timeoutMs}ms` : String(error?.message || error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`RePERFORMANCE read-only public load test

Usage:
  npm.cmd run ops:load:test -- --base-url=http://127.0.0.1:3000
  npm.cmd run ops:load:test -- --base-url=https://example.com --confirm=${REMOTE_CONFIRMATION}

Options:
  --paths=/,/services,/pe-exam  Public GET paths only; /api paths are rejected.
  --requests=90                Total measured requests.
  --concurrency=9              Simultaneous workers.
  --timeout-ms=8000            Per-request timeout.
  --max-p95-ms=2500            Failing p95 latency threshold.
  --max-error-rate=0.01        Failing error-rate threshold from 0 to 1.

Remote runs require --confirm=${REMOTE_CONFIRMATION} and are capped at 300 requests with concurrency 20.
`);
    return;
  }

  const baseUrl = parseBaseUrl();
  const paths = parsePaths();
  const isLocal = LOCAL_HOSTS.has(baseUrl.hostname.toLowerCase());
  const requestCap = isLocal ? 2000 : 300;
  const concurrencyCap = isLocal ? 100 : 20;
  const requests = parseInteger("requests", 90, 1, requestCap);
  const concurrency = Math.min(parseInteger("concurrency", 9, 1, concurrencyCap), requests);
  const timeoutMs = parseInteger("timeout-ms", 8000, 500, 30000);
  const maxP95Ms = parseInteger("max-p95-ms", 2500, 1, 30000);
  const maxErrorRate = parseRate("max-error-rate", 0.01);

  if (!isLocal && getNamedArg("confirm") !== REMOTE_CONFIRMATION) {
    throw new Error(`Remote load tests require --confirm=${REMOTE_CONFIRMATION}.`);
  }

  console.log("RePERFORMANCE read-only public load test");
  console.log(`baseUrl=${baseUrl.origin}`);
  console.log(`paths=${paths.join(",")}`);
  console.log(`requests=${requests} concurrency=${concurrency} timeoutMs=${timeoutMs}`);
  console.log(`thresholds=p95<=${maxP95Ms}ms errorRate<=${maxErrorRate}`);

  console.log("\nWarm-up");
  for (const path of paths) {
    const result = await requestPage(baseUrl, path, timeoutMs);
    console.log(`- ${result.ok ? "OK" : "FAIL"} ${path} status=${result.status} duration=${round(result.durationMs)}ms${result.error ? ` error=${result.error}` : ""}`);
    if (!result.ok) throw new Error(`Warm-up failed for ${path}.`);
  }

  const results = [];
  let nextIndex = 0;
  const startedAt = performance.now();

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= requests) return;
      results[index] = await requestPage(baseUrl, paths[index % paths.length], timeoutMs);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsedMs = performance.now() - startedAt;
  const failed = results.filter((result) => !result.ok);
  const durations = results.map((result) => result.durationMs);
  const errorRate = failed.length / results.length;

  console.log("\nResults by path");
  for (const path of paths) {
    const pathResults = results.filter((result) => result.path === path);
    const pathFailures = pathResults.filter((result) => !result.ok);
    console.log(
      `- ${path}: requests=${pathResults.length} failures=${pathFailures.length} ` +
      `p50=${round(percentile(pathResults.map((result) => result.durationMs), 0.5))}ms ` +
      `p95=${round(percentile(pathResults.map((result) => result.durationMs), 0.95))}ms`,
    );
  }

  const summary = {
    requests: results.length,
    failures: failed.length,
    errorRate: round(errorRate),
    elapsedMs: round(elapsedMs),
    requestsPerSecond: round(results.length / (elapsedMs / 1000)),
    p50Ms: round(percentile(durations, 0.5)),
    p95Ms: round(percentile(durations, 0.95)),
    p99Ms: round(percentile(durations, 0.99)),
  };

  console.log("\nSummary");
  for (const [key, value] of Object.entries(summary)) console.log(`${key}=${value}`);
  if (failed.length) {
    console.log("\nFirst failures");
    for (const failure of failed.slice(0, 5)) {
      console.log(`- ${failure.path} status=${failure.status} duration=${round(failure.durationMs)}ms error=${failure.error || "HTTP failure"}`);
    }
  }

  const p95 = percentile(durations, 0.95);
  if (errorRate > maxErrorRate || p95 > maxP95Ms) {
    throw new Error(`Load-test thresholds failed: p95=${round(p95)}ms errorRate=${round(errorRate)}.`);
  }
  console.log("\nOK: public read-only load-test thresholds passed.");
}

main().catch((error) => {
  console.error(`\nLoad test failed: ${error?.message || error}`);
  process.exit(1);
});
