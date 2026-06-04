# RP Notion survey auto-sync setup

현재 온라인 설문 버튼은 Notion 설문 페이지를 여는 역할만 합니다. 설문 완료 후 회원이 자동으로 추가되려면 Notion 응답 데이터를 홈페이지 API로 보내는 연결이 필요합니다.

## 1. 새 API

배포 후 아래 주소가 설문 자동 등록 API입니다.

```txt
https://reperformance.the-house-exercise.com/api/rp/notion-survey
```

이 API는 두 방식을 지원합니다.

- Webhook 저장: Notion 자동화, Make, Zapier 등에서 설문 완료 시 `POST`로 고객 정보를 전송합니다.
- Notion 동기화: 서버가 Notion data source/database를 조회해 최근 설문 응답을 고객 목록에 저장합니다.

## 2. Vercel 환경 변수

Vercel Project Settings > Environment Variables에 아래 값을 추가합니다.

```txt
RP_NOTION_SYNC_SECRET=긴_랜덤_비밀값
CRON_SECRET=긴_랜덤_비밀값
NOTION_API_KEY=secret_xxx
NOTION_SURVEY_DATA_SOURCE_ID=노션_설문_data_source_id
```

참고:

- `RP_NOTION_SYNC_SECRET`은 webhook 호출 권한 확인용입니다. 없으면 `CRON_SECRET` 또는 `RP_API_SECRET`을 대신 사용합니다.
- `CRON_SECRET`은 Vercel Cron 권한 확인용입니다. 하루 1회 누락된 설문을 자동으로 다시 동기화할 때 사용됩니다.
- Notion의 새 API에서는 `NOTION_SURVEY_DATA_SOURCE_ID`를 권장합니다.
- 예전 database API만 사용할 수 있으면 `NOTION_SURVEY_DATABASE_ID`를 대신 넣을 수 있습니다.
- 회사 DB를 쓰는 경우 `DATABASE_URL`/`RP_DATABASE_URL`이 있으면 DB에 저장됩니다.
- DB가 없으면 기존 `RP_SHEETS_WEBAPP_URL` + `RP_API_SECRET` 설정으로 Google Sheets에 저장됩니다.

## 3. Notion 권한

Notion에서 설문 데이터베이스를 열고, 우측 상단 메뉴의 연결 추가에서 만든 Notion integration을 공유해야 합니다. 공유하지 않으면 Notion API가 404를 반환합니다.

공식 문서:

- Data source query: https://developers.notion.com/reference/query-a-data-source
- Notion API versioning: https://developers.notion.com/reference/versioning

## 4. Webhook 예시

Notion 자동화, Make, Zapier에서 아래처럼 호출합니다.

```http
POST https://reperformance.the-house-exercise.com/api/rp/notion-survey
Authorization: Bearer RP_NOTION_SYNC_SECRET값
Content-Type: application/json
```

```json
{
  "name": "홍길동",
  "phone": "010-0000-0000",
  "birth": "1990-01-01",
  "gender": "남",
  "goal": "허리 통증 관리와 근력 회복",
  "purpose": ["통증 관리", "체력 회복"],
  "painAreas": ["허리"],
  "painScore": 5,
  "concern": "최근 허리 통증이 반복됨"
}
```

Notion 페이지 객체를 그대로 보내도 `properties`를 읽어 고객 정보로 변환합니다.

## 5. 수동 동기화 확인

환경 변수를 설정한 뒤 아래 주소를 브라우저나 API 도구에서 호출하면 최근 설문을 동기화합니다.

```txt
https://reperformance.the-house-exercise.com/api/rp/notion-survey?secret=RP_NOTION_SYNC_SECRET값&limit=20
```

저장하지 않고 변환 결과만 보고 싶으면 `dryRun=1`을 붙입니다.

```txt
https://reperformance.the-house-exercise.com/api/rp/notion-survey?secret=RP_NOTION_SYNC_SECRET값&limit=5&dryRun=1
```

## 6. 자동 백업 동기화

`vercel.json`에 Vercel Cron을 추가했습니다. Vercel은 매일 07:00 KST에 아래 경로를 호출해 최근 설문 50건을 다시 동기화합니다.

```txt
/api/rp/notion-survey-cron
```

이 백업 동기화는 즉시 등록용 webhook을 대체하지 않습니다. Notion 자동화 webhook은 설문 직후 즉시 등록용이고, Vercel Cron은 webhook이 누락됐을 때 다시 맞춰주는 안전장치입니다.

## 7. 인식하는 주요 항목명

Notion 설문 속성명은 아래 이름을 우선 인식합니다.

- 이름: `회원명`, `이름`, `성함`, `고객명`, `name`
- 연락처: `연락처`, `전화번호`, `휴대폰`, `phone`
- 생년월일: `생년월일`, `birth`, `birthday`
- 성별: `성별`, `gender`
- 목표: `목표`, `운동목표`, `goal`
- 방문 목적: `방문목적`, `운동목적`, `purpose`
- 통증 부위: `불편부위`, `통증부위`, `painAreas`
- 통증 강도: `통증강도`, `통증점수`, `painScore`
- 주의사항: `주의사항`, `메모`, `상담메모`, `특이사항`, `concern`

고객 이름은 필수입니다. 이름을 찾지 못하면 자동 저장하지 않고 오류를 반환합니다.
