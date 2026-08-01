"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  ContactRound,
  Home,
  LayoutDashboard,
  MessageCircle,
  MessageCircleQuestion,
  MessagesSquare,
  ScanSearch,
  UsersRound,
} from "lucide-react";
import { appRoleDefinitions, appRoleOrder, type NavigationIconName } from "@/lib/appStructure";
import type { AppRole } from "@/lib/types";

const navigationIcons: Record<NavigationIconName, typeof Home> = {
  home: Home,
  calendar: CalendarDays,
  records: ClipboardList,
  consultation: MessagesSquare,
  messages: MessageCircle,
  students: UsersRound,
  guardian: MessageCircleQuestion,
  operations: LayoutDashboard,
  relations: ContactRound,
  ai: Bot,
  audit: ScanSearch,
};

export function AppShell({
  role,
  title,
  eyebrow,
  layout = "default",
  children,
}: {
  role: AppRole;
  title: string;
  eyebrow: string;
  layout?: "default" | "conversation" | "schedule";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const roleDefinition = appRoleDefinitions[role];

  return (
    <div className={`app-shell${layout === "conversation" ? " conversation-app-shell" : ""}`}>
      <header className="app-header">
        <Link className="brand-lockup" href={roleDefinition.homeHref} aria-label={`RP APP ${roleDefinition.label} 홈`}>
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
            {appRoleOrder.map((previewRole) => {
              const preview = appRoleDefinitions[previewRole];
              return (
                <Link
                  key={previewRole}
                  href={preview.homeHref}
                  aria-current={role === previewRole ? "page" : undefined}
                >
                  {preview.label}
                </Link>
              );
            })}
          </div>
        </details>
      </header>

      <main className={`app-main${layout === "conversation" ? " conversation-app-main" : ""}`}>
        <section
          className={layout === "conversation" ? "sr-only" : `page-heading${layout === "schedule" ? " schedule-page-heading" : ""}`}
        >
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </section>
        {children}
      </main>

      <nav className="bottom-navigation" aria-label={`${role} 주요 메뉴`}>
        {roleDefinition.navigation.map((item) => {
          const Icon = navigationIcons[item.icon];
          const active = item.match === "exact" ? pathname === item.href : pathname.startsWith(item.href);
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
