"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryLinks } from "./navigation";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="주요 메뉴">
      {primaryLinks.map((link) => (
        <Link key={link.href} href={link.href} className={isActive(pathname, link.href) ? "nav-link active" : "nav-link"}>
          {link.label}
        </Link>
      ))}
      <Link href="/apply" className={pathname === "/apply" ? "nav-cta active" : "nav-cta"}>
        신청
      </Link>
    </nav>
  );
}
