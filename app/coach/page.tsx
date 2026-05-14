import Image from "next/image";
import ConsultationCTA from "../_components/ConsultationCTA";
import { Footer, Header } from "../_components/SiteChrome";

export default function CoachPage(){return <main><Header />
<section className="page-hero"><div className="container page-title"><p className="eyebrow">HEAD COACH</p><h1>정우현 Head Coach</h1><p>운동을 잘하게 만들기 전에, 먼저 편하게 움직이는 몸을 만듭니다.</p></div></section>
<section className="section"><div className="container grid-2"><div className="hero-panel"><Image src="/images/coach-profile.jpg" alt="정우현 코치 프로필" width={900} height={1200} className="coach" /></div><div className="contact-box"><h2>Rehab to Performance</h2><div className="info-list"><div className="info-item"><strong>철학</strong><span>아프지 않고 오래 건강하게.</span></div><div className="info-item"><strong>방식</strong><span>현재 상태를 보고 단계적으로 진행.</span></div><div className="info-item"><strong>대상</strong><span>시니어, 일반인, 유소년/엘리트 선수</span></div></div></div></div></section>
<ConsultationCTA />
<Footer /></main>}
