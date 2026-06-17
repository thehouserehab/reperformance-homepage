"use client";

import { FormEvent, useState } from "react";

type RecommendedSlot = {
  label?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  memo?: string;
};

export function NoreReservationAssistant() {
  const [slots, setSlots] = useState<RecommendedSlot[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRecommend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setSlots([]);
    setIsLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/nore/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recommendSlots",
          serviceType: formData.get("serviceType"),
          preferredDate: formData.get("preferredDate"),
          preferredTime: formData.get("preferredTime"),
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "예약 추천 요청에 실패했습니다.");
      }

      setSlots(payload.slots || []);
      setStatus(payload.slots?.length ? "추천 가능한 시간을 불러왔습니다." : "NORE 응답에 추천 시간이 없습니다.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "예약 추천 요청 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <article className="workspace-nore-panel">
      <div className="workspace-panel-head">
        <p className="eyebrow">NORE BOOKING</p>
        <h2>예약 빈 시간 추천</h2>
        <span>희망 조건을 NORE 예약 API로 보내 빈 시간을 확인합니다.</span>
      </div>

      <form className="workspace-nore-form workspace-nore-form-compact" onSubmit={handleRecommend}>
        <label>
          <span>서비스</span>
          <select name="serviceType" defaultValue="member">
            <option value="member">일반 회원</option>
            <option value="pe-exam">체대입시</option>
            <option value="pain-care">통증 케어</option>
          </select>
        </label>
        <label>
          <span>희망 날짜</span>
          <input name="preferredDate" type="date" />
        </label>
        <label>
          <span>희망 시간</span>
          <select name="preferredTime" defaultValue="">
            <option value="">상관 없음</option>
            <option value="morning">오전</option>
            <option value="afternoon">오후</option>
            <option value="evening">저녁</option>
            <option value="weekend">주말</option>
          </select>
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "확인 중" : "빈 시간 추천"}
        </button>
      </form>

      {slots.length ? (
        <div className="workspace-slot-list">
          {slots.map((slot, index) => (
            <div key={`${slot.label || slot.date || "slot"}-${index}`}>
              <strong>{slot.label || [slot.date, slot.startTime, slot.endTime].filter(Boolean).join(" ")}</strong>
              {slot.memo ? <span>{slot.memo}</span> : null}
            </div>
          ))}
        </div>
      ) : null}

      {status ? <p className="workspace-nore-status">{status}</p> : null}
      {error ? <p className="workspace-nore-error">{error}</p> : null}
    </article>
  );
}
