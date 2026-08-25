export type AppRole = "student" | "coach" | "guardian" | "admin";

export type GuardianPermissionKey = "attendance" | "contract" | "academics" | "practical";

export type GuardianPermissions = Record<GuardianPermissionKey, boolean>;

export type TaskKind = "study" | "training" | "recovery";

export type AppTask = {
  id: string;
  title: string;
  detail: string;
  kind: TaskKind;
  scheduledDate: string;
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

export type RecordCategory = "study" | "training" | "condition";

export type RecordEntrySource = "manual" | "timer" | "coach" | "check-in";

export type StudentRecordItem = {
  id: string;
  category: RecordCategory;
  name: string;
  suggestedUnit: string;
  createdBy: "system" | "student";
  active: boolean;
};

export type StudentRecordEntry = {
  id: string;
  itemId: string;
  category: RecordCategory;
  value: string;
  unit: string;
  note: string;
  recordedAt: string;
  source: RecordEntrySource;
  validationStatus: "valid" | "needs_review";
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

export type ConversationParticipant = "student" | "coach";

export type MessageAttachmentKind = "image" | "video";

export type CoachConversationAttachment = {
  id: string;
  kind: MessageAttachmentKind;
  fileName: string;
  mimeType: string;
  byteSize: number;
  storageKey: string;
  createdAt: string;
};

export type CoachConversationMessage = {
  id: string;
  sender: ConversationParticipant;
  body: string;
  sentAt: string;
  aiAssisted: boolean;
  attachments: CoachConversationAttachment[];
};

export type AppState = {
  studentName: string;
  scheduleDate: string;
  guardianPermissions: GuardianPermissions;
  tasks: AppTask[];
  studySessions: StudySession[];
  recordItems: StudentRecordItem[];
  studentRecords: StudentRecordEntry[];
  calendarEvents: CalendarEvent[];
  condition: ConditionCheck;
  guardianMessages: GuardianMessage[];
  coachConversation: CoachConversationMessage[];
};
