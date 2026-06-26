import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/SiteChrome";
import styles from "./PeExamHub.module.css";

export const metadata: Metadata = {
  title: "체대입시 정보 허브 | RePERFORMANCE",
  description:
    "대학별 정보, 전형 일정, 실기 종목, 기록 기준, 준비 로드맵을 한곳에서 확인하는 RePERFORMANCE 체대입시 정보 허브입니다.",
};

const hubLinks = [
  { href: "#resources", label: "입시자료" },
  { href: "#universities", label: "대학정보" },
  { href: "#timeline", label: "일정·실기" },
  { href: "#roadmap", label: "준비흐름" },
  { href: "#faq", label: "FAQ" },
] as const;

const heroHighlights = [
  ["INFO", "입시 자료 허브", "대학별 정보, 전형 일정, 실기 종목을 한곳에서 확인합니다."],
  ["CHECK", "공식 기준 우선", "최신 날짜와 세부 기준은 대학별 모집요강으로 다시 확인합니다."],
  ["CARE", "학생별 관리는 상담 후", "개인 기록과 수업 관리는 상담 이후 NORE에서 안내합니다."],
] as const;

const resourceCards = [
  {
    label: "UNIVERSITY",
    title: "대학별 정보",
    text: "지원 전 모집 단위, 전형 구분, 실기 구성, 반영 비율을 먼저 확인합니다.",
    items: ["모집 단위", "전형 구분", "실기 구성"],
  },
  {
    label: "SCHEDULE",
    title: "전형 일정",
    text: "원서 접수, 실기 고사, 합격 발표 흐름을 놓치지 않도록 큰 순서를 정리합니다.",
    items: ["모집요강", "원서 접수", "실기 고사"],
  },
  {
    label: "PRACTICAL",
    title: "실기 종목",
    text: "대학과 전형에 따라 달라지는 실기 종목과 준비 전 확인 항목을 구분합니다.",
    items: ["종목 구성", "평가 방식", "준비 항목"],
  },
  {
    label: "RECORD",
    title: "기록 기준",
    text: "기록 수치 자체보다 최신 공식 기준을 확인하는 방법을 안내합니다.",
    items: ["공식 기준", "현재 기록", "목표 기록"],
  },
] as const;

const universityCards = [
  {
    region: "전북권",
    name: "전북대학교",
    department: "체육교육과·스포츠과학과 등",
    summary: "지역 거점 국립대 지원 가능성을 검토할 때 먼저 확인하는 대학입니다.",
    checks: ["모집 단위와 전형 구분", "내신·수능·실기 반영 비율", "실기 종목과 배점"],
    href: "https://enter.jbnu.ac.kr/mainIntro/intro.do",
  },
  {
    region: "전북권",
    name: "전주대학교",
    department: "운동처방·생활체육·경기지도 계열",
    summary: "전주권 체육계열 진학을 준비하는 학생이 함께 비교할 수 있는 대학입니다.",
    checks: ["학과별 지원 자격", "실기 고사 구성", "전형별 제출 자료"],
    href: "https://iphak.jj.ac.kr/",
  },
  {
    region: "수도권",
    name: "한국체육대학교",
    department: "체육계열 특화 대학",
    summary: "체육계열 목표가 뚜렷한 학생이 전형과 실기 기준을 정밀하게 확인해야 하는 대학입니다.",
    checks: ["전공별 모집요강", "실기 종목별 평가 방식", "수시·정시 지원 전략"],
    href: "https://www.knsu.ac.kr/ipsi",
  },
  {
    region: "수도권",
    name: "용인대학교",
    department: "무도·체육·경호·스포츠 계열",
    summary: "종목 특성과 계열 선택에 따라 준비 방향이 달라질 수 있어 상담 전 확인이 필요합니다.",
    checks: ["계열별 모집 단위", "실기와 면접 반영 방식", "목표 학과별 준비 항목"],
    href: "https://ipsi.yongin.ac.kr/",
  },
] as const;

const scheduleSteps = [
  ["01", "모집요강 확인", "대학별 공식 모집요강과 변경 공지를 먼저 확인합니다."],
  ["02", "원서 접수", "지원 전형, 제출 항목, 접수 기간을 구분해 확인합니다."],
  ["03", "실기 준비·고사", "실기 종목과 고사 일정은 최신 공식 안내를 기준으로 봅니다."],
  ["04", "합격 발표", "발표 이후 준비 방향은 상담에서 이어서 정리합니다."],
] as const;

