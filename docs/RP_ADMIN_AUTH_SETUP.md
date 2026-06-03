# RePERFORMANCE 계정/권한 설정

RePERFORMANCE는 공개 로그인과 운영자 전용 접근을 분리합니다.

```txt
/login          = 회원, 트레이너, 관리자 공통 로그인
/signup         = 회원가입 / 계정 신청
/account        = 로그인한 계정의 마이페이지
/find-account   = 아이디 / 비밀번호 찾기 안내
/admin/login    = 운영자 전용 로그인
/admin          = 운영관리
/admin/clients  = 고객관리
/admin/consultation = 고객상담
```

`/admin`, `/admin/clients`, `/admin/consultation`, `/api/rp/clients`는 로그인 세션과 역할 권한이 있어야 접근할 수 있습니다.

접근 가능한 역할은 아래와 같습니다.

```txt
owner
admin
trainer
```

`member` 역할은 일반 회원 계정으로 등록할 수 있지만 관리자/고객관리/고객상담 페이지에는 접근할 수 없습니다.

## Vercel 환경변수

Vercel 프로젝트 Settings → Environment Variables에서 아래 값을 Production, Preview에 등록합니다.

### 필수

```txt
RP_ADMIN_SESSION_SECRET=충분히 긴 임의 문자열
```

예시:

```txt
RP_ADMIN_SESSION_SECRET=rp-admin-session-2026-change-this-long-random-value
```

## 권장 계정 설정

여러 계정을 역할과 함께 관리하려면 `RP_AUTH_USERS`를 사용합니다.

```txt
RP_AUTH_USERS=[{"username":"owner","password":"비밀번호","name":"정우현","role":"owner"},{"username":"trainer1","password":"비밀번호","name":"트레이너","role":"trainer"},{"username":"member1","password":"비밀번호","name":"회원","role":"member"}]
```

역할별 접근 범위:

```txt
owner   = 운영관리, 고객관리, 고객상담 접근 가능
admin   = 운영관리, 고객관리, 고객상담 접근 가능
trainer = 운영관리, 고객관리, 고객상담 접근 가능
member  = /account 접근 가능, 관리자 영역 접근 불가
```

## 기존 방식도 유지됩니다

기존 관리자 계정 환경변수는 계속 사용할 수 있습니다.

```txt
RP_ADMIN_USERNAME=admin
RP_ADMIN_PASSWORD=비밀번호
RP_ADMIN_NAME=정우현
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

## 회원가입 / 계정 신청

공개 페이지:

```txt
/signup
```

가입 신청 API:

```txt
/api/rp/signup
```

가입 신청 저장은 아래 환경변수를 사용합니다.

```txt
RP_SIGNUP_WEBAPP_URL=Google Apps Script 웹앱 URL
RP_SHEETS_WEBAPP_URL=기존 Google Apps Script 웹앱 URL
RP_API_SECRET=Apps Script API secret
```

`RP_SIGNUP_WEBAPP_URL`이 없으면 기존 `RP_SHEETS_WEBAPP_URL`을 사용합니다. Apps Script에 `saveSignupRequest` 액션이 있으면 그 액션으로 저장하고, 없으면 기존 `saveConsultation` 액션으로 가입 신청 기록을 남기도록 fallback합니다.

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

- 비밀번호는 코드나 GitHub에 넣지 말고 Vercel 환경변수에만 등록합니다.
- `RP_ADMIN_SESSION_SECRET`을 바꾸면 기존 로그인 세션은 모두 무효화됩니다.
- 계정 추가/삭제는 환경변수를 수정한 뒤 Vercel 재배포를 실행하면 됩니다.
- 가입 신청은 계정 생성을 자동 승인하지 않습니다. 신청 확인 후 `RP_AUTH_USERS`, `RP_ADMIN_USERS`, `RP_TRAINER_USERS` 중 하나에 계정을 등록해야 실제 로그인이 가능합니다.
- 카카오 로그인, 문자 인증, 자동 비밀번호 재설정은 별도 OAuth/SMS/Auth 서비스 연결이 필요합니다.
