# RePERFORMANCE 신규 상담 Gmail 알림

상담 신청이 PostgreSQL에 정상 저장된 뒤 운영자 Gmail로 최소정보 알림을 보냅니다. 알림 실패는 고객의 정상 접수를 되돌리지 않습니다.

## 권장 방식: Google Apps Script + MailApp

별도 유료 알림 서비스 없이 `integrations/google-apps-script/Code.gs`를 사용합니다. Google 계정의 Apps Script 및 메일 발송 할당량 안에서 동작하며 광고나 대량 메일에는 사용하지 않습니다.

Gmail 알림만 사용할 때는 Google Sheets ID나 `setupRPV2()`가 필요하지 않습니다. Sheets 백업은 별도 기능이며 기본적으로 비활성화합니다.

### 1. Apps Script 설정

1. 새 Google Apps Script 프로젝트를 만들고 최신 `Code.gs` 전체를 붙여 넣습니다.
2. Apps Script의 `프로젝트 설정 > 스크립트 속성`에 다음 두 값을 추가합니다.

```text
RP_API_SECRET=<새로 생성한 32자 이상의 충분히 긴 무작위 값>
RP_NOTIFICATION_EMAIL=<알림을 받을 Gmail 또는 Google Workspace 주소>
```

비밀값과 실제 이메일 주소를 `Code.gs` 소스에 입력하지 않습니다. `RP_API_SECRET`은 이후 Vercel에 등록할 값과 완전히 같아야 합니다.

3. Apps Script 편집기에서 `verifyRpNotificationSetup()`을 실행합니다.
4. `sendRpNotificationTest()`를 실행하고 MailApp 권한을 승인합니다.
5. 개인정보가 없는 `[RePERFORMANCE] Gmail 알림 연동 테스트` 메일이 도착하는지 확인합니다.
6. 웹 앱을 새 버전으로 배포합니다.

```text
실행 사용자: 나
액세스 권한: 링크가 있는 모든 사용자
```

웹 앱 URL은 `https://script.google.com/macros/s/.../exec` 형태여야 합니다.

### 2. Vercel Production 환경변수

```text
RP_APPLICATION_NOTIFICATION_PROVIDER=google-apps-script
RP_APPLICATION_NOTIFICATION_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
RP_API_SECRET=<Apps Script의 RP_API_SECRET과 동일한 값>
RP_APPLICATION_NOTIFICATION_TIMEOUT_MS=5000
RP_SITE_URL=https://reperformance.the-house-exercise.com
```

환경변수를 저장한 뒤 Production을 다시 배포합니다. 수신 Gmail 주소는 Vercel이나 저장소에 넣지 않고 Apps Script의 비공개 Script Property에만 둡니다.

### 3. 서버 연결 테스트

Vercel과 같은 환경변수를 로컬 셸에 안전하게 주입한 뒤 아래 명령으로 설정 상태만 확인합니다.

```powershell
npm.cmd run ops:notification:check
```

실제로 개인정보 없는 테스트 메일 한 통을 보낼 때만 명시적 확인값을 추가합니다.

```powershell
$env:RP_APPLICATION_NOTIFICATION_TEST_CONFIRM='SEND_ONE_MASKED_TEST'
npm.cmd run ops:notification:test
```

테스트 후 셸을 닫거나 환경변수를 제거합니다. 실제 비밀값을 명령 기록, 문서, Git 파일에 저장하지 않습니다.

## 실제 신청 알림의 전제조건

실제 상담 알림은 다음 순서로 동작합니다.

1. 상담 신청 유효성 검증
2. PostgreSQL 고객·신청 데이터 저장
3. 예약 슬롯 잠금 및 전환 이벤트 기록
4. Gmail 알림 요청

따라서 운영 PostgreSQL이 연결되지 않은 상태에서는 테스트 메일은 보낼 수 있어도 실제 상담 저장·중복 시간 차단·신청 알림은 완료되지 않습니다.

## 메일에 포함되는 정보

- 서비스명
- 마스킹된 신청자 이름
- 희망 방문 시간 또는 일정 협의 요청
- 관리자 고객관리 화면 주소

전화번호, 건강정보, 통증, PAR-Q, 성적, 실기 기록은 메일로 보내지 않습니다. 전체 내용은 로그인된 관리자 화면에서만 확인합니다.

## 장애 처리

Gmail 알림이 실패해도 이미 저장된 신청과 예약은 유지됩니다. 운영자는 관리자 준비 상태와 Apps Script 실행 기록에서 실패를 확인합니다. Apps Script의 일일 메일 할당량을 초과하면 발송이 실패할 수 있습니다.

## 범용 Webhook 대안

```text
RP_APPLICATION_NOTIFICATION_PROVIDER=webhook
RP_APPLICATION_NOTIFICATION_WEBHOOK_URL=https://notification-provider.example/webhook
RP_APPLICATION_NOTIFICATION_WEBHOOK_SECRET=<unique random secret>
```

Webhook 모드에서는 `X-RP-Webhook-Timestamp`와 `X-RP-Webhook-Signature` HMAC-SHA256 헤더를 검증해야 합니다.

이 알림 연동은 신규 신청 알림 전용입니다. NORE를 호출하거나 데이터를 전달하지 않습니다.
