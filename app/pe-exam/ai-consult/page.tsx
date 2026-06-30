import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "../../../lib/rpAdminAuth";
import { PageShell } from "../../_components/SiteChrome";
import { getPeExamSchoolTrackHref, peExamRegionDetails } from "../peExamData";
import PeExamAiConsultClient from "./PeExamAiConsultClient";
import styles from "./PeExamAiConsult.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 체대입시 상담 준비 | RePERFORMANCE",
  description:
    "로그인 회원이 성적, 실기 기록, 희망 대학을 정리해 향후 AI 체대입시 상담 기능 도입에 대비하는 RePERFORMANCE 제한 공개 페이지입니다.",
};

const statusMessages: Record<string, { title: string; text: string }> = {
  success: {
    title: "AI 상담 사전 입력이 저장되었습니다.",
    text: "향후 AI 상담 기능과 체대입시 상담 준비 자료에 반영하겠습니다.",
  },
  setup: {
    title: "저장소 연결이 필요합니다.",
    text: "현재 DB 환경변수가 없어 사전 입력을 저장하지 못했습니다.",
  },
  invalid: {
    title: "입력 항목을 확인해주세요.",
    text: "희망 대학, 실기 기록, 상담 목표 중 하나 이상은 입력해야 합니다.",
  },
  error: {
    title: "저장 중 오류가 발생했습니다.",
    text: "잠시 후 다시 시도해주세요.",
  },
};

type AiConsultSearchParams = {
  request?: string;
  target?: string;
  university?: string;
  track?: string;
  department?: string;
};

function cleanSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0]?.trim() || "" : value?.trim() || "";
}

function normalizeInitialTrack(value: string) {
  if (value === "early" || value === "수시") return "수시";
  if (value === "regular" || value === "정시") return "정시";
  return "공통";
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()[\]{}<>.,;:|/\\'"`~!@#$%^&*_+=?-]/g, "")
    .replace(/대학교|대학|캠퍼스|본교|분교|학교/g, "");
}

function uniqueTexts(values: readonly string[], limit = 40) {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    const text = value.trim().replace(/\s+/g, " ");
    const key = text.toLowerCase();

    if (!text || seen.has(key)) continue;

    seen.add(key);
    results.push(text);

    if (results.length >= limit) break;
  }

  return results;
}

function cleanDepartmentOption(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*[·-]\s*모집인원.*$/g, "")
    .replace(/\s*공식 모집요강 확인.*$/g, "")
    .replace(/\s*\d+\s*명.*$/g, "")
    .replace(/\s*외\s+\d+개$/g, "")
    .trim();
}

function splitDepartmentSummary(value: string) {
  return value
    .split(/[,;/|]/)
    .map(cleanDepartmentOption)
    .filter((item) => item && !item.includes("모집단위는 ADIGA"));
}

function getSchoolDisplayName(school: (typeof peExamRegionDetails)[number]["universities"][number]) {
  return `${school.name}${school.campus ? ` ${school.campus}` : ""}`;
}

function getDepartmentOptions(school: (typeof peExamRegionDetails)[number]["universities"][number]) {
  const values = [
    ...(school.earlyAdmissions || []).map((admission) => admission.unit || ""),
    ...(school.regularAdmissions || []).flatMap((admission) => [
      ...(admission.units || []).map((unit) => unit.name || ""),
      admission.unitSummary || "",
    ]),
  ];

  return uniqueTexts(values.flatMap(splitDepartmentSummary), 80);
}

function buildUniversityOptions() {
  return peExamRegionDetails.flatMap((region) =>
    region.universities.map((school) => {
      const displayName = getSchoolDisplayName(school);
      const departmentOptions = getDepartmentOptions(school);
      const earlyHref = getPeExamSchoolTrackHref(region.region, "early", school.slug);
      const regularHref = getPeExamSchoolTrackHref(region.region, "regular", school.slug);
      const searchKeywords = uniqueTexts([
        school.name,
        displayName,
        school.campus || "",
        school.area,
        school.region,
        school.schoolType,
        ...("searchKeywords" in school && Array.isArray(school.searchKeywords) ? school.searchKeywords : []),
        ...departmentOptions,
      ]);

      return {
        id: `${region.slug}:${school.slug}`,
        code: school.code,
        name: school.name,
        displayName,
        area: school.area,
        region: region.region,
        schoolType: school.schoolType,
        slug: school.slug,
        href: earlyHref,
        earlyHref,
        regularHref,
        searchKeywords,
        searchText: uniqueTexts([...searchKeywords, ...searchKeywords.map(normalizeSearchText)]).join(" "),
        departmentOptions,
        trackSummary: `수시 ${school.earlyAdmissions.length}건 · 정시 ${school.regularAdmissions.length}건`,
      };
    }),
  );
}

function buildInitialQuery(initialValues: {
  targetUniversity: string;
  targetDepartment: string;
  admissionTrack: string;
}) {
  const params = new URLSearchParams();

  if (initialValues.targetUniversity) params.set("target", initialValues.targetUniversity);
  if (initialValues.targetDepartment) params.set("department", initialValues.targetDepartment);
  if (initialValues.admissionTrack && initialValues.admissionTrack !== "공통") {
    params.set("track", initialValues.admissionTrack);
  }

  return params.toString();
}

