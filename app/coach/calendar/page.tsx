import { AppShell } from "@/components/AppShell";
import { CalendarWorkspace } from "@/components/CalendarWorkspace";

export default function CoachCalendarPage() {
  return (
    <AppShell role="coach" eyebrow="COACH SCHEDULE" title="수업과 측정 일정을 학생 흐름에 맞춥니다." layout="schedule">
      <CalendarWorkspace role="coach" />
    </AppShell>
  );
}
