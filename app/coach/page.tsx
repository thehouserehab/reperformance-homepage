import { AppShell } from "@/components/AppShell";
import { CoachWorkspace } from "@/components/CoachWorkspace";

export default function CoachPage() {
  return (
    <AppShell role="coach" eyebrow="COACH WORKSPACE" title="오늘 개입할 학생만 먼저 봅니다.">
      <CoachWorkspace />
    </AppShell>
  );
}
