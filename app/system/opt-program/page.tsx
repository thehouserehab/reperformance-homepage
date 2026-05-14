import ConsultationCTA from "../../_components/ConsultationCTA";
import { Footer, Header } from "../../_components/SiteChrome";

export default function OptProgramPage() {
  return <main><Header />
    <section className="page-hero"><div className="container page-title"><p className="eyebrow">SYSTEM 03</p><h1>OPT 기반 프로그램</h1><p>Warm-up부터 Cool-down까지 목적에 맞게 설계합니다.</p></div></section>
    <section className="section"><div className="container grid-2"><div className="card"><h3>프로그램 구성</h3><ul><li>Warm-up</li><li>Mobility / Activation</li><li>Balance / Stability</li><li>Resistance Training</li><li>Conditioning</li><li>Cool-down</li></ul></div><div className="card"><h3>적용 방식</h3><ul><li>시니어: 걷기, 계단, 균형, 하체 안정성 중심</li><li>선수/학생: 복귀 단계, 착지, 감속, 근력 회복 중심</li><li>일반인: 통증 관리, 기초 근력, 체력 회복 중심</li></ul><p className="service-quote">“운동은 많이 하는 것보다, 지금 몸에 맞게 쌓는 것이 중요합니다.”</p></div></div></section>
    <ConsultationCTA />
    <Footer /></main>;
}
