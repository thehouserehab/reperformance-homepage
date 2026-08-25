import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PROTOTYPE_REFERENCE_DATE,
  alignAppStateWithToday,
  getDayOffset,
  getKoreanTodayDateKey,
  isDateKey,
  rebaseAppStateDates,
  shiftDateKey,
  shiftIsoDatePrefix,
} from "../lib/appDates.ts";

const fixture = {
  studentName: "샘플 학생",
  scheduleDate: PROTOTYPE_REFERENCE_DATE,
  guardianPermissions: {
    attendance: false,
    contract: false,
    academics: false,
    practical: false,
  },
  tasks: [
    {
      id: "task-1",
      title: "샘플 할 일",
      detail: "실제 학생 데이터가 아닌 검증용 값",
      kind: "study",
      scheduledDate: "2026-08-03",
      scheduledTime: "16:00",
      durationMinutes: 30,
      completed: false,
      assignedBy: "student",
    },
  ],
  studySessions: [
    {
      id: "study-1",
      subject: "샘플 과목",
      goal: "검증",
      focusedMinutes: 25,
      breakMinutes: 5,
      completedAt: "2026-08-01T23:00:00+09:00",
    },
  ],
  recordItems: [],
  studentRecords: [
    {
      id: "record-1",
      itemId: "item-1",
      category: "training",
      value: "1",
      unit: "회",
      note: "검증",
      recordedAt: "2026-08-01T19:00:00+09:00",
      source: "manual",
    },
  ],
  calendarEvents: [
    {
      id: "event-1",
      title: "샘플 일정",
      startsAt: "2026-08-05T08:30:00+09:00",
      endsAt: "2026-08-05T09:30:00+09:00",
      category: "exam",
      source: "manual",
    },
  ],
  condition: {
    energy: 3,
    focus: 3,
    soreness: 2,
    checkedAt: "2026-08-02T07:00:00+09:00",
  },
  guardianMessages: [
    {
      id: "guardian-1",
      body: "샘플 문의",
      sentAt: "2026-08-01T09:00:00+09:00",
      status: "sent",
    },
  ],
  coachConversation: [
    {
      id: "conversation-1",
      sender: "student",
      body: "샘플 대화",
      sentAt: "2026-08-01T10:00:00+09:00",
      aiAssisted: false,
      attachments: [
        {
          id: "attachment-1",
          kind: "image",
          fileName: "sample.jpg",
          mimeType: "image/jpeg",
          byteSize: 1,
          storageKey: "sample",
          createdAt: "2026-08-01T10:00:00+09:00",
        },
      ],
    },
  ],
};

assert.equal(getKoreanTodayDateKey(new Date("2026-08-14T14:59:59.999Z")), "2026-08-14");
assert.equal(getKoreanTodayDateKey(new Date("2026-08-14T15:00:00.000Z")), "2026-08-15");
assert.equal(isDateKey("2028-02-29"), true);
assert.equal(isDateKey("2027-02-29"), false);
assert.equal(getDayOffset("2026-12-31", "2027-01-01"), 1);
assert.equal(shiftDateKey("2028-02-28", 1), "2028-02-29");
assert.equal(shiftDateKey("not-a-date", 1), "not-a-date");
assert.equal(
  shiftIsoDatePrefix("2026-08-01T19:00:00+09:00", 13),
  "2026-08-14T19:00:00+09:00"
);

const rebased = rebaseAppStateDates(fixture, PROTOTYPE_REFERENCE_DATE, "2026-08-15");
assert.equal(rebased.scheduleDate, "2026-08-15");
assert.equal(rebased.tasks[0].scheduledDate, "2026-08-16");
assert.equal(rebased.studySessions[0].completedAt, "2026-08-14T23:00:00+09:00");
assert.equal(rebased.studentRecords[0].recordedAt, "2026-08-14T19:00:00+09:00");
assert.equal(rebased.calendarEvents[0].startsAt, "2026-08-18T08:30:00+09:00");
assert.equal(rebased.condition.checkedAt, "2026-08-15T07:00:00+09:00");
assert.equal(rebased.guardianMessages[0].sentAt, "2026-08-14T09:00:00+09:00");
assert.equal(rebased.coachConversation[0].sentAt, "2026-08-14T10:00:00+09:00");
assert.equal(rebased.coachConversation[0].attachments[0].createdAt, "2026-08-14T10:00:00+09:00");
assert.equal(fixture.tasks[0].scheduledDate, "2026-08-03", "Rebasing must not mutate the source state");

const establishedState = {
  ...fixture,
  scheduleDate: "2026-08-14",
};
const aligned = alignAppStateWithToday(establishedState, "2026-08-15");
assert.equal(aligned.scheduleDate, "2026-08-15");
assert.equal(
  aligned.tasks[0].scheduledDate,
  "2026-08-03",
  "Existing user-created dates must not move when a new day starts"
);
assert.throws(() => alignAppStateWithToday(fixture, "2026-02-30"), RangeError);

const providerSource = readFileSync(
  new URL("../components/AppStateProvider.tsx", import.meta.url),
  "utf8"
);
const demoDataSource = readFileSync(new URL("../lib/demoData.ts", import.meta.url), "utf8");

assert.match(providerSource, /getKoreanTodayDateKey\(\)/);
assert.match(providerSource, /restoreStateForToday\(saved, todayDateKey\)/);
assert.match(providerSource, /createDefaultAppStateForDate\(todayDateKey\)/);
assert.equal(providerSource.includes("setState(defaultAppState)"), false);
assert.match(demoDataSource, /scheduleDate: PROTOTYPE_REFERENCE_DATE/);
assert.match(demoDataSource, /rebaseAppStateDates\(defaultAppState, PROTOTYPE_REFERENCE_DATE, dateKey\)/);

console.log(
  "RP APP prototype date boundaries verified: Korea midnight, deterministic seed rebasing, and preserved established dates."
);
