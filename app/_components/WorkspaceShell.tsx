import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./WorkspaceShell.module.css";

type WorkspaceShellProps = {
  children: ReactNode;
  sectionLabel: string;
};

export function WorkspaceShell({ children, sectionLabel }: WorkspaceShellProps) {
  return (
    <main className={styles.workspaceRoot}>
      <header className={styles.workspaceHeader}>
        <div className={styles.workspaceHeaderInner}>
          <Link href="/" className={styles.workspaceBrand} aria-label="RePERFORMANCE 공개 홈페이지">
            <span className={styles.workspaceBrandRe}>Re</span>
            <span>PERFORMANCE</span>
          </Link>
          <div className={styles.workspaceContext}>
            <span>{sectionLabel}</span>
            <span className={styles.workspaceStatus}>로그인 후 제공 예정</span>
          </div>
          <Link href="/" className={styles.publicLink}>
            공개 홈페이지
          </Link>
        </div>
      </header>
      <div className={styles.workspaceContent}>{children}</div>
    </main>
  );
}
