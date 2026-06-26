import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/SiteChrome";
import {
  admissionTimeline2026,
  adigaRegularAdmissionMeta,
  catalogMeta,
  faqItems,
  featuredUniversityRows,
  kusfAdmissionMeta,
  kusfRegionAdmissionGroups,
  regionFilters,
  sourceLinks,
  universityRegionGroups,
} from "./peExamData";
import styles from "./PeExamHub.module.css";

export const metadata: Metadata = {
  title: "체대입시 정보 허브 | RePERFORMANCE",
  description:
    "2026년 대입 흐름, 전국 체육관련학과 대학 목록, 수시·정시 준비 기준, FAQ와 향후 AI 입시 상담 안내를 확인하는 RePERFORMANCE 체대입시 정보 허브입니다.",
};

const hubLinks = [
  { href: "#resources", label: "공개자료" },
  { href: "#timeline", label: "2026 흐름" },
  { href: "#universities", label: "지역별 대학" },
  { href: "/pe-exam/faq", label: "FAQ" },
  { href: "#ai-consult", label: "AI 상담" },
] as const;

const resourceCards = [
  {
    label: "01",
    title: "전형 일정",
    text: "2026년 안에서 수시, 수능, 정시가 어떤 순서로 이어지는지 먼저 확인합니다.",
  },
  {
    label: "02",
    title: "지역별 대학",
    text: "KUSF 체육관련학과 대학 목록을 기준으로 수도권부터 경상권까지 나누어 봅니다.",
  },
  {
    label: "03",
    title: "수시·정시 관점",
    text: "같은 대학도 수시 준비생과 정시 준비생이 확인해야 하는 항목을 따로 정리합니다.",
  },
  {
    label: "04",
    title: "FAQ와 질문",
    text: "자주 묻는 질문은 전용 페이지에서 보고, 로그인 회원은 직접 질문을 남길 수 있습니다.",
  },
] as const;

const aiFields = [
  "내신·수능 성적",
  "실기 종목별 현재 기록",
  "희망 대학·학과",
  "운동 가능 시간",
  "부상·컨디션 메모",
  "상담에서 정리한 목표",
] as const;

const roadmapSteps = [
  ["01", "모집요강 확인", "대학별 모집단위, 전형명, 반영 비율, 실기 종목을 먼저 봅니다."],
  ["02", "현재 위치 정리", "성적, 실기 기록, 가능한 운동 시간, 몸 상태를 한 번에 정리합니다."],
  ["03", "수시·정시 분리", "수시와 정시는 확인해야 할 기준이 달라 준비 경로를 따로 봅니다."],
  ["04", "상담으로 연결", "공개자료만으로 부족한 부분은 상담에서 개인별 방향으로 정리합니다."],
] as const;

function regionId(region: string) {
  return `univ-${region.replace(/[^a-zA-Z0-9가-힣]/g, "")}`;
}

