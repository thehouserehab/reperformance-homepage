import { instagramUrl, notionSurveyUrl, phoneHref } from "./site-data";

type ConsultationCTAProps = { compact?: boolean };

export default function ConsultationCTA({ compact = false }: ConsultationCTAProps) {
  return (
    <section className={`consultation-cta ${compact ? "compact" : ""}`}>
      <div className="container consultation-inner">
        <p className="eyebrow">CONSULTATION</p>
        <h2>지금 어디가 불편하신가요?</h2>
        <p>부위와 가장 힘든 동작만 알려주셔도 첫 방향을 잡아드릴 수 있습니다.</p>
        <p>설문 작성 후 전화 또는 DM을 남겨주시면 확인 후 상담 방향을 안내드립니다.</p>
        <div className="cta-buttons">
          <a href={notionSurveyUrl} target="_blank" rel="noopener noreferrer" className="button primary">온라인 설문 작성하기</a>
          <a href={phoneHref} className="button secondary">전화 상담하기</a>
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="button secondary">인스타그램 DM</a>
        </div>
      </div>
    </section>
  );
}
