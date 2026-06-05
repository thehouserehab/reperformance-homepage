import { ConsultationCTA, PageShell } from "../../_components/SiteChrome";
import { serviceItems } from "../../_components/siteData";

const item = serviceItems[3];

export default function PeExamPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">04 PE EXAM</p>
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
            <div className="button-row">
              <a className="button primary" href={item.applyHref}>이 서비스 신청하기</a>
            </div>
            <div className="quote-card">체대입시는 운동 기록과 지원 전략을 함께 관리해야 흔들리지 않습니다.</div>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
