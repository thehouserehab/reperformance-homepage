# RPConsultationMode.jsx 패치 가이드

현재 상담모드가 샘플 고객 2명만 표시한다면, 다음 방식으로 변경합니다.

## 1. import 추가

```js
import { fetchRpClients, saveRpConsultation, saveRpClient } from './rpSheetsClient';
```

## 2. 샘플 고객 state 교체

기존:

```js
const [clients, setClients] = useState(sampleClients);
```

변경:

```js
const [clients, setClients] = useState([]);
const [loadingClients, setLoadingClients] = useState(true);
const [sheetError, setSheetError] = useState('');

useEffect(() => {
  async function loadClients() {
    try {
      setLoadingClients(true);
      const rows = await fetchRpClients();
      setClients(rows);
      setSelectedClient(rows[0] || null);
    } catch (error) {
      setSheetError(error.message);
    } finally {
      setLoadingClients(false);
    }
  }
  loadClients();
}, []);
```

## 3. 상담 저장 함수 교체

기존 localStorage 저장 후 아래를 추가하거나 교체합니다.

```js
async function handleSaveConsultation() {
  const payload = {
    memberId: selectedClient?.id,
    name: selectedClient?.name,
    phone: selectedClient?.phone,
    goal: form.goal,
    coachGoal: form.coachGoal,
    discomfort: form.discomfort,
    painScore: form.painScore,
    aggravatingMovement: form.aggravatingMovement,
    exerciseExperience: form.exerciseExperience,
    parqStatus: selectedClient?.parqStatus,
    exerciseDecision: form.exerciseDecision,
    optPhase: form.optPhase,
    recommendedProgram: form.recommendedProgram,
    consultationResult: form.consultationResult,
    nextAction: form.nextAction,
    coachMemo: form.coachMemo,
    aiSummary: aiSummary,
    coach: form.coach
  };

  await saveRpConsultation(payload);
  alert('상담 기록이 Google Sheets에 저장되었습니다.');
}
```

## 4. 신규 고객 추가

```js
async function handleCreateClient(newClient) {
  const saved = await saveRpClient(newClient);
  const rows = await fetchRpClients();
  setClients(rows);
  setSelectedClient(rows.find(c => c.id === saved.id) || rows[0] || null);
}
```
