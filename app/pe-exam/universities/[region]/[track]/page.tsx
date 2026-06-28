import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "../../../../_components/SiteChrome";
import {
  adigaRegularAdmissionMeta,
  adigaRegularSelectionMeta,
  catalogMeta,
  getPeExamAdmissionTrackBySlug,
  getPeExamRegionDetailBySlug,
  getPeExamRegionTrackHref,
  getPeExamSchoolTrackHref,
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
type SchoolTrackBrief = {
  stats: { label: string; value: string }[];
  groups: { label: string; items: string[] }[];
};

function formatSourceDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function getSchoolDisplayName(school: RegionSchool) {
  return `${school.name}${school.campus ? ` ${school.campus}` : ""}`;
}

function uniqueBriefItems(items: readonly string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function compactBriefText(value: string, maxLength = 90) {
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

function hasEarlyPracticalRequirement(admission: RegionSchool["earlyAdmissions"][number]) {
  const elementPracticalMatch = admission.elementSummary.match(/실기\s*:\s*(\d+(?:\.\d+)?)/);
  if (elementPracticalMatch?.[1]) return Number(elementPracticalMatch[1]) > 0;
  if (admission.practicalSummary.includes("실기 반영 항목 없음")) return false;

  return (
    admission.elementSummary.includes("실기") ||
    admission.hasPracticalDetail ||
    admission.practicalTasks.length > 0 ||
    admission.practicalCriteriaItems.length > 0
  );
}

function hasEarlyPracticalRecordDetail(admission: RegionSchool["earlyAdmissions"][number]) {
  return (
    hasEarlyPracticalRequirement(admission) &&
    (admission.hasPracticalDetail || admission.practicalTasks.length > 0 || admission.practicalCriteriaItems.length > 0)
  );
}

function getEarlySchoolBrief(school: RegionSchool): SchoolTrackBrief {
  const admissions = school.earlyAdmissions;
  const practicalAdmissions = admissions.filter(hasEarlyPracticalRequirement);
  const practicalResolvedCount = practicalAdmissions.filter(hasEarlyPracticalRecordDetail).length;
  const practicalTasks = uniqueBriefItems(admissions.flatMap((admission) => admission.practicalTasks)).slice(0, 8);
  const practicalCriteriaItems = uniqueBriefItems(
    admissions.flatMap((admission) => admission.practicalCriteriaItems),
  ).slice(0, 4);
  const gradeSummaries = uniqueBriefItems(
    admissions.map((admission) => compactBriefText(admission.gradeSummary)).filter(Boolean),
  ).slice(0, 3);

  return {
    stats: [
      { label: "수시 전형", value: `${admissions.length}개` },
      { label: "실기 대상", value: `${practicalAdmissions.length}개` },
      { label: "실기 기준", value: practicalAdmissions.length ? `${practicalResolvedCount}/${practicalAdmissions.length}` : "해당 없음" },
      { label: "등급 상세", value: `${admissions.filter((admission) => admission.hasGradeDetail).length}개` },
    ],
    groups: [
      { label: "실기 종목", items: practicalTasks },
      { label: "기록 기준", items: practicalCriteriaItems },
      { label: "등급 기준", items: gradeSummaries },
    ].filter((group) => group.items.length > 0),
  };
}

function getRegularSchoolBrief(school: RegionSchool): SchoolTrackBrief {
  const admissions = school.regularAdmissions;
  const selectionDetail = school.regularSelectionDetail;
  const units = uniqueBriefItems(admissions.flatMap((admission) => admission.units.map((unit) => unit.name))).slice(0, 8);
  const practicalTasks = uniqueBriefItems(admissions.flatMap((admission) => admission.practicalTasks)).slice(0, 8);
  const practicalCriteriaItems = uniqueBriefItems(
    admissions.flatMap((admission) => admission.practicalCriteriaItems),
  ).slice(0, 4);
  const resultSummaries = uniqueBriefItems(
    (selectionDetail?.resultHighlights || []).map((item) => compactBriefText(item, 100)),
  ).slice(0, 3);

  return {
    stats: [
      { label: "정시 전형", value: `${admissions.length}개` },
      { label: "모집단위", value: `${admissions.reduce((sum, admission) => sum + admission.units.length, 0)}개` },
      { label: "실기 대상", value: `${admissions.filter((admission) => hasPositivePracticalMethod(admission.method)).length}개` },
      { label: "입결 행", value: selectionDetail?.hasResultTable ? `${selectionDetail.resultRows.length}건` : "확인 필요" },
    ],
    groups: [
      { label: "모집단위", items: units },
      { label: "실기 종목", items: practicalTasks },
      { label: "실기 기준", items: practicalCriteriaItems },
      { label: "등급컷·입결", items: resultSummaries },
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
  const region = getPeExamRegionDetailBySlug(regionSlug);
  const track = getPeExamAdmissionTrackBySlug(trackSlug);

  if (!region || !track) {
    return {
      title: "체대입시 전형별 대학 정보 | RePERFORMANCE",
    };
  }

  return {
    title: `${region.region} ${track.label} 대학 목록 | RePERFORMANCE`,
    description: `${region.region} 체육관련학과 대학을 ${track.studentLabel} 기준으로 분리해 대학별 상세 페이지로 안내합니다.`,
  };
}

export default async function PeExamRegionTrackPage({ params }: TrackPageProps) {
  const { region: regionSlug, track: trackSlug } = await params;
  const region = getPeExamRegionDetailBySlug(regionSlug);
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
          text: `${formatSourceDate(kusfAdmissionDetailMeta.generatedAt)} 기준 상세 탭 연결 자료입니다. 대학별 상세 페이지에서 전형별 실기·등급 확인 지점을 봅니다.`,
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
          text: `${adigaRegularSelectionMeta.resultYear}학년도 전형 결과 표와 ${adigaRegularSelectionMeta.universitiesWithCriteria}개 대학의 정시 평가기준 요약을 연결했습니다.`,
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
            <p className="eyebrow light-text">{isEarly ? "EARLY UNIVERSITY LIST" : "REGULAR UNIVERSITY LIST"}</p>
            <h1>
              {region.region} {track.label} 대학 목록
            </h1>
            <p>
              이 페이지는 {track.studentLabel}이 볼 대학을 고르는 목록입니다. 대학별 전형, 등급컷·입결,
              실기 종목과 기록 기준은 각 대학 상세 페이지에서 따로 확인합니다.
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
              <strong>목록 페이지 기준</strong>
              <p>대학별 상세 정보는 긴 스크롤 대신 하위 페이지로 분리했습니다.</p>
            </article>
            <article>
              <strong>{isEarly ? "수시 상세에서 확인" : "정시 상세에서 확인"}</strong>
              <p>
                {isEarly
                  ? "전형유형, 모집단위, 학생부·실기 반영요소, 수능최저와 실기 기준을 확인합니다."
                  : "모집군, 수능 반영 방식, 전년도 입결, 실기 반영 여부와 종목을 확인합니다."}
              </p>
            </article>
            <article>
              <strong>공식 자료 연결</strong>
              <p>세부 기록표와 최종 배점은 대학 모집요강과 공식 자료 탭에서 다시 확인합니다.</p>
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

          <section className={styles.trackSummaryPanel} aria-label={`${region.region} ${track.label} 대학 상세 페이지`}>
            <div className={styles.trackSummaryHead}>
              <div>
                <p className="eyebrow">UNIVERSITY DETAIL INDEX</p>
                <h2>{region.region} {track.label} 대학 상세 페이지</h2>
                <p>
                  대학 카드를 누르면 해당 대학의 {track.label} 상세 페이지로 이동합니다. 공식 자료에 전형 행이 없는
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
              {sortedSchools.map((school) => {
                const trackCount = isEarly ? school.earlyAdmissions.length : school.regularAdmissions.length;
                const schoolBrief = isEarly ? getEarlySchoolBrief(school) : getRegularSchoolBrief(school);

                return (
                  <Link
                    className={styles.universityJumpCard}
                    data-empty={trackCount === 0 ? "true" : undefined}
                    href={getPeExamSchoolTrackHref(region.region, track.key, school.slug)}
                    key={school.slug}
                  >
                    <strong>{getSchoolDisplayName(school)}</strong>
                    <span>{school.area} · {school.schoolType}</span>
                    <em>{trackCount > 0 ? `${track.label} 전형 ${trackCount}개` : "공식 전형 행 없음"}</em>
                    {trackCount > 0 ? (
                      <dl className={styles.universityMiniStats}>
                        {schoolBrief.stats.map((stat) => (
                          <div key={stat.label}>
                            <dt>{stat.label}</dt>
                            <dd>{stat.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {schoolBrief.groups[0]?.items.length ? (
                      <small>{schoolBrief.groups[0].items.slice(0, 3).join(" · ")}</small>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </PageShell>
  );
}
