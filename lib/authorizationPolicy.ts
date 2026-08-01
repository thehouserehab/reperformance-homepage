import type { AppRole, GuardianPermissions } from "./types";

export type StudentDataArea =
  | "profile"
  | "tasks"
  | "condition"
  | "academics"
  | "practical"
  | "calendar"
  | "admission"
  | "contract_status";

export type StudentDataAccess = "none" | "summary" | "full";

export type ActiveGuardianAuthorization = {
  guardianUserId: string;
  confirmedByStudent: boolean;
  permissions: GuardianPermissions;
};

export type ServerAuthorizationContext = {
  actorUserId: string;
  roles: readonly AppRole[];
  studentUserId: string;
  activeCoachUserIds: readonly string[];
  activeGuardianLinks: readonly ActiveGuardianAuthorization[];
};

export type AiFeature =
  | "calendar_draft"
  | "message_draft"
  | "admission"
  | "training"
  | "nutrition"
  | "wellbeing"
  | "posture";

export type AiAuthorization = {
  feature: AiFeature;
  status: "pending" | "approved" | "suspended" | "revoked";
  dailyRequestLimit: number;
  usedToday: number;
  expiresAt: string | null;
};

const guardianAreaPermission: Partial<Record<StudentDataArea, keyof GuardianPermissions>> = {
  academics: "academics",
  practical: "practical",
  contract_status: "contract",
};

function includesUser(userIds: readonly string[], actorUserId: string) {
  return userIds.includes(actorUserId);
}

export function getStudentDataAccess(
  context: ServerAuthorizationContext,
  area: StudentDataArea
): StudentDataAccess {
  if (context.actorUserId === context.studentUserId && context.roles.includes("student")) {
    return "full";
  }

  if (context.roles.includes("coach") && includesUser(context.activeCoachUserIds, context.actorUserId)) {
    return "full";
  }

  if (context.roles.includes("guardian")) {
    const link = context.activeGuardianLinks.find(
      (candidate) =>
        candidate.guardianUserId === context.actorUserId && candidate.confirmedByStudent
    );

    if (!link) return "none";
    if (area === "profile") return "summary";
    if (area === "calendar" && link.permissions.attendance) return "summary";

    const permission = guardianAreaPermission[area];
    return permission && link.permissions[permission] ? "summary" : "none";
  }

  if (context.roles.includes("admin")) {
    return area === "profile" || area === "contract_status" ? "summary" : "none";
  }

  return "none";
}

export function canWriteStudentData(
  context: ServerAuthorizationContext,
  area: StudentDataArea
) {
  if (context.actorUserId === context.studentUserId && context.roles.includes("student")) {
    return area !== "contract_status";
  }

  if (context.roles.includes("coach") && includesUser(context.activeCoachUserIds, context.actorUserId)) {
    return area === "tasks" || area === "practical" || area === "calendar";
  }

  return false;
}

export function canAccessConversation(
  actorUserId: string,
  activeParticipantUserIds: readonly string[]
) {
  return activeParticipantUserIds.includes(actorUserId);
}

export function canManageOperations(roles: readonly AppRole[]) {
  return roles.includes("admin");
}

export function getAiAccess(grant: AiAuthorization | null, now = new Date()) {
  if (!grant || grant.status !== "approved" || grant.dailyRequestLimit <= 0) {
    return { allowed: false, remainingRequests: 0 } as const;
  }

  if (grant.expiresAt && new Date(grant.expiresAt).getTime() <= now.getTime()) {
    return { allowed: false, remainingRequests: 0 } as const;
  }

  const remainingRequests = Math.max(0, grant.dailyRequestLimit - grant.usedToday);
  return { allowed: remainingRequests > 0, remainingRequests } as const;
}

