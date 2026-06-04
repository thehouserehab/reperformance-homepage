'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './RPConsultationMode.module.css';
import {
  CONSULTATION_RESULTS,
  PE_EXAM_CONSULTATION_TOPICS,
  PE_EXAM_EVENTS,
  NEXT_ACTIONS,
  PAIN_AREAS,
  PROGRAMS,
  RP_PHASES,
  SAMPLE_CLIENTS,
  VISIT_PURPOSES,
} from './rpConsultationSchema';
import { fetchRpClients, saveRpConsultation } from './rpSheetsClient';

const STORAGE_KEY = 'rp-consultation-mode-v1';
const LIVE_STORAGE_KEY = 'rp-consultation-live-view-v1';
const LIVE_CHANNEL_NAME = 'rp-consultation-live-channel';
const NL = String.fromCharCode(10);

const EMPTY_CLIENT = {
  id: 'NO-CLIENT',
  name: '회원 미선택',
  phone: '',
  birth: '',
  gender: '',
  route: '',
  memberType: '',
  status: '상담 전',
  parqStatus: '확인 필요',
  parqYesItems: [],
  goal: '',
  purpose: [],
  painAreas: [],
  painScore: 0,
  concern: '',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readRequestedClientId() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('clientId') || '';
}

function readRequestedViewMode() {
  if (typeof window === 'undefined') return 'coach';
  const view = new URLSearchParams(window.location.search).get('view');
  return view === 'client' ? 'client' : 'coach';
}

function createInitialRecord(client = EMPTY_CLIENT) {
  return {
    consultationDate: today(),
    clientId: client.id,
    clientName: client.name,
    consultationStatus: '상담 중',
    coachName: client.coachName || client.coach || '정우현',
    memberGoal: client.goal || '',
    coachGoal: '',
    purposes: Array.isArray(client.purpose) ? client.purpose : [],
    painAreas: Array.isArray(client.painAreas) ? client.painAreas : [],
    painScore: client.painScore || 0,
    symptomMoves: client.concern || '',
    exerciseExperience: '',
    weeklyFrequency: '주 2회',
    preferredTime: '저녁',
    selectedPhase: 'phase1',
    recommendedProgram: '재활 트레이닝 8회',
    consultationResult: '초기 평가 예정',
    nextAction: '초기 평가 예약',
    coachMemo: '',
    internalJudgment: '',
    clientSummary: '',
    aiSummary: '',
    peExamTargetUniversities: '',
    peExamTargetDepartment: '',
    peExamAcademicStatus: '',
    peExamPracticalEvents: [],
    peExamRecordStatus: '',
    peExamTrainingFocus: '',
    peExamConsultingTopics: [],
    peExamApplicationStrategy: '',
  };
}

function TogglePill({ active, children, onClick }) {
  return (
    <button type='button' className={active ? styles.pillActive : styles.pill} onClick={onClick}>
      {children}
    </button>
  );
}

function formatList(value, fallback = '기록 없음') {
  return Array.isArray(value) && value.length ? value.join(', ') : fallback;
}

function isPeExamClient(client, record) {
  const text = [
    client?.memberType,
    client?.goal,
    record?.memberGoal,
    record?.coachGoal,
    formatList(client?.purpose, ''),
    formatList(record?.purposes, ''),
  ].join(' ');

  return text.includes('체대입시') || text.includes('입시');
}

function formatPeExamHeadline(record) {
  const university = record.peExamTargetUniversities || '희망 대학 미입력';
  const department = record.peExamTargetDepartment || '목표 학과 미입력';
  const events = formatList(record.peExamPracticalEvents, '실기 종목 미입력');
  return `${university} · ${department} · ${events}`;
}

function needsAttention(client, record) {
  if (!client) return false;
  if (Array.isArray(client.parqYesItems) && client.parqYesItems.length) return true;
  if (client.parqStatus && client.parqStatus !== '정상') return true;
  return Number(record?.painScore || client.painScore) >= 7;
}

