import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/SiteChrome";

export const metadata: Metadata = {
  title: "체대입시 상담 안내 | RePERFORMANCE",
  description:
    "체대입시 상담 신청 후 목표 대학, 실기 기록, 훈련 방향을 정리하는 흐름을 안내합니다.",
};

const flowItems = [
  {
    number: "01",
    title: "공개 페이지에서 준비 흐름 확인",
    text: "입시정보, 케어 시스템, 관리 로드맵을 먼저 보고 필요한 상담을 신청합니다.",
  },
  {
    number: "02",
    title: "상담에서 목표와 기록 정리",
    text: "목표 대학, 실기 종목, 현재 기록, 운동 가능 시간, 주의사항을 확인합니다.",
  },
  {
    number: "03",
    title: "상담 후 관리 안내",
    text: "상담 후 담당 코치가 기록, 일정, 피드백 관리 방법을 안내합니다.",
  },
] as const;

const managedItems = [
  "목표 대학",
  "실기 기록",
  "훈련 계획",
  "컨디션 체크",
  "입시 일정",
  "상담 메모",
] as const;

export default function PeExamGuidePage() {
  return (
    <PageShell>
      <section className="page-hero pe-exam-hero">
        <div className="container page-title">
          <p className="eyebrow">PE EXAM GUIDE</p>
          <h1>체대입시 준비는 상담 후 방향을 정리합니다.</h1>
          <p>
            홈페이지는 체대입시 프로그램을 소개하고 상담 신청까지 이끄는 역할에
            집중합니다. 학생별 목표 대학, 실기 기록, 훈련 계획은 상담 후 담당 코치가
            확인하고 관리 방향을 안내합니다.
          </p>
          <div className="button-row">
            <Link href="/services/pe-exam" className="button primary">
              체대입시 공개 페이지
            </Link>
            <Link href="/apply?service=pe-exam" className="button secondary">
              체대입시 상담 신청
            </Link>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">FLOW</p>
            <h2>공개 안내와 상담 이후 관리를 분리합니다.</h2>
            <p>
              방문자는 홈페이지에서 프로그램을 이해하고 신청합니다. 실제 학생별 기록과
              훈련 방향은 상담 이후 담당 코치가 정리합니다.
            </p>
          </div>
          <div className="grid-3">
            {flowItems.map((item) => (
              <article className="card" key={item.number}>
                <span className="card-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid-2">
          <div className="contact-box">
            <p className="eyebrow">STUDENT MANAGEMENT</p>
            <h2>학생별 기록은 홈페이지에 저장하지 않습니다.</h2>
            <p>
              목표 대학, 실기 기록, 훈련 계획, 컨디션 체크처럼 지속적으로 관리해야
              하는 항목은 상담 후 별도로 안내합니다.
            </p>
          </div>
          <div className="contact-box accent-box">
            <p className="eyebrow">MANAGED ITEMS</p>
            <ul>
              {managedItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
