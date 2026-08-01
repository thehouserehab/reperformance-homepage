import { AppShell } from "@/components/AppShell";
import { GuardianSummaryWorkspace } from "@/components/GuardianSummaryWorkspace";

export default function GuardianSummaryPage() {
  return (
    <AppShell role="guardian" eyebrow="SHARED BY STUDENT" title="학생이 공개한 요약만 확인합니다.">
      <GuardianSummaryWorkspace />
    </AppShell>
  );
}
