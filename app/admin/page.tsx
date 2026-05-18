import { PageShell } from "../_components/SiteChrome";
import { site } from "../_components/siteData";

const workspaceLinks = [
  {
    title: "매출관리 열기",
    description: "매출, 실수금, 미수금, 환불액, 월별 비교를 관리합니다.",
    href: site.ownerWorkspaceHref,
  },
  {
    title: "상담응답 열기",
    description: "홈페이지·인스타·블로그 등 유입 상담자를 한 곳에서 확인합니다.",
    href: site.ownerWorkspaceHref,
  },
  {
    title: "문서DB 열기",
    description: "계약서, 개인정보 동의서, 평가지, 가격표, 프로그램 템플릿을 관리합니다.",
    href: site.ownerWorkspaceHref,
  },
  {
    title: "할일 캘린더 열기",
    description: "잔금 확인, 상담 연락, 콘텐츠 업로드, 재등록 상담 할일을 관리합니다.",
    href: site.ownerWorkspaceHref,
  },
  {
    title: "Google Drive 운영문서 열기",
    description: "RePERFORMANCE 운영문서 폴더로 이동합니다.",
    href: site.ownerWorkspaceHref,
  },
  {
    title: "ChatGPT 운영분석 열기",
    description: "월간 매출·상담·할일 데이터를 붙여넣고 운영 분석을 진행합니다.",
    href: site.chatGptHref,
  },
];

const dashboardCards = [
  { label: "이번 달 매출", value: "수기 입력", note: "Owner Workspace에서 자동 집계 예정" },
  { label: "미수금 / 잔금", value: "확인 필요", note: "분납·잔금 관리 탭에서 확인" },
  { label: "신규 상담", value: "상담DB", note: "상담 유입 경로별 확인" },
  { label: "오늘 할일", value: "캘린더", note: "운영 루틴과 결제 확인" },
];

const checklist = [
  "매출 입력: 결제일, 회원명, 상품, 총액, 입금액, 잔금 확인",
  "상담 확인: 신규 상담자, 연락 여부, 체험 예약 여부 확인",
  "문서 확인: 계약서, 동의서, 평가지, 가격표 최신본 유지",
  "할일 확인: 잔금, 재등록, 콘텐츠 업로드, 운영 업무 체크",
];

export default function AdminPage() {
  return (
    <PageShell>
      <section className="page-hero admin-hero">
        <div className="container page-title">
          <p className="eyebrow">OWNER WORKSPACE</p>
          <h1>RePERFORMANCE Owner Workspace</h1>
          <p>
            대표 운영관리 페이지입니다. 매출, 문서, 할일, 상담 데이터를 한 곳에서 확인합니다.
            실제 민감정보와 매출 데이터는 Google Workspace 권한이 있는 계정에서만 열람되도록 관리합니다.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container admin-dashboard">
          {dashboardCards.map((card) => (
            <div className="admin-metric" key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">QUICK ACCESS</p>
            <h2>운영에 필요한 링크를 한 곳에 모았습니다.</h2>
            <p>
              현재는 추가 비용 없이 Google Drive와 Sheets를 중심으로 운영합니다. 추후 폼 입력 방식으로 전환하면
              상담·매출·할일 데이터가 자동으로 쌓이도록 확장할 수 있습니다.
            </p>
          </div>

          <div className="admin-link-grid">
            {workspaceLinks.map((link) => (
              <a
                className="admin-link-card"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                key={link.title}
              >
                <h3>{link.title}</h3>
                <p>{link.description}</p>
                <span>열기 →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container admin-grid">
          <div className="contact-box stretch-card">
            <p className="eyebrow">DAILY CHECK</p>
            <h2>오늘 확인할 운영 체크리스트</h2>
            <ul className="admin-checklist">
              {checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="contact-box accent-box stretch-card">
            <p className="eyebrow">SECURITY NOTE</p>
            <h2>공개 메뉴에는 노출하지 않습니다.</h2>
            <p>
              이 페이지는 대표자용 운영 입구입니다. 홈페이지에는 실제 회원정보나 매출 숫자를 직접 노출하지 않고,
              권한이 걸린 Google Drive·Sheets에서 데이터를 관리합니다.
            </p>
            <div className="notice">
              Google Sheets 파일의 직접 링크를 보내주면 매출관리, 상담응답, 문서DB, 할일 캘린더 버튼을
              각각의 파일 또는 탭으로 더 정확히 연결할 수 있습니다.
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
