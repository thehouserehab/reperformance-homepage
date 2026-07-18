"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./PeExamHub.module.css";

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "");
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

const gradeOptions = [
  { value: "all", label: "등급대 전체" },
  { value: "grade-1-2", label: "1~2등급대" },
  { value: "grade-3", label: "3등급대" },
  { value: "grade-4", label: "4등급대" },
  { value: "grade-5-plus", label: "5등급 이하" },
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

function isFullScoreMet(standard, value) {
  if (standard.operator === "gte") return value >= standard.fullScoreThreshold;
  if (standard.operator === "lte") return value <= standard.fullScoreThreshold;
  return value < standard.fullScoreThreshold;
}

function getAttainment(standard, value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (standard.operator === "gte") return value / standard.fullScoreThreshold;
  return standard.fullScoreThreshold / value;
}

function getStandardComparison(card, record, applicantSex, trackFilter) {
  const value = Number(record.value);
  if (!applicantSex || !record.eventId || !Number.isFinite(value) || value <= 0) return null;

  const standards = (card.verifiedStandards || [])
    .filter((standard) => standard.eventId === record.eventId)
    .filter((standard) => standard.sex === applicantSex || standard.sex === "all")
    .filter((standard) => trackFilter === "all" || standard.track === trackFilter)
    .map((standard) => ({
      standard,
      value,
      met: isFullScoreMet(standard, value),
      attainment: getAttainment(standard, value),
    }))
    .sort((a, b) => Number(b.met) - Number(a.met) || b.attainment - a.attainment);

  return standards[0] || null;
}

function getCardComparison(card, records, applicantSex, trackFilter) {
  const enteredRecords = records.filter((record) => Number(record.value) > 0);
  if (!applicantSex || !enteredRecords.length) return null;

  const matches = enteredRecords
    .map((record) => ({
      record,
      comparison: getStandardComparison(card, record, applicantSex, trackFilter),
    }))
    .filter((item) => item.comparison);

  if (!matches.length) return null;

  const metCount = matches.filter((item) => item.comparison.met).length;
  const averageAttainment =
    matches.reduce((sum, item) => sum + Math.min(item.comparison.attainment, 1.25), 0) / matches.length;

  return {
    enteredCount: enteredRecords.length,
    coveredCount: matches.length,
    metCount,
    averageAttainment,
    matches,
  };
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

export default function PeExamHomeSearchClient(props) {
  const { cards = [], practicalOptions = [], recordOptions = [], regionOptions = [] } = props;
  const [searchMode, setSearchMode] = useState("school");
  const [query, setQuery] = useState("");
  const [dataFilter, setDataFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [includePractical, setIncludePractical] = useState("all");
  const [applicantSex, setApplicantSex] = useState("");
  const [records, setRecords] = useState([{ id: 1, eventId: "standing-long-jump", value: "" }]);
  const [resultLimit, setResultLimit] = useState(INITIAL_RESULT_LIMIT);
  const normalizedQuery = normalizeSearch(query);
  const includePracticalKey = includePractical === "all" ? "" : normalizePracticalKey(includePractical);
  const enteredRecordCount = records.filter((record) => Number(record.value) > 0).length;
  const recordComparisonActive = Boolean(applicantSex && enteredRecordCount);

  function resetRecords() {
    setApplicantSex("");
    setRecords([{ id: 1, eventId: "standing-long-jump", value: "" }]);
  }

  function resetFilters() {
    setQuery("");
    setDataFilter("all");
    setRegionFilter("all");
    setTrackFilter("all");
    setGradeFilter("all");
    setIncludePractical("all");
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

  function changeSearchMode(nextMode) {
    setSearchMode(nextMode);
    setResultLimit(INITIAL_RESULT_LIMIT);

    if (nextMode === "school") {
      setRegionFilter("all");
      setTrackFilter("all");
      setGradeFilter("all");
      setIncludePractical("all");
      resetRecords();
      return;
    }

    setQuery("");
    setDataFilter("all");
  }

  const comparisonByCardKey = useMemo(() => {
    return new Map(
      cards.map((card) => [card.key, getCardComparison(card, records, applicantSex, trackFilter)]),
    );
  }, [applicantSex, cards, records, trackFilter]);

  const filteredCards = useMemo(() => {
    const matches = cards.filter((card) => {
      const cardPracticalKeys = getCardPracticalKeys(card);
      const matchesQuery = !normalizedQuery || normalizeSearch(card.searchText).includes(normalizedQuery);
      const matchesData = dataFilter === "all" || Boolean(card.flags?.[dataFilter]);
      const matchesRegion = regionFilter === "all" || card.regionSlug === regionFilter;
      const matchesTrack = trackFilter === "all" || Boolean(card.flags?.[trackFilter]);
      const matchesGrade = gradeFilter === "all" || (card.gradeBands || []).includes(gradeFilter);
      const matchesIncludedPractical =
        !includePracticalKey ||
        cardPracticalKeys.some((key) => key.includes(includePracticalKey) || includePracticalKey.includes(key));
      return matchesQuery && matchesData && matchesRegion && matchesTrack && matchesGrade && matchesIncludedPractical;
    });

    if (!recordComparisonActive) return matches;

    return [...matches].sort((a, b) => {
      const aComparison = comparisonByCardKey.get(a.key);
      const bComparison = comparisonByCardKey.get(b.key);
      return (
        Number(Boolean(bComparison)) - Number(Boolean(aComparison)) ||
        (bComparison?.coveredCount || 0) - (aComparison?.coveredCount || 0) ||
        (bComparison?.metCount || 0) - (aComparison?.metCount || 0) ||
        (bComparison?.averageAttainment || 0) - (aComparison?.averageAttainment || 0)
      );
    });
  }, [
    cards,
    comparisonByCardKey,
    dataFilter,
    gradeFilter,
    includePracticalKey,
    normalizedQuery,
    recordComparisonActive,
    regionFilter,
    trackFilter,
  ]);

  const visibleCards = filteredCards.slice(0, resultLimit);
  const verifiedComparisonCount = recordComparisonActive
    ? filteredCards.filter((card) => comparisonByCardKey.get(card.key)).length
    : 0;
  const hasActiveFilters =
    query ||
    dataFilter !== "all" ||
    regionFilter !== "all" ||
    trackFilter !== "all" ||
    gradeFilter !== "all" ||
    includePractical !== "all" ||
    applicantSex ||
    enteredRecordCount;

  return (
    <div className={styles.homeSearchTool}>
      <div className={styles.homeSearchModeTabs} role="group" aria-label="대학 찾기 방법">
        <button aria-pressed={searchMode === "school"} onClick={() => changeSearchMode("school")} type="button">
          <span>01</span>
          대학명으로 찾기
        </button>
        <button aria-pressed={searchMode === "condition"} onClick={() => changeSearchMode("condition")} type="button">
          <span>02</span>
          내 조건으로 후보 찾기
        </button>
      </div>

      {searchMode === "school" ? (
        <div className={styles.homeSearchControls}>
          <label className={styles.homeSearchLabel}>
            <span>대학 정보 검색</span>
            <input
              aria-label="체대입시 대학 정보 검색"
              onChange={(event) => updateFilter(setQuery, event.target.value)}
              placeholder="학교명 또는 줄임말 검색 (예: 한체대, 용인대)"
              type="search"
              value={query}
            />
          </label>

          <div className={styles.homeSearchFilterGroup} role="group" aria-label="대학 정보 자료 필터">
            {dataFilters.map((item) => (
              <button
                aria-pressed={dataFilter === item.key}
                key={item.key}
                onClick={() => updateFilter(setDataFilter, item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.homeSearchAdvanced}>
          <div className={styles.homeSearchAdvancedHead}>
            <div>
              <strong>조건을 고르고, 공식 기록표가 있는 대학부터 비교하세요.</strong>
              <p>공개 입결과 대학 공식 모집요강을 대조하며, 합격 여부를 자동 판정하지 않습니다.</p>
            </div>
            <span>공식 자료 대조</span>
          </div>

          <div className={styles.homeSearchSelectGrid}>
            <label className={styles.homeSearchSelectLabel}>
              <span>지역</span>
              <select value={regionFilter} onChange={(event) => updateFilter(setRegionFilter, event.target.value)}>
                <option value="all">전체 지역</option>
                {regionOptions.map((region) => (
                  <option key={region.value} value={region.value}>{region.label}</option>
                ))}
              </select>
            </label>

            <label className={styles.homeSearchSelectLabel}>
              <span>전형</span>
              <select value={trackFilter} onChange={(event) => updateFilter(setTrackFilter, event.target.value)}>
                {trackOptions.map((track) => (
                  <option key={track.value} value={track.value}>{track.label}</option>
                ))}
              </select>
            </label>

            <label className={styles.homeSearchSelectLabel}>
              <span>공개 자료에서 확인할 등급대</span>
              <select value={gradeFilter} onChange={(event) => updateFilter(setGradeFilter, event.target.value)}>
                {gradeOptions.map((grade) => (
                  <option key={grade.value} value={grade.value}>{grade.label}</option>
                ))}
              </select>
            </label>

            <label className={styles.homeSearchSelectLabel}>
              <span>포함 실기</span>
              <select value={includePractical} onChange={(event) => updateFilter(setIncludePractical, event.target.value)}>
                <option value="all">전체 종목</option>
                {practicalOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

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
        </div>
      )}

      <div className={styles.homeSearchResultBar}>
        <p className={styles.homeSearchMeta}>
          {searchMode === "condition" ? "조건 일치 후보" : "검색 결과"} {filteredCards.length}개
          {recordComparisonActive ? ` · 공식 기록 비교 가능 ${verifiedComparisonCount}개` : ` · 상세 페이지 연결 ${cards.length}개`}
        </p>
        {hasActiveFilters ? <button onClick={resetFilters} type="button">필터 초기화</button> : null}
      </div>

      {gradeFilter !== "all" ? (
        <p className={styles.searchSummaryNotice}>
          선택한 등급대가 공개 입결·등급 자료에서 확인되는 대학만 표시합니다. 이는 지원 가능성이나 합격을 예측한 결과가
          아니며, 모집연도와 전형별 공식 자료를 반드시 함께 확인해야 합니다.
        </p>
      ) : null}

      {recordComparisonActive ? (
        <div className={styles.homeSearchRecordSummary}>
          <span>정렬 기준</span>
          <strong>공식 만점표가 연결된 대학을 먼저 표시합니다.</strong>
          <p>같은 종목명이라도 거리·장비·측정 방식이 다르면 별도 종목으로 처리합니다. 결과는 훈련 목표 비교이며 합격 판정이 아닙니다.</p>
        </div>
      ) : null}

      {visibleCards.length ? (
        <>
          <div className={styles.homeSearchGrid}>
            {visibleCards.map((card) => {
              const comparison = comparisonByCardKey.get(card.key);
              return (
                <article className={styles.homeSearchCard} key={card.key}>
                  <div className={styles.homeSearchCardHead}>
                    <span>{card.regionLabel}</span>
                    <h3>{card.name}</h3>
                    <p>{card.meta}</p>
                  </div>

                  <dl className={styles.homeSearchStats}>
                    {card.stats.map((stat) => (
                      <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>
                    ))}
                  </dl>

                  {card.preview ? <p className={styles.homeSearchPreview}>{card.preview}</p> : null}

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

                  <div className={styles.homeSearchActions}>
                    <Link href={card.earlyHref}>수시 상세</Link>
                    <Link href={card.regularHref}>정시 상세</Link>
                  </div>
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
      ) : (
        <div className={styles.universityEmptyState}>
          <strong>검색 결과가 없습니다.</strong>
          <span>조건을 줄이거나 필터를 초기화하면 공식 확인이 필요한 대학까지 다시 볼 수 있습니다.</span>
        </div>
      )}
    </div>
  );
}
