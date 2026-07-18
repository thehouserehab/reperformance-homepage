'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CONSULTATION_ACTIVITY_OPTIONS,
  FLEXIBLE_CONSULTATION_SLOT_ID,
} from '../../lib/rpConsultationAvailability';
import styles from './Apply.module.css';

const SEOUL_TIME_ZONE = 'Asia/Seoul';

function getDateKey(value) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SEOUL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDateLabel(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: SEOUL_TIME_ZONE,
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(value));
}

function formatTimeLabel(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: SEOUL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function getDurationMinutes(slot) {
  const startsAt = new Date(slot.startsAt).getTime();
  const endsAt = new Date(slot.endsAt).getTime();
  return Math.max(0, Math.round((endsAt - startsAt) / 60000));
}

function getMonthKey(dateKey) {
  return String(dateKey || '').slice(0, 7);
}

function formatMonthLabel(monthKey) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return '';
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function buildCalendarDays(monthKey) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return [];
  const [year, month] = monthKey.split('-').map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const gridStart = new Date(Date.UTC(year, month - 1, 1 - mondayOffset));

  return Array.from({ length: 42 }, (_, index) => {
    const value = new Date(gridStart);
    value.setUTCDate(gridStart.getUTCDate() + index);
    const key = value.toISOString().slice(0, 10);
    return {
      key,
      day: value.getUTCDate(),
      inCurrentMonth: getMonthKey(key) === monthKey,
    };
  });
}

function shiftMonth(monthKey, amount) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + amount, 1)).toISOString().slice(0, 7);
}

const calendarWeekdays = ['월', '화', '수', '목', '금', '토', '일'];

