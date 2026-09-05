import type { AppRole } from "./types";

export type NavigationIconName =
  | "home"
  | "calendar"
  | "timer"
  | "records"
  | "consultation"
  | "messages"
  | "students"
  | "guardian"
  | "operations"
  | "relations"
  | "ai"
  | "audit"
  | "privacy"
  | "mypage";

export type AppNavigationItem = {
  href: string;
  label: string;
  icon: NavigationIconName;
  match: "exact" | "prefix";
};

export type AppRoleDefinition = {
  label: string;
  homeHref: string;
  navigation: AppNavigationItem[];
};

export const appRoleOrder: AppRole[] = ["student", "coach", "guardian", "admin"];

export const appRoleDefinitions: Record<AppRole, AppRoleDefinition> = {
  student: {
    label: "학생",
    homeHref: "/student",
    navigation: [
      { href: "/student", label: "오늘", icon: "home", match: "exact" },
      { href: "/calendar", label: "캘린더", icon: "calendar", match: "exact" },
      { href: "/student/assistant", label: "AI 어시스턴트", icon: "ai", match: "prefix" },
      { href: "/student/messages", label: "코치 대화", icon: "messages", match: "prefix" },
      { href: "/student/privacy", label: "마이페이지", icon: "mypage", match: "prefix" },
      { href: "/student/records", label: "기록", icon: "records", match: "prefix" },
      { href: "/student/consultation", label: "상담", icon: "consultation", match: "prefix" },
    ],
  },
  coach: {
    label: "강사",
    homeHref: "/coach",
    navigation: [
      { href: "/coach", label: "학생", icon: "students", match: "exact" },
      { href: "/coach/records", label: "기록", icon: "records", match: "prefix" },
      { href: "/coach/messages", label: "대화", icon: "messages", match: "prefix" },
      { href: "/coach/calendar", label: "일정", icon: "calendar", match: "prefix" },
    ],
  },
  guardian: {
    label: "학부모",
    homeHref: "/guardian",
    navigation: [
      { href: "/guardian", label: "문의", icon: "guardian", match: "exact" },
      { href: "/guardian/summary", label: "공개 요약", icon: "records", match: "prefix" },
    ],
  },
  admin: {
    label: "관리자",
    homeHref: "/admin",
    navigation: [
      { href: "/admin", label: "운영", icon: "operations", match: "exact" },
      { href: "/admin/relations", label: "관계", icon: "relations", match: "prefix" },
      { href: "/admin/ai", label: "AI", icon: "ai", match: "prefix" },
      { href: "/admin/audit", label: "감사", icon: "audit", match: "prefix" },
    ],
  },
};
