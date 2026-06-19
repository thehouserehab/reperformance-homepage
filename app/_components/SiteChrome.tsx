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
        <Link href="/apply" className="mobile-apply">
          신청
        </Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>© RePERFORMANCE. All rights reserved.</p>
        <p>
          {site.address} · {site.phone}
        </p>
      </div>
    </footer>
  );
}

export function ConsultationCTA({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "consultation compact" : "consultation"}>
      <div className="container consultation-inner">
        <p className="eyebrow light-text">CONSULTATION</p>
        <h2>지금 가장 불편한 움직임부터 남겨주세요.</h2>
        <p>
          원하는 서비스를 선택하고 운동 전 확인 항목을 작성하면 담당 코치가 상담 방향을 안내합니다.
        </p>
        <div className="button-row">
          <Link className="button cta-primary" href={site.serviceApplyHref}>
            상담 신청하기
          </Link>
          <a className="button cta-secondary" href={site.phoneHref}>
            전화 상담
          </a>
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
