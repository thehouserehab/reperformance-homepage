import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/SiteChrome";
import { site } from "../_components/siteData";
import styles from "./PeExamHub.module.css";

export const metadata: Metadata = {
  title: "체대입시 정보 | RePERFORMANCE",
  description: "대학별 정보, 전형 일정, 실기 종목, 준비 로드맵을 확인하는 RePERFORMANCE 체대입시 정보 허브입니다.",
};

const hubLinks = [
  { href: "/pe-exam", label: "체대입시 홈" },
  { href: "#university-info", label: "대학별 정보" },
  { href: "#admission-schedule", label: "전형 일정" },
  { href: "#practical-events", label: "실기 종목" },
  { href: "#record-standards", label: "기록 기준표" },
  { href: "#roadmap", label: "준비 로드맵" },
  { href: "#injury-prevention", label: "부상 방지" },
  { href: "/apply?service=pe-exam", label: "상담 신청" },
] as const;

const informationCards = [
  {
    id: "university-info",
    label: "UNIVERSITY",
    title: "대학별 정보",
    text: "대학과 모집 단위별로 확인해야 할 모집요강, 반영 항목, 실기 구성을 정리할 수 있도록 준비합니다.",
  },
  {
    id: "admission-schedule",
    label: "SCHEDULE",
    title: "전형 일정",
    text: "원서 접수, 전형, 실기처럼 놓치기 쉬운 일정을 공식 안내와 함께 확인하는 기준을 제공합니다.",
  },
  {
    id: "practical-events",
    label: "PRACTICAL",
    title: "실기 종목",
    text: "종목별 준비 요소와 훈련 전 확인할 사항을 정리해 상담 전에 준비 방향을 가늠할 수 있습니다.",
  },
  {
    id: "record-standards",
    label: "RECORD GUIDE",
    title: "기록 기준표",
    text: "기록 기준은 대학, 전형, 연도에 따라 달라집니다. 최신 모집요강을 기준으로 확인하는 방법을 안내합니다.",
  },
] as const;

const roadmapSteps = [
  ["01", "정보 확인", "대학별 전형과 실기 종목, 주요 일정을 먼저 확인합니다."],
  ["02", "상담 신청", "목표와 준비 상황을 바탕으로 필요한 운동과 입시 상담 방향을 정리합니다."],
  ["03", "NORE에서 학생 관리", "상담 후 목표 대학, 기록, 수업, 메모, 일정은 NORE에서 관리합니다."],
] as const;

const faqs = [
  ["대학별 정보는 언제 확인해야 하나요?", "지원하려는 전형의 공식 모집요강이 안내되면, 일정과 실기 구성을 먼저 확인합니다."],
  ["현재 기록도 이 페이지에 입력하나요?", "아닙니다. 학생별 실기 기록과 상담 메모는 상담 후 NORE에서 관리합니다."],
  ["보호자도 상담을 신청할 수 있나요?", "가능합니다. 상담 신청 시 현재 준비 상황과 궁금한 내용을 함께 남겨 주세요."],
] as const;

export default function PeExamPage() {
  return (
    <PageShell>
      <nav className={styles.hubNav} aria-label="체대입시 정보 메뉴">
        <div className={`container ${styles.hubNavInner}`}>
          {hubLinks.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div>
            <p className="eyebrow light-text">PE EXAM INFO HUB</p>
            <h1>체대입시 준비 정보는 여기서, 학생별 관리는 NORE에서 이어집니다.</h1>
            <p>
              대학별 정보, 전형 일정, 실기 종목, 준비 로드맵을 먼저 확인하세요. 목표 대학,
              실기 기록, 수업 기록, 상담 메모, 입시 일정은 상담 후 NORE에서 관리합니다.
            </p>
            <div className="button-row">
              <a
                className="button primary"
                href={site.norePortalHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                NORE 학생관리로 이동
              </a>
              <Link className="button hero-secondary" href="/apply?service=pe-exam">
                체대입시 상담 신청
              </Link>
            </div>
          </div>
          <aside className={styles.heroNote} aria-label="체대입시 정보와 관리 역할">
            <span>RePERFORMANCE</span>
            <strong>입시 정보와 상담</strong>
            <span>NORE</span>
            <strong>학생별 기록과 일정 관리</strong>
          </aside>
        </div>
      </section>

      <section className={`section ${styles.infoSection}`}>
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">ADMISSION GUIDE</p>
            <h2>상담 전에 확인할 체대입시 정보</h2>
            <p>개인별 판단이나 기록 입력 없이, 준비에 필요한 공통 정보를 한곳에 정리합니다.</p>
          </div>
          <div className={styles.infoGrid}>
            {informationCards.map((card) => (
              <article className={styles.infoCard} id={card.id} key={card.id}>
                <p>{card.label}</p>
                <h3>{card.title}</h3>
                <span>{card.text}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.roadmapSection}`} id="roadmap">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow light-text">PREPARATION FLOW</p>
            <h2>준비부터 관리까지의 흐름</h2>
          </div>
          <ol className={styles.roadmapList}>
            {roadmapSteps.map(([number, title, text]) => (
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

      <section className={`section ${styles.injurySection}`} id="injury-prevention">
        <div className={`container ${styles.injuryInner}`}>
          <div>
            <p className="eyebrow">PREPARE WITH CARE</p>
            <h2>무리한 준비보다, 현재 움직임과 주의사항을 먼저 확인합니다.</h2>
          </div>
          <p>
            실기 준비 전 현재 운동량, 불편한 움직임, 훈련 가능 시간을 상담에서 확인합니다.
            필요한 운동 방향과 주의사항은 상담 후 안내합니다.
          </p>
        </div>
      </section>

      <section className={`section ${styles.faqSection}`}>
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">PARENT FAQ</p>
            <h2>상담 전에 자주 묻는 질문</h2>
          </div>
          <div className={styles.faqList}>
            {faqs.map(([question, answer]) => (
              <article key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.noreSection}`}>
        <div className={`container ${styles.noreInner}`}>
          <div>
            <p className="eyebrow light-text">STUDENT MANAGEMENT</p>
            <h2>학생별 관리는 NORE에서 이어집니다.</h2>
            <p>
              목표 대학, 실기 기록, 수업 기록, 상담 메모, 입시 일정은 NORE에서 관리합니다.
              이 홈페이지에서는 공개 정보 확인과 상담 신청을 지원합니다.
            </p>
          </div>
          <div className={styles.noreActions}>
            <a
              className="button primary"
              href={site.norePortalHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              NORE 학생관리로 이동
            </a>
            <Link className="button hero-secondary" href="/apply?service=pe-exam">
              체대입시 상담 신청
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
