import { ConsultationCTA, PageShell } from "../../_components/SiteChrome";
import { serviceItems } from "../../_components/siteData";

const item = serviceItems[1];

export default function AthleteReconditioningPage() {
  return (
    <PageShell>
      <section className="page-hero"><div className="container page-title"><p className="eyebrow">02 ATHLETE RECONDITIONING</p><h1>{item.title}</h1><p>{item.message}</p></div></section>
      <section className="section"><div className="container detail-grid"><div className="contact-box"><h2>대상</h2><p>{item.target}</p><h2>목표</h2><p>{item.description}</p></div><div className="contact-box"><h2>예시 프로그램</h2><ul>{item.bullets.map((b)=><li key={b}>{b}</li>)}</ul><div className="quote-card">복귀는 단순히 다시 뛰는 것이 아니라, 다시 버틸 수 있는 몸을 만드는 과정입니다.</div></div></div></section>
      <ConsultationCTA />
    </PageShell>
  );
}
