import { AppShell } from "@/components/AppShell";
import { CalendarWorkspace } from "@/components/CalendarWorkspace";

export default function CalendarPage() {
  return (
    <AppShell role="student" eyebrow="ONE SCHEDULE" title="공부와 운동 일정을 한곳에 모읍니다.">
      <CalendarWorkspace />
    </AppShell>
  );
}
