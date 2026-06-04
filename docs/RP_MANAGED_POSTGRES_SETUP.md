# RePERFORMANCE 관리형 PostgreSQL 전환 가이드

이 문서는 Google Sheets 기반 고객/회원 데이터를 회사 자체 관리형 PostgreSQL 데이터베이스로 옮길 때 필요한 설정을 정리합니다.

## 동작 방식

현재 코드는 안전한 전환을 위해 아래 순서로 동작합니다.

1. `DATABASE_URL`, `POSTGRES_URL`, `RP_DATABASE_URL` 중 하나가 있으면 PostgreSQL을 먼저 사용합니다.
2. PostgreSQL 연결이 없거나, 전환 기간 중 DB에 데이터가 비어 있으면 기존 Google Sheets/Apps Script 경로를 계속 사용할 수 있습니다.
3. 완전히 DB만 사용하려면 `RP_DATA_SOURCE=database`를 추가합니다.

즉, 처음에는 기존 Google Sheets를 유지한 채 DB를 붙일 수 있고, 데이터 이전이 끝난 뒤 DB 전용으로 고정할 수 있습니다.

## Vercel 환경변수

Vercel 프로젝트의 Production 환경에 아래 값을 추가합니다.

| Key | Value |
| --- | --- |
| `DATABASE_URL` | 관리형 PostgreSQL에서 제공하는 연결 문자열 |
| `RP_DATA_SOURCE` | 선택값. DB만 사용하려면 `database` |
| `RP_PASSWORD_HASH_SECRET` | 회원 비밀번호 해시에 사용할 긴 랜덤 문자열 |
| `RP_ADMIN_SESSION_SECRET` | 로그인 세션 서명용 긴 랜덤 문자열 |

`DATABASE_URL` 대신 `POSTGRES_URL` 또는 `RP_DATABASE_URL`을 사용해도 됩니다.

## 자동 생성되는 테이블

앱이 처음 DB에 접근하면 아래 테이블이 자동으로 만들어집니다.

- `rp_auth_accounts`: 회원, 관리자, 트레이너 로그인 계정
- `rp_clients`: 고객/회원 목록
- `rp_consultations`: 상담 기록

별도로 SQL을 직접 실행하지 않아도 되지만, 운영 중에는 DB 백업 설정을 켜두는 것을 권장합니다.

## 전환 순서

1. Supabase, Neon, Vercel Postgres 같은 관리형 PostgreSQL 서비스를 생성합니다.
2. Vercel에 `DATABASE_URL`을 추가합니다.
3. 기존 Google Sheets 환경변수는 당분간 유지합니다.
4. 새 회원가입, 고객 직접 추가, 상담 저장이 DB에 기록되는지 확인합니다.
5. 기존 시트 데이터를 DB로 옮깁니다.
6. 이상이 없으면 `RP_DATA_SOURCE=database`를 추가해 DB 전용으로 전환합니다.

## 참고

- 일반 회원가입은 자동 승인되어 바로 로그인됩니다.
- 트레이너/관리자 가입은 `승인 대기` 상태로 저장됩니다.
- 기존 환경변수 관리자 계정은 계속 최우선으로 로그인됩니다.
- DB 전환 전까지 기존 Google Sheets 연결은 백업 경로로 남아 있습니다.
