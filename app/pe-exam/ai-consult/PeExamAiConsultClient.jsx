"use client";

import { useMemo, useState } from "react";
import styles from "./PeExamAiConsult.module.css";

const gradeLevels = ["고1", "고2", "고3", "N수", "기타"];
const admissionTracks = ["공통", "수시", "정시"];

const emptyStatus = {
  tone: "",
  title: "",
  text: "",
};

function readForm(form) {
  const data = new FormData(form);
  return Object.fromEntries([...data.entries()].map(([key, value]) => [key, String(value || "").trim()]));
}

function isIncluded(values, value, fallback) {
  return values.includes(value) ? value : fallback;
}

export default function PeExamAiConsultClient({ initialValues = {} }) {
  const [status, setStatus] = useState(emptyStatus);
  const [guidance, setGuidance] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasGuidance = useMemo(() => guidance && Array.isArray(guidance.cards) && guidance.cards.length > 0, [guidance]);
  const universityMatches = Array.isArray(guidance?.universityMatches) ? guidance.universityMatches : [];
  const profileSummary = Array.isArray(guidance?.profileSummary) ? guidance.profileSummary : [];
  const initialAdmissionTrack = isIncluded(admissionTracks, initialValues.admissionTrack, "공통");
  const initialGradeLevel = isIncluded(gradeLevels, initialValues.gradeLevel, "고3");
  const hasInitialContext = Boolean(
    initialValues.targetUniversity || initialValues.targetDepartment || initialAdmissionTrack !== "공통",
  );

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = readForm(form);

    setIsSubmitting(true);
    setStatus(emptyStatus);

    try {
      const response = await fetch("/api/rp/pe-exam-ai-consult", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        setGuidance(result.guidance || null);
        setStatus({
          tone: result.setupRequired && result.guidance ? "success" : "error",
          title:
            result.setupRequired && result.guidance
              ? "방향 가이드는 정리했고, 저장소 연결이 필요합니다."
              : "입력 내용을 저장하지 못했습니다.",
          text:
            result.setupRequired && result.guidance
              ? "현재 환경에서는 저장만 완료되지 않았습니다. 아래 가이드는 상담 준비용으로 확인할 수 있습니다."
              : result.error || "잠시 후 다시 시도해주세요.",
        });
        return;
      }

      setGuidance(result.guidance || null);
      setStatus({
        tone: "success",
        title: "AI 상담 방향 가이드가 정리되었습니다.",
        text: "입력 내용은 상담 준비 자료로 저장했고, 아래에 현재 우선순위를 정리했습니다.",
      });
    } catch (error) {
      setGuidance(null);
      setStatus({
        tone: "error",
        title: "연결 중 오류가 발생했습니다.",
        text: "인터넷 연결을 확인한 뒤 다시 시도해주세요.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {status.title && (
        <div className={`${styles.statusBox} ${status.tone === "success" ? styles.success : ""}`}>
          <strong>{status.title}</strong>
          <span>{status.text}</span>
        </div>
      )}

      {hasInitialContext && (
        <div className={styles.prefillNotice}>
          <strong>대학 상세 페이지에서 가져온 정보가 입력되어 있습니다.</strong>
          <span>성적과 실기 기록을 추가하면 이 대학 기준의 상담 방향을 바로 정리할 수 있습니다.</span>
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.fieldGrid}>
          <label>
            학년
            <select name="gradeLevel" defaultValue={initialGradeLevel}>
              {gradeLevels.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>

          <label>
            준비 구분
            <select name="admissionTrack" defaultValue={initialAdmissionTrack}>
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
            <input
              defaultValue={initialValues.targetUniversity || ""}
              name="targetUniversity"
              placeholder="예: 한국체육대학교, 전북대학교"
              type="text"
            />
          </label>

          <label>
            희망 학과/계열
            <input
              defaultValue={initialValues.targetDepartment || ""}
              name="targetDepartment"
              placeholder="예: 체육교육과, 스포츠과학과"
              type="text"
            />
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
          <textarea name="injuryNote" placeholder="예: 발목 염좌 이력, 허리 불편, 최근 컨디션 저하 등" rows={3} />
        </label>

        <label>
          상담에서 가장 알고 싶은 것
          <textarea
            name="questionFocus"
            placeholder="예: 수시/정시 중 어디에 집중해야 하는지, 목표 대학을 낮춰야 하는지"
            rows={5}
          />
        </label>

        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "정리 중..." : "AI 상담 방향 가이드 받기"}
        </button>
      </form>

      {hasGuidance && (
        <section className={styles.guidancePreview} aria-live="polite">
          <div>
            <p className="eyebrow">DIRECTION GUIDE</p>
            <h3>{guidance.title}</h3>
            <p>{guidance.summary}</p>
          </div>

          {profileSummary.length > 0 && (
            <div className={styles.profileSummaryPanel}>
              <div>
                <p className="eyebrow">INPUT SUMMARY</p>
                <h4>입력 내용 반영 요약</h4>
              </div>
              <dl className={styles.profileSummaryGrid}>
                {profileSummary.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className={styles.guidanceGrid}>
            {guidance.cards.map((card) => (
              <article className={styles.guidanceCard} key={card.title}>
                <span>{card.label}</span>
                <strong>{card.title}</strong>
                <p>{card.text}</p>
              </article>
            ))}
          </div>

          {universityMatches.length > 0 && (
            <div className={styles.matchPanel}>
              <div className={styles.matchHead}>
                <p className="eyebrow">MATCHED UNIVERSITY DATA</p>
                <h4>희망 대학 상세 자료</h4>
              </div>

              <div className={styles.matchGrid}>
                {universityMatches.map((match) => (
                  <article className={styles.matchCard} key={`${match.href}-${match.trackKey}`}>
                    <span className={styles.matchMeta}>
                      {match.region} · {match.trackLabel}
                    </span>
                    <strong>{match.schoolName}</strong>
                    <p>{match.summary}</p>

                    {Array.isArray(match.practicalItems) && match.practicalItems.length > 0 && (
                      <dl>
                        <dt>실기 기준</dt>
                        <dd>{match.practicalItems.join(" / ")}</dd>
                      </dl>
                    )}

                    {Array.isArray(match.resultItems) && match.resultItems.length > 0 && (
                      <dl>
                        <dt>{match.resultLabel || "등급·입결"}</dt>
                        <dd>{match.resultItems.join(" / ")}</dd>
                      </dl>
                    )}

                    <a href={match.href}>대학 상세 보기</a>
                  </article>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(guidance.nextSteps) && guidance.nextSteps.length > 0 && (
            <ol className={styles.nextStepList}>
              {guidance.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}

          <p className={styles.guidanceNotice}>
            이 가이드는 입력값을 바탕으로 한 준비 방향 정리입니다. 최종 지원 판단은 대학별 모집요강,
            전년도 입결, 실측 기록, 부상 상태를 함께 보고 상담에서 확정합니다.
          </p>
        </section>
      )}
    </>
  );
}
