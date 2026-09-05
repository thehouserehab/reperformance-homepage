"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { alignAppStateWithToday, getKoreanTodayDateKey } from "@/lib/appDates";
import { createDefaultAppStateForDate, createEmptyAppStateForDate, defaultAppState } from "@/lib/demoData";
import {
  clearStoredMessageAttachments,
  isMessageAttachmentMetadataValid,
  reconcileStoredMessageAttachments,
} from "@/lib/messageAttachments";
import {
  PROTOTYPE_STATE_STORAGE_KEY,
  clearPrototypeSessionData,
  persistPrototypeStateMutation,
  removePrototypeState,
  writePrototypeState,
  type PrototypeDataClearResult,
} from "@/lib/prototypeDataLifecycle";
import { validateManualRecordInput, validateRecordItemInput } from "@/lib/recordValidation";
import type {
  AppState,
  AppTask,
  AssistantConversationAction,
  AssistantConversationMessage,
  AssistantConversationSender,
  CalendarEvent,
  CoachConversationAttachment,
  CoachConversationMessage,
  ConditionCheck,
  ConversationParticipant,
  GuardianMessage,
  GuardianPermissionKey,
  RecordCategory,
  RecordDirection,
  StudentRecordEntry,
  StudentRecordItem,
  StudySession,
} from "@/lib/types";

function restoreConversation(messages: unknown): CoachConversationMessage[] {
  if (!Array.isArray(messages)) return defaultAppState.coachConversation;

  return messages
    .filter((message): message is Partial<CoachConversationMessage> => Boolean(message && typeof message === "object"))
    .map((message) => ({
      id: typeof message.id === "string" ? message.id : crypto.randomUUID(),
      sender: message.sender === "coach" ? "coach" : "student",
      body: typeof message.body === "string" ? message.body : "",
      sentAt: typeof message.sentAt === "string" ? message.sentAt : new Date().toISOString(),
      aiAssisted: message.aiAssisted === true,
      attachments: Array.isArray(message.attachments)
        ? message.attachments.filter(isMessageAttachmentMetadataValid)
        : [],
    }));
}

function restoreAssistantConversation(messages: unknown): AssistantConversationMessage[] {
  if (!Array.isArray(messages)) return defaultAppState.assistantConversation;

  return messages
    .filter((message): message is Partial<AssistantConversationMessage> => Boolean(message && typeof message === "object"))
    .map((message) => ({
      id: typeof message.id === "string" ? message.id : crypto.randomUUID(),
      sender: message.sender === "assistant" ? "assistant" : ("user" as AssistantConversationSender),
      body: typeof message.body === "string" ? message.body : "",
      sentAt: typeof message.sentAt === "string" ? message.sentAt : new Date().toISOString(),
      action:
        message.action === "handoff-coach" || message.action === "calendar-added"
          ? (message.action as AssistantConversationAction)
          : undefined,
      handoffPrompt: typeof message.handoffPrompt === "string" ? message.handoffPrompt : undefined,
    }));
}

function restoreRecordItems(items: unknown) {
  const restoredItems = defaultAppState.recordItems.map((item) => ({ ...item }));
  const reservedIds = new Set(restoredItems.map((item) => item.id));
  if (!Array.isArray(items)) return restoredItems;

  for (const candidate of items) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Partial<StudentRecordItem>;
    if (
      typeof item.id !== "string" ||
      reservedIds.has(item.id) ||
      (item.category !== "study" && item.category !== "training" && item.category !== "condition") ||
      typeof item.name !== "string" ||
      typeof item.suggestedUnit !== "string" ||
      item.createdBy !== "student" ||
      item.active !== true
    ) {
      continue;
    }

    // Items saved before pbDirection existed default to "higher" so older custom
    // record items survive this change instead of being silently dropped.
    const pbDirection = item.pbDirection === "lower" ? "lower" : "higher";

    const validation = validateRecordItemInput(
      {
        category: item.category,
        name: item.name,
        suggestedUnit: item.suggestedUnit,
        pbDirection,
      },
      restoredItems
    );
    if (!validation.ok) continue;

    restoredItems.push({
      id: item.id,
      ...validation.value,
      createdBy: "student",
      active: true,
    });
    reservedIds.add(item.id);
  }

  return restoredItems;
}

