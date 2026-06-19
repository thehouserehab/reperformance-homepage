import type { Metadata } from "next";
import Link from "next/link";
import publicStyles from "./PeExamPublic.module.css";
import { site } from "../../_components/siteData";

export const metadata: Metadata = {
  title: "체대입시 공개 안내 | RePERFORMANCE",
  description:
    "입시정보, 실기 기록, 훈련 계획, 컨디션 체크를 상담 전부터 한 흐름으로 확인하는 RePERFORMANCE 체대입시 공개 페이지입니다.",
};

const admissionCards = [
  {
    label: "입시 일정",
    title: "수시·정시 흐름 확인",
    text: "원서 접수, 수능, 실기 전형처럼 놓치기 쉬운 일정을 먼저 정리합니다.",
    href: "/services/pe-exam/admission-calendar",
    action: "일정 보기",
  },
  {
    label: "모집요강",
    title: "대학별 기준 정리",
    text: "목표 대학의 실기 종목, 반영 비율, 확인해야 할 자료를 상담 전에 구분합니다.",
    href: "/services/pe-exam/university-guides",
    action: "자료 보기",
  },
] as const;

const careCards = [
  {
    label: "목표 대학",
    title: "지원 방향 정리",
    text: "희망 대학과 준비 기준을 나누어 상담 방향을 정리합니다.",
    href: "/services/pe-exam/admission-map",
  },
  {
    label: "실기 기록",
    title: "종목별 기록 확인",
    text: "현재 기록과 목표 기록을 분리해 변화 흐름을 보기 쉽게 정리합니다.",
    href: "/services/pe-exam/record-board",
  },
  {
    label: "훈련 계획",
    title: "주간 블록 구성",
    text: "기초 체력, 종목 기술, 회복을 무리 없이 이어지는 계획으로 나눕니다.",
    href: "/services/pe-exam/training-block",
  },
  {
    label: "컨디션 체크",
    title: "주의사항 확인",
    text: "운동 전후 몸 상태와 부담되는 움직임을 확인해 훈련 방향에 반영합니다.",
    href: "/services/pe-exam/condition-guard",
  },
] as const;

const roadmap = [
  ["01", "공개 정보 확인", "입시 일정과 관리 항목을 로그인 없이 먼저 확인합니다."],
  ["02", "상담 기준 정리", "목표 대학, 현재 기록, 운동 가능 시간, 주의사항을 함께 확인합니다."],
  ["03", "관리 방향 안내", "상담 후 목표 대학, 실기 기록, 훈련 계획을 어떻게 관리할지 안내합니다."],
] as const;

const consultSteps = [
  ["01", "상담 신청", "목표 대학, 실기 종목, 현재 준비 상황을 신청서에 남깁니다."],
  ["02", "PAR-Q 확인", "운동 전 확인이 필요한 주의사항을 홈페이지 설문에서 함께 체크합니다."],
  ["03", "방향 안내", "상담 후 필요한 관리 방식과 훈련 방향을 차례대로 안내합니다."],
] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PeExamPage() {
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
            <Link href="#care-system">케어 시스템</Link>
            <Link href="#system-roadmap">로드맵</Link>
            <Link href="#consult-flow">상담 신청</Link>
          </nav>
        </div>
      </header>

      <section className={publicStyles.publicHero}>
        <div className={`container ${publicStyles.publicHeroInner}`}>
          <div className={publicStyles.publicHeroText}>
            <p className="eyebrow light-text">PE EXAM PUBLIC GUIDE</p>
            <h1>
              체대입시 준비를 한눈에 이해하고,
              <br />
              필요한 관리를 연결합니다.
            </h1>
            <p>
              목표 대학, 실기 기록, 훈련 상태, 입시 일정을 따로 보지 않고 하나의
              흐름으로 관리할 수 있도록 정리합니다.
            </p>
            <div className={publicStyles.heroActions}>
              <Link className="button pe-hero-primary" href="/apply?service=pe-exam">
                체대입시 상담 신청
              </Link>
              <Link className="button pe-hero-secondary" href="#admission-info">
                입시정보 보기
              </Link>
            </div>
          </div>

          <div className={publicStyles.heroStats} aria-label="체대입시 관리 흐름">
            <div>
              <strong>INFO</strong>
              <span>일정과 모집요강 확인</span>
            </div>
            <div>
              <strong>CARE</strong>
              <span>기록과 컨디션 관리</span>
            </div>
            <div>
              <strong>PLAN</strong>
              <span>상담 후 관리 방향 정리</span>
            </div>
          </div>
        </div>
      </section>

      <section id="admission-info" className={cx("section", publicStyles.publicInfoSection)}>
        <div className="container">
          <div className={publicStyles.sectionHead}>
            <p className="eyebrow">ADMISSION INFO</p>
            <h2>입시정보는 상담 전에 먼저 정리합니다.</h2>
            <p>
              수시, 정시, 실기 일정과 대학별 모집요강은 공개 정보로 먼저 확인할 수
              있습니다. 실제 지원 판단과 개인별 전략은 상담 후 별도로 정리합니다.
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
            <p className="eyebrow">CARE SYSTEM</p>
            <h2>실기 기록만 보지 않고 준비 흐름을 함께 봅니다.</h2>
            <p>
              목표 대학, 실기 기록, 훈련 계획, 컨디션 체크를 따로 흩어두지 않고
              상담과 관리가 이어지도록 항목을 나누어 보여줍니다.
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
            <h2>공개 안내와 상담 이후 관리를 분리합니다.</h2>
            <p>
              이 페이지에는 상담 전 확인할 공용 정보만 담습니다. 학생별 목표 대학, 기록,
              훈련 계획은 상담 후 별도로 정리합니다.
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
            <h2>상담은 신청서와 PAR-Q 확인부터 시작합니다.</h2>
            <p>
              신청서를 남기면 목표 대학, 현재 기록, 운동 가능 시간, 주의사항을
              기준으로 상담 방향을 정리합니다. 실제 학생별 기록 관리는 상담 후 안내되는
              방식으로 진행합니다.
            </p>
            <div className={publicStyles.consultActions}>
              <div className={publicStyles.primaryActions}>
                <Link className="button pe-hero-primary" href="/apply?service=pe-exam">
                  체대입시 상담 신청
                </Link>
                <Link className="button pe-hero-secondary" href="/apply?service=pe-exam">
                  PAR-Q까지 진행
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
                <small>간단한 확인이 필요할 때 사용합니다.</small>
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
