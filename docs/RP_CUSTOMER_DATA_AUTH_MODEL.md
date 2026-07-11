# RePERFORMANCE 고객 데이터와 계정 운영 모델

이 문서는 현재 홈페이지에서 고객관리 데이터, 로그인, 회원가입, 계정 찾기가 어떤 저장소와 절차로 관리되는지 한곳에 정리합니다.

## 1. 고객관리 데이터 저장 방식

현재 운영 기준은 PostgreSQL을 메인 저장소로 사용하고, Google Drive/Sheets Apps Script를 보조 백업 저장소로 사용하는 구조입니다.

### 저장 우선순위

1. `DATABASE_URL`, `POSTGRES_URL`, `RP_DATABASE_URL` 중 하나가 있으면 PostgreSQL을 우선 사용합니다.
2. 고객 직접 추가와 상담 저장은 PostgreSQL 저장 후 Google Drive/Sheets 백업을 시도합니다.
3. PostgreSQL 연결이 없거나 전환 중 fallback이 허용된 상태에서는 기존 Google Drive/Sheets 경로를 사용할 수 있습니다.
4. `RP_DATA_SOURCE=database`를 설정하면 DB 전용 모드가 되어 DB 오류 시 Google Drive/Sheets fallback을 사용하지 않습니다.

### 주요 PostgreSQL 테이블

- `rp_clients`: 고객/회원 기본 정보
- `rp_consultations`: 상담 기록
- `rp_service_applications`: 공개 상담 신청 원본과 PAR-Q 결과
- `rp_auth_accounts`: 회원, 트레이너, 관리자 로그인 계정
- `rp_pe_exam_questions`: 체대입시 질문 기록
- `rp_pe_exam_ai_consults`: 체대입시 AI 상담 기록

### 상담 화면에서 보는 데이터

DB와 백업 저장소에는 원본 데이터가 쌓이고, 실제 상담자가 보는 화면에서는 `회원 요약`으로 다시 정리합니다.

- 연락처
- 회원 정보
- 유입 경로
- 담당/회차
- 기존 목표
- 방문 목적
- 불편 부위
- 주의 정보와 통증 점수

즉 저장소는 기록 보관과 복구를 담당하고, 상담 화면은 한 회원을 빠르게 이해할 수 있는 운영용 요약 화면 역할을 합니다.

## 2. 로그인과 권한 관리

로그인은 `rp_admin_session` httpOnly cookie 세션으로 유지됩니다.

### 계정 조회 순서

Production에서는 `RP_ALLOW_ENV_AUTH_ACCOUNTS=true`를 명시적으로 설정한 경우에만 환경변수 계정을 로그인 후보로 사용합니다. 이 값은 초기 부트스트랩이나 비상 접근 때만 짧게 켜고, 일반 운영 계정은 PostgreSQL `rp_auth_accounts`에서 관리합니다.

1. 환경변수 계정: `RP_AUTH_USERS`, `RP_ADMIN_USERS`, `RP_ADMIN_USERNAME` 등
2. PostgreSQL 계정: `rp_auth_accounts`
3. Google Drive/Sheets 계정: `RP_AUTH_WEBAPP_URL`, `RP_SIGNUP_WEBAPP_URL`, `RP_SHEETS_WEBAPP_URL`

환경변수 계정은 비상용 또는 초기 관리자 계정에 가깝고, 일반 운영 계정은 PostgreSQL 계정으로 관리하는 것이 기본 방향입니다.

### 역할별 접근

- `member`: 일반 회원. `/account` 접근 가능, 관리자/고객관리/상담 화면 접근 불가
- `trainer`: 고객관리와 상담 화면 접근 가능
- `admin`: 운영관리, 고객관리, 상담 화면 접근 가능
- `owner`: 최고 운영 권한

`/admin/login`은 `owner`, `admin`, `trainer`만 통과합니다. 일반 `/login`은 회원도 로그인할 수 있고 역할에 따라 이동 위치가 달라집니다.

### 로그인 유지 시간

기본 세션 유지 기간은 14일입니다. 환경변수로 조정할 수 있지만 앱은 최소 1일 이상을 보장합니다.

- `RP_SESSION_TTL_DAYS`
- `RP_SESSION_TTL_SECONDS`

운영 권장값은 기본 14일 유지입니다. 장기 세션이 필요한 경우에도 30일을 넘기면 `/api/rp/system-status`에서 경고로 보고하고, 90일을 넘기면 `auth.session.withinBlockingMax=false`로 캠페인/운영 준비 상태를 차단합니다.

### 세션 재검증과 전체 종료

PostgreSQL 로그인 쿠키에는 `authSource=database`와 계정의 `sessionVersion`이 서명되어 들어갑니다. 미들웨어는 빠른 1차 서명·역할 검사만 수행하고, 고객·계정·보안 데이터 API와 관리자/회원 서버 페이지는 `verifyActiveSessionCookie`로 현재 DB 계정을 다시 확인합니다.

