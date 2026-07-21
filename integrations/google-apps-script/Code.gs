/**
 * RePERFORMANCE Owner Workspace V2 - Google Sheets and Gmail Bridge
 * Gmail notification only:
 * 1) Copy this file into Apps Script.
 * 2) In Project Settings > Script Properties, add RP_API_SECRET and RP_NOTIFICATION_EMAIL.
 * 3) Run verifyRpNotificationSetup(), then optionally sendRpNotificationTest().
 * 4) Deploy as Web App: Execute as Me / Access: Anyone with link.
 * Google Sheets backup is separate and additionally requires SPREADSHEET_ID and setupRPV2().
 */

const RP_CONFIG = {
  SPREADSHEET_ID: 'CHANGE_THIS_TO_SPREADSHEET_ID',
  SHEETS: {
    dashboard: 'Dashboard',
    leads: 'Leads_상담',
    members: 'Members_회원',
    sales: 'Sales_매출',
    payments: 'Payments_잔금분납',
    refunds: 'Refunds_환불',
    tasks: 'Tasks_할일',
    documents: 'Documents_문서DB',
    kpi: 'KPI_월간지표',
    settings: 'Settings_설정',
    parq: 'PARQ_건강설문',
    assessments: 'Assessments_평가',
    programs: 'Programs_OPT',
    sessions: 'Sessions_세션기록',
    apiLog: 'API_Log'
  }
};

const RP_HEADERS = {
  members: [
    '회원ID','이름','연락처','생년월일','성별','회원상태','담당코치','방문경로',
    '주목표','불편부위','PARQ상태','운동진행판단','현재OPTPhase','추천프로그램',
    '최근상담일','다음액션','업데이트시각'
  ],
  leads: [
    '상담ID','회원ID','이름','연락처','상담일시','상담상태','방문목적','회원목표',
    '코치재정의목표','불편부위','통증강도','악화동작','운동경험','추천프로그램',
    '상담결과','다음액션','코치메모','AI요약','작성시각'
  ],
  parq: [
    'PARQ_ID','회원ID','이름','작성일시','Q1_심장질환고혈압운동제한','Q2_가슴통증',
    'Q3_어지럼실신균형상실','Q4_만성질환','Q5_처방약','Q6_근골격계문제',
    'Q7_의료감독운동지시','예응답개수','추가설문필요','추가설문완료','위험플래그',
    '운동진행판단','코치확인상태','코치메모','원본응답URL','업데이트시각'
  ],
  assessments: [
    '평가ID','회원ID','이름','평가일시','평가종류','주요통증부위','통증강도','제한패턴',
    '보상작용요약','가동성문제','안정성문제','우선개선과제','금기주의동작','첫4주목표',
    '원본평가지URL','AI평가요약','코치확정요약','다음평가예정일','업데이트시각'
  ],
  programs: [
    '프로그램ID','회원ID','이름','생성일시','프로그램상태','프로그램목적','현재OPTPhase','목표OPTPhase',
    'Phase선정이유','프로그램기간','주당빈도','Day1목적','Day2목적','Day3목적','주요주의사항',
    'AI초안','코치확정내용','업데이트시각'
  ],
  sessions: [
    '세션ID','회원ID','이름','수업일시','회차','세션목적','주요운동','강도RPE','통증변화',
    '회원반응','오늘의문제','다음세션계획','출석상태','회차차감여부','담당코치','업데이트시각'
  ],
  apiLog: ['일시','Action','Status','Message','Payload요약']
};

function setupRPV2() {
  const ss = SpreadsheetApp.openById(RP_CONFIG.SPREADSHEET_ID);
  ensureSheetWithHeaders_(ss, RP_CONFIG.SHEETS.members, RP_HEADERS.members, true);
  ensureSheetWithHeaders_(ss, RP_CONFIG.SHEETS.leads, RP_HEADERS.leads, true);
  ensureSheetWithHeaders_(ss, RP_CONFIG.SHEETS.parq, RP_HEADERS.parq, false);
  ensureSheetWithHeaders_(ss, RP_CONFIG.SHEETS.assessments, RP_HEADERS.assessments, false);
  ensureSheetWithHeaders_(ss, RP_CONFIG.SHEETS.programs, RP_HEADERS.programs, false);
  ensureSheetWithHeaders_(ss, RP_CONFIG.SHEETS.sessions, RP_HEADERS.sessions, false);
  ensureSheetWithHeaders_(ss, RP_CONFIG.SHEETS.apiLog, RP_HEADERS.apiLog, false);
  logApi_('setupRPV2', 'OK', 'V2 sheets and headers prepared', '');
  return { ok: true, message: 'RP V2 setup complete' };
}

