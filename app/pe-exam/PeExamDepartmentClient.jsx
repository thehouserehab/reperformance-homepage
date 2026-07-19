"use client";

import { useMemo, useState } from "react";
import styles from "./PeExamHub.module.css";

const unitLabels = { cm: "cm", m: "m", sec: "초", reps: "회" };

function thresholdLabel(standard) {
  const operator = standard.operator === "gte" ? "이상" : standard.operator === "lte" ? "이하" : "미만";
  return `${standard.fullScoreThreshold}${unitLabels[standard.unit]} ${operator}`;
}

function attainmentFor(standard, value) {
  if (!Number.isFinite(value) || value <= 0) return null;
  const ratio = standard.operator === "gte"
    ? value / standard.fullScoreThreshold
    : standard.fullScoreThreshold / value;
  return Math.max(0, Math.min(100, ratio * 100));
}

function resultLabel(score) {
  if (score >= 95) return "공식 만점 기준에 매우 근접";
  if (score >= 85) return "상위 기준을 향해 안정적으로 준비 중";
  if (score >= 70) return "보완 종목을 정해 집중할 단계";
  return "기록 향상을 위한 우선순위 설정 필요";
}

/** @param {any} props */
export default function PeExamDepartmentClient(props) {
  const {
    admissions = [],
    profile,
    resultReference = null,
    standards = [],
    trackLabel,
  } = props;
  const [activeTab, setActiveTab] = useState("admission");
  const [sex, setSex] = useState("");
  const [grade, setGrade] = useState("");
  const [percentile, setPercentile] = useState("");
  const [englishGrade, setEnglishGrade] = useState("");
  const [interviewReadiness, setInterviewReadiness] = useState("");
  const [records, setRecords] = useState({});

  const eventGroups = useMemo(() => {
    const map = new Map();
    standards.forEach((standard) => {
      const rows = map.get(standard.eventId) || [];
      map.set(standard.eventId, [...rows, standard]);
    });
    return [...map.entries()].map(([eventId, rows]) => ({ eventId, rows, first: rows[0] }));
  }, [standards]);

  const readiness = useMemo(() => {
    const practicalItems = eventGroups
      .map(({ eventId, rows }) => {
        const value = Number(records[eventId]);
        const standard = rows.find((row) => row.sex === sex) || rows.find((row) => row.sex === "all");
        const score = standard ? attainmentFor(standard, value) : null;
        return standard && score !== null ? { score, standard, value } : null;
      })
      .filter(Boolean);
    const practicalScore = practicalItems.length
      ? practicalItems.reduce((sum, item) => sum + item.score, 0) / practicalItems.length
      : null;

    const academicScores = [];
    const percentileValue = Number(percentile);
    const percentileReference = Number(resultReference?.percentileAverage70);
    if (percentileValue > 0 && percentileReference > 0) {
      academicScores.push(Math.min(100, (percentileValue / percentileReference) * 100));
    }
    const englishValue = Number(englishGrade);
    const englishReference = Number(resultReference?.englishGrade70);
    if (englishValue > 0 && englishReference > 0) {
      academicScores.push(Math.min(100, (englishReference / englishValue) * 100));
    }
    const academicScore = academicScores.length
      ? academicScores.reduce((sum, score) => sum + score, 0) / academicScores.length
      : null;

    if (practicalScore === null && academicScore === null) return null;

    const practicalWeight = standards[0]?.practicalWeightPercent || 0;
    let score = practicalScore ?? academicScore;
    let basis = practicalScore !== null ? "실기 공식 기준 대비" : "공개 입결 대비";
    if (practicalScore !== null && academicScore !== null) {
      const normalizedPracticalWeight = practicalWeight / 100;
      score = practicalScore * normalizedPracticalWeight + academicScore * (1 - normalizedPracticalWeight);
      basis = "실기 공식 기준과 공개 입결 대비";
    }

    const coverage = practicalItems.length + academicScores.length;
    const expectedCoverage = eventGroups.length + (resultReference ? 1 : 0);
    const confidence = coverage >= expectedCoverage ? "보통" : "낮음";
    return {
      academicScore,
      basis,
      confidence,
      practicalItems,
      practicalScore,
      score: Math.round(score),
    };
  }, [englishGrade, eventGroups, percentile, records, resultReference, sex, standards]);

  const requiresInterview = admissions.some((admission) => admission.method.includes("면접"));
  const requiresStudentRecord = admissions.some((admission) => /학생부|학교생활기록부/.test(admission.method));

  return (
    <div className={styles.departmentWorkspace}>
      <div className={styles.departmentTabs} role="tablist" aria-label={`${profile.name} 정보 선택`}>
        {[
          ["admission", "전형·실기"],
          ["career", "학과·진로"],
          ["readiness", "내 준비도"],
        ].map(([key, label]) => (
          <button
            aria-selected={activeTab === key}
            key={key}
            onClick={() => setActiveTab(key)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "admission" ? (
        <section className={styles.departmentTabPanel} role="tabpanel">
          <div className={styles.departmentPanelHead}>
            <div>
              <span>{trackLabel} ADMISSION</span>
              <h2>{trackLabel} 전형과 공식 실기 기준</h2>
            </div>
            <p>수치는 해당 연도 공식 자료를 기준으로 하며 원서접수 전 최신 모집요강을 다시 확인합니다.</p>
          </div>

          <div className={styles.departmentAdmissionGrid}>
            {admissions.length ? admissions.map((admission) => (
              <article key={`${admission.title}-${admission.type}`}>
                <span>{admission.type || "전형"}</span>
                <h3>{admission.title}</h3>
                <dl>
                  <div><dt>반영방법</dt><dd>{admission.method || "공식 모집요강 확인"}</dd></div>
                  <div><dt>모집인원</dt><dd>{admission.quota || "공식 모집요강 확인"}</dd></div>
                  <div><dt>성적·입결</dt><dd>{admission.grade || "공개 수치 없음"}</dd></div>
                  {admission.minimumCriteria ? <div><dt>추가 기준</dt><dd>{admission.minimumCriteria}</dd></div> : null}
                </dl>
              </article>
            )) : (
              <article>
                <span>DATA CHECK</span>
                <h3>연결된 세부 전형 행이 없습니다.</h3>
                <p>학과와 대학 입학처의 최신 모집요강에서 전형명과 반영요소를 확인합니다.</p>
              </article>
            )}
          </div>

          <div className={styles.departmentStandardStrip} aria-label="공식 실기 만점 기준">
            {eventGroups.map(({ eventId, rows, first }) => (
              <article key={eventId}>
                <div>
                  <span>{first.eventName}</span>
                  <small>{first.protocol}</small>
                </div>
                <dl>
                  {rows.map((standard) => (
                    <div key={standard.sex}>
                      <dt>{standard.sex === "male" ? "남" : standard.sex === "female" ? "여" : "공통"}</dt>
                      <dd>{thresholdLabel(standard)}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "career" ? (
        <section className={styles.departmentTabPanel} role="tabpanel">
          <div className={styles.departmentCareerIntro}>
            <div>
              <span>DEPARTMENT</span>
              <h2>{profile.summary}</h2>
            </div>
            <a href={profile.officialUrl} rel="noopener noreferrer" target="_blank">공식 학과 페이지 ↗</a>
          </div>
          <div className={styles.departmentCareerGrid}>
            <article>
              <span>배우는 분야</span>
              <ul>{profile.studyAreas.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
            <article>
              <span>졸업 후 진로</span>
              <ul>{profile.careers.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
            <article>
              <span>관련 자격</span>
              <ul>{profile.credentials.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          </div>
          <p className={styles.departmentSourceNote}>진로와 교육 내용은 {profile.officialLabel}의 공개 설명을 요약했습니다.</p>
        </section>
      ) : null}

      {activeTab === "readiness" ? (
        <section className={styles.departmentTabPanel} role="tabpanel">
          <div className={styles.readinessLayout}>
            <div className={styles.readinessForm}>
              <div className={styles.departmentPanelHead}>
                <div>
                  <span>LOCAL RECORD REVIEW</span>
                  <h2>성적과 기록을 입력해 준비도를 확인하세요.</h2>
                </div>
                <p>입력값은 이 브라우저에서만 계산되며 서버로 전송하거나 저장하지 않습니다.</p>
              </div>

              <div className={styles.readinessInputGrid}>
                <label>
                  <span>성별</span>
                  <select onChange={(event) => setSex(event.target.value)} value={sex}>
                    <option value="">선택</option>
                    <option value="male">남</option>
                    <option value="female">여</option>
                  </select>
                </label>
                {requiresStudentRecord ? (
                  <label>
                    <span>학생부 평균등급</span>
                    <input inputMode="decimal" min="1" max="9" onChange={(event) => setGrade(event.target.value)} placeholder="예: 3.2" step="0.1" type="number" value={grade} />
                  </label>
                ) : null}
                {resultReference ? (
                  <>
                    <label>
                      <span>수능 평균백분위</span>
                      <input inputMode="decimal" min="0" max="100" onChange={(event) => setPercentile(event.target.value)} placeholder="예: 82" step="0.1" type="number" value={percentile} />
                    </label>
                    <label>
                      <span>영어 등급</span>
                      <input inputMode="numeric" min="1" max="9" onChange={(event) => setEnglishGrade(event.target.value)} placeholder="1-9" step="1" type="number" value={englishGrade} />
                    </label>
                  </>
                ) : null}
                {requiresInterview ? (
                  <label>
                    <span>면접 준비 상태</span>
                    <select onChange={(event) => setInterviewReadiness(event.target.value)} value={interviewReadiness}>
                      <option value="">선택</option>
                      <option value="questions">질문만 정리함</option>
                      <option value="answers">답변 초안 작성</option>
                      <option value="practice">모의면접 진행</option>
                    </select>
                  </label>
                ) : null}
              </div>

              <div className={styles.readinessRecordGrid}>
                {eventGroups.map(({ eventId, first }) => (
                  <label key={eventId}>
                    <span>{first.eventName}</span>
                    <span>
                      <input
                        inputMode="decimal"
                        min="0"
                        onChange={(event) => setRecords((current) => ({ ...current, [eventId]: event.target.value }))}
                        placeholder="현재 기록"
                        step="0.01"
                        type="number"
                        value={records[eventId] || ""}
                      />
                      <em>{unitLabels[first.unit]}</em>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <aside className={styles.readinessResult} aria-live="polite">
              <span>REFERENCE READINESS</span>
              {readiness ? (
                <>
                  <strong>{readiness.score}<small>/100</small></strong>
                  <h3>{resultLabel(readiness.score)}</h3>
                  <p>{readiness.basis} 계산 · 자료 신뢰도 {readiness.confidence}</p>
                  <dl>
                    <div><dt>실기 입력</dt><dd>{readiness.practicalItems.length}/{eventGroups.length}개</dd></div>
                    <div><dt>학생부</dt><dd>{grade ? `${grade}등급 · 상담 비교 필요` : "미입력"}</dd></div>
                    {requiresInterview ? <div><dt>면접</dt><dd>{interviewReadiness ? "준비상태 반영 전 확인" : "미입력"}</dd></div> : null}
                  </dl>
                </>
              ) : (
                <>
                  <strong>--<small>/100</small></strong>
                  <h3>성별과 현재 기록을 입력하세요.</h3>
                  <p>공식 만점 기록표와 직접 비교할 수 있는 항목만 계산합니다.</p>
                </>
              )}
            </aside>
          </div>

          <div className={styles.readinessDisclaimer}>
            <strong>이 수치는 합격 확률이나 합격 판정이 아닙니다.</strong>
            <p>
              공개된 실기 기준과 입결 일부를 바탕으로 현재 준비 상태를 정리한 참고치입니다. 학생부 세부 평가,
              면접, 지원자 분포, 모집인원 변화와 당일 기록에 따라 실제 결과는 달라질 수 있습니다.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
