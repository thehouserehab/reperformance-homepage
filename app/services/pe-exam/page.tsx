import Link from "next/link";
import PeExamCalendar from "./PeExamCalendar";
import { ConsultationCTA, PageShell } from "../../_components/SiteChrome";
import { serviceItems } from "../../_components/siteData";

const item = serviceItems[3];

const admissionSchedule = [
  {
    month: "2026.08",
    range: "08.31",
    label: "자료 기준",
    title: "수시 학생부 작성 기준일",
    note: "수시 지원 전 학교생활기록부 기준일을 확인합니다.",
    tone: "document",
  },
  {
    month: "2026.09",
    range: "09.07 ~ 09.11",
    label: "원서접수",
    title: "수시 원서접수",
    note: "기간 중 3일 이상 대학별로 운영됩니다.",
    tone: "application",
  },
  {
    month: "2026.09-12",
    range: "09.12 ~ 12.17",
    label: "수시 전형",
    title: "수시 전형기간",
    note: "대학별 실기, 면접, 서류 일정이 이 기간 안에서 진행됩니다.",
    tone: "exam",
  },
  {
    month: "2026.11",
    range: "11.19",
    label: "수능",
    title: "2027학년도 수능",
    note: "수능 이후 정시 지원 전략과 실기 컨디션을 다시 조정합니다.",
    tone: "exam",
  },
  {
    month: "2026.12",
    range: "12.11",
    label: "성적",
    title: "수능 성적 통지",
    note: "실제 성적 기준으로 가군, 나군, 다군 조합을 점검합니다.",
    tone: "decision",
  },
  {
    month: "2027.01",
    range: "01.04 ~ 01.07",
    label: "원서접수",
    title: "정시 원서접수",
    note: "기간 중 3일 이상 대학별로 운영됩니다.",
    tone: "application",
  },
  {
    month: "2027.01-02",
    range: "01.11 ~ 02.01",
    label: "정시 전형",
    title: "정시 가군, 나군, 다군 전형",
    note: "가군 01.11~01.17, 나군 01.18~01.24, 다군 01.25~02.01입니다.",
    tone: "exam",
  },
  {
    month: "2027.02",
    range: "02.05까지",
    label: "합격발표",
    title: "정시 합격자 발표",
    note: "합격, 예비, 추가 충원 가능성을 함께 확인합니다.",
    tone: "decision",
  },
] as const;

