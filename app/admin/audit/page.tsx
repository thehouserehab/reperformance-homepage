import { AdminWorkspace } from "@/components/AdminWorkspace";
import { AppShell } from "@/components/AppShell";

export default function AdminAuditPage() {
  return (
    <AppShell role="admin" eyebrow="AUDIT TRAIL" title="민감한 변경은 이유와 함께 추적합니다.">
      <AdminWorkspace view="audit" />
    </AppShell>
  );
}
