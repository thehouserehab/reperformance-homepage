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

function hasPositivePracticalMethod(method: string) {
  const practicalMatch = method.match(/실기\s*:\s*(\d+)/);
  if (practicalMatch?.[1]) return Number(practicalMatch[1]) > 0;
  return method.includes("실기");
}

function getEarlyStatusBadges(admission: EarlyAdmission) {
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

function getRegularStatusBadges(admission: RegularAdmission) {
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

function makePracticalRecordRows(tasks: readonly string[], criteriaItems: readonly string[]) {
  if (!tasks.length && !criteriaItems.length) return [];
  if (!tasks.length) {
    return criteriaItems.map((item, index) => {
      const isRatioOnly = /^실기\s*:?\s*\d+(?:\.\d+)?%?$/i.test(item);

      return {
        event: isRatioOnly ? "실기 반영 비율" : index === 0 ? "실기 기준" : `실기 기준 ${index + 1}`,
        standard: isRatioOnly ? `${item} · 종목별 기록 기준은 공식 모집요강 확인` : item,
      };
    });
  }

  return tasks.map((task, index) => {
    const related = criteriaItems.find((item) => item.includes(task)) || criteriaItems[index] || "";

    return {
      event: task,
      standard: related || "공식 모집요강 기록표 확인",
    };
  });
}

function getRegularGradeRows(rows: readonly RegularResultRow[]) {
  return rows.filter((row) => row.note || row.percentileAverage70 || row.englishGrade70 || row.convertedScore70);
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
  const earlyAdmissions = school.earlyAdmissions;
  const regularAdmissions = school.regularAdmissions;
  const trackCount = isEarly ? earlyAdmissions.length : regularAdmissions.length;
  const practicalTaskCount = isEarly
    ? earlyAdmissions.reduce((sum, admission) => sum + admission.practicalTasks.length, 0)
    : regularAdmissions.reduce((sum, admission) => sum + admission.practicalTasks.length, 0);
  const gradeOrResultCount = isEarly
    ? earlyAdmissions.filter((admission) => admission.hasGradeDetail).length
    : school.regularSelectionDetail?.resultRows.length || 0;
  const regularResultRows = getRegularGradeRows(school.regularSelectionDetail?.resultRows || []);

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
            <a href={(isEarly ? sourceLinks[2] : sourceLinks[1]).href} rel="noopener noreferrer" target="_blank">
              공식 자료 확인
            </a>
          </div>

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
                        <strong>입시종목별 기록 기준·실기 반영</strong>
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
                          <strong>입시종목별 기록 기준·실기 반영</strong>
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
              ) : null}

              {school.regularDetailUrl ? (
                <a className={styles.kusfInlineLink} href={school.regularDetailUrl} rel="noopener noreferrer" target="_blank">
                  ADIGA 평가기준·입시결과 확인
                </a>
              ) : null}
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}
