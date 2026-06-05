import Image from "next/image";
import Link from "next/link";
import { ConsultationCTA, PageShell } from "../../_components/SiteChrome";

const programPhases = [
  {
    step: "01",
    title: "Warm-up",
    text: "호흡, 체온, 관절 움직임을 준비해 몸이 운동을 받아들일 수 있게 만듭니다.",
  },
  {
    step: "02",
    title: "Mobility / Activation",
    text: "제한된 움직임은 열어주고, 약하게 작동하는 근육은 먼저 깨웁니다.",
  },
  {
    step: "03",
    title: "Balance / Stability",
    text: "중심축, 발목, 무릎, 골반이 버티는 힘을 만들어 실제 동작의 안정성을 높입니다.",
  },
  {
    step: "04",
    title: "Resistance Training",
    text: "현재 몸 상태에 맞는 저항 운동으로 근력과 움직임 제어 능력을 쌓습니다.",
  },
  {
    step: "05",
    title: "Conditioning",
    text: "목표에 따라 보행 체력, 실기 체력, 선수 복귀 체력처럼 필요한 에너지를 훈련합니다.",
  },
  {
    step: "06",
    title: "Cool-down",
    text: "수업 후 긴장과 피로를 정리하고 다음 수업까지 회복할 수 있게 마무리합니다.",
  },
];

const applicationCases = [
  {
    label: "시니어",
    title: "걷기와 계단 회복",
    text: "가동성, 균형, 하체 근력, 보행 체력을 순서대로 쌓아 일상 동작을 다시 편하게 만듭니다.",
  },
  {
    label: "선수/학생",
    title: "부상 후 복귀",
    text: "착지, 감속, 방향전환, 근력 회복을 단계별로 연결해 다시 경기나 훈련에 들어갈 준비를 합니다.",
  },
  {
    label: "체대입시",
    title: "실기 기록 향상",
    text: "점프, 왕복달리기, 코어 안정성, 하체 반응을 실기 종목에 맞춰 훈련합니다.",
  },
  {
    label: "통증 관리",
    title: "무리 없는 근력 회복",
    text: "통증을 참는 반복 운동이 아니라, 가능한 범위에서 힘과 움직임을 다시 쌓습니다.",
  },
];

const weeklyExample = [
  "1회차: 움직임 평가 기반 가동성, 안정성, 기초 근력",
  "2회차: 약점 동작 보완, 저항 운동, 실기 또는 일상 동작 적용",
  "3회차: 컨디셔닝, 기록 측정, 회복 루틴 정리",
];

export default function OptProgramPage() {
  return (
    <PageShell>
      <section className="page-hero system-detail-hero">
        <div className="container system-hero-grid">
          <div className="page-title">
            <p className="eyebrow">SYSTEM 03</p>
            <h1>OPT 기반 프로그램은 수업의 순서와 강도를 체계화합니다.</h1>
            <p>
              Warm-up부터 Cool-down까지 목적에 맞게 설계합니다. 회원의 상태와 목표에 따라 같은 운동도 순서, 범위,
              반복 수, 회복 시간이 달라집니다.
            </p>
            <div className="button-row">
              <Link href="/apply" className="button primary">
                프로그램 상담 신청
              </Link>
              <Link href="/system/online-survey" className="button secondary">
                설문 단계 보기
              </Link>
            </div>
          </div>
          <div className="system-visual-card">
            <Image src="/images/coach-card.jpg" alt="RePERFORMANCE 프로그램 진행 현장" width={720} height={900} />
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">PROGRAM PHASE</p>
            <h2>수업은 단계별로 쌓입니다.</h2>
            <p>그날 컨디션에 따라 강도는 조절하지만, 수업의 흐름은 목적 있게 이어집니다.</p>
          </div>
          <div className="grid-3">
            {programPhases.map((phase) => (
              <div className="card system-program-card" key={phase.step}>
                <span className="card-number">{phase.step}</span>
                <h3>{phase.title}</h3>
                <p>{phase.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">APPLICATION</p>
            <h2>대상별 적용 사례</h2>
            <p>OPT 기반 구조 안에서 시니어, 선수, 체대입시생, 일반 회원의 목표를 다르게 반영합니다.</p>
          </div>
          <div className="grid-2">
            {applicationCases.map((item) => (
              <div className="card system-case-card" key={item.title}>
                <p className="card-label">{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container detail-grid">
          <div className="contact-box accent-box">
            <p className="eyebrow">WEEKLY PLAN</p>
            <h2>주간 프로그램 예시</h2>
            <ul>
              {weeklyExample.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="contact-box">
            <p className="eyebrow">ADJUSTMENT</p>
            <h2>매 회차 조절하는 기준</h2>
            <p>
              통증 변화, 피로도, 기록 변화, 수면 상태, 운동 수행 품질을 보고 강도를 조절합니다. 무조건 많이 하는
              것이 아니라, 다음 단계로 갈 수 있을 만큼 안정적으로 쌓는 것이 목표입니다.
            </p>
            <div className="quote-card">운동은 많이 하는 것보다, 지금 몸에 맞게 쌓는 것이 중요합니다.</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">OUTPUT</p>
            <h2>프로그램 후 남기는 기록</h2>
            <p>수업이 끝나면 다음 수업에서 이어갈 수 있도록 핵심 기록을 남깁니다.</p>
          </div>
          <div className="grid-3">
            <div className="card system-color-card program">
              <h3>운동 수행</h3>
              <p>가능한 동작, 어려웠던 동작, 자세 보정이 필요한 동작을 기록합니다.</p>
            </div>
            <div className="card system-color-card program">
              <h3>통증과 피로</h3>
              <p>운동 전후 통증 변화와 피로도를 확인해 다음 강도를 조절합니다.</p>
            </div>
            <div className="card system-color-card program">
              <h3>다음 목표</h3>
              <p>다음 회차에 다시 확인할 기록, 동작, 회복 루틴을 정리합니다.</p>
            </div>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
