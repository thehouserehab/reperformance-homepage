"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultAppState } from "@/lib/demoData";
import type {
  AppState,
  AppTask,
  CalendarEvent,
  CoachConversationMessage,
  ConditionCheck,
  ConversationParticipant,
  GuardianMessage,
  GuardianPermissionKey,
  StudySession,
} from "@/lib/types";

const STORAGE_KEY = "rp-app-prototype-state-v1";

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
    calendarEvents: Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : defaultAppState.calendarEvents,
    guardianMessages: Array.isArray(parsed.guardianMessages) ? parsed.guardianMessages : defaultAppState.guardianMessages,
    coachConversation: Array.isArray(parsed.coachConversation)
      ? parsed.coachConversation
      : defaultAppState.coachConversation,
  };
}

type AppStateContextValue = {
  state: AppState;
  hydrated: boolean;
  toggleTask: (taskId: string) => void;
  addTask: (task: Omit<AppTask, "id" | "completed">) => void;
  deleteTask: (taskId: string) => void;
  updateCondition: (condition: Omit<ConditionCheck, "checkedAt">) => void;
  setGuardianPermission: (key: GuardianPermissionKey, value: boolean) => void;
  addStudySession: (session: StudySession) => void;
  addCalendarEvent: (event: CalendarEvent) => void;
  sendGuardianMessage: (body: string) => void;
  sendCoachConversationMessage: (
    sender: ConversationParticipant,
    body: string,
    aiAssisted: boolean
  ) => void;
  resetPrototype: () => void;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultAppState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setState(restoreState(saved));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const toggleTask = useCallback((taskId: string) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      ),
    }));
  }, []);

  const addTask = useCallback((task: Omit<AppTask, "id" | "completed">) => {
    const nextTask: AppTask = {
      ...task,
      id: crypto.randomUUID(),
      completed: false,
    };
    setState((current) => ({
      ...current,
      tasks: [...current.tasks, nextTask],
    }));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
    }));
  }, []);

  const updateCondition = useCallback((condition: Omit<ConditionCheck, "checkedAt">) => {
    setState((current) => ({
      ...current,
      condition: { ...condition, checkedAt: new Date().toISOString() },
    }));
  }, []);

  const setGuardianPermission = useCallback((key: GuardianPermissionKey, value: boolean) => {
    setState((current) => ({
      ...current,
      guardianPermissions: { ...current.guardianPermissions, [key]: value },
    }));
  }, []);

  const addStudySession = useCallback((session: StudySession) => {
    setState((current) => ({ ...current, studySessions: [session, ...current.studySessions] }));
  }, []);

  const addCalendarEvent = useCallback((event: CalendarEvent) => {
    setState((current) => ({
      ...current,
      calendarEvents: [...current.calendarEvents, event].sort((a, b) =>
        a.startsAt.localeCompare(b.startsAt)
      ),
    }));
  }, []);

  const sendGuardianMessage = useCallback((body: string) => {
    const message: GuardianMessage = {
      id: crypto.randomUUID(),
      body,
      sentAt: new Date().toISOString(),
      status: "sent",
    };
    setState((current) => ({
      ...current,
      guardianMessages: [...current.guardianMessages, message],
    }));
  }, []);

  const sendCoachConversationMessage = useCallback(
    (sender: ConversationParticipant, body: string, aiAssisted: boolean) => {
      const message: CoachConversationMessage = {
        id: crypto.randomUUID(),
        sender,
        body,
        sentAt: new Date().toISOString(),
        aiAssisted,
      };

      setState((current) => ({
        ...current,
        coachConversation: [...current.coachConversation, message],
      }));
    },
    []
  );

  const resetPrototype = useCallback(() => {
    setState(defaultAppState);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      state,
      hydrated,
      toggleTask,
      addTask,
      deleteTask,
      updateCondition,
      setGuardianPermission,
      addStudySession,
      addCalendarEvent,
      sendGuardianMessage,
      sendCoachConversationMessage,
      resetPrototype,
    }),
    [
      state,
      hydrated,
      toggleTask,
      addTask,
      deleteTask,
      updateCondition,
      setGuardianPermission,
      addStudySession,
      addCalendarEvent,
      sendGuardianMessage,
      sendCoachConversationMessage,
      resetPrototype,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside AppStateProvider");
  return context;
}
