import Image from "next/image";
import Link from "next/link";

function Header(){return <header className="site-header"><div className="container header-inner"><Link href="/" className="logo-link"><Image src="/images/reperformance-logo.png" alt="RePERFORMANCE" width={360} height={100} className="logo-img"/></Link><nav className="nav"><Link href="/services">서비스</Link><Link href="/system">시스템</Link><Link href="/coach">코치</Link><Link href="/location">위치</Link><Link href="/contact" className="nav-cta">상담</Link></nav></div></header>}
function Footer(){return <footer className="footer"><div className="container footer-inner"><p>© RePERFORMANCE. All rights reserved.</p><p>전북 전주시 완산구 서신동 773-2, 2층 · 010-2418-8400</p></div></footer>}

export default function ServicesPage(){
 return <main><Header />
  <section className="page-hero"><div className="container page-title"><p className="eyebrow">SERVICES</p><h1>재활을 입구로, 운동 복귀까지 이어갑니다.</h1><p>RePERFORMANCE의 서비스는 통증과 불편함을 줄이는 데서 끝나지 않습니다. 다시 움직이고, 다시 운동하고, 더 오래 건강하게 유지할 수 있도록 단계적으로 설계합니다.</p></div></section>
  <section className="section"><div className="container grid-3">
    <div className="card"><h3>재활 트레이닝</h3><p>어깨·허리·무릎 등 반복되는 불편함을 기준으로 현재 상태를 확인하고, 가능한 범위부터 안전하게 움직임과 근력을 회복합니다.</p><ul><li>통증 기준 강도 조절</li><li>가동성·안정성 회복</li><li>재발 방지 근력 강화</li></ul></div>
    <div className="card"><h3>시니어 재활 프로그램</h3><p>부모님 세대가 일상에서 느끼는 걷기, 계단, 어깨 움직임, 허리 불편감을 줄이는 데 집중합니다.</p><ul><li>걷기·계단 기능 개선</li><li>균형·하체 안정성</li><li>안전한 운동 습관 형성</li></ul></div>
    <div className="card"><h3>선수·학생 리컨디셔닝</h3><p>부상 이후 복귀, 기록 정체, 체력 저하를 움직임·근력·컨디션 관점에서 다시 정리합니다.</p><ul><li>운동 복귀 단계 설계</li><li>기초 체력·근력 회복</li><li>유소년·엘리트 선수 대응</li></ul></div>
  </div></section>
  <section className="section light"><div className="container"><div className="section-head"><p className="eyebrow">PRINCIPLE</p><h2>무리하게 밀어붙이지 않습니다.</h2><p>몸 상태를 확인하고, 불편한 동작을 찾고, 그날 가능한 범위에서 시작합니다. 좋은 재활은 참고 버티는 과정이 아니라 안전하게 다시 쌓는 과정입니다.</p></div><Link href="/contact" className="button primary">상담 신청하기</Link></div></section>
 <Footer /></main>
}