function buildClientSummary(client, record, currentPhase) {
  if (isPeExamClient(client, record)) {
    return [
      `${client.name}님은 체대입시 준비를 위해 운동 관리와 입시 상담을 함께 진행합니다.`,
      `현재 입시 목표는 ${formatPeExamHeadline(record)} 기준으로 정리 중입니다.`,
      `실기 준비는 ${record.peExamTrainingFocus || record.coachGoal || '부족한 체력 요소와 종목별 기록을 확인한 뒤'} 단계적으로 보완합니다.`,
      `다음 단계는 ${record.nextAction || '실기 기록 측정과 지원 전략 상담'}입니다.`,
    ].join(NL);
  }

  const painText = record.painAreas?.length ? `${record.painAreas.join(', ')} 부위` : '특이 불편 부위 없음';
  const phaseText = currentPhase?.clientLabel || '움직임 안정화 단계';

  return [
    `${client.name}님은 ${record.memberGoal || client.goal || '운동 목표 확인'}을 중심으로 상담을 진행 중입니다.`,
    `현재 확인된 불편감은 ${painText}이며 통증 강도는 ${record.painScore || 0}/10입니다.`,
    `초기 운동 방향은 ${phaseText}를 기준으로 안전한 범위에서 시작합니다.`,
    `다음 단계는 ${record.nextAction || '초기 평가 예약'}입니다.`,
  ].join(NL);
}

function buildCoachSummary(client, record, currentPhase) {
  const parqLine = client.parqYesItems?.length
    ? `${client.parqStatus}: ${client.parqYesItems.join(', ')}`
    : 'PAR-Q 예 체크 항목 없음';
  const peExamLines = isPeExamClient(client, record) ? [
    `- 체대입시 목표: ${formatPeExamHeadline(record)}`,
    `- 현재 실기 기록: ${record.peExamRecordStatus || '미입력'}`,
    `- 내신/수능 상태: ${record.peExamAcademicStatus || '미입력'}`,
    `- 입시 상담 주제: ${formatList(record.peExamConsultingTopics, '미입력')}`,
    `- 원서 전략: ${record.peExamApplicationStrategy || '미입력'}`,
  ] : [];

  return [
    '코치 상담 요약',
    `- 회원 목표: ${record.memberGoal || '미입력'}`,
    `- 코치 재정의 목표: ${record.coachGoal || '미입력'}`,
    ...peExamLines,
    `- 주요 불편 부위: ${record.painAreas?.length ? record.painAreas.join(', ') : '특이사항 없음'}`,
    `- 통증 강도: ${record.painScore}/10`,
    `- PAR-Q 확인: ${parqLine}`,
    `- OPT Phase 후보: ${currentPhase?.label || 'Phase 미선택'} (${currentPhase?.clientLabel || ''})`,
    `- 다음 액션: ${record.nextAction || '미입력'}`,
  ].join(NL);
}

function parseLivePayload(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (_) {
    return null;
  }
}

function getClientLiveStorageKey(clientId) {
  return `${LIVE_STORAGE_KEY}:${clientId || 'default'}`;
}

function InfoTile({ label, value, text }) {
  return (
    <div className={styles.infoTile}>
      <span>{label}</span>
      <strong>{value}</strong>
      {text && <p>{text}</p>}
    </div>
  );
}

