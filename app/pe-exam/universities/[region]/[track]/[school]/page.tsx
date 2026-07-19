import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "../../../../../_components/SiteChrome";
import {
  getPeExamAdmissionTrackBySlug,
  getPeExamRegionTrackHref,
  getPeExamSchoolDetailBySlug,
  getPeExamSchoolTrackHref,
  peExamAdmissionTracks,
  peExamRegionDetails,
  sourceLinks,
} from "../../../../peExamData";
import {
  getVerifiedPracticalStandards,
  groupVerifiedStandardsByDepartment,
} from "../../../../peExamVerifiedStandards";
import {
  getPeExamDepartmentHref,
  getPeExamDepartmentProfileByName,
} from "../../../../peExamDepartmentData";
import styles from "../../../../PeExamHub.module.css";

type SchoolPageProps = {
  params: Promise<{
    region: string;
    track: string;
    school: string;
  }>;
};

type RegionSchool = (typeof peExamRegionDetails)[number]["universities"][number];
type EarlyAdmission = RegionSchool["earlyAdmissions"][number];
type RegularAdmission = RegionSchool["regularAdmissions"][number];
type RegularResultRow = {
  readonly title: string;
  readonly group: string;
  readonly unit: string;
  readonly quotaFinal: string;
  readonly competitionRate: string;
  readonly convertedScore70: string;
  readonly percentileAverage70: string;
  readonly englishGrade70: string;
  readonly note: string;
};
type OfficialCheckLink = {
  readonly label: string;
  readonly href: string;
  readonly text: string;
};

function getSchoolDisplayName(school: RegionSchool) {
  return `${school.name}${school.campus ? ` ${school.campus}` : ""}`;
}

function earlyAdmissionKey(admission: EarlyAdmission) {
  return [
    admission.detailParams.recruitmentCode,
    admission.detailParams.selectionGroupCode,
    admission.detailParams.recruitmentUnitCode,
    admission.detailParams.recruitmentUnitSerial,
    admission.admissionName,
  ].join("-");
}

function formatResultMetric(value: string, suffix = "") {
  return value ? `${value}${suffix}` : "공개값 없음";
}

function getFirstEarlyUnit(admissions: readonly EarlyAdmission[]) {
  for (const admission of admissions) {
    if (admission.unit) return admission.unit;
  }

  return "";
}

function getFirstRegularUnitSummary(admissions: readonly RegularAdmission[]) {
  for (const admission of admissions) {
    if (admission.unitSummary) return admission.unitSummary;
  }

  return "";
}

function hasPositivePracticalMethod(method: string) {
  const practicalMatch = method.match(/실기\s*:\s*(\d+)/);
  if (practicalMatch?.[1]) return Number(practicalMatch[1]) > 0;
  return method.includes("실기");
}

