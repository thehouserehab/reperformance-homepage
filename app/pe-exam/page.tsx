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
  { href: "#universities", label: "대학별 정보" },
  { href: "#schedule", label: "전형 일정" },
  { href: "#practicals", label: "실기 종목" },
  { href: "#standards", label: "기록 기준표" },
  { href: "#roadmap", label: "준비 로드맵" },
  { href: "#injury-prevention", label: "부상 방지" },
  { href: "#faq", label: "학부모 FAQ" },
  { href: "/apply?service=pe-exam", label: "상담 신청" },
] as const;

const heroFlow = [
  ["01", "공개 정보 확인", "대학별 정보와 전형 일정을 먼저 봅니다."],
  ["02", "상담 방향 정리", "준비 상황에 맞는 상담을 연결합니다."],
  ["03", "상담 완료 후 관리 안내", "상담을 마친 학생에게 필요한 NORE 이용 방법을 담당 코치가 안내합니다."],
] as const;

const portalCards = [
  {
    id: "universities",
    label: "UNIVERSITIES",
    title: "대학별 정보",
    text: "지원 전 확인할 모집요강과 전형 항목을 정리합니다.",
    bullets: ["모집 단위 확인", "지원 전형 구분", "실기 구성 확인"],
  },
  {
    id: "schedule",
    label: "SCHEDULE",
    title: "전형 일정",
    text: "원서부터 실기 고사까지 놓치기 쉬운 흐름을 확인합니다.",
    bullets: ["모집요강 확인", "원서 접수", "실기·합격 발표"],
  },
  {
    id: "practicals",
    label: "PRACTICALS",
    title: "실기 종목",
    text: "대학별로 달라지는 종목과 준비 요소를 구분합니다.",
    bullets: ["종목 구성", "반영 방식", "준비 전 확인"],
  },
  {
    id: "standards",
    label: "RECORD GUIDE",
    title: "기록 기준표",
    text: "기록 수치 대신 최신 기준을 확인하는 방법을 안내합니다.",
    bullets: ["공식 기준 확인", "현재 기록 관리", "NORE 연결"],
  },
  {
    id: "roadmap",
    label: "ROADMAP",
    title: "준비 로드맵",
    text: "기초 준비부터 실기 마무리까지의 흐름을 살펴봅니다.",
    bullets: ["기초 체력", "기록 향상", "지원 전략"],
  },
  {
    id: "injury-prevention",
    label: "PREPARE WITH CARE",
    title: "부상 방지",
    text: "무리한 반복보다 움직임과 회복 상태를 먼저 확인합니다.",
    bullets: ["움직임 확인", "훈련 조정", "회복 안내"],
  },
  {
    id: "faq",
    label: "PARENT FAQ",
    title: "학부모 FAQ",
    text: "상담 전 자주 묻는 질문을 짧고 명확하게 정리합니다.",
    bullets: ["준비 시점", "훈련 병행", "상담 준비"],
  },
] as const;

const universityFilters = [
  ["전체", "공식 모집요강 기준"],
  ["전북권", "지역 지원 후보"],
  ["수도권", "전국 지원 후보"],
  ["체육계열", "학과·실기 확인"],
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
  ["02", "원서 접수", "지원 전형과 제출 항목, 접수 기간을 구분해 확인합니다."],
  ["03", "실기 준비·고사", "실기 종목과 고사 일정은 최신 공식 안내를 기준으로 봅니다."],
  ["04", "합격 발표", "발표 이후 일정과 준비 방향은 상담에서 이어서 안내합니다."],
] as const;

const practicalItems = [
  "제자리멀리뛰기",
  "10m 왕복달리기",
  "메디신볼 던지기",
  "윗몸일으키기",
  "좌전굴",
  "종목별 기록 확인",
] as const;

const standardItems = [
  ["현재 기록", "상담 후 입력 예정"],
  ["목표 기록", "NORE에서 관리 예정"],
  ["최근 측정일", "상담 후 확인 예정"],
  ["보완 종목", "상담 후 안내 예정"],
  ["우선순위 종목", "공식 모집요강 확인 필요"],
] as const;

const roadmapSteps = [
  ["01", "시작 단계", "현재 준비 상황과 실기 종목을 확인합니다."],
  ["02", "기초체력 단계", "기본 움직임과 체력 준비를 차분히 쌓습니다."],
  ["03", "기록 향상 단계", "보완이 필요한 종목의 준비 방향을 정리합니다."],
  ["04", "지원 전략 단계", "대학별 전형과 공식 모집요강을 다시 확인합니다."],
  ["05", "실기 마무리 단계", "일정과 컨디션을 확인하며 마지막 준비를 조정합니다."],
] as const;

