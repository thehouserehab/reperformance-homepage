import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/SiteChrome";
import styles from "./MemberHub.module.css";

export const metadata: Metadata = {
  title: "회원 안내 | RePERFORMANCE",
  description: "RePERFORMANCE 상담 안내와 내부 회원관리 흐름을 안내합니다.",
  robots: { index: false, follow: false },
};

const noreItems = ["수업 기록", "개인운동", "식단 기록", "메모", "계약", "일정 관리", "AI 채팅·피드백"] as const;

const websiteItems = ["서비스 안내", "상담 신청", "위치·프로그램 확인", "체대입시 정보 제공"] as const;

const memberManagementItems = ["회원별 기록", "수업 일정", "개인운동", "식단", "메모", "계약·잔여 횟수", "AI 피드백"] as const;

const flowSteps = [
  ["01", "상담 신청", "필요한 서비스와 현재 준비 상황을 남깁니다."],
  ["02", "상담 진행", "상담을 통해 서비스 방향과 이후 관리가 필요한지 함께 확인합니다."],
  ["03", "상담 완료 후 관리 안내", "필요한 회원에게 담당 코치가 이후 관리 방식과 기록 흐름을 개별 안내합니다."],
] as const;

export default function MemberPage() {
  return (
    <PageShell>
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div>
            <p className="eyebrow">MEMBER GUIDE</p>
            <h1>상담을 먼저 진행하고, 필요한 회원에게 관리 안내를 드립니다.</h1>
            <p className={styles.lead}>
              RePERFORMANCE 홈페이지에서는 서비스 안내와 상담 신청을 받습니다. 상담을 완료한 뒤 필요한
              회원에게만 담당 코치가 이후 관리 방식과 기록 흐름을 안내해드립니다.
            </p>
            <div className="button-row">
              <Link className="button primary" href="/apply">
                상담 신청하기
              </Link>
            </div>
          </div>
          <aside className={styles.notice} aria-label="회원관리 이용 안내">
            <strong>상담 완료 후 회원관리 안내</strong>
            <p>상담 신청만으로 외부 서비스 가입이 진행되지는 않습니다. 상담을 마친 뒤 필요한 회원에게 담당 코치가 별도로 안내합니다.</p>
          </aside>
        </div>
      </section>

      <section className={`section ${styles.managedSection}`}>
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">MEMBER MANAGEMENT</p>
            <h2>상담 이후 이어지는 관리 항목</h2>
            <p>개인별 정보와 수업 이후의 관리 항목은 상담을 마친 뒤 내부 기록 흐름에 맞춰 안내합니다.</p>
          </div>
          <div className={styles.managedGrid}>
            {noreItems.map((item) => (
              <article className={styles.managedCard} key={item}>
                <span>관리</span>
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
            <h2>홈페이지와 내부 관리의 역할을 나눴습니다.</h2>
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
              <p>내부 관리</p>
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
            <h2>상담을 신청하면, 필요한 다음 단계를 안내해드립니다.</h2>
            <p>상담 완료 후 수업과 개인 관리가 필요한 회원에게만 이후 관리 방식을 전달합니다.</p>
          </div>
          <div className={styles.bottomActions}>
            <Link className="button dark" href="/apply">
              상담 신청하기
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
