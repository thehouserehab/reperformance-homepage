import ConsultationCTA from "../_components/ConsultationCTA";
import { Footer, Header } from "../_components/SiteChrome";
import { instagramUrl, naverMapUrl, phoneHref } from "../_components/site-data";

export default function LocationPage(){return <main><Header />
<section className="page-hero"><div className="container page-title"><p className="eyebrow">LOCATION</p><h1>전주 서신동 RePERFORMANCE</h1><p>전북 전주시 완산구 서신동 773-2, 2층 · 서신신협 2층</p></div></section>
<section className="section"><div className="container grid-2"><div className="contact-box"><h2>오시는 길</h2><div className="contact-list"><div><strong>주소</strong><span>전북 전주시 완산구 서신동 773-2, 2층<br/>서신신협 2층</span></div><div><strong>주차</strong><span>건물 뒷편 주차 가능</span></div><div><strong>운영시간</strong><span>08:00 ~ 22:00</span></div><div><strong>연락처</strong><span>010-2418-8400</span></div><div><strong>인스타그램</strong><span>@reperformance_trainer</span></div></div><div className="button-row"><a href={naverMapUrl} target="_blank" rel="noopener noreferrer" className="button dark">네이버 지도에서 보기</a></div></div><div className="contact-box"><h2>빠른 문의</h2><p>설문 작성 후 전화 또는 DM을 남겨주시면 확인 후 상담 방향을 안내드립니다.</p><div className="button-row"><a href={phoneHref} className="button primary">전화하기</a><a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="button secondary">인스타그램</a></div></div></div></section>
<ConsultationCTA />
<Footer /></main>}
