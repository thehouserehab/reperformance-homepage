import { ConsultationCTA, PageShell } from "../../_components/SiteChrome";

export default function MovementAssessmentPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">SYSTEM 02</p>
          <h1>움직임 평가</h1>
          <p>통증이 있는 부위만 보지 않고, 움직임 전체를 확인합니다.</p>
        </div>
      </section>

      <section className="section">
        <div className="container detail-grid">
          <div className="contact-box">
            <h2>확인하는 내용</h2>
            <ul>
              <li>어깨 움직임</li>
              <li>골반 움직임</li>
              <li>중심축 안정성</li>
              <li>하체 정렬</li>
              <li>통증이 생기는 동작</li>
            </ul>
          </div>
          <div className="contact-box">
            <h2>왜 필요한가</h2>
            <p>
              통증과 불편감은 한 부위의 문제처럼 보이지만 실제 움직임에서는 여러 요소가 함께 작용합니다. 현재 가능한
              움직임과 제한되는 움직임을 확인해 그날의 수업 방향을 조절합니다.
            </p>
            <div className="quote-card">통증을 참는 운동이 아니라, 몸에 맞게 조절하는 운동을 합니다.</div>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}