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

      <section className="location-editorial-section">
        <div className="container location-editorial-grid">
          <div className="location-details">
            <p className="eyebrow">VISIT INFORMATION</p>
            <h2>방문 전에 확인하세요.</h2>
            <div className="location-detail-list">
              <div>
                <span>01</span><strong>주소</strong>
                <span>{site.address}</span>
              </div>
              <div>
                <span>02</span><strong>위치 안내</strong>
                <span>{site.addressDetail}</span>
              </div>
              <div>
                <span>03</span><strong>주차</strong>
                <span>{site.parking}</span>
              </div>
              <div>
                <span>04</span><strong>운영 시간</strong>
                <span>{site.hours}</span>
              </div>
              <div>
                <span>05</span><strong>연락처</strong>
                <span>{site.phone}</span>
              </div>
            </div>
            <div className="button-row">
              <a href={site.naverMapHref} target="_blank" rel="noopener noreferrer" className="button dark">
                네이버 지도에서 보기
              </a>
            </div>
          </div>
          <aside className="location-contact-panel">
            <p className="eyebrow light-text">QUICK CONTACT</p>
            <h2>방문 목적을 먼저 남겨주세요.</h2>
            <p>신청서 작성 후 전화 또는 DM을 남겨주시면 확인 뒤 상담 방향을 안내합니다.</p>
            <div className="location-contact-actions">
              <a href={site.serviceApplyHref}>
                상담 신청하기
              </a>
              <a href={site.phoneHref}>전화하기 <span aria-hidden="true">→</span></a>
              <a href={site.instagramHref} target="_blank" rel="noopener noreferrer">인스타그램 <span aria-hidden="true">→</span></a>
            </div>
          </aside>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
