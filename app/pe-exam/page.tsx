import type { Metadata } from "next";
import { WorkspaceShell } from "../_components/WorkspaceShell";

export const metadata: Metadata = {
  title: "체대입시 학생 시스템 | RePERFORMANCE",
  description: "체대입시 학생이 상담 후 이용할 관리 화면 구조를 안내하는 준비 중 shell입니다.",
};

const menuSections = [
  {
    title: "학생 관리",
    items: [
      { label: "홈", href: "#홈" },
      { label: "목표 대학", href: "#목표 대학 설정" },
      { label: "실기 기록", href: "#최근 실기 기록" },
      { label: "훈련 계획", href: "#이번 주 훈련 블록" },
      { label: "컨디션 체크", href: "#컨디션 체크" },
      { label: "입시 일정", href: "#확인할 입시 일정" },
      { label: "상담 메모", href: "#상담 메모" },
    ],
  },
  {
    title: "입시 자료",
    items: [
      { label: "모집요강", href: "#모집요강" },
      { label: "대학별 기준", href: "#대학별 기준" },
      { label: "종목별 기록표", href: "#종목별 기록표" },
    ],
  },
  {
    title: "시스템",
    items: [
      { label: "설정", href: "#설정" },
      { label: "로그인 안내", href: "#로그인 안내" },
    ],
  },
] as const;

const cards = [
  { label: "오늘의 준비 상태", title: "로그인 후 제공 예정", description: "오늘 확인할 운동 방향과 주의사항을 안내할 공간입니다." },
  { label: "목표 대학 설정", title: "상담 후 설정", description: "목표 대학과 전형 기준은 상담 후 학생별 화면에 연결됩니다." },
  { label: "최근 실기 기록", title: "기록 입력 전", description: "실제 기록처럼 보이는 샘플은 넣지 않고 구조만 표시합니다." },
  { label: "이번 주 훈련 블록", title: "준비 중", description: "운동 가능 시간과 우선순위에 따라 안내될 예정입니다." },
  { label: "확인할 입시 일정", title: "공개 정보 확인", description: "일정 확인은 공개 입시정보와 상담 내용을 바탕으로 연결합니다." },
];

const modules = [
  { label: "홈", title: "학생 홈", description: "목표, 기록, 훈련, 일정이 상담 후 연결될 시작 화면입니다." },
  { label: "컨디션 체크", title: "컨디션 체크", description: "통증이나 피로처럼 운동 전 확인할 상태를 쉬운 문장으로 정리할 예정입니다." },
  { label: "상담 메모", title: "상담 메모", description: "상담 후 안내받은 운동 방향과 주의사항을 확인하는 공간입니다." },
  { label: "모집요강", title: "모집요강", description: "대학별 공개 자료를 확인하고 상담 후 필요한 내용만 연결합니다." },
  { label: "대학별 기준", title: "대학별 기준", description: "지원 판단처럼 보이는 더미 정보 없이 기준 확인 구조만 둡니다." },
  { label: "종목별 기록표", title: "종목별 기록표", description: "기록표는 실제 학생 기록 없이 준비 중 상태로 표시합니다." },
  { label: "설정", title: "설정", description: "알림과 화면 설정은 추후 연결될 예정입니다." },
  { label: "로그인 안내", title: "로그인 안내", description: "로그인 기능은 새로 구현하지 않고, 계정 발급 후 이용하는 구조만 안내합니다." },
];

export default function PeExamShellPage() {
  return (
    <WorkspaceShell
      variant="pe"
      brandLabel="PE EXAM SYSTEM"
      eyebrow="STUDENT SHELL"
      title="체대입시 학생용 시스템을 준비 중입니다."
      description="목표 대학, 실기 기록, 훈련 계획, 컨디션 체크, 입시 일정을 상담 후 한곳에서 확인할 수 있도록 구조를 준비하고 있습니다."
      statusTitle="상담 후 연결 예정"
      statusText="로그인, DB, 외부 문서, 실제 학생 기록 저장 기능은 이번 단계에서 구현하지 않았습니다."
      menuSections={menuSections}
      backLink={{ href: "/services/pe-exam", label: "공개 페이지로 돌아가기" }}
      cards={cards}
      modules={modules}
    />
  );
}
