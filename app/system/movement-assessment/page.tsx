import ConsultationCTA from "../../_components/ConsultationCTA";
import { Footer, Header } from "../../_components/SiteChrome";

export default function MovementAssessmentPage() {
  return <main><Header />
    <section className="page-hero"><div className="container page-title"><p className="eyebrow">SYSTEM 02</p><h1>움직임 평가</h1><p>통증이 있는 부위만 보지 않고, 움직임 전체를 확인합니다.</p></div></section>
    <section className="section"><div className="container grid-2"><div className="card"><h3>확인하는 내용</h3><ul><li>어깨 움직임</li><li>골반 움직임</li><li>중심축 안정성</li><li>하체 정렬</li><li>통증이 생기는 동작</li></ul></div><div className="card"><h3>왜 필요한가</h3><ul><li>아픈 동작을 무리하게 반복하지 않기 위해</li><li>운동 강도와 범위를 조절하기 위해</li><li>재발 방지를 위한 기준을 세우기 위해</li></ul><p className="service-quote">“통증을 참는 운동이 아니라, 몸에 맞게 조절하는 운동을 합니다.”</p></div></div></section>
    <ConsultationCTA />
    <Footer /></main>;
}
