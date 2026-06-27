import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "../../../../_components/SiteChrome";
import {
  adigaRegularAdmissionMeta,
  adigaRegularSelectionMeta,
  catalogMeta,
  getPeExamAdmissionTrackBySlug,
  getPeExamRegionNameBySlug,
  getPeExamRegionTrackHref,
  kusfAdmissionDetailMeta,
  kusfAdmissionMeta,
  peExamAdmissionTracks,
  peExamRegionDetails,
  sourceLinks,
} from "../../../peExamData";
import styles from "../../../PeExamHub.module.css";

type TrackPageProps = {
  params: Promise<{
    region: string;
    track: string;
  }>;
};

type RegionSchool = (typeof peExamRegionDetails)[number]["universities"][number];
type RegularResultRow = {
  readonly title: string;
  readonly group: string;
  readonly unit: string;
  readonly quotaFinal: string;
  readonly competitionRate: string;
  readonly percentileAverage70: string;
  readonly englishGrade70: string;
  readonly note: string;
};
type SchoolTrackBrief = {
  stats: { label: string; value: string }[];
  groups: { label: string; items: string[] }[];
};

function getRegionDetail(slug: string) {
  const regionName = getPeExamRegionNameBySlug(slug);
  if (!regionName) return undefined;
  return peExamRegionDetails.find((region) => region.region === regionName);
}

function earlyAdmissionKey(admission: (typeof peExamRegionDetails)[number]["universities"][number]["earlyAdmissions"][number]) {
  return [
    admission.detailParams.recruitmentCode,
    admission.detailParams.selectionGroupCode,
    admission.detailParams.recruitmentUnitCode,
    admission.detailParams.recruitmentUnitSerial,
    admission.admissionName,
  ].join("-");
}

function getSchoolDisplayName(school: (typeof peExamRegionDetails)[number]["universities"][number]) {
  return `${school.name}${school.campus ? ` ${school.campus}` : ""}`;
}

function getSchoolAnchorId(
  school: (typeof peExamRegionDetails)[number]["universities"][number],
  index: number,
) {
  return `school-${school.code}-${index}`;
}

function formatSourceDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function getEarlyStatusBadges(
  admission: (typeof peExamRegionDetails)[number]["universities"][number]["earlyAdmissions"][number],
) {
  return [
    {
      label: admission.practicalTasks.length ? `실기 종목 ${admission.practicalTasks.length}개` : "실기 종목 확인 필요",
      tone: admission.practicalTasks.length ? "good" : "warn",
    },
    {
      label: admission.hasPracticalDetail ? "기록 기준 상세" : "기록 기준 확인 필요",
      tone: admission.hasPracticalDetail ? "good" : "warn",
    },
    {
      label: admission.hasGradeDetail ? "등급 산출 상세" : "등급·입결 확인 필요",
      tone: admission.hasGradeDetail ? "good" : "warn",
    },
    {
      label: admission.minimumCriteriaSummary ? "수능최저 확인" : "수능최저 별도 확인",
      tone: admission.minimumCriteriaSummary ? "neutral" : "muted",
    },
  ] as const;
}

function getRegularStatusBadges(
  admission: (typeof peExamRegionDetails)[number]["universities"][number]["regularAdmissions"][number],
) {
  return [
    {
      label: admission.units.length ? `모집단위 ${admission.units.length}개` : "모집단위 확인 필요",
      tone: admission.units.length ? "good" : "warn",
    },
    {
      label: admission.practicalTasks.length
        ? `실기 종목 ${admission.practicalTasks.length}개`
        : admission.method.includes("실기")
          ? "실기 반영 확인"
          : "실기 반영 없음",
      tone: admission.practicalTasks.length || admission.method.includes("실기") ? "neutral" : "muted",
    },
    {
      label: admission.hasResultDetail ? "입결 표 연결" : "등급·입결 별도 확인",
      tone: admission.hasResultDetail ? "good" : "warn",
    },
  ] as const;
}

