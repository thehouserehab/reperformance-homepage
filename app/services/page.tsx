import Link from "next/link";
import PeExamWindowLink from "../_components/PeExamWindowLink";
import { PageShell } from "../_components/SiteChrome";
import { serviceItems } from "../_components/siteData";

const serviceOrder: Record<string, number> = {
  "senior-rehab": 0,
  "athlete-reconditioning": 1,
  "pe-exam": 2,
  "pain-care": 3,
};

const serviceTone = {
  "senior-rehab": "회복",
  "athlete-reconditioning": "복귀",
  "pe-exam": "입시",
  "pain-care": "관리",
} as const;

const serviceDisplayTitles = {
  "senior-rehab": "시니어 재활",
  "athlete-reconditioning": "선수 케어·퍼포먼스",
  "pe-exam": "체대입시",
  "pain-care": "일반 재활",
} as const;

const serviceSummaries = {
  "senior-rehab": "보행, 균형, 하체 근력, 일상 동작 회복이 필요할 때",
  "athlete-reconditioning": "부상 이후 복귀와 경기력 회복을 단계적으로 준비할 때",
  "pe-exam": "대학 정보 확인과 실기 기록 향상을 함께 관리해야 할 때",
  "pain-care": "어깨, 허리, 무릎 불편감과 기초 체력 저하를 관리할 때",
} as const;

export default function ServicesPage() {
  const orderedServices = [...serviceItems].sort(
    (a, b) => (serviceOrder[a.applicationValue] ?? 99) - (serviceOrder[b.applicationValue] ?? 99),
  );

  return (
    <PageShell>
      <section className="service-choice-hero">
        <div className="container service-choice-hero-inner">
          <p className="eyebrow">BROWSE SERVICES</p>
          <h1>지금 필요한 목적을 먼저 선택하세요.</h1>
          <p>
            긴 설명보다 선택이 먼저입니다. 목적을 고르면 해당 서비스의 상담 흐름과 준비 방향으로 이동합니다.
          </p>
        </div>
      </section>

      <section className="service-choice-section" aria-label="서비스 선택">
        <div className="container service-choice-grid">
          {orderedServices.map((item, index) => {
            const tone = serviceTone[item.applicationValue as keyof typeof serviceTone] || "상담";
            const displayTitle = serviceDisplayTitles[item.applicationValue as keyof typeof serviceDisplayTitles] || item.title;
            const summary = serviceSummaries[item.applicationValue as keyof typeof serviceSummaries] || item.target;
            const card = (
              <>
                <div className="service-choice-card-top">
                  <span className="service-choice-kicker">{tone}</span>
                  <span className="service-choice-index">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div>
                  <p className="card-label">{item.label}</p>
                  <h2>{displayTitle}</h2>
                  <p>{summary}</p>
                </div>
                <span className="service-choice-link">선택하기</span>
              </>
            );

            if (item.applicationValue === "pe-exam") {
              return (
                <PeExamWindowLink
                  href={item.href}
                  className={`service-choice-card interactive-card service-choice-card-featured service-choice-card-${item.applicationValue}`}
                  key={item.href}
                >
                  {card}
                </PeExamWindowLink>
              );
            }

            return (
              <Link
                href={item.href}
                className={`service-choice-card interactive-card service-choice-card-${item.applicationValue}`}
                key={item.href}
              >
                {card}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="service-choice-apply">
        <div className="container service-choice-apply-inner">
          <div>
            <p className="eyebrow">NOT SURE YET</p>
            <h2>어떤 서비스를 골라야 할지 모르겠다면 상담에서 먼저 정리합니다.</h2>
          </div>
          <Link href="/apply" className="button primary">
            상담 신청하기
          </Link>
        </div>
      </section>

    </PageShell>
  );
}
