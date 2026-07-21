import assert from "node:assert/strict";
import {
  createApplicantComparison,
  getCardPracticalComparison,
} from "../app/pe-exam/peExamComparison.mjs";

function academic(percentileGap, englishGap) {
  return { percentileGap, englishGap };
}

function practical(averageAttainment, averagePracticalWeightPercent = 40) {
  return { averageAttainment, averagePracticalWeightPercent };
}

const balanced = createApplicantComparison({
  academicComparison: academic(4, 1),
  practicalComparison: practical(0.96, 60),
  academicRequested: true,
  practicalRequested: true,
});

const weaker = createApplicantComparison({
  academicComparison: academic(-8, -2),
  practicalComparison: practical(0.72),
  academicRequested: true,
  practicalRequested: true,
});

const academicOnly = createApplicantComparison({
  academicComparison: academic(4, 1),
  academicRequested: true,
  practicalRequested: true,
});

const practicalOnly = createApplicantComparison({
  practicalComparison: practical(1.2),
  practicalRequested: true,
});

assert.ok(balanced, "combined comparison should be created");
assert.equal(balanced.availableCount, 2, "combined comparison should use both evidence groups");
assert.equal(balanced.requestedCount, 2, "combined comparison should report both requested groups");
assert.equal(balanced.practicalWeightPercent, 60, "official practical weight should control combined scoring");
assert.equal(balanced.academicWeightPercent, 40, "academic weight should complement practical weight");
assert.ok(balanced.rankScore > weaker.rankScore, "stronger combined evidence should rank first");
assert.ok(balanced.rankScore > academicOnly.rankScore, "complete balanced evidence should outrank partial evidence");
assert.equal(academicOnly.hasPartialEvidence, true, "missing practical evidence should be explicit");
assert.equal(practicalOnly.practicalIndex, 100, "practical attainment should be capped at 100");
assert.equal(createApplicantComparison({}), null, "comparison without requested evidence should be absent");

for (const result of [balanced, weaker, academicOnly, practicalOnly]) {
  assert.ok(result.index >= 0 && result.index <= 100, "comparison index should remain within 0-100");
}

const records = [
  { id: 1, eventId: "jump", value: "280" },
  { id: 2, eventId: "run", value: "8.2" },
];
const standard = (department, eventId, operator, threshold, practicalWeightPercent) => ({
  department,
  eventId,
  fullScoreThreshold: threshold,
  operator,
  practicalWeightPercent,
  sex: "male",
  track: "regular",
});
const splitDepartmentCard = {
  verifiedStandards: [
    standard("학과 A", "jump", "gte", 300, 40),
    standard("학과 B", "run", "lte", 8, 50),
  ],
};
const splitComparison = getCardPracticalComparison(splitDepartmentCard, records, "male", "regular");
assert.equal(splitComparison.coveredCount, 1, "records from different departments must not be merged");

const completeDepartmentCard = {
  verifiedStandards: [
    ...splitDepartmentCard.verifiedStandards,
    standard("학과 C", "jump", "gte", 290, 60),
    standard("학과 C", "run", "lte", 8.1, 60),
  ],
};
const completeComparison = getCardPracticalComparison(completeDepartmentCard, records, "male", "regular");
assert.equal(completeComparison.department, "학과 C", "one department with complete coverage should rank first");
assert.equal(completeComparison.coveredCount, 2, "complete department should cover both records");
assert.equal(completeComparison.averagePracticalWeightPercent, 60, "department weight should remain attached");

console.log("PE exam applicant comparison check: PASS");
console.log(`balanced=${balanced.index}, weaker=${weaker.index}, partial=${academicOnly.index}`);
