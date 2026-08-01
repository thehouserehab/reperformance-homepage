"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Home,
  MessageCircle,
  MessageCircleQuestion,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { AppRole } from "@/lib/types";

const roleLinks: Record<AppRole, { href: string; label: string }[]> = {
  student: [
    { href: "/student", label: "학생" },
    { href: "/guardian", label: "학부모" },
    { href: "/coach", label: "강사" },
  ],
  guardian: [
    { href: "/student", label: "학생" },
    { href: "/guardian", label: "학부모" },
    { href: "/coach", label: "강사" },
  ],
  coach: [
    { href: "/student", label: "학생" },
    { href: "/guardian", label: "학부모" },
    { href: "/coach", label: "강사" },
  ],
};

const studentNavigation = [
  { href: "/student", label: "오늘", icon: Home },
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/student/messages", label: "코치 대화", icon: MessageCircle },
  { href: "/student#study-timer", label: "타이머", icon: Clock3 },
  { href: "/student/privacy", label: "공개 설정", icon: ShieldCheck },
];

const roleNavigation = {
  guardian: [{ href: "/guardian", label: "문의", icon: MessageCircleQuestion }],
  coach: [
    { href: "/coach", label: "학생", icon: UsersRound },
    { href: "/coach/messages", label: "대화", icon: MessageCircle },
    { href: "/calendar", label: "일정", icon: CalendarDays },
  ],
};

export function AppShell({
  role,
  title,
  eyebrow,
  children,
}: {
  role: AppRole;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navigation = role === "student" ? studentNavigation : roleNavigation[role];
  const exactOnlyPaths = ["/student", "/coach", "/guardian"];

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand-lockup" href="/student" aria-label="RP APP 학생 홈">
          <span className="brand-mark">RP</span>
          <span>
            <b>RP APP</b>
            <small>STUDY · PERFORMANCE</small>
          </span>
        </Link>
        <details className="role-preview">
          <summary>
            <span>화면 미리보기</span> <ChevronDown aria-hidden="true" size={16} />
          </summary>
          <div className="role-preview-menu">
            {roleLinks[role].map((item) => (
              <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </div>
        </details>
      </header>

      <main className="app-main">
        <section className="page-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </section>
        {children}
      </main>

      <nav className="bottom-navigation" aria-label={`${role} 주요 메뉴`}>
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = item.href.includes("#")
            ? false
            : pathname === item.href ||
              (!exactOnlyPaths.includes(item.href) && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "active" : undefined}
              aria-current={active ? "page" : undefined}
            >
              <Icon aria-hidden="true" size={21} strokeWidth={1.9} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
