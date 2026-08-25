import type {
  CoachConversationAttachment,
  MessageAttachmentKind,
} from "./types";

const DATABASE_NAME = "rp-app-message-media-v1";
const DATABASE_VERSION = 1;
const STORE_NAME = "message-media";

export const MESSAGE_ATTACHMENT_LIMITS = {
  maxCount: 4,
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 50 * 1024 * 1024,
  maxTotalBytes: 60 * 1024 * 1024,
} as const;

export const MESSAGE_ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const SIGNATURE_READ_BYTES = 4096;

const FILE_SIGNATURES = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  gif87a: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
  gif89a: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  riff: [0x52, 0x49, 0x46, 0x46],
  webp: [0x57, 0x45, 0x42, 0x50],
  ebml: [0x1a, 0x45, 0xdf, 0xa3],
  webm: [0x77, 0x65, 0x62, 0x6d],
} as const;

type StoredMessageMedia = {
  storageKey: string;
  blob: Blob;
  createdAt: string;
};

export type MessageAttachmentReconciliationResult = {
  removedOrphanCount: number;
  missingReferenceCount: number;
};

export type MessageAttachmentLoadResult =
  | { status: "ready"; blob: Blob }
  | { status: "missing" | "invalid" };

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("이 브라우저에서는 미디어 저장을 사용할 수 없습니다."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "storageKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("미디어 저장소를 열지 못했습니다."));
    request.onblocked = () => reject(new Error("미디어 저장소가 다른 창에서 사용 중입니다."));
  });
}

function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("미디어를 저장하지 못했습니다."));
    transaction.onabort = () => reject(transaction.error ?? new Error("미디어 저장이 취소되었습니다."));
  });
}

function getAttachmentKind(file: File): MessageAttachmentKind | null {
  if (IMAGE_TYPES.has(file.type)) return "image";
  if (VIDEO_TYPES.has(file.type)) return "video";
  return null;
}

function getAttachmentKindForMimeType(mimeType: string): MessageAttachmentKind | null {
  if (IMAGE_TYPES.has(mimeType)) return "image";
  if (VIDEO_TYPES.has(mimeType)) return "video";
  return null;
}

function cleanFileName(fileName: string) {
  const cleaned = fileName.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (cleaned || "첨부파일").slice(0, 120);
}

function bytesMatch(bytes: Uint8Array, signature: readonly number[], offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function bytesInclude(bytes: Uint8Array, signature: readonly number[]) {
  if (bytes.length < signature.length) return false;

  for (let offset = 0; offset <= bytes.length - signature.length; offset += 1) {
    if (bytesMatch(bytes, signature, offset)) return true;
  }

  return false;
}

function asciiAt(bytes: Uint8Array, offset: number, length: number) {
  if (bytes.length < offset + length) return "";
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function matchesIsoBaseMedia(bytes: Uint8Array, mimeType: "video/mp4" | "video/quicktime") {
  const firstBoxType = asciiAt(bytes, 4, 4);
  if (firstBoxType === "ftyp") {
    const majorBrand = asciiAt(bytes, 8, 4);
    return mimeType === "video/quicktime" ? majorBrand === "qt  " : majorBrand !== "qt  ";
  }

  return mimeType === "video/quicktime" && ["moov", "mdat", "wide", "free", "skip"].includes(firstBoxType);
}

function matchesDeclaredFileType(bytes: Uint8Array, mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return bytesMatch(bytes, FILE_SIGNATURES.jpeg);
    case "image/png":
      return bytesMatch(bytes, FILE_SIGNATURES.png);
    case "image/gif":
      return bytesMatch(bytes, FILE_SIGNATURES.gif87a) || bytesMatch(bytes, FILE_SIGNATURES.gif89a);
    case "image/webp":
      return bytesMatch(bytes, FILE_SIGNATURES.riff) && bytesMatch(bytes, FILE_SIGNATURES.webp, 8);
    case "video/webm":
      return bytesMatch(bytes, FILE_SIGNATURES.ebml) && bytesInclude(bytes, FILE_SIGNATURES.webm);
    case "video/mp4":
    case "video/quicktime":
      return matchesIsoBaseMedia(bytes, mimeType);
    default:
      return false;
  }
}

async function blobMatchesDeclaredFileType(blob: Blob, mimeType: string) {
  const bytes = new Uint8Array(await blob.slice(0, SIGNATURE_READ_BYTES).arrayBuffer());
  return matchesDeclaredFileType(bytes, mimeType);
}

function uniqueStorageKeys(storageKeys: string[]) {
  return [...new Set(storageKeys.filter((storageKey) => storageKey.length > 0))];
}

async function deleteStorageKeys(database: IDBDatabase, storageKeys: string[]) {
  const keys = uniqueStorageKeys(storageKeys);
  if (keys.length === 0) return;

  const transaction = database.transaction(STORE_NAME, "readwrite");
  const completion = waitForTransaction(transaction);
  const store = transaction.objectStore(STORE_NAME);
  keys.forEach((storageKey) => store.delete(storageKey));
  await completion;
}

function readStoredMessageAttachmentKeys(database: IDBDatabase) {
  return new Promise<string[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAllKeys();
    request.onsuccess = () => {
      resolve(request.result.filter((key): key is string => typeof key === "string"));
    };
    request.onerror = () => reject(request.error ?? new Error("미디어 저장 상태를 확인하지 못했습니다."));
  });
}

