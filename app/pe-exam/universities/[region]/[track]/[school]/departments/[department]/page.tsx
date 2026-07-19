import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "../../../../../../../_components/SiteChrome";
import PeExamDepartmentClient from "../../../../../../PeExamDepartmentClient";
import {
  admissionTextMatchesDepartment,
  getPeExamDepartmentProfile,
  getPeExamDepartmentProfileByName,
  peExamDepartmentProfiles,
} from "../../../../../../peExamDepartmentData";
import {
  getPeExamAdmissionTrackBySlug,
  getPeExamRegionTrackHref,
  getPeExamSchoolDetailBySlug,
  getPeExamSchoolTrackHref,
  peExamAdmissionTracks,
  peExamRegionDetails,
} from "../../../../../../peExamData";
import { getVerifiedPracticalStandards } from "../../../../../../peExamVerifiedStandards";
import styles from "../../../../../../PeExamHub.module.css";

type DepartmentPageProps = {
  params: Promise<{
    region: string;
    track: string;
    school: string;
    department: string;
  }>;
};

function schoolDisplayName(school: { readonly name: string; readonly campus: string }) {
  return `${school.name}${school.campus ? ` ${school.campus}` : ""}`;
}

function numericValue(value: string) {
  const match = String(value || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function generateStaticParams() {
  return peExamRegionDetails.flatMap((region) =>
    region.universities.flatMap((school) =>
      peExamAdmissionTracks.flatMap((track) => {
        const departmentSlugs = new Set(
          getVerifiedPracticalStandards(school.code, track.key)
            .map((standard) => getPeExamDepartmentProfileByName(school.code, standard.department)?.slug)
            .filter((slug) => slug !== undefined),
        );

        return [...departmentSlugs].map((department) => ({
          region: region.slug,
          track: track.key,
          school: school.slug,
          department,
        }));
      }),
    ),
  );
}

export async function generateMetadata({ params }: DepartmentPageProps): Promise<Metadata> {
  const { region, track, school, department } = await params;
  const detail = getPeExamSchoolDetailBySlug(region, school);
  const profile = detail ? getPeExamDepartmentProfile(detail.school.code, department) : undefined;
  const admissionTrack = getPeExamAdmissionTrackBySlug(track);

  if (!detail || !profile || !admissionTrack) {
    return { title: "체대입시 학과 정보 | RePERFORMANCE" };
  }

  return {
    title: `${schoolDisplayName(detail.school)} ${profile.name} ${admissionTrack.label} | RePERFORMANCE`,
    description: `${profile.name} ${admissionTrack.label} 전형, 공식 실기 기준, 졸업 후 진로와 내 준비도 비교를 확인합니다.`,
  };
}

export default async function PeExamDepartmentPage({ params }: DepartmentPageProps) {
  const { region: regionSlug, track: trackSlug, school: schoolSlug, department: departmentSlug } = await params;
  const detail = getPeExamSchoolDetailBySlug(regionSlug, schoolSlug);
  const track = getPeExamAdmissionTrackBySlug(trackSlug);

  if (!detail || !track) notFound();

  const { region, school } = detail;
  const profile = getPeExamDepartmentProfile(school.code, departmentSlug);
  if (!profile || !peExamDepartmentProfiles.includes(profile)) notFound();

  const standards = getVerifiedPracticalStandards(school.code, track.key).filter(
    (standard) => standard.department === profile.name,
  );
  if (!standards.length) notFound();

  const admissions = track.key === "early"
    ? school.earlyAdmissions
        .filter((admission) => admissionTextMatchesDepartment(admission.unit || admission.admissionName, profile.name))
        .map((admission) => ({
          title: admission.unit || profile.name,
          type: admission.admissionName,
          method: admission.elementSummary,
          quota: admission.quota,
          grade: admission.gradeSummary,
          minimumCriteria: admission.minimumCriteriaSummary,
        }))
    : school.regularAdmissions
        .filter((admission) =>
          admission.units.some((unit) => admissionTextMatchesDepartment(unit.name, profile.name)) ||
          admissionTextMatchesDepartment(admission.unitSummary, profile.name),
        )
        .map((admission) => ({
          title: profile.name,
          type: admission.admissionName,
          method: admission.method,
          quota: admission.unitSummary,
          grade: admission.gradeSummary,
          minimumCriteria: admission.practicalSummary,
        }));

  const resultRow = school.regularSelectionDetail?.resultRows.find(
    (row) => !row.note && admissionTextMatchesDepartment(row.unit, profile.name),
  );
  const resultReference = resultRow
    ? {
        percentileAverage70: numericValue(resultRow.percentileAverage70),
        englishGrade70: numericValue(resultRow.englishGrade70),
        resultYear: "전년도 공개 입결",
      }
    : null;
  const schoolName = schoolDisplayName(school);
  const schoolHref = getPeExamSchoolTrackHref(region.region, track.key, school.slug);
  const alternateTrack = peExamAdmissionTracks.find((item) => item.key !== track.key)!;

  return (
    <PageShell>
      <nav className={styles.departmentBreadcrumb} aria-label="학과 상세 위치">
        <div className="container">
          <Link href="/pe-exam">체대입시</Link>
          <Link href={getPeExamRegionTrackHref(region.region, track.key)}>{region.region} {track.label}</Link>
          <Link href={schoolHref}>{schoolName}</Link>
          <span aria-current="page">{profile.name}</span>
        </div>
      </nav>

      <section className={styles.departmentHero}>
        <div className={`container ${styles.departmentHeroInner}`}>
          <div>
            <p className="eyebrow light-text">DEPARTMENT FOCUS</p>
            <h1>{profile.name}</h1>
            <p>{schoolName} · {track.label} · {standards[0].admissionYear}학년도 공식 실기 기준</p>
          </div>
          <dl>
            <div><dt>실기 반영</dt><dd>{standards[0].practicalWeightPercent}%</dd></div>
            <div><dt>공식 종목</dt><dd>{new Set(standards.map((standard) => standard.eventId)).size}개</dd></div>
            <div><dt>정보 구성</dt><dd>3개 탭</dd></div>
          </dl>
        </div>
      </section>

      <main className={styles.departmentMain}>
        <div className="container">
          <PeExamDepartmentClient
            admissions={admissions}
            profile={profile}
            resultReference={resultReference}
            standards={standards}
            trackLabel={track.label}
          />

          <div className={styles.departmentBottomActions}>
            <Link href={schoolHref}>학과 선택으로 돌아가기</Link>
            <Link href={getPeExamSchoolTrackHref(region.region, alternateTrack.key, school.slug)}>
              {alternateTrack.label} 학교 상세
            </Link>
            <Link href={`/apply?service=pe-exam&target=${encodeURIComponent(`${schoolName} ${profile.name}`)}`}>
              상담 신청
            </Link>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
