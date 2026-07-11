const CURSOR_VERSION = 1;
const MAX_CURSOR_LENGTH = 768;
const MAX_CURSOR_ID_LENGTH = 200;

function invalidCursorError() {
  const error = new Error('Invalid customer pagination cursor.');
  error.status = 400;
  return error;
}

function normalizeCursorDate(value) {
  const date = new Date(String(value || ''));
  if (!Number.isFinite(date.getTime())) throw invalidCursorError();
  return date.toISOString();
}

function normalizeCursorId(value) {
  const id = String(value || '').trim();
  if (!id || id.length > MAX_CURSOR_ID_LENGTH || /[\u0000-\u001f]/.test(id)) {
    throw invalidCursorError();
  }
  return id;
}

export function encodeClientListCursor(record) {
  if (!record) return null;

  const payload = {
    v: CURSOR_VERSION,
    u: normalizeCursorDate(record.updatedAt || record.updated_at),
    c: normalizeCursorDate(record.createdAt || record.created_at),
    i: normalizeCursorId(record.id),
  };

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeClientListCursor(value) {
  const cursor = String(value || '').trim();
  if (!cursor) return null;
  if (cursor.length > MAX_CURSOR_LENGTH || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw invalidCursorError();

  try {
    const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (payload?.v !== CURSOR_VERSION) throw invalidCursorError();

    return {
      updatedAt: normalizeCursorDate(payload.u),
      createdAt: normalizeCursorDate(payload.c),
      id: normalizeCursorId(payload.i),
    };
  } catch (error) {
    if (error?.status === 400) throw error;
    throw invalidCursorError();
  }
}