export default async function PeExamAiConsultPage({
  searchParams,
}: {
  searchParams?: Promise<AiConsultSearchParams>;
}) {
  const cookieStore = await cookies();
  const session = await verifyAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  const resolvedSearchParams = await searchParams;
  const status = resolvedSearchParams?.request || "";
  const statusMessage = statusMessages[status];
  const initialValues = {
    targetUniversity:
      cleanSearchValue(resolvedSearchParams?.target) || cleanSearchValue(resolvedSearchParams?.university),
    targetDepartment: cleanSearchValue(resolvedSearchParams?.department),
    admissionTrack: normalizeInitialTrack(cleanSearchValue(resolvedSearchParams?.track)),
  };
  const initialQuery = buildInitialQuery(initialValues);
  const nextPath = initialQuery ? `/pe-exam/ai-consult?${initialQuery}` : "/pe-exam/ai-consult";
  const universityOptions = buildUniversityOptions();

  return (
    <PageShell>
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div>
            <p className="eyebrow light-text">LIMITED ACCESS</p>
            <h1>AI 체대입시 상담 준비</h1>
            <p>
              로그인 회원이 성적, 실기 기록, 희망 대학을 미리 정리하는 제한 공개 페이지입니다.
              지금은 입력값을 바탕으로 상담 준비 방향을 즉시 정리하고, 향후 AI 정밀 상담 기능으로 확장합니다.
            </p>
          </div>

          <aside className={styles.statusPanel} aria-label="AI 상담 도입 상태">
            <strong>제한 공개</strong>
            <p>현재 단계에서는 합격 가능성을 단정하지 않고, 수시·정시 준비 방향과 확인 우선순위를 정리합니다.</p>
            <p>입력 자료는 향후 AI 상담 기능과 실제 체대입시 상담의 기초 정보로 활용됩니다.</p>
            <ul className={styles.aiLimitList}>
              <li>합격·불합격 가능성을 확정하거나 보장하지 않습니다.</li>
              <li>대학별 공식 모집요강, 전년도 입결, 실측 기록 확인을 대체하지 않습니다.</li>
              <li>부상·통증 판단은 의료진 진단이 아니라 운동 상담 전 참고 정보로만 사용합니다.</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className={`section ${styles.section}`}>
        <div className={`container ${styles.layout}`}>
          <main className={styles.formColumn}>
            <div className={styles.sectionHead}>
              <p className="eyebrow">PRE-CONSULT INPUT</p>
              <h2>성적, 실기 기록, 희망 대학을 한 번에 정리합니다.</h2>
              <p>
                수시와 정시 준비생이 함께 사용할 수 있도록 내신, 모의고사, 실기 기록,
                운동 가능 시간, 부상 메모를 나누어 입력합니다.
              </p>
            </div>

            {statusMessage && (
              <div className={`${styles.statusBox} ${status === "success" ? styles.success : ""}`}>
                <strong>{statusMessage.title}</strong>
                <span>{statusMessage.text}</span>
              </div>
            )}

            {session ? (
              <PeExamAiConsultClient initialValues={initialValues} universityOptions={universityOptions} />
            ) : (
              <div className={styles.loginNotice}>
                <strong>로그인 회원만 이용할 수 있습니다.</strong>
                <span>개인 성적과 운동 기록을 다루는 페이지라 로그인 후 사전 입력을 받을 수 있습니다.</span>
                <Link className="button primary" href={`/login?next=${encodeURIComponent(nextPath)}`}>
                  로그인 후 입력하기
                </Link>
              </div>
            )}
          </main>

          <aside className={styles.guidePanel}>
            <p className="eyebrow">WHAT WILL BE USED</p>
            <h2>향후 AI 상담에서 볼 항목</h2>
            <dl>
              <div>
                <dt>성적 위치</dt>
                <dd>내신, 모의고사, 수능 반영 가능성을 수시·정시 관점으로 분리합니다.</dd>
              </div>
              <div>
                <dt>실기 기록</dt>
                <dd>대학별 실기 종목과 현재 기록의 차이를 확인하는 데 사용합니다.</dd>
              </div>
              <div>
                <dt>희망 대학</dt>
                <dd>지역별 대학 상세 자료와 연결해 지원 후보군을 좁히는 기준으로 씁니다.</dd>
              </div>
              <div>
                <dt>컨디션</dt>
                <dd>부상, 운동 가능 시간, 남은 기간을 무리 없는 준비 계획에 반영합니다.</dd>
              </div>
            </dl>
            <Link href="/pe-exam#universities">지역별 대학 먼저 보기</Link>
          </aside>
        </div>
      </section>

      <section className={`section ${styles.consultBand}`}>
        <div className={`container ${styles.consultInner}`}>
          <div>
            <p className="eyebrow light-text">NEXT STEP</p>
            <h2>자동 분석 전에도 상담 신청은 가능합니다.</h2>
            <p>
              입력 내용만으로 지원 가능성을 확정하지 않고, 실제 기록과 일정, 몸 상태를 함께 보고
              체대입시 상담에서 방향을 정리합니다.
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