function hasEarlyPracticalRequirement(admission: EarlyAdmission) {
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

function hasEarlyPracticalRecordDetail(admission: EarlyAdmission) {
  if (!hasEarlyPracticalRequirement(admission)) return false;

  return makePracticalRecordRows(admission.practicalTasks, admission.practicalCriteriaItems).some(
    hasResolvedPracticalStandard,
  );
}

function getEarlyStatusBadges(admission: EarlyAdmission) {
  const practicalRequired = hasEarlyPracticalRequirement(admission);
  const resolvedRecordCount = makePracticalRecordRows(
    admission.practicalTasks,
    admission.practicalCriteriaItems,
  ).filter(hasResolvedPracticalStandard).length;
  const practicalBadges = practicalRequired
    ? [
        {
          label: admission.practicalTasks.length ? `실기 종목 ${admission.practicalTasks.length}개` : "실기 종목 확인 필요",
          tone: admission.practicalTasks.length ? "good" : "warn",
        },
        {
          label: resolvedRecordCount ? `검증 기록 기준 ${resolvedRecordCount}개` : "기록표 공식 확인",
          tone: resolvedRecordCount ? "good" : "warn",
        },
      ]
    : [
        {
          label: "실기 반영 없음",
          tone: "muted",
        },
        {
          label: "기록 기준 해당 없음",
          tone: "muted",
        },
      ];

  return [
    ...practicalBadges,
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

function getRegularStatusBadges(admission: RegularAdmission) {
  const practicalRequired = hasPositivePracticalMethod(admission.method);
  const resolvedRecordCount = makePracticalRecordRows(
    admission.practicalTasks,
    admission.practicalCriteriaItems,
  ).filter(hasResolvedPracticalStandard).length;

  return [
    {
      label: admission.units.length ? `모집단위 ${admission.units.length}개` : "모집단위 확인 필요",
      tone: admission.units.length ? "good" : "warn",
    },
    {
      label: resolvedRecordCount
        ? `검증 기록 기준 ${resolvedRecordCount}개`
        : admission.practicalTasks.length
          ? `실기 종목 ${admission.practicalTasks.length}개 · 기록표 확인`
        : practicalRequired
          ? "실기 반영 확인"
          : "실기 반영 없음",
      tone: resolvedRecordCount ? "good" : admission.practicalTasks.length || practicalRequired ? "neutral" : "muted",
    },
    {
      label: admission.hasResultDetail ? "입결 표 연결" : "등급·입결 별도 확인",
      tone: admission.hasResultDetail ? "good" : "warn",
    },
  ] as const;
}

function splitTaskInlineStandard(task: string) {
  const colonMatch = task.match(
    /^(.{2,44}?)\s*[:：]\s*(.*\d+(?:\.\d+)?\s*(?:점|초|cm|kg|회|m).*)$/i,
  );
  if (colonMatch?.[1] && colonMatch[2]) {
    return {
      event: colonMatch[1].trim(),
      standard: colonMatch[2].trim(),
    };
  }

  const bracketStandards = [
    ...task.matchAll(/\(([^)]*\d+(?:\.\d+)?\s*(?:점|초|cm|kg|회|m)[^)]*)\)/gi),
  ]
    .map((match) => match[1].trim())
    .filter(Boolean);

  if (!bracketStandards.length) return { event: task, standard: "" };

  return {
    event: task.replace(/\([^)]*(?:점|초|m|cm|kg)[^)]*\)/gi, "").replace(/\s+/g, " ").trim() || task,
    standard: bracketStandards.join(" · "),
  };
}

function isVerifiedScoringStandard(value: string) {
  const standard = value.normalize("NFKC").trim();
  const valuePattern = "\\d+(?:\\.\\d+)?\\s*(?:회|초|cm|kg|점|m)";
  const quantitativeMatches = standard.match(new RegExp(valuePattern, "gi")) || [];
  if (!quantitativeMatches.length) return false;

  const hasScoringSignal = /만점|최고|최저|배점|이상|이내|기준|등급|구간|감점|\d+(?:\.\d+)?\s*(?:회|초|cm|kg|점|m)?\s*(?:~|-)\s*\d/i.test(
    standard,
  );
  const isSingleRecordValue = /^(?:(?:남자?|여자?|남녀|공통)\s*)?\d+(?:\.\d+)?\s*(?:회|초|cm|kg|점|m)\s*$/i.test(
    standard,
  );
  const isEventWithSingleValue =
    quantitativeMatches.length === 1 &&
    /^[^\d]{2,50}\d+(?:\.\d+)?\s*(?:회|초|cm|kg|점|m)\s*(?:이상|이내)?\s*$/i.test(standard);
  return hasScoringSignal || isSingleRecordValue || isEventWithSingleValue;
}

