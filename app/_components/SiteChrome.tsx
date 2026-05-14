import type { ReactNode } from "react";
import Link from "next/link";
import NavLinks from "./NavLinks";
import { site } from "./siteData";

export function BrandLogo() {
  return (
    <Link href="/" className="brand-logo" aria-label="RePERFORMANCE 홈으로 이동">
      <span className="brand-main">
        <span className="brand-re">Re</span>
        <span className="brand-performance">PERFORMANCE</span>
      </span>
      <span className="brand-sub">{site.tagline}</span>
    </Link>
  );
}

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <BrandLogo />
        <NavLinks />
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>© RePERFORMANCE. All rights reserved.</p>
        <p>{site.address} · {site.phone}</p>
      </div>
    </footer>
  );
}

export function ConsultationCTA({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "consultation compact" : "consultation"}>
      <div className="container consultation-inner">
        <p className="eyebrow light-text">CONSULTATION</p>
        <h2>지금 어디가 불편하신가요?</h2>
        <p>
          부위와 가장 힘든 동작만 알려주셔도 첫 방향을 잡아드릴 수 있습니다.
          설문 작성 후 전화 또는 DM을 남겨주시면 확인 후 상담 방향을 안내드립니다.
        </p>
        <div className="button-row">
          <a className="button cta-primary" href={site.notionSurveyHref} target="_blank" rel="noopener noreferrer">
            온라인 설문 작성하기
          </a>
          <a className="button cta-secondary" href={site.phoneHref}>전화 상담하기</a>
          <a className="button cta-secondary" href={site.instagramHref} target="_blank" rel="noopener noreferrer">
            인스타그램 DM
          </a>
        </div>
      </div>
    </section>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main>
      <Header />
      {children}
      <Footer />
    </main>
  );
}