const careAreas = [
  ["무릎", "반복 동작 전 불편한 움직임과 훈련량을 먼저 확인합니다."],
  ["허리", "힘을 쓰는 동작의 부담을 살피고 필요한 준비 방향을 안내합니다."],
  ["발목", "점프와 달리기 전 움직임 상태와 회복 시간을 함께 확인합니다."],
  ["어깨", "던지기와 상체 동작 전 부담되는 움직임을 살펴봅니다."],
  ["피로·회복", "무리한 반복보다 수면, 일정, 회복 시간을 고려해 조정합니다."],
] as const;

const faqs = [
  ["언제부터 준비해야 하나요?", "현재 학년과 목표 전형에 따라 준비 순서는 달라집니다. 먼저 공식 모집요강과 실기 구성을 확인하고 상담에서 준비 방향을 정리합니다."],
  ["현재 기록이 낮아도 상담할 수 있나요?", "가능합니다. 홈페이지에는 기록을 입력하지 않으며, 상담 후 필요한 기준과 준비 방향을 함께 확인합니다."],
  ["공부와 운동은 어떻게 병행하나요?", "학업 일정과 운동 가능 시간을 상담에서 확인한 뒤 무리하지 않는 준비 흐름을 안내합니다."],
  ["주 몇 회 훈련이 적당한가요?", "준비 단계와 일정에 따라 다릅니다. 현재 운동량과 회복 시간을 먼저 확인합니다."],
  ["불편한 움직임이 있어도 준비할 수 있나요?", "상담에서 현재 움직임과 주의사항을 확인한 뒤 무리하지 않는 범위의 준비 방향을 안내합니다."],
  ["상담 전에 무엇을 준비하면 좋나요?", "희망 대학, 지원 전형, 실기 종목, 가능한 운동 시간을 정리해 주세요."],
  ["학생별 기록을 홈페이지에 입력하나요?", "아닙니다. 학생별 목표와 실기 기록, 수업 기록, 상담 메모는 NORE에서 관리합니다."],
  ["NORE에서는 무엇을 확인하나요?", "학생별 기록, 수업 일정, 개인운동, 메모와 입시 일정 등 상담 후 필요한 관리 항목을 확인합니다."],
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
              대학별 정보, 전형 일정, 실기 종목, 준비 로드맵을 먼저 확인하세요. 학생별 목표 대학,
              실기 기록, 수업 기록, 상담 메모, 입시 일정은 상담 후 NORE에서 관리합니다.
            </p>
            <div className="button-row">
              <Link className="button primary" href="/apply?service=pe-exam">
                체대입시 상담 신청
              </Link>
            </div>
          </div>
          <aside className={styles.heroFlow} aria-label="체대입시 이용 흐름">
            {heroFlow.map(([number, title, text]) => (
              <article key={number}>
                <strong>{number}</strong>
                <div>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </aside>
        </div>
      </section>

      <section className={`section ${styles.portalSection}`}>
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">EXPLORE THE HUB</p>
            <h2>상담 전에 확인할 체대입시 정보</h2>
            <p>개인별 판단이나 기록 입력 없이, 준비에 필요한 공통 정보를 한곳에서 찾아볼 수 있습니다.</p>
          </div>
          <div className={styles.portalGrid}>
            {portalCards.map((card) => (
              <article className={styles.portalCard} key={card.id}>
                <p>{card.label}</p>
                <h3>{card.title}</h3>
                <span>{card.text}</span>
                <ul>
                  {card.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <Link href={`#${card.id}`}>자세히 보기</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.detailSection}`} id="universities">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">UNIVERSITY GUIDE</p>
            <h2>대학별 정보는 공식 모집요강과 상담 준비 항목을 함께 봅니다.</h2>
            <p>
              희망 대학, 지원 전형, 목표 학과와 실기 종목을 먼저 정리하세요. 최신 날짜와 세부 기준은 각 대학의
              공식 모집요강과 공지에서 다시 확인해야 합니다.
            </p>
          </div>

          <div className={styles.universityToolbar} aria-label="대학 정보 필터">
            <div className={styles.filterPills}>
              {universityFilters.map(([label, text]) => (
                <span key={label}>
                  <strong>{label}</strong>
                  {text}
                </span>
              ))}
            </div>
            <Link className={styles.universityPrepLink} href="/apply?service=pe-exam">
              상담 전 정보 남기기
            </Link>
          </div>

          <div className={styles.universityGrid}>
            {universityCards.map((card) => (
              <article className={styles.universityCard} key={card.name}>
                <div className={styles.universityCardHeader}>
                  <p>{card.region}</p>
                  <h3>{card.name}</h3>
                  <span>{card.department}</span>
                </div>
                <p>{card.summary}</p>
                <ul className={styles.universityChecklist}>
                  {card.checks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
                <div className={styles.universityActions}>
                  <a href={card.href} target="_blank" rel="noopener noreferrer">
                    공식 입학처 보기
                  </a>
                  <Link href="/apply?service=pe-exam">상담 신청</Link>
                </div>
              </article>
            ))}
          </div>

          <aside className={styles.universityNoreBox}>
            <div>
              <p className="eyebrow light-text">AFTER CONSULTATION</p>
              <h3>학생별 관리는 NORE에서 이어집니다.</h3>
              <p>
                목표 대학, 실기 기록, 수업 기록, 상담 메모, 일정 관리는 상담 완료 후 NORE에서 확인합니다.
                공개 정보 확인 후 실제 학생 관리는 담당 코치 안내에 따라 연결합니다.
              </p>
            </div>
            <div className={styles.universityNoreActions}>
              <a className="button primary" href={site.norePeExamHref} target="_blank" rel="noopener noreferrer">
                NORE 학생관리로 이동
              </a>
              <Link className="button secondary" href="/apply?service=pe-exam">
                체대입시 상담 신청
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className={`section ${styles.scheduleSection}`} id="schedule">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow light-text">ADMISSION SCHEDULE</p>
            <h2>일정은 단계별로 확인합니다.</h2>
            <p>세부 날짜는 매년 달라질 수 있으므로 최신 공식 모집요강을 기준으로 확인해 주세요.</p>
          </div>
          <ol className={styles.scheduleTimeline}>
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
        </div>
      </section>

      <section className={`section ${styles.detailSection}`} id="practicals">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">PRACTICAL EVENTS</p>
            <h2>실기 종목은 대학과 전형에 따라 달라집니다.</h2>
            <p>종목별 현재 기록과 목표 기록은 상담 후 NORE에서 관리하며, 홈페이지에는 입력하지 않습니다.</p>
          </div>
          <div className={styles.practicalGrid}>
            {practicalItems.map((item) => (
              <article className={styles.practicalCard} key={item}>
                <span>EVENT</span>
                <h3>{item}</h3>
                <p>대학별 반영 방식과 준비 기준은 최신 공식 모집요강을 확인해 주세요.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.standardsSection}`} id="standards">
        <div className={`container ${styles.standardsInner}`}>
          <div className={styles.sectionHead}>
            <p className="eyebrow">RECORD STANDARDS</p>
            <h2>기록 기준표는 확인 방법을 안내합니다.</h2>
            <p>
              기준 수치는 대학, 전형, 연도에 따라 달라집니다. 학생별 현재 기록과 목표 기록은
              상담 후 NORE에서 관리하며, 정확한 기준은 공식 모집요강으로 확인합니다.
            </p>
            <Link className="button dark" href="/apply?service=pe-exam">
              상담 신청하기
            </Link>
          </div>
          <dl className={styles.standardGrid}>
            {standardItems.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className={`section ${styles.roadmapSection}`} id="roadmap">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow light-text">PREPARATION ROADMAP</p>
            <h2>준비 흐름을 단계별로 정리합니다.</h2>
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

      <section className={`section ${styles.careSection}`} id="injury-prevention">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">PREPARE WITH CARE</p>
            <h2>기록 향상만큼 무리하지 않는 준비가 중요합니다.</h2>
            <p>의료 진단이 아닌, 현재 움직임과 훈련 부담을 확인해 운동 방향과 주의사항을 안내합니다.</p>
          </div>
          <div className={styles.careAreaGrid}>
            {careAreas.map(([title, text]) => (
              <article className={styles.careAreaCard} key={title}>
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

      <section className={`section ${styles.noreSection}`}>
        <div className={`container ${styles.noreInner}`}>
          <div>
            <p className="eyebrow light-text">STUDENT MANAGEMENT</p>
            <h2>학생별 관리는 상담 완료 후 NORE에서 이어집니다.</h2>
            <p>
              목표 대학, 실기 기록, 수업 기록, 상담 메모, 입시 일정은 NORE에서 관리합니다. 상담 신청만으로
              NORE 가입이 진행되지는 않으며, 상담을 마친 학생에게 담당 코치가 가입 링크와 이용 방법을 안내합니다.
            </p>
          </div>
          <div className={styles.noreActions}>
            <Link className="button primary" href="/apply?service=pe-exam">
              체대입시 상담 신청
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
