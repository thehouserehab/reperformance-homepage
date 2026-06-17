"use client";

import { FormEvent, useState } from "react";

type PeExamPlan = {
  suggestion?: string;
  caution?: string;
  schedule?: Array<string | { label?: string; date?: string; memo?: string }>;
};

export function NorePeExamPlanner() {
  const [plan, setPlan] = useState<PeExamPlan | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setPlan(null);
    setIsLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/nore/pe-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveAndSuggest",
          targetUniversities: formData.get("targetUniversities"),
          practicalRecords: formData.get("practicalRecords"),
          trainingPlan: formData.get("trainingPlan"),
          conditionCheck: formData.get("conditionCheck"),
          admissionSchedule: formData.get("admissionSchedule"),
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "체대입시 연동 요청에 실패했습니다.");
      }

      setPlan(payload.plan);
      setStatus("NORE에 저장하고 훈련 제안 초안을 불러왔습니다.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "체대입시 연동 요청 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <article className="workspace-nore-panel workspace-nore-panel-wide">
      <div className="workspace-panel-head">
        <p className="eyebrow">NORE PE EXAM</p>
        <h2>체대입시 관리 연동</h2>
        <span>목표, 기록, 훈련, 컨디션, 일정을 NORE로 보내 훈련 제안 초안을 받습니다.</span>
      </div>

      <form className="workspace-nore-form workspace-nore-text-grid" onSubmit={handleSubmit}>
        <label>
          <span>목표 대학</span>
          <textarea name="targetUniversities" placeholder="상담 후 정리한 목표 대학을 입력합니다." />
        </label>
        <label>
          <span>실기 기록</span>
          <textarea name="practicalRecords" placeholder="현재 확인된 실기 기록과 변화 흐름을 입력합니다." />
        </label>
        <label>
          <span>훈련 계획</span>
          <textarea name="trainingPlan" placeholder="이번 주 훈련 가능 시간과 우선순위를 입력합니다." />
        </label>
        <label>
          <span>컨디션 체크</span>
          <textarea name="conditionCheck" placeholder="운동 전 확인할 몸 상태와 주의사항을 입력합니다." />
        </label>
        <label className="workspace-nore-span">
          <span>입시 일정</span>
          <textarea name="admissionSchedule" placeholder="확인해야 할 공개 일정과 상담 메모를 입력합니다." />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "요청 중" : "NORE에 저장하고 제안 받기"}
        </button>
      </form>

      {plan ? (
        <div className="workspace-nore-result">
          {plan.suggestion ? (
            <div className="workspace-nore-copy">
              <strong>훈련 제안 초안</strong>
              <p>{plan.suggestion}</p>
            </div>
          ) : null}
          {plan.caution ? (
            <div className="workspace-nore-copy">
              <strong>주의사항</strong>
              <p>{plan.caution}</p>
            </div>
          ) : null}
          {plan.schedule?.length ? (
            <div className="workspace-slot-list">
              {plan.schedule.map((item, index) => {
                const label = typeof item === "string" ? item : item.label || [item.date, item.memo].filter(Boolean).join(" ");
                return (
                  <div key={`${label}-${index}`}>
                    <strong>{label}</strong>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {status ? <p className="workspace-nore-status">{status}</p> : null}
      {error ? <p className="workspace-nore-error">{error}</p> : null}
    </article>
  );
}
