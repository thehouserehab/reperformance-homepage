import type { Metadata } from "next";
import { MemberWorkspaceDashboard } from "../_components/MemberWorkspaceDashboard";
import { WorkspaceShell } from "../_components/WorkspaceShell";
import type { WorkspaceConfig } from "../_components/workspaceTypes";

export const metadata: Metadata = {
  title: "회원 관리 | RePERFORMANCE",
  description: "RePERFORMANCE 일반 회원 관리 화면의 준비 중 shell입니다.",
  robots: { index: false, follow: false },
};

const memberConfig: WorkspaceConfig = {
  audienceLabel: "MEMBER PROFILE",
  memberName: "회원-0001",
  memberId: "M-0001",
  status: "로그인 후 제공 예정",
  summary: "상담 후 회원의 목표, 수업 일정, 운동 기록을 한 흐름으로 확인합니다.",
  highlights: [
    { label: "회원 유형", value: "상담 후 입력 예정" },
    { label: "담당 코치", value: "상담 후 연결 예정" },
    { label: "잔여 횟수", value: "상담 후 입력 예정" },
    { label: "계약 상태", value: "상담 후 안내 예정" },
  ],
  infoGroups: [
    {
      title: "기본 회원 정보",
      values: [
        { label: "생년월일", value: "상담 후 입력 예정" },
        { label: "전화번호", value: "010-****-1234" },
        { label: "키", value: "상담 후 입력 예정" },
        { label: "체중", value: "상담 후 입력 예정" },
        { label: "이메일", value: "로그인 후 제공 예정" },
        { label: "회원 상태", value: "상담 후 연결 예정" },
      ],
    },
    {
      title: "수업 및 계약 안내",
      values: [
        { label: "시작일", value: "상담 후 입력 예정" },
        { label: "만료일", value: "상담 후 입력 예정" },
        { label: "다음 수업일", value: "상담 후 안내 예정" },
        { label: "최근 평가일", value: "상담 후 입력 예정" },
        { label: "회원권 관리", value: "로그인 후 제공 예정" },
        { label: "계약 보기", value: "로그인 후 제공 예정" },
      ],
    },
  ],
  nutritionGoals: [
    { label: "총 칼로리", value: "상담 후 입력 예정", unit: "kcal" },
    { label: "탄수화물", value: "상담 후 입력 예정", unit: "g" },
    { label: "단백질", value: "상담 후 입력 예정", unit: "g" },
    { label: "지방", value: "상담 후 입력 예정", unit: "g" },
  ],
  nutritionNote: "영양 목표와 탄단지 비율은 상담 후 생활 패턴에 맞춰 안내합니다.",
  focusCards: [
    { title: "현재 목표", text: "상담 후 현재 목표를 함께 정리합니다." },
    { title: "운동 주의사항", text: "운동 전 확인 항목을 바탕으로 상담 후 안내합니다." },
    { title: "움직임 제한", text: "불편한 움직임과 제한사항은 상담 후 확인 예정입니다." },
  ],
  tabs: ["수업", "평가", "운동기록", "개인운동", "식단", "인바디", "추적", "메모", "계약"],
  emptyRecordDescription: "항목은 로그인과 상담 후 제공 예정입니다.",
};

export default function MemberPage() {
  return (
    <WorkspaceShell sectionLabel="일반 회원 관리">
      <MemberWorkspaceDashboard config={memberConfig} />
    </WorkspaceShell>
  );
}
