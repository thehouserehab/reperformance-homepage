import { instagramUrl, notionSurveyUrl, phoneHref } from "./site-data";

type ConsultationCTAProps = { compact?: boolean };

export default function ConsultationCTA({ compact = false }: ConsultationCTAProps) {
  return (
    <section className={`consultation-cta ${compact ? "compact" : ""}`}>
      <div className="container consultation-inner">
        <p className="eyebrow">CONSULTATION</p>
        <h2>지금 몸에서 가장 불편한 움직임부터 확인해보세요.</h2>
        <p>온라인 설문, 전화, DM 중 편한 방식으로 남겨주시면 현재 상태에 맞는 상담 방향을 안내해드립니다.</p>
        <div className="cta-buttons">
          <a href={notionSurveyUrl} target="_blank" rel="noopener noreferrer" className="button primary">
            온라인 설문 작성
          </a>
          <a href={phoneHref} className="button secondary">
            전화 상담
          </a>
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="button secondary">
            인스타그램 DM
          </a>
        </div>
      </div>
    </section>
  );
}