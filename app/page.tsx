const services = [
  {
    title: "재활 트레이닝",
    description:
      "어깨, 허리, 무릎 등 반복되는 불편함을 기준으로 현재 상태를 확인하고, 가능한 범위부터 안전하게 움직임과 근력을 회복합니다."
  },
  {
    title: "부모님 재활 프로그램",
    description:
      "걷기, 계단, 어깨 움직임, 허리 불편감처럼 일상에서 느끼는 어려움을 줄이는 데 집중합니다. 무리하지 않고 천천히, 그러나 꾸준하게 진행합니다."
  },
  {
    title: "선수·학생 리컨디셔닝",
    description:
      "부상 이후 운동 복귀, 기록 정체, 체력 저하를 움직임·근력·컨디션 관점에서 다시 정리합니다."
  }
];

const process = [
  "현재 상태 확인",
  "불편한 동작 체크",
  "그날 컨디션에 맞춘 운동 진행",
  "재발 방지를 위한 움직임·근력 훈련",
  "집에서 할 수 있는 간단한 숙제 제공"
];

const targets = [
  "어깨·허리·무릎이 반복적으로 불편한 분",
  "운동을 하고 싶지만 통증 때문에 망설이는 분",
  "부모님의 걷기, 계단, 일상 움직임이 걱정되는 분",
  "부상 이후 다시 운동으로 복귀하고 싶은 학생·선수",
  "단순 PT보다 상태를 보고 조절하는 수업이 필요한 분"
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <div className="container header-inner">
          <div className="brand">
            <span className="brand-mark">Re</span>
            <span className="brand-text">RePERFORMANCE</span>
          </div>
          <nav className="nav">
            <a href="#services">서비스</a>
            <a href="#process">수업 방식</a>
            <a href="#case">사례</a>
            <a href="#contact">상담</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <p className="eyebrow">전주 서신동 재활 트레이닝</p>
            <h1>
              아픈 몸을 참는 일상에서,
              <br />
              다시 편하게 움직이는 일상으로.
            </h1>
            <p className="hero-description">
              RePERFORMANCE는 통증과 불편함을 운동으로 관리하고, 일상과 운동으로 다시 돌아갈 수 있도록 돕는 재활 트레이닝 공간입니다.
            </p>

            <div className="hero-actions">
              <a href="#contact" className="button primary">상담 신청하기</a>
              <a href="#process" className="button secondary">수업 방식 보기</a>
            </div>
          </div>

          <div className="hero-card">
            <p className="card-label">RePERFORMANCE METHOD</p>
            <h2>움직임 → 안정 → 근력</h2>
            <p>
              무리하게 밀어붙이지 않습니다. 지금 가능한 범위부터 확인하고, 매 회차 몸 상태에 맞춰 안전하게 조절합니다.
            </p>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">WHO WE HELP</p>
            <h2>이런 분께 필요합니다</h2>
          </div>

          <div className="target-list">
            {targets.map((item) => (
              <div className="target-item" key={item}>
                <span>✓</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="services">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">SERVICES</p>
            <h2>제공하는 프로그램</h2>
            <p>
              홈페이지의 중심은 재활 트레이닝입니다. 다만 회복 이후의 운동 복귀까지 자연스럽게 이어질 수 있도록 설계합니다.
            </p>
          </div>

          <div className="service-grid">
            {services.map((service) => (
              <article className="service-card" key={service.title}>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section dark" id="process">
        <div className="container process-grid">
          <div>
            <p className="eyebrow">PROCESS</p>
            <h2>수업은 이렇게 진행됩니다</h2>
            <p className="process-description">
              재활 트레이닝은 매번 같은 루틴을 반복하는 수업이 아닙니다. 그날의 통증, 피로, 수면, 움직임 상태를 확인하고 진행합니다.
            </p>
          </div>

          <div className="process-list">
            {process.map((item, index) => (
              <div className="process-item" key={item}>
                <span>{index + 1}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="case">
        <div className="container case-box">
          <div>
            <p className="eyebrow">REAL CASE</p>
            <h2>걷기 힘들던 일상에서, 다시 달릴 수 있는 몸으로</h2>
          </div>
          <p>
            처음 오셨을 때 회원님은 60대 여성분이셨고, 10분만 걸어도 다리가 저리고 숨이 차 외출이 겁났다고 하셨습니다. 주 2~3회 운동을 시작하며 그날그날 상태에 맞춰 무리하지 않게 쌓아갔고, 어느 날 “이제 걸을 때 저림이 없어요”라고 말씀하셨습니다.
          </p>
          <p>
            이후 주 4회로 운동량을 늘렸고, 약 4개월 뒤에는 러닝머신 30분 달리기까지 가능해졌습니다. 재활은 단순히 아픈 곳을 참는 시간이 아니라, 다시 일상을 되찾는 과정입니다.
          </p>
        </div>
      </section>

      <section className="section light" id="contact">
        <div className="container contact-grid">
          <div>
            <p className="eyebrow">CONTACT</p>
            <h2>상담 신청</h2>
            <p>
              지금 어느 부위가, 어떤 동작에서 불편한지 알려주세요. RePERFORMANCE가 첫 단계부터 안내드리겠습니다.
            </p>
          </div>

          <div className="contact-card">
            <h3>상담 시 알려주시면 좋은 정보</h3>
            <ul>
              <li>이름 / 연락처</li>
              <li>나이대</li>
              <li>불편한 부위</li>
              <li>가장 힘든 동작</li>
              <li>운동 목적</li>
              <li>상담 희망 시간</li>
            </ul>

            <a className="button primary full" href="https://forms.gle/" target="_blank" rel="noopener noreferrer">
              상담 폼 연결 예정
            </a>
            <p className="small-text">
              현재 버튼은 임시 링크입니다. 추후 구글폼, 카카오톡, 네이버폼 링크로 교체하면 됩니다.
            </p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <p>© RePERFORMANCE. All rights reserved.</p>
          <p>전주 서신동 재활 트레이닝</p>
        </div>
      </footer>
    </main>
  );
}
