import type { Metadata } from "next";
import Link from "next/link";
import { site } from "../_components/siteData";

export const metadata: Metadata = {
  title: "회원 시스템 | RePERFORMANCE",
  description: "목표, 수업 일정, 운동 기록, 컨디션 체크, 상담 메모 메뉴를 준비 중인 일반 회원용 내부 시스템 shell입니다.",
};

const menuItems = [
  ["목표", "상담 후 정한 회복 목표와 운동 목표를 확인할 공간입니다."],
  ["수업 일정", "예약된 수업과 다음 방문 일정을 확인할 공간입니다."],
  ["운동 기록", "수업별 운동 내용과 변화 기록을 모아볼 공간입니다."],
  ["컨디션 체크", "통증, 피로, 수면, 회복 상태를 확인할 공간입니다."],
  ["상담 메모", "코치와 공유한 상담 메모를 정리할 공간입니다."],
] as const;

const previewCards = [
  ["현재 목표", "상담 후 설정", "첫 상담에서 정한 우선순위가 표시됩니다."],
  ["다음 수업", "일정 없음", "회원 계정 발급 후 수업 일정이 연결됩니다."],
  ["컨디션", "체크 전", "통증과 피로도 기록을 준비 중입니다."],
] as const;

export default function MemberShellPage() {
  return (
    <main className="internal-shell internal-shell-member">
      <aside className="internal-sidebar">
        <Link href="/" className="internal-brand" aria-label="RePERFORMANCE 홈">
          <strong>RePERFORMANCE</strong>
          <span>MEMBER SYSTEM</span>
        </Link>
        <nav aria-label="일반 회원 메뉴">
          {menuItems.map(([title]) => (
            <a href={`#${title}`} key={title}>
              {title}
            </a>
          ))}
        </nav>
        <Link href="/apply" className="internal-back-link">
          상담 신청으로 이동
        </Link>
      </aside>

      <section className="internal-content">
        <header className="internal-topbar">
          <div>
            <p className="eyebrow">MEMBER SHELL</p>
            <h1>일반 회원용 개인 화면을 준비 중입니다.</h1>
            <p>
              이 화면은 실제 회원 데이터 없이 구조만 보여주는 shell입니다. 상담 후 계정이 발급되면 목표, 수업 일정,
              운동 기록, 컨디션 체크, 상담 메모가 개인 화면으로 연결됩니다.
            </p>
          </div>
          <a className="button primary" href={site.phoneHref}>
            전화 상담
          </a>
        </header>

        <div className="internal-status-band">
          <strong>계정 발급 전</strong>
          <span>로그인, DB, 외부 문서, 개인정보 저장 기능은 아직 연결하지 않았습니다.</span>
        </div>

        <div className="internal-metric-grid">
          {previewCards.map(([label, value, text]) => (
            <article className="internal-metric-card" key={label}>
              <p>{label}</p>
              <strong>{value}</strong>
              <span>{text}</span>
            </article>
          ))}
        </div>

        <div className="internal-module-grid">
          {menuItems.map(([title, text]) => (
            <article id={title} className="internal-module-card" key={title}>
              <span>READY</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
