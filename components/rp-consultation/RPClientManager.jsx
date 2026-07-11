'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './RPClientManager.module.css';
import { MEMBER_TYPES, SAMPLE_CLIENTS } from './rpConsultationSchema';
import { CLIENT_CONTACT_STATUSES, CLIENT_VISIT_STATUSES } from '../../lib/rpClientWorkflow';
import { getConsultationActivityLabel } from '../../lib/rpConsultationAvailability';
import { addRpClient, fetchRpClients, updateRpClientWorkflow } from './rpSheetsClient';

const STATUS_FILTERS = ['전체', '상담 전', '상담 중', '등록', '보류', '추가 확인'];
const CLIENT_PAGE_SIZE = 200;
const WORKFLOW_INITIAL_STATE = {
  contactStatus: '연락 대기',
  visitStatus: '미정',
  scheduledVisitAt: '',
  nextAction: '',
  nextActionAt: '',
  followUpReason: '',
};
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
    ...WORKFLOW_INITIAL_STATE,
  };
}

function mergeClientPages(currentClients, nextClients) {
  const byId = new Map();

  for (const client of currentClients) {
    if (client?.id) byId.set(client.id, client);
  }
  for (const client of nextClients) {
    if (client?.id) byId.set(client.id, client);
  }

  return Array.from(byId.values());
}

function formatDateTime(value) {
  if (!value) return '기록 없음';

  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (_) {
    return String(value);
  }
}

