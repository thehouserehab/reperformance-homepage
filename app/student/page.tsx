import { AppShell } from "@/components/AppShell";
import { StudentToday } from "@/components/StudentToday";

export default function StudentPage() {
  return (
    <AppShell role="student" eyebrow="TODAY" title="도윤님, 오늘도 차근차근." layout="home">
      <StudentToday />
    </AppShell>
  );
}
