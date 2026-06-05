"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/services", label: "서비스" },
  { href: "/system", label: "시스템" },
  { href: "/coach", label: "코치" },
  { href: "/location", label: "위치" },
  { href: "/signup", label: "회원가입" },
  { href: "/login", label: "로그인" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="주요 메뉴">
      {links.map((link) => (
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
