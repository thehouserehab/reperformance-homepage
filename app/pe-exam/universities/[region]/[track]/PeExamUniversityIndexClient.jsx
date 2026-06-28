"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "../../../PeExamHub.module.css";

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

export default function PeExamUniversityIndexClient({
  cards,
  regionLabel,
  resultFilterLabel,
  trackLabel,
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const normalizedQuery = normalizeSearch(query);
  const filters = [
    { key: "all", label: "전체" },
    { key: "active", label: `${trackLabel} 전형` },
    { key: "practical", label: "실기 대상" },
    { key: "result", label: resultFilterLabel },
    { key: "empty", label: "별도 확인" },
  ];

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesQuery = !normalizedQuery || normalizeSearch(card.searchText).includes(normalizedQuery);
      const matchesFilter = filter === "all" || Boolean(card.flags?.[filter]);

      return matchesQuery && matchesFilter;
    });
  }, [cards, filter, normalizedQuery]);

  return (
    <div className={styles.universityIndexTool}>
      <div className={styles.universityIndexControls}>
        <label className={styles.universitySearchLabel}>
          <span>대학 검색</span>
          <input
            aria-label={`${regionLabel} ${trackLabel} 대학 검색`}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="학교명, 지역, 학제 검색"
            type="search"
            value={query}
          />
        </label>

        <div className={styles.universityFilterGroup} role="group" aria-label={`${trackLabel} 자료 상태 필터`}>
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

      <p className={styles.universityResultMeta}>
        {filteredCards.length}개 대학 표시 · 전체 {cards.length}개
      </p>

      {filteredCards.length ? (
        <div className={styles.universityJumpGrid}>
          {filteredCards.map((card) => (
            <Link
              className={styles.universityJumpCard}
              data-empty={card.isEmpty ? "true" : undefined}
              href={card.href}
              key={card.href}
            >
              <strong>{card.name}</strong>
              <span>{card.meta}</span>
              <em>{card.statusLabel}</em>
              {card.stats.length > 0 ? (
                <dl className={styles.universityMiniStats}>
                  {card.stats.map((stat) => (
                    <div key={stat.label}>
                      <dt>{stat.label}</dt>
                      <dd>{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {card.preview ? <small>{card.preview}</small> : null}
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.universityEmptyState}>
          <strong>표시할 대학이 없습니다.</strong>
          <span>검색어를 줄이거나 다른 상태 필터를 선택해 주세요.</span>
        </div>
      )}
    </div>
  );
}
