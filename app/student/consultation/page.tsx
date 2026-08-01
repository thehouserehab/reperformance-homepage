import { AppShell } from "@/components/AppShell";
import { ConsultationWorkspace } from "@/components/ConsultationWorkspace";

export default function StudentConsultationPage() {
  return (
    <AppShell role="student" eyebrow="ASK FOR SUPPORT" title="혼자 판단하지 않아도 되는 질문부터 고릅니다.">
      <ConsultationWorkspace />
    </AppShell>
  );
}
