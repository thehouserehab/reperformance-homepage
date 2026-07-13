import Link from "next/link";
import { ConsultationCTA, PageShell } from "../_components/SiteChrome";
import { systemItems } from "../_components/siteData";

export default function SystemPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title system-index-title">
          <p className="eyebrow">TRAINING SYSTEM</p>
          <h1>설문, 평가, 프로그램이 하나로 이어집니다.</h1>
          <p>
            수업은 감으로만 진행하지 않습니다. 회원의 상태를 먼저 확인하고, 움직임을 평가한 뒤 목적에 맞는 운동
            프로그램을 설계합니다.
          </p>
        </div>
      </section>

      <section className="system-index-section">
        <div className="container system-index-list">
          {systemItems.map((item) => (
            <Link href={item.href} className="system-index-row" key={item.href}>
              <span>{item.number}</span>
              <div>
                <p>PROCESS {item.number}</p>
                <h2>{item.title}</h2>
              </div>
              <p>{item.summary}</p>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="system-document-section">
        <div className="container system-document-grid">
          <div>
            <p className="eyebrow">DOCUMENTED CARE</p>
            <h2>안전성과 일관성을 남기는 시스템</h2>
          </div>
          <div>
            <p>
              문진, 동의, 평가 기록, 프로그램 기록을 통해 수업의 기준을 남깁니다. 회원이 이해할 수 있는 언어로
              현재 상태와 다음 단계를 안내합니다.
            </p>
            <Link className="text-link-dark" href="/system/online-survey">
              첫 단계부터 보기 <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
