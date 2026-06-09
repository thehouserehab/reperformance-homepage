import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./PeExamCare.module.css";
import slideStyles from "./PeExamSlide.module.css";
import { peExamDetailPages } from "./peExamData";
import { serviceItems, site } from "../../_components/siteData";

const item = serviceItems[3];

export const metadata: Metadata = {
  title: "RePERFORMANCE 체대입시",
  description:
    "체대입시생의 목표 대학, 실기 기록, 훈련, 컨디션, 입시정보를 페이지별로 확인하는 RePERFORMANCE 체대입시 관리 시스템입니다.",
};

const careSlugs = ["admission-map", "record-board", "training-block", "condition-guard", "parent-report", "final-simulation"];
const infoSlugs = ["admission-calendar", "university-guides"];

const carePages = peExamDetailPages.filter((page) => careSlugs.includes(page.slug));
const infoPages = peExamDetailPages.filter((page) => infoSlugs.includes(page.slug));

const usageSteps = [
  ["01", "관리 흐름 이해", "목표 대학, 기록, 훈련, 컨디션, 리포트가 어떻게 연결되는지 먼저 확인합니다."],
  ["02", "필요한 페이지 선택", "입시정보와 케어 시스템을 나눠서 보고, 지금 필요한 항목으로 바로 이동합니다."],
  ["03", "상담과 설문 연결", "상담 신청 또는 PAR-Q 설문 후 학생의 현재 위치를 기준으로 관리 방향을 잡습니다."],
  ["04", "개인 시스템 준비", "로그인 안정화 후 학생별 기록판, 주간 리포트, 목표 대학 관리로 확장할 예정입니다."],
] as const;

