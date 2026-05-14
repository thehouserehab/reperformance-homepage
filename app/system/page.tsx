import Link from "next/link";
import ConsultationCTA from "../_components/ConsultationCTA";
import { Footer, Header } from "../_components/SiteChrome";
import { notionSurveyUrl } from "../_components/site-data";

export default function SystemPage(){return <main><Header />
<section className="page-hero"><div className="container page-title"><p className="eyebrow">TRAINING SYSTEM</p><h1>설문, 평가, 프로그램, 기록이 하나로 이어집니다.</h1><p>회원 상태를 기준으로 매 회차 강도와 순서를 조정합니다.</p></div></section>
<section className="section"><div className="container grid-3"><div className="card"><h3>1. 온라인 설문</h3><p>운동 목표, 통증·불편감, 주의사항 확인</p></div><div className="card"><h3>2. 움직임 평가</h3><p>어깨/골반/중심축 패턴 분석</p></div><div className="card"><h3>3. OPT 기반 프로그램</h3><p>Warm-up 부터 Cool-down까지 목적 맞춤 설계</p></div></div></section>
<ConsultationCTA compact />
<section className="section dark"><div className="container"><div className="button-row"><a className="button primary" href={notionSurveyUrl} target="_blank" rel="noopener noreferrer">온라인 설문 작성하기</a><Link href="/contact" className="button secondary">상담 문의</Link></div></div></section>
<ConsultationCTA />
<Footer /></main>}