function makePracticalRecordRows(tasks: readonly string[], criteriaItems: readonly string[]) {
  const isPracticalRatioItem = (item: string) => /^실기\s*:?\s*\d+(?:\.\d+)?%?$/i.test(item);
  const isPracticalShareItem = (item: string) => /^실기\s*반영\s*:?\s*\d+(?:\.\d+)?%?$/i.test(item);
  const ratioItem = criteriaItems.find((item) => isPracticalRatioItem(item) || isPracticalShareItem(item));
  const specificTasks = tasks.filter(
    (task) => !/^\*?\s*(?:기초\s*)?(?:운동능력|체력)?\s*\d+\s*종목(?:\s*평가)?\s*$/i.test(task.trim()),
  );
  const displayTasks = specificTasks.length ? specificTasks : tasks;

  if (!tasks.length && !criteriaItems.length) return [];
  if (!displayTasks.length) {
    return criteriaItems.map((item, index) => {
      const isRatioOnly = isPracticalRatioItem(item) || isPracticalShareItem(item);

      return {
        event: isRatioOnly ? "실기 반영 비율" : index === 0 ? "실기 기준" : `실기 기준 ${index + 1}`,
        standard: isRatioOnly ? `${item} · 종목별 기록 기준은 공식 모집요강 확인` : item,
      };
    });
  }

  return displayTasks.map((task) => {
    const taskStandard = splitTaskInlineStandard(task);
    const normalizedEvent = normalizePracticalEvent(taskStandard.event);
    const related =
      criteriaItems.find((item) => {
        if (isPracticalRatioItem(item) || isPracticalShareItem(item) || item === task) return false;
        const normalizedItem = normalizePracticalEvent(item);
        return (
          normalizedEvent.length >= 2 &&
          normalizedItem.includes(normalizedEvent) &&
          isVerifiedScoringStandard(item)
        );
      }) ||
      "";
    const inlineStandard = isVerifiedScoringStandard(taskStandard.standard) ? taskStandard.standard : "";

    return {
      event: taskStandard.event,
      standard:
        inlineStandard ||
        related ||
        (ratioItem ? `${ratioItem} · 종목별 기록 기준은 공식 모집요강 확인` : "공식 모집요강 기록표 확인"),
    };
  });
}

function normalizePracticalEvent(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/제멀/g, "제자리멀리뛰기")
    .replace(/10미터/g, "10m")
    .replace(/\s|[·ㆍ,./_()\[\]{}:：-]/g, "");
}

function getRegularGradeRows(rows: readonly RegularResultRow[]) {
  return rows.filter((row) => row.note || row.percentileAverage70 || row.englishGrade70 || row.convertedScore70);
}

function hasResolvedPracticalStandard(row: { readonly event: string; readonly standard: string }) {
  return (
    row.event !== "실기 반영 비율" &&
    !row.event.startsWith("실기 기준") &&
    !row.standard.includes("공식 모집요강") &&
    !row.standard.includes("확인") &&
    isVerifiedScoringStandard(row.standard)
  );
}

