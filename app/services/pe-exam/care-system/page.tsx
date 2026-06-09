import type { Metadata } from "next";
import Link from "next/link";
import styles from "../PeExamCare.module.css";
import slideStyles from "../PeExamSlide.module.css";
import { peExamDetailPages } from "../peExamData";
import { serviceItems, site } from "../../../_components/siteData";

const item = serviceItems[3];

const careSlugs = ["admission-map", "record-board", "training-block", "condition-guard", "parent-report", "final-simulation"];
const carePages = peExamDetailPages.filter((page) => careSlugs.includes(page.slug));

const careFlow = [
  ["01", "목표 대학 기준 설정", "지원 가능성을 먼저 나누고 실기 기록이 어디까지 올라와야 하는지 기준을 잡습니다."],
  ["02", "기록·컨디션 동시 관리", "기록만 올리는 방식이 아니라 통증, 피로도, 회복 상태까지 함께 봅니다."],
  ["03", "주간 훈련 블록 운영", "측정, 보정, 강화, 실전 루틴을 주 단위로 나누어 관리합니다."],
  ["04", "상담 후 개인 시스템 연결", "로그인 안정화 후 학생별 기록표와 리포트가 연결되는 구조로 확장합니다."],
] as const;

export const metadata: Metadata = {
  title: "케어 시스템 | RePERFORMANCE 체대입시",
  description: "RePERFORMANCE 체대입시의 목표 대학 전략, 실기 기록, 훈련, 컨디션, 리포트, 실전 시뮬레이션 관리 구조입니다.",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PeExamCareSystemPage() {
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
          <p className="eyebrow light-text">CARE SYSTEM</p>
          <h1>체대입시는 기록을 올리는 것보다, 관리 기준을 먼저 세워야 합니다.</h1>
          <p>
            리퍼포먼스 체대입시 케어 시스템은 목표 대학, 실기 기록, 훈련 블록, 컨디션, 보호자 리포트, 실전 시뮬레이션을
            하나의 흐름으로 연결합니다.
          </p>
          <div className="button-row">
            <Link className="button pe-hero-primary" href={item.applyHref}>
              상담 신청
            </Link>
            <Link className="button pe-hero-secondary" href="/services/pe-exam/admission-info">
              입시정보 보기
            </Link>
          </div>
        </div>
      </section>

      <section className={cx("section", slideStyles.slidePanel, slideStyles.slideSection, styles.introSection)}>
        <div className={cx("container", styles.introLayout)}>
          <article className={styles.systemIntroPanel}>
            <p className="eyebrow">CARE FLOW</p>
            <h2>상담 전에는 구조를 이해하고, 상담 후에는 개인 관리로 연결합니다.</h2>
            <div className={styles.usageGrid}>
              {careFlow.map(([number, title, text]) => (
                <div className={styles.usageCard} key={number}>
                  <strong>{number}</strong>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </article>
          <aside className={styles.nextSystemPanel}>
            <p className="eyebrow light-text">LOGIN READY</p>
            <h2>개인별 대시보드로 확장될 수 있도록 미리 분리해 둔 시스템입니다.</h2>
            <ul>
              <li>학생별 목표 대학과 지원 전략</li>
              <li>종목별 기록 변화와 약점</li>
              <li>주간 훈련과 컨디션 체크</li>
              <li>보호자 공유 리포트</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className={cx("section", slideStyles.slidePanel, slideStyles.slideSection, styles.systemOverview)}>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">MANAGEMENT PAGES</p>
            <h2>케어 시스템은 6개의 관리 페이지로 나누어 확인합니다.</h2>
            <p>학생이 지금 무엇을 준비해야 하는지 한 번에 이해하도록, 각 관리 항목을 페이지별로 분리했습니다.</p>
          </div>
          <div className={styles.hubGrid}>
            {carePages.map((page) => (
              <Link className={styles.hubCard} href={`/services/pe-exam/${page.slug}`} key={page.slug}>
                <p>{page.label}</p>
                <h3>{page.title}</h3>
                <span>{page.description}</span>
                <strong>관리 페이지 보기</strong>
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
