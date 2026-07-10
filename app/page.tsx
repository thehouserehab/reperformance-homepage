import Image from "next/image";
import Link from "next/link";
import { PageShell } from "./_components/SiteChrome";
import { site } from "./_components/siteData";

const brandSignals = [
  "전문 재활",
  "퍼포먼스",
  "트레이닝 관리",
] as const;

const focusItems = [
  {
    title: "상담으로 현재 상태를 정리합니다.",
    text: "통증, 목표, 운동 가능 시간, 입시 준비 상황을 먼저 확인합니다.",
  },
  {
    title: "필요한 서비스로 바로 이동합니다.",
    text: "시니어 재활, 선수 케어, 체대입시, 일반 재활 중 목적에 맞게 선택합니다.",
  },
  {
    title: "운동 기록과 관리로 이어집니다.",
    text: "상담 이후 필요한 회원에게만 수업 기록, 피드백, 훈련 방향을 안내합니다.",
  },
] as const;

export default function Home() {
  return (
    <PageShell>
      <section className="hero home-entrance-hero">
        <div className="hero-portrait home-entrance-portrait" aria-hidden="true">
          <Image
            src="/images/coach-profile.jpg"
            alt=""
            fill
            sizes="(max-width: 900px) 46vw, 38vw"
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
            통증 회복, 운동 복귀, 체대입시 실기 향상을 한 번의 상담에서 정리하고
            필요한 훈련 방향으로 연결합니다.
          </p>
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

      <section className="home-direction-section" aria-label="RePERFORMANCE 이용 흐름">
        <div className="container home-direction-inner">
          <div>
            <p className="eyebrow">CLEAR ENTRY</p>
            <h2>처음에는 선택만 명확하면 됩니다.</h2>
          </div>
          <div className="home-direction-grid">
            {focusItems.map((item) => (
              <article key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
