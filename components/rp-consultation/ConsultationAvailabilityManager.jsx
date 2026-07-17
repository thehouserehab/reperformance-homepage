'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './ConsultationAvailabilityManager.module.css';

function pad(value) {
  return String(value).padStart(2, '0');
}

function buildDefaultLocalStart() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
}

function formatDateTime(value) {
  if (!value) return '시간 미정';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getSlotState(slot) {
  if (slot.bookedClientId) return { label: '예약 요청 있음', tone: 'booked' };
  if (!slot.isOpen) return { label: '비공개', tone: 'closed' };
  if (new Date(slot.startsAt).getTime() <= Date.now()) return { label: '지난 시간', tone: 'past' };
  return { label: '신청 가능', tone: 'open' };
}

export default function ConsultationAvailabilityManager() {
  const [slots, setSlots] = useState([]);
  const [startsAt, setStartsAt] = useState(buildDefaultLocalStart);
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadSlots = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/rp/consultation-slots?view=admin', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || '상담 가능 시간을 불러오지 못했습니다.');
      setSlots(Array.isArray(payload.slots) ? payload.slots : []);
    } catch (loadError) {
      setError(loadError?.message || '상담 가능 시간을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const summary = useMemo(() => ({
    open: slots.filter((slot) => getSlotState(slot).tone === 'open').length,
    booked: slots.filter((slot) => getSlotState(slot).tone === 'booked').length,
    closed: slots.filter((slot) => getSlotState(slot).tone === 'closed').length,
  }), [slots]);

  async function handleCreate(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    const starts = new Date(startsAt);
    const minutes = Number(durationMinutes);
    if (Number.isNaN(starts.getTime())) {
      setError('시작 날짜와 시간을 확인해 주세요.');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/rp/consultation-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          startsAt: starts.toISOString(),
          endsAt: new Date(starts.getTime() + minutes * 60 * 1000).toISOString(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || '상담 가능 시간을 추가하지 못했습니다.');
      setMessage('상담 가능 시간을 공개했습니다.');
      await loadSlots();
    } catch (createError) {
      setError(createError?.message || '상담 가능 시간을 추가하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(slot) {
    try {
      setUpdatingId(slot.id);
      setMessage('');
      setError('');
      const response = await fetch('/api/rp/consultation-slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ slotId: slot.id, isOpen: !slot.isOpen }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || '공개 상태를 변경하지 못했습니다.');
      setMessage(slot.isOpen ? '해당 시간을 비공개로 전환했습니다.' : '해당 시간을 다시 공개했습니다.');
      await loadSlots();
    } catch (toggleError) {
      setError(toggleError?.message || '공개 상태를 변경하지 못했습니다.');
    } finally {
      setUpdatingId('');
    }
  }

  return (
    <main className={styles.wrap}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>CONSULTATION AVAILABILITY</p>
          <h1>상담 예약 가능 시간</h1>
          <p>계약 전 방문 상담에 사용할 시간만 공개합니다. 수업 일정과 계약 이후 관리는 이 화면에서 다루지 않습니다.</p>
        </div>
        <nav className={styles.actions} aria-label="관리 화면 이동">
          <a href="/admin/clients">고객관리</a>
          <a href="/admin">운영 홈</a>
        </nav>
      </header>

      <section className={styles.summaryGrid} aria-label="예약 가능 시간 요약">
        <div><span>신청 가능</span><strong>{summary.open}개</strong></div>
        <div><span>예약 요청</span><strong>{summary.booked}개</strong></div>
        <div><span>비공개</span><strong>{summary.closed}개</strong></div>
      </section>

      <section className={styles.layout}>
        <form className={styles.createPanel} onSubmit={handleCreate}>
          <div>
            <p className={styles.eyebrow}>OPEN A SLOT</p>
            <h2>가능 시간 추가</h2>
            <p>홈페이지 신청서에 실제로 보여줄 날짜와 시간을 한 건씩 등록합니다.</p>
          </div>
          <label>
            <span>시작 시간</span>
            <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required />
          </label>
          <label>
            <span>예상 상담 시간</span>
            <select value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)}>
              <option value="30">30분</option>
              <option value="60">60분</option>
              <option value="90">90분</option>
            </select>
          </label>
          <button type="submit" disabled={saving}>{saving ? '추가 중...' : '가능 시간 공개'}</button>
          <p className={styles.helper}>신청자는 이 시간 중 하나를 고르며, 담당자 확인 연락 후 예약이 최종 확정됩니다.</p>
        </form>

        <div className={styles.slotPanel}>
          <div className={styles.slotHeader}>
            <div>
              <p className={styles.eyebrow}>PUBLISHED SLOTS</p>
              <h2>공개 시간 목록</h2>
            </div>
            <button type="button" onClick={loadSlots} disabled={loading}>{loading ? '확인 중...' : '새로고침'}</button>
          </div>

          {message ? <p className={styles.success} role="status">{message}</p> : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}

          <div className={styles.slotList}>
            {!loading && !slots.length ? (
              <div className={styles.emptyState}>등록된 상담 가능 시간이 없습니다.</div>
            ) : null}
            {slots.map((slot) => {
              const state = getSlotState(slot);
              return (
                <article className={styles.slotItem} key={slot.id}>
                  <div>
                    <span className={`${styles.status} ${styles[state.tone]}`}>{state.label}</span>
                    <strong>{formatDateTime(slot.startsAt)}</strong>
                    <p>{formatDateTime(slot.endsAt)} 종료</p>
                    {slot.bookedClientId ? (
                      <p className={styles.bookingClient}>신청자: {slot.bookedClientName || slot.bookedClientId} · {slot.bookedVisitStatus}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(slot)}
                    disabled={Boolean(slot.bookedClientId) || updatingId === slot.id}
                  >
                    {updatingId === slot.id ? '변경 중...' : slot.isOpen ? '비공개 전환' : '다시 공개'}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
