import type { Metadata } from "next";
import Link from "next/link";
import publicStyles from "./PeExamPublic.module.css";
import { site } from "../../_components/siteData";

export const metadata: Metadata = {
  title: "체대입시 공개 안내 | RePERFORMANCE",
  description:
    "체대입시 정보, 실기 준비 기준, 상담 흐름을 확인하는 RePERFORMANCE 체대입시 공개 페이지입니다.",
};

const admissionCards = [
  {
    label: "입시 일정",
    title: "수시·정시 흐름 확인",
    text: "원서 접수, 전형, 실기처럼 놓치기 쉬운 일정을 공식 안내와 함께 확인하는 기준을 제공합니다.",
    href: "/pe-exam#schedule",
    action: "자세히 보기",
  },
  {
    label: "대학별 정보",
    title: "모집요강 확인 항목",
    text: "대학과 전형별로 실기 종목, 반영 항목, 확인해야 할 내용을 상담 전에 구분합니다.",
    href: "/pe-exam#universities",
    action: "자세히 보기",
  },
] as const;

const careCards = [
  {
    label: "준비 방향",
    title: "목표와 현재 상황 정리",
    text: "상담 전 목표 대학, 실기 종목, 준비 시간처럼 필요한 기준을 먼저 정리합니다.",
    href: "/pe-exam#roadmap",
  },
  {
    label: "실기 종목",
    title: "종목별 준비 요소 확인",
    text: "실기 종목별로 준비 전 확인할 요소와 기본적인 훈련 방향을 안내합니다.",
    href: "/pe-exam#practicals",
  },
  {
    label: "기록 기준표",
    title: "공식 모집요강 기준 확인",
    text: "기록 기준은 대학과 연도에 따라 달라집니다. 최신 정보를 확인하는 방법을 안내합니다.",
    href: "/pe-exam#standards",
  },
  {
    label: "부상 방지",
    title: "무리한 준비 전 주의사항",
    text: "현재 운동량과 불편한 움직임을 상담에서 확인하고, 필요한 주의사항을 안내합니다.",
    href: "/pe-exam#injury-prevention",
  },
] as const;

const roleItems = [
  {
    label: "INFO CHECK",
    title: "정보 확인",
    text: "대학별 정보, 전형 일정, 실기 종목을 공개 정보에서 먼저 확인합니다.",
  },
  {
    label: "CONSULT GUIDE",
    title: "상담 정리",
    text: "목표 대학과 현재 준비 상황을 바탕으로 필요한 운동 방향을 상담에서 확인합니다.",
  },
  {
    label: "NORE MANAGEMENT",
    title: "NORE 관리",
    text: "학생별 기록, 수업, 메모, 일정은 상담 후 NORE에서 관리합니다.",
  },
] as const;

const roadmap = [
  ["01", "공개 정보 확인", "대학별 정보, 전형 일정, 실기 종목을 먼저 확인합니다."],
  ["02", "상담 방향 정리", "목표와 준비 상황을 바탕으로 필요한 상담과 운동 방향을 정리합니다."],
  ["03", "NORE 학생관리 연결", "상담 후 학생별 목표, 기록, 수업, 메모, 일정은 NORE에서 관리합니다."],
] as const;

