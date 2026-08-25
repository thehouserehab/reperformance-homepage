export type JsonBodyFailureReason =
  | "unsupported_media_type"
  | "payload_too_large"
  | "invalid_json";

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: JsonBodyFailureReason };

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
} as const;

function isJsonContentType(contentType: string | null) {
  return contentType?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function declaredBodyIsTooLarge(contentLength: string | null, maxBytes: number) {
  if (!contentLength || !/^\d+$/.test(contentLength.trim())) return false;
  return Number(contentLength) > maxBytes;
}

async function cancelQuietly(reader: ReadableStreamDefaultReader<Uint8Array>) {
  try {
    await reader.cancel();
  } catch {
    // The limit decision is already final even if the stream has closed.
  }
}

export async function readLimitedJsonBody(
  request: Request,
  maxBytes: number
): Promise<JsonBodyResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError("maxBytes must be a positive safe integer");
  }

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return { ok: false, reason: "unsupported_media_type" };
  }

  if (declaredBodyIsTooLarge(request.headers.get("content-length"), maxBytes)) {
    return { ok: false, reason: "payload_too_large" };
  }

  if (!request.body) {
    return { ok: false, reason: "invalid_json" };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await cancelQuietly(reader);
        return { ok: false, reason: "payload_too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  const payload = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    payload.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(payload);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}

export function noStoreJson<T>(body: T, status = 200) {
  return Response.json(body, {
    status,
    headers: PRIVATE_NO_STORE_HEADERS,
  });
}
