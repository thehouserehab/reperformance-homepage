# Google Apps Script 고객 직접 추가 액션

`/admin/clients`의 고객 추가 버튼이 실제 Google Sheets에 저장되려면 Apps Script 웹 앱이 아래 액션 중 하나를 처리해야 합니다.

홈페이지 API는 아래 액션을 순서대로 시도합니다.

```txt
addClient
createClient
saveClient
upsertClient
addMember
createMember
saveMember
upsertMember
```

권장 액션명은 `addClient`입니다.

## 저장 대상 시트

기존 고객 목록을 읽는 시트와 같은 시트에 저장하는 것이 좋습니다. 현재 코드가 인식하는 주요 컬럼은 다음과 같습니다.

```txt
회원ID
회원명
연락처
생년월일
성별
유입경로
회원구분
회원상태
담당코치
PAR-Q
PAR-Q 예항목
목표
방문목적
불편부위
통증강도
주의사항
총회차
잔여회차
등록일
source
```

PAR-Q 설문 없이 추가한 고객은 `PAR-Q` 값이 `미작성`, `PAR-Q 예항목` 값이 빈 값으로 들어옵니다.

## Apps Script 예시

기존 Apps Script의 `doGet` / `doPost`에서 `action`과 `payload`를 만든 뒤, 기존 고객 조회/상담 저장 처리보다 먼저 아래 핸들러를 연결합니다.

```js
const RP_MEMBERS_SHEET_NAME = 'Members_회원';
const RP_MEMBER_HEADERS = [
  '회원ID',
  '회원명',
  '연락처',
  '생년월일',
  '성별',
  '유입경로',
  '회원구분',
  '회원상태',
  '담당코치',
  'PAR-Q',
  'PAR-Q 예항목',
  '목표',
  '방문목적',
  '불편부위',
  '통증강도',
  '주의사항',
  '총회차',
  '잔여회차',
  '등록일',
  'source',
];

function rpHandleClientAddAction_(action, payload) {
  if ([
    'addClient',
    'createClient',
    'saveClient',
    'upsertClient',
    'addMember',
    'createMember',
    'saveMember',
    'upsertMember',
  ].indexOf(action) === -1) {
    return null;
  }

  return rpJson_(rpSaveClient_(payload.client || payload.member || payload.record || payload));
}

function rpSaveClient_(client) {
  const sheet = rpEnsureMembersSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf('회원ID');
  const id = String(client['회원ID'] || client.id || client.clientId || '').trim() || 'RP-' + Date.now();
  const name = String(client['회원명'] || client.name || client.clientName || '').trim();

  if (!name) return { ok: false, error: '회원명은 필수입니다.' };

  const normalized = Object.assign({}, client, {
    '회원ID': id,
    '회원명': name,
    '회원상태': client['회원상태'] || client.status || '상담 전',
    'PAR-Q': client['PAR-Q'] || client.parqStatus || '미작성',
    'PAR-Q 예항목': client['PAR-Q 예항목'] || '',
    '등록일': client['등록일'] || new Date().toISOString().slice(0, 10),
    source: client.source || 'admin-direct-add',
  });

  const row = RP_MEMBER_HEADERS.map(function(header) {
    return normalized[header] || '';
  });

  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][idIndex] || '').trim() === id) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { ok: true, updated: true, client: normalized };
    }
  }

  sheet.appendRow(row);
  return { ok: true, created: true, client: normalized };
}

function rpEnsureMembersSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(RP_MEMBERS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(RP_MEMBERS_SHEET_NAME);
    sheet.appendRow(RP_MEMBER_HEADERS);
    return sheet;
  }

  const firstRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), RP_MEMBER_HEADERS.length)).getValues()[0];
  if (!firstRow.some(function(cell) { return cell !== ''; })) {
    sheet.getRange(1, 1, 1, RP_MEMBER_HEADERS.length).setValues([RP_MEMBER_HEADERS]);
  }

  return sheet;
}

function rpJson_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

기존 `doGet` / `doPost` 연결 예시:

```js
const clientAddResponse = rpHandleClientAddAction_(action, payload);
if (clientAddResponse) return clientAddResponse;
```