- 계정이 비활성·미승인 상태가 되거나 쿠키와 DB의 `session_version`이 다르면 접근을 거부합니다.
- 비밀번호 재설정과 `/admin/clients`의 `모든 로그인 세션 종료`는 `session_version`을 증가시켜 해당 계정의 기존 기기 쿠키를 모두 무효화합니다.
- `owner`는 모든 계정의 세션을 종료할 수 있습니다. `admin`은 대표(`owner`) 계정을 제외한 계정만 종료할 수 있고, `trainer`와 `member`는 이 기능을 사용할 수 없습니다.
- 본인 세션을 종료한 경우 현재 브라우저 쿠키도 지우고 관리자 로그인 화면으로 이동합니다.
- 인증 저장소 출처가 없는 구형 쿠키는 production에서 재검증할 수 없으므로 거부합니다. 사용자는 정상 로그인으로 새 버전 쿠키를 발급받아야 합니다.
- 운영 전에 `database/migrations/20260711_auth_session_revocation.sql`을 적용하고 `/api/rp/system-status`에서 `storage.postgres.schema.authSessionRevocationReady=true`를 확인합니다.

### 로그인 요청 제한

로그인 남용을 줄이기 위해 PostgreSQL이 설정된 운영 환경에서는 `rp_rate_limit_buckets` 기반 shared rate limit이 적용됩니다. DB가 없는 로컬/비상 환경에서는 인스턴스 메모리 제한으로 fallback합니다.

- 일반 로그인: 아이디 기준 15분 12회, IP 기준 15분 40회
- 관리자 로그인: 아이디 기준 15분 10회, IP 기준 15분 30회

대규모 이벤트 전에는 shared DB rate limit에 더해 Vercel Firewall 같은 edge 계층 제한을 함께 켭니다.

### 계정 단위 로그인 잠금

PostgreSQL 계정은 반복된 비밀번호 실패를 `failed_login_count`, `failed_login_window_started_at`, `locked_until`으로 추적합니다.

- 기본 정책은 15분 안에 비밀번호 실패 8회가 발생하면 해당 계정을 15분 동안 임시 잠금 처리합니다.
- 공개 로그인 응답은 계속 일반 오류로 유지하므로 아이디 존재 여부나 잠금 여부를 노출하지 않습니다.
- 정상 로그인 또는 비밀번호 재설정이 성공하면 실패 횟수와 잠금 상태를 초기화합니다.
- `RP_AUTH_LOCKOUT_FAILURE_LIMIT`, `RP_AUTH_LOCKOUT_WINDOW_SECONDS`, `RP_AUTH_LOCKOUT_SECONDS`로 정책을 조정할 수 있습니다. `RP_AUTH_LOCKOUT_ENABLED=false`는 명확한 비상 롤백 상황에서만 사용합니다.
- 운영에서 사용하기 전 `database/migrations/20260710_auth_account_lockout.sql`을 적용합니다.

### AI 서비스 이용 제한

회원 계정은 홈페이지와 일반 자료를 이용할 수 있지만, 토큰을 사용하는 AI 서비스는 관리자 승인 후에만 이용할 수 있습니다.

- 승인 플래그: `rp_auth_accounts.ai_approved`
- 회원별 일일 한도: `rp_auth_accounts.ai_daily_limit` (`NULL`이면 역할 기본값 사용)
- 일일 사용량 버킷: `rp_ai_usage_buckets` (`route_key='__all__'` 행이 하루 전체 한도를 차감하고, 기능별 `route_key` 행은 분석용으로 남깁니다)
- 관리자 위치: `/admin/clients`의 ACCOUNT ACCESS CONTROL 패널
- 서버 상한: `RP_AI_DAILY_LIMIT_MAX`로 한 계정의 명시 한도 최대값을 제한합니다. 기본값은 50회입니다.

## 3. 회원가입 방식

회원가입은 절차를 짧게 유지하기 위해 전화번호, 이메일, 카카오톡 중 하나를 선택해 본인 인증을 완료하면 바로 `member` 계정으로 생성됩니다.

### 인증 수단

- 전화번호: `RP_SMS_WEBHOOK_URL`
- 이메일: `RP_EMAIL_WEBHOOK_URL`
- 카카오톡: `RP_KAKAO_WEBHOOK_URL`

각 웹훅은 인증번호 발송을 담당합니다. 앱은 인증번호 토큰 생성, 검증, 회원 계정 생성을 담당합니다.

인증번호 요청은 연락처 기준 15분 5회, IP 기준 15분 30회로 제한합니다. 인증번호 확인은 5분 8회로 제한합니다. 신규 비밀번호 기준은 8자 이상입니다.