const practicalItems = [
  "제자리멀리뛰기",
  "10m 왕복달리기",
  "메디신볼 던지기",
  "윗몸일으키기",
  "좌전굴",
  "종목별 기록 확인",
] as const;

const recordGuides = [
  ["기준표", "대학·전형·연도마다 달라집니다."],
  ["현재 기록", "상담 후 학생별로 확인합니다."],
  ["목표 기록", "지원 대학과 준비 기간을 함께 봅니다."],
  ["관리 위치", "학생별 기록은 상담 후 NORE에서 관리합니다."],
] as const;

const roadmapSteps = [
  ["01", "자료 확인", "희망 대학, 전형 일정, 실기 종목을 먼저 파악합니다."],
  ["02", "현재 상태 정리", "현재 기록, 통증 여부, 운동 가능 시간을 정리합니다."],
  ["03", "기초 체력 준비", "움직임과 회복 상태를 보며 기초 체력을 쌓습니다."],
  ["04", "기록 향상", "보완이 필요한 종목을 중심으로 준비 방향을 조정합니다."],
  ["05", "실기 마무리", "일정, 컨디션, 지원 전략을 마지막으로 점검합니다."],
] as const;

const careChecks = [
  ["무릎·발목", "점프와 달리기 반복 전 불편한 움직임을 먼저 확인합니다."],
  ["허리·어깨", "힘을 쓰는 동작과 던지기 전 부담되는 움직임을 살핍니다."],
  ["피로·회복", "무리한 반복보다 수면, 일정, 회복 시간을 함께 고려합니다."],
] as const;