export function formatAttachmentSize(byteSize: number) {
  if (byteSize < 1024 * 1024) return `${Math.max(1, Math.round(byteSize / 1024))}KB`;
  return `${(byteSize / (1024 * 1024)).toFixed(byteSize < 10 * 1024 * 1024 ? 1 : 0)}MB`;
}

export function validateMessageAttachments(files: File[], existingFiles: File[] = []) {
  if (existingFiles.length + files.length > MESSAGE_ATTACHMENT_LIMITS.maxCount) {
    return `사진과 영상은 한 메시지에 최대 ${MESSAGE_ATTACHMENT_LIMITS.maxCount}개까지 첨부할 수 있습니다.`;
  }

  for (const file of files) {
    const kind = getAttachmentKind(file);
    if (!kind) return `${cleanFileName(file.name)} 파일 형식은 지원하지 않습니다.`;
    if (file.size <= 0) return `${cleanFileName(file.name)} 파일이 비어 있습니다.`;
    if (kind === "image" && file.size > MESSAGE_ATTACHMENT_LIMITS.maxImageBytes) {
      return `사진은 파일당 10MB까지 첨부할 수 있습니다.`;
    }
    if (kind === "video" && file.size > MESSAGE_ATTACHMENT_LIMITS.maxVideoBytes) {
      return `영상은 파일당 50MB까지 첨부할 수 있습니다.`;
    }
  }

  const totalBytes = [...existingFiles, ...files].reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MESSAGE_ATTACHMENT_LIMITS.maxTotalBytes) {
    return "한 메시지의 첨부파일 합계는 60MB까지 가능합니다.";
  }

  return null;
}

export async function validateMessageAttachmentContents(files: File[], existingFiles: File[] = []) {
  const metadataError = validateMessageAttachments(files, existingFiles);
  if (metadataError) return metadataError;

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        if (await blobMatchesDeclaredFileType(file, file.type)) return null;
        return `${cleanFileName(file.name)} 파일의 실제 형식이 선택한 사진·영상 형식과 일치하지 않습니다.`;
      } catch {
        return `${cleanFileName(file.name)} 파일 내용을 확인하지 못했습니다. 다시 선택해 주세요.`;
      }
    })
  );

  return results.find((result): result is string => Boolean(result)) ?? null;
}

export function getMessageAttachmentKind(file: File) {
  return getAttachmentKind(file);
}

export function isMessageAttachmentMetadataValid(value: unknown): value is CoachConversationAttachment {
  if (!value || typeof value !== "object") return false;
  const attachment = value as Partial<CoachConversationAttachment>;
  const kind = typeof attachment.mimeType === "string"
    ? getAttachmentKindForMimeType(attachment.mimeType)
    : null;
  const maxBytes = kind === "image"
    ? MESSAGE_ATTACHMENT_LIMITS.maxImageBytes
    : MESSAGE_ATTACHMENT_LIMITS.maxVideoBytes;

  return (
    typeof attachment.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attachment.id) &&
    attachment.kind === kind &&
    typeof attachment.fileName === "string" &&
    attachment.fileName.length > 0 &&
    attachment.fileName.length <= 120 &&
    typeof attachment.mimeType === "string" &&
    typeof attachment.byteSize === "number" &&
    Number.isInteger(attachment.byteSize) &&
    attachment.byteSize > 0 &&
    attachment.byteSize <= maxBytes &&
    attachment.storageKey === `coach-conversation/${attachment.id}` &&
    typeof attachment.createdAt === "string" &&
    Number.isFinite(Date.parse(attachment.createdAt))
  );
}