function ClientPresentationView({ client, record, currentPhase, attentionRequired, connectionStatus, connectionError }) {
  const clientSummary = record.clientSummary || buildClientSummary(client, record, currentPhase);
  const purposes = record.purposes?.length ? record.purposes : client.purpose;
  const painAreas = record.painAreas?.length ? record.painAreas.join(', ') : '특이사항 없음';
  const parqText = client.parqYesItems?.length ? client.parqYesItems.join(' / ') : 'PAR-Q 예 체크 항목 없음';
  const purposeText = formatList(purposes, '방문 목적 미입력');
  const currentPhaseIndex = Math.max(0, RP_PHASES.findIndex((phase) => phase.id === record.selectedPhase));
  const peExamClient = isPeExamClient(client, record);

  return (
    <main className={styles.clientPage}>
      <header className={styles.clientTopbar}>
        <div className={styles.logoText}><span>Re</span>PERFORMANCE</div>
        <div className={styles.clientStatusRow}>
          <span className={connectionError ? styles.errorText : styles.subtle}>{connectionError ? `오류: ${connectionError}` : connectionStatus}</span>
          <a className={styles.ghostButton} href={`/admin/consultation?clientId=${encodeURIComponent(client.id || '')}`}>코치 입력</a>
        </div>
      </header>

      <section className={styles.clientOnePage}>
        <div className={styles.presentationHero}>
          <div>
            <span className={attentionRequired ? styles.heroAlert : styles.heroBadge}>
              {peExamClient ? '체대입시 운동+입시상담' : attentionRequired ? '추가 확인 필요' : '상담 진행 가능'}
            </span>
            <h1>{client.name}님 상담 안내</h1>
            <p>{record.memberGoal || client.goal || '현재 상태와 운동 목표를 상담 중 정리하고 있습니다.'}</p>
          </div>
          <div className={styles.heroMetaBox}>
            <span>상담일</span>
            <strong>{record.consultationDate || today()}</strong>
            <span>담당 코치</span>
            <strong>{record.coachName || '정우현'}</strong>
          </div>
        </div>

        <div className={styles.monitorGrid}>
          <section className={styles.clientPrimaryPanel}>
            <div className={styles.sectionHeading}>
              <span>01</span>
              <h2>오늘 상담 핵심</h2>
            </div>
            <div className={styles.goalStatement}>
              <strong>{record.coachGoal || record.memberGoal || client.goal || '운동 목표를 상담 중 정리합니다.'}</strong>
              <p>{purposeText}</p>
            </div>
            <div className={styles.compactRows}>
              <div>
                <span>주요 불편 부위</span>
                <strong>{painAreas}</strong>
                <p>{record.symptomMoves || '증상 발생 동작 미입력'}</p>
              </div>
              <div>
                <span>건강 설문</span>
                <strong>{attentionRequired ? '추가 확인 필요' : '즉시 제한 항목 없음'}</strong>
                <p>{parqText}</p>
              </div>
            </div>
            {peExamClient && (
              <div className={styles.peExamClientBand}>
                <span>체대입시 요약</span>
                <strong>{formatPeExamHeadline(record)}</strong>
                <p>{record.peExamTrainingFocus || '실기 기록과 부족 체력 요소를 확인한 뒤 훈련 방향을 정합니다.'}</p>
              </div>
            )}
          </section>

          <aside className={styles.clientSignalPanel}>
            <InfoTile label='회원 ID' value={client.id || '미입력'} text={client.status || record.consultationStatus || '상담 중'} />
            <InfoTile label='운동 빈도' value={record.weeklyFrequency || '주 2회'} text={`선호 시간: ${record.preferredTime || '미입력'}`} />
            <div className={styles.infoTile}>
              <span>통증 강도</span>
              <strong>{record.painScore || 0}/10</strong>
              <div className={styles.painMeter}><span style={{ width: `${Math.min(100, Math.max(0, Number(record.painScore) * 10 || 0))}%` }} /></div>
            </div>
            <InfoTile label='다음 단계' value={record.nextAction || '초기 평가 예약'} text={record.consultationResult || '초기 평가 예정'} />
          </aside>
        </div>

        <section className={styles.monitorProgramPanel}>
          <div className={styles.programHeader}>
            <div className={styles.sectionHeading}>
              <span>02</span>
              <h2>추천 운동 단계</h2>
            </div>
            <div className={styles.programOutcome}>
              <span>추천 프로그램</span>
              <strong>{record.recommendedProgram}</strong>
            </div>
          </div>
          <div className={styles.phaseRail}>
            {RP_PHASES.map((phase, index) => (
              <div key={phase.id} className={phase.id === record.selectedPhase ? styles.phaseRailActive : styles.phaseRailStep}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{phase.clientLabel}</strong>
                <em>{index <= currentPhaseIndex ? '진행 범위' : '다음 후보'}</em>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.finalSummarySection}>
          <div className={styles.sectionHeading}>
            <span>03</span>
            <h2>최종 요약</h2>
          </div>
          <p>{clientSummary}</p>
        </section>
      </section>
    </main>
  );
}

function CoachInputView({
  client,
  record,
  currentPhase,
  attentionRequired,
  clients,
  clientId,
  connectionStatus,
  connectionError,
  isSaving,
  isSummarizing,
  onClientChange,
  onFieldChange,
  onArrayToggle,
  onOpenClientView,
  onGenerateSummary,
  onSave,
  onExport,
}) {
  const peExamClient = isPeExamClient(client, record);

  return (
    <main className={styles.wrap}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.logoText}><span>Re</span>PERFORMANCE</div>
          <div className={styles.subtle}>Coach Input · Live Client Presentation</div>
          <div className={connectionError ? styles.errorText : styles.subtle}>{connectionError ? `오류: ${connectionError}` : connectionStatus}</div>
        </div>
        <div className={styles.actions}>
          <a className={styles.ghostButton} href='/admin'>운영 홈</a>
          <a className={styles.ghostButton} href='/admin/clients'>고객관리</a>
          <select className={`${styles.select} ${styles.clientSelect}`} value={clientId} onChange={(event) => onClientChange(event.target.value)} disabled={!clients.length}>
            {clients.length ? clients.map((item) => (
              <option key={item.id} value={item.id}>{item.id} · {item.name}</option>
            )) : <option value=''>회원 없음</option>}
          </select>
          <button className={styles.primaryButton} type='button' onClick={onOpenClientView} disabled={!clients.length}>고객 화면 열기</button>
          <form action='/api/admin/logout' method='post'>
            <button className={styles.ghostButton} type='submit'>로그아웃</button>
          </form>
        </div>
      </header>

      <div className={styles.coachPageLayout}>
        <section className={styles.inputPanel}>
          <div className={styles.panelHeaderSplit}>
            <div>
              <h1>코치 입력 화면</h1>
              <p>고객에게 보여주지 않을 내부 판단과 상담 기록을 이곳에서 정리합니다.</p>
            </div>
            <span className={styles.liveBadge}>Live Sync</span>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>회원 요약</h2>
            <div className={styles.pillRow}>
              <span className={styles.statusPill}>{client.id}</span>
              <span className={styles.statusPill}>{client.name}</span>
              <span className={attentionRequired ? styles.dangerPill : styles.statusPill}>PAR-Q {client.parqStatus}</span>
              <span className={styles.statusPill}>{record.consultationStatus}</span>
            </div>
            <div className={styles.summaryGrid}>
              <div><strong>기존 목표</strong><span>{client.goal || '미입력'}</span></div>
              <div><strong>방문 목적</strong><span>{formatList(client.purpose)}</span></div>
              <div><strong>불편 부위</strong><span>{formatList(client.painAreas, '특이사항 없음')}</span></div>
              <div><strong>잔여회차</strong><span>{Number(client.remainingSessions) || 0}회</span></div>
            </div>
          </div>

          <div className={attentionRequired ? styles.alertSection : styles.section}>
            <h2 className={styles.sectionTitle}>PAR-Q 확인</h2>
            <p className={styles.cardText}>{client.parqYesItems?.length ? client.parqYesItems.join(' / ') : '예 체크 항목 없음'}</p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>상담 입력</h2>
            <div className={styles.formGrid}>
              <label className={styles.fieldFull}>
                <span className={styles.label}>회원이 말한 목표</span>
                <textarea className={styles.textarea} value={record.memberGoal} onChange={(e) => onFieldChange('memberGoal', e.target.value)} />
              </label>
              <label className={styles.fieldFull}>
                <span className={styles.label}>코치가 재정의한 목표</span>
                <textarea className={styles.textarea} value={record.coachGoal} onChange={(e) => onFieldChange('coachGoal', e.target.value)} placeholder='예: 무릎 통증을 관리하면서 하체 정렬과 기본 근력을 회복한다.' />
              </label>
              <div className={styles.fieldFull}>
                <span className={styles.label}>방문 목적</span>
                <div className={styles.pillRow}>
                  {VISIT_PURPOSES.map((item) => <TogglePill key={item} active={record.purposes.includes(item)} onClick={() => onArrayToggle('purposes', item)}>{item}</TogglePill>)}
                </div>
              </div>
            </div>
          </div>

          {peExamClient && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>체대입시 운동+입시상담</h2>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>희망 대학</span>
                  <input className={styles.input} value={record.peExamTargetUniversities || ''} onChange={(e) => onFieldChange('peExamTargetUniversities', e.target.value)} placeholder='예: 한국체대, 용인대, 전북대' />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>목표 학과</span>
                  <input className={styles.input} value={record.peExamTargetDepartment || ''} onChange={(e) => onFieldChange('peExamTargetDepartment', e.target.value)} placeholder='예: 체육교육과, 스포츠과학과' />
                </label>
                <div className={styles.fieldFull}>
                  <span className={styles.label}>준비 실기 종목</span>
                  <div className={styles.pillRow}>
                    {PE_EXAM_EVENTS.map((item) => <TogglePill key={item} active={(record.peExamPracticalEvents || []).includes(item)} onClick={() => onArrayToggle('peExamPracticalEvents', item)}>{item}</TogglePill>)}
                  </div>
                </div>
                <label className={styles.fieldFull}>
                  <span className={styles.label}>현재 실기 기록 / 부족 종목</span>
                  <textarea className={styles.textarea} value={record.peExamRecordStatus || ''} onChange={(e) => onFieldChange('peExamRecordStatus', e.target.value)} placeholder='예: 제자리멀리뛰기 225cm, 윗몸 52개. 왕복달리기와 점프 파워 보완 필요.' />
                </label>
                <label className={styles.fieldFull}>
                  <span className={styles.label}>내신/수능 상태</span>
                  <textarea className={styles.textarea} value={record.peExamAcademicStatus || ''} onChange={(e) => onFieldChange('peExamAcademicStatus', e.target.value)} placeholder='예: 내신 4등급대, 수능 최저 확인 필요. 학생/학부모 상담에서 업데이트.' />
                </label>
                <label className={styles.fieldFull}>
                  <span className={styles.label}>운동 관리 방향</span>
                  <textarea className={styles.textarea} value={record.peExamTrainingFocus || ''} onChange={(e) => onFieldChange('peExamTrainingFocus', e.target.value)} placeholder='예: 주 3회 실기 기록 향상, 하체 파워, 코어 지구력, 부상 방지 루틴 중심.' />
                </label>
                <div className={styles.fieldFull}>
                  <span className={styles.label}>입시상담 주제</span>
                  <div className={styles.pillRow}>
                    {PE_EXAM_CONSULTATION_TOPICS.map((item) => <TogglePill key={item} active={(record.peExamConsultingTopics || []).includes(item)} onClick={() => onArrayToggle('peExamConsultingTopics', item)}>{item}</TogglePill>)}
                  </div>
                </div>
                <label className={styles.fieldFull}>
                  <span className={styles.label}>지원/원서 전략 메모</span>
                  <textarea className={styles.textarea} value={record.peExamApplicationStrategy || ''} onChange={(e) => onFieldChange('peExamApplicationStrategy', e.target.value)} placeholder='예: 실기 반영 비율 높은 대학 우선 분석. 1차 기록 측정 후 지원권 재정리.' />
                </label>
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>통증/불편감</h2>
            <div className={styles.formGrid}>
              <div className={styles.fieldFull}>
                <span className={styles.label}>주요 불편 부위</span>
                <div className={styles.pillRow}>
                  {PAIN_AREAS.map((item) => <TogglePill key={item} active={record.painAreas.includes(item)} onClick={() => onArrayToggle('painAreas', item)}>{item}</TogglePill>)}
                </div>
              </div>
              <label className={styles.field}>
                <span className={styles.label}>통증 강도 0~10</span>
                <input className={styles.input} type='number' min='0' max='10' value={record.painScore} onChange={(e) => onFieldChange('painScore', Number(e.target.value))} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>주당 가능 횟수</span>
                <select className={styles.select} value={record.weeklyFrequency} onChange={(e) => onFieldChange('weeklyFrequency', e.target.value)}>
                  {['주 1회', '주 2회', '주 3회', '주 4회 이상'].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>선호 시간</span>
                <select className={styles.select} value={record.preferredTime} onChange={(e) => onFieldChange('preferredTime', e.target.value)}>
                  {['오전', '오후', '저녁', '협의 필요'].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className={styles.fieldFull}>
                <span className={styles.label}>증상 발생 동작 / 악화 요인</span>
                <textarea className={styles.textarea} value={record.symptomMoves} onChange={(e) => onFieldChange('symptomMoves', e.target.value)} />
              </label>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>프로그램 방향</h2>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.label}>추천 OPT Phase</span>
                <select className={styles.select} value={record.selectedPhase} onChange={(e) => onFieldChange('selectedPhase', e.target.value)}>
                  {RP_PHASES.map((phase) => <option key={phase.id} value={phase.id}>{phase.label} · {phase.clientLabel}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>추천 프로그램</span>
                <select className={styles.select} value={record.recommendedProgram} onChange={(e) => onFieldChange('recommendedProgram', e.target.value)}>
                  {PROGRAMS.map((program) => <option key={program}>{program}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>상담 결과</span>
                <select className={styles.select} value={record.consultationResult} onChange={(e) => onFieldChange('consultationResult', e.target.value)}>
                  {CONSULTATION_RESULTS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>다음 액션</span>
                <select className={styles.select} value={record.nextAction} onChange={(e) => onFieldChange('nextAction', e.target.value)}>
                  {NEXT_ACTIONS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>고객용 최종 요약</h2>
            <textarea className={styles.textareaLarge} value={record.clientSummary} onChange={(e) => onFieldChange('clientSummary', e.target.value)} placeholder='고객 화면 하단에 표시될 짧은 최종 요약입니다.' />
            <div className={styles.footerActions}>
              <button className={styles.ghostButton} type='button' onClick={onGenerateSummary} disabled={isSummarizing}>{isSummarizing ? 'AI 요약 중...' : 'AI 요약 생성'}</button>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>코치 내부 메모</h2>
            <textarea className={styles.textareaLarge} value={record.internalJudgment} onChange={(e) => onFieldChange('internalJudgment', e.target.value)} placeholder='회원에게 보여주지 않는 내부 판단과 상담 전략을 기록합니다.' />
            {record.aiSummary && <div className={styles.aiBox}>{record.aiSummary}</div>}
          </div>

          <div className={styles.footerActions}>
            <button className={styles.ghostButton} type='button' onClick={onExport} disabled={!clients.length}>JSON 내보내기</button>
            <button className={styles.primaryButton} type='button' onClick={onSave} disabled={!clients.length || isSaving}>{isSaving ? '저장 중...' : '상담 저장'}</button>
          </div>
        </section>

        <aside className={styles.livePreviewPanel}>
          <div className={styles.previewSticky}>
            <span className={styles.liveBadge}>실시간 고객 화면</span>
            <h2>{client.name}님 화면에 반영 중</h2>
            <p>고객에게 보여줄 전체 화면은 새 창으로 열어 사용합니다. 이 미리보기에는 고객용 정보만 축약 표시됩니다.</p>
            <div className={styles.previewCard}>
              <strong>{record.memberGoal || client.goal || '운동 목표 미입력'}</strong>
              {peExamClient && <span>체대입시 · {formatPeExamHeadline(record)}</span>}
              <span>{record.painAreas?.length ? record.painAreas.join(', ') : '특이 불편감 없음'} · 통증 {record.painScore || 0}/10</span>
              <span>{currentPhase?.clientLabel || '움직임 안정화 단계'}</span>
              <span>{record.recommendedProgram}</span>
            </div>
            <button className={styles.primaryButton} type='button' onClick={onOpenClientView} disabled={!clients.length}>고객 화면 새 창</button>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function RPConsultationMode({ clients: initialClients, onSave }) {
  const [viewMode, setViewMode] = useState('coach');
  const [requestedClientId, setRequestedClientId] = useState('');
  const [clients, setClients] = useState(() => (Array.isArray(initialClients) && initialClients.length ? initialClients : SAMPLE_CLIENTS));
  const [clientId, setClientId] = useState(() => (Array.isArray(initialClients) && initialClients.length ? initialClients[0]?.id : ''));
  const [connectionStatus, setConnectionStatus] = useState('Google Sheets 연결 확인 중...');
  const [connectionError, setConnectionError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [livePayload, setLivePayload] = useState(null);

  const selectedClient = useMemo(() => clients.find((client) => client.id === clientId) || clients[0] || EMPTY_CLIENT, [clients, clientId]);
  const [record, setRecord] = useState(() => createInitialRecord(selectedClient));
  const currentPhase = RP_PHASES.find((phase) => phase.id === record.selectedPhase) || RP_PHASES[0];
  const presentationClient = livePayload?.client || selectedClient;
  const presentationRecord = livePayload?.record || record;
  const presentationPhase = RP_PHASES.find((phase) => phase.id === presentationRecord.selectedPhase) || currentPhase;
  const attentionRequired = needsAttention(viewMode === 'client' ? presentationClient : selectedClient, viewMode === 'client' ? presentationRecord : record);

  useEffect(() => {
    const requestedView = readRequestedViewMode();
    setViewMode(requestedView);
    setRequestedClientId(readRequestedClientId());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadClientsFromSheets() {
      if (Array.isArray(initialClients) && initialClients.length) {
        setClients(initialClients);
        setClientId((current) => current || initialClients[0]?.id || '');
        setConnectionStatus(`외부 주입 고객 목록 사용 · ${initialClients.length}명`);
        return;
      }

      try {
        setConnectionStatus('Google Sheets 연결 확인 중...');
        setConnectionError('');
        const sheetClients = await fetchRpClients();

        if (cancelled) return;

        if (sheetClients.length) {
          setClients(sheetClients);
          setClientId((current) => current || sheetClients[0].id);
          setConnectionStatus(`Google Sheets 연결 성공 · ${sheetClients.length}명 불러옴`);
        } else {
          setClients([]);
          setClientId('');
          setConnectionStatus('Google Sheets 연결 성공 · 표시할 회원 없음');
        }
      } catch (error) {
        if (cancelled) return;
        setClients(SAMPLE_CLIENTS);
        setClientId((current) => current || SAMPLE_CLIENTS[0]?.id || '');
        setConnectionStatus('Google Sheets 연결 실패 · 샘플 고객 표시 중');
        setConnectionError(error?.message || '알 수 없는 연결 오류');
      }
    }

    loadClientsFromSheets();

    return () => {
      cancelled = true;
    };
  }, [initialClients]);

  useEffect(() => {
    if (!requestedClientId || !clients.length) return;
    if (clients.some((client) => client.id === requestedClientId)) setClientId(requestedClientId);
  }, [clients, requestedClientId]);

  useEffect(() => {
    if (!selectedClient || selectedClient.id === 'NO-CLIENT') return;
    const savedRaw = typeof window !== 'undefined' ? window.localStorage.getItem(`${STORAGE_KEY}:${selectedClient.id}`) : null;
    if (savedRaw) {
      try {
        setRecord(JSON.parse(savedRaw));
        return;
      } catch (_) {}
    }
    setRecord(createInitialRecord(selectedClient));
  }, [selectedClient]);

  useEffect(() => {
    if (viewMode !== 'coach' || !selectedClient?.id || selectedClient.id === 'NO-CLIENT') return;
    const payload = {
      clientId: selectedClient.id,
      client: selectedClient,
      record: {
        ...record,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
      },
      updatedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(`${STORAGE_KEY}:${selectedClient.id}`, JSON.stringify(payload.record));
      window.localStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify(payload));
      window.localStorage.setItem(getClientLiveStorageKey(selectedClient.id), JSON.stringify(payload));
    } catch (_) {}

    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(LIVE_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    }
  }, [viewMode, selectedClient, record]);

  useEffect(() => {
    if (viewMode !== 'client') return undefined;

    function applyPayload(payload) {
      if (!payload?.record || !payload?.client) return;
      const payloadClientId = payload.clientId || payload.client.id;
      if (clientId && payloadClientId && payloadClientId !== clientId) return;
      setLivePayload(payload);
    }

    if (typeof window !== 'undefined') {
      const preferredRaw = window.localStorage.getItem(getClientLiveStorageKey(clientId || requestedClientId));
      const fallbackRaw = window.localStorage.getItem(LIVE_STORAGE_KEY);
      applyPayload(parseLivePayload(preferredRaw || fallbackRaw));
    }

    function handleStorage(event) {
      if (!event.key || (!event.key.startsWith(LIVE_STORAGE_KEY))) return;
      applyPayload(parseLivePayload(event.newValue));
    }

    window.addEventListener('storage', handleStorage);

    let channel;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(LIVE_CHANNEL_NAME);
      channel.onmessage = (event) => applyPayload(event.data);
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channel) channel.close();
    };
  }, [viewMode, clientId, requestedClientId]);

  function updateField(key, value) {
    setRecord((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArrayValue(key, value) {
    setRecord((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  }

  function openClientView() {
    if (typeof window === 'undefined') return;
    const url = new URL('/admin/consultation', window.location.origin);
    url.searchParams.set('view', 'client');
    if (selectedClient?.id) url.searchParams.set('clientId', selectedClient.id);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  }

  async function generateSummary() {
    const fallbackClientSummary = buildClientSummary(selectedClient, record, currentPhase);
    const fallbackCoachSummary = buildCoachSummary(selectedClient, record, currentPhase);

    try {
      setIsSummarizing(true);
      const response = await fetch('/api/rp/consultation-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client: selectedClient,
          record,
          phase: currentPhase,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'AI 요약 생성 실패');

      setRecord((prev) => ({
        ...prev,
        clientSummary: payload.clientSummary || payload.summary || fallbackClientSummary,
        aiSummary: payload.coachSummary || payload.summary || fallbackCoachSummary,
      }));
    } catch (error) {
      setRecord((prev) => ({
        ...prev,
        clientSummary: fallbackClientSummary,
        aiSummary: [fallbackCoachSummary, '', `AI 연결 상태: ${error?.message || '설정 필요'}`].join(NL),
      }));
    } finally {
      setIsSummarizing(false);
    }
  }

  async function saveRecord() {
    const payload = {
      ...record,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      savedAt: new Date().toISOString(),
      clientSnapshot: selectedClient,
    };

    if (typeof window !== 'undefined' && selectedClient?.id) {
      window.localStorage.setItem(`${STORAGE_KEY}:${selectedClient.id}`, JSON.stringify(payload));
    }

    try {
      setIsSaving(true);
      await saveRpConsultation(payload);
      if (typeof onSave === 'function') onSave(payload);
      alert('상담 기록이 Google Sheets에 저장되었습니다.');
    } catch (error) {
      alert([`Google Sheets 저장 실패: ${error?.message || '알 수 없는 오류'}`, '', '브라우저 localStorage에는 임시 저장되었습니다.'].join(NL));
    } finally {
      setIsSaving(false);
    }
  }

  function exportJson() {
    const payload = JSON.stringify({ ...record, clientSnapshot: selectedClient }, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClient.id}_${selectedClient.name}_consultation.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (viewMode === 'client') {
    return (
      <ClientPresentationView
        client={presentationClient}
        record={presentationRecord}
        currentPhase={presentationPhase}
        attentionRequired={attentionRequired}
        connectionStatus={connectionStatus}
        connectionError={connectionError}
      />
    );
  }

  return (
    <CoachInputView
      client={selectedClient}
      record={record}
      currentPhase={currentPhase}
      attentionRequired={attentionRequired}
      clients={clients}
      clientId={clientId}
      connectionStatus={connectionStatus}
      connectionError={connectionError}
      isSaving={isSaving}
      isSummarizing={isSummarizing}
      onClientChange={setClientId}
      onFieldChange={updateField}
      onArrayToggle={toggleArrayValue}
      onOpenClientView={openClientView}
      onGenerateSummary={generateSummary}
      onSave={saveRecord}
      onExport={exportJson}
    />
  );
}