const faqs = [
  [
    "언제부터 준비해야 하나요?",
    "현재 학년과 목표 전형에 따라 준비 순서는 달라집니다. 먼저 모집요강과 실기 구성을 확인하고 상담에서 준비 방향을 정리합니다.",
  ],
  [
    "현재 기록이 낮아도 상담할 수 있나요?",
    "가능합니다. 홈페이지에는 기록을 입력하지 않으며, 상담 후 필요한 기준과 준비 방향을 함께 확인합니다.",
  ],
  [
    "공부와 운동은 어떻게 병행하나요?",
    "학업 일정과 운동 가능 시간을 상담에서 확인한 뒤 무리하지 않는 준비 흐름을 안내합니다.",
  ],
  [
    "불편한 움직임이 있어도 준비할 수 있나요?",
    "상담에서 현재 움직임과 주의사항을 확인한 뒤 무리하지 않는 범위의 준비 방향을 안내합니다.",
  ],
  [
    "상담 전에 무엇을 준비하면 좋나요?",
    "희망 대학, 지원 전형, 실기 종목, 현재 기록, 가능한 운동 시간을 정리해 주세요.",
  ],
  [
    "학생별 기록을 홈페이지에 입력하나요?",
    "아닙니다. 학생별 목표, 실기 기록, 수업 기록, 상담 메모는 상담 후 NORE에서 관리합니다.",
  ],
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
          <div className={styles.heroCopy}>
            <p className="eyebrow light-text">PE EXAM INFO HUB</p>
            <h1>
              체대입시 자료는 한곳에서,
              <br />
              개인 준비는 상담에서.
            </h1>
            <p>
              RePERFORMANCE 체대입시 정보 허브는 대학별 정보, 전형 일정, 실기 종목, 기록
              기준을 상담 전에 확인하는 자료 공간입니다. 학생별 목표와 기록, 수업 관리는 상담
              이후 NORE에서 이어집니다.
            </p>
          </div>

          <aside className={styles.heroPanel} aria-label="정보 허브 이용 기준">
            {heroHighlights.map(([label, title, text]) => (
              <article key={label}>
                <strong>{label}</strong>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </aside>
        </div>
      </section>

      <section className={`section ${styles.resourcesSection}`} id="resources">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">RESOURCE MAP</p>
            <h2>상담 전에 확인할 자료를 네 가지로 정리했습니다.</h2>
            <p>
              이 페이지는 학생 기록을 입력하는 관리 화면이 아닙니다. 공식 모집요강을 확인하고
              상담 전에 질문과 목표를 정리하기 위한 정보 허브입니다.
            </p>
          </div>

          <div className={styles.resourceGrid}>
            {resourceCards.map((card) => (
              <article className={styles.resourceCard} key={card.title}>
                <p>{card.label}</p>
                <h3>{card.title}</h3>
                <span>{card.text}</span>
                <ul>
                  {card.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <aside className={styles.sourceNotice}>
            <strong>확인 기준</strong>
            <p>
              홈페이지 자료는 준비 방향을 잡기 위한 안내입니다. 모집 인원, 반영 비율, 실기 종목,
              세부 날짜는 대학별 공식 모집요강과 공지를 최종 기준으로 확인해 주세요.
            </p>
          </aside>
        </div>
      </section>

      <section className={`section ${styles.universitySection}`} id="universities">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">UNIVERSITY GUIDE</p>
            <h2>대학별 정보는 공식 모집요강과 상담 준비 항목을 함께 봅니다.</h2>
            <p>
              희망 대학, 지원 전형, 목표 학과와 실기 종목을 먼저 정리하세요. 아래 링크는 공식
              입학처 확인을 돕기 위한 참고 경로입니다.
            </p>
          </div>

          <div className={styles.universityGrid}>
            {universityCards.map((card) => (
              <article className={styles.universityCard} key={card.name}>
                <div>
                  <p>{card.region}</p>
                  <h3>{card.name}</h3>
                  <span>{card.department}</span>
                </div>
                <p>{card.summary}</p>
                <ul>
                  {card.checks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
                <a href={card.href} target="_blank" rel="noopener noreferrer">
                  공식 입학처 확인
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.timelineSection}`} id="timeline">
        <div className={`container ${styles.timelineLayout}`}>
          <div className={styles.timelineIntro}>
            <p className="eyebrow light-text">SCHEDULE & PRACTICALS</p>
            <h2>일정과 실기 종목은 함께 확인합니다.</h2>
            <p>
              전형 일정은 매년 달라지고, 실기 종목은 대학과 전형에 따라 달라집니다. 일정, 종목,
              기록 기준을 따로 보지 말고 한 흐름으로 확인하는 것이 좋습니다.
            </p>
          </div>

          <ol className={styles.scheduleList}>
            {scheduleSteps.map(([number, title, text]) => (
              <li key={number}>
                <strong>{number}</strong>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className={styles.practicePanel}>
            <article>
              <h3>실기 종목 예시</h3>
              <div className={styles.practiceChips}>
                {practicalItems.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </article>

            <article>
              <h3>기록 기준 확인법</h3>
              <dl className={styles.recordGrid}>
                {recordGuides.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          </div>
        </div>
      </section>

      <section className={`section ${styles.roadmapSection}`} id="roadmap">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">PREPARATION ROADMAP</p>
            <h2>준비 흐름은 자료 확인에서 개인 상담으로 이어집니다.</h2>
            <p>
              홈페이지에서 공통 정보를 확인한 뒤, 실제 준비 방향은 현재 기록과 몸 상태를 기준으로
              상담에서 정리합니다.
            </p>
          </div>

          <ol className={styles.roadmapList}>
            {roadmapSteps.map(([number, title, text]) => (
              <li key={number}>
                <strong>{number}</strong>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>

          <div className={styles.careCheckGrid}>
            {careChecks.map(([title, text]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.faqSection}`} id="faq">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">PARENT FAQ</p>
            <h2>상담 전에 자주 묻는 질문</h2>
          </div>
          <div className={styles.faqList}>
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.consultSection}`}>
        <div className={`container ${styles.consultInner}`}>
          <div>
            <p className="eyebrow light-text">NEXT STEP</p>
            <h2>자료를 확인했다면, 개인 준비 방향은 상담에서 정리합니다.</h2>
            <p>
              목표 대학, 현재 기록, 컨디션, 운동 가능 시간을 바탕으로 개인별 운동·입시 상담을
              진행합니다. 학생별 수업 기록과 피드백은 상담 이후 NORE에서 안내합니다.
            </p>
          </div>
          <Link className="button primary" href="/apply?service=pe-exam">
            체대입시 상담 신청
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
