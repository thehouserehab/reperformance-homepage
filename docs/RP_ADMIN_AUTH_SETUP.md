# RePERFORMANCE 계정/권한 설정

RePERFORMANCE는 공개 로그인과 운영자 전용 접근을 분리합니다.

```txt
/login          = 회원, 트레이너, 관리자 공통 로그인
/signup         = 회원 자동가입 / 운영 계정 신청
/account        = 로그인한 계정의 마이페이지
/find-account   = 전화번호 인증 기반 아이디 찾기 / 비밀번호 재설정
/admin/login    = 운영자 전용 로그인
/admin          = 운영관리
/admin/clients  = 고객관리
/admin/consultation = 고객상담
/admin/security = 보안 이벤트 점검
```

`/admin`, `/admin/clients`, `/admin/consultation`, `/admin/security`, `/api/rp/clients`, `/api/rp/auth-accounts`, `/api/rp/security-events`는 로그인 세션과 역할 권한이 있어야 접근할 수 있습니다.

접근 가능한 운영 역할은 아래와 같습니다.

```txt
owner
admin
trainer
```

`member` 역할은 일반 회원 계정입니다. `/account`에는 접근할 수 있지만 관리자/고객관리/고객상담 페이지에는 접근할 수 없습니다.

## 가입 흐름

```txt
member  = 회원가입 즉시 활성화, 바로 로그인 가능
trainer = 가입 신청 저장, 승인 대기
admin   = 가입 신청 저장, 승인 대기
owner   = 자동가입 불가, 환경변수 또는 별도 관리자 등록 권장
```

회원 자동가입은 PostgreSQL을 우선 저장소로 사용하고, Google Sheets Apps Script는 백업 또는 전환 기간의 fallback 저장소로 사용할 수 있습니다. DB 없이 운영하려면 Google Sheets Apps Script에 계정 저장/조회 액션이 연결되어 있어야 합니다.

필요 액션 예시는 아래 문서에 있습니다.

```txt
docs/RP_APPS_SCRIPT_AUTH_ACCOUNTS.md
```

## Vercel 환경변수

Vercel 프로젝트 Settings → Environment Variables에서 아래 값을 Production, Preview에 등록합니다.

### 필수

```txt
RP_ADMIN_SESSION_SECRET=충분히 긴 임의 문자열
RP_API_SECRET=Apps Script API secret
RP_ACCOUNT_RECOVERY_SECRET=계정 찾기 인증 토큰 서명용 긴 임의 문자열
RP_IDENTITY_VERIFICATION_SECRET=회원가입 본인 인증 토큰 서명용 긴 임의 문자열
RP_SMS_WEBHOOK_URL=문자 인증번호 발송 웹훅 URL
```

예시:

```txt
RP_ADMIN_SESSION_SECRET=rp-admin-session-2026-change-this-long-random-value
RP_API_SECRET=rp-sheets-api-secret-change-this
```

### Google Sheets 계정 저장소

자동 회원가입과 Google Sheets 계정 로그인에는 아래 중 하나가 필요합니다.

```txt
RP_AUTH_WEBAPP_URL=Google Apps Script 웹 앱 URL
```

`RP_AUTH_WEBAPP_URL`이 없으면 기존 값을 순서대로 사용합니다.

```txt
RP_SIGNUP_WEBAPP_URL
RP_SHEETS_WEBAPP_URL
```

비밀번호 해시에는 아래 값을 사용할 수 있습니다.

```txt
RP_PASSWORD_HASH_SECRET=비밀번호 해시에 사용할 긴 임의 문자열
```

`RP_PASSWORD_HASH_SECRET`이 없으면 `RP_ADMIN_SESSION_SECRET`, 그다음 `RP_API_SECRET`을 사용합니다.

## 기존 환경변수 계정도 유지됩니다

Production에서는 환경변수 계정이 기본적으로 비활성화됩니다. `RP_ADMIN_USERNAME`, `RP_AUTH_USERS`, `RP_ADMIN_USERS`, `RP_TRAINER_USERS`를 임시 부트스트랩 계정으로 써야 할 때만 `RP_ALLOW_ENV_AUTH_ACCOUNTS=true`를 짧게 켜고, 이후 PostgreSQL 계정으로 전환한 뒤 다시 끕니다.

