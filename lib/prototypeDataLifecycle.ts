import type { AppState } from "./types";

export const PROTOTYPE_STATE_STORAGE_KEY = "rp-app-prototype-state-v1";

export const PROTOTYPE_SESSION_STORAGE_KEYS = [
  "rp-app-calendar-assistant-request",
  "rp-app-calendar-assistant-autosave",
  "rp-app-coach-message-draft",
  "rp-app-coach-message-mode",
] as const;

type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

export type PrototypeStateMutationResult =
  | { status: "saved"; state: AppState }
  | { status: "unchanged"; state: AppState }
  | { status: "storage_failed"; state: AppState };

export type PrototypeDataSummary = {
  tasksAndEvents: number;
  studyAndRecords: number;
  messages: number;
  attachments: number;
  attachmentBytes: number;
  customRecordItems: number;
  sharedGuardianFields: number;
};

export type PrototypeDataClearFailureScope = "state" | "session" | "attachments";

export type PrototypeDataClearResult = {
  stateCleared: boolean;
  failedScopes: PrototypeDataClearFailureScope[];
};

export function getPrototypeDataSummary(state: AppState): PrototypeDataSummary {
  const attachments = state.coachConversation.flatMap((message) => message.attachments);

  return {
    tasksAndEvents: state.tasks.length + state.calendarEvents.length,
    studyAndRecords: state.studySessions.length + state.studentRecords.length,
    messages: state.guardianMessages.length + state.coachConversation.length,
    attachments: attachments.length,
    attachmentBytes: attachments.reduce((total, attachment) => total + attachment.byteSize, 0),
    customRecordItems: state.recordItems.filter((item) => item.createdBy === "student").length,
    sharedGuardianFields: Object.values(state.guardianPermissions).filter(Boolean).length,
  };
}

export function writePrototypeState(storage: WritableStorage, state: AppState) {
  try {
    storage.setItem(PROTOTYPE_STATE_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function persistPrototypeStateMutation(
  storage: WritableStorage,
  currentState: AppState,
  mutate: (currentState: AppState) => AppState
): PrototypeStateMutationResult {
  const nextState = mutate(currentState);

  if (nextState === currentState) {
    return { status: "unchanged", state: currentState };
  }

  if (!writePrototypeState(storage, nextState)) {
    return { status: "storage_failed", state: currentState };
  }

  return { status: "saved", state: nextState };
}

export function removePrototypeState(storage: WritableStorage) {
  try {
    storage.removeItem(PROTOTYPE_STATE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function clearPrototypeSessionData(storage: WritableStorage) {
  let succeeded = true;

  for (const key of PROTOTYPE_SESSION_STORAGE_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      succeeded = false;
    }
  }

  return succeeded;
}
