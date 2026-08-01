import { AdminWorkspace } from "@/components/AdminWorkspace";
import { AppShell } from "@/components/AppShell";

export default function AdminAiPage() {
  return (
    <AppShell role="admin" eyebrow="AI ACCESS" title="승인과 사용량이 있는 기능만 엽니다.">
      <AdminWorkspace view="ai" />
    </AppShell>
  );
}
