import RPClientManager from '../../../components/rp-consultation/RPClientManager';
import { requireStaffPageSession } from '../_lib/requireStaffPageSession';

export const dynamic = 'force-dynamic';

export default async function AdminClientsPage() {
  await requireStaffPageSession('/admin/clients');

  return <RPClientManager />;
}