function verifyRpNotificationSetup() {
  var properties = PropertiesService.getScriptProperties();
  var secret = String(properties.getProperty('RP_API_SECRET') || '').trim();
  var recipient = String(properties.getProperty('RP_NOTIFICATION_EMAIL') || '').trim().toLowerCase();
  if (secret.length < 32) {
    throw new Error('RP_API_SECRET must be set in Script Properties with at least 32 characters.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error('RP_NOTIFICATION_EMAIL must be set to a valid address in Script Properties.');
  }
  return {
    ok: true,
    secretConfigured: true,
    recipientMasked: recipient.replace(/^(.{1,2}).*(@.*)$/, '$1***$2')
  };
}

function sendRpNotificationTest() {
  verifyRpNotificationSetup();
  return sendApplicationNotification_({
    event: 'service_application.created',
    adminUrl: 'https://reperformance.the-house-exercise.com/admin/clients',
    application: {
      id: 'notification-test-' + new Date().getTime(),
      serviceLabel: 'Gmail 알림 연동 테스트',
      applicantNameMasked: '테**',
      visitLabel: '테스트 일정 · 실제 상담 신청 아님'
    }
  });
}

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    assertAuthorized_(params.token);
    const action = params.action || 'listClients';

    if (action === 'health') return json_({ ok: true, service: 'RP Sheets Bridge V2', time: new Date().toISOString() });
    if (action === 'setup') return json_(setupRPV2());
    if (action === 'listClients') return json_({ ok: true, clients: listClients_() });
    if (action === 'getClient') return json_({ ok: true, client: getClient_(params.memberId || params.id) });

    return json_({ ok: false, error: 'Unknown GET action: ' + action });
  } catch (err) {
    logApi_('GET', 'ERROR', err.message, JSON.stringify(e && e.parameter ? e.parameter : {}));
    return json_({ ok: false, error: err.message });
  }
}

function doPost(e) {
  var action = 'POST';
  try {
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    assertAuthorized_(body.token);
    action = body.action || 'POST';
    const payload = body.payload || {};

    if (action === 'setup') return json_(setupRPV2());
    if (action === 'saveClient') return json_({ ok: true, client: saveClient_(payload) });
    if (action === 'saveConsultation') return json_({ ok: true, result: saveConsultation_(payload) });
    if (action === 'saveParq') return json_({ ok: true, result: saveParq_(payload) });
    if (action === 'saveAssessment') return json_({ ok: true, result: appendRecord_(RP_CONFIG.SHEETS.assessments, RP_HEADERS.assessments, payload, '평가ID', 'ASM') });
    if (action === 'saveProgram') return json_({ ok: true, result: appendRecord_(RP_CONFIG.SHEETS.programs, RP_HEADERS.programs, payload, '프로그램ID', 'PRG') });
    if (action === 'saveSession') return json_({ ok: true, result: appendRecord_(RP_CONFIG.SHEETS.sessions, RP_HEADERS.sessions, payload, '세션ID', 'SES') });
    if (action === 'sendApplicationNotification') return json_({ ok: true, result: sendApplicationNotification_(payload) });

    return json_({ ok: false, error: 'Unknown POST action: ' + action });
  } catch (err) {
    // Never write request bodies here: they can contain API tokens or personal data.
    logApi_(action, 'ERROR', err.message, 'request body omitted');
    return json_({ ok: false, error: err.message });
  }
}

function cleanNotificationText_(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength || 200);
}

