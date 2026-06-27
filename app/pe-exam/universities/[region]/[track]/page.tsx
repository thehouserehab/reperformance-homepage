import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "../../../../_components/SiteChrome";
import {
  catalogMeta,
  getPeExamAdmissionTrackBySlug,
  getPeExamRegionNameBySlug,
  getPeExamRegionTrackHref,
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
                    {isEarly ? (
                      school.earlyAdmissions.length ? (
                        <div className={styles.kusfAdmissionList}>
                          {school.earlyAdmissions.map((admission) => (
                            <article className={styles.kusfAdmissionItem} key={earlyAdmissionKey(admission)}>
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
                                  {admission.practicalTasks.slice(0, 8).map((task) => (
                                    <li key={task}>{task}</li>
                                  ))}
                                </ul>
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
                                    <dt>실기·기록 기준</dt>
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
