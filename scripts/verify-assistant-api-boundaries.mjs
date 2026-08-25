import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { noStoreJson, readLimitedJsonBody } from "../lib/assistantHttp.ts";

function request(body, contentType = "application/json; charset=utf-8", headers = {}) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": contentType, ...headers },
    body,
  });
}

const valid = await readLimitedJsonBody(request(JSON.stringify({ message: "내일 운동" })), 2_048);
assert.equal(valid.ok, true);
assert.deepEqual(valid.ok ? valid.value : null, { message: "내일 운동" });

const maxLengthKoreanMessage = await readLimitedJsonBody(
  request(JSON.stringify({ message: "가".repeat(600), role: "student" })),
  4_096
);
assert.equal(maxLengthKoreanMessage.ok, true, "600 Korean characters must fit the message route byte limit");

const wrongType = await readLimitedJsonBody(request("{}", "text/plain"), 2_048);
assert.deepEqual(wrongType, { ok: false, reason: "unsupported_media_type" });

const declaredTooLarge = await readLimitedJsonBody(
  request("{}", "application/json", { "content-length": "2049" }),
  2_048
);
assert.deepEqual(declaredTooLarge, { ok: false, reason: "payload_too_large" });

const actualTooLarge = await readLimitedJsonBody(
  request(JSON.stringify({ message: "가".repeat(700) })),
  2_048
);
assert.deepEqual(actualTooLarge, { ok: false, reason: "payload_too_large" });

const malformed = await readLimitedJsonBody(request('{"message":'), 2_048);
assert.deepEqual(malformed, { ok: false, reason: "invalid_json" });

const invalidUtf8 = await readLimitedJsonBody(
  new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: new Uint8Array([0xff]),
  }),
  2_048
);
assert.deepEqual(invalidUtf8, { ok: false, reason: "invalid_json" });

const empty = await readLimitedJsonBody(request(""), 2_048);
assert.deepEqual(empty, { ok: false, reason: "invalid_json" });

await assert.rejects(() => readLimitedJsonBody(request("{}"), 0), RangeError);

const response = noStoreJson({ ok: true }, 202);
assert.equal(response.status, 202);
assert.match(response.headers.get("cache-control") ?? "", /private/);
assert.match(response.headers.get("cache-control") ?? "", /no-store/);
assert.equal(response.headers.get("pragma"), "no-cache");
assert.equal(response.headers.get("x-content-type-options"), "nosniff");

const calendarRoute = readFileSync(
  new URL("../app/api/calendar/assistant/route.ts", import.meta.url),
  "utf8"
);
const messageRoute = readFileSync(
  new URL("../app/api/messages/assistant/route.ts", import.meta.url),
  "utf8"
);

for (const [name, source] of [
  ["calendar", calendarRoute],
  ["message", messageRoute],
]) {
  assert.match(source, /readLimitedJsonBody\(request, MAX_REQUEST_BYTES\)/, `${name} route must bound actual request bytes`);
  assert.match(source, /noStoreJson\(/, `${name} route must use private no-store JSON responses`);
  assert.equal(source.includes("request.json()"), false, `${name} route must not bypass the bounded reader`);
  assert.match(source, /payload_too_large/, `${name} route must return a payload-too-large response`);
  assert.match(source, /unsupported_media_type/, `${name} route must reject unsupported media types`);
}

assert.match(calendarRoute, /MAX_REQUEST_BYTES = 2_048/);
assert.match(messageRoute, /MAX_REQUEST_BYTES = 4_096/);

console.log(
  "RP APP assistant API boundaries verified: content type, declared/actual byte limits, malformed JSON, and private no-store responses."
);