function sendApplicationNotification_(payload) {
  if (!payload || payload.event !== 'service_application.created') {
    throw new Error('Unsupported application notification event.');
  }

  var recipient = PropertiesService.getScriptProperties().getProperty('RP_NOTIFICATION_EMAIL');
  if (!recipient) {
    throw new Error("RP_NOTIFICATION_EMAIL is not configured. Run setRpNotificationEmail('owner@example.com').");
  }

  var application = payload.application || {};
  var serviceLabel = cleanNotificationText_(application.serviceLabel, 80) || '서비스 확인 필요';
  var applicantName = cleanNotificationText_(application.applicantNameMasked, 30) || '신청자';
  var visitLabel = cleanNotificationText_(application.visitLabel, 80) || '일정 협의 요청';
  var adminUrl = cleanNotificationText_(payload.adminUrl, 300);
  var subject = '[RePERFORMANCE] ' + serviceLabel + ' 신규 상담 신청';
  var body = [
    'RePERFORMANCE 홈페이지에 신규 상담 신청이 저장되었습니다.',
    '',
    '서비스: ' + serviceLabel,
    '신청자: ' + applicantName,
    '희망 시간: ' + visitLabel,
    '',
    '관리자 화면에서 연락처와 신청 내용을 확인하세요.',
    adminUrl,
    '',
    '보안을 위해 이 메일에는 전화번호, 건강정보, 성적, 실기 기록을 포함하지 않습니다.'
  ].join('\n');

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    body: body,
    name: 'RePERFORMANCE 홈페이지'
  });
  logApi_('sendApplicationNotification', 'OK', cleanNotificationText_(application.id, 80), 'masked summary only');
  return { delivered: true, channel: 'gmail' };
}

