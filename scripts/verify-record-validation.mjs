import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAX_CUSTOM_RECORD_ITEMS_PER_CATEGORY,
  formatRecordMeasurementGuidance,
  validateManualRecordInput,
  validateRecordItemInput,
} from "../lib/recordValidation.ts";

const jumpItem = {
  id: "record-item-training-jump",
  category: "training",
  name: "제자리멀리뛰기",
  suggestedUnit: "cm",
  createdBy: "system",
  active: true,
};

const customItem = {
  id: "custom-training-count",
  category: "training",
  name: "박스 점프",
  suggestedUnit: "회",
  createdBy: "student",
  active: true,
};

const validItem = validateRecordItemInput({
  category: "training",
  name: "  메디신볼   던지기  ",
  suggestedUnit: " m ",
});
assert.equal(validItem.ok, true);
assert.deepEqual(validItem.ok ? validItem.value : null, {
  category: "training",
  name: "메디신볼 던지기",
  suggestedUnit: "m",
});

const missingUnit = validateRecordItemInput({
  category: "training",
  name: "메디신볼 던지기",
  suggestedUnit: "",
});
assert.equal(missingUnit.ok, false);
assert.match(missingUnit.ok ? "" : missingUnit.errors.suggestedUnit ?? "", /기본 단위/);

const duplicateItem = validateRecordItemInput(
  { category: "training", name: " 박스   점프 ", suggestedUnit: "회" },
  [customItem]
);
assert.equal(duplicateItem.ok, false);
assert.match(duplicateItem.ok ? "" : duplicateItem.errors.name ?? "", /이미 있는/);

const customLimit = Array.from({ length: MAX_CUSTOM_RECORD_ITEMS_PER_CATEGORY }, (_, index) => ({
  ...customItem,
  id: `custom-${index}`,
  name: `사용자 항목 ${index}`,
}));
const limitedItem = validateRecordItemInput(
  { category: "training", name: "추가 항목", suggestedUnit: "회" },
  customLimit
);
assert.equal(limitedItem.ok, false);
assert.match(limitedItem.ok ? "" : limitedItem.errors.name ?? "", /최대 30개/);

const now = new Date(2026, 7, 15, 12, 0, 0, 0);
const validRecord = validateManualRecordInput(
  {
    itemId: jumpItem.id,
    category: "training",
    value: "268.0",
    unit: "cm",
    note: "  실내 측정  ",
    recordedAt: "2026-08-15T11:30",
  },
  jumpItem,
  now
);
assert.equal(validRecord.ok, true);
assert.equal(validRecord.ok ? validRecord.value.value : null, "268");
assert.equal(validRecord.ok ? validRecord.value.note : null, "실내 측정");
assert.match(validRecord.ok ? validRecord.value.recordedAt : "", /^2026-08-15T/);

for (const invalidValue of ["1e2", "1,000", "-1", "501", "268.12"]) {
  const result = validateManualRecordInput(
    {
      itemId: jumpItem.id,
      category: "training",
      value: invalidValue,
      unit: "cm",
      note: "",
      recordedAt: "2026-08-15T11:30",
    },
    jumpItem,
    now
  );
  assert.equal(result.ok, false, `${invalidValue} must be rejected for standing long jump`);
  assert.ok(result.ok ? false : result.errors.value);
}

const wrongUnit = validateManualRecordInput(
  {
    itemId: jumpItem.id,
    category: "training",
    value: "268",
    unit: "m",
    note: "",
    recordedAt: "2026-08-15T11:30",
  },
  jumpItem,
  now
);
assert.equal(wrongUnit.ok, false);
assert.match(wrongUnit.ok ? "" : wrongUnit.errors.unit ?? "", /cm로 고정/);

const futureRecord = validateManualRecordInput(
  {
    itemId: jumpItem.id,
    category: "training",
    value: "268",
    unit: "cm",
    note: "",
    recordedAt: "2026-08-15T12:06",
  },
  jumpItem,
  now
);
assert.equal(futureRecord.ok, false);
assert.match(futureRecord.ok ? "" : futureRecord.errors.recordedAt ?? "", /지나지 않은/);

const impossibleDate = validateManualRecordInput(
  {
    itemId: customItem.id,
    category: "training",
    value: "10",
    unit: "회",
    note: "",
    recordedAt: "2026-02-30T10:00",
  },
  customItem,
  now
);
assert.equal(impossibleDate.ok, false);
assert.match(impossibleDate.ok ? "" : impossibleDate.errors.recordedAt ?? "", /유효한/);

const missingItem = validateManualRecordInput(
  {
    itemId: "missing",
    category: "training",
    value: "10",
    unit: "회",
    note: "",
    recordedAt: "2026-08-15T11:30",
  },
  undefined,
  now
);
assert.equal(missingItem.ok, false);
assert.ok(missingItem.ok ? false : missingItem.errors.itemId);

assert.equal(formatRecordMeasurementGuidance(jumpItem), "0~500 · 소수 1자리까지");
assert.equal(formatRecordMeasurementGuidance(customItem), "0~1,000,000 · 소수 3자리까지");

const providerSource = readFileSync(
  new URL("../components/AppStateProvider.tsx", import.meta.url),
  "utf8"
);
const workspaceSource = readFileSync(
  new URL("../components/StudentRecordsWorkspace.tsx", import.meta.url),
  "utf8"
);
const coachWorkspaceSource = readFileSync(
  new URL("../components/CoachRecordsWorkspace.tsx", import.meta.url),
  "utf8"
);
const demoDataSource = readFileSync(new URL("../lib/demoData.ts", import.meta.url), "utf8");

assert.match(providerSource, /validateRecordItemInput\(item, current\.recordItems\)/);
assert.match(providerSource, /validateManualRecordInput\(record, item\)/);
assert.match(providerSource, /restoreRecordItems\(parsed\.recordItems\)/);
assert.match(providerSource, /restoreStudentRecords\(parsed\.studentRecords, restoredRecordItems\)/);
assert.match(providerSource, /validationStatus: validation\.ok \? "valid" as const : "needs_review" as const/);
assert.match(workspaceSource, /validateRecordItemInput\(/);
assert.match(workspaceSource, /validateManualRecordInput\(/);
assert.match(workspaceSource, /record\.validationStatus === "needs_review"/);
assert.match(workspaceSource, /inputMode="decimal"/);
assert.match(workspaceSource, /aria-invalid=/);
assert.match(workspaceSource, /readOnly=\{Boolean\(selectedItem\?\.suggestedUnit\)\}/);
assert.equal(workspaceSource.includes("max={maximumRecordedAt}"), false);
assert.equal((workspaceSource.match(/noValidate/g) ?? []).length, 2);
assert.match(coachWorkspaceSource, /record\.validationStatus === "valid"/);
assert.match(demoDataSource, /validationStatus: "valid"/);

console.log(
  "RP APP record validation verified: item definition, numeric precision, fixed units, bounds, timestamps, and mutation boundaries."
);
