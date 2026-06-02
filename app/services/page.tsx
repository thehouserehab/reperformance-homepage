import Link from "next/link";
import { ConsultationCTA, PageShell } from "../_components/SiteChrome";
import { serviceItems } from "../_components/siteData";

export default function ServicesPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">SERVICES</p>
          <h1>재활 입구에서 움직임 복귀까지 이어갑니다.</h1>
          <p>
            통증을 줄이는 데서 멈추지 않습니다. 다시 움직이고, 다시 운동하고, 더 오래 건강하게 유지할 수 있도록
            단계적으로 설계합니다.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container service-stack">
          {serviceItems.map((item) => (
            <Link href={item.href} className="wide-card interactive-card" key={item.href}>
              <div>
                <span className="card-number">{item.number}</span>
                <p className="card-label">{item.label}</p>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </div>
              <div className="mini-list">
                <strong>대상</strong>
                <span>{item.target}</span>
                <strong>핵심</strong>
                <span>{item.message}</span>
                <span className="more-link">상세 프로그램 보기</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}