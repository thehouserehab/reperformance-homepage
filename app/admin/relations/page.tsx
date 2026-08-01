import { AdminWorkspace } from "@/components/AdminWorkspace";
import { AppShell } from "@/components/AppShell";

export default function AdminRelationsPage() {
  return (
    <AppShell role="admin" eyebrow="ACCOUNT RELATIONS" title="역할보다 실제 연결 관계를 확인합니다.">
      <AdminWorkspace view="relations" />
    </AppShell>
  );
}
