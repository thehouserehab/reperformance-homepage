import type { Metadata } from "next";
import Link from "next/link";
import styles from "../PeExamCare.module.css";
import slideStyles from "../PeExamSlide.module.css";
import { peExamDetailPages } from "../peExamData";
import { serviceItems, site } from "../../../_components/siteData";

const item = serviceItems[3];

const infoSlugs = ["admission-calendar", "university-guides"];
const infoPages = peExamDetailPages.filter((page) => infoSlugs.includes(page.slug));

const infoFlow = [
  ["01", "전형 일정 확인", "수시, 수능, 정시, 실기 전형의 큰 흐름을 먼저 잡습니다."],
  ["02", "대학별 모집요강 확인", "목표 대학의 공식 모집요강과 실기 반영 방식을 확인합니다."],
  ["03", "학생 기록과 연결", "상담 후 목표 대학 기준을 학생의 실기 기록표와 연결합니다."],
  ["04", "일정 변경 대응", "모집요강과 전형 일정은 변경될 수 있어 주기적으로 다시 확인합니다."],
] as const;

export const metadata: Metadata = {
  title: "입시정보 | RePERFORMANCE 체대입시",
  description: "체대입시 일정 캘린더와 대학별 모집요강 링크를 확인하는 RePERFORMANCE 체대입시 입시정보 페이지입니다.",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PeExamAdmissionInfoPage() {
  return (
    <main className={cx("pe-standalone-page", "pe-slide-snap", styles.page, slideStyles.slidePage)}>
      <header className="pe-standalone-nav" aria-label="RePERFORMANCE 체대입시">
        <div className="container pe-standalone-nav-inner">
          <Link href="/pe-exam" className="pe-standalone-brand" aria-label="RePERFORMANCE 체대입시 홈">
            <strong>RePERFORMANCE</strong>
            <span>체대입시</span>
          </Link>
          <div className="pe-standalone-actions">
            <Link href="/services/pe-exam/admission-info">입시정보</Link>
            <Link href="/services/pe-exam/care-system">케어 시스템</Link>
            <Link href={item.applyHref}>상담 신청</Link>
          </div>
        </div>
      </header>

      <section className={cx(styles.detailHero, slideStyles.slidePanel, slideStyles.slideHero)}>
        <div className="container">
          <Link className={styles.backLink} href="/services/pe-exam">
            체대입시 메인으로
          </Link>
          <p className="eyebrow light-text">ADMISSION INFO</p>
          <h1>입시정보는 흩어져 있으면 놓치고, 정리되어 있으면 전략이 됩니다.</h1>
          <p>
            체대입시 일정과 대학별 모집요강을 따로 분리해 학생과 보호자가 필요한 정보를 빠르게 확인하도록 구성했습니다.
          </p>
          <div className="button-row">
            <Link className="button pe-hero-primary" href="/services/pe-exam/admission-calendar">
              일정 캘린더 보기
            </Link>
            <Link className="button pe-hero-secondary" href="/services/pe-exam/university-guides">
              모집요강 링크 보기
            </Link>
          </div>
        </div>
      </section>

      <section className={cx("section", slideStyles.slidePanel, slideStyles.slideSection, styles.introSection)}>
        <div className={cx("container", styles.introLayout)}>
          <article className={styles.systemIntroPanel}>
            <p className="eyebrow">INFO FLOW</p>
            <h2>정보 확인은 상담과 기록 관리로 이어질 때 의미가 있습니다.</h2>
            <div className={styles.usageGrid}>
              {infoFlow.map(([number, title, text]) => (
                <div className={styles.usageCard} key={number}>
                  <strong>{number}</strong>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </article>
          <aside className={styles.nextSystemPanel}>
            <p className="eyebrow light-text">UPDATE SYSTEM</p>
            <h2>일정과 모집요강은 상담 기준표에 연결될 수 있도록 관리합니다.</h2>
            <ul>
              <li>수시·정시 주요 일정 확인</li>
              <li>대학별 실기 종목과 반영비율 확인</li>
              <li>목표 대학별 우선순위 정리</li>
              <li>학생별 기록표와 상담 메모 연결</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className={cx("section", slideStyles.slidePanel, slideStyles.slideSection, styles.infoSection)}>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">INFORMATION PAGES</p>
            <h2>입시정보는 2개의 핵심 페이지에서 확인합니다.</h2>
            <p>긴 설명보다 바로 확인해야 할 일정과 공식 자료로 빠르게 이동할 수 있게 정리했습니다.</p>
          </div>
          <div className={styles.infoFocusGrid}>
            {infoPages.map((page) => (
              <Link className={styles.infoFocusCard} href={`/services/pe-exam/${page.slug}`} key={page.slug}>
                <p>{page.label}</p>
                <h3>{page.title}</h3>
                <span>{page.description}</span>
                <strong>입시정보 보기</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="pe-standalone-footer">
        <div className="container pe-standalone-footer-inner">
          <strong>RePERFORMANCE 체대입시</strong>
          <span>{site.address}</span>
          <Link href={item.applyHref}>상담 신청</Link>
        </div>
      </footer>
    </main>
  );
}