export function planMessageAttachmentReconciliation(storedKeys: string[], referencedKeys: string[]) {
  const stored = new Set(uniqueStorageKeys(storedKeys));
  const referenced = new Set(uniqueStorageKeys(referencedKeys));

  return {
    orphanStorageKeys: [...stored].filter((storageKey) => !referenced.has(storageKey)),
    missingStorageKeys: [...referenced].filter((storageKey) => !stored.has(storageKey)),
  };
}

export async function storeMessageAttachments(files: File[]) {
  if (files.length === 0) return [];

  const validationError = await validateMessageAttachmentContents(files);
  if (validationError) throw new Error(validationError);

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    if (
      typeof estimate.quota === "number" &&
      typeof estimate.usage === "number" &&
      estimate.quota - estimate.usage < totalBytes + 1024 * 1024
    ) {
      throw new Error("기기 저장 공간이 부족합니다. 첨부파일 크기를 줄여주세요.");
    }
  }

  const createdAt = new Date().toISOString();
  const attachments: CoachConversationAttachment[] = files.map((file) => {
    const id = crypto.randomUUID();
    const kind = getAttachmentKind(file);
    if (!kind) throw new Error("지원하지 않는 첨부파일 형식입니다.");

    return {
      id,
      kind,
      fileName: cleanFileName(file.name),
      mimeType: file.type,
      byteSize: file.size,
      storageKey: `coach-conversation/${id}`,
      createdAt,
    };
  });

  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    attachments.forEach((attachment, index) => {
      const record: StoredMessageMedia = {
        storageKey: attachment.storageKey,
        blob: files[index],
        createdAt,
      };
      store.put(record);
    });
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }

  return attachments;
}

export async function loadMessageAttachment(storageKey: string) {
  const database = await openDatabase();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(storageKey);
      request.onsuccess = () => {
        const record = request.result as StoredMessageMedia | undefined;
        resolve(record?.blob ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error("첨부파일을 불러오지 못했습니다."));
    });
  } finally {
    database.close();
  }
}

export async function isStoredMessageAttachmentBlobValid(
  attachment: CoachConversationAttachment,
  blob: Blob
) {
  try {
    return (
      isMessageAttachmentMetadataValid(attachment) &&
      blob.size === attachment.byteSize &&
      blob.type === attachment.mimeType &&
      getAttachmentKindForMimeType(blob.type) === attachment.kind &&
      await blobMatchesDeclaredFileType(blob, blob.type)
    );
  } catch {
    return false;
  }
}

export async function loadVerifiedMessageAttachment(
  attachment: CoachConversationAttachment
): Promise<MessageAttachmentLoadResult> {
  const blob = await loadMessageAttachment(attachment.storageKey);
  if (!blob) return { status: "missing" };

  if (!(await isStoredMessageAttachmentBlobValid(attachment, blob))) {
    return { status: "invalid" };
  }

  return { status: "ready", blob };
}

export async function deleteStoredMessageAttachments(storageKeys: string[]) {
  if (storageKeys.length === 0) return;

  const database = await openDatabase();
  try {
    await deleteStorageKeys(database, storageKeys);
  } finally {
    database.close();
  }
}

export async function reconcileStoredMessageAttachments(
  referencedStorageKeys: string[]
): Promise<MessageAttachmentReconciliationResult> {
  const database = await openDatabase();
  try {
    const storedKeys = await readStoredMessageAttachmentKeys(database);
    const plan = planMessageAttachmentReconciliation(storedKeys, referencedStorageKeys);
    await deleteStorageKeys(database, plan.orphanStorageKeys);
    return {
      removedOrphanCount: plan.orphanStorageKeys.length,
      missingReferenceCount: plan.missingStorageKeys.length,
    };
  } finally {
    database.close();
  }
}

export function clearStoredMessageAttachments() {
  return new Promise<void>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }

    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("미디어 저장소를 초기화하지 못했습니다."));
    request.onblocked = () => reject(new Error("다른 탭에서 미디어 저장소를 사용 중입니다."));
  });
}
