import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PeExamScrollController from "./PeExamScrollController";
import styles from "./PeExamCare.module.css";
import publicStyles from "./PeExamPublic.module.css";
import { peExamDetailPages } from "./peExamData";
import { site } from "../../_components/siteData";

export const metadata: Metadata = {
  title: "체대입시 공개 안내 | RePERFORMANCE",
  description:
    "입시정보, 실기 기록, 훈련 계획, 컨디션 관리 흐름을 상담 전 확인하는 RePERFORMANCE 체대입시 공개 페이지입니다.",
};

const careSlugs = ["admission-map", "record-board", "training-block", "condition-guard", "parent-report", "final-simulation"];
const infoSlugs = ["admission-calendar", "university-guides"];

const carePages = peExamDetailPages.filter((page) => careSlugs.includes(page.slug));
const infoPages = peExamDetailPages.filter((page) => infoSlugs.includes(page.slug));

const roadmap = [
  ["PUBLIC", "공개 정보 확인", "입시 일정, 모집요강, 관리 항목을 상담 전에 먼저 확인합니다."],
  ["CONSULT", "상담 기준 정리", "목표 대학, 현재 성적, 실기 기록, 운동 가능 시간을 기준으로 상담합니다."],
  ["SHELL", "학생용 화면 준비", "상담 후 사용할 목표 대학, 기록, 훈련, 컨디션 메뉴 구조를 분리해 둡니다."],
] as const;

const consultSteps = [
  ["01", "상담 신청", "학생 정보와 목표 대학, 실기 종목, 현재 기록을 남깁니다."],
  ["02", "현재 위치 확인", "성적, 기록, 몸 상태, 운동 가능 시간을 함께 확인합니다."],
  ["03", "관리 방향 제안", "입시정보와 훈련 계획을 분리하지 않고 한 흐름으로 정리합니다."],
] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PeExamPage() {
  return (
    <main className={publicStyles.publicPage} data-pe-scroll>
      <PeExamScrollController />
      <header className="pe-standalone-nav" aria-label="RePERFORMANCE 체대입시">
        <div className="container pe-standalone-nav-inner">
          <Link href="/services/pe-exam" className="pe-standalone-brand" aria-label="RePERFORMANCE 체대입시 공개 페이지">
            <strong>RePERFORMANCE</strong>
            <span>체대입시</span>
          </Link>
          <div className="pe-standalone-actions">
            <Link href="#admission-info">입시정보</Link>
            <Link href="#care-system">케어 시스템</Link>
            <Link href="#system-roadmap">관리 로드맵</Link>
            <Link href="#consult-flow">상담 신청</Link>
          </div>
        </div>
      </header>

      <section className={cx(publicStyles.publicHero, publicStyles.snapPanel)} data-pe-panel>
        <div className={publicStyles.heroMedia} aria-hidden="true">
          <Image
            src="/images/coach-card.jpg"
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 44vw"
            priority
          />
        </div>
        <div className={cx("container", publicStyles.publicHeroInner)}>
          <div className={publicStyles.publicHeroText}>
            <p className="eyebrow light-text">PE EXAM PUBLIC GUIDE</p>
            <h1>
              체대입시 준비를 한눈에 이해하고,
              <br />
              필요한 관리를 연결합니다.
            </h1>
            <p>
              목표 대학, 실기 기록, 훈련 상태, 입시 일정을 따로 보지 않고 하나의 흐름으로 관리할 수 있도록 정리합니다.
            </p>
            <div className="button-row">
              <Link className="button pe-hero-primary" href="/apply?service=pe-exam">
                체대입시 상담 신청
              </Link>
              <Link className="button pe-hero-secondary" href="#admission-info">
                입시정보 보기
              </Link>
            </div>
          </div>
          <div className={styles.heroMetrics} aria-label="체대입시 관리 핵심">
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
              <span>상담 후 개인 화면 연결</span>
            </div>
          </div>
        </div>
      </section>

      <section id="admission-info" className={cx("section", publicStyles.publicInfoSection, publicStyles.snapPanel)} data-pe-panel>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">ADMISSION INFO</p>
            <h2>입시정보는 상담 전에 먼저 정리합니다.</h2>
            <p>
              수시, 정시, 실기 일정과 대학별 모집요강은 공용 정보로 제공합니다. 실제 학생별 판단이나 원서 전략은 상담
              후 별도로 정리합니다.
            </p>
          </div>
          <div className={styles.infoFocusGrid}>
            {infoPages.map((page) => (
              <Link className={cx(styles.infoFocusCard, publicStyles.compactInfoCard)} href={`/services/pe-exam/${page.slug}`} key={page.slug}>
                <p>{page.label}</p>
                <h3>{page.title}</h3>
                <span>{page.description}</span>
                <strong>입시정보 보기</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="care-system" className={cx("section", publicStyles.publicCareSection, publicStyles.snapPanel)} data-pe-panel>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">CARE SYSTEM</p>
            <h2>실기 기록만 보지 않고 관리 항목을 나눕니다.</h2>
            <p>
              목표 대학, 실기 기록, 훈련 블록, 컨디션, 보호자 공유, 실전 시뮬레이션까지 상담에서 다룰 항목을 공개
              페이지에서 먼저 확인할 수 있습니다.
            </p>
          </div>
          <div className={styles.hubGrid}>
            {carePages.map((page) => (
              <Link className={cx(styles.hubCard, publicStyles.compactHubCard)} href={`/services/pe-exam/${page.slug}`} key={page.slug}>
                <p>{page.label}</p>
                <h3>{page.title}</h3>
                <span>{page.description}</span>
                <strong>관리 페이지 보기</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="system-roadmap" className={cx("section", styles.roadmapSection, publicStyles.anchorSection, publicStyles.snapPanel)} data-pe-panel>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow light-text">SYSTEM ROADMAP</p>
            <h2>공개 정보와 내부 화면을 분리해 운영합니다.</h2>
            <p>
              이 페이지에는 로그인 전 공용 정보만 둡니다. 학생별 기록, 목표 대학, 훈련 계획은 상담 후 내부 시스템
              화면으로 확장하는 구조입니다.
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

      <section id="consult-flow" className={cx("section", publicStyles.consultFlowSection, publicStyles.snapPanel)} data-pe-panel>
        <div className={cx("container", publicStyles.consultFlowGrid)}>
          <div>
            <p className="eyebrow">CONSULT FLOW</p>
            <h2>상담 신청은 현재 위치를 정확히 보는 것부터 시작합니다.</h2>
            <p>
              신청서를 남기면 목표 대학, 현재 성적, 실기 기록, 부상 이력, 운동 가능 시간을 기준으로 상담 방향을
              정리합니다. 실제 개인정보 저장이나 로그인 연동은 이 공개 페이지에서 구현하지 않습니다.
            </p>
            <div className="button-row">
              <Link className="button pe-hero-primary" href="/apply?service=pe-exam">
                체대입시 상담 신청
              </Link>
              <Link className="button pe-hero-secondary" href="/apply?service=pe-exam">
                PAR-Q 설문까지 진행
              </Link>
              <a className={publicStyles.supportLink} href={site.instagramHref} target="_blank" rel="noopener noreferrer">
                Instagram DM
              </a>
            </div>
          </div>
          <div className={publicStyles.consultStepList}>
            {consultSteps.map(([number, title, text]) => (
              <article key={number}>
                <strong>{number}</strong>
                <h3>{title}</h3>
                <p>{text}</p>
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
