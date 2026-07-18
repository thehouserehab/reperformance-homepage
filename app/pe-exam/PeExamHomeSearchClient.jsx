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

const INITIAL_RESULT_LIMIT = 4;
const RESULT_PAGE_SIZE = 4;

function getCardPracticalKeys(card) {
  return (card.practicalItems || []).map(normalizePracticalKey).filter(Boolean);
}

export default function PeExamHomeSearchClient(props) {
  const { cards = [], practicalOptions = [], regionOptions = [] } = props;
  const [searchMode, setSearchMode] = useState("school");
  const [query, setQuery] = useState("");
  const [dataFilter, setDataFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [includePractical, setIncludePractical] = useState("all");
  const [currentRecord, setCurrentRecord] = useState("");
  const [resultLimit, setResultLimit] = useState(INITIAL_RESULT_LIMIT);
  const normalizedQuery = normalizeSearch(query);
  const includePracticalKey = includePractical === "all" ? "" : normalizePracticalKey(includePractical);

  function resetFilters() {
    setQuery("");
    setDataFilter("all");
    setRegionFilter("all");
    setTrackFilter("all");
    setGradeFilter("all");
    setIncludePractical("all");
    setCurrentRecord("");
    setResultLimit(INITIAL_RESULT_LIMIT);
  }

  function updateFilter(setter, value) {
    setter(value);
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
      setCurrentRecord("");
      return;
    }

    setQuery("");
    setDataFilter("all");
  }

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const cardPracticalKeys = getCardPracticalKeys(card);
      const matchesQuery = !normalizedQuery || normalizeSearch(card.searchText).includes(normalizedQuery);
      const matchesData = dataFilter === "all" || Boolean(card.flags?.[dataFilter]);
      const matchesRegion = regionFilter === "all" || card.regionSlug === regionFilter;
      const matchesTrack = trackFilter === "all" || Boolean(card.flags?.[trackFilter]);
      const matchesGrade = gradeFilter === "all" || (card.gradeBands || []).includes(gradeFilter);
      const matchesIncludedPractical =
        !includePracticalKey ||
        cardPracticalKeys.some((key) => key.includes(includePracticalKey) || includePracticalKey.includes(key));
      return (
        matchesQuery &&
        matchesData &&
        matchesRegion &&
        matchesTrack &&
        matchesGrade &&
        matchesIncludedPractical
      );
    });
  }, [
    cards,
    dataFilter,
    gradeFilter,
    includePracticalKey,
    normalizedQuery,
    regionFilter,
    trackFilter,
  ]);

  const visibleCards = filteredCards.slice(0, resultLimit);
  const hasActiveFilters =
    query ||
    dataFilter !== "all" ||
    regionFilter !== "all" ||
    trackFilter !== "all" ||
    gradeFilter !== "all" ||
    includePractical !== "all" ||
    currentRecord;

  return (
    <div className={styles.homeSearchTool}>
      <div className={styles.homeSearchModeTabs} role="group" aria-label="대학 찾기 방법">
        <button
          aria-pressed={searchMode === "school"}
          onClick={() => changeSearchMode("school")}
          type="button"
        >
          <span>01</span>
          대학명으로 찾기
        </button>
        <button
          aria-pressed={searchMode === "condition"}
          onClick={() => changeSearchMode("condition")}
          type="button"
        >
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
              <strong>확인하고 싶은 조건을 직접 선택하세요.</strong>
              <p>자동 합격 예측이 아니라, 공개 자료에서 조건이 일치하는 대학 후보를 줄여주는 검색입니다.</p>
            </div>
            <span>판정·추천 아님</span>
          </div>

          <div className={styles.homeSearchSelectGrid}>
          <label className={styles.homeSearchSelectLabel}>
            <span>지역</span>
            <select value={regionFilter} onChange={(event) => updateFilter(setRegionFilter, event.target.value)}>
              <option value="all">전체 지역</option>
              {regionOptions.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.homeSearchSelectLabel}>
            <span>전형</span>
            <select value={trackFilter} onChange={(event) => updateFilter(setTrackFilter, event.target.value)}>
              {trackOptions.map((track) => (
                <option key={track.value} value={track.value}>
                  {track.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.homeSearchSelectLabel}>
            <span>공개 자료에서 확인할 등급대</span>
            <select value={gradeFilter} onChange={(event) => updateFilter(setGradeFilter, event.target.value)}>
              {gradeOptions.map((grade) => (
                <option key={grade.value} value={grade.value}>
                  {grade.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.homeSearchSelectLabel}>
            <span>포함 실기</span>
            <select value={includePractical} onChange={(event) => updateFilter(setIncludePractical, event.target.value)}>
              <option value="all">전체 종목</option>
              {practicalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

            <label className={`${styles.homeSearchSelectLabel} ${styles.homeSearchRecordField}`}>
              <span>내 현재 기록 (선택)</span>
              <input
                onChange={(event) => updateFilter(setCurrentRecord, event.target.value)}
                placeholder="예: 제멀 285cm, 10m 왕복 8.4초"
                type="text"
                value={currentRecord}
              />
            </label>
          </div>

          <p className={styles.homeSearchPrivacyNote}>
            현재 기록은 이 화면에서 비교 메모로만 사용하며 서버에 저장하지 않습니다. 대학별 점수 환산은 상세 페이지의
            공식 모집요강 기록표를 기준으로 확인해야 합니다.
          </p>
        </div>
      )}

      <div className={styles.homeSearchResultBar}>
        <p className={styles.homeSearchMeta}>
          {searchMode === "condition" ? "조건 일치 후보" : "검색 결과"} {filteredCards.length}개 · 상세 페이지 연결 {cards.length}개
        </p>
        {hasActiveFilters ? (
          <button onClick={resetFilters} type="button">
            필터 초기화
          </button>
        ) : null}
      </div>

      {gradeFilter !== "all" ? (
        <p className={styles.searchSummaryNotice}>
          선택한 등급대가 공개 입결·등급 자료에서 확인되는 대학만 표시합니다. 이는 지원 가능성이나 합격을 예측한 결과가
          아니며, 모집연도와 전형별 공식 자료를 반드시 함께 확인해야 합니다.
        </p>
      ) : null}

      {searchMode === "condition" && currentRecord ? (
        <div className={styles.homeSearchRecordSummary}>
          <span>내 기록 메모</span>
          <strong>{currentRecord}</strong>
          <p>아래 후보의 확인 종목과 나란히 보고, 정확한 배점·만점 기준은 대학 상세 페이지에서 확인하세요.</p>
        </div>
      ) : null}

      {visibleCards.length ? (
        <>
          <div className={styles.homeSearchGrid}>
            {visibleCards.map((card) => (
              <article className={styles.homeSearchCard} key={card.key}>
                <div className={styles.homeSearchCardHead}>
                  <span>{card.regionLabel}</span>
                  <h3>{card.name}</h3>
                  <p>{card.meta}</p>
                </div>

                <dl className={styles.homeSearchStats}>
                  {card.stats.map((stat) => (
                    <div key={stat.label}>
                      <dt>{stat.label}</dt>
                      <dd>{stat.value}</dd>
                    </div>
                  ))}
                </dl>

                {card.preview ? <p className={styles.homeSearchPreview}>{card.preview}</p> : null}

                {searchMode === "condition" && currentRecord ? (
                  <div className={styles.homeSearchRecordCompare}>
                    <div>
                      <span>내 기록</span>
                      <strong>{currentRecord}</strong>
                    </div>
                    <div>
                      <span>대학 확인 종목</span>
                      <strong>{card.preview}</strong>
                    </div>
                  </div>
                ) : null}

                <div className={styles.homeSearchActions}>
                  <Link href={card.earlyHref}>
                    수시 상세
                  </Link>
                  <Link href={card.regularHref}>
                    정시 상세
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.homeSearchMoreActions} aria-label="검색 결과 표시 개수">
            {visibleCards.length < filteredCards.length ? (
              <button
                onClick={() => setResultLimit((current) => current + RESULT_PAGE_SIZE)}
                type="button"
              >
                검색 결과 더 보기 ({filteredCards.length - visibleCards.length}개 남음)
              </button>
            ) : null}
            {resultLimit > INITIAL_RESULT_LIMIT ? (
              <button onClick={() => setResultLimit(INITIAL_RESULT_LIMIT)} type="button">
                처음 4개만 보기
              </button>
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
