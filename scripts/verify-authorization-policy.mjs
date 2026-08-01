import assert from "node:assert/strict";
import {
  canAccessConversation,
  canManageOperations,
  canWriteStudentData,
  getAiAccess,
  getStudentDataAccess,
} from "../lib/authorizationPolicy.ts";

const noGuardianPermissions = {
  attendance: false,
  contract: false,
  academics: false,
  practical: false,
};

function context(overrides = {}) {
  return {
    actorUserId: "student-user",
    roles: ["student"],
    studentUserId: "student-user",
    activeCoachUserIds: ["coach-user"],
    activeGuardianLinks: [],
    ...overrides,
  };
}

assert.equal(getStudentDataAccess(context(), "condition"), "full");
assert.equal(canWriteStudentData(context(), "academics"), true);
assert.equal(canWriteStudentData(context(), "contract_status"), false);

const activeCoach = context({ actorUserId: "coach-user", roles: ["coach"] });
assert.equal(getStudentDataAccess(activeCoach, "condition"), "full");
assert.equal(canWriteStudentData(activeCoach, "tasks"), true);
assert.equal(canWriteStudentData(activeCoach, "condition"), false);
assert.equal(canWriteStudentData(activeCoach, "academics"), false);

const unrelatedCoach = context({
  actorUserId: "other-coach",
  roles: ["coach"],
  activeCoachUserIds: ["coach-user"],
});
assert.equal(getStudentDataAccess(unrelatedCoach, "practical"), "none");

const guardian = context({
  actorUserId: "guardian-user",
  roles: ["guardian"],
  activeGuardianLinks: [
    {
      guardianUserId: "guardian-user",
      confirmedByStudent: true,
      permissions: { ...noGuardianPermissions, academics: true },
    },
  ],
});
assert.equal(getStudentDataAccess(guardian, "profile"), "summary");
assert.equal(getStudentDataAccess(guardian, "academics"), "summary");
assert.equal(getStudentDataAccess(guardian, "practical"), "none");
assert.equal(getStudentDataAccess(guardian, "condition"), "none");

const unconfirmedGuardian = context({
  actorUserId: "guardian-user",
  roles: ["guardian"],
  activeGuardianLinks: [
    {
      guardianUserId: "guardian-user",
      confirmedByStudent: false,
      permissions: { ...noGuardianPermissions, practical: true },
    },
  ],
});
assert.equal(getStudentDataAccess(unconfirmedGuardian, "profile"), "none");
assert.equal(getStudentDataAccess(unconfirmedGuardian, "practical"), "none");

const admin = context({ actorUserId: "admin-user", roles: ["admin"] });
assert.equal(getStudentDataAccess(admin, "profile"), "summary");
assert.equal(getStudentDataAccess(admin, "contract_status"), "summary");
assert.equal(getStudentDataAccess(admin, "condition"), "none");
assert.equal(canWriteStudentData(admin, "contract_status"), false);
assert.equal(canManageOperations(admin.roles), true);

assert.equal(canAccessConversation("student-user", ["student-user", "coach-user"]), true);
assert.equal(canAccessConversation("guardian-user", ["student-user", "coach-user"]), false);
assert.equal(canAccessConversation("admin-user", ["student-user", "coach-user"]), false);

assert.deepEqual(getAiAccess(null), { allowed: false, remainingRequests: 0 });
assert.deepEqual(
  getAiAccess({
    feature: "admission",
    status: "approved",
    dailyRequestLimit: 5,
    usedToday: 2,
    expiresAt: null,
  }),
  { allowed: true, remainingRequests: 3 }
);
assert.deepEqual(
  getAiAccess({
    feature: "admission",
    status: "approved",
    dailyRequestLimit: 5,
    usedToday: 5,
    expiresAt: null,
  }),
  { allowed: false, remainingRequests: 0 }
);
assert.deepEqual(
  getAiAccess(
    {
      feature: "admission",
      status: "approved",
      dailyRequestLimit: 5,
      usedToday: 0,
      expiresAt: "2026-07-31T00:00:00.000Z",
    },
    new Date("2026-08-01T00:00:00.000Z")
  ),
  { allowed: false, remainingRequests: 0 }
);

console.log("RP APP authorization policy verified: student, coach, guardian, admin, conversation, and AI cases.");
