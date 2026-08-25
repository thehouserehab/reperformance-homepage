import type { RecordCategory, StudentRecordEntry, StudentRecordItem } from "./types";

export const RECORD_ITEM_NAME_MAX_LENGTH = 30;
export const RECORD_UNIT_MAX_LENGTH = 10;
export const RECORD_NOTE_MAX_LENGTH = 160;
export const MAX_CUSTOM_RECORD_ITEMS_PER_CATEGORY = 30;

const FUTURE_CLOCK_SKEW_MILLISECONDS = 5 * 60 * 1000;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const DECIMAL_VALUE_PATTERN = /^[+]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const ZONED_ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

type MeasurementRule = {
  minimum: number;
  maximum: number;
  decimalPlaces: number;
  unit: string;
};

const SYSTEM_MEASUREMENT_RULES: Record<string, MeasurementRule> = {
  "record-item-study-focus": {
    minimum: 1,
    maximum: 720,
    decimalPlaces: 0,
    unit: "분",
  },
  "record-item-study-score": {
    minimum: 0,
    maximum: 100,
    decimalPlaces: 2,
    unit: "점",
  },
  "record-item-training-jump": {
    minimum: 0,
    maximum: 500,
    decimalPlaces: 1,
    unit: "cm",
  },
  "record-item-training-shuttle": {
    minimum: 1,
    maximum: 120,
    decimalPlaces: 3,
    unit: "초",
  },
  "record-item-condition-energy": {
    minimum: 1,
    maximum: 5,
    decimalPlaces: 0,
    unit: "/5",
  },
  "record-item-condition-focus": {
    minimum: 1,
    maximum: 5,
    decimalPlaces: 0,
    unit: "/5",
  },
  "record-item-condition-soreness": {
    minimum: 1,
    maximum: 5,
    decimalPlaces: 0,
    unit: "/5",
  },
  "record-item-condition-sleep": {
    minimum: 0,
    maximum: 24,
    decimalPlaces: 2,
    unit: "시간",
  },
};

export type RecordItemInput = Pick<StudentRecordItem, "category" | "name" | "suggestedUnit">;
export type ManualRecordInput = Omit<StudentRecordEntry, "id" | "source" | "validationStatus">;
export type RecordItemInputField = "name" | "suggestedUnit";
export type ManualRecordInputField = "itemId" | "value" | "unit" | "recordedAt" | "note";

type ValidationSuccess<T> = {
  ok: true;
  value: T;
};

type ValidationFailure<Field extends string> = {
  ok: false;
  errors: Partial<Record<Field, string>>;
  message: string;
};

export type ValidationResult<T, Field extends string> =
  | ValidationSuccess<T>
  | ValidationFailure<Field>;

function normalizeSingleLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function hasUnsafeCharacters(value: string) {
  return CONTROL_CHARACTER_PATTERN.test(value);
}

function decimalPlaces(value: string) {
  const fraction = value.split(".")[1];
  return fraction?.length ?? 0;
}

