# Google Drive/Sheets 백업과 fallback

## 역할

PostgreSQL이 고객·계정·상담 데이터의 기본 저장소입니다. Google Drive/Sheets Apps Script는 다음 두 경우에만 사용합니다.

1. 운영자가 승인한 제한적 백업
2. PostgreSQL 전환 기간의 임시 fallback

신규 환경에서는 Sheets를 기본 고객 데이터베이스로 구성하지 않습니다.

## 관련 환경변수

```text
RP_SHEETS_WEBAPP_URL=
RP_AUTH_WEBAPP_URL=
RP_SIGNUP_WEBAPP_URL=
RP_API_SECRET=
RP_GOOGLE_DRIVE_BACKUP_ENABLED=false
RP_SERVICE_APPLICATION_BACKUP_ENABLED=false
RP_BACKUP_SECRET_IN_QUERY=false
```

URL만 설정해도 백업이 자동으로 켜지지 않도록 `RP_GOOGLE_DRIVE_BACKUP_ENABLED=true`를 별도로 지정해야 합니다. 쿼리 문자열에 비밀값을 넣는 레거시 호환 모드는 기본적으로 끕니다.

## 코드 경계

- 선택적 Apps Script 소스: `integrations/google-apps-script/Code.gs`
- 브라우저 API 클라이언트: `components/rp-consultation/rpClientApi.js`
- 고객 API와 fallback: `app/api/rp/clients/route.js`
- 최소화된 백업 전송: `lib/rpGoogleDriveBackup.js`
- 선택적 Sheets 계정 조회: `lib/rpSheetAuthStore.js`

브라우저에서 Apps Script URL이나 비밀값을 직접 사용하지 않습니다. 모든 요청은 RePERFORMANCE 서버 API를 거치며, PostgreSQL 저장 후 백업을 시도합니다.

## 운영 조건

- Sheets 접근 권한은 필요한 운영자에게만 부여합니다.
- 백업 데이터에도 PostgreSQL과 동일한 보관·삭제 기준을 적용합니다.
- 건강 정보, 성적, 자유 입력 전문을 불필요하게 복제하지 않습니다.
- 복원 테스트와 권한 점검이 끝나지 않았다면 백업 기능을 활성화하지 않습니다.
- PostgreSQL 전용 운영이 안정화되면 Sheets 인증 fallback 환경변수를 제거합니다.
- `Code.gs`의 placeholder를 실제 값으로 바꿀 때는 새 비밀값을 생성하고 Git에 커밋하지 않습니다.

## 기존 비밀값 교체

과거 설치 번들에는 Apps Script 비밀값이 소스에 포함된 이력이 있습니다. 해당 값은 더 이상 안전한 비밀로 간주할 수 없습니다. 현재 Apps Script의 `RP_API_SECRET` Script Property와 Vercel의 `RP_API_SECRET`을 새 값으로 함께 교체한 뒤 이전 값을 폐기합니다.
