import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "../../../lib/rpAdminAuth";
import { PageShell } from "../../_components/SiteChrome";
import styles from "./PeExamAiConsult.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 체대입시 상담 준비 | RePERFORMANCE",
  description:
    "로그인 회원이 성적, 실기 기록, 희망 대학을 정리해 향후 AI 체대입시 상담 기능 도입에 대비하는 RePERFORMANCE 제한 공개 페이지입니다.",
};

const gradeLevels = ["고1", "고2", "고3", "N수", "기타"] as const;
const admissionTracks = ["공통", "수시", "정시"] as const;

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
};

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

  return (
    <PageShell>
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div>
            <p className="eyebrow light-text">LIMITED ACCESS</p>
            <h1>AI 체대입시 상담 준비</h1>
            <p>
              로그인 회원이 성적, 실기 기록, 희망 대학을 미리 정리하는 제한 공개 페이지입니다.
              자동 분석 기능은 도입 예정이며, 지금은 상담 준비 자료로 안전하게 저장합니다.
            </p>
          </div>

          <aside className={styles.statusPanel} aria-label="AI 상담 도입 상태">
            <strong>도입 예정</strong>
            <p>현재 단계에서는 AI가 즉시 합격 가능성이나 지원 대학을 단정하지 않습니다.</p>
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
              <form className={styles.form} action="/api/rp/pe-exam-ai-consult" method="post">
                <div className={styles.fieldGrid}>
                  <label>
                    학년
                    <select name="gradeLevel" defaultValue="고3">
                      {gradeLevels.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    준비 구분
                    <select name="admissionTrack" defaultValue="공통">
                      {admissionTracks.map((track) => (
                        <option key={track} value={track}>
                          {track}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className={styles.fieldGrid}>
                  <label>
                    희망 대학
                    <input name="targetUniversity" placeholder="예: 한국체육대학교, 전북대학교" type="text" />
                  </label>

                  <label>
                    희망 학과/계열
                    <input name="targetDepartment" placeholder="예: 체육교육과, 스포츠과학과" type="text" />
                  </label>
                </div>

                <label>
                  내신 현황
                  <textarea
                    name="schoolGrade"
                    placeholder="예: 주요 교과 평균 3.2등급, 체육 관련 활동, 출결 특이사항"
                    rows={4}
                  />
                </label>

                <label>
                  수능/모의고사 현황
                  <textarea
                    name="mockExam"
                    placeholder="예: 국어 4, 수학 5, 영어 3, 탐구 평균 4 / 최근 모의고사 기준"
                    rows={4}
                  />
                </label>

                <label>
                  실기 종목별 현재 기록
                  <textarea
                    name="practicalRecords"
                    placeholder="예: 제자리멀리뛰기 245cm, 10m 왕복 8.8초, 메디신볼 9.2m"
                    rows={5}
                  />
                </label>

                <label>
                  운동 가능 시간과 준비 상황
                  <textarea
                    name="trainingContext"
                    placeholder="예: 주 4회, 회당 90분 가능 / 학원 수업 병행 / 실기 시작 3개월차"
                    rows={4}
                  />
                </label>

                <label>
                  부상·컨디션 메모
                  <textarea
                    name="injuryNote"
                    placeholder="예: 발목 염좌 이력, 허리 불편, 최근 컨디션 저하 등"
                    rows={3}
                  />
                </label>

                <label>
                  상담에서 가장 알고 싶은 것
                  <textarea
                    name="questionFocus"
                    placeholder="예: 수시/정시 중 어디에 집중해야 하는지, 목표 대학을 낮춰야 하는지"
                    rows={5}
                  />
                </label>

                <button type="submit">AI 상담 사전 입력 저장</button>
              </form>
            ) : (
              <div className={styles.loginNotice}>
                <strong>로그인 회원만 이용할 수 있습니다.</strong>
                <span>개인 성적과 운동 기록을 다루는 페이지라 로그인 후 사전 입력을 받을 수 있습니다.</span>
                <Link className="button primary" href="/login?next=/pe-exam/ai-consult">
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
