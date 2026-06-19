import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/SiteChrome";

export const metadata: Metadata = {
  title: "회원 안내 | RePERFORMANCE",
  description:
    "RePERFORMANCE 상담 신청 후 수업 안내와 관리 흐름을 설명합니다.",
};

const flowItems = [
  {
    number: "01",
    title: "홈페이지에서 상담 신청",
    text: "원하는 서비스와 기본 정보, 운동 전 확인 항목을 신청서에 남깁니다.",
  },
  {
    number: "02",
    title: "상담 후 관리 방향 정리",
    text: "현재 몸 상태, 목표, 운동 가능 시간, 주의사항을 확인해 수업 방향을 정합니다.",
  },
  {
    number: "03",
    title: "수업 관리 안내",
    text: "수업이 시작되면 일정, 운동 기록, 상담 메모를 담당 코치가 관리합니다.",
  },
] as const;

const managedItems = [
  "회원 기본 카드",
  "수업 일정",
  "운동 기록",
  "컨디션 체크",
  "상담 메모",
  "진행 리포트",
] as const;

export default function MemberGuidePage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">MEMBER GUIDE</p>
          <h1>상담 후 수업 관리는 담당 코치가 안내합니다.</h1>
          <p>
            홈페이지에서는 서비스를 확인하고 상담을 신청합니다. 상담 후에는 목표, 수업 일정,
            운동 기록, 주의사항을 담당 코치가 안내하고 관리합니다.
          </p>
          <div className="button-row">
            <Link href="/apply" className="button primary">
              상담 신청하기
            </Link>
            <Link href="/services" className="button secondary">
              서비스 보기
            </Link>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">FLOW</p>
            <h2>상담 신청 이후의 관리 흐름</h2>
            <p>
              신청 내용을 바탕으로 상담을 진행하고, 수업이 필요한 경우 이후 관리 방법을 안내합니다.
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
            <p className="eyebrow">MANAGEMENT</p>
            <h2>수업이 시작되면 필요한 항목을 함께 정리합니다.</h2>
            <p>
              수업을 시작한 뒤에는 예약, 운동 기록, 피드백, 상담 메모처럼 반복적으로
              확인해야 하는 정보를 담당 코치가 관리합니다.
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
