import { AppShell } from "@/components/AppShell";
import { CoachConversation } from "@/components/CoachConversation";

export default function StudentMessagesPage() {
  return (
    <AppShell
      role="student"
      eyebrow="STUDENT · COACH"
      title="담당 코치와 대화"
      layout="conversation"
    >
      <CoachConversation role="student" />
    </AppShell>
  );
}
