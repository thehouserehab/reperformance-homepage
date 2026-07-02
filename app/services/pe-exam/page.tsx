import type { Metadata } from "next";
import Link from "next/link";
import publicStyles from "./PeExamPublic.module.css";
import { site } from "../../_components/siteData";

export const metadata: Metadata = {
  title: "체대입시 상담·관리 안내 | RePERFORMANCE",
  description:
    "입시 자료 제공, 개인별 운동·입시 상담, 내부 기록 기반 케어로 이어지는 RePERFORMANCE 체대입시 안내 페이지입니다.",
};

const heroStats = [
  ["INFO", "입시 자료 제공", "대학별 정보와 전형 일정을 홈페이지에서 확인"],
  ["CONSULT", "개인별 상담", "목표 대학과 현재 기록에 맞춘 운동·입시 상담"],
  ["RECORD", "기록 관리", "세션 기록, 컨디션, 피드백을 상담 흐름 안에서 관리"],
] as const;

const infoResources = [
  {
    title: "대학별 입시 정보",
    text: "지원 대학별 모집요강, 실기 종목, 반영 비율처럼 상담 전에 확인해야 할 기준을 정리합니다.",
  },
  {
    title: "전형 일정과 준비 흐름",
    text: "수시·정시 일정, 원서 접수, 실기 준비 타이밍을 놓치지 않도록 공통 자료를 제공합니다.",
  },
  {
    title: "실기 종목별 확인 항목",
    text: "기록 기준표, 종목별 주의사항, 부상 방지 기준을 훈련 전 확인할 수 있게 안내합니다.",
  },
] as const;

const consultSteps = [
  ["01", "상담 신청", "목표 대학, 현재 기록, 준비 기간, 통증 여부처럼 상담에 필요한 정보를 남깁니다."],
  ["02", "현재 상태 확인", "운동 이력, 컨디션, 실기 종목, 생활 패턴을 함께 확인해 출발점을 정리합니다."],
  ["03", "개인별 방향 설정", "목표와 현재 상태의 차이를 기준으로 운동 계획과 입시 준비 우선순위를 세웁니다."],
  ["04", "관리 방식 안내", "상담 후 필요한 학생은 내부 상담관리 흐름에 맞춰 세션 기록, 피드백, 소통 방식을 안내받습니다."],
] as const;

const careRecordItems = [
  {
    title: "운동 이력",
    text: "매 세션 수행 내용과 변화 흐름을 기록해 다음 수업의 기준으로 사용합니다.",
  },
  {
    title: "컨디션",
    text: "피로도, 통증, 회복 상태를 함께 확인해 무리한 준비를 줄입니다.",
  },
  {
    title: "목표",
    text: "체대입시, 공무원 체력시험, 선수 퍼포먼스까지 목표별 프로그램을 설계합니다.",
  },
  {
    title: "피드백·메시지",
    text: "세션 기록, 코칭 피드백, 메시지 소통을 한 흐름으로 연결합니다.",
  },
] as const;

