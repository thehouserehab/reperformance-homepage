import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "../../../_components/SiteChrome";
import {
  catalogMeta,
  getPeExamRegionNameBySlug,
  getPeExamRegionTrackHref,
  peExamAdmissionTracks,
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
      title: "지역별 대학 전형 선택 | RePERFORMANCE",
    };
  }

  return {
    title: `${region.region} 체대입시 전형 선택 | RePERFORMANCE`,
    description: `${region.region} 체육관련학과 대학 정보를 수시 준비생 페이지와 정시 준비생 페이지로 나누어 안내합니다.`,
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
            <p className="eyebrow light-text">ADMISSION TRACK SELECTOR</p>
            <h1>{region.region} 체대입시 전형 선택</h1>
            <p>
              {region.summary} 먼저 수시와 정시 중 현재 준비 전형을 선택한 뒤, 해당 전형에 맞는 대학별
              전형·실기·등급 확인 지점을 한 페이지에서 이어서 봅니다.
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
              <span>정시 입결</span>
              <strong>{region.regularResultRowCount}건</strong>
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
              <strong>수시 먼저 보기</strong>
              <p>KUSF 2026학년도 수시 일반전형 기준으로 모집단위, 전형유형, 실기·등급 확인 지점을 봅니다.</p>
            </article>
            <article>
              <strong>정시 먼저 보기</strong>
              <p>
                ADIGA 2027학년도 정시 예체능계열 기준으로 전형방법, 모집단위,
                {region.regularResultRowCount}건의 전년도 입결 요약을 함께 봅니다.
              </p>
            </article>
          </div>

          <div className={styles.admissionChoiceGrid} aria-label="수시 정시 전형 선택">
            {peExamAdmissionTracks.map((track) => {
              const isEarly = track.key === "early";
              const admissionCount = isEarly ? region.earlyAdmissionCount : region.regularAdmissionCount;
              const detailCount = isEarly ? region.practicalDetailCount : region.regularUnitCount;
              const detailLabel = isEarly ? "실기 상세" : "모집단위";
              const evidenceCount = isEarly ? region.gradeDetailCount : region.regularResultRowCount;
              const evidenceLabel = isEarly ? "등급 상세" : "입결 행";

              return (
                <article className={styles.admissionChoiceCard} key={track.key}>
                  <div>
                    <span>{track.sourceLabel}</span>
                    <h2>{track.studentLabel} 페이지</h2>
                    <p>
                      {isEarly
                        ? "학생부·실기·수능최저를 함께 확인해야 하는 수시 준비생용 페이지입니다. 같은 대학 안에서도 수시 전형만 따로 모아 봅니다."
                        : "수능 반영 방식과 실기 반영 여부, 모집군 흐름을 확인해야 하는 정시 준비생용 페이지입니다. 정시 전형만 따로 모아 봅니다."}
                    </p>
                  </div>
                  <dl className={styles.admissionChoiceStats}>
                    <div>
                      <dt>연결 전형</dt>
                      <dd>{admissionCount}개</dd>
                    </div>
                    <div>
                      <dt>{detailLabel}</dt>
                      <dd>{detailCount}개</dd>
                    </div>
                    <div>
                      <dt>{evidenceLabel}</dt>
                      <dd>{evidenceCount}{isEarly ? "개" : "건"}</dd>
                    </div>
                    <div>
                      <dt>기준 자료</dt>
                      <dd>{track.sourceDescription}</dd>
                    </div>
                  </dl>
                  <Link className={styles.regionOverviewLink} href={getPeExamRegionTrackHref(region.region, track.key)}>
                    {track.label} 페이지 보기
                  </Link>
                </article>
              );
            })}
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

          <div className={styles.catalogNotice}>
            <strong>확인 기준</strong>
            <p>{catalogMeta.note}</p>
          </div>

          <section className={styles.regionSchoolDirectory} aria-label={`${region.region} 체육관련학과 대학 목록`}>
            <div className={styles.regionSchoolDirectoryHead}>
              <p className="eyebrow">REGIONAL DIRECTORY</p>
              <h2>{region.region} 대학 목록</h2>
              <p>아래 목록은 전형 선택 전 전체 범위를 빠르게 확인하는 용도입니다. 전형별 세부 내용은 수시/정시 페이지에서 확인합니다.</p>
            </div>
            <div className={styles.regionSchoolList}>
              {region.universities.map((school) => (
                <article key={school.code}>
                  <strong>
                    {school.name}
                    {school.campus ? ` ${school.campus}` : ""}
                  </strong>
                  <span>
                    {school.area} · {school.schoolType}
                  </span>
                  <p>
                    수시 {school.earlyAdmissions.length}개 · 정시 {school.regularAdmissions.length}개
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </PageShell>
  );
}
