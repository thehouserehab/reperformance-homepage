# RePERFORMANCE 보안, 데이터, 확장 운영 대책

Last updated: 2026-07-10

이 문서는 홈페이지 고객 데이터, 회원가입/로그인, 체대입시 데이터 최신화, 트래픽 급증, 데이터 관리 급증에 대한 운영 대책을 정리합니다.

## 1. 고객 데이터 보안 강화

현재 기본 방향은 PostgreSQL을 1차 저장소로 두고, Google Drive/Sheets는 전환기 백업 경로로만 사용하는 것입니다.

- Production은 `DATABASE_URL` 또는 `RP_DATABASE_URL`과 `RP_DATA_SOURCE=database`를 기준으로 운영합니다.
- Google Drive/Sheets 백업은 `RP_GOOGLE_DRIVE_BACKUP_ENABLED=true`로 명시적으로 켠 기간에만 사용하고, `RP_BACKUP_SECRET_IN_QUERY=false`를 유지합니다.
- 신규 `rp_service_applications.payload`는 저장 시점부터 필수 메타데이터 중심으로 최소화하고, 기존 넓은 payload는 retention 감사/정리 대상으로 둡니다.
- 신규 `rp_pe_exam_ai_consults.payload`와 `conversation_record`는 저장 시점부터 최소 메타데이터 중심으로 저장하고, 기존 넓은 AI 상담 JSON 기록은 retention 감사/정리 대상으로 둡니다.
- 신규 `rp_pe_exam_questions.payload`는 저장 시점부터 최소 메타데이터 중심으로 저장하고, 기존 넓은 질문 JSON 기록은 retention 감사/정리 대상으로 둡니다.
- 관리자 고객 목록 조회는 기본 200명, 요청 최대 500명으로 제한하고 `limit`/`offset` 기반 페이지네이션 메타데이터를 반환합니다. 관리자 화면은 추가 페이지가 있을 때 더 불러오기 흐름을 사용하며, 대량 고객 데이터 운영 시 전체 테이블을 한 번에 내려받는 화면을 만들지 않습니다.
- 운영 계정은 `owner`, `admin`, `trainer`, `member` 역할을 분리하고, 고객관리/상담 API는 staff 권한에서만 접근합니다.
- 신규 고객 신청, 체대입시 AI 상담 준비, 계정 찾기 기록은 모두 길이 제한과 공개 응답 축소를 유지합니다.
- 정기 운영 작업: 월 1회 백업 접근자 점검, 분기 1회 오래된 상담 원본 payload 삭제 또는 익명화 정책 확정.

## 2. 회원가입 / 로그인 보안 강화

적용된 1차 방어는 PostgreSQL이 설정된 경우 `rp_rate_limit_buckets`를 사용하는 공유 rate limit입니다. DB가 없는 로컬/비상 상황에서는 인스턴스 메모리 제한으로 fallback하므로, 대규모 운영 전에는 production DB와 Vercel Firewall을 함께 확인합니다.

- `/api/auth/login`: 아이디 기준 15분 12회, IP 기준 15분 40회 제한.
- `/api/admin/login`: 아이디 기준 15분 10회, IP 기준 15분 30회 제한.
- `/api/auth/identity-verification`: 연락처 기준 인증번호 요청 15분 5회, IP 기준 15분 30회, 인증번호 확인은 토큰 기준 5분 8회 제한.
- `/api/rp/signup`: 아이디/연락처 기준 1시간 6회, IP 기준 1시간 30회 제한.
- `/api/rp/service-application`: 연락처 기준 1시간 8회, IP 기준 1시간 50회 제한.
- `/api/auth/account-recovery`: 전화번호 15분 5회, IP 15분 20회, 인증 확인 5분 8회 제한.
- 신규 회원가입과 비밀번호 재설정의 최소 비밀번호 길이는 8자입니다.
- 토큰을 사용하는 AI 기능은 별도 승인 플래그(`rp_auth_accounts.ai_approved`), 회원별 일일 한도(`rp_auth_accounts.ai_daily_limit`), 일일 사용량 버킷(`rp_ai_usage_buckets`)으로 제한합니다.
- 회원별 AI 일일 한도는 `/admin/clients`의 AI ACCESS CONTROL 패널에서 조정하고, `RP_AI_DAILY_LIMIT_MAX` 서버 상한을 넘길 수 없습니다.
- 일일 한도는 기능별이 아니라 계정별 하루 총량으로 먼저 차감합니다. 기능별 `route_key` 기록은 사용 분석용으로만 유지합니다.
- 회원은 홈페이지와 일반 로그인은 이용할 수 있지만, AI 서비스는 관리자 승인 후에만 이용할 수 있습니다.
- 로그인, 계정 찾기, 회원가입, AI 승인 변경 이벤트는 `rp_security_events`에 해시 기반으로 기록하고 `/admin/security`에서 원문 개인정보 없이 최근 패턴을 점검합니다.
- 전역 보안 헤더: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.

