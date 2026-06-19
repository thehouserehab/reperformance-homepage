import Image from "next/image";
import Link from "next/link";
import { ConsultationCTA, PageShell } from "../../_components/SiteChrome";
import { site } from "../../_components/siteData";

const surveyFields = [
  {
    title: "운동 목표",
    text: "통증 감소, 보행 회복, 근력 향상, 체대입시 실기 기록, 선수 복귀처럼 목적을 먼저 구분합니다.",
  },
  {
    title: "통증과 불편감",
    text: "언제, 어떤 동작에서, 어느 정도로 불편한지 확인해 첫 수업의 금지 동작과 조절 범위를 정합니다.",
  },
  {
    title: "운동 경험",
    text: "운동 초보인지, 기존 운동 경험이 있는지, 부상 후 복귀 중인지에 따라 시작 강도를 다르게 잡습니다.",
  },
  {
    title: "생활 패턴",
    text: "수면, 업무 자세, 운동 가능 시간, 주당 운동 빈도를 함께 봐서 지속 가능한 루틴으로 연결합니다.",
  },
];

const surveyFlow = [
  {
    step: "01",
    title: "신청과 설문",
    text: "서비스 신청 후 PAR-Q와 기본 설문을 작성해 현재 상태와 주의사항을 남깁니다.",
  },
  {
    step: "02",
    title: "상담 전 정리",
    text: "코치가 설문 내용을 보고 목표, 통증, 위험 요소, 운동 가능 시간을 먼저 정리합니다.",
  },
  {
    step: "03",
    title: "첫 수업 반영",
    text: "설문 내용은 움직임 평가와 프로그램 강도 설정에 바로 반영됩니다.",
  },
];

const caseExamples = [
  {
    label: "시니어 재활",
    title: "계단이 불편한 부모님",
    text: "무릎 통증, 낙상 걱정, 운동 경험 부족을 확인하고 하체 안정성 중심으로 첫 수업을 시작했습니다.",
  },
  {
    label: "체대입시",
    title: "기록은 올리고 싶은데 발목이 불안한 학생",
    text: "실기 목표 종목과 부상 이력을 같이 확인해 무리한 점프 훈련보다 착지 안정성부터 점검했습니다.",
  },
  {
    label: "통증 관리",
    title: "운동할 때 허리가 먼저 불편한 회원",
    text: "업무 자세, 통증 발생 동작, 운동 가능 빈도를 확인해 코어 안정화와 가동성 루틴을 먼저 적용했습니다.",
  },
];

export default function OnlineSurveyPage() {
  return (
    <PageShell>
      <section className="page-hero system-detail-hero">
        <div className="container system-hero-grid">
          <div className="page-title">
            <p className="eyebrow">SYSTEM 01</p>
            <h1>온라인 설문은 첫 수업의 방향을 정하는 출발점입니다.</h1>
            <p>
              운동을 바로 시작하기 전에 목표, 통증, 운동 경험, 생활 패턴을 먼저 확인합니다. 이 자료가 있어야 첫
              상담과 움직임 평가가 더 정확해집니다.
            </p>
            <div className="button-row">
              <Link href={site.serviceApplyHref} className="button primary">
                서비스 신청 / PAR-Q 작성
              </Link>
              <Link href="/system/movement-assessment" className="button secondary">
                다음 단계 보기
              </Link>
            </div>
            <div className="system-hero-badges" aria-label="온라인 설문 핵심 흐름">
              <span>목표 확인</span>
              <span>PAR-Q</span>
              <span>첫 수업 반영</span>
            </div>
          </div>
          <div className="system-visual-card">
            <Image
              src="/images/coach-profile.jpg"
              alt="RePERFORMANCE 상담을 안내하는 정우현 코치"
              width={720}
              height={900}
            />
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">SURVEY DATA</p>
            <h2>설문에서 확인하는 정보</h2>
            <p>설문은 단순한 문진표가 아니라 프로그램 설계의 기준 자료입니다.</p>
          </div>
          <div className="grid-2">
            {surveyFields.map((field) => (
              <div className="card system-color-card survey" key={field.title}>
                <h3>{field.title}</h3>
                <p>{field.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">FLOW</p>
            <h2>작성한 내용은 상담과 수업에 바로 연결됩니다.</h2>
            <p>고객이 남긴 정보는 코치가 첫 수업 전에 확인하고, 현장에서 다시 질문하며 보완합니다.</p>
          </div>
          <div className="grid-3">
            {surveyFlow.map((item) => (
              <div className="card system-step-card" key={item.step}>
                <span className="card-number">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">REAL USE</p>
            <h2>실제 적용 사례</h2>
            <p>회원 유형에 따라 같은 설문도 다르게 해석됩니다.</p>
          </div>
          <div className="grid-3">
            {caseExamples.map((item) => (
              <div className="card system-case-card" key={item.title}>
                <p className="card-label">{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container detail-grid">
          <div className="contact-box accent-box">
            <p className="eyebrow">COACH CHECK</p>
            <h2>코치가 보는 핵심</h2>
            <ul>
              <li>운동을 피해야 하는 의학적 주의사항이 있는가</li>
              <li>통증이 심해지는 동작과 줄어드는 동작은 무엇인가</li>
              <li>목표와 현재 운동 가능 시간이 현실적으로 맞는가</li>
              <li>첫 수업에서 바로 평가해야 할 움직임은 무엇인가</li>
            </ul>
          </div>
          <div className="contact-box">
            <p className="eyebrow">OUTPUT</p>
            <h2>설문 후 남기는 자료</h2>
            <p>
              설문 결과는 상담 전 확인 자료로 정리됩니다. 목표, 불편감, 운동 전 주의사항을 바탕으로
              첫 평가에서 확인할 움직임을 정합니다.
            </p>
            <div className="quote-card">좋은 프로그램은 질문을 잘 남기는 것에서 시작됩니다.</div>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
