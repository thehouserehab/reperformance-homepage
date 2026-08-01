export type AppRole = "student" | "coach" | "guardian";

export type GuardianPermissionKey = "attendance" | "contract" | "academics" | "practical";

export type GuardianPermissions = Record<GuardianPermissionKey, boolean>;

export type TaskKind = "study" | "training" | "recovery";

export type AppTask = {
  id: string;
  title: string;
  detail: string;
  kind: TaskKind;
  scheduledTime: string;
  durationMinutes: number;
  completed: boolean;
  assignedBy: "student" | "coach";
};

export type StudySession = {
  id: string;
  subject: string;
  goal: string;
  focusedMinutes: number;
  completedAt: string;
  status: "completed" | "stopped";
};

export type CalendarCategory = "study" | "training" | "exam" | "consultation" | "recovery";

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  category: CalendarCategory;
  source: "manual" | "assistant" | "coach";
  note?: string;
};

export type ConditionCheck = {
  energy: number;
  focus: number;
  soreness: number;
  checkedAt: string | null;
};

export type GuardianMessage = {
  id: string;
  body: string;
  sentAt: string;
  status: "received" | "sent";
};

export type AppState = {
  studentName: string;
  guardianPermissions: GuardianPermissions;
  tasks: AppTask[];
  studySessions: StudySession[];
  calendarEvents: CalendarEvent[];
  condition: ConditionCheck;
  guardianMessages: GuardianMessage[];
};
