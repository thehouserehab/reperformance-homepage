"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./PeExamHub.module.css";

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

const filters = [
  { key: "all", label: "전체" },
  { key: "early", label: "수시" },
  { key: "regular", label: "정시" },
  { key: "practical", label: "실기 기준" },
  { key: "result", label: "등급·입결" },
];

export default function PeExamHomeSearchClient({ cards }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const normalizedQuery = normalizeSearch(query);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesQuery = !normalizedQuery || normalizeSearch(card.searchText).includes(normalizedQuery);
      const matchesFilter = filter === "all" || Boolean(card.flags?.[filter]);

      return matchesQuery && matchesFilter;
    });
  }, [cards, filter, normalizedQuery]);

  return (
    <div className={styles.homeSearchTool}>
      <div className={styles.homeSearchControls}>
        <label className={styles.homeSearchLabel}>
          <span>대학 정보 검색</span>
          <input
            aria-label="체대입시 대학 정보 검색"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="학교명, 지역, 학제 검색"
            type="search"
            value={query}
          />
        </label>

        <div className={styles.homeSearchFilterGroup} role="group" aria-label="대학 정보 검색 필터">
          {filters.map((item) => (
            <button
              aria-pressed={filter === item.key}
              key={item.key}
              onClick={() => setFilter(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.homeSearchMeta}>
        검색 결과 {filteredCards.length}개 · 상세 페이지 연결 {cards.length}개
      </p>

      {filteredCards.length ? (
        <div className={styles.homeSearchGrid}>
          {filteredCards.slice(0, 18).map((card) => (
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
          <span>학교명 일부만 입력하거나 필터를 전체로 바꿔보세요.</span>
        </div>
      )}
    </div>
  );
}
