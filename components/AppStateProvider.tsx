"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultAppState } from "@/lib/demoData";
import type {
  AppState,
  CalendarEvent,
  ConditionCheck,
  GuardianMessage,
  GuardianPermissionKey,
  StudySession,
} from "@/lib/types";

const STORAGE_KEY = "rp-app-prototype-state-v1";

type AppStateContextValue = {
  state: AppState;
  hydrated: boolean;
  toggleTask: (taskId: string) => void;
  updateCondition: (condition: Omit<ConditionCheck, "checkedAt">) => void;
  setGuardianPermission: (key: GuardianPermissionKey, value: boolean) => void;
  addStudySession: (session: StudySession) => void;
  addCalendarEvent: (event: CalendarEvent) => void;
  sendGuardianMessage: (body: string) => void;
  resetPrototype: () => void;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultAppState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setState(JSON.parse(saved) as AppState);
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

  const resetPrototype = useCallback(() => {
    setState(defaultAppState);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      state,
      hydrated,
      toggleTask,
      updateCondition,
      setGuardianPermission,
      addStudySession,
      addCalendarEvent,
      sendGuardianMessage,
      resetPrototype,
    }),
    [
      state,
      hydrated,
      toggleTask,
      updateCondition,
      setGuardianPermission,
      addStudySession,
      addCalendarEvent,
      sendGuardianMessage,
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
