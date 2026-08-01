import type { AppState } from "./types";

export const defaultAppState: AppState = {
  studentName: "김도윤",
  guardianPermissions: {
    attendance: false,
    contract: false,
    academics: false,
    practical: false,
  },
  tasks: [
    {
      id: "task-study-english",
      title: "영어 독해 2지문",
      detail: "완벽하게 풀기보다 오답 이유 한 줄만 남기기",
      kind: "study",
      scheduledTime: "16:30",
      durationMinutes: 35,
      completed: false,
      assignedBy: "student",
    },
    {
      id: "task-training-jump",
      title: "제멀 리듬 훈련",
      detail: "5회 3세트 · 무릎 불편 시 바로 중단",
      kind: "training",
      scheduledTime: "19:00",
      durationMinutes: 50,
      completed: false,
      assignedBy: "coach",
    },
    {
      id: "task-recovery",
      title: "하체 회복 루틴",
      detail: "호흡과 가벼운 가동성 12분",
      kind: "recovery",
      scheduledTime: "21:20",
      durationMinutes: 12,
      completed: false,
      assignedBy: "coach",
    },
  ],
  studySessions: [],
  calendarEvents: [
    {
      id: "event-training",
      title: "체대입시 실기 수업",
      startsAt: "2026-08-01T19:00:00+09:00",
      endsAt: "2026-08-01T20:20:00+09:00",
      category: "training",
      source: "coach",
      note: "제멀·10m 왕복달리기",
    },
    {
      id: "event-mock-exam",
      title: "8월 모의평가",
      startsAt: "2026-08-05T08:30:00+09:00",
      endsAt: "2026-08-05T16:30:00+09:00",
      category: "exam",
      source: "manual",
    },
  ],
  condition: {
    energy: 3,
    focus: 3,
    soreness: 2,
    checkedAt: null,
  },
  guardianMessages: [
    {
      id: "message-coach-1",
      body: "이번 주 훈련 일정 문의가 있으면 이곳에 남겨주세요.",
      sentAt: "2026-08-01T09:00:00+09:00",
      status: "received",
    },
  ],
  coachConversation: [
    {
      id: "coach-conversation-1",
      sender: "coach",
      body: "도윤 학생, 오늘 제자리멀리뛰기는 기록보다 착지 균형을 먼저 확인하겠습니다.",
      sentAt: "2026-08-01T10:10:00+09:00",
      aiAssisted: false,
    },
    {
      id: "coach-conversation-2",
      sender: "student",
      body: "네, 오른쪽 무릎이 조금 뻐근한데 워밍업 후 상태도 같이 말씀드릴게요.",
      sentAt: "2026-08-01T10:14:00+09:00",
      aiAssisted: false,
    },
  ],
};
