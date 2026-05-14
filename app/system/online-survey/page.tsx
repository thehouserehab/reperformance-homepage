import { ConsultationCTA, PageShell } from "../../_components/SiteChrome";
import { site } from "../../_components/siteData";

export default function OnlineSurveyPage() {
  return (
    <PageShell>
      <section className="page-hero"><div className="container page-title"><p className="eyebrow">SYSTEM 01</p><h1>온라인 설문</h1><p>운동을 시작하기 전, 현재 몸 상태와 목표를 먼저 확인합니다.</p></div></section>
      <section className="section"><div className="container detail-grid"><div className="contact-box"><h2>확인하는 내용</h2><ul><li>운동 목표</li><li>통증 및 불편감</li><li>운동 경험</li><li>주의사항</li><li>운동 가능 빈도와 시간</li></ul></div><div className="contact-box"><h2>왜 필요한가</h2><p>수업을 바로 시작하지 않고 먼저 설문을 통해 회원에게 필요한 운동 방향을 안전하고 명확하게 설정합니다.</p><ul><li>무리한 운동을 피하기 위해</li><li>첫 상담 시간을 더 정확하게 쓰기 위해</li><li>개인에게 맞는 프로그램 방향을 잡기 위해</li></ul><a href={site.notionSurveyHref} target="_blank" rel="noopener noreferrer" className="button primary">온라인 설문 작성하기</a></div></div></section>
      <ConsultationCTA />
    </PageShell>
  );
}