const consultSteps = [
  ["01", "상담 신청", "목표 대학, 실기 종목, 현재 준비 상황을 신청서에 남깁니다."],
  ["02", "사전 확인", "운동 전 확인이 필요한 사항과 상담 내용을 함께 정리합니다."],
  ["03", "NORE 이용 안내", "상담 후 필요한 경우 학생별 관리와 일정 확인 방법을 안내합니다."],
] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PeExamServicePage() {
  return (
    <main className={publicStyles.publicPage}>
      <header className="pe-standalone-nav" aria-label="RePERFORMANCE 체대입시">
        <div className="container pe-standalone-nav-inner">
          <Link
            href="/services/pe-exam"
            className="pe-standalone-brand"
            aria-label="RePERFORMANCE 체대입시 공개 페이지"
          >
            <strong>RePERFORMANCE</strong>
            <span>체대입시</span>
          </Link>
          <nav className="pe-standalone-actions" aria-label="체대입시 페이지 섹션">
            <Link href="#admission-info">입시정보</Link>
            <Link href="#care-system">준비 기준</Link>
            <Link href="#system-roadmap">관리 안내</Link>
            <Link href="#consult-flow">상담 신청</Link>
          </nav>
        </div>
      </header>

      <section className={publicStyles.publicHero}>
        <div className={`container ${publicStyles.publicHeroInner}`}>
          <div className={publicStyles.publicHeroText}>
            <p className="eyebrow light-text">REPERFORMANCE PE EXAM</p>
            <h1>
              체대입시 준비를 한눈에 이해하고,
              <br />
              필요한 관리를 연결합니다.
            </h1>
            <p>
              대학별 정보와 실기 준비 기준은 RePERFORMANCE 홈페이지에서 안내합니다. 학생별 목표
              대학, 실기 기록, 수업 기록, 상담 메모, 입시 일정은 상담 후 NORE에서 관리합니다.
            </p>
            <div className={publicStyles.heroActions}>
              <Link className="button pe-hero-primary" href="/apply?service=pe-exam">
                체대입시 상담 신청
              </Link>
              <Link className="button pe-hero-secondary" href="/pe-exam">
                체대입시 정보 허브
              </Link>
            </div>
          </div>

          <div className={publicStyles.heroStats} aria-label="체대입시 역할 안내">
            <div>
              <strong>INFO</strong>
              <span>대학·전형·실기 정보 확인</span>
            </div>
            <div>
              <strong>CONSULT</strong>
              <span>준비 방향과 운동 상담</span>
            </div>
            <div>
              <strong>NORE</strong>
              <span>학생별 기록과 일정 관리</span>
            </div>
          </div>
        </div>
      </section>

      <section className={cx("section", publicStyles.roleSplitSection)}>
        <div className="container">
          <div className={publicStyles.sectionHead}>
            <p className="eyebrow">HOW IT CONNECTS</p>
            <h2>공개 정보, 상담, 학생별 관리를 구분합니다.</h2>
            <p>
              RePERFORMANCE 홈페이지는 체대입시 공통 정보와 상담 신청을 제공합니다. 학생별 목표,
              기록, 수업, 메모와 일정은 상담 후 NORE에서 관리합니다.
            </p>
          </div>
          <div className={publicStyles.roleSplitGrid}>
            {roleItems.map((item) => (
              <article className={publicStyles.roleSplitCard} key={item.label}>
                <p>{item.label}</p>
                <h3>{item.title}</h3>
                <span>{item.text}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="admission-info" className={cx("section", publicStyles.publicInfoSection)}>
        <div className="container">
          <div className={publicStyles.sectionHead}>
            <p className="eyebrow">ADMISSION INFO</p>
            <h2>입시정보는 상담 전에 먼저 확인합니다.</h2>
            <p>
              수시, 정시, 실기 일정과 대학별 모집요강은 공개 정보로 확인할 수 있습니다. 학생별
              지원 방향은 상담 후 별도로 안내합니다.
            </p>
          </div>
          <div className={publicStyles.infoGrid}>
            {admissionCards.map((card) => (
              <Link className={publicStyles.infoCard} href={card.href} key={card.href}>
                <p>{card.label}</p>
                <h3>{card.title}</h3>
                <span>{card.text}</span>
                <strong>{card.action}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="care-system" className={cx("section", publicStyles.publicCareSection)}>
        <div className="container">
          <div className={publicStyles.sectionHead}>
            <p className="eyebrow">PREPARATION GUIDE</p>
            <h2>공개 페이지에서는 준비 기준을 정리합니다.</h2>
            <p>
              학생별 기록을 홈페이지에 입력하지 않습니다. 공통 정보와 상담 전 확인할 기준을
              안내하고, 학생별 관리는 NORE에서 이어집니다.
            </p>
          </div>
          <div className={publicStyles.careGrid}>
            {careCards.map((card) => (
              <Link className={publicStyles.careCard} href={card.href} key={card.href}>
                <p>{card.label}</p>
                <h3>{card.title}</h3>
                <span>{card.text}</span>
                <strong>자세히 보기</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="system-roadmap" className={cx("section", publicStyles.roadmapSection)}>
        <div className="container">
          <div className={publicStyles.sectionHead}>
            <p className="eyebrow light-text">SYSTEM ROADMAP</p>
            <h2>공개 안내, 상담, 학생별 관리를 분리합니다.</h2>
            <p>
              RePERFORMANCE 홈페이지는 정보와 상담을 담당합니다. 학생별 관리 항목은 상담 후
              NORE에서 확인합니다.
            </p>
          </div>
          <div className={publicStyles.roadmapGrid}>
            {roadmap.map(([number, title, text]) => (
              <article className={publicStyles.roadmapCard} key={number}>
                <p>{number}</p>
                <h3>{title}</h3>
                <span>{text}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="consult-flow" className={cx("section", publicStyles.consultFlowSection)}>
        <div className={cx("container", publicStyles.consultFlowGrid)}>
          <div className={publicStyles.consultCopy}>
            <p className="eyebrow light-text">CONSULT FLOW</p>
            <h2>상담 신청부터 이후 관리 안내까지 연결합니다.</h2>
            <p>
              상담 신청 후 필요한 확인 사항과 준비 방향을 정리합니다. 상담이 이어지는 학생의
              목표, 기록, 수업과 일정은 NORE에서 관리합니다.
            </p>
            <div className={publicStyles.consultActions}>
              <div className={publicStyles.primaryActions}>
                <Link className="button pe-hero-primary" href="/apply?service=pe-exam">
                  체대입시 상담 신청
                </Link>
                <Link className="button pe-hero-secondary" href="/pe-exam">
                  체대입시 정보 허브 보기
                </Link>
                <Link className="button pe-hero-secondary" href="/apply?service=pe-exam">
                  PAR-Q 설문까지 진행
                </Link>
              </div>
              <a
                className={publicStyles.instagramCard}
                href={site.instagramHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>보조 문의</span>
                <strong>Instagram DM</strong>
                <small>간단한 문의가 필요한 경우에만 이용해 주세요.</small>
              </a>
            </div>
          </div>

          <div className={publicStyles.consultStepList}>
            {consultSteps.map(([number, title, text]) => (
              <article key={number}>
                <strong>{number}</strong>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="pe-standalone-footer">
        <div className="container pe-standalone-footer-inner">
          <strong>RePERFORMANCE 체대입시</strong>
          <span>{site.address}</span>
          <Link href="/apply?service=pe-exam">상담 신청</Link>
        </div>
      </footer>
    </main>
  );
}
