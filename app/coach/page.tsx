import Image from "next/image";
import { ConsultationCTA, PageShell } from "../_components/SiteChrome";

export default function CoachPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">HEAD COACH</p>
          <h1>정우현 Head Coach</h1>
          <p>운동을 힘들게만 만드는 것보다 먼저, 다시 편하게 움직일 수 있는 몸을 만드는 일을 합니다.</p>
        </div>
      </section>

      <section className="section">
        <div className="container coach-layout">
          <div className="coach-photo-card">
            <Image src="/images/coach-profile.jpg" alt="정우현 코치 프로필 사진" width={900} height={1200} className="coach-photo" priority />
          </div>
          <div className="coach-card">
            <p className="eyebrow">REHAB TO PERFORMANCE</p>
            <div className="quote-card large">
              현재 몸 상태에 맞는 운동을
              <br />
              함께 찾습니다.
            </div>
            <div className="info-list">
              <div className="info-item">
                <strong>철학</strong>
                <span>아프지 않고 오래 건강하게 움직일 수 있는 몸을 만듭니다.</span>
              </div>
              <div className="info-item">
                <strong>방식</strong>
                <span>현재 상태를 보고, 가능한 범위부터 단계적으로 진행합니다.</span>
              </div>
              <div className="info-item">
                <strong>대상</strong>
                <span>시니어, 일반인, 유소년·학생 선수, 복귀 준비 선수</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">MESSAGE</p>
            <h2>편하게 움직일 수 있는 기준부터 살핍니다.</h2>
            <p>
              운동을 시작해야 하는데 어디서부터 해야 할지 모르겠다면, 먼저 현재 몸 상태를 확인하는 것부터 시작해도
              충분합니다. RePERFORMANCE는 안전한 범위 안에서 회복과 훈련을 연결합니다.
            </p>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
