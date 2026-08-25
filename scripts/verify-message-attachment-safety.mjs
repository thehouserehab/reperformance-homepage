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
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

function fixture(name, type, bytes) {
  return new File([Uint8Array.from(bytes)], name, { type });
}

const {
  MESSAGE_ATTACHMENT_LIMITS,
  validateMessageAttachments,
  validateMessageAttachmentContents,
} = await importTypeScriptModule("lib/messageAttachments.ts");

const validFiles = [
  fixture("photo.jpg", "image/jpeg", [0xff, 0xd8, 0xff, 0xe0]),
  fixture("photo.png", "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  fixture("animation.gif", "image/gif", [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
  fixture("photo.webp", "image/webp", [
    0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]),
  fixture("clip.webm", "video/webm", [
    0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d,
  ]),
  fixture("clip.mp4", "video/mp4", [
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
  ]),
  fixture("clip.mov", "video/quicktime", [
    0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20,
  ]),
];

for (const file of validFiles) {
  assert.equal(await validateMessageAttachmentContents([file]), null, `${file.type} fixture should pass`);
}

const disguisedJpeg = fixture("disguised.jpg", "image/jpeg", [0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74]);
assert.match(
  await validateMessageAttachmentContents([disguisedJpeg]),
  /실제 형식이 선택한 사진·영상 형식과 일치하지 않습니다/
);

const pngClaimedAsJpeg = fixture("wrong.jpg", "image/jpeg", [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
assert.match(await validateMessageAttachmentContents([pngClaimedAsJpeg]), /실제 형식/);

const quickTimeClaimedAsMp4 = fixture("wrong.mp4", "video/mp4", [
  0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20,
]);
assert.match(await validateMessageAttachmentContents([quickTimeClaimedAsMp4]), /실제 형식/);

const matroskaClaimedAsWebm = fixture("wrong.webm", "video/webm", [
  0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x82, 0x88, 0x6d, 0x61, 0x74, 0x72, 0x6f, 0x73, 0x6b, 0x61,
]);
assert.match(await validateMessageAttachmentContents([matroskaClaimedAsWebm]), /실제 형식/);

const unreadableFile = {
  name: "broken.jpg",
  type: "image/jpeg",
  size: 10,
  slice() {
    return { async arrayBuffer() { throw new Error("read failed"); } };
  },
};
assert.match(await validateMessageAttachmentContents([unreadableFile]), /파일 내용을 확인하지 못했습니다/);

const fakeJpeg = { name: "photo.jpg", type: "image/jpeg", size: 1024 };
assert.match(
  validateMessageAttachments(Array.from({ length: MESSAGE_ATTACHMENT_LIMITS.maxCount + 1 }, () => fakeJpeg)),
  /최대 4개/
);
assert.match(
  validateMessageAttachments([
    { ...fakeJpeg, size: MESSAGE_ATTACHMENT_LIMITS.maxImageBytes + 1 },
  ]),
  /파일당 10MB/
);

const attachmentSource = read("lib/messageAttachments.ts");
const conversationSource = read("components/CoachConversation.tsx");
const globalStyles = read("app/globals.css");

assert.match(attachmentSource, /const results = await Promise\.all/);
assert.match(attachmentSource, /const validationError = await validateMessageAttachmentContents\(files\)/);
assert.match(conversationSource, /await validateMessageAttachmentContents/);
assert.match(conversationSource, /attachmentValidationRef\.current/);
assert.match(conversationSource, /aria-busy=\{!hydrated \|\| sending \|\| validatingAttachments\}/);
assert.match(conversationSource, /disabled=\{!hydrated \|\| sending \|\| validatingAttachments/);
assert.match(conversationSource, /composer-feedback \$\{feedbackTone\}/);
assert.match(conversationSource, /role="status" aria-live="polite"/);
assert.match(globalStyles, /\.compose-mode button \{[\s\S]*?min-height: 44px;/);
assert.match(globalStyles, /\.attach-message-button,[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);
assert.match(globalStyles, /\.remove-attachment-button \{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);

console.log("RP APP message attachment safety verified: metadata limits, file signatures, disguised files, and UI/storage boundaries.");
