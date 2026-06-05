import Image from "next/image";
import Link from "next/link";
import { ConsultationCTA, PageShell } from "./_components/SiteChrome";
import { serviceItems, site, systemItems } from "./_components/siteData";

const proofItems = [
  { value: "1:1", label: "개인 상태 기반 상담" },
  { value: "3 STEP", label: "설문, 평가, 프로그램" },
  { value: "OPT", label: "목적 맞춤 운동 설계" },
];

export default function Home() {
  return (
    <PageShell>
      <section className="hero">
        <Image src="/images/coach-card.jpg" alt="RePERFORMANCE 트레이닝 현장" fill sizes="100vw" className="hero-bg" priority />
        <div className="hero-scrim" />
        <div className="container hero-content">
          <p className="eyebrow light-text">Rehab to Performance</p>
          <h1>
            재활에서 움직임,
            <br />
            다시 퍼포먼스까지.
          </h1>
          <p className="lead">
            RePERFORMANCE는 통증과 불편감을 단순히 참게 하지 않습니다. 현재 몸 상태를 확인하고, 다시 움직일 수
            있는 방향으로 회복과 훈련을 연결합니다.
          </p>
          <div className="hero-actions">
            <Link href={site.serviceApplyHref} className="button primary">
              서비스 신청하기
            </Link>
            <Link href="/signup" className="button hero-secondary">
              회원가입
            </Link>
            <Link href="/login" className="button hero-secondary">
              로그인
            </Link>
          </div>
          <div className="proof-strip" aria-label="RePERFORMANCE 운영 기준">
            {proofItems.map((item) => (
              <div key={item.value}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="hero-coach-note">
            <strong>정우현 Head Coach</strong>
            <span>책임지고 개선해드립니다. 고객님의 건강한 회복을 돕겠습니다.</span>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">FOR WHO</p>
            <h2>대상과 목표가 분명한 재활 트레이닝</h2>
            <p>
              부모님의 일상 회복, 선수의 복귀, 일반인의 통증 관리와 근력 회복까지. 몸 상태와 목표에 맞춰 프로그램을
              조정합니다.
            </p>
          </div>
          <div className="grid-3">
            {serviceItems.map((item) => (
              <Link href={item.applyHref} className="card interactive-card" key={item.href}>
                <span className="card-number">{item.number}</span>
                <p className="card-label">{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.target}</p>
                <span className="more-link">서비스 신청</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">SYSTEM</p>
            <h2>설문, 평가, 프로그램이 하나로 이어집니다.</h2>
            <p>
              감으로만 운동을 진행하지 않습니다. 현재 상태를 확인하고, 움직임을 평가한 뒤 목적에 맞는 운동 프로그램을
              설계합니다.
            </p>
          </div>
          <div className="grid-3">
            {systemItems.map((item) => (
              <Link href={item.href} className="card interactive-card" key={item.href}>
                <span className="card-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <span className="more-link">자세히 보기</span>
              </Link>
            ))}
          </div>
          <div className="button-row">
            <Link href="/system" className="button dark">
              시스템 전체 보기
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
            <p className="eyebrow">ACCOUNT</p>
            <h2>회원가입 / 로그인</h2>
            <p>
              상담을 시작하는 회원, 고객관리 화면이 필요한 트레이너, 운영 권한이 필요한 관리자는 계정 신청을 남길 수 있습니다.
              로그인 후 권한에 따라 마이페이지 또는 운영관리 화면으로 이동합니다.
            </p>
            <div className="button-row">
              <Link href="/apply" className="button primary">
                서비스 신청
              </Link>
              <Link href="/login" className="button secondary">
                로그인
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
