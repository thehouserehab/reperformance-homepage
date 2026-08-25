"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  Dumbbell,
  History,
  PenLine,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";
import { formatKoreanMessageTime } from "@/lib/dateFormatting";
import {
  RECORD_ITEM_NAME_MAX_LENGTH,
  RECORD_NOTE_MAX_LENGTH,
  RECORD_UNIT_MAX_LENGTH,
  formatRecordMeasurementGuidance,
  validateManualRecordInput,
  validateRecordItemInput,
  type ManualRecordInputField,
  type RecordItemInputField,
} from "@/lib/recordValidation";
import type { RecordCategory, RecordEntrySource } from "@/lib/types";
import { useAppState } from "./AppStateProvider";

const categoryOptions = [
  { value: "study", label: "공부", description: "학습 시간·점수·과제", icon: BookOpenCheck },
  { value: "training", label: "운동", description: "실기 기록·훈련량", icon: Dumbbell },
  { value: "condition", label: "컨디션", description: "에너지·회복·수면", icon: Activity },
] as const;

const historyFilterOptions = [
  { value: "all", label: "전체" },
  { value: "study", label: "공부" },
  { value: "training", label: "운동" },
  { value: "condition", label: "컨디션" },
] as const;

const categoryLabels: Record<RecordCategory, string> = {
  study: "공부",
  training: "운동",
  condition: "컨디션",
};

const sourceLabels: Record<RecordEntrySource, string> = {
  manual: "직접 입력",
  timer: "공부 타이머",
  coach: "코치 기록",
  "check-in": "상태 저장",
};

type RecordViewMode = "history" | "entry";
type RecordHistoryFilter = "all" | RecordCategory;

function toDateTimeLocalValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function StudentRecordsWorkspace() {
  const { state, hydrated, addRecordItem, addStudentRecord } = useAppState();
  const [viewMode, setViewMode] = useState<RecordViewMode>("history");
  const [historyFilter, setHistoryFilter] = useState<RecordHistoryFilter>("all");
  const [visibleRecordCount, setVisibleRecordCount] = useState(8);
  const [category, setCategory] = useState<RecordCategory>("study");
  const [itemId, setItemId] = useState(
    state.recordItems.find((item) => item.category === "study" && item.active)?.id ?? ""
  );
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState(
    state.recordItems.find((item) => item.category === "study" && item.active)?.suggestedUnit ?? ""
  );
  const [note, setNote] = useState("");
  const [recordedAt, setRecordedAt] = useState(toDateTimeLocalValue);
  const [newItemName, setNewItemName] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [feedback, setFeedback] = useState("");
  const [itemErrors, setItemErrors] = useState<Partial<Record<RecordItemInputField, string>>>({});
  const [recordErrors, setRecordErrors] = useState<Partial<Record<ManualRecordInputField, string>>>({});

  const recordCounts = useMemo(
    () => Object.fromEntries(
      categoryOptions.map((option) => [
        option.value,
        state.studentRecords.filter((record) => record.category === option.value).length,
      ])
    ) as Record<RecordCategory, number>,
    [state.studentRecords]
  );
  const categoryItems = useMemo(
    () => state.recordItems.filter((item) => item.category === category && item.active),
    [category, state.recordItems]
  );
  const selectedItem = categoryItems.find((item) => item.id === itemId) ?? categoryItems[0];
  const itemLookup = useMemo(
    () => new Map(state.recordItems.map((item) => [item.id, item])),
    [state.recordItems]
  );
  const filteredRecords = useMemo(
    () => state.studentRecords
      .filter((record) => historyFilter === "all" || record.category === historyFilter)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [historyFilter, state.studentRecords]
  );
  const visibleRecords = filteredRecords.slice(0, visibleRecordCount);
  const recordsNeedingReview = state.studentRecords.filter(
    (record) => record.validationStatus === "needs_review"
  ).length;
  const currentCategory = categoryOptions.find((option) => option.value === category) ?? categoryOptions[0];
  const historyCategory = historyFilter === "all"
    ? null
    : categoryOptions.find((option) => option.value === historyFilter) ?? null;
  const HistoryEmptyIcon = historyCategory?.icon ?? History;
  const valueGuidance = selectedItem ? formatRecordMeasurementGuidance(selectedItem) : "항목을 먼저 선택해 주세요.";
  const hasFormErrors = Object.keys(itemErrors).length > 0 || Object.keys(recordErrors).length > 0;

  const clearItemError = (field: RecordItemInputField) => {
    setItemErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFeedback("");
  };

  const clearRecordError = (field: ManualRecordInputField) => {
    setRecordErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFeedback("");
  };

  const selectCategory = (nextCategory: RecordCategory) => {
    const firstItem = state.recordItems.find((item) => item.category === nextCategory && item.active);
    setCategory(nextCategory);
    setItemId(firstItem?.id ?? "");
    setUnit(firstItem?.suggestedUnit ?? "");
    setItemErrors({});
    setRecordErrors({});
    setFeedback("");
  };

  const selectHistoryFilter = (nextFilter: RecordHistoryFilter) => {
    setHistoryFilter(nextFilter);
    setVisibleRecordCount(8);
    setFeedback("");
  };

  const selectItem = (nextItemId: string) => {
    const nextItem = categoryItems.find((item) => item.id === nextItemId);
    setItemId(nextItemId);
    setUnit(nextItem?.suggestedUnit ?? "");
    setRecordErrors({});
    setFeedback("");
  };

  const submitNewItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateRecordItemInput(
      { category, name: newItemName, suggestedUnit: newItemUnit },
      state.recordItems
    );
    if (!validation.ok) {
      setItemErrors(validation.errors);
      setFeedback(validation.message);
      return;
    }

    const nextItemId = addRecordItem(validation.value);
    if (!nextItemId) {
      setItemErrors({});
      setFeedback("새 항목을 저장하지 못했습니다. 브라우저 저장 공간과 권한을 확인한 뒤 다시 시도해 주세요.");
      return;
    }

    setItemId(nextItemId);
    setUnit(validation.value.suggestedUnit);
    setNewItemName("");
    setNewItemUnit("");
    setItemErrors({});
    setRecordErrors({});
    setFeedback(`${validation.value.name} 항목을 추가했습니다.`);
  };

  const submitRecord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateManualRecordInput({
      itemId: selectedItem?.id ?? "",
      category,
      value,
      unit,
      note,
      recordedAt,
    }, selectedItem);
    if (!validation.ok) {
      setRecordErrors(validation.errors);
      setFeedback(validation.message);
      return;
    }

    const savedItemName = selectedItem.name;
    const saved = addStudentRecord(validation.value);
    if (!saved) {
      setFeedback("기록을 저장하지 못했습니다. 브라우저 저장 공간과 권한을 확인한 뒤 다시 시도해 주세요.");
      return;
    }
    setValue("");
    setNote("");
    setRecordedAt(toDateTimeLocalValue());
    setRecordErrors({});
    setItemErrors({});
    setHistoryFilter(category);
    setVisibleRecordCount(8);
    setFeedback(`${savedItemName} 기록을 저장했습니다. 아래에서 바로 확인할 수 있습니다.`);
    setViewMode("history");
  };

  if (!hydrated) {
    return (
      <section className="record-loading-state" role="status" aria-live="polite">
        <History aria-hidden="true" size={24} />
        <strong>기록을 불러오고 있습니다.</strong>
        <span>저장된 공부·운동·컨디션 기록을 정리하는 중입니다.</span>
      </section>
    );
  }

  return (
    <>
      <section className="record-summary-band" aria-label="기록 분류 요약">
        {categoryOptions.map(({ value: optionValue, label, description, icon: Icon }) => (
          <div key={optionValue}>
            <Icon aria-hidden="true" size={21} />
            <span>{label}</span>
            <strong>{recordCounts[optionValue]}건</strong>
            <small>{description}</small>
          </div>
        ))}
      </section>

      <section className="record-center" aria-labelledby="record-center-title">
        <header className="record-center-heading">
          <div>
            <p className="section-kicker">RECORD CENTER</p>
            <h2 id="record-center-title">
              {viewMode === "history" ? "내 기록 모아보기" : "새 기록 추가"}
            </h2>
            <p>
              {viewMode === "history"
                ? "자동 기록과 직접 입력한 기록이 모두 이곳에 모입니다."
                : "앱 밖에서 한 공부와 운동도 실제 수행한 날짜로 남길 수 있습니다."}
            </p>
          </div>
          <div className="record-view-switcher" role="tablist" aria-label="기록 화면 선택">
            <button
              type="button"
              id="record-view-history-tab"
              role="tab"
              aria-controls="record-view-history-panel"
              aria-selected={viewMode === "history"}
              className={viewMode === "history" ? "active" : undefined}
              onClick={() => {
                setViewMode("history");
                setFeedback("");
              }}
            >
              <History aria-hidden="true" size={17} /> 기록 모아보기
            </button>
            <button
              type="button"
              id="record-view-entry-tab"
              role="tab"
              aria-controls="record-view-entry-panel"
              aria-selected={viewMode === "entry"}
              className={viewMode === "entry" ? "active" : undefined}
              onClick={() => {
                setViewMode("entry");
                setFeedback("");
              }}
            >
              <PenLine aria-hidden="true" size={17} /> 새 기록 추가
            </button>
          </div>
        </header>

        {viewMode === "history" ? (
          <div
            id="record-view-history-panel"
            role="tabpanel"
            aria-labelledby="record-view-history-tab"
          >
            <div className="record-history-toolbar">
              <div className="record-history-filters" aria-label="기록 분류 필터">
                {historyFilterOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={historyFilter === option.value ? "active" : undefined}
                    aria-pressed={historyFilter === option.value}
                    onClick={() => selectHistoryFilter(option.value)}
                  >
                    {option.label}
                    <span>{option.value === "all" ? state.studentRecords.length : recordCounts[option.value]}</span>
                  </button>
                ))}
              </div>
              <strong>{filteredRecords.length}건</strong>
            </div>

            {feedback ? <p className="record-history-notice" role="status">{feedback}</p> : null}
            {recordsNeedingReview > 0 ? (
              <p className="record-history-notice warning" role="status">
                입력 기준을 확인해야 하는 기존 기록이 {recordsNeedingReview}건 있습니다. 기록은 삭제하지 않았으며 코치 요약에서는 제외됩니다.
              </p>
            ) : null}

            <section className="record-history" aria-labelledby="record-history-title">
              <header>
                <div>
                  <p className="section-kicker">RECORD ARCHIVE</p>
                  <h3 id="record-history-title">
                    {historyFilter === "all" ? "전체 기록" : `${categoryLabels[historyFilter]} 기록`}
                  </h3>
                </div>
                <span>최신순</span>
              </header>

              <div className="record-history-list">
                {visibleRecords.length ? visibleRecords.map((record, index) => {
                  const item = itemLookup.get(record.itemId);
                  return (
                    <article className="record-history-row" key={record.id}>
                      <span className="record-history-index">{String(index + 1).padStart(2, "0")}</span>
                      <div className="record-history-copy">
                        <span>
                          {categoryLabels[record.category]} · {sourceLabels[record.source]}
                          {record.validationStatus === "needs_review" ? " · 검토 필요" : ""}
                        </span>
                        <h3>{item?.name ?? "삭제된 항목"}</h3>
                        <p>{record.note || "추가 메모 없음"}</p>
                      </div>
                      <div className="record-history-value">
                        <strong>{record.value}{record.unit}</strong>
                        <time dateTime={record.recordedAt}>{formatKoreanMessageTime(record.recordedAt)}</time>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="record-history-empty">
                    <HistoryEmptyIcon aria-hidden="true" size={24} />
                    <strong>아직 {historyFilter === "all" ? "저장된" : categoryLabels[historyFilter]} 기록이 없습니다.</strong>
                    <span>새 기록 추가에서 첫 기록을 남겨보세요.</span>
                    <button type="button" onClick={() => setViewMode("entry")}>
                      <Plus aria-hidden="true" size={16} /> 새 기록 추가
                    </button>
                  </div>
                )}
              </div>

              {filteredRecords.length > visibleRecords.length ? (
                <button
                  type="button"
                  className="record-history-more"
                  onClick={() => setVisibleRecordCount((current) => current + 8)}
                >
                  <History aria-hidden="true" size={16} /> 이전 기록 더 보기
                </button>
              ) : null}
            </section>
          </div>
        ) : (
          <div
            id="record-view-entry-panel"
            role="tabpanel"
            aria-labelledby="record-view-entry-tab"
          >
            <div className="record-category-tabs" role="tablist" aria-label="기록 영역">
              {categoryOptions.map(({ value: optionValue, label, description, icon: Icon }) => (
                <button
                  type="button"
                  key={optionValue}
                  id={`record-tab-${optionValue}`}
                  role="tab"
                  aria-controls={`record-panel-${optionValue}`}
                  aria-selected={category === optionValue}
                  className={category === optionValue ? "active" : undefined}
                  onClick={() => selectCategory(optionValue)}
                >
                  <Icon aria-hidden="true" size={19} />
                  <span><strong>{label}</strong><small>{description}</small></span>
                </button>
              ))}
            </div>

            <div
              className="record-management-grid"
              id={`record-panel-${category}`}
              role="tabpanel"
              aria-labelledby={`record-tab-${category}`}
            >
              <section className="record-item-panel" aria-labelledby="record-item-title">
                <header>
                  <div>
                    <span>{currentCategory.label.toUpperCase()}</span>
                    <h3 id="record-item-title">기록 항목</h3>
                  </div>
                  <strong>{categoryItems.length}</strong>
                </header>

                <ul className="record-item-list" aria-label={`${currentCategory.label} 기록 항목`}>
                  {categoryItems.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={selectedItem?.id === item.id ? "selected" : undefined}
                        aria-pressed={selectedItem?.id === item.id}
                        onClick={() => selectItem(item.id)}
                      >
                        <span>{item.name}</span>
                        <small>{item.suggestedUnit || "단위 자유"}</small>
                      </button>
                    </li>
                  ))}
                </ul>

                <details className="record-item-addition">
                  <summary><Plus aria-hidden="true" size={16} /> 새 항목 추가</summary>
                  <form onSubmit={submitNewItem} noValidate>
                    <label>
                      <span>항목 이름</span>
                      <input
                        value={newItemName}
                        onChange={(event) => {
                          setNewItemName(event.target.value);
                          clearItemError("name");
                        }}
                        maxLength={RECORD_ITEM_NAME_MAX_LENGTH}
                        placeholder={category === "study" ? "예: 영어 단어" : category === "training" ? "예: 메디신볼 던지기" : "예: 수면 시간"}
                        aria-invalid={Boolean(itemErrors.name)}
                        aria-describedby={itemErrors.name ? "record-item-name-error" : undefined}
                        required
                      />
                      {itemErrors.name ? <small className="record-field-error" id="record-item-name-error">{itemErrors.name}</small> : null}
                    </label>
                    <label>
                      <span>기본 단위</span>
                      <input
                        value={newItemUnit}
                        onChange={(event) => {
                          setNewItemUnit(event.target.value);
                          clearItemError("suggestedUnit");
                        }}
                        maxLength={RECORD_UNIT_MAX_LENGTH}
                        placeholder="점, 분, cm"
                        aria-invalid={Boolean(itemErrors.suggestedUnit)}
                        aria-describedby={itemErrors.suggestedUnit ? "record-item-unit-error" : undefined}
                        required
                      />
                      {itemErrors.suggestedUnit ? <small className="record-field-error" id="record-item-unit-error">{itemErrors.suggestedUnit}</small> : null}
                    </label>
                    <button type="submit"><Plus aria-hidden="true" size={16} /> 항목 저장</button>
                  </form>
                </details>
              </section>

              <section className="manual-record-panel" aria-labelledby="manual-record-title">
                <header>
                  <div>
                    <span>MANUAL ENTRY</span>
                    <h3 id="manual-record-title">수동으로 기록하기</h3>
                  </div>
                  <Save aria-hidden="true" size={22} />
                </header>
                <p>타이머나 앱을 사용하지 않았어도 실제 수행한 날짜를 기준으로 남깁니다.</p>

                <form className="manual-record-form" onSubmit={submitRecord} noValidate>
                  <label className="record-form-item">
                    <span>기록 항목</span>
                    <select
                      value={selectedItem?.id ?? ""}
                      onChange={(event) => selectItem(event.target.value)}
                      aria-invalid={Boolean(recordErrors.itemId)}
                      aria-describedby={recordErrors.itemId ? "record-item-selection-error" : undefined}
                      required
                    >
                      {categoryItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    {recordErrors.itemId ? <small className="record-field-error" id="record-item-selection-error">{recordErrors.itemId}</small> : null}
                  </label>
                  <label className="record-form-date">
                    <span>수행한 날짜와 시간</span>
                    <input
                      type="datetime-local"
                      value={recordedAt}
                      onChange={(event) => {
                        setRecordedAt(event.target.value);
                        clearRecordError("recordedAt");
                      }}
                      aria-invalid={Boolean(recordErrors.recordedAt)}
                      aria-describedby={recordErrors.recordedAt ? "record-date-error" : undefined}
                      required
                    />
                    {recordErrors.recordedAt ? <small className="record-field-error" id="record-date-error">{recordErrors.recordedAt}</small> : null}
                  </label>
                  <label className="record-form-value">
                    <span>기록값</span>
                    <input
                      value={value}
                      onChange={(event) => {
                        setValue(event.target.value);
                        clearRecordError("value");
                      }}
                      inputMode="decimal"
                      maxLength={20}
                      placeholder="예: 268"
                      aria-invalid={Boolean(recordErrors.value)}
                      aria-describedby={`record-value-guidance${recordErrors.value ? " record-value-error" : ""}`}
                      required
                    />
                    <small className="record-field-hint" id="record-value-guidance">{valueGuidance}</small>
                    {recordErrors.value ? <small className="record-field-error" id="record-value-error">{recordErrors.value}</small> : null}
                  </label>
                  <label className="record-form-unit">
                    <span>단위</span>
                    <input
                      value={unit}
                      onChange={(event) => {
                        setUnit(event.target.value);
                        clearRecordError("unit");
                      }}
                      maxLength={RECORD_UNIT_MAX_LENGTH}
                      placeholder="예: cm"
                      readOnly={Boolean(selectedItem?.suggestedUnit)}
                      aria-invalid={Boolean(recordErrors.unit)}
                      aria-describedby={`record-unit-guidance${recordErrors.unit ? " record-unit-error" : ""}`}
                      required
                    />
                    <small className="record-field-hint" id="record-unit-guidance">
                      {selectedItem?.suggestedUnit ? "항목의 비교 기준 단위로 고정됩니다." : "비교할 단위를 입력해 주세요."}
                    </small>
                    {recordErrors.unit ? <small className="record-field-error" id="record-unit-error">{recordErrors.unit}</small> : null}
                  </label>
                  <label className="record-form-note">
                    <span>메모 <small>선택</small></span>
                    <textarea
                      value={note}
                      onChange={(event) => {
                        setNote(event.target.value);
                        clearRecordError("note");
                      }}
                      maxLength={RECORD_NOTE_MAX_LENGTH}
                      aria-invalid={Boolean(recordErrors.note)}
                      aria-describedby={recordErrors.note ? "record-note-error" : undefined}
                      placeholder="측정 조건이나 공부한 내용을 짧게 남겨주세요."
                    />
                    {recordErrors.note ? <small className="record-field-error" id="record-note-error">{recordErrors.note}</small> : null}
                  </label>
                  <button type="submit" disabled={!selectedItem || !value.trim()}>
                    <Save aria-hidden="true" size={17} /> 기록 저장
                  </button>
                </form>
                <p className={`record-form-feedback${hasFormErrors ? " error" : ""}`} role="status" aria-live="polite">{feedback}</p>
              </section>
            </div>
          </div>
        )}
      </section>

      <aside className="record-action-band">
        <ShieldCheck aria-hidden="true" size={24} />
        <div>
          <span>부모님 공개 범위</span>
          <strong>학업과 실기 기록은 학생이 공개한 요약만 전달합니다.</strong>
        </div>
        <Link href="/student/privacy">공개 설정 <ArrowRight aria-hidden="true" size={17} /></Link>
      </aside>
    </>
  );
}
