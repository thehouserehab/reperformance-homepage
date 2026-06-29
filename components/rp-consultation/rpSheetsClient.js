export async function fetchRpClients() {
  const response = await fetch('/api/rp/clients', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.ok === false) {
    const message = payload?.setupRequired
      ? 'Postgres 또는 Google Drive 고객 데이터 연결이 필요합니다. 샘플 고객을 표시합니다.'
      : payload?.error || `고객 데이터를 불러오지 못했습니다. (${response.status})`;
    throw new Error(message);
  }

  return Array.isArray(payload.clients) ? payload.clients : [];
}

export async function addRpClient(client) {
  const response = await fetch('/api/rp/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      action: 'addClient',
      client,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.ok === false) {
    const message = payload?.error || `고객을 저장하지 못했습니다. (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

export async function saveRpConsultation(record) {
  const response = await fetch('/api/rp/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      action: 'saveConsultation',
      record,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.ok === false) {
    const message = payload?.error || `상담 기록을 저장하지 못했습니다. (${response.status})`;
    throw new Error(message);
  }

  return payload;
}
