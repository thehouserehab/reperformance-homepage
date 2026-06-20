import styles from "./WorkspaceShell.module.css";

type EmptyRecordStateProps = {
  title: string;
  description: string;
};

export function EmptyRecordState({ title, description }: EmptyRecordStateProps) {
  return (
    <div className={styles.emptyRecordState}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
