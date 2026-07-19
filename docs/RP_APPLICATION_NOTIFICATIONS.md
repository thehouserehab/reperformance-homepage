# RePERFORMANCE 신규 상담 Gmail 알림

상담 신청이 PostgreSQL에 정상 저장된 뒤 대표자 Gmail로 최소정보 알림을 보냅니다. 알림 실패는 고객의 정상 접수를 되돌리지 않습니다.

## 권장 방식: Google Apps Script + MailApp

별도 유료 알림 서비스 없이 기존 `integrations/google-apps-script/Code.gs`를 사용합니다. Google 계정의 Apps Script 및 메일 발송 할당량 안에서 무료로 동작하며, 대량 발송 서비스 용도는 아닙니다.

1. Apps Script 프로젝트에 최신 `Code.gs`를 반영합니다.
2. `RP_CONFIG.SPREADSHEET_ID`와 `RP_CONFIG.DEFAULT_SECRET`을 실제 값으로 교체합니다.
3. Apps Script 편집기에서 아래 함수를 한 번씩 실행합니다.

```javascript
setupRPV2();
setRpApiSecretOnce();
setRpNotificationEmail('알림을 받을 Gmail 주소');
```

4. 웹 앱을 `실행 사용자: 나`, `액세스 권한: 링크가 있는 모든 사용자`로 새 버전 배포합니다.
5. Vercel Production에 아래 환경변수를 등록합니다.

```text
RP_APPLICATION_NOTIFICATION_PROVIDER=google-apps-script
RP_APPLICATION_NOTIFICATION_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
RP_API_SECRET=<Apps Script RP_API_SECRET과 동일한 값>
RP_APPLICATION_NOTIFICATION_TIMEOUT_MS=5000
RP_SITE_URL=https://reperformance.the-house-exercise.com
```

수신 Gmail 주소는 소스 코드나 Vercel 환경변수에 넣지 않습니다. Apps Script의 비공개 Script Property `RP_NOTIFICATION_EMAIL`에만 저장됩니다.

## 메일에 포함되는 정보

- 서비스명
- 마스킹된 신청자 이름
- 희망 방문 시간 또는 일정 협의 요청
- 관리자 고객관리 화면 주소

전화번호, 건강정보, 통증, PAR-Q, 성적, 실기 기록은 메일로 보내지 않습니다. 전체 내용은 로그인된 관리자 화면에서만 확인합니다.

## 발송 순서와 장애 처리

1. 상담 신청 유효성 검증
2. PostgreSQL 고객·신청 데이터 저장
3. 예약 슬롯 잠금 및 전환 이벤트 기록
4. Gmail 알림 요청

4번이 실패해도 1~3번의 저장 결과는 유지됩니다. 운영자는 관리자 준비 상태와 Apps Script 실행 기록에서 실패를 확인해야 합니다.

Apps Script의 일일 메일 할당량을 초과하면 알림이 실패할 수 있습니다. 일반적인 소규모 상담 알림에는 적합하지만 광고·대량 메일에는 사용하지 않습니다.

## 범용 Webhook 대안

기존 범용 Webhook도 유지합니다.

```text
RP_APPLICATION_NOTIFICATION_PROVIDER=webhook
RP_APPLICATION_NOTIFICATION_WEBHOOK_URL=https://notification-provider.example/webhook
RP_APPLICATION_NOTIFICATION_WEBHOOK_SECRET=<unique random secret>
```

Webhook 모드에서는 `X-RP-Webhook-Timestamp`와 `X-RP-Webhook-Signature` HMAC-SHA256 헤더를 검증해야 합니다.

이 알림 연동은 신규 신청 알림 전용입니다. NORE를 호출하거나 데이터를 전달하지 않습니다.
