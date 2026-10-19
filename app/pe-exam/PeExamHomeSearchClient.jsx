"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import baseStyles from "./PeExamHub.module.css";
import designStyles from "./PeExamHomeDesign.module.css";

const styles = { ...baseStyles, ...designStyles };
import { createApplicantComparison, getCardPracticalComparison } from "./peExamComparison.mjs";

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function getSearchTokens(query) {
  return String(query || "").normalize("NFKC").trim().split(/\s+/).map(normalizeSearch).filter(Boolean);
}

function getCardTrackMatch(card, track, query) {
  const tokens = getSearchTokens(query);
  const schoolText = normalizeSearch([card.name, ...(card.aliases || []), card.meta, card.regionLabel].join(" "));
  const names = [...new Set(card.departmentNames?.[track] || [])];
  const departmentTokens = tokens.filter((token) => !schoolText.includes(token));
  const matches = names.filter((name) => departmentTokens.every((token) => normalizeSearch(name).includes(token)));
  const practicalMatch = departmentTokens.length > 0 && departmentTokens.every((token) =>
    (card.practicalItems || []).some((item) => normalizePracticalKey(item).includes(normalizePracticalKey(token))));
  const matchesQuery = departmentTokens.length === 0 || matches.length > 0 || practicalMatch;
  const exactMatches = matches.filter((name) => departmentTokens.includes(normalizeSearch(name)));
  const singleName = exactMatches.length === 1 ? exactMatches[0] : matches.length === 1 ? matches[0] : null;
  const schoolHref = track === "early" ? card.earlyHref : card.regularHref;
  const directLink = departmentTokens.length > 0 && singleName
    ? (card.departmentLinks?.[track] || []).find((link) =>
        link.name === singleName && link.href.startsWith(`${schoolHref}/departments/`) &&
        /^[a-z0-9-]+$/.test(link.href.slice(`${schoolHref}/departments/`.length)))
    : null;
  return { matchesQuery, names: practicalMatch && !matches.length ? names : matches, href: directLink?.href || schoolHref, direct: Boolean(directLink), departmentName: directLink?.name || null };
}

function normalizePracticalKey(value) {
  return normalizeSearch(value)
    .replace(/제멀|제자리멀리뛰기|제자리멀리/, "제자리멀리뛰기")
    .replace(/왕복|10m왕복|10미터왕복|셔틀런/, "10m왕복달리기")
    .replace(/메디신볼|메디신|메볼/, "메디신볼던지기")
    .replace(/핸드볼공|핸드볼/, "핸드볼공던지기")
    .replace(/윗몸일으키기|싯업/, "윗몸일으키기")
    .replace(/좌전굴|앞으로굽히기|윗몸앞으로굽히기/, "윗몸앞으로굽히기")
    .replace(/배근력/, "배근력")
    .replace(/z런|z-run|지그재그런/, "z런")
    .replace(/농구레이업|레이업/, "농구레이업슛")
    .replace(/배구토스|토스/, "배구토스")
    .replace(/축구드리블|드리블/, "축구드리블테스트");
}

const dataFilters = [
  { key: "all", label: "전체" },
  { key: "practical", label: "실기 기준" },
  { key: "result", label: "등급·입결" },
];

const trackOptions = [
  { value: "all", label: "수시·정시 전체" },
  { value: "early", label: "수시만" },
  { value: "regular", label: "정시만" },
];

const sexOptions = [
  { value: "", label: "성별 선택" },
  { value: "male", label: "남자 기준" },
  { value: "female", label: "여자 기준" },
];

const unitLabels = {
  cm: "cm",
  m: "m",
  sec: "초",
  reps: "회",
};

const INITIAL_RESULT_LIMIT = 4;
const RESULT_PAGE_SIZE = 4;
const MAX_RECORD_ROWS = 3;

function getCardPracticalKeys(card) {
  return (card.practicalItems || []).map(normalizePracticalKey).filter(Boolean);
}

