"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bot,
  CalendarDays,
  ClipboardList,
  ContactRound,
  Home,
  LayoutDashboard,
  MessageCircle,
  MessageCircleQuestion,
  MessagesSquare,
  ScanSearch,
  ShieldCheck,
  TriangleAlert,
  Timer,
  UserRound,
  UsersRound,
} from "lucide-react";
import { appRoleDefinitions, type NavigationIconName } from "@/lib/appStructure";
import type { AppRole } from "@/lib/types";
import { useAppState } from "./AppStateProvider";

const navigationIcons: Record<NavigationIconName, typeof Home> = {
  home: Home,
  calendar: CalendarDays,
  timer: Timer,
  records: ClipboardList,
  consultation: MessagesSquare,
  messages: MessageCircle,
  students: UsersRound,
  guardian: MessageCircleQuestion,
  operations: LayoutDashboard,
  relations: ContactRound,
  ai: Bot,
  audit: ScanSearch,
  privacy: ShieldCheck,
  mypage: UserRound,
};

function isKoreanEvening() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hour12: false,
  }).format(new Date()));
  return hour >= 22;
}

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
  layout?: "default" | "home" | "conversation" | "schedule";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { persistenceIssue } = useAppState();
  const roleDefinition = appRoleDefinitions[role];
  const bottomNavItems = roleDefinition.navigation.slice(0, 5);
  const [showEveningMessage, setShowEveningMessage] = useState(false);

  useEffect(() => {
    if (layout !== "home") return;
    const updateEveningMessage = () => setShowEveningMessage(isKoreanEvening());
    updateEveningMessage();
    const timer = window.setInterval(updateEveningMessage, 60_000);
    return () => window.clearInterval(timer);
  }, [layout]);

  return (
    <div className={`app-shell${layout === "conversation" ? " conversation-app-shell" : ""}${layout === "home" ? " home-app-shell" : ""}`}>
      <header className="app-header">
        <div className="app-header-primary">
          <Link className="brand-lockup" href={roleDefinition.homeHref} aria-label={`RP APP ${roleDefinition.label} 홈`}>
            <span className="brand-mark">RP</span>
            <span>
              <b>RP APP</b>
              <small>STUDY · PERFORMANCE</small>
            </span>
          </Link>
        </div>
        <span className="current-role-label">{roleDefinition.label}</span>
      </header>

      {layout === "home" && showEveningMessage && (
        <div className="evening-encouragement" role="status">
          <span>오늘도 정말 수고했어요.</span>
          <b>한 번의 완벽함보다 매일의 꾸준함이 더 멀리 갑니다.</b>
        </div>
      )}

      {persistenceIssue && (
        <div className="prototype-persistence-alert" role="alert" aria-live="assertive">
          <TriangleAlert aria-hidden="true" size={21} />
          <div>
            <strong>변경 내용을 이 기기에 저장하지 못했습니다.</strong>
            <span>화면에는 반영하지 않았습니다. 브라우저 저장 공간과 권한을 확인한 뒤 다시 시도해 주세요.</span>
          </div>
        </div>
      )}

      <main className={`app-main${layout === "conversation" ? " conversation-app-main" : ""}`}>
        <section
          className={layout === "conversation" ? "sr-only" : `page-heading${layout === "schedule" ? " schedule-page-heading" : ""}${layout === "home" ? " home-page-heading" : ""}`}
        >
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </section>
        {children}
      </main>

      {layout !== "conversation" && (
        <nav className="app-bottom-nav" aria-label={`${roleDefinition.label} 주요 이동`}>
          {bottomNavItems.map((item) => {
            const Icon = navigationIcons[item.icon];
            const active = item.match === "exact" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-bottom-nav-item${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon aria-hidden="true" size={21} strokeWidth={active ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
