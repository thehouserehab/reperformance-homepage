import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const studentToday = read("components/StudentToday.tsx");
const calendar = read("components/CalendarWorkspace.tsx");
const serviceWorker = read("public/sw.js");

assert.equal(
  studentToday.includes('setItem("rp-app-calendar-assistant-autosave", "true")'),
  false,
  "Home assistant must not request automatic calendar persistence"
);
assert.match(
  studentToday,
  /일정 초안을 확인할 수 있도록 캘린더로 이동합니다/,
  "Home assistant must communicate the review step"
);
assert.equal(
  /requestDraft\([^)]*,\s*autoSave\)/.test(calendar) || /if\s*\(autoSave/.test(calendar),
  false,
  "Calendar assistant must not keep an automatic-save branch"
);
assert.match(
  calendar,
  /이 일정 등록/,
  "Calendar assistant must require an explicit registration action"
);
assert.match(
  calendar,
  /task\.assignedBy === "coach"/,
  "Coach-assigned tasks must have a separate student action"
);
assert.match(
  calendar,
  /requestTaskAdjustment/,
  "Coach-assigned tasks must offer an adjustment request"
);
assert.equal(
  serviceWorker.includes('"/student"'),
  false,
  "Service worker must not cache or fall back to the student page"
);
assert.equal(
  serviceWorker.includes("cache.put(event.request"),
  false,
  "Service worker must not cache arbitrary same-origin responses"
);
assert.match(
  serviceWorker,
  /PUBLIC_ASSETS = \["\/rp-app-icon\.svg"\]/,
  "Service worker cache must use a narrow public allowlist"
);

console.log("RP APP prototype safety verified: explicit schedule confirmation, coach task protection, and public-only cache.");
