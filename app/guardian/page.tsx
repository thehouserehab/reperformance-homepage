import { AppShell } from "@/components/AppShell";
import { GuardianWorkspace } from "@/components/GuardianWorkspace";

export default function GuardianPage() {
  return (
    <AppShell role="guardian" eyebrow="GUARDIAN" title="필요한 문의만 편하게 남겨주세요.">
      <GuardianWorkspace />
    </AppShell>
  );
}