운영 전 필수값:

```txt
RP_ADMIN_SESSION_SECRET=긴 랜덤 문자열
RP_PASSWORD_HASH_SECRET=긴 랜덤 문자열
RP_IDENTITY_VERIFICATION_SECRET=긴 랜덤 문자열
RP_ACCOUNT_RECOVERY_SECRET=긴 랜덤 문자열
```

## 3. 입시 데이터 최신화 단순화

입시 데이터 갱신은 스크립트를 단일 명령으로 묶어 운영자가 매번 순서를 기억하지 않도록 합니다.

```powershell
npm run pe-exam:data:readiness
npm run pe-exam:data:refresh
```

이 명령은 KUSF 수시 요약, KUSF 상세, ADIGA 정시 전형, ADIGA 입결 데이터를 순서대로 갱신한 뒤 freshness gate와 대학 누락 감사를 함께 실행합니다. 원천 fetch 없이 현재 snapshot만 빠르게 검증할 때는 `npm run pe-exam:data:verify`를 사용합니다.

운영 기준:

- `npm run pe-exam:data:refresh` 결과에서 생성일, 원천 학년도, 최소 데이터량, 신규 누락 대학 여부를 한 번에 확인합니다.
- 배포 직전 snapshot 검증만 필요하면 `npm run pe-exam:data:verify`로 freshness와 coverage를 재확인합니다.
- source snapshot이 바뀐 뒤에는 `npm run pe-exam:data:status`로 `/api/rp/system-status`의 `peExamData` 요약을 갱신하고, 배포 후 staff session으로 `peExamData.ok=true`를 확인합니다.
- `.github/workflows/pe-exam-data-maintenance.yml`은 매월 원천 갱신과 검증을 실행하고, 변경된 생성 데이터만 검토용 PR로 올립니다. 자동 병합·자동 배포는 하지 않으며 운영자가 원천 연도, 행 수 변화, 대학 추가·삭제를 확인한 뒤 병합합니다.
- `npm run build`로 현재 데이터에 대응하는 모든 정적 체대입시 상세 페이지가 오류 없이 생성되는지 확인합니다.
- 공식 원천에 없는 등급컷/기록 기준은 임의 작성하지 않고 “공식 모집요강 확인”으로 표시합니다.
- 수동 보강 대학은 `peExamData.ts`에 검색어, 코드, 학과, 공식 확인 문구를 함께 남깁니다.
- 연 1회 정기 갱신, 대입 모집요강 변경 시 수시 갱신을 운영 루틴으로 둡니다.

## 4. 트래픽 급증 대비

현재 체대입시 대학 상세 페이지는 SSG로 생성되어 정적 트래픽에 강합니다. 급증 시 취약한 곳은 공개 POST API와 DB 연결입니다.