function v_(row, keys, fallback) {
  for (var i = 0; i < keys.length; i++) {
    var value = row[keys[i]];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return fallback || '';
}

function listClients_() {
  const ss = SpreadsheetApp.openById(RP_CONFIG.SPREADSHEET_ID);
  const sh = ss.getSheetByName(RP_CONFIG.SHEETS.members);
  if (!sh || sh.getLastRow() < 2) return [];
  return rowsAsObjects_(sh).map(r => ({
    id: v_(r, ['회원ID','id','ID']),
    name: v_(r, ['이름','회원명','성명','name']),
    phone: v_(r, ['연락처','전화번호','phone']),
    birthDate: v_(r, ['생년월일','birthDate']),
    gender: v_(r, ['성별','gender']),
    memberType: v_(r, ['회원구분','memberType']),
    status: v_(r, ['회원상태','status']),
    coach: v_(r, ['담당코치','담당자','coach']),
    source: v_(r, ['방문경로','source']),
    goal: v_(r, ['주목표','목표','goal']),
    discomfort: v_(r, ['불편부위','discomfort']),
    caution: v_(r, ['주의사항','caution']),
    totalSessions: v_(r, ['총회차','totalSessions']),
    remainingSessions: v_(r, ['잔여회차','remainingSessions']),
    parqStatus: v_(r, ['PARQ상태','PAR-Q상태','parqStatus']),
    exerciseDecision: v_(r, ['운동진행판단','exerciseDecision']),
    optPhase: v_(r, ['현재OPTPhase','현재OPT Phase','optPhase']),
    recommendedProgram: v_(r, ['추천프로그램','recommendedProgram']),
    lastConsultationAt: v_(r, ['최근상담일','lastConsultationAt']),
    nextAction: v_(r, ['다음액션','nextAction'])
  })).filter(c => c.id || c.name || c.phone);
}

function getClient_(memberId) {
  if (!memberId) return null;
  return listClients_().find(c => c.id === memberId) || null;
}

function saveClient_(payload) {
  const ss = SpreadsheetApp.openById(RP_CONFIG.SPREADSHEET_ID);
  const sh = ensureSheetWithHeaders_(ss, RP_CONFIG.SHEETS.members, RP_HEADERS.members, true);
  const headers = getHeaders_(sh);
  const memberId = payload['회원ID'] || payload.id || generateId_('RP');
  const rowObject = {
    '회원ID': memberId,
    '이름': payload['이름'] || payload['회원명'] || payload.name || '',
    '연락처': payload['연락처'] || payload.phone || '',
    '생년월일': payload['생년월일'] || payload.birthDate || '',
    '성별': payload['성별'] || payload.gender || '',
    '회원상태': payload['회원상태'] || payload.status || '상담 예정',
    '담당코치': payload['담당코치'] || payload['담당자'] || payload.coach || '',
    '방문경로': payload['방문경로'] || payload.source || '',
    '주목표': payload['주목표'] || payload['목표'] || payload.goal || '',
    '불편부위': payload['불편부위'] || payload.discomfort || '',
    'PARQ상태': payload['PARQ상태'] || payload.parqStatus || '',
    '운동진행판단': payload['운동진행판단'] || payload.exerciseDecision || '',
    '현재OPTPhase': payload['현재OPTPhase'] || payload.optPhase || '',
    '추천프로그램': payload['추천프로그램'] || payload.recommendedProgram || '',
    '최근상담일': payload['최근상담일'] || payload.lastConsultationAt || '',
    '다음액션': payload['다음액션'] || payload.nextAction || '',
    '업데이트시각': new Date()
  };
  upsertByKey_(sh, headers, '회원ID', memberId, rowObject);
  logApi_('saveClient', 'OK', memberId, JSON.stringify(rowObject));
  return { id: memberId, ...rowObject };
}

function saveConsultation_(payload) {
  const member = saveClient_({
    id: payload.memberId || payload.id,
    name: payload.name,
    phone: payload.phone,
    status: payload.memberStatus || '상담 완료',
    goal: payload.goal || payload.memberGoal,
    discomfort: payload.discomfort,
    parqStatus: payload.parqStatus,
    exerciseDecision: payload.exerciseDecision,
    optPhase: payload.optPhase,
    recommendedProgram: payload.recommendedProgram,
    lastConsultationAt: payload.consultationAt || new Date(),
    nextAction: payload.nextAction,
    coach: payload.coach
  });

  const consultationId = payload.consultationId || generateId_('CON');
  const record = {
    '상담ID': consultationId,
    '회원ID': member.id || member['회원ID'],
    '이름': payload.name || member['이름'] || '',
    '연락처': payload.phone || member['연락처'] || '',
    '상담일시': payload.consultationAt || new Date(),
    '상담상태': payload.consultationStatus || '상담 완료',
    '방문목적': payload.visitPurpose || payload.purpose || '',
    '회원목표': payload.goal || payload.memberGoal || '',
    '코치재정의목표': payload.coachGoal || '',
    '불편부위': payload.discomfort || '',
    '통증강도': payload.painScore || '',
    '악화동작': payload.aggravatingMovement || '',
    '운동경험': payload.exerciseExperience || '',
    '추천프로그램': payload.recommendedProgram || '',
    '상담결과': payload.consultationResult || '',
    '다음액션': payload.nextAction || '',
    '코치메모': payload.coachMemo || '',
    'AI요약': payload.aiSummary || '',
    '작성시각': new Date()
  };
  appendRowObject_(RP_CONFIG.SHEETS.leads, RP_HEADERS.leads, record);
  logApi_('saveConsultation', 'OK', consultationId, JSON.stringify(record));
  return { consultationId, memberId: member.id || member['회원ID'] };
}

function saveParq_(payload) {
  const answers = [payload.q1, payload.q2, payload.q3, payload.q4, payload.q5, payload.q6, payload.q7];
  const yesCount = answers.filter(v => String(v).toLowerCase() === 'yes' || v === '예' || v === true).length;
  const riskFlags = [];
  if (isYes_(payload.q2)) riskFlags.push('가슴통증');
  if (isYes_(payload.q3)) riskFlags.push('어지럼/실신/균형상실');
  if (isYes_(payload.q7)) riskFlags.push('의료감독 지시');
  if (isYes_(payload.q6)) riskFlags.push('근골격계 문제');

  const record = {
    'PARQ_ID': payload.parqId || generateId_('PARQ'),
    '회원ID': payload.memberId || payload.id || '',
    '이름': payload.name || '',
    '작성일시': payload.submittedAt || new Date(),
    'Q1_심장질환고혈압운동제한': yesNo_(payload.q1),
    'Q2_가슴통증': yesNo_(payload.q2),
    'Q3_어지럼실신균형상실': yesNo_(payload.q3),
    'Q4_만성질환': yesNo_(payload.q4),
    'Q5_처방약': yesNo_(payload.q5),
    'Q6_근골격계문제': yesNo_(payload.q6),
    'Q7_의료감독운동지시': yesNo_(payload.q7),
    '예응답개수': yesCount,
    '추가설문필요': yesCount > 0 ? '필요' : '불필요',
    '추가설문완료': payload.followupComplete || '',
    '위험플래그': riskFlags.join(', '),
    '운동진행판단': payload.exerciseDecision || (riskFlags.length ? '코치 확인 필요' : '정상 진행 후보'),
    '코치확인상태': payload.coachReviewStatus || '미확인',
    '코치메모': payload.coachMemo || '',
    '원본응답URL': payload.sourceUrl || '',
    '업데이트시각': new Date()
  };
  appendRowObject_(RP_CONFIG.SHEETS.parq, RP_HEADERS.parq, record);
  if (payload.memberId || payload.id) {
    saveClient_({ id: payload.memberId || payload.id, name: payload.name, parqStatus: record['추가설문필요'], exerciseDecision: record['운동진행판단'] });
  }
  return { parqId: record['PARQ_ID'], yesCount, riskFlags };
}

function appendRecord_(sheetName, headers, payload, idKey, prefix) {
  const record = {};
  headers.forEach(h => record[h] = payload[h] || '');
  record[idKey] = payload[idKey] || payload.id || generateId_(prefix);
  if (headers.includes('회원ID')) record['회원ID'] = payload['회원ID'] || payload.memberId || '';
  if (headers.includes('이름')) record['이름'] = payload['이름'] || payload.name || '';
  if (headers.includes('업데이트시각')) record['업데이트시각'] = new Date();
  appendRowObject_(sheetName, headers, record);
  return { id: record[idKey] };
}

function ensureSheetWithHeaders_(ss, name, requiredHeaders, appendMissing) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0 || sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
  } else if (appendMissing) {
    const current = getHeaders_(sh);
    const missing = requiredHeaders.filter(h => !current.includes(h));
    if (missing.length) {
      sh.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
    }
  }
  formatHeader_(sh);
  return sh;
}

