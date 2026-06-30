# RP service application setup

홈페이지의 `/apply` 페이지는 사용자가 서비스를 선택하고 PAR-Q 확인까지 완료하는 신청 흐름입니다.

## 저장 위치

신청이 완료되면 관리형 PostgreSQL DB에 두 가지로 저장됩니다.

- `rp_service_applications`: 신청 원본, 선택 서비스, PAR-Q 결과, 길이 제한을 적용한 신청 payload
- `rp_clients`: 고객관리 화면에서 바로 볼 수 있는 고객 데이터

`rp_service_applications` 테이블은 배포 후 첫 신청 또는 고객 API 호출 시 자동 생성됩니다.

## 필요한 환경 변수

Vercel Project Settings > Environment Variables에 DB 연결값이 필요합니다.

```txt
DATABASE_URL=postgresql://...
```

또는:

```txt
RP_DATABASE_URL=postgresql://...
```

DB가 설정되지 않은 상태에서 신청하면 `/apply?status=setup` 안내 화면으로 돌아갑니다.

## Google Drive/Sheets 백업

PostgreSQL 저장 후 Google Drive/Sheets Apps Script 백업을 시도할 수 있습니다.

- `RP_SHEETS_WEBAPP_URL`, `RP_SIGNUP_WEBAPP_URL`, `RP_AUTH_WEBAPP_URL` 중 하나가 있으면 기본적으로 백업을 시도합니다.
- `RP_GOOGLE_DRIVE_BACKUP_ENABLED=false`로 설정하면 DB 저장만 진행하고 백업은 건너뜁니다.
- `RP_API_SECRET`은 기본적으로 header와 POST body로 전달합니다.
- 기존 Apps Script가 URL query의 `secret`, `apiSecret`, `token`만 읽는 경우에만 `RP_BACKUP_SECRET_IN_QUERY=true`를 임시로 사용합니다.
- 공개 JSON 응답에는 신청 원본과 고객 전체 객체를 반환하지 않고 `applicationId`, `clientId`, 백업 상태만 반환합니다.

## PAR-Q 항목 기준

홈페이지 신청 폼은 서비스 신청과 PAR-Q 확인에 필요한 아래 항목 구조를 기준으로 구성했습니다.

- 이름 / 성함
- 연락처
- 생년월일
- 성별
- 목표 / 운동목표
- 방문목적
- 불편부위 / 통증부위
- 통증강도
- 주의사항 / 상담메모
- PAR-Q 예항목

PAR-Q 예항목이 하나라도 체크되면 고객관리에서는 `추가 확인 필요`로 표시됩니다.
