import { AdminWorkspace } from "@/components/AdminWorkspace";
import { AppShell } from "@/components/AppShell";

export default function AdminPage() {
  return (
    <AppShell role="admin" eyebrow="ADMIN OPERATIONS" title="권한과 예외를 먼저 처리합니다.">
      <AdminWorkspace view="overview" />
    </AppShell>
  );
}
