import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "../../../lib/rpAdminAuth";
import { PageShell } from "../../_components/SiteChrome";
import { faqItems } from "../peExamData";
import styles from "./PeExamFaq.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "체대입시 FAQ | RePERFORMANCE",
  description:
    "RePERFORMANCE 체대입시 자주 묻는 질문과 로그인 회원 전용 질문 남기기 페이지입니다.",
};

const questionTypes = ["입시일정", "대학별 전형", "실기 기록", "등급·입결", "AI 상담", "기타"] as const;
const admissionTracks = ["공통", "수시", "정시"] as const;

const statusMessages: Record<string, { title: string; text: string }> = {
  success: {
    title: "질문이 접수되었습니다.",
    text: "확인 후 상담 또는 답변 준비에 반영하겠습니다.",
  },
  setup: {
    title: "질문 저장소 연결이 필요합니다.",
    text: "현재 DB 환경변수가 없어 질문을 저장하지 못했습니다.",
  },
  invalid: {
    title: "필수 항목을 확인해 주세요.",
    text: "질문 내용은 반드시 입력해야 합니다.",
  },
  error: {
    title: "질문 저장 중 오류가 발생했습니다.",
    text: "잠시 후 다시 시도해 주세요.",
  },
};

type FaqSearchParams = {
  question?: string;
};

export default async function PeExamFaqPage({
  searchParams,
}: {
  searchParams?: Promise<FaqSearchParams>;
}) {
  const cookieStore = await cookies();
  const session = await verifyAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  const resolvedSearchParams = await searchParams;
  const status = resolvedSearchParams?.question || "";
  const statusMessage = statusMessages[status];

  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">PE EXAM FAQ</p>
          <h1>체대입시 FAQ</h1>
          <p>자주 묻는 질문을 확인하고, 로그인 회원은 궁금한 내용을 직접 남길 수 있습니다.</p>
        </div>
      </section>

      <section className="section">
        <div className={`container ${styles.layout}`}>
          <main className={styles.faqColumn}>
            <div className={styles.sectionHead}>
              <p className="eyebrow">QUESTIONS</p>
              <h2>상담 전에 많이 묻는 질문</h2>
            </div>

            <div className={styles.faqList}>
              {faqItems.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </main>

          <aside className={styles.questionPanel} aria-label="체대입시 질문 남기기">
            <p className="eyebrow">MEMBER QUESTION</p>
            <h2>질문 남기기</h2>
            <p>
              로그인한 회원은 희망 대학, 수시·정시 구분, 궁금한 항목을 남길 수 있습니다.
              비회원은 상담 신청으로 문의해 주세요.
            </p>

            {statusMessage && (
              <div className={`${styles.statusBox} ${status === "success" ? styles.success : ""}`}>
                <strong>{statusMessage.title}</strong>
                <span>{statusMessage.text}</span>
              </div>
            )}

            {session ? (
              <form className={styles.questionForm} action="/api/rp/pe-exam-question" method="post">
                <label>
                  질문 유형
                  <select name="questionType" defaultValue="대학별 전형">
                    {questionTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
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

                <label>
                  희망 대학
                  <input name="targetUniversity" placeholder="예: 전북대학교, 한국체육대학교" type="text" />
                </label>

                <label>
                  질문 내용
                  <textarea
                    name="questionText"
                    placeholder="현재 궁금한 전형, 실기 기록, 등급 기준, 준비 방향을 적어주세요."
                    required
                    rows={7}
                  />
                </label>

                <button type="submit">질문 접수</button>
              </form>
            ) : (
              <div className={styles.loginNotice}>
                <strong>로그인 회원만 질문을 남길 수 있습니다.</strong>
                <span>FAQ는 누구나 볼 수 있고, 질문 저장은 회원 계정으로 로그인한 뒤 이용합니다.</span>
                <Link className="button secondary" href="/login?next=/pe-exam/faq">
                  로그인
                </Link>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className={`section ${styles.consultBand}`}>
        <div className={`container ${styles.consultInner}`}>
          <div>
            <p className="eyebrow light-text">CONSULTATION</p>
            <h2>비회원도 체대입시 상담 신청은 가능합니다.</h2>
            <p>
              희망 대학, 실기 종목, 현재 기록, 운동 가능 시간을 정리해 신청해 주세요.
              상담 후 필요한 학생에게 내부 관리 방식을 별도로 안내합니다.
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