const consultingPoints = [
  {
    title: "목표 대학과 모집단위",
    text: "체육교육과, 스포츠과학과, 운동건강관리, 경찰/군 관련 학과 등 목표를 구분해 지원 방향을 정리합니다.",
    tone: "strategy",
  },
  {
    title: "내신, 수능, 실기 비율",
    text: "대학별 반영 비율이 다르기 때문에 현재 성적과 실기 기록을 같은 표 안에서 비교합니다.",
    tone: "score",
  },
  {
    title: "실기 종목별 기록",
    text: "제자리멀리뛰기, 윗몸일으키기, 왕복달리기, 좌전굴, 배근력 등 대학별 종목을 기록으로 관리합니다.",
    tone: "record",
  },
  {
    title: "부상 이력과 컨디션",
    text: "무릎, 발목, 허리, 어깨 상태를 확인해 기록 향상과 부상 방지를 동시에 설계합니다.",
    tone: "condition",
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

const guideLastUpdatedAt = "2026.06.05";

const officialGuideLinks = [
  { region: "공통", university: "대입정보포털 어디가", focus: "대학별 전형, 모집요강, 입시결과 통합 확인", href: "https://www.adiga.kr/" },
  { region: "전북", university: "전북대학교", focus: "체육교육과, 스포츠과학과 관련 전형 확인", href: "https://enter.jbnu.ac.kr/mainIntro/intro.do" },
  { region: "전북", university: "전주대학교", focus: "운동처방, 생활체육, 경기지도 관련 모집요강 확인", href: "https://iphak.jj.ac.kr/" },
  { region: "전북", university: "원광대학교", focus: "스포츠과학, 체육 관련 모집단위 확인", href: "https://ipsi.wku.ac.kr/mainIntro/intro.do" },
  { region: "서울", university: "한국체육대학교", focus: "체육계열 특화 대학, 실기종목과 전형별 모집요강 확인", href: "https://www.knsu.ac.kr/ipsi" },
  { region: "서울", university: "서울대학교", focus: "체육교육과 전형, 수시/정시 자료 확인", href: "https://admission.snu.ac.kr/" },
  { region: "서울", university: "연세대학교", focus: "스포츠응용산업학과 등 체육계열 전형 확인", href: "https://admission.yonsei.ac.kr/" },
  { region: "서울", university: "고려대학교", focus: "체육교육과, 국제스포츠학부 관련 전형 확인", href: "https://oku.korea.ac.kr/oku/index.do" },
  { region: "수도권", university: "경희대학교", focus: "체육대학 모집요강과 실기 반영 방식 확인", href: "https://iphak.khu.ac.kr/main.do" },
  { region: "수도권", university: "중앙대학교", focus: "체육교육과 전형, 실기/수능 반영 방식 확인", href: "https://admission.cau.ac.kr/main.htm" },
  { region: "수도권", university: "단국대학교", focus: "스포츠과학대학, 생활체육, 운동처방재활 관련 확인", href: "https://ipsi.dankook.ac.kr/jukjeon/main.html" },
  { region: "수도권", university: "용인대학교", focus: "무도, 체육, 경호, 스포츠 관련 전형 확인", href: "https://ipsi.yongin.ac.kr/" },
];

const updatePolicies = [
  { title: "정기 업데이트", text: "수시 모집요강 발표 전후, 정시 모집요강 발표 전후, 원서접수 직전에는 우선 확인합니다." },
  { title: "학생별 목표 대학", text: "상담에서 목표 대학이 정해지면 해당 대학 모집요강, 실기종목, 반영비율을 별도 관리표에 추가합니다." },
  { title: "공식 자료 우선", text: "블로그나 요약 자료보다 대학 입학처, 대입정보포털, 대교협 자료를 기준으로 업데이트합니다." },
];

const managementSteps = [
  { number: "01", title: "입시 상담", text: "희망 대학, 성적, 실기 기록, 운동 가능 시간을 정리해 현재 위치를 확인합니다." },
  { number: "02", title: "기록 측정", text: "종목별 기준 기록을 만들고 약점 종목과 부상 위험 동작을 분리합니다." },
  { number: "03", title: "주간 훈련 설계", text: "기록 향상, 기술 연습, 회복, 모의 실기 일정을 주 단위로 관리합니다." },
  { number: "04", title: "지원 전략 점검", text: "수시 6회 제한, 정시 군별 지원 기준, 대학별 실기 일정을 함께 확인합니다." },
];

export default function PeExamPage() {
  return (
    <PageShell>
      <section className="page-hero pe-exam-hero">
        <div className="container page-title">
          <p className="eyebrow">PE EXAM CONSULTING</p>
          <h1>체대입시생을 운동 기록과 입시 전략으로 함께 관리합니다.</h1>
          <p>체대입시는 실기 운동만 잘한다고 끝나지 않습니다. 목표 대학, 성적, 실기 기록, 일정, 컨디션을 같이 관리해야 안정적으로 준비할 수 있습니다.</p>
          <div className="button-row">
            <Link className="button primary" href={item.applyHref}>체대입시 신청하기</Link>
            <Link className="button secondary" href="/apply?service=pe-exam">PAR-Q 설문까지 진행</Link>
          </div>
          <div className="pe-hero-metrics" aria-label="체대입시 관리 핵심">
            <div><strong>8</strong><span>입시 일정 포인트</span></div>
            <div><strong>12</strong><span>공식 모집요강 링크</span></div>
            <div><strong>4</strong><span>상담 관리 축</span></div>
          </div>
        </div>
      </section>

      <section className="section pe-section-consulting">
        <div className="container grid-2">
          <div className="contact-box">
            <p className="eyebrow">WHY</p>
            <h2>운동과 입시 상담을 분리하지 않습니다.</h2>
            <p>체대입시생에게 필요한 것은 기록 향상만이 아니라, 어떤 대학을 목표로 할지, 어떤 전형에 맞춰 준비할지, 현재 기록이 합격 가능성과 어떻게 연결되는지 확인하는 과정입니다.</p>
            <div className="quote-card">체대입시는 운동 기록과 지원 전략을 함께 관리해야 흔들리지 않습니다.</div>
          </div>
          <div className="contact-box accent-box">
            <h2>상담에서 먼저 확인하는 것</h2>
            <div className="info-list">
              {consultingPoints.map((point) => (
                <div className={`info-item pe-info-item ${point.tone}`} key={point.title}>
                  <strong>Check</strong>
                  <span><b>{point.title}</b><br />{point.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section pe-section-schedule">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">2027 ADMISSION SCHEDULE</p>
            <h2>2027학년도 체대입시 주요 일정을 캘린더로 봅니다.</h2>
            <p>아래 일정은 한국대학교육협의회 2027학년도 대학입학전형기본사항을 기준으로 정리했습니다. 대학별 세부 실기 일정과 모집요강은 반드시 각 대학 발표 자료로 다시 확인합니다.</p>
          </div>
          <PeExamCalendar events={admissionSchedule} />
          <div className="notice">수시모집은 최대 6개 전형 이내에서 복수지원이 가능하며, 정시모집은 가군, 나군, 다군별로 1회씩 지원할 수 있습니다. 세부 예외와 제한 사항은 대학별 모집요강을 확인해야 합니다.</div>
        </div>
      </section>

      <section className="section pe-section-guides">
        <div className="container">
          <div className="section-head"><p className="eyebrow">UNIVERSITY GUIDE LINKS</p><h2>대학별 모집요강을 공식 링크로 바로 확인합니다.</h2><p>체대입시 모집요강은 대학별로 발표 시기와 실기 반영 방식이 달라집니다. 아래 링크는 2026년 6월 5일 기준 공식 입학처와 대입정보포털 접속을 확인한 대표 링크입니다.</p></div>
          <div className="grid-3">
            {officialGuideLinks.map((link) => (
              <div className={`card pe-guide-card ${link.region === "공통" ? "common" : link.region === "전북" ? "local" : link.region === "서울" ? "seoul" : "metro"}`} key={link.university}>
                <p className="card-label">{link.region}</p><h3>{link.university}</h3><p>{link.focus}</p><a className="more-link" href={link.href} target="_blank" rel="noopener noreferrer">공식 모집요강 확인</a>
              </div>
            ))}
          </div>
          <div className="notice">마지막 링크 확인일: {guideLastUpdatedAt}. 대학별 PDF 파일은 매년 주소가 바뀔 수 있어, 페이지에서는 공식 입학처와 모집요강 게시판으로 연결합니다.</div>
        </div>
      </section>

      <section className="section light pe-section-update"><div className="container"><div className="section-head"><p className="eyebrow">UPDATE RULE</p><h2>리퍼포먼스가 직접 확인하고 업데이트합니다.</h2><p>단순 링크 모음에서 끝나지 않도록, 상담 중인 학생의 목표 대학은 별도 관리표로 정리하고 일정 기간마다 모집요강 변경 여부를 확인합니다.</p></div><div className="grid-3">{updatePolicies.map((policy) => (<div className="card" key={policy.title}><h3>{policy.title}</h3><p>{policy.text}</p></div>))}</div></div></section>
      <section className="section pe-section-practical"><div className="container detail-grid"><div className="contact-box"><p className="eyebrow">PRACTICAL TEST</p><h2>실기 종목은 기록표로 관리합니다.</h2><p>같은 체대입시라도 대학마다 실기 종목, 배점, 측정 방식이 다릅니다. 리퍼포먼스는 목표 대학별 종목을 분리하고, 현재 기록과 목표 기록의 차이를 줄이는 방식으로 훈련합니다.</p><ul>{practicalEvents.map((event) => (<li key={event}>{event}</li>))}</ul></div><div className="contact-box"><p className="eyebrow">TRAINING DIRECTION</p><h2>기록 향상과 부상 방지를 같이 봅니다.</h2><p>반복 훈련만으로는 기록이 안정적으로 올라가지 않습니다. 점프, 착지, 방향전환, 코어 안정성, 하체 근력, 가동성, 회복 상태를 확인해 실기 기록을 올릴 수 있는 몸을 만듭니다.</p><div className="mini-list"><strong>관리 기준</strong><span>기초 체력, 종목 기술, 부상 위험, 컨디션, 대학별 일정</span><strong>목표</strong><span>실기 기록 향상과 실제 전형 당일의 안정적인 수행</span></div></div></div></section>
      <section className="section light pe-section-management"><div className="container"><div className="section-head"><p className="eyebrow">MANAGEMENT SYSTEM</p><h2>체대입시생 관리 체계</h2><p>상담에서 끝나는 것이 아니라, 기록 측정, 주간 훈련, 지원 전략, 학부모 상담까지 이어지는 흐름으로 관리합니다.</p></div><div className="grid-2">{managementSteps.map((step) => (<div className="card" key={step.number}><span className="card-number">{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></div>))}</div></div></section>
      <section className="section pe-section-student"><div className="container grid-2"><div className="contact-box accent-box"><p className="eyebrow">FOR STUDENTS</p><h2>학생에게 보여줄 수 있는 정보</h2><ul><li>목표 대학과 전형 일정</li><li>대학별 실기 종목과 현재 기록</li><li>이번 주 훈련 목표와 회복 체크</li><li>수시, 정시 지원 시 확인해야 할 제한 사항</li><li>상담 후 다음 행동 계획</li></ul></div><div className="contact-box"><p className="eyebrow">NEXT</p><h2>처음 상담은 현재 위치 확인부터 시작합니다.</h2><p>신청서를 남기면 목표 대학, 현재 성적, 실기 기록, 부상 이력, 운동 가능 시간을 기준으로 상담 방향을 정리합니다. PAR-Q 설문까지 완료하면 첫 상담에서 더 빠르게 운동 계획을 잡을 수 있습니다.</p><div className="button-row"><Link className="button primary" href={item.applyHref}>체대입시 상담 신청</Link><Link className="button secondary" href="/services">전체 서비스 보기</Link></div></div></div></section>
      <ConsultationCTA />
    </PageShell>
  );
}