const hubPillLinks = [
  { href: "/pe-exam", label: "입시정보 허브", primary: true },
  { href: "/pe-exam#university-search", label: "대학검색", primary: false },
  { href: "/pe-exam#universities", label: "지역별 대학", primary: false },
  { href: "/pe-exam/faq", label: "FAQ", primary: false },
] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function HubPillNav({
  className,
  label = "입시 정보 허브 바로가기",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <nav className={cx(publicStyles.hubPillNav, className)} aria-label={label}>
      {hubPillLinks.map((link) => (
        <Link
          className={cx(publicStyles.hubPillLink, link.primary && publicStyles.hubPillPrimary)}
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default function PeExamServicePage() {
  return (
    <main className={publicStyles.publicPage}>
      <header className="pe-standalone-nav" aria-label="RePERFORMANCE 체대입시">
        <div className="container pe-standalone-nav-inner">
          <Link
            href="/services/pe-exam"
            className="pe-standalone-brand"
            aria-label="RePERFORMANCE 체대입시 안내 페이지"
          >
            <strong>RePERFORMANCE</strong>
            <span>체대입시</span>
          </Link>
          <nav className="pe-standalone-actions" aria-label="체대입시 페이지 섹션">
            <Link href="#admission-info">입시자료</Link>
            <Link href="#consult-system">개인상담</Link>
            <Link href="#care-system">상담 관리</Link>
            <Link href="#consult-flow">상담신청</Link>
          </nav>
        </div>
      </header>

      <section className={publicStyles.publicHero}>
        <div className={`container ${publicStyles.publicHeroInner}`}>
          <div className={publicStyles.publicHeroText}>
            <p className="eyebrow light-text">REPERFORMANCE PE EXAM</p>
            <h1>
              입시정보는 자유롭게,
              <br />
              개인 관리는 데이터로 깊게.
            </h1>
            <p>
              RePERFORMANCE에서 훈련하는 학생은 홈페이지 안의 체대입시 자료를 자유롭게
              활용할 수 있습니다. 상담에서는 목표 대학, 현재 기록, 컨디션을 기준으로 운동과
              입시 준비 방향을 함께 정리합니다.
            </p>
            <div className={publicStyles.heroActions}>
              <Link className="button pe-hero-primary" href="/apply?service=pe-exam">
                체대입시 상담 신청
              </Link>
              <HubPillNav className={publicStyles.heroHubNav} />
            </div>
          </div>

          <div className={publicStyles.heroStats} aria-label="체대입시 제공 내용">
            {heroStats.map(([label, title, text]) => (
              <article key={label}>
                <strong>{label}</strong>
                <span>{title}</span>
                <small>{text}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="admission-info" className={cx("section", publicStyles.publicInfoSection)}>
        <div className="container">
          <div className={publicStyles.sectionHead}>
            <p className="eyebrow">ADMISSION INFO</p>
            <h2>입시 자료는 홈페이지 안에서 먼저 확인합니다.</h2>
            <p>
              체대입시는 정보 확인만 잘해도 준비 방향이 훨씬 선명해집니다. RePERFORMANCE
              학생은 대학별 정보, 전형 일정, 실기 기준 자료를 홈페이지에서 자유롭게 확인하며
              상담 전에 기본 흐름을 잡을 수 있습니다.
            </p>
          </div>

          <div className={publicStyles.infoResourceLayout}>
            <article className={publicStyles.infoPanel}>
              <h3>홈페이지에서 제공하는 입시 자료</h3>
              <div className={publicStyles.resourceList}>
                {infoResources.map((resource) => (
                  <div key={resource.title}>
                    <strong>{resource.title}</strong>
                    <p>{resource.text}</p>
                  </div>
                ))}
              </div>
            </article>

            <aside className={publicStyles.resourceNote}>
              <p>입시 자료 허브</p>
              <h3>세부 자료는 한 곳에서 확인합니다.</h3>
              <span>
                공개 정보는 별도 허브에 모아두고, 이 페이지는 상담과 관리 흐름을 안내하는
                역할에 집중합니다.
              </span>
              <HubPillNav
                className={publicStyles.resourceHubNav}
                label="입시 자료 허브 주요 링크"
              />
            </aside>
          </div>
        </div>
      </section>

      <section id="consult-system" className={cx("section", publicStyles.consultationSection)}>
        <div className="container">
          <div className={publicStyles.sectionHead}>
            <p className="eyebrow">PERSONAL CONSULT</p>
            <h2>운동과 입시 상담은 학생별 상황에서 시작합니다.</h2>
            <p>
              같은 종목을 준비해도 필요한 훈련은 다릅니다. 현재 기록, 몸 상태, 준비 기간,
              목표 대학을 함께 보며 학생에게 필요한 운동 방향과 입시 준비 순서를 정리합니다.
            </p>
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

      <section id="care-system" className={cx("section", publicStyles.careSystemSection)}>
        <div className="container">
          <div className={publicStyles.carePanel}>
            <div className={publicStyles.careLead}>
              <p className="eyebrow light-text">RECORD SYSTEM</p>
              <h2>상담 이후의 기록을 내부 흐름으로 관리합니다.</h2>
              <p>
                회원 개개인의 운동 이력, 컨디션, 목표를 매 세션
                데이터로 정리합니다. 체대입시부터 공무원 체력시험, 선수 퍼포먼스까지 목표에
                맞는 프로그램을 설계하고, 상담 기록·피드백·소통 방식을 하나의 흐름으로
                정리합니다.
              </p>
              <strong>단순한 운동 지도가 아닌, 데이터 기반의 전문화된 케어를 경험해보세요.</strong>
            </div>

            <div className={publicStyles.careRecordGrid}>
              {careRecordItems.map((item) => (
                <article className={publicStyles.careRecordCard} key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="consult-flow" className={cx("section", publicStyles.finalCtaSection)}>
        <div className={cx("container", publicStyles.finalCtaInner)}>
          <div className={publicStyles.finalCtaCopy}>
            <p className="eyebrow">START CONSULT</p>
            <h2>상담 신청 후 필요한 관리 방식까지 안내합니다.</h2>
            <p>
              신청 내용을 확인한 뒤 학생에게 필요한 입시 자료, 운동 상담, 내부 관리 연결 여부를
              정리해 안내합니다.
            </p>
          </div>
          <div className={publicStyles.ctaActionCluster}>
            <Link className="button pe-hero-primary" href="/apply?service=pe-exam">
              체대입시 상담 신청
            </Link>
            <HubPillNav
              className={publicStyles.finalHubNav}
              label="상담 신청 옆 입시 정보 허브 바로가기"
            />
          </div>
        </div>
      </section>

      <footer className="pe-standalone-footer">
        <div className="container pe-standalone-footer-inner">
          <strong>RePERFORMANCE 체대입시</strong>
          <span>{site.address}</span>
        </div>
      </footer>
    </main>
  );
}
