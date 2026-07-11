import RPConsultationMode from '../../../components/rp-consultation/RPConsultationModePe';
import { requireStaffPageSession } from '../_lib/requireStaffPageSession';

export const dynamic = 'force-dynamic';

export default async function ConsultationPage() {
  await requireStaffPageSession('/admin/consultation');

  return <RPConsultationMode />;
}
