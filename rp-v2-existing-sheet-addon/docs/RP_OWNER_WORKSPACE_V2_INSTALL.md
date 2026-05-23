# RePERFORMANCE Owner Workspace V2 연결 설치서

## 대상 Google Sheet

- Spreadsheet ID: `1jmA1gXk895ewKqgH3ldWj2mppuS4q3L1`
- 기존 탭은 유지합니다.
- V2는 기존 `Members_회원`, `Leads_상담` 탭을 확장하고, 추가 운영 탭을 생성합니다.

## V2에서 사용하는 탭

### 기존 탭 활용

- `Dashboard`
- `Leads_상담`
- `Members_회원`
- `Sales_매출`
- `Payments_잔금분납`
- `Refunds_환불`
- `Tasks_할일`
- `Documents_문서DB`
- `KPI_월간지표`
- `Settings_설정`

### 새로 추가되는 탭

- `PARQ_건강설문`
- `Assessments_평가`
- `Programs_OPT`
- `Sessions_세션기록`
- `API_Log`

## 설치 순서

### 1. Apps Script 코드 삽입

Google Sheet에서:

`확장 프로그램 → Apps Script`

기존 코드가 있으면 백업 후, `google-apps-script/Code.gs` 내용을 붙여넣습니다.

### 2. Secret 변경

`Code.gs` 상단에서 아래 값을 긴 임의 문자열로 변경합니다.

```js
DEFAULT_SECRET: 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET'
```

예시:

```js
DEFAULT_SECRET: 'rp_v2_2026_xxxxxxxxxxxxxxxxx'
```

### 3. V2 시트 초기화

Apps Script에서 아래 함수를 한 번 실행합니다.

```js
setupRPV2()
```

권한 승인 후, 기존 시트에 V2 탭과 헤더가 생성됩니다.

### 4. Secret 저장

Apps Script에서 아래 함수를 한 번 실행합니다.

```js
setRpApiSecretOnce()
```

### 5. Web App 배포

Apps Script에서:

`배포 → 새 배포 → 유형: 웹 앱`

설정:

- 실행 사용자: 나
- 액세스 권한: 모든 사용자

배포 후 Web App URL을 복사합니다.

### 6. Vercel 환경변수 추가

Vercel 프로젝트 설정에서 Environment Variables 추가:

```txt
RP_SHEETS_WEBAPP_URL=Apps Script Web App URL
RP_API_SECRET=Apps Script DEFAULT_SECRET과 동일한 값
```

Preview/Production 모두 필요하면 두 환경 모두에 추가합니다.

### 7. Next.js 파일 추가

기존 `reperformance-homepage-v6`에 아래 파일을 추가합니다.

```txt
app/api/rp/clients/route.js
components/rp-consultation/rpSheetsClient.js
```

### 8. 상담모드 파일에서 호출 연결

`RPConsultationMode.jsx`에서 샘플 고객 대신 아래 함수를 사용합니다.

```js
import { fetchRpClients, saveRpConsultation, saveRpClient } from './rpSheetsClient';
```

기본 흐름:

```js
const clients = await fetchRpClients();
await saveRpConsultation(formPayload);
```

## 연결 테스트

배포 후 브라우저에서 아래 경로 확인:

```txt
/admin/consultation
```

서버 연결 테스트:

```txt
/api/rp/clients?action=health
/api/rp/clients?action=listClients
```

정상 응답 예시:

```json
{ "ok": true, "service": "RP Sheets Bridge V2" }
```

## 현재 V2 역할

- Google Sheet를 RP 운영 DB로 사용
- 상담모드에서 회원 목록 불러오기
- 상담 저장 시 `Leads_상담`에 기록 누적
- 회원 요약은 `Members_회원`에 업데이트
- PAR-Q, 평가, OPT 프로그램, 세션 기록 탭 확장 준비

## 보안 주의

- `RP_API_SECRET`은 공개 저장소에 올리지 마세요.
- Apps Script URL은 프론트엔드에 직접 노출하지 말고 Next.js API Route에서만 사용하세요.
- 건강정보/민감정보가 들어가므로 시트 공유 권한은 최소화하세요.
