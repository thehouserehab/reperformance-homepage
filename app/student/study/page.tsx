import { AppShell } from "@/components/AppShell";
import { StudyTimer } from "@/components/StudyTimer";

export default function StudentStudyPage() {
  return (
    <AppShell role="student" eyebrow="FOCUS SESSION" title="집중할 시간만 정하고 시작합니다.">
      <StudyTimer />
    </AppShell>
  );
}
