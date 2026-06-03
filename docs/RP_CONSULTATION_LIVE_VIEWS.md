# 고객 화면 / 코치 입력 화면 분리

상담 화면은 두 가지 보기 모드를 사용합니다.

```txt
/admin/consultation
```

코치 입력 화면입니다. 고객 선택, 상담 입력, 고객용 요약, 코치 내부 메모, 저장을 처리합니다.

```txt
/admin/consultation?view=client&clientId=회원ID
```

고객에게 보여줄 전체 화면입니다. 내부 판단, 코치 메모, 민감한 운영 정보는 표시하지 않습니다.

## 실시간 반영 방식

코치 입력 화면에서 값을 수정하면 같은 브라우저의 다른 탭/창에 열린 고객 화면으로 즉시 전달됩니다.

사용 기술:

```txt
BroadcastChannel
localStorage fallback
```

주의:

- 같은 브라우저/같은 기기에서 가장 안정적으로 동작합니다.
- 다른 PC, 다른 태블릿, 다른 브라우저 사이의 실시간 동기화는 별도 실시간 DB 또는 WebSocket 연결이 필요합니다.
- 고객 화면도 `/admin/consultation` 아래에 있으므로 관리자/트레이너 로그인이 필요합니다.

## AI 요약

코치 입력 화면의 `AI 요약 생성` 버튼은 아래 API를 호출합니다.

```txt
/api/rp/consultation-summary
```

환경변수가 있으면 OpenAI Responses API로 고객용 요약과 코치용 요약을 생성합니다.

```txt
OPENAI_API_KEY=OpenAI API Key
OPENAI_MODEL=gpt-5.4-mini
```

`OPENAI_MODEL`은 선택값입니다. 설정하지 않으면 기본값으로 `gpt-5.4-mini`를 사용합니다.

`OPENAI_API_KEY`가 없거나 API 호출이 실패하면 화면은 깨지지 않고 기본 규칙 기반 요약을 사용합니다.

## 저장

상담 저장 버튼은 기존 Google Sheets 저장 API를 그대로 사용합니다.

```txt
/api/rp/clients
```

저장되는 주요 필드:

```txt
clientSummary      = 고객에게 보여줄 최종 요약
aiSummary          = 코치용 AI/내부 요약
internalJudgment   = 코치 내부 판단
clientSnapshot     = 상담 당시 고객 정보
```
