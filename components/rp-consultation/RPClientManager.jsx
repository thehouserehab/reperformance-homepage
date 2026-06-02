'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './RPClientManager.module.css';
import { SAMPLE_CLIENTS } from './rpConsultationSchema';
import { fetchRpClients } from './rpSheetsClient';

const STATUS_FILTERS = ['전체', '상담 전', '상담 중', '등록', '보류', '추가 확인'];

function formatList(value, fallback = '기록 없음') {
  if (Array.isArray(value) && value.length) return value.join(', ');
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

function getParqLevel(client) {
  const status = client?.parqStatus || '';
  const hasYesItems = Array.isArray(client?.parqYesItems) && client.parqYesItems.length > 0;
  if (status.includes('정상') && !hasYesItems) return 'clear';
  if (status.includes('필요') || status.includes('확인') || hasYesItems) return 'attention';
  return 'unknown';
}

function matchesStatus(client, filter) {
  if (filter === '전체') return true;
  const text = `${client.status || ''} ${client.parqStatus || ''} ${client.consultationResult || ''}`;
  if (filter === '등록') return text.includes('등록');
  if (filter === '추가 확인') return text.includes('추가') || text.includes('확인') || getParqLevel(client) === 'attention';
  return text.includes(filter);
}

function getRiskLabel(client) {
  const parqLevel = getParqLevel(client);
  const painScore = Number(client?.painScore) || 0;
  if (parqLevel === 'attention') return 'PAR-Q 확인';
  if (painScore >= 7) return '통증 높음';
  if (painScore >= 4) return '통증 중간';
  return '일반';
}

export default function RPClientManager() {
  const [clients, setClients] = useState(SAMPLE_CLIENTS);
  const [selectedId, setSelectedId] = useState(SAMPLE_CLIENTS[0]?.id || '');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Google Sheets 연결 확인 중...');
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadClients() {
      try {
        setIsLoading(true);
        setConnectionError('');
        setConnectionStatus('Google Sheets 연결 확인 중...');
        const sheetClients = await fetchRpClients();

        if (cancelled) return;

        if (sheetClients.length) {
          setClients(sheetClients);
          setSelectedId((current) => (sheetClients.some((client) => client.id === current) ? current : sheetClients[0].id));
          setConnectionStatus(`Google Sheets 연결 성공 · ${sheetClients.length}명`);
        } else {
          setClients([]);
          setSelectedId('');
          setConnectionStatus('Google Sheets 연결 성공 · 표시할 고객 없음');
        }
      } catch (error) {
        if (cancelled) return;
        setClients(SAMPLE_CLIENTS);
        setSelectedId(SAMPLE_CLIENTS[0]?.id || '');
        setConnectionStatus('Google Sheets 연결 실패 · 샘플 고객 표시 중');
        setConnectionError(error?.message || '알 수 없는 연결 오류');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadClients();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredClients = useMemo(() => {
    const needle = normalizeText(query);

    return clients.filter((client) => {
      const haystack = normalizeText([
        client.id,
        client.name,
        client.phone,
        client.status,
        client.route,
        client.goal,
        formatList(client.purpose, ''),
        formatList(client.painAreas, ''),
      ].join(' '));

      return (!needle || haystack.includes(needle)) && matchesStatus(client, statusFilter);
    });
  }, [clients, query, statusFilter]);

  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === selectedId) || filteredClients[0] || clients[0] || null;
  }, [clients, filteredClients, selectedId]);

  const stats = useMemo(() => {
    const total = clients.length;
    const attention = clients.filter((client) => getRiskLabel(client) !== '일반').length;
    const registered = clients.filter((client) => String(client.status || '').includes('등록')).length;
    const activeSessions = clients.filter((client) => Number(client.remainingSessions) > 0).length;

    return [
      { label: '전체 고객', value: `${total}명` },
      { label: '주의 확인', value: `${attention}명` },
      { label: '등록 상태', value: `${registered}명` },
      { label: '잔여회차 있음', value: `${activeSessions}명` },
    ];
  }, [clients]);

  return (
    <main className={styles.wrap}>
      <header className={styles.topbar}>
        <div>
          <div className={styles.logoText}><span>Re</span>PERFORMANCE</div>
          <p className={styles.subtle}>Client Management · Google Sheets 기반 고객관리</p>
        </div>
        <div className={styles.actions}>
          <a className={styles.ghostButton} href="/admin">운영 홈</a>
          <a className={styles.primaryButton} href="/admin/consultation">상담 화면</a>
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>CLIENT DASHBOARD</p>
          <h1>상담 전 확인해야 할 고객 정보를 한 화면에 모았습니다.</h1>
          <p>
            검색, 상태 필터, PAR-Q 주의 항목, 통증 강도, 잔여회차를 먼저 확인한 뒤 바로 상담 화면으로 이동합니다.
          </p>
          <div className={connectionError ? styles.errorStatus : styles.connectionStatus}>
            {connectionStatus}{connectionError ? ` · ${connectionError}` : ''}
          </div>
        </div>
        <div className={styles.statGrid}>
          {stats.map((item) => (
            <div className={styles.statCard} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.board}>
        <aside className={styles.sidebar}>
          <div className={styles.searchBox}>
            <label>
              <span>고객 검색</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="이름, 연락처, 목표, 부위 검색"
              />
            </label>
            <div className={styles.filterRow}>
              {STATUS_FILTERS.map((filter) => (
                <button
                  type="button"
                  key={filter}
                  className={filter === statusFilter ? styles.filterActive : styles.filterButton}
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.listHeader}>
            <strong>{isLoading ? '불러오는 중' : `${filteredClients.length}명 표시`}</strong>
            <span>{clients.length ? `전체 ${clients.length}명` : '고객 없음'}</span>
          </div>

          <div className={styles.clientList}>
            {filteredClients.length ? filteredClients.map((client) => {
              const riskLabel = getRiskLabel(client);
              const selected = selectedClient?.id === client.id;

              return (
                <button
                  type="button"
                  className={selected ? styles.clientItemActive : styles.clientItem}
                  key={client.id}
                  onClick={() => setSelectedId(client.id)}
                >
                  <span className={styles.clientName}>{client.name}</span>
                  <span className={styles.clientMeta}>{client.id} · {client.status || '상태 미입력'}</span>
                  <span className={riskLabel === '일반' ? styles.safeChip : styles.warnChip}>{riskLabel}</span>
                </button>
              );
            }) : (
              <div className={styles.emptyState}>조건에 맞는 고객이 없습니다.</div>
            )}
          </div>
        </aside>

        <section className={styles.detailPanel}>
          {selectedClient ? (
            <>
              <div className={styles.detailHeader}>
                <div>
                  <p className={styles.eyebrow}>SELECTED CLIENT</p>
                  <h2>{selectedClient.name}</h2>
                  <p>{selectedClient.id} · {selectedClient.status || '상태 미입력'}</p>
                </div>
                <a className={styles.primaryButton} href={`/admin/consultation?clientId=${encodeURIComponent(selectedClient.id)}`}>
                  이 고객 상담하기
                </a>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                  <span>연락처</span>
                  <strong>{selectedClient.phone || '미입력'}</strong>
                  <p>{selectedClient.route ? `유입경로 · ${selectedClient.route}` : '유입경로 미입력'}</p>
                </div>
                <div className={styles.infoCard}>
                  <span>기본 정보</span>
                  <strong>{[selectedClient.birth, selectedClient.gender].filter(Boolean).join(' · ') || '미입력'}</strong>
                  <p>{selectedClient.memberType || '회원 구분 미입력'}</p>
                </div>
                <div className={styles.infoCard}>
                  <span>잔여회차</span>
                  <strong>{Number(selectedClient.remainingSessions) || 0}회</strong>
                  <p>총 {Number(selectedClient.totalSessions) || 0}회 기준</p>
                </div>
                <div className={styles.infoCard}>
                  <span>담당 코치</span>
                  <strong>{selectedClient.coachName || '정우현'}</strong>
                  <p>상담 저장 시 담당자로 기록됩니다.</p>
                </div>
              </div>

              <div className={styles.twoColumn}>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>운동 목표</span>
                  <p className={styles.largeText}>{selectedClient.goal || '목표가 아직 입력되지 않았습니다.'}</p>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>방문 목적</span>
                  <div className={styles.chipRow}>
                    {Array.isArray(selectedClient.purpose) && selectedClient.purpose.length ? selectedClient.purpose.map((item) => (
                      <span className={styles.chip} key={item}>{item}</span>
                    )) : <span className={styles.muted}>기록 없음</span>}
                  </div>
                </div>
              </div>

              <div className={styles.twoColumn}>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>통증/불편감</span>
                  <p className={styles.largeText}>{formatList(selectedClient.painAreas, '특이 불편감 없음')}</p>
                  <div className={styles.painMeter} aria-label={`통증 강도 ${selectedClient.painScore || 0}/10`}>
                    <span style={{ width: `${Math.min(100, Math.max(0, Number(selectedClient.painScore) * 10 || 0))}%` }} />
                  </div>
                  <p className={styles.muted}>통증 강도 {Number(selectedClient.painScore) || 0}/10</p>
                </div>
                <div className={getParqLevel(selectedClient) === 'attention' ? styles.alertCard : styles.card}>
                  <span className={styles.cardLabel}>PAR-Q 확인</span>
                  <p className={styles.largeText}>{selectedClient.parqStatus || '확인 필요'}</p>
                  <p className={styles.muted}>{formatList(selectedClient.parqYesItems, '예 체크 항목 없음')}</p>
                </div>
              </div>

              <div className={styles.card}>
                <span className={styles.cardLabel}>상담 전 메모</span>
                <p>{selectedClient.concern || '별도 메모가 없습니다.'}</p>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>선택된 고객이 없습니다.</div>
          )}
        </section>
      </section>
    </main>
  );
}
