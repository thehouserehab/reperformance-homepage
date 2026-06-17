type NoreChatButtonProps = {
  workspace: "member" | "pe-exam";
  label?: string;
};

export function NoreChatButton({ workspace, label = "AI 상담하기" }: NoreChatButtonProps) {
  return (
    <a
      className="workspace-ai-button"
      href={`/api/nore/chat?workspace=${workspace}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}