function uniqueOfficialLinks(links: readonly OfficialCheckLink[]) {
  const seen = new Set<string>();

  return links.filter((link) => {
    if (!link.href || seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
}

function getSchoolOfficialLinks(school: RegionSchool): readonly OfficialCheckLink[] {
  if (!("officialLinks" in school) || !Array.isArray(school.officialLinks)) return [];
  return school.officialLinks;
}

export function generateStaticParams() {
  return peExamRegionDetails.flatMap((region) =>
    peExamAdmissionTracks.flatMap((track) =>
      region.universities.map((school) => ({
        region: region.slug,
        track: track.key,
        school: school.slug,
      })),
    ),
  );
}

export async function generateMetadata({ params }: SchoolPageProps): Promise<Metadata> {
  const { region: regionSlug, track: trackSlug, school: schoolSlug } = await params;
  const detail = getPeExamSchoolDetailBySlug(regionSlug, schoolSlug);
  const track = getPeExamAdmissionTrackBySlug(trackSlug);

  if (!detail || !track) {
    return {
      title: "체대입시 대학 상세 | RePERFORMANCE",
    };
  }

  return {
    title: `${getSchoolDisplayName(detail.school)} ${track.label} 상세 | RePERFORMANCE`,
    description: `${getSchoolDisplayName(detail.school)} ${track.label} 전형, 등급컷·입결, 실기 종목과 기록 기준을 정리한 체대입시 상세 페이지입니다.`,
  };
}

export default async function PeExamSchoolTrackPage({ params }: SchoolPageProps) {
  const { region: regionSlug, track: trackSlug, school: schoolSlug } = await params;
  const detail = getPeExamSchoolDetailBySlug(regionSlug, schoolSlug);
  const track = getPeExamAdmissionTrackBySlug(trackSlug);

  if (!detail || !track) notFound();

  const { region, school } = detail;
  const isEarly = track.key === "early";
  const alternateTrack = peExamAdmissionTracks.find((item) => item.key !== track.key)!;
  const schoolName = getSchoolDisplayName(school);
  const verifiedStandards = getVerifiedPracticalStandards(school.code, track.key);
  const verifiedStandardGroups = groupVerifiedStandardsByDepartment(verifiedStandards);
  const verifiedEventCount = new Set(verifiedStandards.map((standard) => standard.eventId)).size;
  const verifiedSourceLinks = Array.from(
    new Map(
      verifiedStandards.map((standard) => [
        standard.sourceUrl,
        {
          label: `${standard.admissionYear}학년도 대학 모집요강`,
          href: standard.sourceUrl,
          text: `${standard.sourceTitle} ${standard.sourcePage}쪽에서 만점 기록과 반영 비율을 확인합니다.`,
        },
      ]),
    ).values(),
  );
  const earlyAdmissions = school.earlyAdmissions;
  const regularAdmissions = school.regularAdmissions;
  const trackCount = isEarly ? earlyAdmissions.length : regularAdmissions.length;
  const consultDepartment = isEarly
    ? getFirstEarlyUnit(earlyAdmissions)
    : getFirstRegularUnitSummary(regularAdmissions);
  const aiConsultParams = new URLSearchParams({
    target: schoolName,
    track: track.label,
  });

  if (consultDepartment) aiConsultParams.set("department", consultDepartment);

  const aiConsultHref = `/pe-exam/ai-consult?${aiConsultParams.toString()}`;
  const practicalTaskCount = isEarly
    ? earlyAdmissions.reduce((sum, admission) => sum + admission.practicalTasks.length, 0)
    : regularAdmissions.reduce((sum, admission) => sum + admission.practicalTasks.length, 0);
  const gradeOrResultCount = isEarly
    ? earlyAdmissions.filter((admission) => admission.hasGradeDetail).length
    : school.regularSelectionDetail?.resultRows.length || 0;
  const regularResultRows = getRegularGradeRows(school.regularSelectionDetail?.resultRows || []);
  const practicalRecordRows = isEarly
    ? earlyAdmissions.flatMap((admission) => makePracticalRecordRows(admission.practicalTasks, admission.practicalCriteriaItems))
    : regularAdmissions.flatMap((admission) => makePracticalRecordRows(admission.practicalTasks, admission.practicalCriteriaItems));
  const resolvedPracticalRecordCount = practicalRecordRows.filter(hasResolvedPracticalStandard).length;
  const practicalCoverageTitle =
    verifiedEventCount > 0
      ? `공식 만점 기준 ${verifiedEventCount}개 종목`
      : resolvedPracticalRecordCount > 0
      ? `기록 기준 ${resolvedPracticalRecordCount}개 표시`
      : practicalTaskCount > 0
        ? `실기 종목 ${practicalTaskCount}개 확인`
        : "실기 반영 확인 필요";
  const practicalCoverageText =
    verifiedEventCount > 0
      ? "대학 공식 모집요강에서 연도·전형·성별·측정 방식이 확인된 만점 기록을 표시합니다."
      : resolvedPracticalRecordCount > 0
      ? "종목별 기록 기준 또는 실시 기준을 전형 카드 안에서 바로 확인합니다."
      : practicalTaskCount > 0
        ? "종목명은 연결되어 있으며, 세부 기록표는 공식 모집요강에서 최종 확인합니다."
        : "현재 연결 자료에는 실기 종목 상세가 없어 대학 모집요강 확인이 필요합니다.";
  const gradeCoverageTitle = isEarly
    ? gradeOrResultCount > 0
      ? `등급 산출 기준 ${gradeOrResultCount}개`
      : "수시 평균등급 공개값 없음"
    : regularResultRows.length > 0
      ? `입결 ${regularResultRows.length}건 표시`
      : "정시 입결 공개값 없음";
  const gradeCoverageText = isEarly
    ? "수시 평균등급·등급컷 수치는 현재 KUSF 원천 데이터에 없어, 학생부 반영·석차등급 산출 기준을 대신 표시합니다."
    : regularResultRows.length > 0
      ? "ADIGA 평가기준·입시결과 탭의 70% 평균백분위, 영어 등급, 환산점수를 표시합니다."
      : "ADIGA 입시결과 표가 연결되지 않은 대학은 공식 입학처와 모집요강을 우선 확인합니다.";
  const sourceCoverageText = isEarly
    ? "KUSF 대학별 전형 상세를 기준으로 수시 반영요소와 실기 기준을 연결했습니다."
    : "ADIGA 모집인원, 평가기준, 입시결과 탭을 기준으로 정시 자료를 연결했습니다.";
  const directSourceLinks = isEarly
    ? earlyAdmissions
        .filter((admission) => admission.detailUrl)
        .map((admission) => ({
          label: `${admission.unit || admission.admissionName} 상세`,
          href: admission.detailUrl,
          text: "KUSF 상세 탭에서 반영요소, 실기 기준, 수능최저를 재확인합니다.",
        }))
    : school.regularDetailUrl
      ? [
          {
            label: "ADIGA 평가기준·입시결과",
            href: school.regularDetailUrl,
            text: "정시 모집단위, 평가기준, 전년도 입시결과 표 원문을 확인합니다.",
          },
        ]
      : [];
  const schoolOfficialLinks = getSchoolOfficialLinks(school);
  const officialCheckLinks = uniqueOfficialLinks([
    ...verifiedSourceLinks,
    ...schoolOfficialLinks,
    ...directSourceLinks.slice(0, 4),
    {
      label: isEarly ? "KUSF 체육특기자대입포털" : "대입정보포털 어디가",
      href: (isEarly ? sourceLinks[2] : sourceLinks[1]).href,
      text: isEarly
        ? "대학별 체육관련학과 수시 전형과 실기 상세를 검색합니다."
        : "대학·학과·전형 검색에서 최신 모집요강과 정시 입결 탭을 확인합니다.",
    },
    {
      label: "EBSi 대입정보",
      href: sourceLinks[3].href,
      text: "학년도별 시행계획, 전형 일정, 대학별 공지 변동을 교차 확인합니다.",
    },
  ]);
  const officialCheckSteps = isEarly
    ? [
        "수시 전형명, 모집단위, 모집인원이 현재 모집요강과 같은지 확인",
        "실기 종목별 기록표, 만점 기준, 결시·실격 기준 확인",
        "학생부 반영 방식, 석차등급 산출, 수능최저 유무 확인",
      ]
    : [
        "정시 모집군, 모집단위, 수능 반영 영역과 비율 확인",
        "실기 반영 여부, 종목별 기록표, 배점표 확인",
        "전년도 70% 평균백분위, 영어 등급, 환산점수와 공식 입결 표 확인",
      ];
  return (
    <PageShell>
      <nav className={styles.hubNav} aria-label={`${schoolName} ${track.label} 상세 메뉴`}>
        <div className={`container ${styles.hubNavInner}`}>
          <Link href="/pe-exam#universities">지역 전체</Link>
          <Link href={region.href}>{region.region} 전형 선택</Link>
          <Link href={getPeExamRegionTrackHref(region.region, track.key)}>{region.region} {track.label} 목록</Link>
          <Link href={getPeExamSchoolTrackHref(region.region, alternateTrack.key, school.slug)}>
            {alternateTrack.label} 상세
          </Link>
        </div>
      </nav>

      <nav className={styles.breadcrumbTrail} aria-label="현재 페이지 위치">
        <div className={`container ${styles.breadcrumbTrailInner}`}>
          <Link href="/pe-exam">체대입시 홈</Link>
          <Link href="/pe-exam#universities">지역별 대학</Link>
          <Link href={region.href}>{region.region} 전형 선택</Link>
          <Link href={getPeExamRegionTrackHref(region.region, track.key)}>{track.label} 목록</Link>
          <span aria-current="page">{schoolName}</span>
        </div>
      </nav>

      <section className={styles.regionDetailHero}>
        <div className={`container ${styles.regionDetailHeroInner}`}>
          <div>
            <p className="eyebrow light-text">{isEarly ? "EARLY SCHOOL DETAIL" : "REGULAR SCHOOL DETAIL"}</p>
            <h1>{schoolName} {track.label} 상세</h1>
            <p>
              {school.area} · {school.schoolType} 기준으로 {track.studentLabel}에게 필요한 전형, 등급컷·입결,
              실기 종목과 기록 기준 확인 지점을 한 페이지에 정리했습니다.
            </p>
          </div>

          <aside className={styles.regionDetailStats} aria-label={`${schoolName} ${track.label} 데이터 요약`}>
            <div>
              <span>{track.label} 전형</span>
              <strong>{trackCount}개</strong>
            </div>
            <div>
              <span>실기 종목</span>
              <strong>{practicalTaskCount}개</strong>
            </div>
            <div>
              <span>{isEarly ? "등급 기준" : "입결 행"}</span>
              <strong>{gradeOrResultCount}{isEarly ? "개" : "건"}</strong>
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
          <div className={styles.trackSwitchBar} aria-label="대학 상세 전환">
            <Link href={getPeExamRegionTrackHref(region.region, track.key)}>{region.region} {track.label} 목록</Link>
            <Link href={getPeExamSchoolTrackHref(region.region, alternateTrack.key, school.slug)}>
              {alternateTrack.label} 상세로 전환
            </Link>
            <Link href={aiConsultHref}>AI 상담 준비</Link>
            <a href={(isEarly ? sourceLinks[2] : sourceLinks[1]).href} rel="noopener noreferrer" target="_blank">
              공식 자료 확인
            </a>
          </div>

          <details className={styles.schoolDataGuideDisclosure}>
            <summary>
              <span><small>DATA STATUS</small><strong>실기·등급·공식 자료 상태 요약</strong></span>
              <em>펼쳐보기</em>
            </summary>
          <section className={styles.schoolDataGuide} aria-label={`${schoolName} ${track.label} 자료 확인 요약`}>
            <div>
              <span>실기 기록 기준</span>
              <strong>{practicalCoverageTitle}</strong>
              <p>{practicalCoverageText}</p>
            </div>
            <div>
              <span>등급컷·평균등급</span>
              <strong>{gradeCoverageTitle}</strong>
              <p>{gradeCoverageText}</p>
            </div>
            <div>
              <span>공식 자료 기준</span>
              <strong>{track.sourceLabel}</strong>
              <p>{sourceCoverageText}</p>
            </div>
          </section>
          </details>

          {verifiedStandardGroups.length ? (
            <section className={styles.officialStandardPanel} aria-label={`${schoolName} 공식 실기 만점 기준`}>
              <div className={styles.officialStandardHead}>
                <div>
                  <p className="eyebrow">VERIFIED DEPARTMENT GUIDE</p>
                  <h2>모집단위를 선택해 필요한 정보만 확인하세요.</h2>
                  <p>
                    학과별 전형, 진로, 공식 실기 기준과 내 기록 비교를 별도 페이지에 짧게 정리했습니다.
                  </p>
                </div>
                <span>{verifiedStandards[0].admissionYear}학년도 · {track.label}</span>
              </div>

              <div className={styles.departmentSelectorGrid}>
                {verifiedStandardGroups.map((group, index) => {
                  const profile = getPeExamDepartmentProfileByName(school.code, group.department);
                  if (!profile) return null;

                  return (
                    <Link
                      className={styles.departmentSelectorCard}
                      href={getPeExamDepartmentHref(region.slug, track.key, school.slug, profile.slug)}
                      key={group.department}
                    >
                      <span className={styles.departmentSelectorIndex}>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <small>모집단위</small>
                        <h3>{group.department}</h3>
                        <p>{profile.summary}</p>
                      </div>
                      <dl>
                        <div>
                          <dt>실기 반영</dt>
                          <dd>{group.practicalWeightPercent}%</dd>
                        </div>
                        <div>
                          <dt>공식 종목</dt>
                          <dd>{group.events.length}개</dd>
                        </div>
                      </dl>
                      <span className={styles.departmentSelectorArrow} aria-hidden="true">→</span>
                    </Link>
                  );
                })}
              </div>

              <div className={styles.departmentSelectorFoot}>
                <p>입력한 성적과 실기 기록은 브라우저 안에서만 비교하며 서버에 저장하지 않습니다.</p>
                <a href={verifiedStandards[0].sourceUrl} rel="noopener noreferrer" target="_blank">
                  {verifiedStandards[0].sourceTitle} 원문 · {verifiedStandards[0].sourcePage}쪽
                </a>
              </div>
            </section>
          ) : null}

          <details className={styles.schoolEvidenceDisclosure}>
            <summary>
              <span>
                <small>FULL ADMISSION EVIDENCE</small>
                <strong>전체 전형·입결·공식 확인 자료 보기</strong>
              </span>
              <em>펼쳐보기</em>
            </summary>
            <div className={styles.schoolEvidenceBody}>

          <section className={styles.officialCheckPanel} aria-label={`${schoolName} ${track.label} 공식 확인 순서`}>
            <div>
              <p className="eyebrow">OFFICIAL CHECK</p>
              <h2>공식 모집요강에서 마지막으로 확인할 항목</h2>
              <p>
                아래 자료는 지원 판단의 출발점입니다. 원서접수 전에는 대학 입학처와 공식 포털에서
                모집요강, 실기 기록표, 등급·입결 표를 다시 확인합니다.
              </p>
            </div>
            <ol>
              {officialCheckSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className={styles.officialCheckLinks}>
              {officialCheckLinks.map((link) => (
                <a href={link.href} key={link.href} rel="noopener noreferrer" target="_blank">
                  <strong>{link.label}</strong>
                  <span>{link.text}</span>
                </a>
              ))}
            </div>
          </section>

          {trackCount === 0 ? (
            <div className={styles.catalogNotice}>
              <strong>공식 전형 행 없음</strong>
              <p>
                현재 연결된 {track.sourceLabel} 자료에는 {schoolName} {track.label} 전형 행이 없습니다.
                대학 입학처 모집요강에서 별도로 확인합니다.
              </p>
            </div>
          ) : null}

          {isEarly ? (
            <section className={styles.schoolDetailStack} aria-label={`${schoolName} 수시 전형 상세`}>
              {earlyAdmissions.map((admission) => {
                const recordRows = makePracticalRecordRows(admission.practicalTasks, admission.practicalCriteriaItems);

                return (
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
                        <dt>등급컷·평균등급</dt>
                        <dd>수시 평균등급 수치는 현재 KUSF 원천 데이터 미제공 · {admission.gradeSummary}</dd>
                      </div>
                      {admission.minimumCriteriaSummary ? (
                        <div>
                          <dt>수능최저</dt>
                          <dd>{admission.minimumCriteriaSummary}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {recordRows.length ? (
                      <div className={styles.practicalRecordPanel}>
                        <strong>실기 종목·검증된 기록 기준</strong>
                        <p className={styles.practicalRecordEvidenceNotice}>
                          종목과 같은 문맥에서 확인된 수치만 표시합니다. 수치가 없는 항목은 다른 기준을 추정해 붙이지 않으며,
                          해당 연도 공식 모집요강 기록표에서 확인합니다.
                        </p>
                        <dl className={styles.practicalRecordGrid}>
                          {recordRows.map((row, rowIndex) => (
                            <div key={`${admission.admissionName}-${row.event}-${rowIndex}`}>
                              <dt>{row.event}</dt>
                              <dd>{row.standard}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ) : null}
                    {admission.detailUrl ? (
                      <a className={styles.kusfItemLink} href={admission.detailUrl} rel="noopener noreferrer" target="_blank">
                        KUSF 전형 상세 확인
                      </a>
                    ) : null}
                  </article>
                );
              })}
            </section>
          ) : (
            <>
              <p className={styles.trackOnlyIntro}>{school.regularGuide.text}</p>
              <section className={styles.schoolDetailStack} aria-label={`${schoolName} 정시 전형 상세`}>
                {regularAdmissions.map((admission, admissionIndex) => {
                  const recordRows = makePracticalRecordRows(admission.practicalTasks, admission.practicalCriteriaItems);

                  return (
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
                          <dt>실기 반영</dt>
                          <dd>{admission.practicalSummary}</dd>
                        </div>
                        <div>
                          <dt>등급컷·입결</dt>
                          <dd>{admission.gradeSummary}</dd>
                        </div>
                      </dl>
                      {recordRows.length ? (
                        <div className={styles.practicalRecordPanel}>
                          <strong>실기 종목·검증된 기록 기준</strong>
                          <p className={styles.practicalRecordEvidenceNotice}>
                            종목과 같은 문맥에서 확인된 수치만 표시합니다. 수치가 없는 항목은 다른 기준을 추정해 붙이지 않으며,
                            해당 연도 공식 모집요강 기록표에서 확인합니다.
                          </p>
                          <dl className={styles.practicalRecordGrid}>
                            {recordRows.map((row, rowIndex) => (
                              <div key={`${admission.admissionName}-${row.event}-${rowIndex}`}>
                                <dt>{row.event}</dt>
                                <dd>{row.standard}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </section>

              {regularResultRows.length ? (
                <section className={styles.regularResultPanel} aria-label={`${schoolName} 정시 등급컷 및 입결`}>
                  <strong>ADIGA 등급컷·평균 성적</strong>
                  <div className={styles.regularResultList}>
                    {regularResultRows.map((row, rowIndex) => (
                      <div className={styles.regularResultItem} key={`${row.title}-${row.group}-${row.unit}-${rowIndex}`}>
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
                              <dt>70% 평균백분위</dt>
                              <dd>{formatResultMetric(row.percentileAverage70)}</dd>
                            </div>
                            <div>
                              <dt>영어 70%</dt>
                              <dd>{formatResultMetric(row.englishGrade70, "등급")}</dd>
                            </div>
                            <div>
                              <dt>환산 70%</dt>
                              <dd>{formatResultMetric(row.convertedScore70)}</dd>
                            </div>
                          </dl>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <div className={styles.catalogNotice}>
                  <strong>정시 등급컷·입결 공식 표 확인 필요</strong>
                  <p>
                    현재 연결된 ADIGA 평가기준·입시결과 자료에는 {schoolName} {track.label} 70% 평균백분위 또는
                    환산점수 행이 없습니다. 대학 입학처와 ADIGA 공식 탭에서 최신 입시결과를 다시 확인합니다.
                  </p>
                </div>
              )}

              {school.regularDetailUrl ? (
                <a className={styles.kusfInlineLink} href={school.regularDetailUrl} rel="noopener noreferrer" target="_blank">
                  ADIGA 평가기준·입시결과 확인
                </a>
              ) : null}
            </>
          )}
            </div>
          </details>
        </div>
      </section>
    </PageShell>
  );
}
