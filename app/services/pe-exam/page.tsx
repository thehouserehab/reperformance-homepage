import Link from "next/link";
import { ConsultationCTA, PageShell } from "../../_components/SiteChrome";
import { serviceItems } from "../../_components/siteData";

const item = serviceItems[3];

const admissionSchedule = [
  {
    period: "2026.08.31",
    title: "수시 학생부 작성 기준일",
    note: "수시 지원 전 학교생활기록부 기준일을 확인합니다.",
  },
  {
    period: "2026.09.07 ~ 09.11",
    title: "수시 원서접수",
    note: "기간 중 3일 이상 대학별로 운영됩니다.",
  },
  {
    period: "2026.09.12 ~ 12.17",
    title: "수시 전형기간",
    note: "대학별 실기, 면접, 서류 일정이 이 기간 안에서 진행됩니다.",
  },
  {
    period: "2026.11.19",
    title: "2027학년도 수능",
    note: "수능 이후 정시 지원 전략과 실기 컨디션을 다시 조정합니다.",
  },
  {
    period: "2026.12.11",
    title: "수능 성적 통지",
    note: "실제 성적 기준으로 가군, 나군, 다군 조합을 점검합니다.",
  },
  {
    period: "2027.01.04 ~ 01.07",
    title: "정시 원서접수",
    note: "기간 중 3일 이상 대학별로 운영됩니다.",
  },
  {
    period: "2027.01.11 ~ 01.31",
    title: "정시 가군, 나군, 다군 전형",
    note: "가군 01.11~01.17, 나군 01.18~01.24, 다군 01.25~01.31입니다.",
  },
  {
    period: "2027.02.05까지",
    title: "정시 합격자 발표",
    note: "합격, 예비, 추가 충원 가능성을 함께 확인합니다.",
  },
];

const consultingPoints = [
  {
    title: "목표 대학과 모집단위",
    text: "체육교육과, 스포츠과학과, 운동건강관리, 경찰/군 관련 학과 등 목표를 구분해 지원 방향을 정리합니다.",
  },
  {
    title: "내신, 수능, 실기 비율",
    text: "대학별 반영 비율이 다르기 때문에 현재 성적과 실기 기록을 같은 표 안에서 비교합니다.",
  },
  {
    title: "실기 종목별 기록",
    text: "제자리멀리뛰기, 윗몸일으키기, 왕복달리기, 좌전굴, 배근력 등 대학별 종목을 기록으로 관리합니다.",
  },
  {
    title: "부상 이력과 컨디션",
    text: "무릎, 발목, 허리, 어깨 상태를 확인해 기록 향상과 부상 방지를 동시에 설계합니다.",
  },
];

const practicalEvents = [
  "제자리멀리뛰기",
  "윗몸일으키기",
  "10m 왕복달리기",
  "왕복오래달리기",
  "좌전굴",
  "배근력",
  "메디신볼 던지기",
  "농구, 축구 등 대학별 선택 종목",
];

const managementSteps = [
  {
    number: "01",
    title: "입시 상담",
    text: "희망 대학, 성적, 실기 기록, 운동 가능 시간을 정리해 현재 위치를 확인합니다.",
  },
  {
    number: "02",
    title: "기록 측정",
    text: "종목별 기준 기록을 만들고 약점 종목과 부상 위험 동작을 분리합니다.",
  },
  {
    number: "03",
    title: "주간 훈련 설계",
    text: "기록 향상, 기술 연습, 회복, 모의 실기 일정을 주 단위로 관리합니다.",
  },
  {
    number: "04",
    title: "지원 전략 점검",
    text: "수시 6회 제한, 정시 군별 지원 기준, 대학별 실기 일정을 함께 확인합니다.",
  },
];

