import { AppShell } from "@/components/AppShell";
import { CoachConversation } from "@/components/CoachConversation";

export default function StudentMessagesPage() {
  return (
    <AppShell role="student" eyebrow="STUDENT · COACH" title="혼자 정리하기 어려운 순간을 바로 나눕니다.">
      <CoachConversation role="student" />
    </AppShell>
  );
}
