const services = [
  {
    eyebrow: "REHAB TRAINING",
    title: "재활 트레이닝",
    description:
      "어깨, 허리, 무릎 등 반복되는 불편함을 기준으로 현재 상태를 확인하고, 가능한 범위부터 움직임과 근력을 회복합니다.",
    points: ["통증·불편감 기준 수업", "가동성·안정성·근력 단계 진행", "매 회차 컨디션에 따라 강도 조절"]
  },
  {
    eyebrow: "SENIOR CARE",
    title: "시니어 재활 프로그램",
    description:
      "걷기, 계단, 어깨 움직임, 허리 불편감처럼 일상에서 느끼는 어려움을 줄이고 다시 편하게 움직이는 것을 목표로 합니다.",
    points: ["걷기·계단·일상 동작 개선", "무리하지 않는 단계별 진행", "운동 자신감 회복"]
  },
  {
    eyebrow: "RETURN TO PERFORMANCE",
    title: "선수·학생 리컨디셔닝",
    description:
      "부상 이후 복귀를 준비하는 엘리트 선수와 유소년 선수를 대상으로 움직임, 근력, 컨디션을 다시 정리합니다.",
    points: ["부상 이후 운동 복귀", "기초 움직임 재정렬", "체력·근력 회복"]
  }
];

const process = [
  {
    title: "01. 상태 확인",
    text: "통증 부위, 불편한 동작, 운동 경험, 일상 패턴을 먼저 확인합니다."
  },
  {
    title: "02. 움직임 평가",
    text: "어깨·골반·중심축, 관절 움직임, 좌우 차이를 확인해 수업 방향을 정합니다."
  },
  {
    title: "03. 맞춤 운동 진행",
    text: "그날의 몸 상태에 맞춰 가동성, 안정성, 근력, 컨디셔닝을 단계적으로 진행합니다."
  },
  {
    title: "04. 기록과 조정",
    text: "운동 반응을 기록하고 다음 수업 강도와 프로그램을 조정합니다."
  }
];

const documents = [
  "온라인 설문 기반 사전 상태 확인",
  "평가지 기반 움직임 확인",
  "OPT 기반 운동 프로그램 설계",
  "계약서·개인정보·민감정보 동의 절차",
  "세션별 운동 기록 및 관리"
];

