# RePERFORMANCE 관리자 로그인 설정

이번 업데이트부터 `/admin`, `/admin/clients`, `/admin/consultation`, `/api/rp/clients`는 관리자 로그인 세션이 있어야 접근할 수 있습니다.

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

### 관리자 계정 목록

방법 1. 여러 계정 JSON 형식:

```txt
RP_ADMIN_USERS=[{"username":"admin","password":"비밀번호","name":"정우현"}]
```

방법 2. 한 계정만 간단히 등록:

```txt
RP_ADMIN_USERNAME=admin
RP_ADMIN_PASSWORD=비밀번호
RP_ADMIN_NAME=정우현
```

## 로그인 주소

```txt
https://reperformance.the-house-exercise.com/admin/login
```

로그인 후 아래 내부 페이지에 접근할 수 있습니다.

```txt
/admin
/admin/clients
/admin/consultation
```

## 주의

- 비밀번호는 코드나 GitHub에 넣지 말고 Vercel 환경변수에만 등록합니다.
- `RP_ADMIN_SESSION_SECRET`을 바꾸면 기존 로그인 세션은 모두 무효화됩니다.
- 계정 추가/삭제는 `RP_ADMIN_USERS` 값을 수정한 뒤 Vercel 재배포를 실행하면 됩니다.
