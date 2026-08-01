import { AppShell } from "@/components/AppShell";
import { CoachConversation } from "@/components/CoachConversation";

export default function CoachMessagesPage() {
  return (
    <AppShell role="coach" eyebrow="COACH · STUDENT" title="기록을 보고, 필요한 말만 정확히 전합니다.">
      <CoachConversation role="coach" />
    </AppShell>
  );
}
