import { ConsultationCTA, PageShell } from "../../_components/SiteChrome";
import { serviceItems } from "../../_components/siteData";

const item = serviceItems[2];

export default function PainCarePage() {
  return (
    <PageShell>
      <section className="page-hero"><div className="container page-title"><p className="eyebrow">03 PAIN CARE</p><h1>{item.title}</h1><p>{item.message}</p></div></section>
      <section className="section"><div className="container detail-grid"><div className="contact-box"><h2>대상</h2><p>{item.target}</p><h2>목표</h2><p>{item.description}</p></div><div className="contact-box"><h2>예시 프로그램</h2><ul>{item.bullets.map((b)=><li key={b}>{b}</li>)}</ul><div className="quote-card">운동이 두려웠던 몸을, 다시 움직이고 싶은 몸으로 바꿔갑니다.</div></div></div></section>
      <ConsultationCTA />
    </PageShell>
  );
}
