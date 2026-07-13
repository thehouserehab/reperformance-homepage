import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import NavLinks from "./NavLinks";
import { primaryLinks } from "./navigation";
import { site } from "./siteData";

export function BrandLogo() {
  return (
    <Link href="/" className="brand-logo" aria-label="RePERFORMANCE 홈으로 이동">
      <span className="brand-mark" aria-hidden="true">
        <Image
          alt=""
          height={72}
          priority
          src="/images/reperformance-official-mark.png"
          width={72}
        />
      </span>
      <span className="brand-lockup">
        <span className="brand-main">
          <span className="brand-re">Re</span>
          <span className="brand-performance">PERFORMANCE</span>
        </span>
        <span className="brand-sub">{site.tagline}</span>
      </span>
    </Link>
  );
}

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <BrandLogo />
        <NavLinks />
        <div className="mobile-header-actions">
          <Link href="/apply" className="mobile-apply">
            신청
          </Link>
          <details className="mobile-menu">
            <summary aria-label="전체 메뉴 열기">메뉴</summary>
            <nav className="mobile-menu-panel" aria-label="모바일 주요 메뉴">
              {primaryLinks.map((link, index) => (
                <Link href={link.href} key={link.href}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{link.label}</strong>
                </Link>
              ))}
              <Link href="/apply" className="mobile-menu-apply">
                <span>07</span>
                <strong>상담 신청</strong>
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-main">
        <div className="footer-brand-column">
          <BrandLogo />
          <p>현재 상태를 확인하고, 회복에서 퍼포먼스까지 필요한 다음 단계를 설계합니다.</p>
        </div>
        <nav className="footer-nav" aria-label="하단 주요 메뉴">
          <p>EXPLORE</p>
          {primaryLinks.slice(0, 5).map((link) => (
            <Link href={link.href} key={link.href}>{link.label}</Link>
          ))}
        </nav>
        <div className="footer-contact-column">
          <p>CONTACT</p>
          <a href={site.phoneHref}>{site.phone}</a>
          <a href={site.instagramHref} target="_blank" rel="noopener noreferrer">{site.instagram}</a>
          <span>{site.address}</span>
          <span>{site.hours}</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>© RePERFORMANCE. All rights reserved.</p>
        <div>
          <Link href="/contact">문의</Link>
          <Link href="/apply">상담 신청</Link>
        </div>
      </div>
    </footer>
  );
}

export function ConsultationCTA({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "consultation compact" : "consultation"}>
      <div className="container consultation-inner">
        <p className="eyebrow light-text">CONSULTATION</p>
        <h2>지금 가장 불편한 움직임부터 남겨 주세요.</h2>
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
