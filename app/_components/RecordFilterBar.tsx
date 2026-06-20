"use client";

import styles from "./WorkspaceShell.module.css";

export const RECORD_PERIODS = ["오늘", "7일", "전체"] as const;

export type RecordPeriod = (typeof RECORD_PERIODS)[number];

type RecordFilterBarProps = {
  activePeriod: RecordPeriod;
  onPeriodChange: (period: RecordPeriod) => void;
};

export function RecordFilterBar({ activePeriod, onPeriodChange }: RecordFilterBarProps) {
  return (
    <div className={styles.recordToolbar}>
      <div className={styles.periodFilters} aria-label="기록 기간">
        {RECORD_PERIODS.map((period) => (
          <button
            className={period === activePeriod ? styles.periodActive : styles.periodButton}
            type="button"
            aria-pressed={period === activePeriod}
            key={period}
            onClick={() => onPeriodChange(period)}
          >
            {period}
          </button>
        ))}
      </div>
      <button className={styles.addRecordButton} type="button" disabled title="기록 추가는 로그인 후 제공 예정" aria-label="기록 추가는 로그인 후 제공 예정">
        +
      </button>
    </div>
  );
}
