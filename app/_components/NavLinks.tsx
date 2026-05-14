"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/services", label: "서비스", match: (p: string) => p === "/services" || p.startsWith("/services/") },
  { href: "/system", label: "시스템", match: (p: string) => p === "/system" || p.startsWith("/system/") },
  { href: "/coach", label: "코치", match: (p: string) => p === "/coach" },
  { href: "/location", label: "위치", match: (p: string) => p === "/location" }
];

export default function NavLinks() {
  const pathname = usePathname();
  const isContact = pathname === "/contact";

  return (
    <nav className="nav">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={`nav-link ${item.match(pathname) ? "active" : ""}`}>
          {item.label}
        </Link>
      ))}
      <Link href="/contact" className={`nav-cta ${isContact ? "active" : ""}`}>상담</Link>
    </nav>
  );
}