const roadmap = [
  ["PUBLIC", "공개 안내 페이지", "학생과 보호자가 리퍼포먼스 체대입시 관리 방식을 먼저 이해합니다."],
  ["CONSULT", "상담·설문 데이터", "목표 대학, 현재 성적, 실기 기록, 몸 상태를 상담 기준으로 정리합니다."],
  ["PRIVATE", "개인 맞춤 대시보드", "로그인 안정화 후 학생별 기록, 일정, 리포트가 연결되는 구조로 확장합니다."],
] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PeExamPage() {
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

      <section className={cx("pe-motivation-hero", slideStyles.slidePanel, slideStyles.slideHero)}>
        <Image
          src="/images/coach-card.jpg"
          alt="체대입시 실기 준비를 위한 RePERFORMANCE 트레이닝 현장"
          fill
          sizes="100vw"
          className="pe-motivation-bg"
          priority
        />
        <div className="pe-motivation-scrim" />
        <div className="container pe-motivation-content">
          <p className="eyebrow light-text">REPERFORMANCE PE EXAM SYSTEM</p>
          <h1>체대입시 준비를 한눈에 이해하고, 필요한 관리 페이지로 바로 들어갑니다.</h1>
          <p className="lead">
            이 페이지는 학생과 보호자가 리퍼포먼스 체대입시 관리 시스템을 이해하는 입구입니다. 자세한 입시정보와 관리
            항목은 페이지별로 나눠 확인하고, 상담 후에는 개인별 관리 시스템으로 이어질 수 있도록 구조를 정비했습니다.
          </p>
          <div className="button-row">
            <Link className="button pe-hero-primary" href="/services/pe-exam/care-system">
              케어 시스템 보기
            </Link>
            <Link className="button pe-hero-secondary" href="/services/pe-exam/admission-info">
              입시정보 보기
            </Link>
          </div>
          <div className={styles.heroMetrics} aria-label="체대입시 관리 핵심">
            <div>
              <strong>GUIDE</strong>
              <span>공개형 안내 페이지</span>
            </div>
            <div>
              <strong>CARE</strong>
              <span>상담 기반 관리 흐름</span>
            </div>
            <div>
              <strong>READY</strong>
              <span>개인 시스템 확장 준비</span>
            </div>
          </div>
        </div>
      </section>

      <section className={cx("section", slideStyles.slidePanel, slideStyles.slideSection, styles.introSection)}>
        <div className={cx("container", styles.introLayout)}>
          <article className={styles.systemIntroPanel}>
            <p className="eyebrow">HOW TO USE</p>
            <h2>처음 방문한 학생은 이렇게 활용하면 됩니다.</h2>
            <div className={styles.usageGrid}>
              {usageSteps.map(([number, title, text]) => (
                <div className={styles.usageCard} key={number}>
                  <strong>{number}</strong>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </article>
          <aside className={styles.nextSystemPanel}>
            <p className="eyebrow light-text">NEXT SYSTEM</p>
            <h2>로그인 안정화 후 학생별 맞춤 관리로 확장합니다.</h2>
            <ul>
              <li>학생별 목표 대학과 지원 전략</li>
              <li>종목별 실기 기록 변화</li>
              <li>주간 훈련과 컨디션 체크</li>
              <li>보호자 공유 리포트</li>
            </ul>
          </aside>
        </div>
      </section>

      <section id="care-system" className={cx("section", slideStyles.slidePanel, slideStyles.slideSection, styles.systemOverview)}>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">CARE SYSTEM</p>
            <h2>상담에서 실제로 사용하는 관리 항목입니다.</h2>
            <p>
              체대입시를 막연한 운동량으로 보지 않고, 목표 대학과 현재 기록을 기준으로 매주 무엇을 관리해야 하는지
              나눠서 확인합니다.
            </p>
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

      <section id="admission-info" className={cx("section", slideStyles.slidePanel, slideStyles.slideSection, styles.infoSection)}>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">ADMISSION INFO</p>
            <h2>입시정보는 따로 모아 빠르게 확인합니다.</h2>
            <p>
              모바일에서도 긴 스크롤을 줄이기 위해 일정과 모집요강은 별도 페이지에서 확인하도록 정리했습니다. 상담 중인
              학생의 목표 대학이 정해지면 이 정보가 개인 관리표와 연결됩니다.
            </p>
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

      <section className={cx("section", slideStyles.slidePanel, slideStyles.slideSection, styles.roadmapSection)}>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow light-text">SYSTEM ROADMAP</p>
            <h2>지금은 안내 페이지, 다음은 개인 맞춤 시스템입니다.</h2>
            <p>
              로그인 기능이 안정화되기 전까지는 누구나 구조를 이해할 수 있는 공개 페이지로 정리하고, 이후 학생별
              데이터가 들어가는 개인 화면으로 확장합니다.
            </p>
          </div>
          <div className={styles.roadmapGrid}>
            {roadmap.map(([label, title, text]) => (
              <article className={styles.roadmapCard} key={label}>
                <p>{label}</p>
                <h3>{title}</h3>
                <span>{text}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={cx("section pe-final-section", slideStyles.slidePanel, slideStyles.slideSection)}>
        <div className="container grid-2">
          <div className="contact-box pe-final-card">
            <p className="eyebrow light-text">FOR STUDENTS</p>
            <h2>학생과 학부모가 먼저 이해해야 할 것은 관리 흐름입니다.</h2>
            <ul>
              <li>내 목표 대학을 기준으로 무엇을 준비해야 하는지</li>
              <li>실기 기록과 몸 상태가 어떻게 연결되는지</li>
              <li>상담 후 어떤 방식으로 개인 관리가 이어지는지</li>
            </ul>
          </div>
          <div className="contact-box">
            <p className="eyebrow">NEXT</p>
            <h2>처음 상담은 현재 위치를 정확히 보는 것부터 시작합니다.</h2>
            <p>
              신청서를 남기면 목표 대학, 현재 성적, 실기 기록, 부상 이력, 운동 가능 시간을 기준으로 상담 방향을
              정리합니다. 이후 로그인 시스템이 안정화되면 학생별 관리 화면으로 연결할 수 있도록 준비하고 있습니다.
            </p>
            <div className="button-row">
              <Link className="button primary" href={item.applyHref}>
                체대입시 상담 신청
              </Link>
              <Link className="button secondary" href="/apply?service=pe-exam">
                PAR-Q 설문까지 진행
              </Link>
            </div>
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
