'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './RPConsultationMode.module.css';
import {
  CONSULTATION_RESULTS,
  NEXT_ACTIONS,
  PAIN_AREAS,
  PROGRAMS,
  RP_PHASES,
  SAMPLE_CLIENTS,
  VISIT_PURPOSES,
} from './rpConsultationSchema';
import { fetchRpClients, saveRpConsultation } from './rpSheetsClient';

const STORAGE_KEY = 'rp-consultation-mode-v1';

const EMPTY_CLIENT = {
  id: 'NO-CLIENT',
  name: '회원 미선택',
  phone: '',
  birth: '',
  gender: '',
  route: '',
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
    aiSummary: '',
  };
}

function TogglePill({ active, children, onClick }) {
  return (
    <button type="button" className={active ? styles.pillActive : styles.pill} onClick={onClick}>
      {children}
    </button>
  );
}

function buildAiSummary(client, record, currentPhase) {
  const parqLine = client.parqYesItems?.length
    ? `${client.parqStatus}: ${client.parqYesItems.join(', ')}`
    : 'PAR-Q 특이 응답 없음';

  return `AI 상담 요약\n\n- 회원 목표: ${record.memberGoal || '미입력'}\n- 코치 재정의 목표: ${record.coachGoal || '미입력'}\n- 주요 불편 부위: ${record.painAreas.length ? record.painAreas.join(', ') : '특이사항 없음'}\n- 통증 강도: ${record.painScore}/10\n- PAR-Q 확인: ${parqLine}\n- 초기 확인 질문: 통증 발생 동작, 최근 치료/주사/수술 여부, 운동 중 악화 기준\n- 초기 평가 추천: Squat, Hinge, Lunge, Balance, Breathing/Bracing\n- OPT Phase 후보: ${currentPhase?.label || 'Phase 미선택'} (${currentPhase?.clientLabel || ''})\n- 프로그램 설계 주의: 고강도 적용 전 통증 반응과 움직임 제어 능력 확인 필요`;
}

