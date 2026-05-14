import Image from "next/image";
import Link from "next/link";

const notionSurveyUrl = "https://fearless-okapi-9c9.notion.site/2cdfab3c9eaa80e8a936e85baa1f3b59?pvs=105";

function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo-link" aria-label="RePERFORMANCE 홈">
          <Image src="/images/reperformance-logo.png" alt="RePERFORMANCE" width={360} height={100} className="logo-img" priority />
        </Link>
        <nav className="nav">
          <Link href="/services">서비스</Link>
          <Link href="/system">시스템</Link>
          <Link href="/coach">코치</Link>
          <Link href="/location">위치</Link>
          <Link href="/contact" className="nav-cta">상담</Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>© RePERFORMANCE. All rights reserved.</p>
        <p>전북 전주시 완산구 서신동 773-2, 2층 · 010-2418-8400</p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main>
      <Header />

      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">Rehab to Performance</p>
            <h1>재활에서 운동까지,<br />다시 움직이는 몸을 만듭니다.</h1>
            <p className="lead">
              RePERFORMANCE는 통증과 불편함을 운동으로 관리하고, 일상과 운동으로 다시 돌아갈 수 있도록 돕는 전주 서신동 재활 트레이닝 공간입니다.
            </p>
            <div className="hero-actions">
              <Link href="/contact" className="button primary">상담 신청하기</Link>
              <a href={notionSurveyUrl} target="_blank" rel="noopener noreferrer" className="button secondary">온라인 설문 작성하기</a>
            </div>
          </div>
          <div className="hero-panel">
            <Image src="/images/coach-profile.jpg" alt="RePERFORMANCE 정우현 코치 프로필" width={900} height={1200} className="coach" priority />
            <div className="panel-caption">
              <h3>정우현 Head Coach</h3>
              <p>책임지고 개선해드립니다. 고객이 건강할 때 행복합니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">FOR WHO</p>
            <h2>이런 분께 필요합니다</h2>
            <p>몸이 보내는 신호를 무시하지 않고, 오늘 가능한 범위부터 안전하게 다시 쌓습니다.</p>
          </div>
          <div className="grid-3">
            <div className="card"><h3>시니어 재활</h3><p>걷기, 계단, 어깨 움직임, 허리 불편감처럼 일상에서 느끼는 어려움을 줄이는 데 집중합니다.</p></div>
            <div className="card"><h3>통증·불편감 관리</h3><p>어깨·허리·무릎 등 반복되는 불편함을 기준으로 상태를 확인하고, 가능한 범위부터 움직임을 회복합니다.</p></div>
            <div className="card"><h3>선수·학생 리컨디셔닝</h3><p>부상 이후 복귀, 기록 정체, 체력 저하를 움직임·근력·컨디션 관점에서 다시 정리합니다.</p></div>
          </div>
        </div>
      </section>

      <section className="section" id="services">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">SERVICE</p>
            <h2>현재 몸에 맞춘 재활 트레이닝</h2>
            <p>무리하게 밀어붙이지 않습니다. 상태 확인, 움직임 평가, 맞춤 운동, 재발 방지까지 하나의 흐름으로 진행합니다.</p>
          </div>
          <div className="grid-2">
            <div className="card">
              <h3>1:1 재활 트레이닝</h3>
              <p>통증과 불편감을 고려해 그날의 운동 범위와 강도를 조정합니다. 운동이 두려운 분도 안전하게 시작할 수 있도록 안내합니다.</p>
            </div>
            <div className="card">
              <h3>운동 복귀 프로그램</h3>
              <p>재활 이후 다시 운동으로 복귀해야 하는 일반인, 유소년 선수, 엘리트 선수에게 필요한 움직임과 체력 기반을 다시 세웁니다.</p>
            </div>
          </div>
          <div className="button-row">
            <Link href="/services" className="button dark">서비스 자세히 보기</Link>
          </div>
        </div>
      </section>

      <section className="section dark">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">SYSTEM</p>
            <h2>설문 → 평가 → 프로그램 → 수업 기록</h2>
            <p>RePERFORMANCE는 단순한 운동 리스트가 아니라, 회원 상태를 기준으로 프로그램을 조정하는 시스템을 지향합니다.</p>
          </div>
          <div className="grid-3">
            <div className="card"><h3>온라인 설문</h3><p>운동 전 건강상태와 목표를 확인합니다. 필요한 경우 추가 문진을 통해 안전하게 시작합니다.</p></div>
            <div className="card"><h3>움직임 평가</h3><p>어깨, 골반, 중심축 등 움직임 패턴을 보고 어떤 운동부터 시작할지 판단합니다.</p></div>
            <div className="card"><h3>OPT 기반 프로그램</h3><p>Warm-up, Activation, Skill Development, Resistance Training 흐름으로 목적에 맞게 설계합니다.</p></div>
          </div>
          <div className="button-row">
            <Link href="/system" className="button primary">시스템 보기</Link>
            <a href={notionSurveyUrl} target="_blank" rel="noopener noreferrer" className="button secondary">설문 작성하기</a>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container grid-2">
          <div className="contact-box">
            <p className="eyebrow">LOCATION</p>
            <h2>전주 서신동 773-2, 2층</h2>
            <div className="contact-list">
              <div><strong>운영 시간</strong><span>08:00 ~ 22:00</span></div>
              <div><strong>주차</strong><span>건물 뒷편 주차 가능</span></div>
              <div><strong>연락</strong><span>010-2418-8400 / @reperformance_trainer</span></div>
            </div>
            <Link href="/location" className="button dark">위치 자세히 보기</Link>
          </div>
          <div className="contact-box">
            <p className="eyebrow">CONTACT</p>
            <h2>상담 신청</h2>
            <p>설문 작성 후 전화 또는 DM으로 남겨주시면 확인 후 상담 방향을 안내드립니다.</p>
            <div className="button-row">
              <a href={notionSurveyUrl} target="_blank" rel="noopener noreferrer" className="button primary">온라인 설문</a>
              <a href="tel:010-2418-8400" className="button secondary">전화 상담</a>
              <a href="https://www.instagram.com/reperformance_trainer" target="_blank" rel="noopener noreferrer" className="button secondary">인스타 DM</a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
