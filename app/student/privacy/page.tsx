import { AppShell } from "@/components/AppShell";
import { PrivacySettings } from "@/components/PrivacySettings";

export default function StudentPrivacyPage() {
  return (
    <AppShell role="student" eyebrow="STUDENT CONTROL" title="내 정보는 내가 공개합니다.">
      <PrivacySettings />
    </AppShell>
  );
}
