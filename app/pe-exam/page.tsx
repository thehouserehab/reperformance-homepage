import type { Metadata } from "next";
import Link from "next/link";
import { site } from "../_components/siteData";

export const metadata: Metadata = {
  title: "체대입시 학생 시스템 | RePERFORMANCE",
  description: "목표 대학, 실기 기록, 훈련 계획, 컨디션 체크, 입시 일정 메뉴를 준비 중인 체대입시 학생용 내부 시스템 shell입니다.",
};

const menuItems = [
  ["목표 대학", "희망 대학군, 학과, 전형 기준을 정리할 공간입니다."],
  ["실기 기록", "종목별 현재 기록과 목표 기록을 비교할 공간입니다."],
  ["훈련 계획", "주간 훈련 블록과 실전 루틴을 배치할 공간입니다."],
  ["컨디션 체크", "통증, 피로도, 회복 루틴을 확인할 공간입니다."],
  ["입시 일정", "원서접수, 실기, 수능 이후 일정을 모아볼 공간입니다."],
] as const;

const previewCards = [
  ["목표 대학", "상담 후 설정", "상향·적정·안정 지원군을 나눠 표시할 예정입니다."],
  ["실기 기록", "기록 없음", "첫 측정 후 현재 기록과 목표 기록이 표시됩니다."],
  ["이번 주 훈련", "준비 중", "훈련 가능 시간과 약점 종목에 맞춰 구성됩니다."],
] as const;

export default function PeExamShellPage() {
  return (
    <main className="internal-shell internal-shell-pe">
      <aside className="internal-sidebar">
        <Link href="/" className="internal-brand" aria-label="RePERFORMANCE 홈">
          <strong>RePERFORMANCE</strong>
          <span>PE EXAM SYSTEM</span>
        </Link>
        <nav aria-label="체대입시 학생 메뉴">
          {menuItems.map(([title]) => (
            <a href={`#${title}`} key={title}>
              {title}
            </a>
          ))}
        </nav>
        <Link href="/services/pe-exam" className="internal-back-link">
          공개 페이지로 돌아가기
        </Link>
      </aside>

      <section className="internal-content">
        <header className="internal-topbar">
          <div>
            <p className="eyebrow">STUDENT SHELL</p>
            <h1>체대입시 학생용 시스템을 준비 중입니다.</h1>
            <p>
              이 화면은 실제 학생 데이터 없이 구조만 보여주는 shell입니다. 상담 후 계정이 발급되면 목표 대학, 기록,
              훈련, 컨디션, 일정이 학생별 화면으로 연결됩니다.
            </p>
          </div>
          <a className="button primary" href={site.phoneHref}>
            전화 상담
          </a>
        </header>

        <div className="internal-status-band">
          <strong>데이터 연동 전</strong>
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