function formatHeader_(sh) {
  const lastCol = Math.max(1, sh.getLastColumn());
  const header = sh.getRange(1, 1, 1, lastCol);
  header.setFontWeight('bold').setBackground('#111827').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  try { sh.autoResizeColumns(1, Math.min(lastCol, 20)); } catch (e) {}
}

function getHeaders_(sh) {
  return sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(String);
}

function rowsAsObjects_(sh) {
  const headers = getHeaders_(sh);
  const numRows = sh.getLastRow() - 1;
  if (numRows <= 0) return [];
  const values = sh.getRange(2, 1, numRows, headers.length).getValues();
  return values.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function upsertByKey_(sh, headers, keyHeader, keyValue, rowObject) {
  const keyIndex = headers.indexOf(keyHeader);
  if (keyIndex < 0) throw new Error('Missing key header: ' + keyHeader);
  const lastRow = sh.getLastRow();
  let targetRow = -1;
  if (lastRow >= 2) {
    const keys = sh.getRange(2, keyIndex + 1, lastRow - 1, 1).getValues().flat().map(String);
    const found = keys.indexOf(String(keyValue));
    if (found >= 0) targetRow = found + 2;
  }
  const row = headers.map(h => rowObject[h] !== undefined ? rowObject[h] : '');
  if (targetRow > 0) sh.getRange(targetRow, 1, 1, headers.length).setValues([row]);
  else sh.appendRow(row);
}

function appendRowObject_(sheetName, headers, rowObject) {
  const ss = SpreadsheetApp.openById(RP_CONFIG.SPREADSHEET_ID);
  const sh = ensureSheetWithHeaders_(ss, sheetName, headers, true);
  const actualHeaders = getHeaders_(sh);
  const row = actualHeaders.map(h => rowObject[h] !== undefined ? rowObject[h] : '');
  sh.appendRow(row);
}

function generateId_(prefix) {
  const tz = Session.getScriptTimeZone() || 'Asia/Seoul';
  const stamp = Utilities.formatDate(new Date(), tz, 'yyyyMMddHHmmss');
  const rand = Math.floor(Math.random() * 900 + 100);
  return prefix + '-' + stamp + '-' + rand;
}

function isYes_(v) {
  const s = String(v).trim().toLowerCase();
  return v === true || s === 'yes' || s === '예' || s === 'true' || s === 'y';
}

function yesNo_(v) {
  return isYes_(v) ? '예' : '아니오';
}

function assertAuthorized_(token) {
  const secret = String(PropertiesService.getScriptProperties().getProperty('RP_API_SECRET') || '').trim();
  if (secret.length < 32) {
    throw new Error('RP_API_SECRET is not configured in Apps Script Properties with at least 32 characters.');
  }
  if (!token || token !== secret) throw new Error('Unauthorized');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function logApi_(action, status, message, payloadSummary) {
  try {
    const ss = SpreadsheetApp.openById(RP_CONFIG.SPREADSHEET_ID);
    const sh = ensureSheetWithHeaders_(ss, RP_CONFIG.SHEETS.apiLog, RP_HEADERS.apiLog, false);
    sh.appendRow([new Date(), action, status, message, String(payloadSummary || '').slice(0, 500)]);
  } catch (e) {}
}