function restoreStudentRecords(records: unknown, items: StudentRecordItem[]) {
  if (!Array.isArray(records)) return defaultAppState.studentRecords;

  return records
    .filter((record): record is Partial<StudentRecordEntry> => Boolean(record && typeof record === "object"))
    .map((record) => {
      const category: RecordCategory = record.category === "training" || record.category === "condition"
        ? record.category
        : "study";
      const source = record.source === "timer" || record.source === "coach" || record.source === "check-in"
        ? record.source
        : "manual";
      const restored: Omit<StudentRecordEntry, "validationStatus"> = {
        id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
        itemId: typeof record.itemId === "string" ? record.itemId : "",
        category,
        value: typeof record.value === "string" ? record.value : "",
        unit: typeof record.unit === "string" ? record.unit : "",
        note: typeof record.note === "string" ? record.note : "",
        recordedAt: typeof record.recordedAt === "string" ? record.recordedAt : "",
        source,
      };
      const item = items.find((candidate) => candidate.id === restored.itemId);
      const validation = validateManualRecordInput(restored, item);

      return {
        ...restored,
        validationStatus: validation.ok ? "valid" as const : "needs_review" as const,
      };
    });
}

function restoreState(saved: string): AppState {
  const parsed = JSON.parse(saved) as Partial<AppState>;
  const restoredTasks = Array.isArray(parsed.tasks)
    ? parsed.tasks.map((task) => ({
        ...task,
        scheduledDate:
          typeof task.scheduledDate === "string" && task.scheduledDate.length > 0
            ? task.scheduledDate
            : defaultAppState.scheduleDate,
      }))
    : defaultAppState.tasks;
  const restoredRecordItems = restoreRecordItems(parsed.recordItems);

  return {
    ...defaultAppState,
    ...parsed,
    scheduleDate:
      typeof parsed.scheduleDate === "string" && parsed.scheduleDate.length > 0
        ? parsed.scheduleDate
        : defaultAppState.scheduleDate,
    guardianPermissions: {
      ...defaultAppState.guardianPermissions,
      ...parsed.guardianPermissions,
    },
    tasks: restoredTasks,
    studySessions: Array.isArray(parsed.studySessions) ? parsed.studySessions : defaultAppState.studySessions,
    recordItems: restoredRecordItems,
    studentRecords: restoreStudentRecords(parsed.studentRecords, restoredRecordItems),
    calendarEvents: Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : defaultAppState.calendarEvents,
    guardianMessages: Array.isArray(parsed.guardianMessages) ? parsed.guardianMessages : defaultAppState.guardianMessages,
    coachConversation: restoreConversation(parsed.coachConversation),
    assistantConversation: restoreAssistantConversation(parsed.assistantConversation),
  };
}

function restoreStateForToday(saved: string, todayDateKey: string) {
  return alignAppStateWithToday(restoreState(saved), todayDateKey);
}

function removeStoredPrototypeState() {
  try {
    return removePrototypeState(window.localStorage);
  } catch {
    // 저장소가 차단된 환경에서도 앱의 메모리 상태는 계속 사용할 수 있다.
    return false;
  }
}

