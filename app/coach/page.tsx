import Image from "next/image";
import { ConsultationCTA, PageShell } from "../_components/SiteChrome";

export default function CoachPage() {
  return (
    <PageShell>
      <section className="coach-editorial-hero">
        <div className="coach-editorial-image">
          <Image
            src="/images/coach-profile.jpg"
            alt="RePERFORMANCE 정우현 코치"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 58vw"
          />
        </div>
        <div className="coach-editorial-scrim" />
        <div className="container coach-editorial-content">
          <p className="eyebrow light-text">HEAD COACH · JUNG WOO HYUN</p>
          <h1>몸의 현재를 읽고,<br />다음 움직임을 설계합니다.</h1>
          <p>운동을 힘들게만 만드는 것보다 먼저, 다시 편하게 움직일 수 있는 몸을 만드는 일을 합니다.</p>
        </div>
      </section>

      <section className="coach-philosophy-section">
        <div className="container coach-philosophy-grid">
          <div>
            <p className="eyebrow">REHAB TO PERFORMANCE</p>
            <h2>현재 몸 상태에 맞는 운동을 함께 찾습니다.</h2>
          </div>
          <div className="coach-principle-list">
              <div>
                <span>01</span>
                <strong>철학</strong>
                <p>아프지 않고 오래 건강하게 움직일 수 있는 몸을 만듭니다.</p>
              </div>
              <div>
                <span>02</span>
                <strong>방식</strong>
                <p>현재 상태를 보고, 가능한 범위부터 단계적으로 진행합니다.</p>
              </div>
              <div>
                <span>03</span>
                <strong>대상</strong>
                <p>시니어, 일반인, 유소년·학생 선수, 복귀 준비 선수</p>
              </div>
          </div>
        </div>
      </section>

      <section className="coach-message-section">
        <div className="container coach-message-inner">
          <p className="eyebrow light-text">COACH MESSAGE</p>
          <div>
            <h2>편하게 움직일 수 있는<br />기준부터 살핍니다.</h2>
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
