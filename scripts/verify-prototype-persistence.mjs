import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

async function importTypeScriptModule(relativePath) {
  const source = read(relativePath);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const encoded = Buffer.from(output).toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

const {
  PROTOTYPE_STATE_STORAGE_KEY,
  persistPrototypeStateMutation,
} = await importTypeScriptModule("lib/prototypeDataLifecycle.ts");

const currentState = {
  tasks: [{ id: "task-1", completed: false }],
  calendarEvents: [],
};
const nextState = {
  ...currentState,
  tasks: [{ id: "task-1", completed: true }],
};

let writes = 0;
const persisted = new Map();
const writableStorage = {
  setItem(key, value) {
    writes += 1;
    persisted.set(key, value);
  },
  removeItem() {},
};

const saved = persistPrototypeStateMutation(writableStorage, currentState, () => nextState);
assert.equal(saved.status, "saved");
assert.equal(saved.state, nextState);
assert.equal(writes, 1);
assert.deepEqual(JSON.parse(persisted.get(PROTOTYPE_STATE_STORAGE_KEY)), nextState);

const unchanged = persistPrototypeStateMutation(writableStorage, currentState, (state) => state);
assert.equal(unchanged.status, "unchanged");
assert.equal(unchanged.state, currentState);
assert.equal(writes, 1, "변경이 없으면 저장소를 쓰지 않아야 합니다.");

const failed = persistPrototypeStateMutation(
  {
    setItem() {
      throw new Error("quota exceeded");
    },
    removeItem() {},
  },
  currentState,
  () => nextState
);
assert.equal(failed.status, "storage_failed");
assert.equal(failed.state, currentState, "저장 실패 시 화면에 반영할 상태는 기존 상태여야 합니다.");

const providerSource = read("components/AppStateProvider.tsx");
const shellSource = read("components/AppShell.tsx");
const calendarSource = read("components/CalendarWorkspace.tsx");
const recordSource = read("components/StudentRecordsWorkspace.tsx");
const guardianSource = read("components/GuardianWorkspace.tsx");

assert.match(providerSource, /persistPrototypeStateMutation\(window\.localStorage, stateRef\.current, mutate\)/);
assert.doesNotMatch(providerSource, /setState\(\(current\)/, "상태 변경은 공통 저장 경계를 우회하면 안 됩니다.");
assert.match(providerSource, /setPersistenceIssue\(true\)/);
assert.match(providerSource, /stateRef\.current = result\.state;\s*setState\(result\.state\)/);
assert.match(shellSource, /prototype-persistence-alert/);
assert.match(shellSource, /화면에는 반영하지 않았습니다/);
assert.match(calendarSource, /const saved = onAdd/);
assert.match(calendarSource, /if \(saved\) onClose\(\)/);
assert.match(calendarSource, /const saved = addCalendarEvent/);
assert.match(recordSource, /const saved = addStudentRecord/);
assert.match(guardianSource, /const saved = sendGuardianMessage/);

console.log("Prototype persistence verification passed.");
