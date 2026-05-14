import Image from "next/image";
import Link from "next/link";
const notionSurveyUrl="https://fearless-okapi-9c9.notion.site/2cdfab3c9eaa80e8a936e85baa1f3b59?pvs=105";
function Header(){return <header className="site-header"><div className="container header-inner"><Link href="/" className="logo-link"><Image src="/images/reperformance-logo.png" alt="RePERFORMANCE" width={360} height={100} className="logo-img"/></Link><nav className="nav"><Link href="/services">서비스</Link><Link href="/system">시스템</Link><Link href="/coach">코치</Link><Link href="/location">위치</Link><Link href="/contact" className="nav-cta">상담</Link></nav></div></header>}
function Footer(){return <footer className="footer"><div className="container footer-inner"><p>© RePERFORMANCE. All rights reserved.</p><p>전북 전주시 완산구 서신동 773-2, 2층 · 010-2418-8400</p></div></footer>}
export default function SystemPage(){return <main><Header />
<section className="page-hero"><div className="container page-title"><p className="eyebrow">TRAINING SYSTEM</p><h1>설문, 평가, 프로그램, 기록이 하나로 이어집니다.</h1><p>회원의 상태를 먼저 확인하고, 움직임을 평가한 뒤, 목적에 맞는 운동 프로그램을 설계합니다. 매 회차 컨디션에 따라 운동 강도와 순서를 조정합니다.</p></div></section>
<section className="section"><div className="container grid-3">
<div className="card"><h3>1. 온라인 설문</h3><p>운동 목표, 통증·불편감, 생활 패턴, 주의사항을 먼저 확인합니다. 안전한 수업을 위한 시작점입니다.</p></div>
<div className="card"><h3>2. 움직임 평가</h3><p>어깨, 골반, 중심축을 포함해 움직임 패턴을 확인하고 어떤 운동부터 시작할지 판단합니다.</p></div>
<div className="card"><h3>3. OPT 기반 프로그램</h3><p>Warm-up, Activation, Skill Development, Resistance Training, Cool-down 흐름으로 목적에 맞게 구성합니다.</p></div>
</div></section>
<section className="section dark"><div className="container"><div className="section-head"><p className="eyebrow">DOCUMENTED CARE</p><h2>수업은 감으로만 진행하지 않습니다.</h2><p>계약, 개인정보·민감정보 동의, 평가 기록, 프로그램 기록을 통해 안전성과 일관성을 높입니다. 회원이 직접 이해할 수 있는 언어로 안내합니다.</p></div><div className="button-row"><a className="button primary" href={notionSurveyUrl} target="_blank" rel="noopener noreferrer">온라인 설문 작성하기</a><Link href="/contact" className="button secondary">상담 문의</Link></div></div></section>
<Footer /></main>}