export default function RPConsultationMode({ clients: initialClients, onSave }) {
  const [clients, setClients] = useState(() => (Array.isArray(initialClients) && initialClients.length ? initialClients : SAMPLE_CLIENTS));
  const [clientId, setClientId] = useState(() => (Array.isArray(initialClients) && initialClients.length ? initialClients[0]?.id : ''));
  const [connectionStatus, setConnectionStatus] = useState('Google Sheets 연결 확인 중...');
  const [connectionError, setConnectionError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedClient = useMemo(() => clients.find((client) => client.id === clientId) || clients[0] || EMPTY_CLIENT, [clients, clientId]);
  const [record, setRecord] = useState(() => createInitialRecord(selectedClient));
  const currentPhase = RP_PHASES.find((phase) => phase.id === record.selectedPhase);

  useEffect(() => {
    let cancelled = false;

    async function loadClientsFromSheets() {
      // 명시적으로 clients prop이 들어온 경우에는 외부에서 주입한 목록을 우선 사용한다.
      if (Array.isArray(initialClients) && initialClients.length) {
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
          setClientId(sheetClients[0].id);
          setConnectionStatus(`Google Sheets 연결 성공 · ${sheetClients.length}명 불러옴`);
        } else {
          setClients([]);
          setClientId('');
          setConnectionStatus('Google Sheets 연결 성공 · 표시할 회원 없음');
        }
      } catch (error) {
        if (cancelled) return;
        setClients(SAMPLE_CLIENTS);
        setClientId(SAMPLE_CLIENTS[0]?.id || '');
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

  function generateSummary() {
    updateField('aiSummary', buildAiSummary(selectedClient, record, currentPhase));
  }

  async function saveRecord() {
    const payload = {
      ...record,
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
      alert(`Google Sheets 저장 실패: ${error?.message || '알 수 없는 오류'}\n\n브라우저 localStorage에는 임시 저장되었습니다.`);
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

  return (
    <main className={styles.wrap}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.logoText}><span>Re</span>PERFORMANCE</div>
          <div className={styles.subtle}>Consultation Mode · Client View + Coach View</div>
          <div className={connectionError ? styles.subtle : styles.subtle}>{connectionStatus}</div>
          {connectionError && <div className={styles.subtle}>오류: {connectionError}</div>}
        </div>
        <div className={styles.actions}>
          <select className={`${styles.select} ${styles.clientSelect}`} value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={!clients.length}>
            {clients.length ? clients.map((client) => (
              <option key={client.id} value={client.id}>{client.id} · {client.name}</option>
            )) : <option value="">회원 없음</option>}
          </select>
          <button className={styles.ghostButton} type="button" onClick={exportJson} disabled={!clients.length}>JSON 내보내기</button>
          <button className={styles.primaryButton} type="button" onClick={saveRecord} disabled={!clients.length || isSaving}>{isSaving ? '저장 중...' : '상담 저장'}</button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>고객 화면</h2>
            <p className={styles.subtle}>회원에게 보여주는 설명용 화면입니다.</p>
          </div>
          <div className={styles.clientScreen}>
            <div className={styles.clientHero}>
              <h1>{selectedClient.name}님 상담을 시작합니다.</h1>
              <p>현재 몸 상태와 운동 목표를 확인하고, 가장 안전한 운동 방향을 함께 정리합니다.</p>
              <div className={styles.stepList}>
                {['운동 목적 확인', '현재 불편감 확인', '건강 설문 확인', '운동 단계 안내', '다음 진행 절차 안내'].map((step, index) => (
                  <div className={styles.stepItem} key={step}><span className={styles.stepNum}>{index + 1}</span>{step}</div>
                ))}
              </div>
            </div>

            <div className={styles.cardGrid}>
              <div className={styles.card}>
                <div className={styles.cardLabel}>운동 목표 정리</div>
                <div className={styles.cardValue}>{record.memberGoal || '상담 중 목표를 정리합니다.'}</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>현재 불편감</div>
                <div className={styles.cardValue}>{record.painAreas.length ? record.painAreas.join(', ') : '특이 불편감 없음'}</div>
              </div>
              <div className={styles.wideCard}>
                <div className={styles.cardLabel}>건강 설문 확인</div>
                <div className={styles.cardText}>
                  {selectedClient.parqStatus === '정상'
                    ? '작성해주신 내용 기준으로 운동 시작 전 추가 확인이 필요한 항목은 확인되지 않았습니다.'
                    : '운동 설계 시 고려해야 할 항목이 확인되었습니다. 담당 코치가 현재 상태를 추가로 확인한 뒤 안전한 운동 범위와 진행 방향을 안내드립니다.'}
                </div>
              </div>
              <div className={styles.wideCard}>
                <div className={styles.cardLabel}>RePERFORMANCE 운동 단계</div>
                <div className={styles.phaseBox}>
                  {RP_PHASES.map((phase) => (
                    <div key={phase.id} className={`${styles.phaseRow} ${phase.id === record.selectedPhase ? styles.phaseCurrent : ''}`}>
                      <div>
                        <div className={styles.phaseName}>{phase.clientLabel}</div>
                        <div className={styles.phaseDesc}>{phase.desc}</div>
                      </div>
                      {phase.id === record.selectedPhase && <span className={styles.statusPill}>현재 추천</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.wideCard}>
                <div className={styles.cardLabel}>추천 진행 방향</div>
                <div className={styles.cardValue}>{record.recommendedProgram}</div>
                <p className={styles.cardText}>현재 목표와 신체 상태를 고려해 단계적으로 진행합니다. 상담 후 필요 시 초기 평가를 통해 정확한 운동 범위와 프로그램을 확정합니다.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>코치 입력 화면</h2>
            <p className={styles.subtle}>상담 기록, 내부 판단, 저장용 화면입니다. 고객에게 노출하지 않습니다.</p>
          </div>
          <div className={styles.coachScreen}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>회원 요약</h3>
              <div className={styles.pillRow}>
                <span className={styles.statusPill}>{selectedClient.id}</span>
                <span className={styles.statusPill}>{selectedClient.name}</span>
                <span className={selectedClient.parqStatus === '정상' ? styles.statusPill : styles.dangerPill}>PAR-Q {selectedClient.parqStatus}</span>
                <span className={styles.statusPill}>{record.consultationStatus}</span>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>PAR-Q 확인</h3>
              <div className={styles.cardText}>
                {selectedClient.parqYesItems?.length ? selectedClient.parqYesItems.join(' / ') : '예 체크 항목 없음'}
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>상담 입력</h3>
              <div className={styles.formGrid}>
                <label className={styles.fieldFull}>
                  <span className={styles.label}>회원이 말한 목표</span>
                  <textarea className={styles.textarea} value={record.memberGoal} onChange={(e) => updateField('memberGoal', e.target.value)} />
                </label>
                <label className={styles.fieldFull}>
                  <span className={styles.label}>코치가 재정의한 목표</span>
                  <textarea className={styles.textarea} value={record.coachGoal} onChange={(e) => updateField('coachGoal', e.target.value)} placeholder="예: 무릎 통증을 관리하면서 하체 정렬과 기본 근력을 회복한다." />
                </label>
                <div className={styles.fieldFull}>
                  <span className={styles.label}>방문 목적</span>
                  <div className={styles.pillRow}>
                    {VISIT_PURPOSES.map((item) => <TogglePill key={item} active={record.purposes.includes(item)} onClick={() => toggleArrayValue('purposes', item)}>{item}</TogglePill>)}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>통증/불편감</h3>
              <div className={styles.formGrid}>
                <div className={styles.fieldFull}>
                  <span className={styles.label}>주요 불편 부위</span>
                  <div className={styles.pillRow}>
                    {PAIN_AREAS.map((item) => <TogglePill key={item} active={record.painAreas.includes(item)} onClick={() => toggleArrayValue('painAreas', item)}>{item}</TogglePill>)}
                  </div>
                </div>
                <label className={styles.field}>
                  <span className={styles.label}>통증 강도 0~10</span>
                  <input className={styles.input} type="number" min="0" max="10" value={record.painScore} onChange={(e) => updateField('painScore', Number(e.target.value))} />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>주당 가능 횟수</span>
                  <select className={styles.select} value={record.weeklyFrequency} onChange={(e) => updateField('weeklyFrequency', e.target.value)}>
                    {['주 1회', '주 2회', '주 3회', '주 4회 이상'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className={styles.fieldFull}>
                  <span className={styles.label}>증상 발생 동작 / 악화 요인</span>
                  <textarea className={styles.textarea} value={record.symptomMoves} onChange={(e) => updateField('symptomMoves', e.target.value)} />
                </label>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>프로그램 방향</h3>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>추천 OPT Phase</span>
                  <select className={styles.select} value={record.selectedPhase} onChange={(e) => updateField('selectedPhase', e.target.value)}>
                    {RP_PHASES.map((phase) => <option key={phase.id} value={phase.id}>{phase.label} · {phase.clientLabel}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>추천 프로그램</span>
                  <select className={styles.select} value={record.recommendedProgram} onChange={(e) => updateField('recommendedProgram', e.target.value)}>
                    {PROGRAMS.map((program) => <option key={program}>{program}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>상담 결과</span>
                  <select className={styles.select} value={record.consultationResult} onChange={(e) => updateField('consultationResult', e.target.value)}>
                    {CONSULTATION_RESULTS.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>다음 액션</span>
                  <select className={styles.select} value={record.nextAction} onChange={(e) => updateField('nextAction', e.target.value)}>
                    {NEXT_ACTIONS.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>코치 내부 메모</h3>
              <textarea className={styles.textarea} value={record.internalJudgment} onChange={(e) => updateField('internalJudgment', e.target.value)} placeholder="회원에게 보여주지 않는 내부 판단과 상담 전략을 기록합니다." />
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>AI 내부 보조</h3>
              <div className={styles.footerActions}>
                <button className={styles.ghostButton} type="button" onClick={generateSummary}>상담 요약 생성</button>
              </div>
              {record.aiSummary && <div className={styles.aiBox}>{record.aiSummary}</div>}
            </div>

            <div className={styles.footerActions}>
              <button className={styles.ghostButton} type="button" onClick={exportJson} disabled={!clients.length}>JSON 내보내기</button>
              <button className={styles.primaryButton} type="button" onClick={saveRecord} disabled={!clients.length || isSaving}>{isSaving ? '저장 중...' : '상담 저장'}</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
