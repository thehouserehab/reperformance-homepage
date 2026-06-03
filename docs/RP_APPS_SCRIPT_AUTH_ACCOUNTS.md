# Google Apps Script 계정 저장소 추가

회원 자동가입이 실제로 작동하려면 기존 Google Apps Script 웹 앱에 계정 저장/조회 액션이 있어야 합니다.

홈페이지는 아래 액션들을 순서대로 호출합니다.

## 회원 자동가입 저장 액션

```txt
createAuthAccount
saveAuthAccount
upsertAuthAccount
saveMemberAccount
```

회원(`member`) 가입은 위 액션 중 하나가 성공해야 즉시 로그인 가능한 계정으로 처리됩니다.

## 계정 조회 액션

```txt
getAuthAccounts
listAuthAccounts
getAccounts
listAccounts
```

로그인 API는 위 액션 중 하나로 계정 목록을 읽고, `passwordHash`를 비교합니다.

## 트레이너/관리자 승인 대기 저장 액션

```txt
saveSignupRequest
saveAccountSignup
saveSignup
saveConsultation
```

트레이너와 관리자는 자동 활성화하지 않고 승인 대기로 저장합니다.

## 권장 시트 이름

```txt
AuthAccounts
```

## 권장 컬럼

```txt
id
username
name
phone
role
roleLabel
status
accountStatus
approved
passwordHash
requestedAt
approvedAt
message
source
```

## Apps Script 예시 코드

기존 Apps Script의 `doGet` / `doPost`에서 action을 읽고 있다면, 아래 핸들러를 action switch에 연결합니다.

```js
const RP_AUTH_ACCOUNTS_SHEET_NAME = 'AuthAccounts';
const RP_AUTH_ACCOUNT_HEADERS = [
  'id',
  'username',
  'name',
  'phone',
  'role',
  'roleLabel',
  'status',
  'accountStatus',
  'approved',
  'passwordHash',
  'requestedAt',
  'approvedAt',
  'message',
  'source',
];

function rpAuthAccountActionNames_() {
  return [
    'createAuthAccount',
    'saveAuthAccount',
    'upsertAuthAccount',
    'saveMemberAccount',
    'getAuthAccounts',
    'listAuthAccounts',
    'getAccounts',
    'listAccounts',
  ];
}

function rpHandleAuthAccountAction_(action, payload) {
  if ([
    'getAuthAccounts',
    'listAuthAccounts',
    'getAccounts',
    'listAccounts',
  ].indexOf(action) !== -1) {
    return rpJson_({ ok: true, accounts: rpListAuthAccounts_() });
  }

  if ([
    'createAuthAccount',
    'saveAuthAccount',
    'upsertAuthAccount',
    'saveMemberAccount',
  ].indexOf(action) !== -1) {
    return rpJson_(rpSaveAuthAccount_(payload.account || payload.request || payload));
  }

  return null;
}

function rpSaveAuthAccount_(account) {
  const sheet = rpEnsureAuthAccountSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const usernameIndex = headers.indexOf('username');
  const username = String(account.username || '').trim().toLowerCase();

  if (!username) return { ok: false, error: 'username is required' };
  if (!account.passwordHash) return { ok: false, error: 'passwordHash is required' };

  const row = RP_AUTH_ACCOUNT_HEADERS.map(function(header) {
    if (header === 'approved') return account.approved === false ? 'FALSE' : 'TRUE';
    if (header === 'status') return account.status || '활성';
    if (header === 'accountStatus') return account.accountStatus || 'active';
    if (header === 'approvedAt') return account.approvedAt || new Date().toISOString();
    return account[header] || '';
  });

  for (var i = 1; i < values.length; i += 1) {
    var existing = String(values[i][usernameIndex] || '').trim().toLowerCase();
    if (existing === username) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { ok: true, updated: true, username: username };
    }
  }

  sheet.appendRow(row);
  return { ok: true, created: true, username: username };
}

function rpListAuthAccounts_() {
  const sheet = rpEnsureAuthAccountSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1).filter(function(row) {
    return row.some(function(cell) { return cell !== ''; });
  }).map(function(row) {
    const record = {};
    headers.forEach(function(header, index) {
      record[header] = row[index];
    });
    return record;
  });
}

function rpEnsureAuthAccountSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(RP_AUTH_ACCOUNTS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(RP_AUTH_ACCOUNTS_SHEET_NAME);
    sheet.appendRow(RP_AUTH_ACCOUNT_HEADERS);
    return sheet;
  }

  const firstRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), RP_AUTH_ACCOUNT_HEADERS.length)).getValues()[0];
  if (!firstRow.some(function(cell) { return cell !== ''; })) {
    sheet.getRange(1, 1, 1, RP_AUTH_ACCOUNT_HEADERS.length).setValues([RP_AUTH_ACCOUNT_HEADERS]);
  }

  return sheet;
}

function rpJson_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 기존 doGet / doPost 연결 예시

기존 코드에서 `action`과 `payload`를 만든 뒤 아래처럼 먼저 확인하면 됩니다.

```js
const authResponse = rpHandleAuthAccountAction_(action, payload);
if (authResponse) return authResponse;
```

그 다음 기존 `saveConsultation`, `getClients` 같은 액션을 그대로 처리하면 됩니다.

## 보안 메모

- 시트에는 평문 비밀번호를 저장하지 말고 `passwordHash`만 저장합니다.
- `AuthAccounts` 시트는 공개 CSV로 공유하지 않습니다.
- Apps Script 웹 앱은 `RP_API_SECRET` 검증 로직을 유지하는 것이 좋습니다.
