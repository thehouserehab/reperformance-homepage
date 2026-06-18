import Image from "next/image";
import Link from "next/link";
import { ConsultationCTA, PageShell } from "./_components/SiteChrome";
import { site } from "./_components/siteData";

const proofItems = [
  { value: "1:1 상태 확인", label: "현재 불편한 움직임부터 확인합니다." },
  { value: "3단계 진행", label: "설문, 평가, 프로그램으로 이어집니다." },
  { value: "맞춤 운동 설계", label: "목표와 몸 상태에 따라 운동을 조정합니다." },
];

const audienceItems = [
  {
    number: "01",
    label: "Senior Rehab",
    title: "시니어 재활 트레이닝",
    href: "/services/senior-rehab",
    target: "보행, 계단, 균형, 하체 근력 저하로 일상이 불편한 분",
  },
  {
    number: "02",
    label: "Athlete Reconditioning",
    title: "선수·학생 리컨디셔닝",
    href: "/services/athlete-reconditioning",
    target: "복귀 준비, 움직임 제한, 경기력 회복이 필요한 선수와 학생",
  },
  {
    number: "03",
    label: "Pain Care",
    title: "일반 통증 케어",
    href: "/services/pain-care",
    target: "목, 어깨, 허리, 무릎 불편감과 체력 저하를 함께 관리하고 싶은 분",
  },
  {
    number: "04",
    label: "PE Exam",
    title: "체대입시 운동 + 입시상담",
    href: "/services/pe-exam",
    target: "목표 대학, 실기 기록, 훈련 계획을 한 흐름으로 정리하고 싶은 체대입시 준비생",
  },
];

const systemItems = [
  {
    number: "01",
    title: "설문",
    summary: "운동 목표, 불편감, PAR-Q 확인 내용을 먼저 남깁니다.",
  },
  {
    number: "02",
    title: "평가",
    summary: "현재 움직임, 근력, 균형, 주의사항을 확인합니다.",
  },
  {
    number: "03",
    title: "프로그램",
    summary: "목표와 몸 상태에 맞춰 수업 방향과 운동 구성을 정리합니다.",
  },
];

export default function Home() {
  return (
    <PageShell>
      <section className="hero">
        <Image
          src="/images/coach-card.jpg"
          alt="RePERFORMANCE 트레이닝 현장"
          fill
          sizes="100vw"
          className="hero-bg"
          priority
        />
        <div className="hero-scrim" />
        <div className="container hero-content">
          <p className="eyebrow light-text">Rehab to Performance</p>
          <h1>
            재활에서 움직임으로,
            <br />
            움직임에서 퍼포먼스로.
          </h1>
          <p className="lead">
            통증과 불편감을 단순히 참게 하지 않습니다. 현재 몸 상태를 확인하고,
            다시 움직일 수 있는 방향으로 회복과 훈련을 연결합니다.
          </p>
          <div className="hero-actions">
            <Link href={site.serviceApplyHref} className="button primary">
              상담 신청하기
            </Link>
            <Link href="/services" className="button hero-secondary">
              프로그램 보기
            </Link>
          </div>
          <div className="proof-strip" aria-label="RePERFORMANCE 진행 기준">
            {proofItems.map((item) => (
              <div key={item.value}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="hero-coach-note">
            <strong>정우현 Head Coach</strong>
            <span>상담부터 평가, 수업 방향까지 한 사람이 책임 있게 확인합니다.</span>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">FOR WHO</p>
            <h2>대상과 목표가 분명한 재활 트레이닝</h2>
            <p>
              시니어의 일상 회복, 선수와 학생의 복귀, 일반 통증 케어, 체대입시 준비까지
              몸 상태와 목표에 맞춰 프로그램을 조정합니다.
            </p>
          </div>
          <div className="grid-2 home-service-grid">
            {audienceItems.map((item) => (
              <Link href={item.href} className="card interactive-card home-audience-card" key={item.href}>
                <span className="card-number">{item.number}</span>
                <p className="card-label">{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.target}</p>
                <span className="more-link">자세히 보기</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">SYSTEM</p>
            <h2>설문, 평가, 프로그램으로 이어집니다.</h2>
            <p>
              감으로만 운동을 진행하지 않습니다. 현재 상태를 확인하고, 움직임을 평가한 뒤
              목적에 맞는 운동 프로그램을 설계합니다.
            </p>
          </div>
          <div className="grid-3">
            {systemItems.map((item) => (
              <article className="card system-step-card" key={item.number}>
                <span className="card-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </article>
            ))}
          </div>
          <div className="button-row">
            <Link href="/system" className="button dark">
              진행 방식 보기
            </Link>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container grid-2">
          <div className="contact-box">
            <p className="eyebrow">LOCATION</p>
            <h2>전주 서신동 773-2, 2층</h2>
            <div className="contact-list">
              <div>
                <strong>운영 시간</strong>
                <span>{site.hours}</span>
              </div>
              <div>
                <strong>주차</strong>
                <span>{site.parking}</span>
              </div>
              <div>
                <strong>연락</strong>
                <span>
                  {site.phone} / {site.instagram}
                </span>
              </div>
            </div>
            <div className="button-row">
              <Link href="/location" className="button dark">
                위치 자세히 보기
              </Link>
              <a href={site.naverMapHref} target="_blank" rel="noopener noreferrer" className="button secondary">
                네이버 지도
              </a>
            </div>
          </div>
          <div className="contact-box accent-box">
            <p className="eyebrow">AFTER APPLY</p>
            <h2>신청 후 관리는 NORE에서 이어갑니다.</h2>
            <p>
              홈페이지는 서비스 소개와 상담 신청에 집중합니다. 신청 후 상담이 진행되면
              코치가 필요한 회원 정보를 NORE에 등록하고 수업 일정, 운동 기록, 상담 메모를
              전문 관리 플랫폼 안에서 관리합니다.
            </p>
            <div className="button-row">
              <Link href={site.serviceApplyHref} className="button primary">
                상담 신청하기
              </Link>
              <Link href="/member" className="button secondary">
                관리 방식 보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