기존 관리자 계정 환경변수는 계속 사용할 수 있습니다.

```txt
RP_ADMIN_USERNAME=admin
RP_ADMIN_PASSWORD=비밀번호
RP_ADMIN_NAME=정우현
```

여러 계정을 역할과 함께 관리하려면 `RP_AUTH_USERS`를 사용할 수 있습니다.

```txt
RP_AUTH_USERS=[{"username":"owner","password":"비밀번호","name":"정우현","role":"owner"},{"username":"trainer1","password":"비밀번호","name":"트레이너","role":"trainer"},{"username":"member1","password":"비밀번호","name":"회원","role":"member"}]
```

관리자 여러 명은 기존처럼 `RP_ADMIN_USERS`로 등록할 수 있습니다.

```txt
RP_ADMIN_USERS=[{"username":"admin","password":"비밀번호","name":"정우현","role":"admin"}]
```

트레이너 계정만 따로 등록하고 싶다면 아래 방식도 가능합니다.

```txt
RP_TRAINER_USERS=[{"username":"trainer1","password":"비밀번호","name":"트레이너","role":"trainer"}]
```

또는 한 명만 간단히 등록할 수 있습니다.

```txt
RP_TRAINER_USERNAME=trainer1
RP_TRAINER_PASSWORD=비밀번호
RP_TRAINER_NAME=트레이너
```

## 역할별 접근 범위

```txt
owner   = 운영관리, 고객관리, 고객상담 접근 가능
admin   = 운영관리, 고객관리, 고객상담 접근 가능
trainer = 운영관리, 고객관리, 고객상담 접근 가능
member  = /account 접근 가능, 관리자 영역 접근 불가
```

`/admin/security`는 로그인, 계정 찾기, 회원가입, AI 승인 변경 같은 민감 이벤트를 점검하는 내부 화면입니다. 원본 전화번호, 이메일, IP는 표시하지 않고 해시 prefix와 부분 마스킹 IP 대역만 보여줍니다.

## 회원가입 / 계정 신청

공개 페이지:

```txt
/signup
```

가입 API:

```txt
/api/rp/signup
```

회원 가입 성공 시:

```txt
member → PostgreSQL 계정 저장 → Google Sheets 백업 시도 → 세션 발급 → /account 이동
```

트레이너/관리자 신청 성공 시:

```txt
trainer/admin → 승인 대기 기록 저장 → /signup?status=pending 이동
```

## 로그인 주소

공개 로그인:

```txt
https://reperformance.the-house-exercise.com/login
```

운영자 전용 로그인:

```txt
https://reperformance.the-house-exercise.com/admin/login
```

공개 로그인은 역할에 따라 자동으로 이동합니다.

```txt
owner/admin/trainer → /admin
member              → /account
```

## 주의

- 비밀번호는 코드나 GitHub에 넣지 말고 Vercel 환경변수 또는 Google Sheets 계정 저장소에만 등록합니다.
- Google Sheets 계정 저장소에는 평문 비밀번호 대신 `passwordHash`를 저장하는 방식을 권장합니다.
- `RP_ADMIN_SESSION_SECRET` 또는 `RP_PASSWORD_HASH_SECRET`을 바꾸면 기존 자동가입 회원의 비밀번호 해시가 달라질 수 있습니다.
- `RP_ADMIN_SESSION_SECRET`을 바꾸면 기존 로그인 세션은 모두 무효화됩니다.
- 트레이너/관리자 가입 신청은 자동 승인하지 않습니다. 승인 후 Apps Script 또는 환경변수 계정 목록에서 역할을 활성화해야 합니다.
- 실제 문자 인증번호 발송에는 `RP_SMS_WEBHOOK_URL` 연결이 필요합니다.
- 계정 찾기 문자 인증은 전화번호/IP 기준 요청 제한이 적용되어 있습니다. 운영 상태는 `/api/rp/system-status`의 `auth.accountRecovery`에서 확인합니다.
- 자동 비밀번호 재설정은 PostgreSQL 계정에서 지원됩니다. 환경변수 계정과 Google Sheets 계정은 운영자가 임시 비밀번호를 발급하거나 DB 계정으로 전환해야 합니다.
