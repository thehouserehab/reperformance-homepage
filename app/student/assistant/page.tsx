import { AppShell } from "@/components/AppShell";
import { StudentAssistantChat } from "@/components/StudentAssistantChat";

export default function StudentAssistantPage() {
  return (
    <AppShell
      role="student"
      eyebrow="AI ASSISTANT"
      title="말 한마디로 일정 등록과 상담 연결을"
      layout="conversation"
    >
      <StudentAssistantChat />
    </AppShell>
  );
}
