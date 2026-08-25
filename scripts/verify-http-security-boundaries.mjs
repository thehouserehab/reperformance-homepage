import assert from "node:assert/strict";
import nextConfig from "../next.config.ts";

assert.equal(typeof nextConfig.headers, "function", "next.config must define HTTP headers");
const rules = await nextConfig.headers();

function getRule(source) {
  const rule = rules.find((candidate) => candidate.source === source);
  assert.ok(rule, `Missing header rule for ${source}`);
  return rule;
}

function getHeader(rule, key) {
  return rule.headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value ?? "";
}

function assertPrivateNoStore(source) {
  const rule = getRule(source);
  const cacheControl = getHeader(rule, "Cache-Control");
  assert.match(cacheControl, /private/, `${source} must be private`);
  assert.match(cacheControl, /no-store/, `${source} must not be stored`);
  assert.equal(getHeader(rule, "CDN-Cache-Control"), "no-store");
  assert.equal(getHeader(rule, "Vercel-CDN-Cache-Control"), "no-store");
}

const globalRule = getRule("/:path*");
const robots = getHeader(globalRule, "X-Robots-Tag");
for (const directive of ["noindex", "nofollow", "noarchive", "nosnippet", "noimageindex"]) {
  assert.match(robots, new RegExp(`(?:^|,\\s*)${directive}(?:,|$)`), `Missing ${directive} robot directive`);
}
assert.equal(getHeader(globalRule, "X-Frame-Options"), "DENY");
assert.equal(getHeader(globalRule, "X-Content-Type-Options"), "nosniff");

for (const source of [
  "/student/:path*",
  "/coach/:path*",
  "/guardian/:path*",
  "/admin/:path*",
  "/calendar/:path*",
  "/api/:path*",
]) {
  assertPrivateNoStore(source);
}

console.log(
  "RP APP HTTP security boundaries verified: protected pages and APIs are private no-store, and all routes are noindex."
);