type AppStateContextValue = {
  state: AppState;
  hydrated: boolean;
  persistenceIssue: boolean;
  toggleTask: (taskId: string) => boolean;
  addTask: (task: Omit<AppTask, "id" | "completed">) => boolean;
  deleteTask: (taskId: string) => boolean;
  updateCondition: (condition: Omit<ConditionCheck, "checkedAt">) => boolean;
  setGuardianPermission: (key: GuardianPermissionKey, value: boolean) => boolean;
  addStudySession: (session: StudySession) => boolean;
  addRecordItem: (item: {
    category: RecordCategory;
    name: string;
    suggestedUnit: string;
    pbDirection: RecordDirection;
  }) => string | null;
  addStudentRecord: (record: Omit<StudentRecordEntry, "id" | "source" | "validationStatus">) => boolean;
  addCalendarEvent: (event: CalendarEvent) => boolean;
  deleteCalendarEvent: (eventId: string) => boolean;
  sendGuardianMessage: (body: string) => boolean;
  sendCoachConversationMessage: (
    sender: ConversationParticipant,
    body: string,
    aiAssisted: boolean,
    attachments: CoachConversationAttachment[]
  ) => boolean;
  sendAssistantMessage: (
    sender: AssistantConversationSender,
    body: string,
    options?: { action?: AssistantConversationAction; handoffPrompt?: string }
  ) => boolean;
  clearPrototypeData: () => Promise<PrototypeDataClearResult>;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => defaultAppState);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceIssue, setPersistenceIssue] = useState(false);
  const stateRef = useRef(state);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const todayDateKey = getKoreanTodayDateKey();
      let restoredState: AppState;

      try {
        const saved = window.localStorage.getItem(PROTOTYPE_STATE_STORAGE_KEY);
        restoredState = saved
          ? restoreStateForToday(saved, todayDateKey)
          : createDefaultAppStateForDate(todayDateKey);
      } catch {
        removeStoredPrototypeState();
        restoredState = createDefaultAppStateForDate(todayDateKey);
      }

      if (!active) return;
      stateRef.current = restoredState;
      setState(restoredState);

      const initialStatePersisted = writePrototypeState(window.localStorage, restoredState);
      setPersistenceIssue(!initialStatePersisted);

      const referencedStorageKeys = restoredState.coachConversation.flatMap((message) =>
        message.attachments.map((attachment) => attachment.storageKey)
      );
      try {
        await reconcileStoredMessageAttachments(referencedStorageKeys);
      } catch {
        // 정리 실패는 기존 메시지 사용을 막지 않으며 다음 시작 또는 기기 데이터 삭제에서 재시도한다.
      }

      if (active) {
        hydratedRef.current = true;
        setHydrated(true);
      }
    };

    void hydrate();
    return () => {
      active = false;
      hydratedRef.current = false;
    };
  }, []);

  const commitState = useCallback((mutate: (current: AppState) => AppState) => {
    if (!hydratedRef.current) return false;

    const result = persistPrototypeStateMutation(window.localStorage, stateRef.current, mutate);
    if (result.status === "storage_failed") {
      setPersistenceIssue(true);
      return false;
    }
    if (result.status === "unchanged") return false;

    stateRef.current = result.state;
    setState(result.state);
    setPersistenceIssue(false);
    return true;
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    return commitState((current) => {
      if (!current.tasks.some((task) => task.id === taskId)) return current;
      return {
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        ),
      };
    });
  }, [commitState]);

  const addTask = useCallback((task: Omit<AppTask, "id" | "completed">) => {
    const nextTask: AppTask = {
      ...task,
      id: crypto.randomUUID(),
      completed: false,
    };
    return commitState((current) => ({
      ...current,
      tasks: [...current.tasks, nextTask],
    }));
  }, [commitState]);

  const deleteTask = useCallback((taskId: string) => {
    return commitState((current) => {
      if (!current.tasks.some((task) => task.id === taskId)) return current;
      return {
        ...current,
        tasks: current.tasks.filter((task) => task.id !== taskId),
      };
    });
  }, [commitState]);

  const updateCondition = useCallback((condition: Omit<ConditionCheck, "checkedAt">) => {
    const checkedAt = new Date().toISOString();
    const conditionRecords: StudentRecordEntry[] = [
      ["record-item-condition-energy", condition.energy],
      ["record-item-condition-focus", condition.focus],
      ["record-item-condition-soreness", condition.soreness],
    ].map(([itemId, value]) => ({
      id: crypto.randomUUID(),
      itemId: String(itemId),
      category: "condition",
      value: String(value),
      unit: "/5",
      note: "오늘 상태 저장에서 기록",
      recordedAt: checkedAt,
      source: "check-in",
      validationStatus: "valid",
    }));

    return commitState((current) => ({
      ...current,
      condition: { ...condition, checkedAt },
      studentRecords: [...conditionRecords, ...current.studentRecords],
    }));
  }, [commitState]);

  const setGuardianPermission = useCallback((key: GuardianPermissionKey, value: boolean) => {
    return commitState((current) => {
      if (current.guardianPermissions[key] === value) return current;
      return {
        ...current,
        guardianPermissions: { ...current.guardianPermissions, [key]: value },
      };
    });
  }, [commitState]);

  const addStudySession = useCallback((session: StudySession) => {
    const record: StudentRecordEntry = {
      id: crypto.randomUUID(),
      itemId: "record-item-study-focus",
      category: "study",
      value: String(session.focusedMinutes),
      unit: "분",
      note: `${session.subject} · ${session.goal}`,
      recordedAt: session.completedAt,
      source: "timer",
      validationStatus: "valid",
    };
    return commitState((current) => ({
      ...current,
      studySessions: [session, ...current.studySessions],
      studentRecords: [record, ...current.studentRecords],
    }));
  }, [commitState]);

  const addRecordItem = useCallback((item: {
    category: RecordCategory;
    name: string;
    suggestedUnit: string;
    pbDirection: RecordDirection;
  }) => {
    const initialValidation = validateRecordItemInput(item);
    if (!initialValidation.ok) return null;

    const id = crypto.randomUUID();
    const saved = commitState((current) => {
      const validation = validateRecordItemInput(item, current.recordItems);
      if (!validation.ok) return current;

      const nextItem: StudentRecordItem = {
        id,
        ...validation.value,
        createdBy: "student",
        active: true,
      };
      return {
        ...current,
        recordItems: [...current.recordItems, nextItem],
      };
    });
    return saved ? id : null;
  }, [commitState]);

  const addStudentRecord = useCallback((record: Omit<StudentRecordEntry, "id" | "source" | "validationStatus">) => {
    return commitState((current) => {
      const item = current.recordItems.find((candidate) => candidate.id === record.itemId);
      const validation = validateManualRecordInput(record, item);
      if (!validation.ok) return current;

      const nextRecord: StudentRecordEntry = {
        ...validation.value,
        id: crypto.randomUUID(),
        source: "manual",
        validationStatus: "valid",
      };
      return {
        ...current,
        studentRecords: [nextRecord, ...current.studentRecords],
      };
    });
  }, [commitState]);

  const addCalendarEvent = useCallback((event: CalendarEvent) => {
    return commitState((current) => ({
      ...current,
      calendarEvents: [...current.calendarEvents, event].sort((a, b) =>
        a.startsAt.localeCompare(b.startsAt)
      ),
    }));
  }, [commitState]);

  const deleteCalendarEvent = useCallback((eventId: string) => {
    return commitState((current) => {
      if (!current.calendarEvents.some((event) => event.id === eventId)) return current;
      return {
        ...current,
        calendarEvents: current.calendarEvents.filter((event) => event.id !== eventId),
      };
    });
  }, [commitState]);

  const sendGuardianMessage = useCallback((body: string) => {
    const message: GuardianMessage = {
      id: crypto.randomUUID(),
      body,
      sentAt: new Date().toISOString(),
      status: "sent",
    };
    return commitState((current) => ({
      ...current,
      guardianMessages: [...current.guardianMessages, message],
    }));
  }, [commitState]);

  const sendCoachConversationMessage = useCallback(
    (
      sender: ConversationParticipant,
      body: string,
      aiAssisted: boolean,
      attachments: CoachConversationAttachment[]
    ) => {
      const message: CoachConversationMessage = {
        id: crypto.randomUUID(),
        sender,
        body,
        sentAt: new Date().toISOString(),
        aiAssisted,
        attachments,
      };

      return commitState((current) => ({
        ...current,
        coachConversation: [...current.coachConversation, message],
      }));
    },
    [commitState]
  );

  const sendAssistantMessage = useCallback(
    (
      sender: AssistantConversationSender,
      body: string,
      options?: { action?: AssistantConversationAction; handoffPrompt?: string }
    ) => {
      const message: AssistantConversationMessage = {
        id: crypto.randomUUID(),
        sender,
        body,
        sentAt: new Date().toISOString(),
        action: options?.action,
        handoffPrompt: options?.handoffPrompt,
      };

      return commitState((current) => ({
        ...current,
        assistantConversation: [...current.assistantConversation, message],
      }));
    },
    [commitState]
  );

  const clearPrototypeData = useCallback(async (): Promise<PrototypeDataClearResult> => {
    const emptyState = createEmptyAppStateForDate(getKoreanTodayDateKey());
    let stateCleared = false;

    try {
      stateCleared = writePrototypeState(window.localStorage, emptyState);
    } catch {
      stateCleared = false;
    }

    if (!stateCleared) {
      setPersistenceIssue(true);
      return { stateCleared: false, failedScopes: ["state"] };
    }

    stateRef.current = emptyState;
    setState(emptyState);
    setPersistenceIssue(false);
    const failedScopes: PrototypeDataClearResult["failedScopes"] = [];

    try {
      if (!clearPrototypeSessionData(window.sessionStorage)) failedScopes.push("session");
    } catch {
      failedScopes.push("session");
    }

    try {
      await clearStoredMessageAttachments();
    } catch {
      failedScopes.push("attachments");
    }

    return { stateCleared: true, failedScopes };
  }, []);

  const value = useMemo(
    () => ({
      state,
      hydrated,
      persistenceIssue,
      toggleTask,
      addTask,
      deleteTask,
      updateCondition,
      setGuardianPermission,
      addStudySession,
      addRecordItem,
      addStudentRecord,
      addCalendarEvent,
      deleteCalendarEvent,
      sendGuardianMessage,
      sendCoachConversationMessage,
      sendAssistantMessage,
      clearPrototypeData,
    }),
    [
      state,
      hydrated,
      persistenceIssue,
      toggleTask,
      addTask,
      deleteTask,
      updateCondition,
      setGuardianPermission,
      addStudySession,
      addRecordItem,
      addStudentRecord,
      addCalendarEvent,
      deleteCalendarEvent,
      sendGuardianMessage,
      sendCoachConversationMessage,
      sendAssistantMessage,
      clearPrototypeData,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside AppStateProvider");
  return context;
}
