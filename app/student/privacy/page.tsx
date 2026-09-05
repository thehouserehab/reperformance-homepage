import { AppShell } from "@/components/AppShell";
import { PrivacySettings } from "@/components/PrivacySettings";

export default function StudentPrivacyPage() {
  return (
    <AppShell role="student" eyebrow="MY PAGE" title="내 정보와 기록을 한 곳에서 관리합니다.">
      <PrivacySettings />
    </AppShell>
  );
}