function getRecordUnit(recordOptions, eventId) {
  return recordOptions.find((option) => option.value === eventId)?.unit || "";
}

function formatThreshold(standard) {
  const operator = standard.operator === "gte" ? "이상" : standard.operator === "lte" ? "이하" : "미만";
  return `${standard.fullScoreThreshold}${unitLabels[standard.unit]} ${operator}`;
}

function formatRecordGap(comparison) {
  if (comparison.met) return "만점 기준 충족";

  const { standard, value } = comparison;
  const difference = Math.abs(standard.fullScoreThreshold - value);
  const precision = standard.unit === "cm" || standard.unit === "reps" ? 0 : 2;
  const formattedDifference = difference.toFixed(precision).replace(/\.00$/, "");
  if (standard.operator === "gte") {
    return `${formattedDifference}${unitLabels[standard.unit]} 향상 필요`;
  }
  return `${formattedDifference}${unitLabels[standard.unit]} 단축 필요`;
}

function parseNumericInput(value, min, max) {
  if (String(value || "").trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function getAcademicComparison(card, averagePercentile, englishGrade, trackFilter) {
  if (trackFilter === "early") return null;
  const percentile = parseNumericInput(averagePercentile, 0, 100);
  const english = parseNumericInput(englishGrade, 1, 9);
  if (percentile === null && english === null) return null;

  const comparisons = (card.regularResultReferences || [])
    .map((reference) => {
      const percentileGap = percentile !== null && reference.percentile70 !== null
        ? percentile - reference.percentile70
        : null;
      const englishGap = english !== null && reference.englishGrade70 !== null
        ? reference.englishGrade70 - english
        : null;
      const distances = [
        percentileGap === null ? null : Math.abs(percentileGap) / 10,
        englishGap === null ? null : Math.abs(englishGap),
      ].filter((value) => value !== null);

      if (!distances.length) return null;
      return {
        reference,
        percentileGap,
        englishGap,
        coveredCount: distances.length,
        distance: distances.reduce((sum, value) => sum + value, 0) / distances.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.coveredCount - a.coveredCount || a.distance - b.distance);

  return comparisons[0] || null;
}

function getAcademicComparisonLabel(comparison) {
  const margins = [
    comparison.percentileGap === null ? null : comparison.percentileGap / 5,
    comparison.englishGap === null ? null : comparison.englishGap,
  ].filter((value) => value !== null);

  if (margins.every((value) => value >= 0) && margins.some((value) => value > 0)) {
    return "공개 70% 참고값 상회";
  }
  if (margins.every((value) => value >= -1)) return "공개 70% 참고값 근접";
  return "공개 70% 참고값과 차이 있음";
}

function formatSignedGap(value, unit) {
  if (value === null) return "입력 없음";
  if (value === 0) return "참고값과 동일";
  const absolute = Math.abs(value).toFixed(unit === "백분위" ? 1 : 0).replace(/\.0$/, "");
  if (unit === "등급") return `${absolute}${unit} ${value > 0 ? "유리" : "불리"}`;
  return `${absolute}${unit} ${value > 0 ? "높음" : "낮음"}`;
}

export default function PeExamHomeSearchClient(props) {
  const { cards = [], practicalOptions = [], recordOptions = [], regionOptions = [] } = props;
  const searchInputRef = useRef(null);
  const firstResultRef = useRef(null);
  const isComposingRef = useRef(false);
  const [query, setQuery] = useState("");
  const [dataFilter, setDataFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [includePractical, setIncludePractical] = useState("all");
  const [averagePercentile, setAveragePercentile] = useState("");
  const [englishGrade, setEnglishGrade] = useState("");
  const [applicantSex, setApplicantSex] = useState("");
  const [records, setRecords] = useState([{ id: 1, eventId: "standing-long-jump", value: "" }]);
  const [resultLimit, setResultLimit] = useState(INITIAL_RESULT_LIMIT);
  const includePracticalKey = includePractical === "all" ? "" : normalizePracticalKey(includePractical);
  const enteredRecordCount = records.filter((record) => Number(record.value) > 0).length;
  const hasSearchQuery = Boolean(query.trim());
  const recordComparisonRequested = Boolean(applicantSex && enteredRecordCount);
  const academicProfileRequested = Boolean(
    parseNumericInput(averagePercentile, 0, 100) !== null
    || parseNumericInput(englishGrade, 1, 9) !== null,
  );
  const comparisonPaused = hasSearchQuery && (recordComparisonRequested || academicProfileRequested);
  const recordComparisonActive = !hasSearchQuery && recordComparisonRequested;
  const academicProfileActive = !hasSearchQuery && academicProfileRequested;

  function resetRecords() {
    setApplicantSex("");
    setRecords([{ id: 1, eventId: "standing-long-jump", value: "" }]);
  }

  function resetFilters() {
    setQuery("");
    setDataFilter("all");
    setRegionFilter("all");
    setTrackFilter("all");
    setIncludePractical("all");
    setAveragePercentile("");
    setEnglishGrade("");
    resetRecords();
    setResultLimit(INITIAL_RESULT_LIMIT);
  }

  function updateFilter(setter, value) {
    setter(value);
    setResultLimit(INITIAL_RESULT_LIMIT);
  }

  function updateRecord(id, field, value) {
    setRecords((current) =>
      current.map((record) =>
        record.id === id
          ? {
              ...record,
              [field]: value,
              ...(field === "eventId" ? { value: "" } : {}),
            }
          : record,
      ),
    );
    setResultLimit(INITIAL_RESULT_LIMIT);
  }

  function addRecord() {
    if (records.length >= MAX_RECORD_ROWS) return;
    setRecords((current) => {
      const nextId = current.reduce((highest, record) => Math.max(highest, record.id), 0) + 1;
      return [...current, { id: nextId, eventId: "standing-long-jump", value: "" }];
    });
  }

  function removeRecord(id) {
    setRecords((current) => current.filter((record) => record.id !== id));
    setResultLimit(INITIAL_RESULT_LIMIT);
  }

  const comparisonByCardKey = useMemo(() => {
    if (!recordComparisonActive) return new Map();
    return new Map(
      cards.map((card) => [card.key, getCardPracticalComparison(card, records, applicantSex, trackFilter)]),
    );
  }, [applicantSex, cards, recordComparisonActive, records, trackFilter]);

  const academicComparisonByCardKey = useMemo(() => {
    if (!academicProfileActive || trackFilter === "early") return new Map();
    return new Map(
      cards.map((card) => [
        card.key,
        getAcademicComparison(card, averagePercentile, englishGrade, trackFilter),
      ]),
    );
  }, [academicProfileActive, averagePercentile, cards, englishGrade, trackFilter]);

  const applicantComparisonByCardKey = useMemo(() => {
    if (!academicProfileActive && !recordComparisonActive) return new Map();
    const academicRequested = academicProfileActive && trackFilter !== "early";
    return new Map(
      cards.map((card) => [
        card.key,
        createApplicantComparison({
          academicComparison: academicComparisonByCardKey.get(card.key),
          practicalComparison: comparisonByCardKey.get(card.key),
          academicRequested,
          practicalRequested: recordComparisonActive,
        }),
      ]),
    );
  }, [
    academicComparisonByCardKey,
    academicProfileActive,
    cards,
    comparisonByCardKey,
    recordComparisonActive,
    trackFilter,
  ]);

  const filteredCards = useMemo(() => {
    const matches = cards.filter((card) => {
      const cardPracticalKeys = getCardPracticalKeys(card);
      const tracks = trackFilter === "all" ? ["early", "regular"] : [trackFilter];
      const matchesQuery = tracks.some((track) => getCardTrackMatch(card, track, query).matchesQuery);
      const matchesData = dataFilter === "all" || Boolean(card.flags?.[dataFilter]);
      const matchesRegion = regionFilter === "all" || card.regionSlug === regionFilter;
      const matchesTrack = trackFilter === "all" || Boolean(card.flags?.[trackFilter]);
      const matchesIncludedPractical =
        !includePracticalKey ||
        cardPracticalKeys.some((key) => key.includes(includePracticalKey) || includePracticalKey.includes(key));
      return matchesQuery && matchesData && matchesRegion && matchesTrack && matchesIncludedPractical;
    });

    if (!recordComparisonActive && !academicProfileActive) return matches;

    return [...matches].sort((a, b) => {
      const aApplicant = applicantComparisonByCardKey.get(a.key);
      const bApplicant = applicantComparisonByCardKey.get(b.key);
      const aAcademic = academicComparisonByCardKey.get(a.key);
      const bAcademic = academicComparisonByCardKey.get(b.key);
      const aComparison = comparisonByCardKey.get(a.key);
      const bComparison = comparisonByCardKey.get(b.key);
      return (
        Number(Boolean(bApplicant)) - Number(Boolean(aApplicant)) ||
        (bApplicant?.availableCount || 0) - (aApplicant?.availableCount || 0) ||
        (bApplicant?.rankScore || 0) - (aApplicant?.rankScore || 0) ||
        (bAcademic?.coveredCount || 0) - (aAcademic?.coveredCount || 0) ||
        (bComparison?.metCount || 0) - (aComparison?.metCount || 0) ||
        (bComparison?.averageAttainment || 0) - (aComparison?.averageAttainment || 0) ||
        (aAcademic?.distance ?? Number.POSITIVE_INFINITY) - (bAcademic?.distance ?? Number.POSITIVE_INFINITY)
      );
    });
  }, [
    academicComparisonByCardKey,
    academicProfileActive,
    applicantComparisonByCardKey,
    cards,
    comparisonByCardKey,
    dataFilter,
    includePracticalKey,
    query,
    recordComparisonActive,
    regionFilter,
    trackFilter,
  ]);

  const hasStartedSearch = Boolean(
    query.trim() || dataFilter !== "all" || regionFilter !== "all" ||
    trackFilter !== "all" || includePractical !== "all" || academicProfileActive || enteredRecordCount
  );
  const visibleCards = hasStartedSearch ? filteredCards.slice(0, resultLimit) : [];
  const verifiedComparisonCount = recordComparisonActive
    ? filteredCards.filter((card) => comparisonByCardKey.get(card.key)).length
    : 0;
  const academicComparisonCount = academicProfileActive && trackFilter !== "early"
    ? filteredCards.filter((card) => academicComparisonByCardKey.get(card.key)).length
    : 0;
  const hasActiveFilters =
    query ||
    dataFilter !== "all" ||
    regionFilter !== "all" ||
    trackFilter !== "all" ||
    includePractical !== "all" ||
    averagePercentile ||
    englishGrade ||
    applicantSex ||
    enteredRecordCount;

  return (
    <div className={styles.homeSearchTool}>
      <form className={styles.searchForm} role="search" aria-label="대학·학과 검색" onSubmit={(event) => {
        event.preventDefault();
        if (isComposingRef.current) return;
        if (visibleCards.length) firstResultRef.current?.focus();
        else searchInputRef.current?.focus();
      }}>
        <label className={styles.searchInputWrap}>
          <span className={styles.visuallyHidden}>체대입시 대학 정보 검색</span>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m15.5 15.5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
          <input ref={searchInputRef} aria-label="체대입시 대학 정보 검색" autoComplete="off" enterKeyHint="search"
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={() => { isComposingRef.current = false; }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (isComposingRef.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) {
                event.preventDefault();
              }
            }}
            onChange={(event) => updateFilter(setQuery, event.target.value)}
            placeholder="학교명 또는 학과명" type="search" value={query} />
        </label>
        <button type="submit">검색</button>
      </form>

      <div className={styles.basicFilters}>
        <label className={styles.homeSearchSelectLabel}><span>지역</span>
          <select value={regionFilter} onChange={(event) => updateFilter(setRegionFilter, event.target.value)}>
            <option value="all">전체 지역</option>
            {regionOptions.map((region) => <option key={region.value} value={region.value}>{region.label}</option>)}
          </select>
        </label>
        <label className={styles.homeSearchSelectLabel}><span>전형</span>
          <select value={trackFilter} onChange={(event) => updateFilter(setTrackFilter, event.target.value)}>
            {trackOptions.map((track) => <option key={track.value} value={track.value}>{track.label}</option>)}
          </select>
        </label>
      </div>

      <details className={styles.advancedDisclosure}>
        <summary>실기·자료·비교 조건 <span>선택</span></summary>
        <div className={styles.homeSearchAdvanced}>
          <div className={styles.homeSearchFilterGroup} role="group" aria-label="대학 정보 자료 필터">
            {dataFilters.map((item) => <button aria-pressed={dataFilter === item.key} key={item.key}
              onClick={() => updateFilter(setDataFilter, item.key)} type="button">{item.label}</button>)}
          </div>
          <div className={styles.homeSearchAdvancedHead}>
            <div>
              <strong>조건을 고르고, 공식 기록표가 있는 대학부터 비교하세요.</strong>
              <p>공개 입결과 대학 공식 모집요강을 대조하며, 합격 여부를 자동 판정하지 않습니다.</p>
              <p>학교·학과 검색 중에는 대학 단위 비교를 표시하지 않습니다. 검색어를 지우고 지역·전형·실기 조건으로 비교하세요.</p>
            </div>
            <span>공식 자료 대조</span>
          </div>

          <div className={styles.homeSearchSelectGrid}>
            <label className={styles.homeSearchSelectLabel}>
              <span>포함 실기</span>
              <select value={includePractical} onChange={(event) => updateFilter(setIncludePractical, event.target.value)}>
                <option value="all">전체 종목</option>
                {practicalOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <div className={styles.homeSearchAcademicGroup}>
              <label className={styles.homeSearchSelectLabel}>
                <span>내 수능 평균 백분위</span>
                <input
                  inputMode="decimal"
                  max="100"
                  min="0"
                  onChange={(event) => updateFilter(setAveragePercentile, event.target.value)}
                  placeholder="예: 72.5"
                  step="0.1"
                  type="number"
                  value={averagePercentile}
                />
              </label>
              <label className={styles.homeSearchSelectLabel}>
                <span>내 영어 등급</span>
                <input
                  inputMode="numeric"
                  max="9"
                  min="1"
                  onChange={(event) => updateFilter(setEnglishGrade, event.target.value)}
                  placeholder="1~9"
                  step="1"
                  type="number"
                  value={englishGrade}
                />
              </label>
              <p>입력값은 카드에 표시된 공식 결과연도의 모집단위별 70% 참고값과만 대조합니다.</p>
            </div>
          </div>

          <details className={styles.homeRecordDisclosure}>
            <summary>
              <span>실기 기록으로 비교</span>
              <small>선택 입력 · 서버 저장 없음</small>
            </summary>
          <section className={styles.verifiedRecordBuilder} aria-label="공식 만점 기준 기록 비교">
            <div className={styles.verifiedRecordBuilderHead}>
              <div>
                <span>VERIFIED RECORD CHECK</span>
                <strong>내 실기 기록 비교</strong>
                <p>성별과 측정 방식이 일치하는 공식 만점표만 계산에 사용합니다.</p>
              </div>
              <label>
                <span>비교 성별</span>
                <select value={applicantSex} onChange={(event) => updateFilter(setApplicantSex, event.target.value)}>
                  {sexOptions.map((option) => (
                    <option key={option.value || "none"} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.verifiedRecordRows}>
              {records.map((record, index) => {
                const unit = getRecordUnit(recordOptions, record.eventId);
                return (
                  <div className={styles.verifiedRecordRow} key={record.id}>
                    <span className={styles.verifiedRecordNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <label>
                      <span>실기 종목</span>
                      <select value={record.eventId} onChange={(event) => updateRecord(record.id, "eventId", event.target.value)}>
                        {recordOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>현재 기록</span>
                      <span className={styles.verifiedRecordInputWrap}>
                        <input
                          inputMode="decimal"
                          min="0"
                          onChange={(event) => updateRecord(record.id, "value", event.target.value)}
                          placeholder="기록 입력"
                          step="0.01"
                          type="number"
                          value={record.value}
                        />
                        <em>{unitLabels[unit] || "기록"}</em>
                      </span>
                    </label>
                    {records.length > 1 ? (
                      <button aria-label={`${index + 1}번 기록 삭제`} onClick={() => removeRecord(record.id)} type="button">×</button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className={styles.verifiedRecordActions}>
              <button disabled={records.length >= MAX_RECORD_ROWS} onClick={addRecord} type="button">기록 추가</button>
              <p>입력 기록은 브라우저 안에서만 비교하며 서버에 전송하거나 저장하지 않습니다.</p>
            </div>
          </section>
          </details>
        </div>
      </details>

      {comparisonPaused ? (
        <div className={styles.comparisonPausedNotice} role="status">
          <p>학교·학과 검색 중에는 대학 단위 비교를 표시하지 않습니다. 검색어를 지우고 지역·전형·실기 조건으로 비교하세요.</p>
          <button type="button" onClick={() => { updateFilter(setQuery, ""); searchInputRef.current?.focus(); }}>검색어만 지우고 비교 재개</button>
          <small>입력한 성적·기록과 선택한 조건은 유지됩니다.</small>
        </div>
      ) : null}

      {hasStartedSearch ? (
        <div className={styles.homeSearchResultBar}>
          <p className={styles.homeSearchMeta}>
            검색 결과 {filteredCards.length}개
            {academicProfileActive ? ` · 공식 입결 비교 가능 ${academicComparisonCount}개` : ""}
            {recordComparisonActive ? ` · 공식 기록 비교 가능 ${verifiedComparisonCount}개` : ""}
          </p>
          {hasActiveFilters ? <button onClick={resetFilters} type="button">필터 초기화</button> : null}
        </div>
      ) : (
        <div className={styles.homeSearchEmpty}>
          <strong>학교명이나 학과명으로 시작하세요.</strong>
          <p>지역과 수시·정시만 골라도 대학을 찾을 수 있습니다.</p>
          <div className={styles.searchExamples} aria-label="검색 예시">
            {["용인대 체육학과", "가천대 운동재활"].map((example) => (
              <button key={example} type="button" onClick={() => { resetFilters(); setQuery(example); searchInputRef.current?.focus(); }}>{example} <span aria-hidden="true">→</span></button>
            ))}
          </div>
        </div>
      )}

      {hasStartedSearch && academicProfileActive ? (
        <p className={styles.searchSummaryNotice}>
          {trackFilter === "early"
            ? "현재 수시 공식 결과값은 동일한 기준으로 비교할 수 없어 성적 대조에 사용하지 않습니다. 정시 또는 전체 전형을 선택해 주세요."
            : recordComparisonActive
              ? "공식 정시 70% 입결과 공식 실기 만점 기준을 함께 비교해 상담 비교 지수가 높은 대학부터 표시합니다. 이 지수는 합격 확률이 아닙니다."
              : "ADIGA 정시 결과표의 모집단위별 70% 평균 백분위·영어등급과 가까운 대학을 먼저 표시합니다. 70% 값은 합격선이나 합격 확률이 아니며 모집연도·환산식·실기 결과에 따라 달라집니다."}
        </p>
      ) : null}

      {hasStartedSearch && recordComparisonActive && (!academicProfileActive || trackFilter === "early") ? (
        <div className={styles.homeSearchRecordSummary}>
          <span>정렬 기준</span>
          <strong>입력 기록과 공식 만점 기준을 비교해 가까운 대학부터 표시합니다.</strong>
          <p>같은 종목명이라도 거리·장비·측정 방식이 다르면 별도 종목으로 처리합니다. 결과는 훈련 목표 비교이며 합격 판정이 아닙니다.</p>
        </div>
      ) : null}

      {visibleCards.length ? (
        <>
          <div className={styles.homeSearchGrid}>
            {visibleCards.map((card, index) => {
              const comparison = comparisonByCardKey.get(card.key);
              const academicComparison = academicComparisonByCardKey.get(card.key);
              const applicantComparison = applicantComparisonByCardKey.get(card.key);
              return (
                <article className={styles.homeSearchCard} key={card.key} ref={index === 0 ? firstResultRef : null} tabIndex={-1} aria-label={card.name}>
                  <div className={styles.homeSearchCardHead}>
                    <span>{card.regionLabel}</span>
                    <h3>{card.name}</h3>
                    <p>{card.meta}</p>
                  </div>

                  <div className={styles.trackResults}>
                    {(trackFilter === "all" ? ["early", "regular"] : [trackFilter]).map((track) => {
                      const match = getCardTrackMatch(card, track, query);
                      if (!match.matchesQuery) return null;
                      const label = track === "early" ? "수시" : "정시";
                      return <div className={styles.trackRow} key={track}>
                        <span className={styles.trackLabel}>{label}</span>
                        <div><p>{match.names.length ? match.names.slice(0, 3).join(" · ") : "대학 상세에서 모집단위 확인"}
                          {match.names.length > 3 ? ` 외 ${match.names.length - 3}개` : ""}</p>
                          <small>모집연도·세부 기준은 공식 모집요강 확인 필요</small></div>
                        <Link href={match.href} aria-label={`${card.name} ${label} ${match.direct ? match.departmentName + " 학과 보기" : "상세 보기"}`}>
                          {match.direct ? "학과 보기" : "상세 보기"} <span aria-hidden="true">→</span>
                        </Link>
                      </div>;
                    })}
                  </div>

                  {(academicProfileActive && trackFilter !== "early") || recordComparisonActive ? (
                    <p className={styles.comparisonScopeNotice}>
                      대학 전체 자료 기준 비교 · 학과별 적용 기준이 다릅니다. 아래 비교 근거의 학과·전형을 확인하세요.
                    </p>
                  ) : null}

                  {applicantComparison ? (
                    <section className={styles.applicantComparisonSummary} aria-label="입력 자료 상담 비교 결과">
                      <div className={styles.applicantComparisonScore}>
                        <span>상담 비교 지수</span>
                        <strong>{applicantComparison.index}<small>/100</small></strong>
                      </div>
                      <div className={styles.applicantComparisonMeaning}>
                        <strong>{applicantComparison.label}</strong>
                        <span>
                          입력 근거 {applicantComparison.availableCount}/{applicantComparison.requestedCount}
                          {comparison?.department ? ` · ${comparison.department}` : ""}
                        </span>
                      </div>
                      <dl>
                        <div>
                          <dt>성적 근접도</dt>
                          <dd>{applicantComparison.academicIndex === null ? "자료 없음" : `${applicantComparison.academicIndex}`}</dd>
                        </div>
                        <div>
                          <dt>만점 기준 도달도</dt>
                          <dd>{applicantComparison.practicalIndex === null ? "자료 없음" : `${applicantComparison.practicalIndex}`}</dd>
                          {applicantComparison.academicIndex !== null && applicantComparison.practicalIndex !== null ? (
                            <small>공식 실기 반영 {applicantComparison.practicalWeightPercent}% 적용</small>
                          ) : null}
                        </div>
                      </dl>
                      <p>합격 확률이 아니라 공개 입결·실기 기준을 상담 전에 비교하기 위한 지수입니다.</p>
                    </section>
                  ) : null}

                  {(academicProfileActive && trackFilter !== "early") || recordComparisonActive ? (
                    <details className={styles.comparisonEvidenceDetails}>
                      <summary>
                        <span>공식 비교 근거 보기</span>
                        <strong>입결·실기 상세</strong>
                      </summary>
                      <div className={styles.comparisonEvidenceBody}>
                  {academicProfileActive && trackFilter !== "early" ? (
                    academicComparison ? (
                      <div className={styles.academicComparisonCard}>
                        <div>
                          <span>정시 공식 입결 대조</span>
                          <strong>{getAcademicComparisonLabel(academicComparison)}</strong>
                        </div>
                        <h4>{academicComparison.reference.unit}</h4>
                        <dl>
                          {academicComparison.reference.percentile70 !== null ? (
                            <div>
                              <dt>평균 백분위 70%</dt>
                              <dd>{academicComparison.reference.percentile70}</dd>
                              <small>{formatSignedGap(academicComparison.percentileGap, "백분위")}</small>
                            </div>
                          ) : null}
                          {academicComparison.reference.englishGrade70 !== null ? (
                            <div>
                              <dt>영어 70%</dt>
                              <dd>{academicComparison.reference.englishGrade70}등급</dd>
                              <small>{formatSignedGap(academicComparison.englishGap, "등급")}</small>
                            </div>
                          ) : null}
                        </dl>
                        <p>
                          {academicComparison.reference.resultYear}학년도 {academicComparison.reference.group}
                          {academicComparison.reference.competitionRate
                            ? ` · 경쟁률 ${academicComparison.reference.competitionRate}:1`
                            : ""}
                        </p>
                      </div>
                    ) : (
                      <div className={styles.verifiedComparisonUnavailable}>
                        <strong>비교 가능한 정시 70% 결과 없음</strong>
                        <span>정시 상세의 공식 자료 링크에서 대학별 환산 방식과 입시결과를 확인해 주세요.</span>
                      </div>
                    )
                  ) : null}

                  {recordComparisonActive ? (
                    comparison ? (
                      <div className={styles.verifiedComparisonCard}>
                        <div className={styles.verifiedComparisonHead}>
                          <span>공식 기록 대조 {comparison.coveredCount}/{comparison.enteredCount}</span>
                          <strong>만점 기준 충족 {comparison.metCount}개</strong>
                        </div>
                        <div className={styles.verifiedComparisonList}>
                          {comparison.matches.map(({ record, comparison: item }) => (
                            <div key={`${record.id}-${item.standard.department}`}>
                              <span>{item.standard.eventName}</span>
                              <strong>{formatRecordGap(item)}</strong>
                              <p>
                                {item.standard.department} · 만점 {formatThreshold(item.standard)} · 실기 {item.standard.practicalWeightPercent}%
                              </p>
                            </div>
                          ))}
                        </div>
                        <small>{comparison.matches[0].comparison.standard.admissionYear}학년도 대학 공식 모집요강 기준</small>
                      </div>
                    ) : (
                      <div className={styles.verifiedComparisonUnavailable}>
                        <strong>선택 기록의 공식 만점표 미연결</strong>
                        <span>대학 상세에서 종목과 공식 모집요강 확인 링크를 볼 수 있습니다.</span>
                      </div>
                    )
                  ) : null}
                      </div>
                    </details>
                  ) : null}


                </article>
              );
            })}
          </div>

          <div className={styles.homeSearchMoreActions} aria-label="검색 결과 표시 개수">
            {visibleCards.length < filteredCards.length ? (
              <button onClick={() => setResultLimit((current) => current + RESULT_PAGE_SIZE)} type="button">
                검색 결과 더 보기 ({filteredCards.length - visibleCards.length}개 남음)
              </button>
            ) : null}
            {resultLimit > INITIAL_RESULT_LIMIT ? (
              <button onClick={() => setResultLimit(INITIAL_RESULT_LIMIT)} type="button">처음 4개만 보기</button>
            ) : null}
          </div>
        </>
      ) : hasStartedSearch ? (
        <div className={styles.universityEmptyState}>
          <strong>검색 결과가 없습니다.</strong>
          <span>학교명이나 학과명을 짧게 입력하거나 조건을 줄여 보세요.</span>
          <button type="button" onClick={resetFilters}>검색과 조건 초기화</button>
        </div>
      ) : null}
    </div>
  );
}
