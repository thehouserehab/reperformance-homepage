export function canRevokeAccountSessions(session) {
  return session?.role === 'owner' || session?.role === 'admin';
}

export function canRevokeTargetAccount(session, account) {
  if (!canRevokeAccountSessions(session)) return false;
  if (session.role === 'admin' && account?.role === 'owner') return false;
  return true;
}
