import { AppShell } from "@/components/AppShell";
import { StudentToday } from "@/components/StudentToday";

export default function StudentPage() {
  return (
    <AppShell role="student" eyebrow="SATURDAY · AUG 01" title="도윤님, 오늘은 이만큼이면 충분합니다.">
      <StudentToday />
    </AppShell>
  );
}
