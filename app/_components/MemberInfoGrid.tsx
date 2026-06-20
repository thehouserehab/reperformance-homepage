import type { WorkspaceGroup } from "./workspaceTypes";
import styles from "./WorkspaceShell.module.css";

type MemberInfoGridProps = {
  groups: readonly WorkspaceGroup[];
};

export function MemberInfoGrid({ groups }: MemberInfoGridProps) {
  return (
    <div className={styles.infoGroupGrid}>
      {groups.map((group) => (
        <section className={styles.infoGroup} key={group.title} aria-labelledby={`${group.title}-title`}>
          <h2 id={`${group.title}-title`}>{group.title}</h2>
          <dl className={styles.infoGrid}>
            {group.values.map((item) => (
              <div className={styles.infoItem} key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
                {item.hint && <p>{item.hint}</p>}
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
