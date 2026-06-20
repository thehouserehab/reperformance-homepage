"use client";

import styles from "./WorkspaceShell.module.css";

type RecordTabsProps = {
  tabs: readonly string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
};

export function RecordTabs({ tabs, activeTab, onTabChange }: RecordTabsProps) {
  return (
    <div className={styles.recordTabs} role="tablist" aria-label="회원 관리 기록">
      {tabs.map((tab) => (
        <button
          className={tab === activeTab ? styles.recordTabActive : styles.recordTab}
          type="button"
          role="tab"
          aria-selected={tab === activeTab}
          key={tab}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