function toDateTimeLocal(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildWorkflowDraft(client) {
  if (!client) return WORKFLOW_INITIAL_STATE;
  return {
    contactStatus: client.contactStatus || '연락 대기',
    visitStatus: client.visitStatus || '미정',
    scheduledVisitAt: toDateTimeLocal(client.scheduledVisitAt),
    nextAction: client.nextAction || '',
    nextActionAt: toDateTimeLocal(client.nextActionAt),
    followUpReason: client.followUpReason || '',
  };
}

function formatAttribution(client) {
  const source = client?.latestSource || client?.firstSource;
  const medium = client?.latestMedium || client?.firstMedium;
  const campaign = client?.latestCampaign || client?.firstCampaign;
  return [source, medium, campaign].filter(Boolean).join(' · ') || client?.route || '기록 없음';
}

function buildAiLimitDrafts(accounts) {
  return Object.fromEntries(
    accounts.map((account) => [
      account.username,
      Number(account.aiDailyLimit) > 0 ? String(account.aiDailyLimit) : '',
    ]),
  );
}

function getAiLimitInputId(account) {
  return `ai-limit-${String(account?.id || account?.username || 'account').replace(/[^a-z0-9_-]/gi, '-')}`;
}

function formatAiLimit(account) {
  return Number(account?.aiDailyLimit) > 0 ? `${account.aiDailyLimit}회` : '역할 기본값';
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
  const [isLoadingMoreClients, setIsLoadingMoreClients] = useState(false);
  const [clientPagination, setClientPagination] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Postgres 고객 데이터 확인 중...');
  const [connectionError, setConnectionError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState(DIRECT_CLIENT_INITIAL_STATE);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [addClientError, setAddClientError] = useState('');
  const [addClientStatus, setAddClientStatus] = useState('');
  const [authAccounts, setAuthAccounts] = useState([]);
  const [authStatus, setAuthStatus] = useState('AI 승인 계정 확인 중...');
  const [authError, setAuthError] = useState('');
  const [aiLimitDrafts, setAiLimitDrafts] = useState({});
  const [updatingAiUsername, setUpdatingAiUsername] = useState('');
  const [workflowDraft, setWorkflowDraft] = useState(WORKFLOW_INITIAL_STATE);
  const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState('');
  const [workflowError, setWorkflowError] = useState('');
  const [canRevokeSessions, setCanRevokeSessions] = useState(false);
  const [revokingSessionUsername, setRevokingSessionUsername] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadClients() {
      try {
        setIsLoading(true);
        setConnectionError('');
        setConnectionStatus('Postgres 고객 데이터 확인 중...');
        const loadedClients = await fetchRpClients({ limit: CLIENT_PAGE_SIZE });

        if (cancelled) return;

        const pagination = loadedClients.pagination || null;
        setClientPagination(pagination);

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
        setClientPagination(null);
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

  useEffect(() => {
    let cancelled = false;

    async function loadAuthAccounts() {
      try {
        setAuthError('');
        setAuthStatus('AI 승인 계정 확인 중...');

        const response = await fetch('/api/rp/auth-accounts', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || `AI 승인 계정을 불러오지 못했습니다. (${response.status})`);
        }

        if (cancelled) return;

        const accounts = Array.isArray(payload.accounts) ? payload.accounts : [];
        setAuthAccounts(accounts);
        setAiLimitDrafts(buildAiLimitDrafts(accounts));
        setCanRevokeSessions(Boolean(payload?.permissions?.canRevokeSessions));
        setAuthStatus(accounts.length ? `계정 ${accounts.length}개 확인` : '승인 관리할 계정이 아직 없습니다.');
      } catch (error) {
        if (cancelled) return;
        setAuthAccounts([]);
        setAiLimitDrafts({});
        setCanRevokeSessions(false);
        setAuthStatus('AI 승인 계정 확인 실패');
        setAuthError(error?.message || 'AI 승인 계정을 불러오지 못했습니다.');
      }
    }

    loadAuthAccounts();

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
        client.contactStatus,
        client.visitStatus,
        client.nextAction,
        client.latestSource,
        client.latestCampaign,
        client.visitStatus,
        client.consultationActivityPreference,
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

  useEffect(() => {
    setWorkflowDraft(buildWorkflowDraft(selectedClient));
    setWorkflowStatus('');
    setWorkflowError('');
  }, [selectedClient?.id]);

  const stats = useMemo(() => {
    const total = clients.length;
    const attention = clients.filter((client) => getRiskLabel(client) !== '일반').length;
    const registered = clients.filter((client) => String(client.status || '').includes('등록')).length;
    const activeSessions = clients.filter((client) => Number(client.remainingSessions) > 0).length;
    const peExam = clients.filter(isPeExamClient).length;
    const contactPending = clients.filter((client) => (client.contactStatus || '연락 대기') === '연락 대기').length;
    const visitBooked = clients.filter((client) => ['예약 승인 대기', '방문 예약 완료', '방문 전 확인'].includes(client.visitStatus)).length;

    return [
      { label: '전체 고객', value: `${total}명` },
      { label: '연락 대기', value: `${contactPending}명` },
      { label: '방문 예정', value: `${visitBooked}명` },
      { label: '주의 확인', value: `${attention}명` },
      { label: '등록 상태', value: `${registered}명` },
      { label: '관리 중', value: `${activeSessions}명 · 입시 ${peExam}명` },
    ];
  }, [clients]);

  function updateNewClient(field, value) {
    setNewClient((current) => ({ ...current, [field]: value }));
  }

  function updateWorkflowDraft(field, value) {
    setWorkflowDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSaveWorkflow(event) {
    event.preventDefault();
    if (!selectedClient?.id) return;

    try {
      setIsSavingWorkflow(true);
      setWorkflowError('');
      setWorkflowStatus('');
      const result = await updateRpClientWorkflow(selectedClient.id, workflowDraft);
      const updatedClient = result.client;
      setClients((current) => current.map((client) => (
        client.id === updatedClient.id ? updatedClient : client
      )));
      setWorkflowDraft(buildWorkflowDraft(updatedClient));
      setWorkflowStatus('연락·방문 상태와 다음 행동을 저장했습니다.');
    } catch (error) {
      setWorkflowError(error?.message || '고객 진행 상태를 저장하지 못했습니다.');
    } finally {
      setIsSavingWorkflow(false);
    }
  }

  function closeAddForm() {
    setShowAddForm(false);
    setAddClientError('');
    setNewClient(DIRECT_CLIENT_INITIAL_STATE);
  }

  async function handleLoadMoreClients() {
    const nextOffset = Number(clientPagination?.nextOffset);
    if (!Number.isFinite(nextOffset) || nextOffset < 0 || isLoadingMoreClients) return;

    try {
      setIsLoadingMoreClients(true);
      setConnectionError('');
      const loadedClients = await fetchRpClients({ limit: CLIENT_PAGE_SIZE, offset: nextOffset });
      const pagination = loadedClients.pagination || null;

      setClients((current) => mergeClientPages(current, loadedClients));
      setClientPagination(pagination);
      setConnectionStatus(
        pagination?.hasMore
          ? `추가 고객 ${loadedClients.length}명 로드 완료. 다음 페이지가 남아 있습니다.`
          : `추가 고객 ${loadedClients.length}명 로드 완료. 모든 표시 가능한 고객을 불러왔습니다.`,
      );
    } catch (error) {
      setConnectionError(error?.message || '추가 고객 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoadingMoreClients(false);
    }
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

  function updateAuthAccount(account) {
    setAuthAccounts((current) => current.map((item) => (
      item.username === account.username ? account : item
    )));
    setAiLimitDrafts((current) => ({
      ...current,
      [account.username]: Number(account.aiDailyLimit) > 0 ? String(account.aiDailyLimit) : '',
    }));
  }

  function updateAiLimitDraft(username, value) {
    const sanitized = String(value || '').replace(/[^\d]/g, '');
    setAiLimitDrafts((current) => ({ ...current, [username]: sanitized }));
  }

  async function handleToggleAiApproval(account) {
    if (!account?.username) return;

    try {
      setUpdatingAiUsername(account.username);
      setAuthError('');

      const response = await fetch('/api/rp/auth-accounts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          username: account.username,
          aiApproved: !account.aiApproved,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || `AI 승인 상태를 저장하지 못했습니다. (${response.status})`);
      }

      updateAuthAccount(payload.account);
      setAuthStatus(`${payload.account.name || payload.account.username} AI 사용 ${payload.account.aiApproved ? '승인' : '해제'} 완료`);
    } catch (error) {
      setAuthError(error?.message || 'AI 승인 상태를 저장하지 못했습니다.');
    } finally {
      setUpdatingAiUsername('');
    }
  }

  async function handleSaveAiDailyLimit(event, account) {
    event.preventDefault();
    if (!account?.username) return;

    const rawLimit = String(aiLimitDrafts[account.username] || '').trim();
    const aiDailyLimit = rawLimit ? Number(rawLimit) : null;

    if (rawLimit && (!Number.isInteger(aiDailyLimit) || aiDailyLimit < 1)) {
      setAuthError('AI 일일 한도는 1 이상의 정수로 입력해야 합니다.');
      return;
    }

    try {
      setUpdatingAiUsername(account.username);
      setAuthError('');

      const response = await fetch('/api/rp/auth-accounts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          username: account.username,
          aiDailyLimit,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || `AI 일일 한도를 저장하지 못했습니다. (${response.status})`);
      }

      updateAuthAccount(payload.account);
      setAuthStatus(`${payload.account.name || payload.account.username} AI 일일 한도 저장 완료`);
    } catch (error) {
      setAuthError(error?.message || 'AI 일일 한도를 저장하지 못했습니다.');
    } finally {
      setUpdatingAiUsername('');
    }
  }

  async function handleRevokeSessions(account) {
    if (!account?.username || !canRevokeSessions) return;

    const accountName = account.name || account.username;
    const confirmed = window.confirm(
      `${accountName} 계정으로 로그인된 모든 기기의 세션을 종료합니다. 계속하시겠습니까?`,
    );
    if (!confirmed) return;

    try {
      setRevokingSessionUsername(account.username);
      setAuthError('');

      const response = await fetch('/api/rp/auth-accounts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          username: account.username,
          revokeSessions: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || `로그인 세션을 종료하지 못했습니다. (${response.status})`);
      }

      const revocation = payload.sessionRevocation || {};
      setAuthAccounts((current) => current.map((item) => (
        item.username === account.username
          ? { ...item, sessionVersion: revocation.sessionVersion || item.sessionVersion }
          : item
      )));

      if (revocation.revokedCurrentSession) {
        await fetch('/api/admin/logout', { method: 'POST' }).catch(() => null);
        window.location.assign('/admin/login');
        return;
      }

      setAuthStatus(`${accountName} 계정의 기존 로그인 세션을 모두 종료했습니다.`);
    } catch (error) {
      setAuthError(error?.message || '로그인 세션을 종료하지 못했습니다.');
    } finally {
      setRevokingSessionUsername('');
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
          <a className={styles.ghostButton} href="/admin/availability">예약 시간</a>
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

      <section className={styles.aiAccessPanel} aria-label="AI 사용 및 로그인 세션 관리">
        <div className={styles.aiAccessHeader}>
          <div>
            <p className={styles.eyebrow}>ACCOUNT ACCESS CONTROL</p>
            <h2>AI 승인과 로그인 세션을 계정별로 관리합니다.</h2>
            <p>홈페이지 로그인은 유지하면서 AI 기능만 별도 승인하고, 계정 이상이나 분실 신고가 있으면 모든 기기의 기존 세션을 즉시 종료합니다.</p>
          </div>
          <div className={authError ? styles.errorStatus : styles.connectionStatus}>
            {authError || authStatus}
          </div>
        </div>

        <div className={styles.aiAccountGrid}>
          {authAccounts.length ? authAccounts.map((account) => (
            <article className={styles.aiAccountCard} key={account.username}>
              <div>
                <span className={account.aiApproved ? styles.safeChip : styles.warnChip}>
                  {account.aiApproved ? 'AI 승인' : 'AI 제한'}
                </span>
                <h3>{account.name || account.username}</h3>
                <p>{account.username} · {account.roleLabel || account.role}</p>
              </div>
              <dl>
                <div>
                  <dt>오늘 사용량</dt>
                  <dd>{Number(account.aiUsageToday) || 0}회 / {formatAiLimit(account)}</dd>
                </div>
                <div>
                  <dt>일일 한도</dt>
                  <dd>{formatAiLimit(account)}</dd>
                </div>
                <div>
                  <dt>승인일</dt>
                  <dd>{formatDateTime(account.aiApprovedAt)}</dd>
                </div>
                <div>
                  <dt>세션 버전</dt>
                  <dd>v{Number(account.sessionVersion) || 1}</dd>
                </div>
              </dl>
              <form className={styles.aiLimitForm} onSubmit={(event) => handleSaveAiDailyLimit(event, account)}>
                <label htmlFor={getAiLimitInputId(account)}>
                  <span>회원별 일일 한도</span>
                  <input
                    id={getAiLimitInputId(account)}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={aiLimitDrafts[account.username] ?? ''}
                    onChange={(event) => updateAiLimitDraft(account.username, event.target.value)}
                    placeholder="역할 기본값"
                    disabled={updatingAiUsername === account.username || revokingSessionUsername === account.username}
                  />
                </label>
                <button
                  className={styles.ghostButton}
                  type="submit"
                  disabled={updatingAiUsername === account.username || revokingSessionUsername === account.username}
                >
                  한도 저장
                </button>
              </form>
              <button
                className={account.aiApproved ? styles.dangerButton : styles.primaryButton}
                type="button"
                onClick={() => handleToggleAiApproval(account)}
                disabled={updatingAiUsername === account.username || revokingSessionUsername === account.username}
              >
                {updatingAiUsername === account.username
                  ? '저장 중...'
                  : account.aiApproved ? 'AI 승인 해제' : 'AI 사용 승인'}
              </button>
              {canRevokeSessions ? (
                <button
                  className={styles.sessionButton}
                  type="button"
                  onClick={() => handleRevokeSessions(account)}
                  disabled={updatingAiUsername === account.username || revokingSessionUsername === account.username}
                >
                  {revokingSessionUsername === account.username ? '세션 종료 중...' : '모든 로그인 세션 종료'}
                </button>
              ) : null}
            </article>
          )) : (
            <div className={styles.emptyState}>회원가입 계정이 확인되면 이곳에서 AI 사용을 승인할 수 있습니다.</div>
          )}
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

          {clientPagination?.hasMore ? (
            <p className={styles.paginationNote}>
              현재 {clientPagination.returned}명만 표시 중입니다. 다음 페이지 시작 위치: {clientPagination.nextOffset}
            </p>
          ) : null}

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
                  <span className={styles.clientMeta}>
                    {client.id} · {client.status || '상태 미입력'} · {client.contactStatus || '연락 대기'} · {client.visitStatus || '미정'}
                  </span>
                  <span className={riskLabel === '일반' ? styles.safeChip : styles.warnChip}>{riskLabel}</span>
                </button>
              );
            }) : (
              <div className={styles.emptyState}>조건에 맞는 고객이 없습니다.</div>
            )}
          </div>

          {clientPagination?.hasMore ? (
            <button
              className={styles.loadMoreButton}
              type="button"
              onClick={handleLoadMoreClients}
              disabled={isLoadingMoreClients}
            >
              {isLoadingMoreClients ? '불러오는 중...' : '고객 더 불러오기'}
            </button>
          ) : null}
        </aside>

        <section className={styles.detailPanel}>
          {selectedClient ? (
            <>
              <div className={styles.detailHeader}>
                <div>
                  <p className={styles.eyebrow}>SELECTED CLIENT</p>
                  <h2>{selectedClient.name}</h2>
                  <p>
                    {selectedClient.id} · {selectedClient.status || '상태 미입력'} · {selectedClient.contactStatus || '연락 대기'}
                  </p>
                </div>
                <a className={styles.primaryButton} href={`/admin/consultation?clientId=${encodeURIComponent(selectedClient.id)}`}>
                  이 고객 상담하기
                </a>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                  <span>연락처</span>
                  <strong>{selectedClient.phone || '미입력'}</strong>
                  <p>{`유입경로 · ${formatAttribution(selectedClient)}`}</p>
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
                <div className={styles.infoCard}>
                  <span>상담 희망 시간</span>
                  <strong>{formatDateTime(selectedClient.scheduledVisitAt)}</strong>
                  <p>{selectedClient.visitStatus || '일정 미정'}</p>
                </div>
                <div className={styles.infoCard}>
                  <span>상담 진행 방식</span>
                  <strong>{getConsultationActivityLabel(selectedClient.consultationActivityPreference) || '미입력'}</strong>
                  <p>계약 전 상담 준비 정보입니다.</p>
                </div>
              </div>

              <section className={styles.workflowPanel} aria-labelledby="client-workflow-title">
                <div className={styles.workflowHeader}>
                  <div>
                    <p className={styles.eyebrow}>CONTACT & VISIT</p>
                    <h3 id="client-workflow-title">연락, 방문, 다음 행동</h3>
                    <p>상담 상태와 별개로 실제 연락과 방문 진행을 기록합니다.</p>
                  </div>
                  <div className={workflowError ? styles.errorStatus : styles.connectionStatus}>
                    {workflowError || workflowStatus || `마지막 연락 · ${formatDateTime(selectedClient.lastContactedAt)}`}
                  </div>
                </div>

                <div className={styles.workflowLayout}>
                  <form className={styles.workflowForm} onSubmit={handleSaveWorkflow}>
                    <label>
                      <span>연락 상태</span>
                      <select value={workflowDraft.contactStatus} onChange={(event) => updateWorkflowDraft('contactStatus', event.target.value)}>
                        {CLIENT_CONTACT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>방문 상태</span>
                      <select value={workflowDraft.visitStatus} onChange={(event) => updateWorkflowDraft('visitStatus', event.target.value)}>
                        {CLIENT_VISIT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>희망·확정 방문일</span>
                      <input type="datetime-local" value={workflowDraft.scheduledVisitAt} onChange={(event) => updateWorkflowDraft('scheduledVisitAt', event.target.value)} />
                    </label>
                    <label>
                      <span>다음 행동 예정일</span>
                      <input type="datetime-local" value={workflowDraft.nextActionAt} onChange={(event) => updateWorkflowDraft('nextActionAt', event.target.value)} />
                    </label>
                    <label className={styles.workflowWide}>
                      <span>다음 행동</span>
                      <input value={workflowDraft.nextAction} onChange={(event) => updateWorkflowDraft('nextAction', event.target.value)} placeholder="예: 전화로 방문 가능 시간 확인" />
                    </label>
                    <label className={styles.workflowWide}>
                      <span>재연락·보류 사유</span>
                      <textarea value={workflowDraft.followUpReason} onChange={(event) => updateWorkflowDraft('followUpReason', event.target.value)} placeholder="연락 결과와 다음 확인 사항을 짧게 기록합니다." />
                    </label>
                    <div className={styles.workflowActions}>
                      <button className={styles.primaryButton} type="submit" disabled={isSavingWorkflow}>
                        {isSavingWorkflow ? '저장 중...' : '진행 상태 저장'}
                      </button>
                    </div>
                  </form>

                  <div className={styles.attributionSummary}>
                    <span className={styles.cardLabel}>유입 기록</span>
                    <dl>
                      <div>
                        <dt>세션 최초 유입</dt>
                        <dd>{[selectedClient.firstSource, selectedClient.firstMedium, selectedClient.firstCampaign].filter(Boolean).join(' · ') || selectedClient.route || '기록 없음'}</dd>
                      </div>
                      <div>
                        <dt>세션 최초 페이지</dt>
                        <dd>{selectedClient.firstLandingPath || '기록 없음'}</dd>
                      </div>
                      <div>
                        <dt>최근 캠페인 유입</dt>
                        <dd>{formatAttribution(selectedClient)}</dd>
                      </div>
                      <div>
                        <dt>신청 직전 페이지</dt>
                        <dd>{selectedClient.applicationReferrerPath || '기록 없음'}</dd>
                      </div>
                      <div>
                        <dt>캠페인·연계 코드</dt>
                        <dd>{[selectedClient.campaignCode, selectedClient.partnerCode, selectedClient.qrCode, selectedClient.referralCode].filter(Boolean).join(' · ') || '기록 없음'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </section>

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
