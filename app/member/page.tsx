import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/SiteChrome";
import { site } from "../_components/siteData";
import styles from "./MemberHub.module.css";

export const metadata: Metadata = {
  title: "회원 안내 | RePERFORMANCE",
  description: "RePERFORMANCE 상담 안내와 NORE 회원관리 이용 방법을 안내합니다.",
  robots: { index: false, follow: false },
};

const noreItems = ["수업 기록", "개인운동", "식단 기록", "메모", "계약", "일정 관리", "AI 채팅·피드백"] as const;

const websiteItems = ["서비스 안내", "상담 신청", "위치·프로그램 확인", "체대입시 정보 제공"] as const;

const memberManagementItems = ["회원별 기록", "수업 일정", "개인운동", "식단", "메모", "계약·잔여 횟수", "AI 피드백"] as const;

const flowSteps = [
  ["01", "상담 신청", "필요한 서비스와 현재 준비 상황을 남깁니다."],
  ["02", "상담 후 계정 안내", "필요한 경우 회원 계정과 이용 방법을 안내합니다."],
  ["03", "NORE에서 관리", "수업과 개인 관리 항목은 NORE에서 이어집니다."],
] as const;

export default function MemberPage() {
  return (
    <PageShell>
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div>
            <p className="eyebrow">MEMBER GUIDE</p>
            <h1>상담은 RePERFORMANCE에서, 회원관리는 NORE에서 이어집니다.</h1>
            <p className={styles.lead}>
              상담 후 필요한 경우 회원 계정을 안내해드립니다. RePERFORMANCE 홈페이지는 상담 신청과
              서비스 안내를 담당하며, 수업 이후의 회원 관리는 NORE에서 확인합니다.
            </p>
            <div className="button-row">
              <a
                className="button primary"
                href={site.noreMemberHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                NORE 회원관리로 이동
              </a>
              <Link className="button secondary" href="/apply">
                상담 신청하기
              </Link>
            </div>
          </div>
          <aside className={styles.notice} aria-label="회원관리 안내">
            <strong>상담 후 계정 안내</strong>
            <p>수업 기록, 개인운동, 식단, 메모, 계약과 일정은 NORE에서 확인합니다.</p>
          </aside>
        </div>
      </section>

      <section className={`section ${styles.managedSection}`}>
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">MANAGED IN NORE</p>
            <h2>NORE에서 이어지는 관리 항목</h2>
            <p>개인별 정보와 수업 이후의 관리 항목은 홈페이지에 입력하지 않고 NORE에서 확인합니다.</p>
          </div>
          <div className={styles.managedGrid}>
            {noreItems.map((item) => (
              <article className={styles.managedCard} key={item}>
                <span>NORE</span>
                <h3>{item}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.rolesSection}`}>
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">CLEAR ROLES</p>
            <h2>홈페이지와 NORE의 역할을 나눴습니다.</h2>
          </div>
          <div className={styles.roleGrid}>
            <article className={styles.roleCard}>
              <p>RePERFORMANCE 홈페이지</p>
              <h3>처음 방문과 상담 안내</h3>
              <ul>
                {websiteItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className={`${styles.roleCard} ${styles.noreCard}`}>
              <p>NORE</p>
              <h3>수업 이후의 회원 관리</h3>
              <ul>
                {memberManagementItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className={`section ${styles.flowSection}`}>
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow light-text">MEMBER FLOW</p>
            <h2>회원 이용 흐름</h2>
          </div>
          <ol className={styles.flowList}>
            {flowSteps.map(([number, title, text]) => (
              <li key={number}>
                <strong>{number}</strong>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`section ${styles.bottomSection}`}>
        <div className={`container ${styles.bottomInner}`}>
          <div>
            <p className="eyebrow">NEXT STEP</p>
            <h2>상담 전이라면, 서비스부터 확인해 주세요.</h2>
            <p>상담 내용을 바탕으로 필요한 안내와 이후 NORE 이용 방법을 연결합니다.</p>
          </div>
          <div className={styles.bottomActions}>
            <a
              className="button dark"
              href={site.noreMemberHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              NORE 회원관리로 이동
            </a>
            <Link className="button secondary" href="/apply">
              상담 신청하기
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
