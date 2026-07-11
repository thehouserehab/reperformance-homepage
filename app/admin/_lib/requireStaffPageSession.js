import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_COOKIE_NAME,
  hasStaffAccess,
} from '../../../lib/rpAdminAuth';
import { verifyActiveSessionCookie } from '../../../lib/rpSessionAuth';

export async function requireStaffPageSession(nextPath = '/admin') {
  const cookieStore = await cookies();
  const session = await verifyActiveSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!hasStaffAccess(session)) {
    const safeNextPath = String(nextPath || '').startsWith('/admin') ? String(nextPath) : '/admin';
    const reason = session ? '&error=forbidden' : '';
    redirect(`/admin/login?next=${encodeURIComponent(safeNextPath)}${reason}`);
  }

  return session;
}
