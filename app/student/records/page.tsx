import { AppShell } from "@/components/AppShell";
import { StudentRecordsWorkspace } from "@/components/StudentRecordsWorkspace";

export default function StudentRecordsPage() {
  return (
    <AppShell role="student" eyebrow="MY RECORDS" title="공부와 실기의 변화를 한 흐름으로 봅니다.">
      <StudentRecordsWorkspace />
    </AppShell>
  );
}
