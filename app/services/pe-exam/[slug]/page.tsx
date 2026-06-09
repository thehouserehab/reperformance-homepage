import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PeExamCalendar from "../PeExamCalendar";
import styles from "../PeExamCare.module.css";
import {
  getPeExamDetailPage,
  peExamDetailPages,
  peExamGuideLinks,
  peExamRecords,
  peExamSchedule,
  peExamWeeklyLoop,
} from "../peExamData";
import { serviceItems, site } from "../../../_components/siteData";

const item = serviceItems[3];

type PageProps = {
  params: Promise<{ slug: string }>;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function generateStaticParams() {
  return peExamDetailPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPeExamDetailPage(slug);

  if (!page) {
    return {
      title: "RePERFORMANCE 체대입시",
    };
  }

  return {
    title: `${page.title} | RePERFORMANCE 체대입시`,
    description: page.description,
  };
}

function SpecialSection({ kind }: { kind: string | undefined }) {
  if (kind === "record") {
    return (
      <section className={styles.detailSpecial}>
        <div className={styles.recordBoard} aria-label="종목별 기록 관리 예시">
          <div className={cx(styles.recordRow, styles.recordHead)}>
            <span>종목</span>
            <span>현재</span>
            <span>목표</span>
            <span>관리 포인트</span>
          </div>
          {peExamRecords.map((row) => (
            <div className={styles.recordRow} key={row.event}>
              <span>{row.event}</span>
              <strong>{row.current}</strong>
              <strong>{row.goal}</strong>
              <span>{row.focus}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (kind === "weekly") {
    return (
      <section className={styles.detailSpecial}>
        <div className={styles.weekList}>
          {peExamWeeklyLoop.map((item) => (
            <div className={styles.weekItem} key={item.day}>
              <span>{item.day}</span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (kind === "schedule") {
    return (
      <section className={styles.detailSpecial}>
        <PeExamCalendar events={peExamSchedule} />
      </section>
    );
  }

  if (kind === "guides") {
    return (
      <section className={styles.detailSpecial}>
        <div className={styles.guideGrid}>
          {peExamGuideLinks.map((link) => (
            <article className={styles.guideCard} key={link.name}>
              <p>공식 자료</p>
              <h3>{link.name}</h3>
              <span>{link.focus}</span>
              <a href={link.href} target="_blank" rel="noopener noreferrer">
                공식 모집요강 확인
              </a>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (kind === "simulation") {
    return (
      <section className={styles.detailSpecial}>
        <div className={styles.simulationGrid}>
          <div>
            <strong>01</strong>
            <span>대학별 실기 순서로 수행</span>
          </div>
          <div>
            <strong>02</strong>
            <span>종목 사이 휴식과 호흡 점검</span>
          </div>
          <div>
            <strong>03</strong>
            <span>실수 후 회복 전략 연습</span>
          </div>
          <div>
            <strong>04</strong>
            <span>전형 당일 루틴 확정</span>
          </div>
        </div>
      </section>
    );
  }

  return null;
}

export default async function PeExamDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getPeExamDetailPage(slug);

  if (!page) {
    notFound();
  }

  return (
    <main className={cx("pe-standalone-page", styles.page)}>
      <header className="pe-standalone-nav" aria-label="RePERFORMANCE 체대입시">
        <div className="container pe-standalone-nav-inner">
          <Link href="/services/pe-exam" className="pe-standalone-brand" aria-label="RePERFORMANCE 체대입시 홈">
            <strong>RePERFORMANCE</strong>
            <span>체대입시</span>
          </Link>
          <div className="pe-standalone-actions">
            <Link href="/services/pe-exam#admission-info">입시정보</Link>
            <Link href="/services/pe-exam#care-system">케어 시스템</Link>
            <Link href={item.applyHref}>상담 신청</Link>
          </div>
        </div>
      </header>

      <section className={styles.detailHero}>
        <div className="container">
          <Link className={styles.backLink} href="/services/pe-exam">
            체대입시 메인으로
          </Link>
          <p className="eyebrow light-text">{page.label}</p>
          <h1>{page.title}</h1>
          <p>{page.description}</p>
          <div className="button-row">
            <Link className="button pe-hero-primary" href={item.applyHref}>
              상담 신청
            </Link>
            <Link className="button pe-hero-secondary" href="/apply?service=pe-exam">
              PAR-Q 설문 진행
            </Link>
          </div>
        </div>
      </section>

      <section className={cx("section", styles.detailSection)}>
        <div className="container">
          <div className={styles.detailGrid}>
            <article className={styles.detailPanel}>
              <p>{page.focusTitle}</p>
              <h2>핵심 확인 항목</h2>
              <ul>
                {page.focusItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className={styles.detailPanel}>
              <p>{page.flowTitle}</p>
              <h2>진행 흐름</h2>
              <ol>
                {page.flowItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </article>
          </div>

          <SpecialSection kind={page.kind} />

          <article className={styles.checkPanel}>
            <p>{page.checklistTitle}</p>
            <h2>학생이 실제로 확인하게 되는 것</h2>
            <div>
              {page.checklistItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className={cx("section", styles.morePagesSection)}>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">PE EXAM SYSTEM</p>
            <h2>다른 체대입시 관리 페이지</h2>
          </div>
          <div className={styles.hubGrid}>
            {peExamDetailPages
              .filter((detail) => detail.slug !== page.slug)
              .map((detail) => (
                <Link className={styles.hubCard} href={`/services/pe-exam/${detail.slug}`} key={detail.slug}>
                  <p>{detail.label}</p>
                  <h3>{detail.title}</h3>
                  <span>{detail.description}</span>
                  <strong>자세히 보기</strong>
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