### 권한 부여 원칙

공개 회원가입에서는 항상 `member`로 생성됩니다. `trainer`, `admin`, `owner` 권한은 운영자가 확인한 뒤 별도로 부여합니다.

## 4. 아이디와 비밀번호 찾기

`/find-account`에서 전화번호 인증 기반 아이디 찾기와 비밀번호 재설정을 제공합니다.

1. 사용자가 가입할 때 저장한 이름과 전화번호를 입력합니다.
2. `RP_SMS_WEBHOOK_URL` 문자 발송 웹훅으로 6자리 인증번호를 받습니다.
3. 인증번호가 맞으면 아이디 찾기는 아이디를 바로 표시합니다.
4. 비밀번호 재설정은 PostgreSQL 계정이면 새 비밀번호로 즉시 변경합니다.

비밀번호는 보안상 화면에 그대로 보여주지 않고, 인증 후 새 비밀번호로 재설정합니다. 환경변수 계정이나 Google Drive/Sheets 계정은 자동 비밀번호 변경을 지원하지 않으므로, 운영자가 임시 비밀번호를 발급하거나 PostgreSQL 계정으로 전환하는 방식이 필요합니다.

문자 발송 남용을 줄이기 위해 계정 찾기 인증번호 요청은 전화번호 기준 15분 5회, IP 기준 15분 20회로 제한합니다. 인증번호 확인은 같은 토큰/IP 기준 5분 8회까지 허용합니다.

### 계정복구 응답 노출 정책

`/api/auth/account-recovery`는 이름과 전화번호 조합이 실제 계정과 일치하지 않아도 공개 응답에서 계정 존재 여부를 직접 알려주지 않습니다.

- 공개 응답은 "일치하는 계정이 있으면 인증번호를 발송"하는 일반 안내로 통일합니다.
- 실제 계정이 없으면 발송하지 않은 decoy `verificationToken`을 발급해 응답 모양을 맞추고, 인증 단계에서는 항상 실패 처리합니다.
- 내부 보안 이벤트에는 `auth.account_recovery.request_code`와 `account_not_found` 사유를 남겨 운영자가 반복 시도를 검토할 수 있게 합니다.
- 전화번호/IP 기준 요청 제한과 인증 시도 제한은 기존 shared rate limit을 그대로 적용합니다.

## 5. 운영 필수 환경변수

최소 운영 구성은 아래 키들을 기준으로 확인합니다.

```txt
DATABASE_URL=postgresql://...
RP_DATA_SOURCE=database
RP_ADMIN_SESSION_SECRET=긴 랜덤 문자열
RP_PASSWORD_HASH_SECRET=긴 랜덤 문자열
RP_IDENTITY_VERIFICATION_SECRET=긴 랜덤 문자열
RP_ACCOUNT_RECOVERY_SECRET=긴 랜덤 문자열
RP_ALLOW_ENV_AUTH_ACCOUNTS=false
RP_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/.../exec
RP_AUTH_WEBAPP_URL=https://script.google.com/macros/s/.../exec
RP_API_SECRET=Apps Script 검증용 secret
RP_GOOGLE_DRIVE_BACKUP_ENABLED=false
RP_BACKUP_SECRET_IN_QUERY=false
RP_SMS_WEBHOOK_URL=https://...
RP_EMAIL_WEBHOOK_URL=https://...
RP_KAKAO_WEBHOOK_URL=https://...
```

`POSTGRES_URL` 또는 `RP_DATABASE_URL`을 `DATABASE_URL` 대신 사용할 수 있습니다.

## 6. 운영 점검 체크리스트

- 관리자 또는 트레이너로 로그인한 뒤 `/api/rp/system-status`에서 PostgreSQL, Google Drive/Sheets 백업, 인증번호 발송 웹훅, 세션 설정이 `configured: true`인지 확인합니다.
- 신규 상담 신청이 `rp_service_applications`와 `rp_clients`에 저장되는지 확인합니다.
- 고객 직접 추가가 PostgreSQL에 저장되고 Google Drive/Sheets 백업 결과가 반환되는지 확인합니다.
- 상담 저장이 `rp_consultations`에 기록되는지 확인합니다.
- `/signup`에서 전화번호, 이메일, 카카오톡 중 하나로 인증 후 `member` 계정이 생성되는지 확인합니다.
- `/admin/login`에서 `member` 계정이 차단되고 `trainer`, `admin`, `owner` 계정만 통과하는지 확인합니다.
- `/find-account`에서 아이디 찾기와 PostgreSQL 계정 비밀번호 재설정이 작동하는지 확인합니다.

## Signup Verified Contact Policy

One verified contact can create only one account. If the same phone, email, or Kakao contact is already registered, signup is rejected and the user should use account recovery.