function uniqueBriefItems(items: readonly string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function compactBriefText(value: string, maxLength = 110) {
  const normalized = value
    .replace(/^KUSF 상세 기준:\s*/, "")
    .replace(/^ADIGA 정시 전형방법 기준\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function hasPositivePracticalMethod(method: string) {
  const practicalMatch = method.match(/실기\s*:\s*(\d+)/);
  if (practicalMatch?.[1]) return Number(practicalMatch[1]) > 0;
  return method.includes("실기");
}

function formatResultMetric(value: string, suffix = "") {
  return value ? `${value}${suffix}` : "공개값 없음";
}

function getEarlySchoolBrief(school: RegionSchool): SchoolTrackBrief {
  const admissions = school.earlyAdmissions;
  const practicalTasks = uniqueBriefItems(admissions.flatMap((admission) => admission.practicalTasks)).slice(0, 10);
  const practicalCriteriaItems = uniqueBriefItems(
    admissions.flatMap((admission) => admission.practicalCriteriaItems),
  ).slice(0, 5);
  const practicalSummaries = uniqueBriefItems(
    admissions
      .map((admission) => compactBriefText(admission.practicalSummary))
      .filter((summary) => summary && !summary.includes("항목 없음")),
  ).slice(0, 3);
  const gradeSummaries = uniqueBriefItems(
    admissions.map((admission) => compactBriefText(admission.gradeSummary)).filter(Boolean),
  ).slice(0, 3);
  const minimumSummaries = uniqueBriefItems(
    admissions.map((admission) => compactBriefText(admission.minimumCriteriaSummary, 90)).filter(Boolean),
  ).slice(0, 2);

  return {
    stats: [
      { label: "수시 전형", value: `${admissions.length}개` },
      { label: "실기 상세", value: `${admissions.filter((admission) => admission.hasPracticalDetail).length}개` },
      { label: "등급 상세", value: `${admissions.filter((admission) => admission.hasGradeDetail).length}개` },
      { label: "수능최저", value: `${minimumSummaries.length}건` },
    ],
    groups: [
      { label: "주요 실기 종목", items: practicalTasks },
      { label: "기록 기준", items: practicalCriteriaItems },
      { label: "기록 기준 힌트", items: practicalSummaries },
      { label: "등급·최저 힌트", items: uniqueBriefItems([...gradeSummaries, ...minimumSummaries]).slice(0, 4) },
    ].filter((group) => group.items.length > 0),
  };
}

function getRegularSchoolBrief(school: RegionSchool): SchoolTrackBrief {
  const admissions = school.regularAdmissions;
  const selectionDetail = school.regularSelectionDetail;
  const units = uniqueBriefItems(admissions.flatMap((admission) => admission.units.map((unit) => unit.name))).slice(0, 10);
  const practicalTasks = uniqueBriefItems(admissions.flatMap((admission) => admission.practicalTasks)).slice(0, 10);
  const practicalCriteriaItems = uniqueBriefItems(
    admissions.flatMap((admission) => admission.practicalCriteriaItems),
  ).slice(0, 5);
  const methodSummaries = uniqueBriefItems(
    admissions.map((admission) => compactBriefText(admission.method, 110)).filter(Boolean),
  ).slice(0, 3);
  const practicalSummaries = uniqueBriefItems(
    admissions
      .filter((admission) => hasPositivePracticalMethod(admission.method))
      .map((admission) => compactBriefText(admission.practicalSummary, 110)),
  ).slice(0, 3);
  const selectionSummaries = uniqueBriefItems(
    [
      ...(selectionDetail?.resultHighlights || []).map((item) => compactBriefText(item, 120)),
      ...(selectionDetail?.criteriaHighlights || []).map((item) => compactBriefText(item, 120)),
    ],
  ).slice(0, 5);

  return {
    stats: [
      { label: "정시 전형", value: `${admissions.length}개` },
      {
        label: "모집단위",
        value: `${admissions.reduce((sum, admission) => sum + admission.units.length, 0)}개`,
      },
      { label: "실기 반영", value: `${admissions.filter((admission) => hasPositivePracticalMethod(admission.method)).length}개` },
      { label: "입결 표", value: selectionDetail?.hasResultTable ? `${selectionDetail.resultRows.length}건` : "확인 필요" },
    ],
    groups: [
      { label: "모집단위", items: units },
      { label: "전형방법", items: methodSummaries },
      { label: "실기 종목", items: practicalTasks },
      { label: "실기 기준", items: practicalCriteriaItems },
      { label: "실기 반영 힌트", items: practicalSummaries },
      { label: "평가기준·입결", items: selectionSummaries },
    ].filter((group) => group.items.length > 0),
  };
}

export function generateStaticParams() {
  return peExamRegionDetails.flatMap((region) =>
    peExamAdmissionTracks.map((track) => ({
      region: region.slug,
      track: track.key,
    })),
  );
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { region: regionSlug, track: trackSlug } = await params;
  const region = getRegionDetail(regionSlug);
  const track = getPeExamAdmissionTrackBySlug(trackSlug);

  if (!region || !track) {
    return {
      title: "체대입시 전형별 대학 정보 | RePERFORMANCE",
    };
  }

  return {
    title: `${region.region} ${track.label} 준비 페이지 | RePERFORMANCE`,
    description: `${region.region} 체육관련학과 대학 정보를 ${track.studentLabel} 기준으로 분리해 전형, 실기, 등급 확인 지점을 안내합니다.`,
  };
}

export default async function PeExamRegionTrackPage({ params }: TrackPageProps) {
  const { region: regionSlug, track: trackSlug } = await params;
  const region = getRegionDetail(regionSlug);
  const track = getPeExamAdmissionTrackBySlug(trackSlug);

  if (!region || !track) notFound();

  const isEarly = track.key === "early";
  const alternateTrack = peExamAdmissionTracks.find((item) => item.key !== track.key)!;
  const sourceLink = isEarly ? sourceLinks[2] : sourceLinks[1];
  const admissionCount = isEarly ? region.earlyAdmissionCount : region.regularAdmissionCount;
  const detailCount = isEarly ? region.practicalDetailCount : region.regularUnitCount;
  const detailLabel = isEarly ? "실기 상세" : "모집단위";
  const sortedSchools = [...region.universities].sort((a, b) => {
    const aCount = isEarly ? a.earlyAdmissions.length : a.regularAdmissions.length;
    const bCount = isEarly ? b.earlyAdmissions.length : b.regularAdmissions.length;
    return bCount - aCount || a.name.localeCompare(b.name, "ko");
  });
  const schoolsWithTrack = sortedSchools.filter((school) =>
    isEarly ? school.earlyAdmissions.length > 0 : school.regularAdmissions.length > 0,
  );
  const schoolsWithoutTrack = sortedSchools.length - schoolsWithTrack.length;
  const sourceCards = isEarly
    ? [
        {
          label: "KUSF 수시 요약",
          title: `${region.earlyAdmissionCount}개 수시 전형`,
          text: `${kusfAdmissionMeta.schoolYear}학년도 수시 일반전형 요약입니다. 생성 기준일은 ${formatSourceDate(kusfAdmissionMeta.generatedAt)}입니다.`,
          href: kusfAdmissionMeta.sourceUrl,
        },
        {
          label: "KUSF 실기·등급 상세",
          title: `실기 상세 ${region.practicalDetailCount}개 · 등급 상세 ${region.gradeDetailCount}개`,
          text: `${formatSourceDate(kusfAdmissionDetailMeta.generatedAt)} 기준 상세 탭 연결 자료입니다. 종목별 만점 기록표는 모집요강 PDF에서 추가 확인이 필요할 수 있습니다.`,
          href: kusfAdmissionDetailMeta.sourceUrl,
        },
      ]
    : [
        {
          label: "ADIGA 정시 전형방법",
          title: `${region.regularAdmissionCount}개 정시 전형 · ${region.regularUnitCount}개 모집단위`,
          text: `${adigaRegularAdmissionMeta.schoolYear}학년도 정시 예체능계열 전형방법 요약입니다. 생성 기준일은 ${formatSourceDate(adigaRegularAdmissionMeta.generatedAt)}입니다.`,
          href: adigaRegularAdmissionMeta.sourceUrl,
        },
        {
          label: "ADIGA 평가기준·입시결과",
          title: `${adigaRegularSelectionMeta.universitiesWithResults}개 대학 · ${adigaRegularSelectionMeta.resultRowCount}개 입결 행`,
          text: `${adigaRegularSelectionMeta.resultYear}학년도 전형 결과 표와 ${adigaRegularSelectionMeta.universitiesWithCriteria}개 대학의 정시 평가기준 요약을 함께 연결했습니다.`,
          href: adigaRegularSelectionMeta.sourceUrl,
        },
      ];

  return (
    <PageShell>
      <nav className={styles.hubNav} aria-label={`${region.region} ${track.label} 전형 메뉴`}>
        <div className={`container ${styles.hubNavInner}`}>
          <Link href="/pe-exam#universities">지역 전체</Link>
          <Link href={region.href}>{region.region} 전형 선택</Link>
          {peExamAdmissionTracks.map((item) => (
            <Link
              aria-current={item.key === track.key ? "page" : undefined}
              href={getPeExamRegionTrackHref(region.region, item.key)}
              key={item.key}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <section className={styles.regionDetailHero}>
        <div className={`container ${styles.regionDetailHeroInner}`}>
          <div>
            <p className="eyebrow light-text">{isEarly ? "EARLY ADMISSION PAGE" : "REGULAR ADMISSION PAGE"}</p>
            <h1>
              {region.region} {track.label} 준비 페이지
            </h1>
            <p>
              {track.studentLabel}이 먼저 확인해야 하는 대학별 전형만 따로 모았습니다. 같은 지역 안에서도
              수시와 정시는 보는 기준이 다르므로, 이 페이지에서는 {track.label} 기준의 모집단위·실기·등급
              확인 지점만 이어서 정리합니다.
            </p>
          </div>

          <aside className={styles.regionDetailStats} aria-label={`${region.region} ${track.label} 데이터 요약`}>
            <div>
              <span>목록 대학</span>
              <strong>{region.catalogCount}개</strong>
            </div>
            <div>
              <span>{track.label} 전형</span>
              <strong>{admissionCount}개</strong>
            </div>
            <div>
              <span>{detailLabel}</span>
              <strong>{detailCount}개</strong>
            </div>
            <div>
              <span>기준 자료</span>
              <strong>{track.sourceLabel}</strong>
            </div>
          </aside>
        </div>
      </section>

      <section className={`section ${styles.regionDetailSection}`}>
        <div className="container">
          <div className={styles.regionDetailGuide}>
            <article>
              <strong>이 페이지 기준</strong>
              <p>{track.sourceDescription}으로 {track.label} 준비생에게 필요한 행만 분리했습니다.</p>
            </article>
            <article>
              <strong>{isEarly ? "수시 확인 순서" : "정시 확인 순서"}</strong>
              <p>
                {isEarly
                  ? "전형유형, 모집단위, 학생부·실기 반영요소, 수능최저를 먼저 확인합니다."
                  : "모집군 흐름, 수능 반영 방식, 실기 반영 여부, 모집단위를 먼저 확인합니다."}
              </p>
            </article>
            <article>
              <strong>공식 자료 연결</strong>
              <p>실기 종목별 기록표와 전년도 입결 세부값은 대학 모집요강과 공식 자료 탭에서 재확인합니다.</p>
            </article>
          </div>

          <div className={styles.trackSwitchBar} aria-label="전형 페이지 전환">
            <Link href={region.href}>{region.region} 전형 선택으로</Link>
            <Link href={getPeExamRegionTrackHref(region.region, alternateTrack.key)}>
              {alternateTrack.label} 페이지로 전환
            </Link>
            <a href={sourceLink.href} rel="noopener noreferrer" target="_blank">
              {sourceLink.label} 확인
            </a>
          </div>

          <div className={styles.catalogNotice}>
            <strong>확인 기준</strong>
            <p>{catalogMeta.note}</p>
          </div>

          <section className={styles.trackSourceGrid} aria-label={`${region.region} ${track.label} 공식 자료 기준`}>
            {sourceCards.map((source) => (
              <article key={source.label}>
                <span>{source.label}</span>
                <h2>{source.title}</h2>
                <p>{source.text}</p>
                <a href={source.href} rel="noopener noreferrer" target="_blank">
                  공식 자료 확인
                </a>
              </article>
            ))}
          </section>

          <section className={styles.trackSummaryPanel} aria-label={`${region.region} ${track.label} 대학 바로가기`}>
            <div className={styles.trackSummaryHead}>
              <div>
                <p className="eyebrow">UNIVERSITY INDEX</p>
                <h2>{region.region} {track.label} 대학 바로가기</h2>
                <p>
                  대학 이름을 누르면 해당 대학의 {track.label} 전형 카드로 이동합니다. 공식 자료에 전형 행이 없는
                  대학도 목록에 남겨 별도 모집요강 확인 대상으로 구분했습니다.
                </p>
              </div>
              <dl className={styles.trackSummaryStats}>
                <div>
                  <dt>전형 행 있음</dt>
                  <dd>{schoolsWithTrack.length}개</dd>
                </div>
                <div>
                  <dt>별도 확인</dt>
                  <dd>{schoolsWithoutTrack}개</dd>
                </div>
              </dl>
            </div>

            <div className={styles.universityJumpGrid}>
              {sortedSchools.map((school, index) => {
                const trackCount = isEarly ? school.earlyAdmissions.length : school.regularAdmissions.length;

                return (
                  <a
                    className={styles.universityJumpCard}
                    data-empty={trackCount === 0 ? "true" : undefined}
                    href={`#${getSchoolAnchorId(school, index)}`}
                    key={`${school.code}-${index}`}
                  >
                    <strong>{getSchoolDisplayName(school)}</strong>
                    <span>{school.area} · {school.schoolType}</span>
                    <em>{trackCount > 0 ? `${track.label} 전형 ${trackCount}개` : "공식 전형 행 없음"}</em>
                  </a>
                );
              })}
            </div>
          </section>

          <div className={styles.kusfSchoolStack}>
            {sortedSchools.map((school, index) => {
              const trackCount = isEarly ? school.earlyAdmissions.length : school.regularAdmissions.length;
              const schoolBrief = isEarly ? getEarlySchoolBrief(school) : getRegularSchoolBrief(school);
              const regularResultRows = (school.regularSelectionDetail?.resultRows || []) as readonly RegularResultRow[];

              return (
                <details
                  className={styles.kusfSchoolCard}
                  id={getSchoolAnchorId(school, index)}
                  key={`${school.code}-${index}`}
                  open={index < 4 && trackCount > 0}
                >
                  <summary>
                    <span>{getSchoolDisplayName(school)}</span>
                    <strong>
                      {school.area} · {school.schoolType} · {track.label} {trackCount}개
                    </strong>
                  </summary>

                  <div className={styles.trackOnlyBody}>
                    {trackCount > 0 ? (
                      <div
                        className={styles.schoolTrackBrief}
                        aria-label={`${getSchoolDisplayName(school)} ${track.label} 핵심 요약`}
                      >
                        <dl className={styles.schoolTrackBriefStats}>
                          {schoolBrief.stats.map((stat) => (
                            <div key={stat.label}>
                              <dt>{stat.label}</dt>
                              <dd>{stat.value}</dd>
                            </div>
                          ))}
                        </dl>
                        {schoolBrief.groups.length ? (
                          <div className={styles.schoolTrackBriefGroups}>
                            {schoolBrief.groups.map((group) => (
                              <div className={styles.schoolTrackBriefGroup} key={group.label}>
                                <strong>{group.label}</strong>
                                <ul className={styles.schoolTrackChipList}>
                                  {group.items.map((item, itemIndex) => (
                                    <li key={`${group.label}-${itemIndex}-${item}`}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {isEarly ? (
                      school.earlyAdmissions.length ? (
                        <div className={styles.kusfAdmissionList}>
                          {school.earlyAdmissions.map((admission) => (
                            <article className={styles.kusfAdmissionItem} key={earlyAdmissionKey(admission)}>
                              <strong>{admission.unit}</strong>
                              <span>{admission.admissionName}</span>
                              <div className={styles.dataStatusBadges} aria-label="자료 상태">
                                {getEarlyStatusBadges(admission).map((badge) => (
                                  <em data-tone={badge.tone} key={badge.label}>
                                    {badge.label}
                                  </em>
                                ))}
                              </div>
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
                                  <dt>실기 종목</dt>
                                  <dd>
                                    {admission.practicalTasks.length
                                      ? admission.practicalTasks.slice(0, 6).join(", ")
                                      : "KUSF 상세 탭 또는 대학 모집요강 확인"}
                                  </dd>
                                </div>
                                <div>
                                  <dt>기록 기준</dt>
                                  <dd>{admission.practicalSummary}</dd>
                                </div>
                                <div>
                                  <dt>등급·입결</dt>
                                  <dd>{admission.gradeSummary}</dd>
                                </div>
                                {admission.minimumCriteriaSummary ? (
                                  <div>
                                    <dt>수능최저</dt>
                                    <dd>{admission.minimumCriteriaSummary}</dd>
                                  </div>
                                ) : null}
                              </dl>
                              {admission.practicalTasks.length ? (
                                <ul className={styles.practicalTaskList} aria-label="실기 과제">
                                  {admission.practicalTasks.slice(0, 8).map((task, taskIndex) => (
                                    <li key={`${admission.admissionName}-${taskIndex}-${task}`}>{task}</li>
                                  ))}
                                </ul>
                              ) : null}
                              {admission.practicalCriteriaItems.length ? (
                                <div className={styles.practicalCriteriaBox}>
                                  <strong>기록 기준 체크포인트</strong>
                                  <ul className={styles.practicalCriteriaList}>
                                    {admission.practicalCriteriaItems.map((item, itemIndex) => (
                                      <li key={`${admission.admissionName}-criteria-${itemIndex}-${item}`}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {admission.detailUrl ? (
                                <a
                                  className={styles.kusfItemLink}
                                  href={admission.detailUrl}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  KUSF 전형 상세 확인
                                </a>
                              ) : null}
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.trackOnlyEmpty}>
                          KUSF 수시 일반전형 요약에 전형 행이 없습니다. 대학 모집요강을 직접 확인합니다.
                        </p>
                      )
                    ) : (
                      <>
                        <p className={styles.trackOnlyIntro}>{school.regularGuide.text}</p>
                        {school.regularAdmissions.length ? (
                          <div className={styles.kusfAdmissionList}>
                            {school.regularAdmissions.map((admission, admissionIndex) => (
                              <article
                                className={styles.kusfAdmissionItem}
                                key={`${admission.rowId}-${admission.admissionCode}-${admissionIndex}`}
                              >
                                <strong>{admission.admissionName}</strong>
                                <span>{admission.unitSummary}</span>
                                <div className={styles.dataStatusBadges} aria-label="자료 상태">
                                  {getRegularStatusBadges(admission).map((badge) => (
                                    <em data-tone={badge.tone} key={badge.label}>
                                      {badge.label}
                                    </em>
                                  ))}
                                </div>
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
                                    <dt>실기·기록 기준</dt>
                                    <dd>{admission.practicalSummary}</dd>
                                  </div>
                                  <div>
                                    <dt>등급·입결</dt>
                                    <dd>{admission.gradeSummary}</dd>
                                  </div>
                                </dl>
                                {admission.practicalTasks.length || admission.practicalCriteriaItems.length ? (
                                  <div className={styles.practicalCriteriaBox}>
                                    <strong>정시 실기 확인 포인트</strong>
                                    {admission.practicalTasks.length ? (
                                      <ul className={styles.practicalTaskList} aria-label="정시 실기 종목">
                                        {admission.practicalTasks.slice(0, 8).map((task, taskIndex) => (
                                          <li key={`${admission.admissionName}-regular-task-${taskIndex}-${task}`}>
                                            {task}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                    {admission.practicalCriteriaItems.length ? (
                                      <ul className={styles.practicalCriteriaList}>
                                        {admission.practicalCriteriaItems.map((item, itemIndex) => (
                                          <li key={`${admission.admissionName}-regular-criteria-${itemIndex}-${item}`}>
                                            {item}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                  </div>
                                ) : null}
                              </article>
                            ))}
                          </div>
                        ) : null}
                        {regularResultRows.length ? (
                          <div className={styles.regularResultPanel}>
                            <strong>ADIGA 입시결과 요약</strong>
                            <div className={styles.regularResultList}>
                              {regularResultRows.slice(0, 4).map((row, rowIndex) => (
                                <div
                                  className={styles.regularResultItem}
                                  key={`${row.title}-${row.group}-${row.unit}-${rowIndex}`}
                                >
                                  <div className={styles.regularResultItemHead}>
                                    <strong>{row.unit}</strong>
                                    <span>{row.title || row.group}</span>
                                  </div>
                                  {row.note ? (
                                    <p>{row.note}</p>
                                  ) : (
                                    <dl>
                                      <div>
                                        <dt>최종모집</dt>
                                        <dd>{formatResultMetric(row.quotaFinal, "명")}</dd>
                                      </div>
                                      <div>
                                        <dt>경쟁률</dt>
                                        <dd>{formatResultMetric(row.competitionRate, ":1")}</dd>
                                      </div>
                                      <div>
                                        <dt>70% 평균</dt>
                                        <dd>{formatResultMetric(row.percentileAverage70)}</dd>
                                      </div>
                                      <div>
                                        <dt>영어 70%</dt>
                                        <dd>{formatResultMetric(row.englishGrade70, "등급")}</dd>
                                      </div>
                                    </dl>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {school.regularDetailUrl ? (
                          <a
                            className={styles.kusfInlineLink}
                            href={school.regularDetailUrl}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            ADIGA 평가기준·입시결과 확인
                          </a>
                        ) : null}
                      </>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