export default function PeExamPage() {
  const faqPreview = faqItems.slice(0, 4);

  return (
    <PageShell>
      <nav className={styles.hubNav} aria-label="체대입시 정보 메뉴">
        <div className={`container ${styles.hubNavInner}`}>
          {hubLinks.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className="eyebrow light-text">PE EXAM INFO HUB</p>
            <h1>체대입시 자료는 공개하고, 개인 전략은 상담에서 정리합니다.</h1>
            <p>
              RePERFORMANCE 체대입시 허브는 2026년 대입 흐름, 전국 체육관련학과 대학 목록,
              수시·정시 준비 관점, FAQ를 먼저 확인하는 공개 자료 공간입니다.
            </p>
          </div>

          <aside className={styles.heroPanel} aria-label="허브 이용 기준">
            <article>
              <strong>PUBLIC</strong>
              <h2>전형 일정과 대학 정보</h2>
              <p>누구나 볼 수 있는 공개자료로 상담 전 기본 정보를 정리합니다.</p>
            </article>
            <article>
              <strong>MEMBER</strong>
              <h2>질문과 향후 AI 상담</h2>
              <p>로그인 회원은 FAQ 페이지에서 질문을 남기고, AI 상담 기능은 도입 예정입니다.</p>
            </article>
            <article>
              <strong>CARE</strong>
              <h2>학생별 관리는 상담 후</h2>
              <p>실제 기록, 수업 피드백, 개인 메모는 상담 이후 NORE에서 안내합니다.</p>
            </article>
          </aside>
        </div>
      </section>

      <section className={`section ${styles.resourcesSection}`} id="resources">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">PUBLIC RESOURCES</p>
            <h2>공개자료는 네 가지 흐름으로 구성했습니다.</h2>
            <p>
              홈페이지는 학생 개인 기록을 받는 관리 시스템이 아니라, 입시 자료를 먼저 확인하고
              상담으로 넘어가기 위한 허브입니다.
            </p>
          </div>

          <div className={styles.resourceGrid}>
            {resourceCards.map((card) => (
              <article className={styles.resourceCard} key={card.title}>
                <span>{card.label}</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.timelineSection}`} id="timeline">
        <div className={`container ${styles.timelineLayout}`}>
          <div className={styles.timelineIntro}>
            <p className="eyebrow light-text">2026 ADMISSION FLOW</p>
            <h2>2026년 전체 흐름은 수시, 수능, 정시 순서로 봅니다.</h2>
            <p>
              아래 일정은 2027학년도 대입전형의 2026년 진행 흐름입니다. 체육계열 실기고사와
              세부 제출 일정은 대학별 모집요강에서 다시 확인해야 합니다.
            </p>
          </div>

          <ol className={styles.timelineCards}>
            {admissionTimeline2026.map((item, index) => (
              <li key={item.period}>
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <div>
                  <span>{item.period}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className={styles.sourcePanel}>
            <h3>공식 확인 경로</h3>
            <div className={styles.sourceGrid}>
              {sourceLinks.map((source) => (
                <a href={source.href} key={source.href} rel="noopener noreferrer" target="_blank">
                  <strong>{source.label}</strong>
                  <span>{source.text}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`section ${styles.universitySection}`} id="universities">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">UNIVERSITY GUIDE</p>
            <h2>지역별 대학은 전국 목록과 주요 대학 준비 항목을 함께 봅니다.</h2>
            <p>
              {catalogMeta.source}입니다. 대학별 전형, 실기 종목, 기록 기준, 등급·입결은 매년
              달라질 수 있어 공식 모집요강 확인을 우선합니다.
            </p>
          </div>

          <div className={styles.catalogStats} aria-label="체육관련학과 대학 목록 요약">
            <article>
              <span>목록 기준</span>
              <strong>{catalogMeta.count}건</strong>
              <p>전국 체육관련학과 대학</p>
            </article>
            <article>
              <span>KUSF 수시</span>
              <strong>{kusfAdmissionMeta.admissionCount}개</strong>
              <p>수시 일반전형 요약</p>
            </article>
            <article>
              <span>ADIGA 정시</span>
              <strong>{adigaRegularAdmissionMeta.admissionCount}개</strong>
              <p>정시 예체능 전형방법</p>
            </article>
            <article>
              <span>최종 기준</span>
              <strong>모집요강</strong>
              <p>실기 기록과 등급은 공식 문서 기준</p>
            </article>
          </div>

          <div className={styles.filterPills} aria-label="지역 바로가기">
            {regionFilters.map((region) => (
              <a href={region === "전체" ? "#universities" : `#${regionId(region)}`} key={region}>
                {region}
              </a>
            ))}
          </div>

          <div className={styles.kusfDataPanel}>
            <div className={styles.kusfDataHead}>
              <div>
                <p className="eyebrow">OFFICIAL DATA SNAPSHOT</p>
                <h3>수시는 KUSF, 정시는 ADIGA 기준으로 대학별 전형을 정리했습니다.</h3>
                <p>
                  {kusfAdmissionMeta.sourceName}에서 가져온 {kusfAdmissionMeta.universityCount}개 대학,
                  {kusfAdmissionMeta.universitiesWithAdmissions}개 대학의 {kusfAdmissionMeta.admissionCount}개
                  수시 전형과 {adigaRegularAdmissionMeta.sourceName}에서 가져온 {adigaRegularAdmissionMeta.universitiesWithAdmissions}개
                  대학의 {adigaRegularAdmissionMeta.admissionCount}개 정시 전형방법입니다. 실기 종목별 기록 기준과
                  전년도 입결 세부값은 대학별 모집요강 및 ADIGA 평가기준·입시결과 탭으로 별도 검수합니다.
                </p>
              </div>
              <div className={styles.dataSourceLinks}>
                <a href={kusfAdmissionMeta.sourceUrl} rel="noopener noreferrer" target="_blank">
                  KUSF 수시 확인
                </a>
                <a href={adigaRegularAdmissionMeta.sourceUrl} rel="noopener noreferrer" target="_blank">
                  ADIGA 정시 확인
                </a>
              </div>
            </div>

            <div className={styles.kusfRegionStack}>
              {kusfRegionAdmissionGroups.map((group) => {
                const admissionCount = group.universities.reduce(
                  (sum, school) => sum + school.earlyAdmissions.length,
                  0,
                );
                const regularAdmissionCount = group.universities.reduce(
                  (sum, school) => sum + school.regularAdmissions.length,
                  0,
                );

                return (
                  <details className={styles.kusfRegion} key={group.region}>
                    <summary>
                      <span>{group.region}</span>
                      <strong>
                        {group.universities.length}개 대학 · 수시 {admissionCount}개 · 정시 {regularAdmissionCount}개
                      </strong>
                    </summary>

                    <div className={styles.kusfSchoolStack}>
                      {group.universities.map((school) => (
                        <details className={styles.kusfSchoolCard} key={school.code}>
                          <summary>
                            <span>
                              {school.name}
                              {school.campus ? ` ${school.campus}` : ""}
                            </span>
                            <strong>
                              {school.area} · {school.schoolType} · 수시 {school.earlyAdmissions.length}개 · 정시{" "}
                              {school.regularAdmissions.length}개
                            </strong>
                          </summary>

                          <div className={styles.kusfTrackGrid}>
                            <section className={styles.kusfTrackBox}>
                              <h4>수시 준비생</h4>
                              {school.earlyAdmissions.length ? (
                                <div className={styles.kusfAdmissionList}>
                                  {school.earlyAdmissions.map((admission) => (
                                    <article
                                      className={styles.kusfAdmissionItem}
                                      key={`${admission.detailParams.recruitmentUnitCode}-${admission.admissionName}`}
                                    >
                                      <strong>{admission.unit}</strong>
                                      <span>{admission.admissionName}</span>
                                      <dl>
                                        <div>
                                          <dt>전형유형</dt>
                                          <dd>{admission.admissionType || "KUSF 요약 기준 확인"}</dd>
                                        </div>
                                        <div>
                                          <dt>반영요소</dt>
                                          <dd>{admission.elementSummary || "KUSF 요약 기준 확인"}</dd>
                                        </div>
                                        <div>
                                          <dt>모집인원</dt>
                                          <dd>{admission.quota || "모집요강 확인"}</dd>
                                        </div>
                                        <div>
                                          <dt>실기·기록</dt>
                                          <dd>{admission.practicalSummary}</dd>
                                        </div>
                                        <div>
                                          <dt>등급·입결</dt>
                                          <dd>{admission.gradeSummary}</dd>
                                        </div>
                                      </dl>
                                    </article>
                                  ))}
                                </div>
                              ) : (
                                <p>KUSF 수시 일반전형 요약에 전형 행이 없습니다. 대학 모집요강을 직접 확인합니다.</p>
                              )}
                            </section>

                            <section className={styles.kusfTrackBox}>
                              <h4>{school.regularGuide.title}</h4>
                              <p>{school.regularGuide.text}</p>
                              {school.regularAdmissions.length ? (
                                <div className={styles.kusfAdmissionList}>
                                  {school.regularAdmissions.map((admission) => (
                                    <article className={styles.kusfAdmissionItem} key={admission.rowId}>
                                      <strong>{admission.admissionName}</strong>
                                      <span>{admission.unitSummary}</span>
                                      <dl>
                                        <div>
                                          <dt>전형유형</dt>
                                          <dd>{admission.admissionType || "ADIGA 모집인원 기준 확인"}</dd>
                                        </div>
                                        <div>
                                          <dt>전형방법</dt>
                                          <dd>{admission.method || "ADIGA 모집인원 기준 확인"}</dd>
                                        </div>
                                        <div>
                                          <dt>실기·기록</dt>
                                          <dd>{admission.practicalSummary}</dd>
                                        </div>
                                        <div>
                                          <dt>등급·입결</dt>
                                          <dd>{admission.gradeSummary}</dd>
                                        </div>
                                      </dl>
                                    </article>
                                  ))}
                                </div>
                              ) : null}
                              {school.regularDetailUrl ? (
                                <a
                                  className={styles.kusfInlineLink}
                                  href={school.regularDetailUrl}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  ADIGA 대학 모집인원 확인
                                </a>
                              ) : null}
                            </section>
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>

          <div className={styles.featuredGrid}>
            {featuredUniversityRows.map((school) => (
              <article className={styles.featuredCard} key={school.name}>
                <div className={styles.featuredHeader}>
                  <span>{school.region}</span>
                  <h3>{school.name}</h3>
                  <p>{school.department}</p>
                </div>

                <div className={styles.trackGrid}>
                  {[school.early, school.regular].map((track) => (
                    <section className={styles.trackBox} key={track.title}>
                      <h4>{track.title}</h4>
                      <ul>
                        {track.admissions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <dl>
                        <div>
                          <dt>실기·기록</dt>
                          <dd>{track.practicals}</dd>
                        </div>
                        <div>
                          <dt>등급·입결</dt>
                          <dd>{track.grade}</dd>
                        </div>
                      </dl>
                    </section>
                  ))}
                </div>

                <a href={school.href} rel="noopener noreferrer" target="_blank">
                  공식 입학처 확인
                </a>
              </article>
            ))}
          </div>

          <div className={styles.catalogNotice}>
            <strong>전국 목록 사용 기준</strong>
            <p>{catalogMeta.note}</p>
          </div>

          <div className={styles.regionDirectory}>
            {universityRegionGroups.map((group) => (
              <section className={styles.regionBlock} id={regionId(group.region)} key={group.region}>
                <div className={styles.regionHeader}>
                  <h3>{group.region}</h3>
                  <span>{group.universities.length}개 대학</span>
                </div>
                <div className={styles.schoolList}>
                  {group.universities.map((school) => (
                    <article key={school.id}>
                      <strong>{school.name}</strong>
                      <span>
                        {school.area} · {school.schoolType}
                      </span>
                      <p>수시·정시 전형, 실기 종목, 기록 기준, 등급은 공식 모집요강에서 확인</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.roadmapSection}`} id="roadmap">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">PREPARATION ROADMAP</p>
            <h2>자료 확인 뒤에는 개인별 준비 방향을 분리합니다.</h2>
            <p>
              공개자료는 출발점입니다. 실제 준비 방향은 현재 기록, 학업 상황, 남은 기간,
              희망 대학을 놓고 상담에서 정리합니다.
            </p>
          </div>

          <ol className={styles.roadmapList}>
            {roadmapSteps.map(([number, title, text]) => (
              <li key={number}>
                <strong>{number}</strong>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`section ${styles.faqPreviewSection}`}>
        <div className={`container ${styles.faqPreviewLayout}`}>
          <div>
            <p className="eyebrow">FAQ</p>
            <h2>자주 묻는 질문은 전용 페이지에서 이어집니다.</h2>
            <p>
              기존 FAQ는 유지하되, 질문을 더 남기고 싶은 회원은 로그인 후 FAQ 페이지에서
              직접 질문을 보낼 수 있습니다.
            </p>
            <Link className="button secondary" href="/pe-exam/faq">
              FAQ 전체 보기
            </Link>
          </div>

          <div className={styles.faqList}>
            {faqPreview.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.aiSection}`} id="ai-consult">
        <div className={`container ${styles.aiLayout}`}>
          <div>
            <p className="eyebrow light-text">LIMITED ACCESS</p>
            <h2>AI 입시 상담 서비스는 로그인 회원 대상으로 도입 예정입니다.</h2>
            <p>
              본인의 성적, 운동 기록, 희망 대학, 컨디션을 입력하면 입시 방향을 제시하는
              기능을 준비하고 있습니다. 공개 페이지에서는 개인정보와 기록을 받지 않습니다.
            </p>
          </div>

          <aside className={styles.aiPanel} aria-label="AI 입시 상담 예정 입력 항목">
            <strong>도입 예정 입력 항목</strong>
            <div>
              {aiFields.map((field) => (
                <span key={field}>{field}</span>
              ))}
            </div>
            <Link className="button primary" href="/login?next=/pe-exam/faq">
              로그인 후 질문 남기기
            </Link>
          </aside>
        </div>
      </section>

      <section className={`section ${styles.consultSection}`}>
        <div className={`container ${styles.consultInner}`}>
          <div>
            <p className="eyebrow light-text">NEXT STEP</p>
            <h2>자료를 확인했다면 개인 준비 방향은 상담에서 정리합니다.</h2>
            <p>
              희망 대학, 현재 기록, 가능한 운동 시간, 몸 상태를 바탕으로 체대입시 운동·입시
              상담을 진행합니다. 상담 이후 필요한 학생에게 NORE 이용 방법을 별도로 안내합니다.
            </p>
          </div>
          <Link className="button primary" href="/apply?service=pe-exam">
            체대입시 상담 신청
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
