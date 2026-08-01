import { AppShell } from "@/components/AppShell";
import { CoachRecordsWorkspace } from "@/components/CoachRecordsWorkspace";

export default function CoachRecordsPage() {
  return (
    <AppShell role="coach" eyebrow="RECORD REVIEW" title="변화와 위험 신호를 함께 확인합니다.">
      <CoachRecordsWorkspace />
    </AppShell>
  );
}
