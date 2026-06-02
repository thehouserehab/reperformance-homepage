import { ConsultationCTA, PageShell } from "../../_components/SiteChrome";
import { serviceItems } from "../../_components/siteData";

const item = serviceItems[0];

export default function SeniorRehabPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">01 SENIOR REHAB</p>
          <h1>{item.title}</h1>
          <p>{item.message}</p>
        </div>
      </section>

      <section className="section">
        <div className="container detail-grid">
          <div className="contact-box">
            <h2>대상</h2>
            <p>{item.target}</p>
            <h2>목표</h2>
            <p>{item.description}</p>
          </div>
          <div className="contact-box">
            <h2>예시 프로그램</h2>
            <ul>
              {item.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <div className="quote-card">부모님의 생활 속 불편함을 움직임으로 줄이고, 다시 편하게 걷는 일상을 목표로 합니다.</div>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}