- 공개 정적 페이지: Vercel CDN 캐시와 SSG를 유지합니다.
- 공개 POST API: 상담 신청, 회원가입, 인증번호 발송에 rate limit을 적용합니다.
- 토큰 사용 API: 체대입시 AI 상담, 상담 요약은 승인/권한과 일일 사용량 제한을 함께 적용합니다.
- DB 연결: `RP_DATABASE_POOL_MAX` 기본 5를 유지하고, 관리형 PostgreSQL 커넥션 제한에 맞춰 조정합니다.
- 봇/스팸 급증: Vercel Firewall에서 `/api/auth/*`, `/api/rp/signup`, `/api/rp/service-application`에 IP/ASN/국가/속도 제한 규칙을 추가합니다.
- 장애 대응: 신청 저장소 장애 시 공개 응답은 setup/error 상태만 노출하고 민감 payload를 반환하지 않습니다.
- 모니터링: Vercel 배포 로그, API 429/5xx 비율, DB connection timeout, Apps Script backup 실패율을 확인합니다.

## 5. 데이터 관리 급증 대비

사용자와 상담 신청이 늘면 “저장”보다 “검색, 중복 정리, 보존 기간, 권한”이 병목이 됩니다.

- `rp_clients`, `rp_service_applications`, `rp_pe_exam_ai_consults`는 생성일/사용자/고객 ID 인덱스를 유지합니다.
- `rp_service_applications`, `rp_pe_exam_ai_consults`, `rp_pe_exam_questions`의 broad payload retention 정리는 partial index로 미정리 대상만 빠르게 찾도록 유지합니다.
- `rp_clients` 목록 API는 `LIMIT/OFFSET`을 사용해 조회하고, 필요 시 다음 페이지를 요청하는 방식으로 확장합니다.
- 고객 중복은 이름+전화번호 기준으로 상담 화면에서 병합 후보를 확인하는 운영 흐름을 둡니다.
- Google Drive/Sheets 백업은 운영자가 직접 다루기 쉬운 장점이 있지만, 장기 보관 원본 저장소로 쓰지 않습니다.
- 상담 원본 payload, PAR-Q 메모, 체대입시 상담 준비 기록은 보존 기간을 정하고 만료 후 삭제/익명화합니다.
- 관리자/트레이너 계정은 최소 권한 원칙을 적용하고, 퇴사/역할 변경 시 즉시 계정 비활성화합니다.

## 검증 체크리스트

- `npm run build`
- `npm run ops:release:check` confirms the local release commit is clean on `main` and synchronized with upstream before deployment.
- `npm run ops:sensitive:check` confirms public API errors, account-recovery logs, security-event metadata, and retention coverage do not expose unnecessary sensitive data.
- `npm run ops:audit` confirms production signing and password secrets are strength-gated in code and documented in `docs/RP_PRODUCTION_SECRET_POLICY.md`.
- `npm run ops:audit` confirms production environment-variable auth accounts require explicit `RP_ALLOW_ENV_AUTH_ACCOUNTS=true` opt-in.
- `npm run ops:audit` confirms signup verified contacts are limited to one account through app precheck, migration, and database check coverage.
- `npm run ops:audit` also confirms public-facing API catch responses use sanitized fallback messages instead of raw database, secret, webhook, Apps Script, or OpenAI errors.
- `npm run ops:audit` also confirms server-side outbound calls use `fetchWithTimeout`; default `RP_OUTBOUND_FETCH_TIMEOUT_MS=10000`, Google/Auth/Webhook defaults `8000`, and OpenAI defaults to `25000`.
- `npm run pe-exam:data:readiness` reports PE exam source years, generated dates, row counts, status-summary sync, and next commands before admission-season deploys.
- `/api/rp/system-status` reports login session TTL policy fields. Keep the default 14-day TTL when possible, treat more than 30 days as a warning, and treat more than 90 days as a production blocker through `auth.session.withinBlockingMax`.
- `git diff --check`
- `/api/rp/system-status`에서 DB, 인증 웹훅, 세션 설정 확인
- 로그인 실패 반복 시 429 응답 또는 제한 안내 확인
- 인증번호 반복 요청 시 429 응답 확인
- 상담 신청 반복 제출 시 429 응답 또는 `rate-limited` 상태 확인
- `npm run pe-exam:data:verify`로 대학 누락, 원천 학년도, 생성일, 최소 데이터량 확인
