"use client";

import { useRef } from "react";

type CalendarEvent = {
  month: string;
  range: string;
  label: string;
  title: string;
  note: string;
  tone: "document" | "application" | "exam" | "decision";
};

export default function PeExamCalendar({ events }: { events: readonly CalendarEvent[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollCalendar(direction: "prev" | "next") {
    trackRef.current?.scrollBy({
      left: direction === "next" ? 380 : -380,
      behavior: "smooth",
    });
  }

  return (
    <div className="pe-calendar-panel">
      <div className="pe-calendar-toolbar">
        <div className="pe-calendar-legend" aria-label="일정 구분">
          <span className="legend-chip document">자료 기준</span>
          <span className="legend-chip application">원서/전형</span>
          <span className="legend-chip exam">수능/실기</span>
          <span className="legend-chip decision">합격/등록</span>
        </div>
        <div className="pe-calendar-controls">
          <button type="button" aria-label="이전 일정 보기" onClick={() => scrollCalendar("prev")}>
            ‹
          </button>
          <button type="button" aria-label="다음 일정 보기" onClick={() => scrollCalendar("next")}>
            ›
          </button>
        </div>
      </div>
      <div className="pe-calendar-track" ref={trackRef} tabIndex={0} aria-label="2027학년도 체대입시 일정">
        {events.map((event) => (
          <article className={`pe-calendar-card ${event.tone}`} key={`${event.month}-${event.title}`}>
            <div className="pe-calendar-card-top">
              <span className="pe-calendar-month">{event.month}</span>
              <span className="pe-calendar-label">{event.label}</span>
            </div>
            <p className="pe-calendar-range">{event.range}</p>
            <h3>{event.title}</h3>
            <p>{event.note}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
