import type { ProfileHighlight } from "./workspaceTypes";
import styles from "./WorkspaceShell.module.css";

type MemberProfileCardProps = {
  audienceLabel: string;
  memberName: string;
  memberId: string;
  status: string;
  summary: string;
  highlights: readonly ProfileHighlight[];
};

export function MemberProfileCard({
  audienceLabel,
  memberName,
  memberId,
  status,
  summary,
  highlights,
}: MemberProfileCardProps) {
  return (
    <section className={styles.profileCard} aria-labelledby="profile-title">
      <div className={styles.profileIdentity}>
        <p className={styles.profileEyebrow}>{audienceLabel}</p>
        <div className={styles.profileTitleRow}>
          <div>
            <h1 id="profile-title">{memberName}</h1>
            <p className={styles.memberId}>{memberId}</p>
          </div>
          <span className={styles.profileStatus}>{status}</span>
        </div>
        <p className={styles.profileSummary}>{summary}</p>
      </div>
      <dl className={styles.profileHighlights}>
        {highlights.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
