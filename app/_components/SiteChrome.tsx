import Link from "next/link";
import NavLinks from "./NavLinks";

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo-link" aria-label="RePERFORMANCE 홈">
          <div className="logo-mark">
            <span className="logo-re">Re</span>
            <span className="logo-performance">PERFORMANCE</span>
          </div>
          <div className="logo-sub">ELITE REHAB & TRAINING</div>
        </Link>
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
        <p>전북 전주시 완산구 서신동 773-2, 2층 · 010-2418-8400</p>
      </div>
    </footer>
  );
}
