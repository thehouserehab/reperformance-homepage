"use client";

import { FormEvent, useState } from "react";

type NutritionAnalysis = {
  analysisId?: string;
  calories?: number | string | null;
  carbohydrates?: number | string | null;
  protein?: number | string | null;
  fat?: number | string | null;
  draftFeedback?: string;
};

type NoreNutritionAnalyzerProps = {
  workspace: "member" | "pe-exam";
};

function formatValue(value: NutritionAnalysis[keyof NutritionAnalysis], unit: string) {
  if (value === null || value === undefined || value === "") return "NORE 응답 대기";
  return `${value}${unit}`;
}

export function NoreNutritionAnalyzer({ workspace }: NoreNutritionAnalyzerProps) {
  const [analysis, setAnalysis] = useState<NutritionAnalysis | null>(null);
  const [draftFeedback, setDraftFeedback] = useState("");
  const [memberReference, setMemberReference] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setAnalysis(null);
    setIsAnalyzing(true);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("workspace", workspace);

      const response = await fetch("/api/nore/nutrition-analysis", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "식단 분석 요청에 실패했습니다.");
      }

      setAnalysis(payload.analysis);
      setDraftFeedback(payload.analysis?.draftFeedback || "");
      setStatus("NORE 분석 초안을 불러왔습니다.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "식단 분석 요청 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSend() {
    if (!draftFeedback.trim()) {
      setError("전송할 피드백 내용을 입력해주세요.");
      return;
    }

    setError("");
    setStatus("");
    setIsSending(true);

    try {
      const response = await fetch("/api/nore/nutrition-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace,
          memberReference,
          analysisId: analysis?.analysisId || "",
          feedback: draftFeedback,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "피드백 전송에 실패했습니다.");
      }

      setStatus("수정한 피드백을 NORE로 전송했습니다.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "피드백 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <article className="workspace-nore-panel">
      <div className="workspace-panel-head">
        <p className="eyebrow">NORE NUTRITION</p>
        <h2>식단 사진 분석</h2>
        <span>사진을 NORE 분석 API로 보내고, 코치가 문장을 다듬어 전송합니다.</span>
      </div>

      <form className="workspace-nore-form" onSubmit={handleAnalyze}>
        <label>
          <span>NORE 회원 연결 ID</span>
          <input
            name="memberReference"
            type="text"
            value={memberReference}
            onChange={(event) => setMemberReference(event.target.value)}
            placeholder="상담 후 발급된 NORE ID"
          />
        </label>
        <label>
          <span>음식 사진</span>
          <input name="photo" type="file" accept="image/*" required />
        </label>
        <button type="submit" disabled={isAnalyzing}>
          {isAnalyzing ? "분석 중" : "식단 분석하기"}
        </button>
      </form>

      {analysis ? (
        <div className="workspace-nore-result">
          <div className="workspace-macro-grid">
            <div>
              <strong>{formatValue(analysis.calories, "kcal")}</strong>
              <span>칼로리</span>
            </div>
            <div>
              <strong>{formatValue(analysis.carbohydrates, "g")}</strong>
              <span>탄수화물</span>
            </div>
            <div>
              <strong>{formatValue(analysis.protein, "g")}</strong>
              <span>단백질</span>
            </div>
            <div>
              <strong>{formatValue(analysis.fat, "g")}</strong>
              <span>지방</span>
            </div>
          </div>
          <label>
            <span>코치 수정 피드백</span>
            <textarea
              value={draftFeedback}
              onChange={(event) => setDraftFeedback(event.target.value)}
              placeholder="NORE 초안을 확인한 뒤 회원에게 보낼 문장으로 수정합니다."
            />
          </label>
          <button type="button" onClick={handleSend} disabled={isSending}>
            {isSending ? "전송 중" : "회원에게 전송"}
          </button>
        </div>
      ) : null}

      {status ? <p className="workspace-nore-status">{status}</p> : null}
      {error ? <p className="workspace-nore-error">{error}</p> : null}
    </article>
  );
}
