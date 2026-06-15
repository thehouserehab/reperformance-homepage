import type { Metadata } from "next";
import { WorkspaceShell } from "../_components/WorkspaceShell";

export const metadata: Metadata = {
  title: "회원 시스템 | RePERFORMANCE",
  description: "일반 회원이 상담 후 이용할 개인 화면 구조를 안내하는 준비 중 shell입니다.",
};

const menuSections = [
  {
    title: "내 관리",
    items: [
      { label: "홈", href: "#홈" },
      { label: "내 목표", href: "#현재 목표" },
      { label: "수업 일정", href: "#다음 수업" },
      { label: "운동 기록", href: "#운동 기록" },
      { label: "컨디션 체크", href: "#컨디션 체크" },
      { label: "상담 메모", href: "#최근 피드백" },
    ],
  },
  {
    title: "프로그램",
    items: [
      { label: "현재 프로그램", href: "#현재 프로그램" },
      { label: "숙제 운동", href: "#이번 주 숙제 운동" },
      { label: "진행 리포트", href: "#진행 리포트" },
    ],
  },
  {
    title: "계정",
    items: [
      { label: "로그인 안내", href: "#로그인 안내" },
      { label: "설정", href: "#설정" },
    ],
  },
] as const;

const cards = [
  { label: "현재 목표", title: "상담 후 설정", description: "상담에서 정한 운동 방향과 우선순위를 표시할 예정입니다." },
  { label: "다음 수업", title: "로그인 후 제공 예정", description: "계정 발급 후 예약된 수업과 다음 방문 일정을 확인합니다." },
  { label: "이번 주 숙제 운동", title: "상담 후 연결 예정", description: "집에서 확인할 운동 안내는 개인 화면에서 제공합니다." },
  { label: "최근 피드백", title: "준비 중", description: "수업 후 공유할 주의사항과 운동 방향을 모아둘 예정입니다." },
  { label: "상담 후 제공 예정 기능 안내", title: "개인 화면 준비 중", description: "실제 회원 정보나 기록은 저장하지 않은 안내용 화면입니다." },
];

const modules = [
  { label: "홈", title: "회원 홈", description: "상담 후 연결될 개인 화면의 시작 지점입니다." },
  { label: "운동 기록", title: "운동 기록", description: "수업별 운동 내용은 계정 발급 후 개인 화면에서 확인할 예정입니다." },
  { label: "컨디션 체크", title: "컨디션 체크", description: "통증, 피로, 수면 같은 상태는 상담 후 안내된 방식으로 확인합니다." },
  { label: "현재 프로그램", title: "현재 프로그램", description: "목표와 몸 상태에 맞춘 운동 방향을 정리할 공간입니다." },
  { label: "진행 리포트", title: "진행 리포트", description: "진행 상황은 상담 후 제공되는 화면에서 이해하기 쉽게 정리합니다." },
  { label: "로그인 안내", title: "로그인 안내", description: "로그인 기능은 새로 구현하지 않고, 계정 발급 후 이용하는 구조만 안내합니다." },
  { label: "설정", title: "설정", description: "알림과 화면 설정은 추후 연결될 예정입니다." },
];

export default function MemberShellPage() {
  return (
    <WorkspaceShell
      variant="member"
      brandLabel="MEMBER SYSTEM"
      eyebrow="MEMBER SHELL"
      title="일반 회원용 개인 화면을 준비 중입니다."
      description="목표, 수업 일정, 운동 기록, 컨디션 체크, 상담 메모를 상담 후 한곳에서 확인할 수 있도록 구조를 준비하고 있습니다."
      statusTitle="상담 후 연결 예정"
      statusText="로그인, DB, 외부 문서, 실제 회원 정보 저장 기능은 이번 단계에서 구현하지 않았습니다."
      menuSections={menuSections}
      backLink={{ href: "/apply", label: "상담 신청으로 이동" }}
      cards={cards}
      modules={modules}
    />
  );
}
