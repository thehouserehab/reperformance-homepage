'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './RPClientManager.module.css';
import { MEMBER_TYPES, SAMPLE_CLIENTS } from './rpConsultationSchema';
import { addRpClient, fetchRpClients } from './rpSheetsClient';

const STATUS_FILTERS = ['전체', '상담 전', '상담 중', '등록', '보류', '추가 확인'];
const DIRECT_CLIENT_INITIAL_STATE = {
  name: '',
  phone: '',
  birth: '',
  gender: '',
  route: '현장 등록',
  memberType: '일반회원',
  status: '상담 전',
  coachName: '정우현',
  goal: '',
  purpose: '',
  painAreas: '',
  painScore: 0,
  concern: '',
  totalSessions: 0,
  remainingSessions: 0,
};

function formatList(value, fallback = '기록 없음') {
  if (Array.isArray(value) && value.length) return value.join(', ');
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

function splitInput(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(/[,/·|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPeExamClient(client) {
  const text = [
    client?.memberType,
    client?.goal,
    formatList(client?.purpose, ''),
    client?.concern,
  ].join(' ');

  return text.includes('체대입시') || text.includes('입시');
}

function buildLocalClient(record) {
  const id = record.id || `RP-${Date.now()}`;
  return {
    id,
    name: record.name,
    phone: record.phone || '',
    birth: record.birth || '',
    gender: record.gender || '',
    route: record.route || '현장 등록',
    memberType: record.memberType || '',
    status: record.status || '상담 전',
    coachName: record.coachName || '정우현',
    parqStatus: '미작성',
    parqYesItems: [],
    goal: record.goal || '',
    purpose: splitInput(record.purpose),
    painAreas: splitInput(record.painAreas),
    painScore: Number(record.painScore) || 0,
    concern: record.concern || '',
    totalSessions: Number(record.totalSessions) || 0,
    remainingSessions: Number(record.remainingSessions) || 0,
  };
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
  const [connectionStatus, setConnectionStatus] = useState('Postgres 고객 데이터 확인 중...');
  const [connectionError, setConnectionError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState(DIRECT_CLIENT_INITIAL_STATE);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [addClientError, setAddClientError] = useState('');
  const [addClientStatus, setAddClientStatus] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadClients() {
      try {
        setIsLoading(true);
        setConnectionError('');
        setConnectionStatus('Postgres 고객 데이터 확인 중...');
        const loadedClients = await fetchRpClients();

        if (cancelled) return;

        if (loadedClients.length) {
          setClients(loadedClients);
          setSelectedId((current) => (loadedClients.some((client) => client.id === current) ? current : loadedClients[0].id));
          setConnectionStatus(`Postgres 고객 데이터 로드 · ${loadedClients.length}명`);
        } else {
          setClients([]);
          setSelectedId('');
          setConnectionStatus('Postgres 고객 데이터 로드 · 표시할 고객 없음');
        }
      } catch (error) {
        if (cancelled) return;
        setClients(SAMPLE_CLIENTS);
        setSelectedId(SAMPLE_CLIENTS[0]?.id || '');
        setConnectionStatus('고객 데이터 연결 실패 · 샘플 고객 표시 중');
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
        client.memberType,
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
    const peExam = clients.filter(isPeExamClient).length;

    return [
      { label: '전체 고객', value: `${total}명` },
      { label: '주의 확인', value: `${attention}명` },
      { label: '등록 상태', value: `${registered}명` },
      { label: '잔여회차 있음', value: `${activeSessions}명` },
      { label: '체대입시생', value: `${peExam}명` },
    ];
  }, [clients]);

  function updateNewClient(field, value) {
    setNewClient((current) => ({ ...current, [field]: value }));
  }

  function closeAddForm() {
    setShowAddForm(false);
    setAddClientError('');
    setNewClient(DIRECT_CLIENT_INITIAL_STATE);
  }

  async function handleAddClient(event) {
    event.preventDefault();
    const name = newClient.name.trim();

    if (!name) {
      setAddClientError('고객 이름은 필수입니다.');
      return;
    }

    const clientRecord = {
      ...newClient,
      name,
      purpose: splitInput(newClient.purpose),
      painAreas: splitInput(newClient.painAreas),
      painScore: Number(newClient.painScore) || 0,
      totalSessions: Number(newClient.totalSessions) || 0,
      remainingSessions: Number(newClient.remainingSessions) || 0,
      parqStatus: '미작성',
      parqYesItems: [],
    };

    try {
      setIsAddingClient(true);
      setAddClientError('');
      setAddClientStatus('');
      const result = await addRpClient(clientRecord);
      const createdClient = result.client || buildLocalClient(result.record || clientRecord);

      setClients((current) => [createdClient, ...current.filter((client) => client.id !== createdClient.id)]);
      setSelectedId(createdClient.id);
      setStatusFilter('전체');
      setQuery('');
      setAddClientStatus(`${createdClient.name} 고객을 추가했습니다.`);
      setShowAddForm(false);
      setNewClient(DIRECT_CLIENT_INITIAL_STATE);
    } catch (error) {
      setAddClientError(error?.message || '고객 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAddingClient(false);
    }
  }

  return (
    <main className={styles.wrap}>
      <header className={styles.topbar}>
        <div>
          <div className={styles.logoText}><span>Re</span>PERFORMANCE</div>
          <p className={styles.subtle}>Client Management · Postgres 기반 고객관리 · Google Drive 백업</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.primaryButton} type="button" onClick={() => setShowAddForm((current) => !current)}>
            {showAddForm ? '추가 닫기' : '고객 추가'}
          </button>
          <a className={styles.ghostButton} href="/admin">운영 홈</a>
          <a className={styles.ghostButton} href="/admin/consultation">상담 화면</a>
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
          {addClientStatus && <div className={styles.connectionStatus}>{addClientStatus}</div>}
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

      {showAddForm && (
        <section className={styles.addPanel}>
          <div className={styles.addPanelHeader}>
            <div>
              <p className={styles.eyebrow}>DIRECT CLIENT ADD</p>
              <h2>PAR-Q 없이 고객 직접 추가</h2>
              <p>이름만 필수이며, PAR-Q 상태는 자동으로 미작성으로 기록됩니다.</p>
            </div>
            <button className={styles.ghostButton} type="button" onClick={closeAddForm}>취소</button>
          </div>

          <form className={styles.addForm} onSubmit={handleAddClient}>
            <label>
              <span>고객명 *</span>
              <input value={newClient.name} onChange={(event) => updateNewClient('name', event.target.value)} placeholder="예: 홍길동" required />
            </label>
            <label>
              <span>연락처</span>
              <input value={newClient.phone} onChange={(event) => updateNewClient('phone', event.target.value)} placeholder="010-0000-0000" />
            </label>
            <label>
              <span>생년월일</span>
              <input value={newClient.birth} onChange={(event) => updateNewClient('birth', event.target.value)} placeholder="YYYY-MM-DD" />
            </label>
            <label>
              <span>성별</span>
              <select value={newClient.gender} onChange={(event) => updateNewClient('gender', event.target.value)}>
                <option value="">미입력</option>
                <option value="남">남</option>
                <option value="여">여</option>
                <option value="기타">기타</option>
              </select>
            </label>
            <label>
              <span>유입경로</span>
              <input value={newClient.route} onChange={(event) => updateNewClient('route', event.target.value)} />
            </label>
            <label>
              <span>회원구분</span>
              <select value={newClient.memberType} onChange={(event) => updateNewClient('memberType', event.target.value)}>
                <option value="">미입력</option>
                {MEMBER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label>
              <span>상태</span>
              <select value={newClient.status} onChange={(event) => updateNewClient('status', event.target.value)}>
                <option>상담 전</option>
                <option>상담 중</option>
                <option>등록 대기</option>
                <option>등록</option>
                <option>보류</option>
              </select>
            </label>
            <label>
              <span>담당 코치</span>
              <input value={newClient.coachName} onChange={(event) => updateNewClient('coachName', event.target.value)} />
            </label>
            <label>
              <span>통증 강도</span>
              <input type="number" min="0" max="10" value={newClient.painScore} onChange={(event) => updateNewClient('painScore', event.target.value)} />
            </label>
            <label className={styles.fieldWide}>
              <span>목표</span>
              <input value={newClient.goal} onChange={(event) => updateNewClient('goal', event.target.value)} placeholder="예: 허리 통증 없이 운동 재개" />
            </label>
            <label>
              <span>방문 목적</span>
              <input value={newClient.purpose} onChange={(event) => updateNewClient('purpose', event.target.value)} placeholder="쉼표로 구분" />
            </label>
            <label>
              <span>불편 부위</span>
              <input value={newClient.painAreas} onChange={(event) => updateNewClient('painAreas', event.target.value)} placeholder="예: 허리, 무릎" />
            </label>
            <label>
              <span>총회차</span>
              <input type="number" min="0" value={newClient.totalSessions} onChange={(event) => updateNewClient('totalSessions', event.target.value)} />
            </label>
            <label>
              <span>잔여회차</span>
              <input type="number" min="0" value={newClient.remainingSessions} onChange={(event) => updateNewClient('remainingSessions', event.target.value)} />
            </label>
            <label className={styles.fieldWide}>
              <span>메모</span>
              <textarea value={newClient.concern} onChange={(event) => updateNewClient('concern', event.target.value)} placeholder="현장 상담 전 확인할 내용을 기록합니다." />
            </label>

            {addClientError && <div className={styles.errorStatus}>{addClientError}</div>}

            <div className={styles.addFormActions}>
              <button className={styles.ghostButton} type="button" onClick={closeAddForm}>취소</button>
              <button className={styles.primaryButton} type="submit" disabled={isAddingClient}>{isAddingClient ? '추가 중...' : '고객 추가'}</button>
            </div>
          </form>
        </section>
      )}

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

              {isPeExamClient(selectedClient) && (
                <div className={styles.card}>
                  <span className={styles.cardLabel}>체대입시 관리</span>
                  <p className={styles.largeText}>운동 준비와 입시 상담을 함께 관리하는 회원입니다.</p>
                  <p className={styles.muted}>상담 화면에서 희망 대학, 목표 학과, 실기 종목, 현재 기록, 내신/수능 상태, 원서 전략을 함께 정리합니다.</p>
                </div>
              )}

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
