# RP 상담모드 v2.1 - Google Sheets Live Patch

## 목적
기존 상담모드가 `SAMPLE_CLIENTS` 2명만 보여주던 문제를 수정합니다.
이 패치는 `/admin/consultation` 화면이 Google Sheets의 `Members_회원` 탭에서 회원 목록을 실시간으로 불러오도록 바꿉니다.

## 교체/추가 파일
아래 파일을 기존 `reperformance-homepage-v6` 프로젝트에 복사하세요.

```txt
components/rp-consultation/RPConsultationMode.jsx
components/rp-consultation/RPConsultationMode.module.css
components/rp-consultation/rpSheetsClient.js
app/api/rp/clients/route.js
google-apps-script/Code.gs
```

이미 같은 파일이 있으면 덮어쓰기합니다.

## 중요
`pages/admin/consultation.jsx` 파일은 삭제 상태를 유지하세요.
App Router의 `app/admin/consultation/page.jsx`만 사용해야 합니다.

## Apps Script 업데이트
1. Google Sheets → 확장 프로그램 → Apps Script
2. 기존 Code.gs 전체를 이 ZIP의 `google-apps-script/Code.gs` 내용으로 교체
3. `DEFAULT_SECRET` 값이 기존에 Vercel에 넣은 `RP_API_SECRET`과 같은지 확인
4. 저장
5. `setRpApiSecretOnce()` 다시 실행
6. 배포 → 배포 관리 → 기존 웹 앱 선택 → 새 버전 배포
7. Web App URL이 바뀌면 Vercel의 `RP_SHEETS_WEBAPP_URL`도 업데이트

## Vercel 확인
환경변수 2개가 필요합니다.

```txt
RP_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/....../exec
RP_API_SECRET=Apps Script DEFAULT_SECRET과 동일한 값
```

환경변수 변경 후 Redeploy 하세요.

## 정상 작동 확인
`/admin/consultation` 접속 후 상단 문구가 아래처럼 보여야 합니다.

```txt
Google Sheets 연결 성공 · 3명 불러옴
```

고객 선택 목록에는 `Members_회원` 탭의 회원들이 보여야 합니다.

## 저장 확인
상담 저장을 누르면 Google Sheets의 `Leads_상담` 탭에 상담 기록이 추가됩니다.
또한 `Members_회원` 탭의 일부 요약 정보가 업데이트됩니다.

## 실패 시 확인
- 아직 2명만 보이면 `RPConsultationMode.jsx`가 덮어쓰기되지 않은 것입니다.
- 고객 목록을 불러오지 못했다는 화면이 뜨면 Vercel 환경변수 또는 Apps Script Web App 배포를 확인하세요.
- 기존 회원 이름이 비어 보이면 Apps Script `Code.gs` 최신 버전이 반영되지 않은 것입니다. v2.1은 기존 `회원명` 헤더를 읽도록 수정되어 있습니다.
