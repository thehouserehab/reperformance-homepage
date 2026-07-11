import Image from "next/image";
import Link from "next/link";
import { BrandLogo, Footer } from "./_components/SiteChrome";
import { site } from "./_components/siteData";

const brandSignals = [
  "전문 재활",
  "퍼포먼스",
  "트레이닝 관리",
] as const;

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
                상담 신청하기
              </Link>
              <Link href="/services" className="button hero-secondary home-main-cta">
                홈페이지 둘러보기
              </Link>
            </div>
            <div className="home-signal-strip" aria-label="RePERFORMANCE 핵심 영역">
              {brandSignals.map((signal) => (
                <span key={signal}>{signal}</span>
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
      </main>

      <Footer />
    </>
  );
}
