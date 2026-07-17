import { PageShell } from "../_components/SiteChrome";
import { site } from "../_components/siteData";

const dashboardCards = [
  {
    label: "오늘 상담",
    value: "상담 화면",
    note: "고객 화면과 코치 입력 화면을 나란히 열어 상담을 진행합니다.",
  },
  {
    label: "고객관리",
    value: "고객 DB",
    note: "Postgres 고객 DB에서 회원 정보를 검색하고 상태를 확인합니다.",
  },
  {
    label: "운영자료",
    value: "문서 DB",
    note: "계약서, 동의서, 평가지, 가격표, 프로그램 템플릿을 관리합니다.",
  },
  {
    label: "대표 루틴",
    value: "일일 체크",
    note: "상담, 결제, 잔여회차, 재등록 연락을 하루 단위로 확인합니다.",
  },
  {
    label: "보안 점검",
    value: "이벤트 로그",
    note: "로그인, 계정 복구, AI 승인 변경 이벤트를 개인정보 원문 없이 확인합니다.",
  },
];

const workspaceLinks = [
  {
    title: "상담 화면 열기",
    description: "고객에게 보여줄 안내 화면과 코치가 기록하는 입력 화면을 동시에 사용합니다.",
    href: "/admin/consultation",
    label: "상담 진행",
  },
  {
    title: "고객관리 열기",
    description: "회원 검색, PAR-Q 확인, 잔여회차, 목표, 불편 부위, 상담 연결을 한 화면에서 봅니다.",
    href: "/admin/clients",
    label: "고객 확인",
  },
  {
    title: "상담 가능 시간 관리",
    description: "홈페이지 신청서에 공개할 상담 날짜와 시간을 등록하고 예약 요청 상태를 확인합니다.",
    href: "/admin/availability",
    label: "예약 시간",
  },
  {
    title: "보안 이벤트 열기",
    description: "로그인 실패, 계정 복구, AI 승인 변경 같은 민감 이벤트의 최근 패턴을 확인합니다.",
    href: "/admin/security",
    label: "보안 점검",
  },
  {
    title: "매출관리 열기",
    description: "매출, 실수금, 미수금, 환불액, 월별 비교를 Google Workspace에서 관리합니다.",
    href: site.ownerWorkspaceHref,
    label: "외부 문서",
  },
  {
    title: "상담응답 열기",
    description: "홈페이지, 인스타그램, 블로그 등에서 유입된 상담자를 한 곳에서 확인합니다.",
    href: site.ownerWorkspaceHref,
    label: "외부 문서",
  },
  {
    title: "문서DB 열기",
    description: "계약서, 개인정보 동의서, 평가지, 가격표, 프로그램 템플릿을 관리합니다.",
    href: site.ownerWorkspaceHref,
    label: "외부 문서",
  },
  {
    title: "할일 캘린더 열기",
    description: "잔금 확인, 상담 연락, 콘텐츠 업로드, 재등록 상담 할일을 관리합니다.",
    href: site.ownerWorkspaceHref,
    label: "외부 문서",
  },
];

const checklist = [
  "신규 상담자: 연락 여부, 방문 목적, PAR-Q 위험 항목, 첫 평가 예약 여부 확인",
  "기존 회원: 잔여회차, 최근 불편감, 재등록 상담 필요 여부 확인",
  "상담 기록: 회원 목표, 코치 재정의 목표, 추천 Phase, 다음 액션 저장",
  "결제 확인: 입금액, 미수금, 환불액, 현금영수증/카드 내역 확인",
  "운영 문서: 계약서, 동의서, 평가지, 가격표 최신본 유지",
];

const flows = [
  "고객 목록에서 상담 대상 선택",
  "상담 화면에서 고객 안내와 코치 기록 동시 진행",
  "AI 요약으로 내부 판단 정리",
  "Postgres 저장 및 Google Drive 백업 상태 확인",
];

export default function AdminPage() {
  return (
    <PageShell>
      <section className="page-hero admin-hero">
        <div className="container page-title">
          <p className="eyebrow">OWNER WORKSPACE</p>
          <h1>RePERFORMANCE 운영관리</h1>
          <p>
            상담, 고객관리, 매출, 문서, 할일을 대표자가 빠르게 확인하는 내부 운영 입구입니다. 공개 메뉴에는 노출하지 않고,
            실제 민감정보는 권한이 걸린 Google Workspace와 연동해서 관리합니다.
          </p>
          <div className="button-row">
            <a className="button primary" href="/admin/clients">고객관리</a>
            <a className="button secondary" href="/admin/consultation">상담 화면</a>
            <a className="button secondary" href="/admin/availability">예약 시간</a>
            <form action="/api/admin/logout" method="post">
              <button className="button secondary" type="submit">로그아웃</button>
            </form>
          </div>
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
            <h2>상담과 고객관리를 먼저 열고, 나머지 운영 문서는 필요할 때 연결합니다.</h2>
            <p>
              고객 데이터는 Postgres를 중심으로 운영하고 Google Drive를 백업 저장소로 함께 사용합니다. 상담 화면과 고객관리 화면은 홈페이지 안에서 바로 열고,
              매출과 문서 DB는 기존 Workspace 링크로 이어집니다.
            </p>
          </div>

          <div className="admin-link-grid">
            {workspaceLinks.map((link) => {
              const isInternal = link.href.startsWith("/admin");

              return (
                <a
                  className="admin-link-card"
                  href={link.href}
                  target={isInternal ? undefined : "_blank"}
                  rel={isInternal ? undefined : "noopener noreferrer"}
                  key={link.title}
                >
                  <span className="card-label">{link.label}</span>
                  <h3>{link.title}</h3>
                  <p>{link.description}</p>
                  <span>열기 →</span>
                </a>
              );
            })}
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
            <p className="eyebrow">CONSULTATION FLOW</p>
            <h2>상담은 네 단계로 정리합니다.</h2>
            <ul className="admin-checklist">
              {flows.map((item, index) => (
                <li key={item}>{String(index + 1).padStart(2, "0")} · {item}</li>
              ))}
            </ul>
            <div className="notice">
              고객관리 화면에서 회원을 선택하면 상담 화면으로 바로 이동할 수 있습니다. 상담 저장은 Postgres 저장과 Google Drive 백업을 함께 사용합니다.
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
