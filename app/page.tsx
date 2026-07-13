import Image from "next/image";
import Link from "next/link";
import PeExamWindowLink from "./_components/PeExamWindowLink";
import { BrandLogo, Footer } from "./_components/SiteChrome";
import { serviceItems, site, systemItems } from "./_components/siteData";

const brandSignals = [
  "전문 재활",
  "퍼포먼스",
  "트레이닝 관리",
] as const;

const homeServiceCopy = {
  "senior-rehab": {
    title: "시니어 재활",
    summary: "보행과 균형, 하체 근력을 회복해 일상 움직임을 다시 편하게 만듭니다.",
  },
  "athlete-reconditioning": {
    title: "선수 케어·퍼포먼스",
    summary: "부상 이후 복귀 과정과 경기력 회복을 단계적으로 연결합니다.",
  },
  "pain-care": {
    title: "일반 재활",
    summary: "어깨·허리·무릎의 불편함을 확인하고 가능한 움직임부터 다시 쌓습니다.",
  },
  "pe-exam": {
    title: "체대입시",
    summary: "대학 정보 확인부터 실기 기록 향상, 상담 준비까지 한 흐름으로 봅니다.",
  },
} as const;

export default function Home() {
  return (
    <>
      <header className="landing-header">
        <div className="container landing-header-inner">
          <BrandLogo />
          <span className="landing-header-note">전문 재활 · 퍼포먼스 · 트레이닝</span>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero home-entrance-hero">
          <div className="hero-portrait home-entrance-portrait" aria-hidden="true">
            <Image
              src="/images/coach-profile.jpg"
              alt=""
              fill
              sizes="(max-width: 900px) 72vw, 42vw"
              priority
            />
          </div>
          <div className="hero-scrim home-entrance-scrim" />
          <div className="container home-entrance-content">
            <p className="eyebrow light-text">RePERFORMANCE</p>
            <h1>
              재활에서 퍼포먼스까지,
              <br />
              몸을 다시 관리하는 곳.
            </h1>
            <p className="lead">
              회복, 복귀, 체대입시 실기 향상까지. 현재 상태를 확인하고 필요한 훈련 방향으로 연결합니다.
            </p>
            <p className="home-choice-prompt">지금 필요한 시작을 선택하세요.</p>
            <div className="home-primary-actions" aria-label="주요 이동">
              <Link href={site.serviceApplyHref} className="button primary home-main-cta">
                <span>상담 신청하기</span>
                <span className="home-main-cta-arrow" aria-hidden="true">→</span>
              </Link>
              <Link href="/services" className="button hero-secondary home-main-cta">
                <span>홈페이지 둘러보기</span>
                <span className="home-main-cta-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="home-signal-strip" aria-label="RePERFORMANCE 핵심 영역">
              {brandSignals.map((signal, index) => (
                <span key={signal}>
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  {signal}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="home-direction-section" aria-label="RePERFORMANCE 서비스 방향">
          <div className="container home-direction-inner">
            <p className="eyebrow">YOUR NEXT STEP</p>
            <div>
              <h2>상담이 먼저여도, 천천히 둘러봐도 괜찮습니다.</h2>
              <p>
                시니어 재활, 선수 케어·퍼포먼스, 체대입시, 일반 재활 중 지금 필요한 목적부터 선택할 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        <section className="home-service-directory" aria-labelledby="home-service-title">
          <div className="container">
            <div className="home-section-heading">
              <div>
                <p className="eyebrow">CHOOSE YOUR PURPOSE</p>
                <h2 id="home-service-title">지금 필요한 목적에서<br />시작하세요.</h2>
              </div>
              <p>긴 설명을 읽기 전에, 현재 상황에 가까운 서비스를 선택할 수 있습니다.</p>
            </div>
            <div className="home-service-list">
              {serviceItems.map((item, index) => {
                const copy = homeServiceCopy[item.applicationValue as keyof typeof homeServiceCopy];
                const content = (
                  <>
                    <span className="home-service-index">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <p>{item.label}</p>
                      <h3>{copy.title}</h3>
                    </div>
                    <p className="home-service-summary">{copy.summary}</p>
                    <span className="home-service-arrow" aria-hidden="true">→</span>
                  </>
                );

                return item.applicationValue === "pe-exam" ? (
                  <PeExamWindowLink className="home-service-row" href={item.href} key={item.href}>
                    {content}
                  </PeExamWindowLink>
                ) : (
                  <Link className="home-service-row" href={item.href} key={item.href}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="home-method-section" aria-labelledby="home-method-title">
          <div className="container home-method-grid">
            <div className="home-method-heading">
              <p className="eyebrow light-text">MANAGED TRAINING</p>
              <h2 id="home-method-title">운동만 시키지 않고,<br />변화를 관리합니다.</h2>
              <p>상담에서 확인한 목표가 실제 수업의 평가와 프로그램으로 이어집니다.</p>
              <Link href="/system" className="text-link-light">
                관리 시스템 보기 <span aria-hidden="true">→</span>
              </Link>
            </div>
            <ol className="home-method-steps">
              {systemItems.map((item) => (
                <li key={item.href}>
                  <span>{item.number}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="home-coach-section">
          <div className="container home-coach-grid">
            <div className="home-coach-image">
              <Image
                src="/images/coach-profile.jpg"
                alt="RePERFORMANCE 정우현 코치"
                fill
                sizes="(max-width: 900px) 100vw, 46vw"
              />
            </div>
            <div className="home-coach-copy">
              <p className="eyebrow">HEAD COACH</p>
              <h2>회복과 훈련 사이를<br />한 사람이 이어서 봅니다.</h2>
              <p>
                현재 몸 상태에 맞는 운동을 찾고, 가능한 범위부터 단계적으로 진행합니다. 시니어의 일상 회복부터
                선수의 복귀, 학생의 실기 향상까지 같은 기준으로 관리합니다.
              </p>
              <Link href="/coach" className="text-link-dark">
                코치 철학 보기 <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
