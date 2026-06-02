import { ConsultationCTA, PageShell } from "../_components/SiteChrome";
import { site } from "../_components/siteData";

export default function LocationPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">LOCATION</p>
          <h1>전주 서신동 RePERFORMANCE</h1>
          <p>
            {site.address}. {site.addressDetail} {site.parking}입니다.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container location-grid">
          <div className="contact-box stretch-card">
            <h2>오시는 길</h2>
            <div className="contact-list">
              <div>
                <strong>주소</strong>
                <span>{site.address}</span>
              </div>
              <div>
                <strong>위치 안내</strong>
                <span>{site.addressDetail}</span>
              </div>
              <div>
                <strong>주차</strong>
                <span>{site.parking}</span>
              </div>
              <div>
                <strong>운영 시간</strong>
                <span>{site.hours}</span>
              </div>
              <div>
                <strong>연락처</strong>
                <span>{site.phone}</span>
              </div>
              <div>
                <strong>인스타그램</strong>
                <span>{site.instagram}</span>
              </div>
            </div>
            <div className="button-row card-bottom">
              <a href={site.naverMapHref} target="_blank" rel="noopener noreferrer" className="button dark">
                네이버 지도에서 보기
              </a>
            </div>
          </div>
          <div className="contact-box stretch-card quick-card">
            <p className="eyebrow">QUICK CONTACT</p>
            <h2>빠른 문의</h2>
            <p>설문 작성 후 전화 또는 DM으로 남겨주시면 확인 뒤 상담 방향을 안내해드립니다.</p>
            <div className="button-row">
              <a href={site.phoneHref} className="button primary">
                전화하기
              </a>
              <a href={site.instagramHref} target="_blank" rel="noopener noreferrer" className="button secondary">
                인스타그램
              </a>
            </div>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}