import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

async function importTypeScriptModule(relativePath) {
  const output = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const {
  isMessageAttachmentMetadataValid,
  isStoredMessageAttachmentBlobValid,
  planMessageAttachmentReconciliation,
} = await importTypeScriptModule("lib/messageAttachments.ts");

const attachmentId = "123e4567-e89b-42d3-a456-426614174000";
const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const validAttachment = {
  id: attachmentId,
  kind: "image",
  fileName: "jump.png",
  mimeType: "image/png",
  byteSize: pngBytes.byteLength,
  storageKey: `coach-conversation/${attachmentId}`,
  createdAt: "2026-08-15T10:00:00.000Z",
};

assert.equal(isMessageAttachmentMetadataValid(validAttachment), true);
assert.equal(isMessageAttachmentMetadataValid({ ...validAttachment, kind: "video" }), false);
assert.equal(isMessageAttachmentMetadataValid({ ...validAttachment, mimeType: "image/svg+xml" }), false);
assert.equal(isMessageAttachmentMetadataValid({ ...validAttachment, byteSize: 0 }), false);
assert.equal(isMessageAttachmentMetadataValid({ ...validAttachment, byteSize: 10 * 1024 * 1024 + 1 }), false);
assert.equal(isMessageAttachmentMetadataValid({ ...validAttachment, storageKey: "another/key" }), false);
assert.equal(isMessageAttachmentMetadataValid({ ...validAttachment, createdAt: "not-a-date" }), false);

const validBlob = new Blob([pngBytes], { type: "image/png" });
assert.equal(await isStoredMessageAttachmentBlobValid(validAttachment, validBlob), true);
assert.equal(
  await isStoredMessageAttachmentBlobValid(
    { ...validAttachment, byteSize: validAttachment.byteSize + 1 },
    validBlob
  ),
  false
);
assert.equal(
  await isStoredMessageAttachmentBlobValid(
    { ...validAttachment, mimeType: "image/jpeg" },
    validBlob
  ),
  false
);
assert.equal(
  await isStoredMessageAttachmentBlobValid(
    validAttachment,
    new Blob([Uint8Array.from([0x3c, 0x68, 0x74, 0x6d, 0x6c])], { type: "image/png" })
  ),
  false
);

assert.deepEqual(
  planMessageAttachmentReconciliation(
    ["coach-conversation/a", "coach-conversation/b", "coach-conversation/b"],
    ["coach-conversation/b", "coach-conversation/c", "coach-conversation/c"]
  ),
  {
    orphanStorageKeys: ["coach-conversation/a"],
    missingStorageKeys: ["coach-conversation/c"],
  }
);

const attachmentSource = read("lib/messageAttachments.ts");
const providerSource = read("components/AppStateProvider.tsx");
const conversationSource = read("components/CoachConversation.tsx");
const attachmentViewSource = read("components/MessageAttachmentView.tsx");

assert.match(attachmentSource, /export async function deleteStoredMessageAttachments/);
assert.match(attachmentSource, /export async function reconcileStoredMessageAttachments/);
assert.match(attachmentSource, /await deleteStorageKeys\(database, plan\.orphanStorageKeys\)/);
assert.match(providerSource, /message\.attachments\.filter\(isMessageAttachmentMetadataValid\)/);

const reconcileIndex = providerSource.indexOf("await reconcileStoredMessageAttachments(referencedStorageKeys)");
const hydratedIndex = providerSource.indexOf("setHydrated(true)", reconcileIndex);
assert.ok(reconcileIndex >= 0 && hydratedIndex > reconcileIndex, "고아 미디어 정리를 마친 뒤 메시지 입력을 활성화해야 합니다.");

const sendIndex = providerSource.indexOf("const sendCoachConversationMessage");
const commitIndex = providerSource.indexOf("return commitState((current)", sendIndex);
const persistenceBoundaryIndex = providerSource.indexOf(
  "persistPrototypeStateMutation(window.localStorage, stateRef.current, mutate)"
);
const stateIndex = providerSource.indexOf("setState(result.state)", persistenceBoundaryIndex);
assert.ok(commitIndex > sendIndex, "메시지 상태 변경은 공통 영속화 경계를 사용해야 합니다.");
assert.ok(
  persistenceBoundaryIndex >= 0 && stateIndex > persistenceBoundaryIndex,
  "메시지 상태를 영속화한 뒤 화면 상태를 전환해야 합니다."
);
assert.match(providerSource, /\) => boolean;/);

assert.match(conversationSource, /messagePersisted = sendCoachConversationMessage/);
assert.match(conversationSource, /await deleteStoredMessageAttachments/);
assert.match(conversationSource, /if \(!messagePersisted && storedAttachments\.length > 0\)/);
assert.match(conversationSource, /disabled=\{!hydrated \|\| sending/);

assert.match(attachmentViewSource, /loadVerifiedMessageAttachment\(attachment\)/);
assert.match(attachmentViewSource, /failure === "invalid"/);
assert.match(attachmentViewSource, /attachment\.byteSize, attachment\.kind, attachment\.mimeType, attachment\.storageKey/);

console.log("RP APP message attachment lifecycle verified: metadata integrity, blob integrity, orphan plan, persistence ordering, and compensating cleanup.");