export default function PeExamPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">PE EXAM CONSULTING</p>
          <h1>체대입시생을 운동 기록과 입시 전략으로 함께 관리합니다.</h1>
          <p>
            체대입시는 실기 운동만 잘한다고 끝나지 않습니다. 목표 대학, 성적, 실기 기록, 일정, 컨디션을 같이
            관리해야 안정적으로 준비할 수 있습니다.
          </p>
          <div className="button-row">
            <Link className="button primary" href={item.applyHref}>
              체대입시 신청하기
            </Link>
            <Link className="button secondary" href="/apply?service=pe-exam">
              PAR-Q 설문까지 진행
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid-2">
          <div className="contact-box">
            <p className="eyebrow">WHY</p>
            <h2>운동과 입시 상담을 분리하지 않습니다.</h2>
            <p>
              체대입시생에게 필요한 것은 기록 향상만이 아니라, 어떤 대학을 목표로 할지, 어떤 전형에 맞춰 준비할지,
              현재 기록이 합격 가능성과 어떻게 연결되는지 확인하는 과정입니다.
            </p>
            <div className="quote-card">
              체대입시는 운동 기록과 지원 전략을 함께 관리해야 흔들리지 않습니다.
            </div>
          </div>
          <div className="contact-box accent-box">
            <h2>상담에서 먼저 확인하는 것</h2>
            <div className="info-list">
              {consultingPoints.map((point) => (
                <div className="info-item" key={point.title}>
                  <strong>Check</strong>
                  <span>
                    <b>{point.title}</b>
                    <br />
                    {point.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">2027 ADMISSION SCHEDULE</p>
            <h2>2027학년도 체대입시 주요 일정</h2>
            <p>
              아래 일정은 한국대학교육협의회 2027학년도 대학입학전형기본사항을 기준으로 정리했습니다. 대학별
              세부 실기 일정과 모집요강은 반드시 각 대학 발표 자료로 다시 확인합니다.
            </p>
          </div>
          <div className="grid-3">
            {admissionSchedule.map((schedule) => (
              <div className="card" key={schedule.title}>
                <span className="card-number">{schedule.period}</span>
                <h3>{schedule.title}</h3>
                <p>{schedule.note}</p>
              </div>
            ))}
          </div>
          <div className="notice">
            수시모집은 최대 6개 전형 이내에서 복수지원이 가능하며, 정시모집은 가군, 나군, 다군별로 1회씩
            지원할 수 있습니다. 세부 예외와 제한 사항은 대학별 모집요강을 확인해야 합니다.
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container detail-grid">
          <div className="contact-box">
            <p className="eyebrow">PRACTICAL TEST</p>
            <h2>실기 종목은 기록표로 관리합니다.</h2>
            <p>
              같은 체대입시라도 대학마다 실기 종목, 배점, 측정 방식이 다릅니다. 리퍼포먼스는 목표 대학별 종목을
              분리하고, 현재 기록과 목표 기록의 차이를 줄이는 방식으로 훈련합니다.
            </p>
            <ul>
              {practicalEvents.map((event) => (
                <li key={event}>{event}</li>
              ))}
            </ul>
          </div>
          <div className="contact-box">
            <p className="eyebrow">TRAINING DIRECTION</p>
            <h2>기록 향상과 부상 방지를 같이 봅니다.</h2>
            <p>
              반복 훈련만으로는 기록이 안정적으로 올라가지 않습니다. 점프, 착지, 방향전환, 코어 안정성, 하체 근력,
              가동성, 회복 상태를 확인해 실기 기록을 올릴 수 있는 몸을 만듭니다.
            </p>
            <div className="mini-list">
              <strong>관리 기준</strong>
              <span>기초 체력, 종목 기술, 부상 위험, 컨디션, 대학별 일정</span>
              <strong>목표</strong>
              <span>실기 기록 향상과 실제 전형 당일의 안정적인 수행</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">MANAGEMENT SYSTEM</p>
            <h2>체대입시생 관리 체계</h2>
            <p>
              상담에서 끝나는 것이 아니라, 기록 측정, 주간 훈련, 지원 전략, 학부모 상담까지 이어지는 흐름으로
              관리합니다.
            </p>
          </div>
          <div className="grid-2">
            {managementSteps.map((step) => (
              <div className="card" key={step.number}>
                <span className="card-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid-2">
          <div className="contact-box accent-box">
            <p className="eyebrow">FOR STUDENTS</p>
            <h2>학생에게 보여줄 수 있는 정보</h2>
            <ul>
              <li>목표 대학과 전형 일정</li>
              <li>대학별 실기 종목과 현재 기록</li>
              <li>이번 주 훈련 목표와 회복 체크</li>
              <li>수시, 정시 지원 시 확인해야 할 제한 사항</li>
              <li>상담 후 다음 행동 계획</li>
            </ul>
          </div>
          <div className="contact-box">
            <p className="eyebrow">NEXT</p>
            <h2>처음 상담은 현재 위치 확인부터 시작합니다.</h2>
            <p>
              신청서를 남기면 목표 대학, 현재 성적, 실기 기록, 부상 이력, 운동 가능 시간을 기준으로 상담 방향을
              정리합니다. PAR-Q 설문까지 완료하면 첫 상담에서 더 빠르게 운동 계획을 잡을 수 있습니다.
            </p>
            <div className="button-row">
              <Link className="button primary" href={item.applyHref}>
                체대입시 상담 신청
              </Link>
              <Link className="button secondary" href="/services">
                전체 서비스 보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
