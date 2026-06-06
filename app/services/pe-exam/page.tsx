import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PeExamCalendar from "./PeExamCalendar";
import styles from "./PeExamCare.module.css";
import { peExamDetailPages } from "./peExamData";
import { serviceItems, site } from "../../_components/siteData";

const item = serviceItems[3];

export const metadata: Metadata = {
  title: "RePERFORMANCE 체대입시",
  description:
    "체대입시생의 실기 기록, 입시 전략, 컨디션, 부상 예방, 학부모 리포트를 함께 관리하는 RePERFORMANCE 체대입시 전문 시스템입니다.",
};

const schedule = [
  { month: "2026.09", range: "09.07 ~ 09.11", label: "원서접수", title: "수시 원서접수", note: "목표 대학별 전형과 실기 일정을 함께 점검합니다.", tone: "application" },
  { month: "2026.09-12", range: "09.12 ~ 12.17", label: "수시 전형", title: "수시 실기·면접 전형", note: "대학별 실기 방식에 맞춰 실전 루틴을 조정합니다.", tone: "exam" },
  { month: "2026.11", range: "11.19", label: "수능", title: "2027학년도 수능", note: "수능 이후 정시 지원 가능성과 컨디션을 다시 정리합니다.", tone: "exam" },
  { month: "2027.01", range: "01.04 ~ 01.07", label: "원서접수", title: "정시 원서접수", note: "가군, 나군, 다군 조합과 실기 일정을 확정합니다.", tone: "application" },
  { month: "2027.01-02", range: "01.11 ~ 02.01", label: "정시 전형", title: "정시 실기 전형", note: "전형 당일 순서, 휴식, 긴장도, 실수 대처까지 시뮬레이션합니다.", tone: "decision" },
] as const;

const modules = [
  ["ADMISSION MAP", "목표 대학 역산 전략", "희망 대학, 내신, 수능 예상, 실기 반영비율을 한 표로 묶어 지금 필요한 우선순위를 정합니다."],
  ["RECORD BOARD", "종목별 기록판", "현재 기록, 목표 기록, 주간 변화, 약점 동작을 나누어 학생이 무엇을 올려야 하는지 바로 보게 합니다."],
  ["TRAINING BLOCK", "주간 훈련 블록", "기초 체력, 종목 기술, 파워, 스피드, 회복을 주 단위로 배치합니다."],
  ["CONDITION GUARD", "부상·컨디션 관리", "발목, 무릎, 허리, 어깨 상태를 기록하고 기록 향상과 부상 예방을 동시에 관리합니다."],
  ["PARENT REPORT", "학부모 공유 리포트", "이번 주 기록, 훈련 내용, 다음 목표, 지원 전략 변화를 정리해 공유합니다."],
  ["FINAL SIMULATION", "실전 시뮬레이션", "대학별 실기 방식에 맞춰 순서, 휴식, 긴장도, 실수 대처까지 점검합니다."],
] as const;

const records = [
  ["제자리멀리뛰기", "235cm", "255cm", "폭발력·착지 안정"],
  ["10m 왕복달리기", "10.8초", "10.2초", "감속·방향전환"],
  ["윗몸일으키기", "48회", "58회", "코어 지속력"],
  ["좌전굴", "17cm", "22cm", "햄스트링·골반 가동성"],
] as const;

const guideLinks = [
  ["대입정보포털 어디가", "대학별 전형, 모집요강, 입시결과 통합 확인", "https://www.adiga.kr/"],
  ["전북대학교", "체육교육과, 스포츠과학과 관련 전형 확인", "https://enter.jbnu.ac.kr/mainIntro/intro.do"],
  ["전주대학교", "운동처방, 생활체육, 경기지도 관련 모집요강 확인", "https://iphak.jj.ac.kr/"],
  ["한국체육대학교", "체육계열 특화 대학, 실기종목과 전형별 모집요강 확인", "https://www.knsu.ac.kr/ipsi"],
  ["경희대학교", "체육대학 모집요강과 실기 반영 방식 확인", "https://iphak.khu.ac.kr/main.do"],
  ["용인대학교", "무도, 체육, 경호, 스포츠 관련 전형 확인", "https://ipsi.yongin.ac.kr/"],
] as const;

