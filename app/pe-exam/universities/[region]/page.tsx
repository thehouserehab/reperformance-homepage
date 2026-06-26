import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "../../../_components/SiteChrome";
import {
  catalogMeta,
  getPeExamRegionNameBySlug,
  peExamRegionDetails,
  sourceLinks,
} from "../../peExamData";
import styles from "../../PeExamHub.module.css";

type RegionPageProps = {
  params: Promise<{
    region: string;
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

export function generateStaticParams() {
  return peExamRegionDetails.map((region) => ({
    region: region.slug,
  }));
}

export async function generateMetadata({ params }: RegionPageProps): Promise<Metadata> {
  const { region: slug } = await params;
  const region = getRegionDetail(slug);

  if (!region) {
    return {
      title: "지역별 대학 상세 | RePERFORMANCE",
    };
  }

  return {
    title: `${region.region} 체대입시 대학 상세 | RePERFORMANCE`,
    description: `${region.region} 체육관련학과 대학의 수시·정시 전형, 실기·등급 확인 지점을 정리한 RePERFORMANCE 체대입시 지역 상세 페이지입니다.`,
  };
}

export default async function PeExamRegionDetailPage({ params }: RegionPageProps) {
  const { region: slug } = await params;
  const region = getRegionDetail(slug);

  if (!region) notFound();

  return (
    <PageShell>
      <nav className={styles.hubNav} aria-label="체대입시 지역 상세 메뉴">
        <div className={`container ${styles.hubNavInner}`}>
          <Link href="/pe-exam#universities">지역 전체</Link>
          {peExamRegionDetails.map((item) => (
            <Link aria-current={item.slug === region.slug ? "page" : undefined} href={item.href} key={item.slug}>
              {item.region}
            </Link>
          ))}
        </div>
      </nav>

      <section className={styles.regionDetailHero}>
        <div className={`container ${styles.regionDetailHeroInner}`}>
          <div>
            <p className="eyebrow light-text">REGIONAL UNIVERSITY DETAIL</p>
            <h1>{region.region} 체대입시 대학 상세</h1>
            <p>
              {region.summary} 대학별 수시 일반전형과 정시 예체능계열 전형방법을 나누어 보고,
              실기·등급·수능최저 확인 지점을 빠르게 훑을 수 있게 정리했습니다.
            </p>
          </div>

          <aside className={styles.regionDetailStats} aria-label={`${region.region} 데이터 요약`}>
            <div>
              <span>목록 대학</span>
              <strong>{region.catalogCount}개</strong>
            </div>
            <div>
              <span>수시 전형</span>
              <strong>{region.earlyAdmissionCount}개</strong>
            </div>
            <div>
              <span>정시 전형</span>
              <strong>{region.regularAdmissionCount}개</strong>
            </div>
            <div>
              <span>실기 상세</span>
              <strong>{region.practicalDetailCount}개</strong>
            </div>
          </aside>
        </div>
      </section>

      <section className={`section ${styles.regionDetailSection}`}>
        <div className="container">
          <div className={styles.regionDetailGuide}>
            <article>
              <strong>지역 범위</strong>
              <p>{region.areas.join(" · ")}</p>
            </article>
            <article>
              <strong>수시 확인</strong>
              <p>KUSF 2026학년도 수시 일반전형 기준으로 모집단위, 전형유형, 반영요소를 정리했습니다.</p>
            </article>
            <article>
              <strong>정시 확인</strong>
              <p>ADIGA 2027학년도 정시 예체능계열 기준으로 전형방법과 모집단위 요약을 연결했습니다.</p>
            </article>
          </div>

          <div className={styles.catalogNotice}>
            <strong>확인 기준</strong>
            <p>{catalogMeta.note}</p>
          </div>

          <div className={styles.regionDetailTools}>
            <Link href="/pe-exam#universities">전체 지역 개요로 돌아가기</Link>
            <div>
              {sourceLinks.slice(1, 3).map((source) => (
                <a href={source.href} key={source.href} rel="noopener noreferrer" target="_blank">
                  {source.label}
                </a>
              ))}
            </div>
          </div>

          <div className={styles.kusfSchoolStack}>
            {region.universities.map((school, index) => (
              <details className={styles.kusfSchoolCard} key={school.code} open={index < 3}>
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
                                <dt>실기·기록</dt>
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
        </div>
      </section>
    </PageShell>
  );
}
