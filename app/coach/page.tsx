import Image from "next/image";
import { ConsultationCTA, PageShell } from "../_components/SiteChrome";

export default function CoachPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">HEAD COACH</p>
          <h1>정우현 Head Coach</h1>
          <p>운동을 잘하게 만드는 것보다 먼저, 다시 편하게 움직일 수 있는 몸을 만드는 일을 합니다.</p>
        </div>
      </section>

      <section className="section">
        <div className="container coach-layout">
          <div className="coach-photo-card">
            <Image src="/images/coach-profile.jpg" alt="정우현 코치 프로필 사진" width={900} height={1200} className="coach-photo" priority />
          </div>
          <div className="coach-card">
            <p className="eyebrow">REHAB TO PERFORMANCE</p>
            <div className="quote-card large">책임지고 개선해드립니다.<br />고객이 건강할 때 행복합니다.</div>
            <div className="info-list">
              <div className="info-item"><strong>철학</strong><span>아프지 않고 오래 건강하게.</span></div>
              <div className="info-item"><strong>방식</strong><span>현재 상태를 보고, 가능한 범위부터 단계적으로 진행합니다.</span></div>
              <div className="info-item"><strong>대상</strong><span>시니어, 일반인, 유소년/엘리트 선수</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">MESSAGE</p>
            <h2>은퇴 후 건강을 책임집니다.</h2>
            <p>노후를 준비하시거나 지금 당장 어딘가 아프신 분들께 자신 있게 추천합니다. 올바른 운동으로 올바른 몸을 만들어드립니다.</p>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