function parseRecordedAt(value: string) {
  const localMatch = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (localMatch) {
    const year = Number(localMatch[1]);
    const month = Number(localMatch[2]);
    const day = Number(localMatch[3]);
    const hour = Number(localMatch[4]);
    const minute = Number(localMatch[5]);
    const second = Number(localMatch[6] ?? 0);
    const date = new Date(year, month - 1, day, hour, minute, second, 0);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() !== hour ||
      date.getMinutes() !== minute ||
      date.getSeconds() !== second
    ) {
      return null;
    }

    return date;
  }

  if (!ZONED_ISO_DATE_TIME_PATTERN.test(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

export function getRecordMeasurementRule(item: StudentRecordItem): MeasurementRule {
  return SYSTEM_MEASUREMENT_RULES[item.id] ?? {
    minimum: 0,
    maximum: 1_000_000,
    decimalPlaces: 3,
    unit: normalizeSingleLine(item.suggestedUnit),
  };
}

export function formatRecordMeasurementGuidance(item: StudentRecordItem) {
  const rule = getRecordMeasurementRule(item);
  const precision = rule.decimalPlaces === 0
    ? "정수"
    : `소수 ${rule.decimalPlaces}자리까지`;
  return `${rule.minimum.toLocaleString("ko-KR")}~${rule.maximum.toLocaleString("ko-KR")} · ${precision}`;
}

export function validateRecordItemInput(
  input: RecordItemInput,
  existingItems: StudentRecordItem[] = []
): ValidationResult<RecordItemInput, RecordItemInputField> {
  const name = normalizeSingleLine(input.name);
  const suggestedUnit = normalizeSingleLine(input.suggestedUnit);
  const errors: Partial<Record<RecordItemInputField, string>> = {};

  if (!name) {
    errors.name = "항목 이름을 입력해 주세요.";
  } else if (name.length > RECORD_ITEM_NAME_MAX_LENGTH) {
    errors.name = `항목 이름은 ${RECORD_ITEM_NAME_MAX_LENGTH}자 이하여야 합니다.`;
  } else if (hasUnsafeCharacters(name)) {
    errors.name = "항목 이름에는 제어 문자를 사용할 수 없습니다.";
  }

  if (!suggestedUnit) {
    errors.suggestedUnit = "기록을 비교할 수 있도록 기본 단위를 입력해 주세요.";
  } else if (suggestedUnit.length > RECORD_UNIT_MAX_LENGTH) {
    errors.suggestedUnit = `단위는 ${RECORD_UNIT_MAX_LENGTH}자 이하여야 합니다.`;
  } else if (hasUnsafeCharacters(suggestedUnit)) {
    errors.suggestedUnit = "단위에는 제어 문자를 사용할 수 없습니다.";
  }

  const normalizedName = name.toLocaleLowerCase("ko-KR");
  const duplicate = existingItems.some(
    (item) =>
      item.active &&
      item.category === input.category &&
      normalizeSingleLine(item.name).toLocaleLowerCase("ko-KR") === normalizedName
  );
  if (name && duplicate) {
    errors.name = "같은 영역에 이미 있는 항목입니다.";
  }

  const customItemCount = existingItems.filter(
    (item) => item.active && item.category === input.category && item.createdBy === "student"
  ).length;
  if (customItemCount >= MAX_CUSTOM_RECORD_ITEMS_PER_CATEGORY) {
    errors.name = `영역별 사용자 항목은 최대 ${MAX_CUSTOM_RECORD_ITEMS_PER_CATEGORY}개까지 만들 수 있습니다.`;
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
      message: "새 항목의 이름과 단위를 확인해 주세요.",
    };
  }

  return {
    ok: true,
    value: {
      category: input.category,
      name,
      suggestedUnit,
    },
  };
}

export function validateManualRecordInput(
  input: ManualRecordInput,
  item: StudentRecordItem | undefined,
  now = new Date()
): ValidationResult<ManualRecordInput, ManualRecordInputField> {
  const errors: Partial<Record<ManualRecordInputField, string>> = {};
  const normalizedValue = input.value.trim();
  const normalizedUnit = normalizeSingleLine(input.unit);
  const normalizedNote = input.note.trim();

  if (!item || !item.active || item.id !== input.itemId || item.category !== input.category) {
    errors.itemId = "사용할 수 있는 기록 항목을 다시 선택해 주세요.";
  }

  const rule = item ? getRecordMeasurementRule(item) : null;
  let numericValue: number | null = null;

  if (!normalizedValue) {
    errors.value = "기록값을 입력해 주세요.";
  } else if (!DECIMAL_VALUE_PATTERN.test(normalizedValue)) {
    errors.value = "숫자만 입력해 주세요. 지수 표기와 쉼표는 사용할 수 없습니다.";
  } else {
    numericValue = Number(normalizedValue);
    if (!Number.isFinite(numericValue)) {
      errors.value = "유효한 숫자를 입력해 주세요.";
    } else if (rule && (numericValue < rule.minimum || numericValue > rule.maximum)) {
      errors.value = `${rule.minimum.toLocaleString("ko-KR")}~${rule.maximum.toLocaleString("ko-KR")} 범위로 입력해 주세요.`;
    } else if (rule && decimalPlaces(normalizedValue) > rule.decimalPlaces) {
      errors.value = rule.decimalPlaces === 0
        ? "이 항목은 정수로 입력해 주세요."
        : `소수 ${rule.decimalPlaces}자리까지 입력할 수 있습니다.`;
    }
  }

  if (!normalizedUnit) {
    errors.unit = "기록 단위를 입력해 주세요.";
  } else if (normalizedUnit.length > RECORD_UNIT_MAX_LENGTH) {
    errors.unit = `단위는 ${RECORD_UNIT_MAX_LENGTH}자 이하여야 합니다.`;
  } else if (hasUnsafeCharacters(normalizedUnit)) {
    errors.unit = "단위에는 제어 문자를 사용할 수 없습니다.";
  } else if (rule?.unit && normalizedUnit !== rule.unit) {
    errors.unit = `이 항목의 단위는 ${rule.unit}로 고정됩니다.`;
  }

  const recordedAt = parseRecordedAt(input.recordedAt);
  if (!recordedAt) {
    errors.recordedAt = "유효한 수행 날짜와 시간을 입력해 주세요.";
  } else if (recordedAt.getTime() > now.getTime() + FUTURE_CLOCK_SKEW_MILLISECONDS) {
    errors.recordedAt = "아직 지나지 않은 시간으로 기록할 수 없습니다.";
  }

  if (normalizedNote.length > RECORD_NOTE_MAX_LENGTH) {
    errors.note = `메모는 ${RECORD_NOTE_MAX_LENGTH}자 이하여야 합니다.`;
  } else if (hasUnsafeCharacters(normalizedNote.replace(/[\r\n]/g, ""))) {
    errors.note = "메모에는 허용되지 않는 제어 문자가 포함되어 있습니다.";
  }

  if (Object.keys(errors).length > 0 || numericValue === null || !recordedAt || !item) {
    return {
      ok: false,
      errors,
      message: "기록값, 단위와 수행 시간을 다시 확인해 주세요.",
    };
  }

  return {
    ok: true,
    value: {
      itemId: item.id,
      category: item.category,
      value: String(Object.is(numericValue, -0) ? 0 : numericValue),
      unit: rule?.unit || normalizedUnit,
      note: normalizedNote,
      recordedAt: recordedAt.toISOString(),
    },
  };
}
