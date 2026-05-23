export async function fetchRpClients() {
  const res = await fetch('/api/rp/clients?action=listClients', { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Failed to fetch RP clients');
  return data.clients || [];
}

export async function saveRpClient(payload) {
  const res = await fetch('/api/rp/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'saveClient', payload })
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Failed to save RP client');
  return data.client || data.result;
}

export async function saveRpConsultation(payload) {
  const res = await fetch('/api/rp/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'saveConsultation', payload })
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Failed to save RP consultation');
  return data.result;
}

export async function saveRpParq(payload) {
  const res = await fetch('/api/rp/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'saveParq', payload })
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Failed to save RP PAR-Q');
  return data.result;
}

export async function healthCheckRpSheets() {
  const res = await fetch('/api/rp/clients?action=health', { cache: 'no-store' });
  return res.json();
}
