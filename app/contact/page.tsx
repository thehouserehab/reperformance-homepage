import ConsultationCTA from "../_components/ConsultationCTA";
import { Footer, Header } from "../_components/SiteChrome";
import { instagramUrl, notionSurveyUrl, phoneHref } from "../_components/site-data";

export default function ContactPage(){return <main><Header />
<section className="page-hero"><div className="container page-title"><p className="eyebrow">CONTACT</p><h1>상담 신청</h1><p>지금 어느 부위가, 어떤 동작에서 불편한지 알려주세요.</p></div></section>
<ConsultationCTA compact />
<section className="section"><div className="container grid-3"><div className="card"><h3>온라인 설문</h3><p>건강상태와 목표를 먼저 확인합니다.</p><a className="button primary" href={notionSurveyUrl} target="_blank" rel="noopener noreferrer">온라인 설문 작성하기</a></div><div className="card"><h3>전화 상담</h3><p>가장 빠른 문의 채널입니다.</p><a href={phoneHref} className="button secondary">전화 상담하기</a></div><div className="card"><h3>인스타그램 DM</h3><p>@reperformance_trainer</p><a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="button secondary">DM 보내기</a></div></div></section>
<ConsultationCTA />
<Footer /></main>}