const target = [
  "부모님의 걷기, 계단, 일상 움직임이 걱정되는 분",
  "통증 때문에 운동을 시작하기 두려운 분",
  "수술·부상 이후 다시 운동 복귀를 준비하는 분",
  "운동은 해봤지만 다시 아파져서 중단한 경험이 있는 분",
  "유소년·엘리트 선수의 복귀와 기초 체력 회복이 필요한 분"
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#top" aria-label="RePERFORMANCE home">
            <span className="brand-mark">Re</span>
            <span className="brand-text">RePERFORMANCE</span>
          </a>
          <nav className="nav" aria-label="primary navigation">
            <a href="#services">서비스</a>
            <a href="#system">시스템</a>
            <a href="#coach">코치</a>
            <a href="#location">위치</a>
            <a href="#contact">상담</a>
          </nav>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">REHAB TO PERFORMANCE</p>
            <h1>
              재활에서 운동까지,
              <br /> 다시 건강하게 움직이는 몸.
            </h1>
            <p className="hero-description">
              RePERFORMANCE는 통증과 불편함을 운동으로 관리하고, 시니어의 일상 회복부터 선수의 복귀 준비까지 책임지는 전주 서신동 재활 트레이닝 공간입니다.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="tel:010-2418-8400">전화 상담하기</a>
              <a className="button secondary" href="https://www.instagram.com/reperformance_trainer" target="_blank" rel="noopener noreferrer">인스타그램 보기</a>
            </div>
            <div className="hero-info">
              <span>전북 전주시 완산구 서신동 773-2, 2층</span>
              <span>08:00 - 22:00</span>
              <span>건물 뒷편 주차 가능</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="정우현 코치 프로필 사진">
            <img src="/images/coach-profile.jpg" alt="RePERFORMANCE 정우현 Head Coach" />
            <div className="floating-card">
              <p>BRAND PHILOSOPHY</p>
              <strong>책임지고 개선해드립니다.</strong>
              <span>고객이 건강할 때 행복합니다.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container split-section">
          <div className="section-heading sticky-heading">
            <p className="eyebrow">WHO WE HELP</p>
            <h2>이런 분께 필요합니다</h2>
            <p>운동을 많이 시키는 것보다, 지금 필요한 운동을 정확히 선택하는 것이 먼저입니다.</p>
          </div>
          <div className="check-list">
            {target.map((item) => (
              <div className="check-item" key={item}>
                <span>✓</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="services">
        <div className="container">
          <div className="section-heading center">
            <p className="eyebrow">SERVICES</p>
            <h2>서비스 종류</h2>
            <p>메인 서비스는 재활 트레이닝입니다. 회복 이후 운동 복귀까지 하나의 흐름으로 설계합니다.</p>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <article className="service-card" key={service.title}>
                <p className="service-eyebrow">{service.eyebrow}</p>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <ul>
                  {service.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section dark" id="system">
        <div className="container system-grid">
          <div>
            <p className="eyebrow">TRAINING SYSTEM</p>
            <h2>상태 확인부터 프로그램 설계까지</h2>
            <p>
              RePERFORMANCE는 설문, 평가, 프로그램 기록을 통해 수업을 관리합니다. 단순히 운동을 따라 하는 것이 아니라, 왜 이 운동을 하는지와 다음 단계가 무엇인지 확인합니다.
            </p>
          </div>
          <div className="system-card">
            <h3>관리 항목</h3>
            <ul>
              {documents.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <a className="button ghost full" href="#contact">설문 링크 연결 예정</a>
          </div>
        </div>
      </section>

      <section className="section" id="process">
        <div className="container">
          <div className="section-heading center">
            <p className="eyebrow">PROCESS</p>
            <h2>수업 진행 방식</h2>
          </div>
          <div className="process-grid">
            {process.map((item) => (
              <div className="process-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section light" id="coach">
        <div className="container coach-grid">
          <div className="coach-image-card">
            <img src="/images/coach-card.jpg" alt="정우현 Head Coach 자격 및 소개 카드" />
          </div>
          <div className="coach-copy">
            <p className="eyebrow">HEAD COACH</p>
            <h2>정우현</h2>
            <p className="lead">
              노후를 준비하시거나 지금 당장 어딘가 아프신 분들께 자신 있게 추천합니다. 올바른 운동으로 올바른 몸을 만들어드립니다.
            </p>
            <div className="credential-box">
              <h3>전문 분야</h3>
              <p>재활 트레이닝 · 시니어 운동 · 선수 복귀 준비 · 스트렝스 & 컨디셔닝</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section case-section">
        <div className="container case-box">
          <p className="eyebrow">REAL CASE</p>
          <h2>걷기 힘들던 일상에서, 다시 달릴 수 있는 몸으로</h2>
          <p>
            60대 여성 회원님은 처음 오셨을 때 10분만 걸어도 다리가 저리고 힘들어 외출이 겁난다고 하셨습니다. 주 2~3회 운동을 시작하며 그날그날 상태에 맞춰 무리하지 않게 쌓아갔고, 이후 걷는 중 저림이 줄었습니다.
          </p>
          <p>
            이후 주 4회로 운동량을 늘렸고, 약 4개월 뒤에는 러닝머신 30분 달리기까지 가능해졌습니다. 재활은 단순히 아픈 곳을 참는 시간이 아니라, 다시 일상을 되찾는 과정입니다.
          </p>
        </div>
      </section>

      <section className="section location-section" id="location">
        <div className="container location-grid">
          <div>
            <p className="eyebrow">LOCATION</p>
            <h2>전주 서신동에서 만납니다</h2>
            <p>전북 전주시 완산구 서신동 773-2, 2층</p>
            <p>서신신협 2층 · 건물 뒷편 주차 가능</p>
          </div>
          <div className="location-card">
            <h3>운영 정보</h3>
            <dl>
              <div><dt>운영 시간</dt><dd>08:00 - 22:00</dd></div>
              <div><dt>전화</dt><dd><a href="tel:010-2418-8400">010-2418-8400</a></dd></div>
              <div><dt>Instagram</dt><dd><a href="https://www.instagram.com/reperformance_trainer" target="_blank" rel="noopener noreferrer">@reperformance_trainer</a></dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="section light" id="contact">
        <div className="container contact-grid">
          <div>
            <p className="eyebrow">CONTACT</p>
            <h2>상담 신청</h2>
            <p>
              지금 어느 부위가, 어떤 동작에서 불편한지 알려주세요. 현재 상태에 맞는 첫 단계부터 안내드리겠습니다.
            </p>
          </div>
          <div className="contact-card">
            <h3>상담 시 알려주시면 좋은 정보</h3>
            <ul>
              <li>이름 / 연락처 / 나이대</li>
              <li>불편한 부위와 가장 힘든 동작</li>
              <li>운동 목적</li>
              <li>수술·질환·통증 이력</li>
              <li>상담 희망 시간</li>
            </ul>
            <div className="contact-actions">
              <a className="button primary full" href="tel:010-2418-8400">전화 상담하기</a>
              <a className="button secondary full" href="https://www.instagram.com/reperformance_trainer" target="_blank" rel="noopener noreferrer">DM 상담하기</a>
            </div>
            <p className="small-text">노션 설문 링크가 준비되면 이 영역에 바로 연결하면 됩니다.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <strong>RePERFORMANCE</strong>
            <p>Rehab to Performance · 재활에서 운동까지</p>
          </div>
          <div>
            <p>전북 전주시 완산구 서신동 773-2, 2층</p>
            <p>010-2418-8400 · @reperformance_trainer</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