const weekly = [
  ["MON", "기록 측정과 약점 분석", "종목별 현재 기록을 확인하고 이번 주 목표 기록을 정합니다."],
  ["WED", "기술 보정과 체력 블록", "점프, 착지, 방향전환, 코어, 하체 근력을 목적별로 훈련합니다."],
  ["FRI", "실전 루틴과 컨디션 체크", "실기 순서, 휴식, 긴장도, 통증 여부를 전형 당일 기준으로 점검합니다."],
  ["SUN", "전략 리포트 정리", "기록 변화, 회복 상태, 목표 대학 전략을 학생과 보호자에게 공유합니다."],
] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PeExamPage() {
  return (
    <main className={cx("pe-standalone-page", styles.page)}>
      <header className="pe-standalone-nav" aria-label="RePERFORMANCE 체대입시">
        <div className="container pe-standalone-nav-inner">
          <Link href="/pe-exam" className="pe-standalone-brand" aria-label="RePERFORMANCE 체대입시 홈">
            <strong>RePERFORMANCE</strong>
            <span>체대입시</span>
          </Link>
          <div className="pe-standalone-actions">
            <a href={site.phoneHref}>{site.phone}</a>
            <Link href={item.applyHref}>상담 신청</Link>
          </div>
        </div>
      </header>

      <section className="pe-motivation-hero">
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
          <h1>체대입시는 운동만이 아니라, 관리 시스템으로 준비합니다.</h1>
          <p className="lead">
            목표 대학, 성적, 실기 기록, 부상 위험, 컨디션, 학부모 공유까지 한 흐름으로 관리합니다. 학생이 지금
            무엇을 해야 하는지 매주 보이게 만드는 체대입시 전문 케어입니다.
          </p>
          <div className="button-row">
            <Link className="button pe-hero-primary" href={item.applyHref}>체대입시 상담 신청</Link>
            <Link className="button pe-hero-secondary" href="/apply?service=pe-exam">PAR-Q 설문까지 진행</Link>
          </div>
          <div className={styles.heroMetrics} aria-label="체대입시 관리 핵심">
            <div><strong>6</strong><span>전문 관리 모듈</span></div>
            <div><strong>WEEKLY</strong><span>기록·컨디션 업데이트</span></div>
            <div><strong>3-WAY</strong><span>학생·코치·학부모 공유</span></div>
          </div>
        </div>
      </section>

      <section className={cx("section", styles.hubSection)}>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">PE EXAM PAGES</p>
            <h2>체대입시 관리 내용을 페이지별로 나눠서 확인합니다.</h2>
            <p>
              목표 대학 전략, 기록 관리, 주간 훈련, 컨디션, 학부모 리포트, 실전 시뮬레이션을 각각의 전문 페이지에서
              확인할 수 있습니다.
            </p>
          </div>
          <div className={styles.hubGrid}>
            {peExamDetailPages.map((page) => (
              <Link className={styles.hubCard} href={`/services/pe-exam/${page.slug}`} key={page.slug}>
                <p>{page.label}</p>
                <h3>{page.title}</h3>
                <span>{page.description}</span>
                <strong>자세히 보기</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={cx("section", styles.systemOverview)}>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">CARE SYSTEM</p>
            <h2>학생이 안심할 수 있는 체대입시 전문 관리 구조</h2>
            <p>
              리퍼포먼스 체대입시는 “열심히 운동한다”에서 끝나지 않습니다. 목표 대학을 기준으로 현재 위치를 확인하고,
              기록과 컨디션을 매주 업데이트해 입시 준비가 눈에 보이도록 만듭니다.
            </p>
          </div>
          <div className={styles.systemLayout}>
            <div className={styles.systemMap}>
              <p className="eyebrow light-text">STUDENT CARE MAP</p>
              <h3>한 명의 학생을 네 방향에서 봅니다.</h3>
              <div className={styles.stageList}>
                <span>입시 가능성</span><span>실기 기록</span><span>몸 상태</span><span>주간 실행력</span>
              </div>
              <p>대학별 반영 방식, 현재 기록, 부상 이력, 훈련 가능 시간을 함께 보고 이번 주 행동까지 좁혀냅니다.</p>
            </div>
            <div className={styles.moduleGrid}>
              {modules.map(([label, title, text], index) => (
                <article className={styles.careModule} key={label}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{label}</p>
                  <h3>{title}</h3>
                  <small>{text}</small>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={cx("section", styles.dashboardSection)}>
        <div className={cx("container", styles.dashboardGrid)}>
          <div className={styles.dashboardCard}>
            <div className={styles.dashboardTop}>
              <div><p className="eyebrow">STUDENT DASHBOARD</p><h2>학생 개인 관리판 예시</h2></div>
              <span>예시 화면</span>
            </div>
            <div className={styles.dashboardStats}>
              <div><strong>3곳</strong><span>목표 대학</span><small>상향·적정·안정 분리</small></div>
              <div><strong>5개</strong><span>관리 종목</span><small>대학별 실기 기준</small></div>
              <div><strong>4회</strong><span>주간 체크</span><small>훈련·회복·기록·전략</small></div>
            </div>
            <div className={styles.strategyBoard}>
              <div className={styles.strategyRow}><span>입시 전략</span><strong>수시/정시 가능성 비교</strong><small>내신, 수능 예상, 실기 기록을 함께 판단</small></div>
              <div className={styles.strategyRow}><span>실기 우선순위</span><strong>점프·왕복·코어 안정성</strong><small>기록 상승 폭이 큰 종목부터 집중</small></div>
              <div className={styles.strategyRow}><span>컨디션 리스크</span><strong>발목 피로, 허리 부담</strong><small>훈련 강도와 회복 루틴을 함께 조정</small></div>
            </div>
            <div className={styles.recordBoard} aria-label="종목별 기록 관리 예시">
              <div className={cx(styles.recordRow, styles.recordHead)}><span>종목</span><span>현재</span><span>목표</span><span>관리 포인트</span></div>
              {records.map(([event, current, goal, focus]) => (
                <div className={styles.recordRow} key={event}><span>{event}</span><strong>{current}</strong><strong>{goal}</strong><span>{focus}</span></div>
              ))}
            </div>
          </div>

          <aside className={styles.weeklyPanel}>
            <p className="eyebrow light-text">WEEKLY CARE LOOP</p>
            <h2>매주 관리되는 것이 분명해야 학생이 흔들리지 않습니다.</h2>
            <p>기록이 오르지 않는 시기, 부상 걱정, 목표 대학 불안이 동시에 올 때 버틸 수 있는 구조를 만듭니다.</p>
            <div className={styles.weekList}>
              {weekly.map(([day, title, text]) => (
                <div className={styles.weekItem} key={day}>
                  <span>{day}</span>
                  <div><strong>{title}</strong><small>{text}</small></div>
                </div>
              ))}
            </div>
            <div className={styles.parentReport}>
              <h3>학부모에게 공유되는 내용</h3>
              <ul>
                <li>이번 주 기록 변화와 다음 목표</li>
                <li>목표 대학별 실기 종목과 준비 우선순위</li>
                <li>부상 위험 동작과 회복 관리 메모</li>
                <li>원서, 수능, 실기 일정에 맞춘 다음 행동</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <section className="section pe-section-schedule">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">2027 ADMISSION SCHEDULE</p>
            <h2>입시 일정은 캘린더처럼 넘기며 확인합니다.</h2>
            <p>수시, 수능, 정시, 실기 전형의 큰 흐름을 먼저 잡고 대학별 세부 일정은 상담 후 관리표에 추가합니다.</p>
          </div>
          <PeExamCalendar events={schedule} />
        </div>
      </section>

      <section className={cx("section", styles.guideSection)}>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">UNIVERSITY GUIDE LINKS</p>
            <h2>목표 대학의 모집요강을 공식 링크로 바로 확인합니다.</h2>
            <p>목표 대학이 정해지면 모집요강, 실기종목, 반영비율을 별도 관리표에 추가해 상담과 훈련에 연결합니다.</p>
          </div>
          <div className={styles.guideGrid}>
            {guideLinks.map(([name, focus, href]) => (
              <article className={styles.guideCard} key={name}>
                <p>공식 자료</p>
                <h3>{name}</h3>
                <span>{focus}</span>
                <a href={href} target="_blank" rel="noopener noreferrer">공식 모집요강 확인</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section pe-final-section">
        <div className="container grid-2">
          <div className="contact-box pe-final-card">
            <p className="eyebrow light-text">FOR STUDENTS</p>
            <h2>학생과 학부모가 함께 확인하는 케어</h2>
            <ul>
              <li>목표 대학과 전형 일정</li>
              <li>대학별 실기 종목과 현재 기록</li>
              <li>이번 주 훈련 목표와 회복 체크</li>
              <li>상담 후 다음 행동 계획과 학부모 공유 메모</li>
            </ul>
          </div>
          <div className="contact-box">
            <p className="eyebrow">NEXT</p>
            <h2>처음 상담은 “현재 위치”를 정확히 보는 것부터 시작합니다.</h2>
            <p>
              신청서를 남기면 목표 대학, 현재 성적, 실기 기록, 부상 이력, 운동 가능 시간을 기준으로 상담 방향을
              정리합니다. PAR-Q 설문까지 완료하면 첫 상담에서 더 빠르게 기록 관리표와 훈련 우선순위를 잡을 수 있습니다.
            </p>
            <div className="button-row">
              <Link className="button primary" href={item.applyHref}>체대입시 상담 신청</Link>
              <Link className="button secondary" href="/apply?service=pe-exam">PAR-Q 설문까지 진행</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="pe-standalone-footer">
        <div className="container pe-standalone-footer-inner">
          <strong>RePERFORMANCE 체대입시</strong>
          <span>{site.address}</span>
          <a href={site.phoneHref}>{site.phone}</a>
        </div>
      </footer>
    </main>
  );
}
