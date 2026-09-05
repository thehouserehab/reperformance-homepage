import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { StudentRecordsWorkspace } from "@/components/StudentRecordsWorkspace";

export default function StudentRecordsPage() {
  return (
    <AppShell role="student" eyebrow="MY RECORDS" title="공부·운동·컨디션 기록">
      <Suspense fallback={null}>
        <StudentRecordsWorkspace />
      </Suspense>
    </AppShell>
  );
}
