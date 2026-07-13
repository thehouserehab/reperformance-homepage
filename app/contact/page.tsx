import { ConsultationCTA, PageShell } from "../_components/SiteChrome";
import { site } from "../_components/siteData";

export default function ContactPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">CONTACT</p>
          <h1>상담 신청</h1>
          <p>
            지금 어느 부위가 불편한지, 어떤 동작에서 어려움이 생기는지 알려주세요. 신청서 작성 후 전화 또는 DM으로
            남겨주시면 상담 방향을 안내해드립니다.
          </p>
        </div>
      </section>

      <section className="contact-editorial-section">
        <div className="container contact-editorial-grid">
          <div className="contact-primary-panel">
            <p className="eyebrow light-text">START CONSULTATION</p>
            <h2>신청서에서 현재 상태를 먼저 알려주세요.</h2>
            <p>
              운동 목표, 불편한 부위, 주의사항을 먼저 확인합니다. 안전한 운동 진행을 위해 가능한 정확하게 작성해주세요.
            </p>
            <div>
              <a className="button cta-primary" href={site.serviceApplyHref}>
                상담 신청하기
              </a>
            </div>
          </div>
          <div className="contact-direct-panel">
            <p className="eyebrow">DIRECT CONTACT</p>
            <h2>직접 문의</h2>
            <div className="contact-direct-list">
              <div>
                <strong>전화 상담</strong>
                <a href={site.phoneHref}>{site.phone}</a>
              </div>
              <div>
                <strong>인스타그램</strong>
                <a href={site.instagramHref} target="_blank" rel="noopener noreferrer">{site.instagram}</a>
              </div>
              <div>
                <strong>운영 시간</strong>
                <span>{site.hours}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-prep-section">
        <div className="container">
          <div className="contact-prep-head">
            <p className="eyebrow">WHAT TO SEND</p>
            <h2>상담 전에 알려주시면 좋은 정보</h2>
          </div>
          <div className="contact-prep-list">
            <div>
              <span>01</span>
              <h3>불편한 부위</h3>
              <p>어깨, 허리, 무릎 등 가장 신경 쓰이는 부위를 알려주세요.</p>
            </div>
            <div>
              <span>02</span>
              <h3>힘든 동작</h3>
              <p>걷기, 계단, 앉았다 일어나기처럼 실제로 어려운 동작을 알려주세요.</p>
            </div>
            <div>
              <span>03</span>
              <h3>운동 목표</h3>
              <p>통증 관리, 체력 회복, 복귀 준비 등 원하는 방향을 알려주세요.</p>
            </div>
          </div>
        </div>
      </section>

      <ConsultationCTA compact />
    </PageShell>
  );
}
