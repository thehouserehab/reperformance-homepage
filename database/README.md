# RP APP PostgreSQL migration design

이 폴더는 2차 구조를 실제 PostgreSQL로 내리기 위한 전방향 마이그레이션 설계입니다. 아직 어떤 Production 또는 로컬 DB에도 적용하지 않았습니다.

## 적용 순서

1. `0001_identity_and_relationships.sql`
2. `0002_student_workflows.sql`
3. `0003_messaging_ai_and_audit.sql`
4. `0004_authorization_rls.sql`

각 파일은 `BEGIN`과 `COMMIT` 사이에서 실행되며 순서를 바꾸면 안 됩니다.

## 역할 분리

- Migration role: 테이블·함수·정책 생성 전용
- Runtime role: 애플리케이션 쿼리 전용, 테이블 소유 금지
- Runtime role에 `BYPASSRLS`를 부여하지 않음
- 브라우저에서 DB에 직접 연결하지 않음

Runtime role의 정확한 `GRANT` 목록은 인증·DB 제공자를 확정한 뒤 별도 마이그레이션으로 추가합니다. 제공자 미확정 상태에서 광범위한 권한을 미리 부여하지 않습니다.

가입·초대·코치 승인처럼 계정과 관계를 만드는 작업은 일반 Runtime 권한에서 분리합니다. 인증 제공자가 정해지면 별도 Provisioning 역할 또는 검증된 서버 함수에 필요한 최소 권한만 부여합니다.

## 요청 컨텍스트

인증을 검증한 서버만 트랜잭션 로컬 사용자 ID를 설정합니다.

```sql
BEGIN;
SELECT set_config('rp.user_id', $1, true);
-- Run parameterized application queries in this transaction.
COMMIT;
```

연결 풀 누출을 막기 위해 세션 전역 `SET`을 사용하지 않습니다.

## 저장하지 않는 정보

- 비밀번호, OAuth 토큰, 복구 코드
- 계약서·결제 원본
- NORE 식별자와 동기화 상태
- 감사 로그의 성적·건강·메시지·프롬프트 원문
- AI 요청 테이블의 실제 프롬프트와 모델 응답

## 메시지 암호화

`rp_messages.body_ciphertext`는 애플리케이션 계층 암호화를 전제로 합니다. 암호화 키는 DB와 분리된 비밀 저장소에서 관리하고 키 버전을 행에 저장합니다. 키 관리 방식이 확정되기 전에는 실제 메시지 데이터를 마이그레이션하지 않습니다.

대화방은 `rp_create_conversation`으로 생성해 활성 관계를 검사하고, 메시지 저장 후에는 `rp_create_message_receipts` 트리거가 참여자별 읽음 상태를 생성합니다. 일반 클라이언트 입력만으로 참여자를 추가하지 않습니다.

## 롤백 원칙

Production에서는 이미 적용된 마이그레이션 파일을 수정하지 않습니다. 잘못된 변경은 새로운 보정 마이그레이션으로 처리합니다. 파괴적 롤백은 백업 복구와 보관 정책 검토 없이 실행하지 않습니다.

## 구조 검증

```powershell
npm.cmd run architecture:check
```

이 검증은 마이그레이션 순서, 필수 테이블, RLS, 민감 컬럼 금지, 문서와 라우트 존재를 확인합니다. 실제 PostgreSQL 구문 실행 검증은 로컬 테스트 DB가 준비된 뒤 별도 단계로 추가합니다.
