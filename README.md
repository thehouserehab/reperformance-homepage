# RP APP

체대입시 학생이 공부, 운동, 회복과 상담을 한 흐름에서 관리하도록 돕는 역할 기반 PWA입니다.

## 현재 단계

현재 코드는 **2차 역할·정보구조 위에 PostgreSQL 마이그레이션과 활성 관계 기반 권한 계약을 추가한 단계**입니다.

- 학생 Today와 컨디션 체크
- 공부 타이머
- 모바일 주간·월간 전환과 오늘 할 일 우선순위를 반영한 앱 캘린더
- 확인형 일정 도우미
- 학생 선택형 학부모 공개 권한
- 학부모 문의 메시지
- 강사 우선 확인 화면
- 학생-코치 직접 대화
- 모바일 첫 화면에 맞춘 메신저형 학생-코치 대화 UI
- 사용자가 검토하고 직접 보내는 선택형 AI 문장 정리
- 학생·코치·학부모·관리자 역할별 핵심 내비게이션
- 학생 기록·상담, 코치 기록 검토, 학부모 공개 요약, 관리자 운영 화면 뼈대
- 25개 핵심 테이블의 PostgreSQL 전방향 마이그레이션 설계
- 학생 본인·담당 코치·선택 공개 학부모·관리자 범위를 구분한 RLS
- 대화 참여자 검사와 AI 승인·일일 한도의 원자적 예약 함수
- 브라우저 로컬 저장
- 설치형 PWA 기반
- 올리브 기를 더한 포레스트·세이지 그린과 웜 아이보리·살구 오렌지 브랜드 팔레트

실제 로그인, PostgreSQL, 실시간 메시지 서버, OpenAI API, 파일 저장소, 푸시 알림은 아직 연결하지 않았습니다. SQL 파일은 설계 산출물이며 어떤 DB에도 적용하지 않았습니다. 역할 전환 메뉴는 개발 미리보기용이며 실제 인증이나 접근 통제를 대신하지 않습니다.

## 실행

```powershell
npm.cmd install
npm.cmd run dev
```

기본 주소는 `http://localhost:3000`이며 학생 화면인 `/student`로 이동합니다.

## 검증

```powershell
npm.cmd run typecheck
npm.cmd run architecture:check
npm.cmd run authorization:check
npm.cmd run build
npm.cmd audit --audit-level=high
```

Windows에서 Word 보고서를 페이지 이미지로 검수할 때는 설치된 LibreOffice와 번들 Python을 사용합니다.

```powershell
& 'C:\Users\정우현\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  scripts\render-docx-windows.py `
  'C:\path\to\report.docx' `
  --output-dir 'C:\path\to\rendered-pages' `
  --keep-pdf
```

## 주요 경로

| 경로 | 역할 |
|---|---|
| `/student` | 학생 Today·컨디션·과제·공부 타이머 |
| `/student/messages` | 학생이 코치에게 직접 메시지 또는 검토형 AI 초안을 보내는 화면 |
| `/student/records` | 학업·실기·컨디션 최근 기록 |
| `/student/consultation` | 입시·운동·식단·멘탈·자세분석 상담 진입 |
| `/student/privacy` | 학부모 공개 정보 선택 |
| `/calendar` | 오늘 할 일·일정 도우미·주간/월간 앱 캘린더 |
| `/guardian` | 학부모 코치 문의 |
| `/guardian/summary` | 학생이 공개한 항목의 조건부 요약 |
| `/coach` | 강사 우선 확인 화면 |
| `/coach/messages` | 강사가 학생 메시지를 확인하고 답장하는 화면 |
| `/coach/records` | 담당 학생 기록 검토 |
| `/coach/calendar` | 코치 역할의 일정 화면 |
| `/admin` | 운영 예외 요약 |
| `/admin/relations` | 역할·학생 관계 관리 구조 |
| `/admin/ai` | AI 승인·일일 한도 관리 구조 |
| `/admin/audit` | 동의·권한·보안 감사 구조 |

## 2차 구조 문서

- `docs/ROLE_PERMISSION_MATRIX.md`: 역할별 조회·수정·승인 경계
- `docs/INFORMATION_ARCHITECTURE.md`: 역할별 내비게이션과 사이트맵
- `docs/DATA_MODEL.md`: PostgreSQL 적용 전 핵심 ERD와 상태 모델
- `docs/CORE_WORKFLOWS.md`: 가입, 기록, 대화, 공개, 일정, AI 흐름
- `docs/AUTHORIZATION_DESIGN.md`: 인증 이후 서버·RLS 이중 권한 검사
- `database/migrations`: 계정·기록·대화·AI·감사·RLS 전방향 SQL
- `database/README.md`: DB 역할 분리, 요청 컨텍스트, 적용·롤백 원칙

## 데이터와 보안 경계

- 현재 프로토타입 데이터는 브라우저 `localStorage`에만 저장합니다.
- 학생-코치 대화도 같은 브라우저 안에서만 공유되며, 서로 다른 기기나 계정에는 전달되지 않습니다.
- 실제 학생 정보, 건강 정보, 성적, 계약·결제 정보는 입력하지 않습니다.
- Production 전 서버 기반 인증·RBAC·PostgreSQL·감사 로그가 반드시 필요합니다.
- 학부모 기본 권한은 문의 메시지이며, 출결·계약/결제·학업·실기는 학생이 항목별로 공개한 경우에만 표시합니다.
- 학생과 코치의 전체 대화, 멘탈 기록 원문, 민감한 건강·상담 메모, AI 질문 원문은 학부모에게 공개하지 않습니다.
- NORE API, webhook, 자동 데이터 전송은 추가하지 않습니다.

## 일정 도우미 원칙

현재 일정 도우미는 비용 없는 규칙 기반 해석기로 날짜, 시간, 제목과 분류를 정리합니다. 일정은 사용자가 초안을 확인한 뒤에만 저장됩니다. 향후 OpenAI API로 교체하더라도 같은 확인 단계를 유지하고, 로그인·승인·일일 사용량 제한을 먼저 적용합니다.

## 학생-코치 대화 원칙

- 직접 작성이 기본이며 AI 도움은 사용자가 선택합니다.
- 현재 AI 도움은 외부 모델을 호출하지 않는 비용 없는 규칙 기반 문장 정리입니다.
- AI는 초안만 만들고 자동 발송하지 않습니다. 사용자가 내용을 확인한 뒤 직접 보내야 합니다.
- 대화 전용 화면은 날짜 구분, 발신자별 말풍선, 외부 시간 표시와 한 줄 작성창을 사용합니다.
- 학부모는 학생-코치 대화를 자동으로 볼 수 없습니다.
- Production에서는 인증, 학생-코치 관계 권한, PostgreSQL 저장, 실시간 동기화, 읽음 상태와 알림이 먼저 필요합니다.

## 다음 개발 단계

1. 인증 제공자·미성년자 본인 확인·법정대리인 예외 확정
2. 격리된 테스트 PostgreSQL에서 4개 마이그레이션 실제 실행 검증
3. Migration/Runtime DB 역할과 최소 `GRANT` 보정 마이그레이션
4. 서버 인증 어댑터와 트랜잭션 `rp.user_id` 컨텍스트 구현
5. Today·타이머·캘린더·기록·대화 서버 저장
6. 관리자 승인형 AI와 제한 베타
