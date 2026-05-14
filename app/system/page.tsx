import Link from "next/link";
import ConsultationCTA from "../_components/ConsultationCTA";
import { Footer, Header } from "../_components/SiteChrome";

const systemCards = [
  { no: "01", title: "온라인 설문", desc: "운동 목표, 통증·불편감, 주의사항 확인", href: "/system/online-survey" },
  { no: "02", title: "움직임 평가", desc: "어깨/골반/중심축/하체 정렬 패턴 분석", href: "/system/movement-assessment" },
  { no: "03", title: "OPT 기반 프로그램", desc: "Warm-up 부터 Cool-down까지 목적 맞춤 설계", href: "/system/opt-program" }
];

export default function SystemPage() {
  return (
    <main>
      <Header />
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">TRAINING SYSTEM</p>
          <h1>설문, 평가, 프로그램, 기록이 하나로 이어집니다.</h1>
          <p>회원 상태를 기준으로 매 회차 강도와 순서를 조정합니다.</p>
        </div>
      </section>

      <section className="section">
        <div className="container system-card-grid">
          {systemCards.map((card) => (
            <Link key={card.no} href={card.href} className="system-card-link card">
              <p className="service-priority-no">{card.no}</p>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
              <span className="service-link">자세히 보기 →</span>
            </Link>
          ))}
        </div>
      </section>

      <ConsultationCTA />
      <Footer />
    </main>
  );
}
