import { AppShell } from "@/components/AppShell";
import { CoachConversation } from "@/components/CoachConversation";

export default function CoachMessagesPage() {
  return (
    <AppShell
      role="coach"
      eyebrow="COACH · STUDENT"
      title="학생과 대화"
      layout="conversation"
    >
      <CoachConversation role="coach" />
    </AppShell>
  );
}