export default function ConsultationBookingFields() {
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [policy, setPolicy] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSlots() {
      try {
        const response = await fetch('/api/rp/consultation-slots', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || '예약 가능 시간을 불러오지 못했습니다.');
        }

        const nextSlots = Array.isArray(payload.slots) ? payload.slots : [];
        setSlots(nextSlots);
        setPolicy(payload?.policy || null);
        const firstDate = nextSlots[0]?.startsAt ? getDateKey(nextSlots[0].startsAt) : '';
        setSelectedDate(firstDate);
        setSelectedMonth(getMonthKey(firstDate));
      } catch (loadError) {
        if (loadError?.name !== 'AbortError') {
          setError(loadError?.message || '예약 가능 시간을 불러오지 못했습니다.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadSlots();
    return () => controller.abort();
  }, []);

  const dateGroups = useMemo(() => {
    const groups = new Map();
    slots.forEach((slot) => {
      const key = getDateKey(slot.startsAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(slot);
    });
    return Array.from(groups.entries()).map(([key, items]) => ({ key, slots: items }));
  }, [slots]);

  const slotsByDate = useMemo(
    () => new Map(dateGroups.map((group) => [group.key, group.slots])),
    [dateGroups],
  );
  const visibleSlots = (slotsByDate.get(selectedDate) || [])
    .slice()
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const monthKeys = useMemo(
    () => [...new Set(dateGroups.map((group) => getMonthKey(group.key)))],
    [dateGroups],
  );
  const calendarDays = useMemo(() => buildCalendarDays(selectedMonth), [selectedMonth]);
  const firstMonth = monthKeys[0] || '';
  const lastMonth = monthKeys.at(-1) || '';

  function moveMonth(amount) {
    const nextMonth = shiftMonth(selectedMonth, amount);
    if (!nextMonth || (firstMonth && nextMonth < firstMonth) || (lastMonth && nextMonth > lastMonth)) return;
    setSelectedMonth(nextMonth);
    const firstAvailableDate = dateGroups.find((group) => getMonthKey(group.key) === nextMonth)?.key || '';
    setSelectedDate(firstAvailableDate);
  }

  return (
    <div className={styles.bookingSections}>
      <section className={styles.formSection} aria-labelledby="consultation-booking-title">
        <div className={styles.sectionTitle}>
          <span>03</span>
          <strong id="consultation-booking-title">상담 희망 시간</strong>
          <em className={styles.sectionBadge}>필수</em>
        </div>
        <p className={styles.helperText}>
          캘린더에서 날짜를 고른 뒤 30분 상담 시간을 선택해 주세요. 신청 접수가 완료되면 해당 시간은 다른 신청에서
          제외되며, 담당자 확인 연락 후 예약이 최종 확정됩니다.
        </p>

        <div className={styles.bookingPolicyBar} aria-label="상담 예약 운영 시간">
          <strong>월~금 09:00~22:00</strong>
          <span>{policy?.slotDurationMinutes || 30}분 단위 · 서울 시간 기준</span>
        </div>

        <div className={styles.bookingPanel}>
          {loading ? (
            <div className={styles.bookingState} role="status">예약 가능 시간을 확인하고 있습니다.</div>
          ) : null}

          {!loading && dateGroups.length ? (
            <>
              <div className={styles.bookingCalendar} aria-label="상담 날짜 선택">
                <div className={styles.bookingCalendarHead}>
                  <button
                    aria-label="이전 달 보기"
                    disabled={!selectedMonth || selectedMonth <= firstMonth}
                    onClick={() => moveMonth(-1)}
                    type="button"
                  >
                    ←
                  </button>
                  <strong>{formatMonthLabel(selectedMonth)}</strong>
                  <button
                    aria-label="다음 달 보기"
                    disabled={!selectedMonth || selectedMonth >= lastMonth}
                    onClick={() => moveMonth(1)}
                    type="button"
                  >
                    →
                  </button>
                </div>
                <div className={styles.bookingCalendarWeekdays} aria-hidden="true">
                  {calendarWeekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
                </div>
                <div className={styles.bookingCalendarGrid}>
                  {calendarDays.map((day) => {
                    const daySlots = slotsByDate.get(day.key) || [];
                    const active = day.key === selectedDate;
                    return (
                      <button
                        aria-label={daySlots.length ? `${day.key}, ${daySlots.length}개 시간 가능` : `${day.key}, 예약 불가`}
                        aria-pressed={active}
                        className={active ? styles.bookingCalendarDayActive : styles.bookingCalendarDay}
                        disabled={!day.inCurrentMonth || !daySlots.length}
                        key={day.key}
                        onClick={() => setSelectedDate(day.key)}
                        type="button"
                      >
                        <strong>{day.day}</strong>
                        {daySlots.length ? <span>{daySlots.length}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <fieldset className={styles.bookingTimeFieldset}>
                <legend>{visibleSlots[0] ? `${formatDateLabel(visibleSlots[0].startsAt)} 희망 시간` : '희망 시간 선택'}</legend>
                <div className={styles.bookingTimeGrid}>
                  {visibleSlots.map((slot) => (
                    <label className={styles.bookingTimeOption} key={slot.id}>
                      <input type="radio" name="consultationSlotId" value={slot.id} required />
                      <span>
                        <strong>{formatTimeLabel(slot.startsAt)}</strong>
                        <small>{getDurationMinutes(slot)}분</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          ) : null}

          {!loading && !dateGroups.length ? (
            <div className={styles.bookingState} role="status">
              <strong>현재 공개된 상담 가능 시간이 없습니다.</strong>
              <span>아래 일정 협의 요청을 선택하면 담당자가 가능한 시간을 확인해 연락드립니다.</span>
            </div>
          ) : null}

          {error ? <p className={styles.bookingError} role="alert">{error}</p> : null}

          <label className={styles.flexibleTimeOption}>
            <input type="radio" name="consultationSlotId" value={FLEXIBLE_CONSULTATION_SLOT_ID} required />
            <span>
              <strong>맞는 시간이 없어요</strong>
              <small>담당자와 일정 협의 요청</small>
            </span>
          </label>
        </div>
      </section>

      <section className={styles.formSection} aria-labelledby="consultation-activity-title">
        <div className={styles.sectionTitle}>
          <span>04</span>
          <strong id="consultation-activity-title">상담 시 운동 희망 여부</strong>
          <em className={styles.sectionBadge}>필수</em>
        </div>
        <p className={styles.helperText}>
          상담 준비와 시간 배정을 위한 선택입니다. 운동을 희망해도 안전 확인 결과에 따라 상담만 진행할 수 있습니다.
        </p>
        <fieldset className={styles.activityFieldset}>
          <legend className={styles.srOnly}>상담 진행 방식 선택</legend>
          <div className={styles.activityGrid}>
            {CONSULTATION_ACTIVITY_OPTIONS.map((option) => (
              <label className={styles.activityOption} key={option.value}>
                <input type="radio" name="consultationActivityPreference" value={option.value} required />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>
    </div>
  );
}
