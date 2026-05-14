import Image from "next/image";
import Link from "next/link";
import ConsultationCTA from "./_components/ConsultationCTA";
import { Footer, Header } from "./_components/SiteChrome";

export default function Home() {return <main><Header />
<section className="hero"><div className="container hero-grid"><div><p className="eyebrow">Rehab to Performance</p><h1>재활에서 운동까지,<br />다시 움직이는 몸을 만듭니다.</h1><p className="lead">통증과 불편함을 운동으로 관리하고, 일상과 운동으로 다시 돌아갈 수 있도록 돕는 재활 트레이닝 공간입니다.</p><div className="hero-actions"><Link href="/services" className="button primary">서비스 보기</Link><Link href="/contact" className="button secondary">상담 신청</Link></div></div><div className="hero-panel"><Image src="/images/coach-profile.jpg" alt="RePERFORMANCE 정우현 코치" width={900} height={1200} className="coach" priority /></div></div></section>
<ConsultationCTA compact />
<section className="section light"><div className="container"><div className="section-head"><p className="eyebrow">PRIORITY</p><h2>타겟 우선순위 중심 프로그램</h2></div><div className="service-priority-grid"><Link href="/services/senior-rehab" className="service-priority-card"><p className="service-priority-no">01 Senior Rehab</p><h3>시니어 재활 트레이닝</h3></Link><Link href="/services/athlete-reconditioning" className="service-priority-card"><p className="service-priority-no">02 Athlete Reconditioning</p><h3>선수·학생 리컨디셔닝</h3></Link><Link href="/services/pain-care" className="service-priority-card"><p className="service-priority-no">03 Pain Care</p><h3>일반인 통증 케어 & 근력 회복</h3></Link></div></div></section>
<ConsultationCTA />
<Footer /></main>;}
