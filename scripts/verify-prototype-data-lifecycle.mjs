import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();

function importTypeScriptModule(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const encoded = Buffer.from(output).toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const lifecycle = await importTypeScriptModule("lib/prototypeDataLifecycle.ts");
const {
  PROTOTYPE_SESSION_STORAGE_KEYS,
  PROTOTYPE_STATE_STORAGE_KEY,
  clearPrototypeSessionData,
  getPrototypeDataSummary,
  removePrototypeState,
  writePrototypeState,
} = lifecycle;

const state = {
  tasks: [{ id: "task-1" }, { id: "task-2" }],
  calendarEvents: [{ id: "event-1" }],
  studySessions: [{ id: "study-1" }],
  studentRecords: [{ id: "record-1" }, { id: "record-2" }],
  guardianMessages: [{ id: "guardian-1" }],
  coachConversation: [
    {
      id: "message-1",
      attachments: [
        { id: "attachment-1", byteSize: 1024 },
        { id: "attachment-2", byteSize: 2048 },
      ],
    },
  ],
  recordItems: [
    { id: "system-1", createdBy: "system" },
    { id: "student-1", createdBy: "student" },
  ],
  guardianPermissions: {
    attendance: true,
    contract: false,
    academics: true,
    practical: false,
  },
};

assert.deepEqual(getPrototypeDataSummary(state), {
  tasksAndEvents: 3,
  studyAndRecords: 3,
  messages: 2,
  attachments: 2,
  attachmentBytes: 3072,
  customRecordItems: 1,
  sharedGuardianFields: 2,
});

const stored = new Map();
const storage = {
  setItem(key, value) {
    stored.set(key, value);
  },
  removeItem(key) {
    stored.delete(key);
  },
};

assert.equal(writePrototypeState(storage, state), true);
assert.deepEqual(JSON.parse(stored.get(PROTOTYPE_STATE_STORAGE_KEY)), state);
assert.equal(removePrototypeState(storage), true);
assert.equal(stored.has(PROTOTYPE_STATE_STORAGE_KEY), false);

assert.equal(
  writePrototypeState({ setItem() { throw new Error("denied"); }, removeItem() {} }, state),
  false
);
assert.equal(
  removePrototypeState({ setItem() {}, removeItem() { throw new Error("denied"); } }),
  false
);

for (const key of PROTOTYPE_SESSION_STORAGE_KEYS) stored.set(key, "draft");
assert.equal(clearPrototypeSessionData(storage), true);
assert.equal(PROTOTYPE_SESSION_STORAGE_KEYS.every((key) => !stored.has(key)), true);

let removalAttempts = 0;
assert.equal(
  clearPrototypeSessionData({
    setItem() {},
    removeItem() {
      removalAttempts += 1;
      if (removalAttempts === 2) throw new Error("blocked");
    },
  }),
  false
);
assert.equal(removalAttempts, PROTOTYPE_SESSION_STORAGE_KEYS.length);

const demoSource = read("lib/demoData.ts");
const providerSource = read("components/AppStateProvider.tsx");
const privacySource = read("components/PrivacySettings.tsx");
const attachmentSource = read("lib/messageAttachments.ts");
const conversationSource = read("components/CoachConversation.tsx");

assert.match(demoSource, /export function createEmptyAppStateForDate/);
assert.match(demoSource, /\.filter\(\(item\) => item\.createdBy === "system"\)/);
for (const emptyCollection of ["tasks", "studySessions", "studentRecords", "calendarEvents", "guardianMessages", "coachConversation"]) {
  assert.match(demoSource, new RegExp(`${emptyCollection}: \\[\\]`));
}

const writeIndex = providerSource.indexOf("writePrototypeState(window.localStorage, emptyState)");
const stateIndex = providerSource.indexOf("setState(emptyState)", writeIndex);
assert.ok(writeIndex >= 0 && stateIndex > writeIndex, "빈 상태를 영속화한 뒤 화면 상태를 전환해야 합니다.");
assert.match(providerSource, /failedScopes\.push\("session"\)/);
assert.match(providerSource, /failedScopes\.push\("attachments"\)/);
assert.doesNotMatch(providerSource, /resetPrototype/);

assert.match(privacySource, /이 기기에 저장된 내 데이터/);
assert.match(privacySource, /서버 계정이나 외부 캘린더·파일을 삭제하는 기능이 아니며/);
assert.match(privacySource, /confirmationOpen \?/);
assert.match(privacySource, /role="alert"/);
assert.match(privacySource, /aria-live="polite"/);
assert.doesNotMatch(privacySource, /window\.confirm/);
assert.match(attachmentSource, /request\.onblocked = \(\) => reject/);
assert.match(conversationSource, /state\.coachConversation\.length === 0/);
assert.match(conversationSource, /아직 대화가 없습니다\./);

console.log("Prototype data lifecycle verification passed.");
