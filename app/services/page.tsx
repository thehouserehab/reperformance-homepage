import Link from "next/link";
import ConsultationCTA from "../_components/ConsultationCTA";
import { Footer, Header } from "../_components/SiteChrome";

const serviceCards = [
  {
    no: "01",
    label: "Senior Rehab",
    title: "시니어 재활 트레이닝",
    desc: "아픈 몸을 참는 일상에서, 다시 편하게 움직이는 일상으로.",
    href: "/services/senior-rehab"
  },
  { no: "02", label: "Athlete Reconditioning", title: "선수·학생 리컨디셔닝", desc: "재활에서 복귀까지, 다시 경기장으로 돌아가기 위한 과정.", href: "/services/athlete-reconditioning" },
  { no: "03", label: "Pain Care", title: "일반인 통증 케어 & 근력 회복", desc: "통증을 참고 버티는 운동이 아니라, 몸에 맞게 조절하는 운동.", href: "/services/pain-care" }
];

export default function ServicesPage() {
  return <main><Header />
    <section className="page-hero"><div className="container page-title"><p className="eyebrow">SERVICES</p><h1>우선순위 기반 재활 트레이닝 서비스</h1><p>시니어, 선수·학생, 일반인 순서로 가장 필요한 대상부터 구조화했습니다. 카드를 눌러 상세 프로그램을 확인해보세요.</p></div></section>
    <section className="section"><div className="container"><div className="service-priority-grid">{serviceCards.map((card) => <Link key={card.no} href={card.href} className="service-priority-card"><p className="service-priority-no">{card.no} {card.label}</p><h3>{card.title}</h3><p>{card.desc}</p><span className="service-link">상세 보기 →</span></Link>)}</div></div></section>
    <ConsultationCTA compact />
    <section className="section light"><div className="container"><div className="section-head"><p className="eyebrow">PRINCIPLE</p><h2>무리하게 밀어붙이지 않습니다.</h2><p>몸 상태 확인 → 움직임 평가 → 맞춤 운동 → 재부상 방지 루틴까지, 상담부터 수업까지 한 흐름으로 진행합니다.</p></div></div></section>
    <ConsultationCTA />
    <Footer />
  </main>;
}
