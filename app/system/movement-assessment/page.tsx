import Image from "next/image";
import Link from "next/link";
import { ConsultationCTA, PageShell } from "../../_components/SiteChrome";

const assessmentZones = [
  {
    title: "어깨와 흉추",
    text: "팔을 올릴 때 어깨만 쓰는지, 등과 흉추가 함께 움직이는지 확인합니다.",
  },
  {
    title: "골반과 고관절",
    text: "스쿼트, 런지, 보행에서 골반이 흔들리는지와 고관절 사용 범위를 봅니다.",
  },
  {
    title: "무릎과 발목",
    text: "착지, 방향 전환, 계단 동작에서 무릎 정렬과 발목 안정성을 확인합니다.",
  },
  {
    title: "중심축 안정성",
    text: "몸통이 버티는 힘, 좌우 균형, 호흡과 코어 사용을 함께 봅니다.",
  },
];

const assessmentFlow = [
  {
    step: "01",
    title: "관찰",
    text: "서 있는 자세, 걷기, 앉았다 일어나기처럼 자연스러운 움직임부터 봅니다.",
  },
  {
    step: "02",
    title: "기본 동작 테스트",
    text: "스쿼트, 런지, 팔 들기, 균형 동작으로 제한되는 패턴을 확인합니다.",
  },
  {
    step: "03",
    title: "통증 동작 분리",
    text: "아픈 동작을 무리하게 반복하지 않고, 통증이 줄어드는 범위와 대체 동작을 찾습니다.",
  },
  {
    step: "04",
    title: "프로그램 반영",
    text: "평가 결과에 따라 가동성, 안정성, 근력, 컨디셔닝의 우선순위를 정합니다.",
  },
];

const caseExamples = [
  {
    label: "무릎 통증",
    title: "계단에서 무릎이 불편한 회원",
    text: "무릎만 보는 대신 발목 가동성, 고관절 사용, 하체 정렬을 함께 확인해 계단 동작을 단계적으로 연습했습니다.",
  },
  {
    label: "어깨 불편",
    title: "팔을 올릴 때 목이 먼저 긴장되는 회원",
    text: "어깨 관절만 보지 않고 흉추 움직임과 견갑 안정성을 확인해 팔 들기 전 준비 동작을 넣었습니다.",
  },
  {
    label: "체대입시",
    title: "점프 착지 때 발목이 흔들리는 학생",
    text: "실기 기록을 올리기 전 착지 안정성, 발목 반응, 무릎 방향을 먼저 확인해 부상 위험을 낮췄습니다.",
  },
];

export default function MovementAssessmentPage() {
  return (
    <PageShell>
      <section className="page-hero system-detail-hero">
        <div className="container system-hero-grid reverse">
          <div className="system-visual-card">
            <Image src="/images/coach-profile.jpg" alt="RePERFORMANCE 움직임 평가 현장" width={720} height={900} />
          </div>
          <div className="page-title">
            <p className="eyebrow">SYSTEM 02</p>
            <h1>움직임 평가는 통증 부위가 아니라 전체 패턴을 봅니다.</h1>
            <p>
              불편한 부위만 보면 원인을 놓치기 쉽습니다. 어깨, 골반, 중심축, 하체 정렬을 함께 확인해 지금 몸에 맞는
              운동 범위와 강도를 정합니다.
            </p>
            <div className="button-row">
              <Link href="/system/opt-program" className="button primary">
                프로그램 설계 보기
              </Link>
              <Link href="/apply" className="button secondary">
                평가 신청하기
              </Link>
            </div>
            <div className="system-hero-badges" aria-label="움직임 평가 핵심 흐름">
              <span>관찰</span>
              <span>테스트</span>
              <span>운동 조절</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">ASSESSMENT ZONES</p>
            <h2>평가에서 확인하는 영역</h2>
            <p>몸은 한 부위씩 따로 움직이지 않기 때문에, 연결된 움직임을 함께 확인합니다.</p>
          </div>
          <div className="grid-2">
            {assessmentZones.map((zone) => (
              <div className="card system-color-card movement" key={zone.title}>
                <h3>{zone.title}</h3>
                <p>{zone.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">FLOW</p>
            <h2>평가는 수업 방향을 정하는 과정입니다.</h2>
            <p>평가 결과는 바로 그날 수업의 운동 순서, 강도, 금지 동작, 보완 동작에 반영됩니다.</p>
          </div>
          <div className="grid-2">
            {assessmentFlow.map((item) => (
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
            <h2>직접 적용한 사례</h2>
            <p>같은 통증도 움직임 패턴에 따라 운동 방향이 달라집니다.</p>
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
          <div className="contact-box">
            <p className="eyebrow">OUTPUT</p>
            <h2>평가 후 남기는 기준</h2>
            <ul>
              <li>현재 가능한 움직임 범위</li>
              <li>통증을 유발하는 동작과 피해야 할 강도</li>
              <li>먼저 개선해야 할 관절과 근육 패턴</li>
              <li>다음 수업에서 다시 확인할 체크 포인트</li>
            </ul>
          </div>
          <div className="contact-box accent-box">
            <p className="eyebrow">PRINCIPLE</p>
            <h2>통증을 참는 운동이 아니라, 몸에 맞게 조절하는 운동을 합니다.</h2>
            <p>
              평가의 목적은 운동을 못 하게 막는 것이 아니라, 안전하게 시작할 수 있는 범위를 찾는 것입니다. 가능한
              범위에서 움직임을 다시 만들고, 기록과 체력을 단계적으로 올립니다.
            </p>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
