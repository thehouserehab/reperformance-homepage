import Image from "next/image";
import Link from "next/link";
import { ConsultationCTA, PageShell } from "./_components/SiteChrome";
import { serviceItems, site, systemItems } from "./_components/siteData";

export default function Home() {
  return (
    <PageShell>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">Rehab to Performance</p>
            <h1>재활에서 운동까지,<br />다시 움직이는 몸을 만듭니다.</h1>
            <p className="lead">
              RePERFORMANCE는 통증과 불편함을 운동으로 관리하고, 일상과 운동으로 다시 돌아갈 수 있도록 돕는 전주 서신동 재활 트레이닝 공간입니다.
            </p>
            <div className="hero-actions">
              <a href={site.notionSurveyHref} target="_blank" rel="noopener noreferrer" className="button primary">온라인 설문 작성하기</a>
              <Link href="/services" className="button secondary">서비스 보기</Link>
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
            <h2>우선순위가 명확한 재활 트레이닝</h2>
            <p>입구는 재활입니다. 시니어의 일상 회복을 1순위로 두고, 선수 복귀와 일반인 통증 케어까지 확장합니다.</p>
          </div>
          <div className="grid-3">
            {serviceItems.map((item) => (
              <Link href={item.href} className="card interactive-card" key={item.href}>
                <span className="card-number">{item.number}</span>
                <p className="card-label">{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.target}</p>
                <span className="more-link">자세히 보기 →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">SYSTEM</p>
            <h2>설문 → 평가 → 프로그램</h2>
            <p>수업은 감으로만 진행하지 않습니다. 현재 상태를 확인하고, 움직임을 평가한 뒤, 목적에 맞는 운동 프로그램을 설계합니다.</p>
          </div>
          <div className="grid-3">
            {systemItems.map((item) => (
              <Link href={item.href} className="card interactive-card" key={item.href}>
                <span className="card-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <span className="more-link">자세히 보기 →</span>
              </Link>
            ))}
          </div>
          <div className="button-row">
            <Link href="/system" className="button dark">시스템 전체 보기</Link>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container grid-2">
          <div className="contact-box">
            <p className="eyebrow">LOCATION</p>
            <h2>전주 서신동 773-2, 2층</h2>
            <div className="contact-list">
              <div><strong>운영 시간</strong><span>{site.hours}</span></div>
              <div><strong>주차</strong><span>{site.parking}</span></div>
              <div><strong>연락</strong><span>{site.phone} / {site.instagram}</span></div>
            </div>
            <div className="button-row">
              <Link href="/location" className="button dark">위치 자세히 보기</Link>
              <a href={site.naverMapHref} target="_blank" rel="noopener noreferrer" className="button secondary">네이버 지도</a>
            </div>
          </div>
          <div className="contact-box accent-box">
            <p className="eyebrow">CONTACT</p>
            <h2>상담 신청</h2>
            <p>설문 작성 후 전화 또는 DM으로 남겨주시면 확인 후 상담 방향을 안내드립니다.</p>
            <div className="button-row">
              <a href={site.notionSurveyHref} target="_blank" rel="noopener noreferrer" className="button primary">온라인 설문</a>
              <a href={site.phoneHref} className="button secondary">전화 상담</a>
            </div>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
