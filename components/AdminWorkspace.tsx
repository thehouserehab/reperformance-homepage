import { Bot, ContactRound, KeyRound, ScanSearch, ShieldCheck, UsersRound } from "lucide-react";

export type AdminWorkspaceView = "overview" | "relations" | "ai" | "audit";

const workspaceContent: Record<
  AdminWorkspaceView,
  {
    kicker: string;
    title: string;
    summary: { label: string; value: string }[];
    rows: { label: string; title: string; detail: string; status: string }[];
  }
> = {
  overview: {
    kicker: "OPERATIONS",
    title: "사람이 확인해야 할 운영 예외",
    summary: [
      { label: "관계 승인", value: "2" },
      { label: "AI 승인", value: "3" },
      { label: "보안 확인", value: "0" },
    ],
    rows: [
      { label: "관계", title: "학생-코치 연결 요청", detail: "요청자와 담당 범위를 확인합니다.", status: "2건 대기" },
      { label: "AI", title: "입시 상담 AI 승인 요청", detail: "기능 범위와 하루 사용량을 함께 결정합니다.", status: "3건 대기" },
      { label: "동의", title: "최신 동의 버전", detail: "개인정보·민감정보·AI 동의 상태를 확인합니다.", status: "정상" },
    ],
  },
  relations: {
    kicker: "RELATIONSHIPS",
    title: "계정과 학생 연결 관계",
    summary: [
      { label: "활성 학생", value: "1" },
      { label: "활성 코치", value: "1" },
      { label: "학부모 연결", value: "1" },
    ],
    rows: [
      { label: "학생-코치", title: "김도윤 · 담당 코치", detail: "활성 관계 · 체대입시 코칭 목적", status: "활성" },
      { label: "학생-학부모", title: "김도윤 · 학부모", detail: "연결만 활성 · 공개 항목은 학생이 별도 선택", status: "활성" },
      { label: "초대", title: "만료된 초대 코드", detail: "사용하지 않은 초대는 자동 만료합니다.", status: "0건" },
    ],
  },
  ai: {
    kicker: "AI CONTROL",
    title: "승인과 사용량을 기능별로 관리",
    summary: [
      { label: "승인 사용자", value: "0" },
      { label: "오늘 요청", value: "0" },
      { label: "외부 토큰", value: "0" },
    ],
    rows: [
      { label: "메시지 정리", title: "로컬 규칙 기반 초안", detail: "외부 모델 호출 없이 동작하며 승인 사용량에 포함하지 않습니다.", status: "사용 가능" },
      { label: "입시 상담", title: "OpenAI 기반 상담 보조", detail: "관리자 승인·일일 한도·동의 적용 후 연결합니다.", status: "미연결" },
      { label: "자세분석", title: "이미지·영상 분석", detail: "영상 동의·보관·코치 검토 정책 확정 후 도입합니다.", status: "2단계" },
    ],
  },
  audit: {
    kicker: "AUDIT & CONSENT",
    title: "민감한 변경은 이유와 함께 남깁니다.",
    summary: [
      { label: "권한 변경", value: "1" },
      { label: "동의 철회", value: "0" },
      { label: "보안 사건", value: "0" },
    ],
    rows: [
      { label: "공개 설정", title: "학부모 학업 요약 공개", detail: "학생 본인이 설정을 변경했습니다.", status: "기록됨" },
      { label: "대화 접근", title: "학생-코치 참여자 확인", detail: "활성 관계와 대화 참여자를 함께 검사합니다.", status: "정상" },
      { label: "NORE", title: "외부 자동 전송", detail: "API·webhook·동기화 경로를 두지 않습니다.", status: "차단" },
    ],
  },
};

const viewIcons: Record<AdminWorkspaceView, typeof UsersRound> = {
  overview: UsersRound,
  relations: ContactRound,
  ai: Bot,
  audit: ScanSearch,
};

export function AdminWorkspace({ view }: { view: AdminWorkspaceView }) {
  const content = workspaceContent[view];
  const ViewIcon = viewIcons[view];

  return (
    <>
      <section className="admin-summary-band" aria-label={`${content.title} 요약`}>
        {content.summary.map((item) => (
          <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>
        ))}
      </section>

      <section className="admin-workspace" aria-labelledby="admin-workspace-title">
        <header>
          <div className="admin-workspace-icon"><ViewIcon aria-hidden="true" size={25} /></div>
          <div><p className="section-kicker">{content.kicker}</p><h2 id="admin-workspace-title">{content.title}</h2></div>
        </header>
        <div className="admin-operation-list">
          {content.rows.map((row, index) => (
            <article key={`${row.label}-${row.title}`}>
              <span className="admin-row-index">0{index + 1}</span>
              <div><small>{row.label}</small><h3>{row.title}</h3><p>{row.detail}</p></div>
              <strong>{row.status}</strong>
            </article>
          ))}
        </div>
      </section>

      <aside className="admin-boundary-band">
        {view === "ai" ? <KeyRound aria-hidden="true" size={23} /> : <ShieldCheck aria-hidden="true" size={23} />}
        <p>현재 관리자 화면은 구조 검증용 예시 데이터입니다. Production에서는 관리자 인증과 감사 기록 없이 접근할 수 없습니다.</p>
      </aside>
    </>
  );
}
