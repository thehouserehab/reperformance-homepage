import Image from "next/image";
import Link from "next/link";
import { ConsultationCTA, PageShell } from "./SiteChrome";
import { serviceItems } from "./siteData";

type ServiceItem = (typeof serviceItems)[number];

type ServiceEditorialPageProps = {
  item: ServiceItem;
  eyebrow: string;
  statement: string;
  principles: readonly [string, string, string];
};

const serviceFlow = [
  {
    number: "01",
    title: "현재 상태 확인",
    text: "불편한 동작, 운동 경험, 회복 목표를 먼저 정리합니다.",
  },
  {
    number: "02",
    title: "움직임 평가",
    text: "가능한 범위와 보완이 필요한 움직임을 직접 확인합니다.",
  },
  {
    number: "03",
    title: "단계별 훈련",
    text: "평가 결과를 바탕으로 강도와 순서를 조절하며 다음 단계로 이어갑니다.",
  },
] as const;

export default function ServiceEditorialPage({
  item,
  eyebrow,
  statement,
  principles,
}: ServiceEditorialPageProps) {
  return (
    <PageShell>
      <section className="editorial-service-hero">
        <div className="editorial-service-image" aria-hidden="true">
          <Image
            src="/images/coach-profile.jpg"
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 48vw"
            priority
          />
        </div>
        <div className="editorial-service-scrim" />
        <div className="container editorial-service-hero-inner">
          <p className="eyebrow light-text">{eyebrow}</p>
          <h1>{item.title}</h1>
          <p className="editorial-service-lead">{item.message}</p>
          <div className="editorial-service-actions">
            <Link className="button primary" href={item.applyHref}>
              상담 신청하기
            </Link>
            <Link className="text-link-light" href="/system">
              관리 방식 보기 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="editorial-service-target">
            <span>RECOMMENDED FOR</span>
            <strong>{item.target}</strong>
          </div>
        </div>
      </section>

      <section className="editorial-intro-section">
        <div className="container editorial-intro-grid">
          <div>
            <p className="eyebrow">SERVICE PRINCIPLE</p>
            <h2>{statement}</h2>
          </div>
          <div className="editorial-intro-copy">
            <p>{item.description}</p>
            <div className="editorial-principles" aria-label="서비스 핵심 기준">
              {principles.map((principle, index) => (
                <div key={principle}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{principle}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="editorial-program-section">
        <div className="container">
          <div className="editorial-section-head">
            <p className="eyebrow">PROGRAM FOCUS</p>
            <h2>목표를 이루기 위해<br />{" "}이 항목을 함께 봅니다.</h2>
          </div>
          <ol className="editorial-program-list">
            {item.bullets.map((bullet, index) => (
              <li key={bullet}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{bullet}</strong>
                <span aria-hidden="true">↗</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="editorial-flow-section">
        <div className="container editorial-flow-grid">
          <div className="editorial-flow-heading">
            <p className="eyebrow light-text">HOW IT WORKS</p>
            <h2>상담에서 훈련까지,<br />{" "}기준이 이어집니다.</h2>
          </div>
          <ol className="editorial-flow-list">
            {serviceFlow.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
