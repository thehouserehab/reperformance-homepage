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

function getGradeFilterFromText(text) {
  const match = text.match(/(?:내신|등급|성적)?\s*(\d+(?:\.\d+)?)\s*등급/);
  if (!match?.[1]) return "";

  const grade = Number(match[1]);
  if (!Number.isFinite(grade)) return "";
  if (grade <= 2.49) return "grade-1-2";
  if (grade <= 3.49) return "grade-3";
  if (grade <= 4.49) return "grade-4";
  return "grade-5-plus";
}

function getCardPracticalKeys(card) {
  return (card.practicalItems || []).map(normalizePracticalKey).filter(Boolean);
}

function findPracticalOption(options, text) {
  const normalizedText = normalizePracticalKey(text);
  if (!normalizedText) return "";

  return (
    options.find((option) => {
      const optionKey = normalizePracticalKey(option.value);
      return optionKey && (normalizedText.includes(optionKey) || optionKey.includes(normalizedText));
    })?.value || ""
  );
}

export default function PeExamHomeSearchClient(props) {
  const { cards = [], practicalOptions = [], regionOptions = [] } = props;
  const [query, setQuery] = useState("");
  const [conditionQuery, setConditionQuery] = useState("");
  const [dataFilter, setDataFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [includePractical, setIncludePractical] = useState("all");
  const [excludePractical, setExcludePractical] = useState("none");
  const normalizedQuery = normalizeSearch(query);
  const includePracticalKey = includePractical === "all" ? "" : normalizePracticalKey(includePractical);
  const excludePracticalKey = excludePractical === "none" ? "" : normalizePracticalKey(excludePractical);

  function applyConditionSearch() {
    const text = conditionQuery.trim();
    if (!text) return;

    const inferredGrade = getGradeFilterFromText(text);
    const inferredPractical = findPracticalOption(practicalOptions, text);
    const inferredTrack = text.includes("수시") ? "early" : text.includes("정시") ? "regular" : "";
    const hasInferredFilter = Boolean(inferredTrack || inferredGrade || inferredPractical);

    if (inferredTrack) setTrackFilter(inferredTrack);
    if (inferredGrade) setGradeFilter(inferredGrade);
    if (inferredPractical) setIncludePractical(inferredPractical);
    setQuery(hasInferredFilter ? "" : text);
  }

  function resetFilters() {
    setQuery("");
    setConditionQuery("");
    setDataFilter("all");
    setRegionFilter("all");
    setTrackFilter("all");
    setGradeFilter("all");
    setIncludePractical("all");
    setExcludePractical("none");
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
      const matchesExcludedPractical =
        !excludePracticalKey ||
        !cardPracticalKeys.some((key) => key.includes(excludePracticalKey) || excludePracticalKey.includes(key));

      return (
        matchesQuery &&
        matchesData &&
        matchesRegion &&
        matchesTrack &&
        matchesGrade &&
        matchesIncludedPractical &&
        matchesExcludedPractical
      );
    });
  }, [
    cards,
    dataFilter,
    excludePracticalKey,
    gradeFilter,
    includePracticalKey,
    normalizedQuery,
    regionFilter,
    trackFilter,
  ]);

  const visibleCards = filteredCards.slice(0, 18);
  const hasActiveFilters =
    query ||
    dataFilter !== "all" ||
    regionFilter !== "all" ||
    trackFilter !== "all" ||
    gradeFilter !== "all" ||
    includePractical !== "all" ||
    excludePractical !== "none";

  return (
    <div className={styles.homeSearchTool}>
      <div className={styles.homeSearchControls}>
        <label className={styles.homeSearchLabel}>
          <span>대학 정보 검색</span>
          <input
            aria-label="체대입시 대학 정보 검색"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="학교명, 지역, 학과, 실기 종목 검색"
            type="search"
            value={query}
          />
        </label>

        <div className={styles.homeSearchFilterGroup} role="group" aria-label="대학 정보 자료 필터">
          {dataFilters.map((item) => (
            <button
              aria-pressed={dataFilter === item.key}
              key={item.key}
              onClick={() => setDataFilter(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.homeSearchAdvanced}>
        <div className={styles.conditionSearchRow}>
          <label>
            <span>조건문 빠른 검색</span>
            <input
              onChange={(event) => setConditionQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyConditionSearch();
                }
              }}
              placeholder="예: 내신 4등급이고 제멀 300cm, 정시 위주로 보고 싶어요"
              type="search"
              value={conditionQuery}
            />
          </label>
          <button onClick={applyConditionSearch} type="button">
            조건 적용
          </button>
        </div>

        <div className={styles.homeSearchSelectGrid}>
          <label className={styles.homeSearchSelectLabel}>
            <span>지역</span>
            <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
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
            <select value={trackFilter} onChange={(event) => setTrackFilter(event.target.value)}>
              {trackOptions.map((track) => (
                <option key={track.value} value={track.value}>
                  {track.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.homeSearchSelectLabel}>
            <span>본인 성적대</span>
            <select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}>
              {gradeOptions.map((grade) => (
                <option key={grade.value} value={grade.value}>
                  {grade.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.homeSearchSelectLabel}>
            <span>포함 실기</span>
            <select value={includePractical} onChange={(event) => setIncludePractical(event.target.value)}>
              <option value="all">전체 종목</option>
              {practicalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.homeSearchSelectLabel}>
            <span>제외 실기</span>
            <select value={excludePractical} onChange={(event) => setExcludePractical(event.target.value)}>
              <option value="none">제외 없음</option>
              {practicalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={styles.homeSearchResultBar}>
        <p className={styles.homeSearchMeta}>
          검색 결과 {filteredCards.length}개 · 상세 페이지 연결 {cards.length}개
        </p>
        {hasActiveFilters ? (
          <button onClick={resetFilters} type="button">
            필터 초기화
          </button>
        ) : null}
      </div>

      {gradeFilter !== "all" ? (
        <p className={styles.searchSummaryNotice}>
          등급대 필터는 공개 입결·등급 자료가 연결된 대학을 우선 보여줍니다. 수시 평균등급이 없는 대학은 공식 모집요강에서
          별도 확인이 필요합니다.
        </p>
      ) : null}

      {visibleCards.length ? (
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
      ) : (
        <div className={styles.universityEmptyState}>
          <strong>검색 결과가 없습니다.</strong>
          <span>등급대나 제외 실기 조건을 줄이거나, 공식 확인이 필요한 대학까지 보려면 필터를 초기화해보세요.</span>
        </div>
      )}
    </div>
  );
}
