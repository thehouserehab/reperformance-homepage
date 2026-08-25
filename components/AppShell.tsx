"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bot,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  ContactRound,
  Home,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MessageCircleQuestion,
  MessagesSquare,
  ScanSearch,
  ShieldCheck,
  TriangleAlert,
  Timer,
  UsersRound,
  X,
} from "lucide-react";
import { appRoleDefinitions, appRoleOrder, type NavigationIconName } from "@/lib/appStructure";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEveningMessage, setShowEveningMessage] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [sidebarOpen]);

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
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="메뉴 열기"
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
            title="메뉴"
          >
            <Menu aria-hidden="true" size={22} />
          </button>
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

      <button
        type="button"
        className={`sidebar-backdrop${sidebarOpen ? " open" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-label="메뉴 바깥 영역 닫기"
        tabIndex={sidebarOpen ? 0 : -1}
      />
      <aside id="app-sidebar" className={`app-sidebar${sidebarOpen ? " open" : ""}`} aria-label={`${roleDefinition.label} 메뉴`} aria-hidden={!sidebarOpen} inert={!sidebarOpen}>
        <header className="sidebar-header">
          <Link href={roleDefinition.homeHref} className="sidebar-brand">
            <span className="brand-mark">RP</span>
            <span><b>RP APP</b><small>{roleDefinition.label} 화면</small></span>
          </Link>
          <button type="button" className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="메뉴 닫기" title="닫기">
            <X aria-hidden="true" size={21} />
          </button>
        </header>

        <nav className="sidebar-navigation" aria-label={`${roleDefinition.label} 기능 목록`}>
          <p>목록</p>
          {roleDefinition.navigation.map((item) => {
            const Icon = navigationIcons[item.icon];
            const active = item.match === "exact" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
                <Icon aria-hidden="true" size={19} strokeWidth={1.9} />
                <span>{item.label}</span>
                <ChevronRight aria-hidden="true" size={16} />
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-role-preview">
          <p>개발 화면 미리보기</p>
          <div>
            {appRoleOrder.map((previewRole) => {
              const preview = appRoleDefinitions[previewRole];
              return (
                <Link key={previewRole} href={preview.homeHref} aria-current={role === previewRole ? "page" : undefined}>
                  {preview.label}
                </Link>
              );
            })}
          </div>
          <small>운영 버전에서는 로그인한 역할만 표시됩니다.</small>
        </div>
      </aside>

      <main className={`app-main${layout === "conversation" ? " conversation-app-main" : ""}`}>
        <section
          className={layout === "conversation" ? "sr-only" : `page-heading${layout === "schedule" ? " schedule-page-heading" : ""}${layout === "home" ? " home-page-heading" : ""}`}
        >
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </section>
        {children}
      </main>
    </div>
  );
}
