import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "../../../lib/rpAdminAuth";
import { PageShell } from "../../_components/SiteChrome";
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
              <PeExamAiConsultClient initialValues={initialValues} />
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
