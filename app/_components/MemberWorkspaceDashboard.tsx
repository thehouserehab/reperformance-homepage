"use client";

import { useState } from "react";
import { EmptyRecordState } from "./EmptyRecordState";
import { MemberInfoGrid } from "./MemberInfoGrid";
import { MemberProfileCard } from "./MemberProfileCard";
import { NutritionGoalCard } from "./NutritionGoalCard";
import { RecordFilterBar, type RecordPeriod } from "./RecordFilterBar";
import { RecordTabs } from "./RecordTabs";
import type { WorkspaceConfig } from "./workspaceTypes";
import styles from "./WorkspaceShell.module.css";

type MemberWorkspaceDashboardProps = {
  config: WorkspaceConfig;
};

export function MemberWorkspaceDashboard({ config }: MemberWorkspaceDashboardProps) {
  const defaultTab = config.tabs[0] ?? "수업";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [activePeriod, setActivePeriod] = useState<RecordPeriod>("오늘");

  return (
    <div className={styles.dashboard}>
      <MemberProfileCard
        audienceLabel={config.audienceLabel}
        memberName={config.memberName}
        memberId={config.memberId}
        status={config.status}
        summary={config.summary}
        highlights={config.highlights}
      />

      <MemberInfoGrid groups={config.infoGroups} />

      <div className={styles.supportGrid}>
        <section className={styles.focusCard} aria-labelledby="focus-title">
          <p className={styles.sectionEyebrow}>GUIDANCE</p>
          <h2 id="focus-title">상담 후 관리 방향</h2>
          <div className={styles.focusList}>
            {config.focusCards.map((card) => (
              <article key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>
        <NutritionGoalCard goals={config.nutritionGoals} note={config.nutritionNote} />
      </div>

      <section className={styles.recordsCard} aria-labelledby="records-title">
        <div className={styles.recordsHeader}>
          <div>
            <p className={styles.sectionEyebrow}>RECORDS</p>
            <h2 id="records-title">기록</h2>
          </div>
          <span className={styles.recordAvailability}>로그인 후 제공 예정</span>
        </div>
        <RecordTabs tabs={config.tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <RecordFilterBar activePeriod={activePeriod} onPeriodChange={setActivePeriod} />
        <div role="tabpanel" className={styles.recordPanel}>
          <EmptyRecordState
            title={`${activePeriod} ${activeTab} 기록 없음`}
            description={`${activeTab} ${config.emptyRecordDescription}`}
          />
        </div>
      </section>
    </div>
  );
}
