import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from '../../../../lib/rpAdminAuth';
import {
  isDatabaseConfigured,
  listPeExamAiConsultRequests,
  savePeExamAiConsultRequest,
} from '../../../../lib/rpDatabase';
import {
  callGoogleDriveBackup,
  getGoogleDriveBackupSkipReason,
  isGoogleDriveBackupEnabled,
} from '../../../../lib/rpGoogleDriveBackup';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import {
  buildRequestTooLargeResponse,
  checkRequestBodySize,
  REQUEST_SIZE_LIMITS,
} from '../../../../lib/rpRequestGuards';
import {
  getPeExamSchoolTrackHref,
  peExamAdmissionTracks,
  peExamRegionDetails,
} from '../../../pe-exam/peExamData';

export const dynamic = 'force-dynamic';

const AI_CONSULT_POST_WINDOW_MS = 60 * 60 * 1000;
const AI_CONSULT_POST_LIMIT = 10;
const AI_CONSULT_POST_IP_LIMIT = 60;
const AI_CONSULT_GET_WINDOW_MS = 5 * 60 * 1000;
const AI_CONSULT_GET_LIMIT = 60;
const AI_CONSULT_GET_IP_LIMIT = 180;

function cleanValue(value) {
  return String(value || '').trim();
}

function cleanLimitedValue(value, maxLength = 500) {
  return cleanValue(value).slice(0, maxLength);
}

function wantsJson(request) {
  const accept = request.headers.get('accept') || '';
  const contentType = request.headers.get('content-type') || '';
  return accept.includes('application/json') || contentType.includes('application/json');
}

function redirectTo(request, status) {
  const url = new URL('/pe-exam/ai-consult', request.url);
  url.searchParams.set('request', status);
  return NextResponse.redirect(url, 303);
}

function redirectToLogin(request) {
  const url = new URL('/login', request.url);
  url.searchParams.set('next', '/pe-exam/ai-consult');
  return NextResponse.redirect(url, 303);
}

async function backupPeExamAiConsultToGoogleDrive(record) {
  if (!isGoogleDriveBackupEnabled()) {
    return {
      ok: true,
      skipped: true,
      source: 'google-drive',
      reason: getGoogleDriveBackupSkipReason(),
    };
  }

  const attempts = ['savePeExamAiConsult', 'savePeExamAiConsultation', 'saveConsultation'];
  const errors = [];

  for (const action of attempts) {
    try {
      const data = await callGoogleDriveBackup(action, {
        recordType: 'peExamAiConsult',
        record,
        peExamAiConsult: record,
      });
      return { ok: true, source: 'google-drive', action, data };
    } catch (error) {
      errors.push(`${action}: ${error?.message || 'unknown error'}`);
    }
  }

  return { ok: false, error: errors.slice(0, 3).join(' / ') || 'Google Drive backup failed.' };
}

function extractNumbers(value) {
  const matches = String(value || '')
    .replace(/,/g, '')
    .match(/\d+(?:\.\d+)?/g);

  return matches?.map((item) => Number(item)).filter((item) => Number.isFinite(item)) || [];
}

function firstNumber(value) {
  return extractNumbers(value)[0];
}

function includesAny(value, words) {
  const text = String(value || '').toLowerCase();
  return words.some((word) => text.includes(word.toLowerCase()));
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()[\]{}<>.,;:|\/\\'"`~!@#$%^&*_+=?-]/g, '')
    .replace(/대학교|대학|캠퍼스|본교|분교|학교/g, '');
}

function uniqueItems(items, limit = 5) {
  const seen = new Set();
  const results = [];

  for (const item of items) {
    const text = cleanValue(item).replace(/\s+/g, ' ');
    const key = text.toLowerCase();

    if (!text || seen.has(key)) continue;

    seen.add(key);
    results.push(text);

    if (results.length >= limit) break;
  }

  return results;
}

function splitTargetTerms(value) {
  const text = cleanValue(value);
  if (!text) return [];

  return uniqueItems([text, ...text.split(/[\s,，;；/|·ㆍ]+/)], 12)
    .map((item) => normalizeSearchText(item))
    .filter((item) => item.length >= 2);
}

function getSchoolDisplayName(school) {
  return `${school.name}${school.campus ? ` ${school.campus}` : ''}`;
}

function getSchoolOptionId(region, school) {
  return `${region.slug}:${school.slug}`;
}

function getSchoolSearchTokens(school) {
  const names = [
    school.name,
    getSchoolDisplayName(school),
    school.campus,
    ...(Array.isArray(school.searchKeywords) ? school.searchKeywords : []),
  ];

  if (school.name.endsWith('대학교')) names.push(school.name.replace(/대학교$/, '대'));
  if (school.name.endsWith('대학')) names.push(school.name.replace(/대학$/, '대'));
  if (school.name.includes('체육대학교')) names.push(school.name.replace('체육대학교', '체대'));

  return uniqueItems(names, 8)
    .map((item) => normalizeSearchText(item))
    .filter((item) => item.length >= 2);
}

function findSelectedSchool(selection = {}) {
  const selectedId = cleanValue(selection.targetUniversityId || selection.id);
  const selectedSlug = cleanValue(selection.targetUniversitySlug || selection.slug);
  const selectedHref = cleanValue(selection.targetUniversityHref || selection.href);
  const targetTerms = splitTargetTerms(selection.targetUniversity || selection.displayName || selection.name);

  for (const region of peExamRegionDetails) {
    for (const school of region.universities) {
      const optionId = getSchoolOptionId(region, school);

      if (selectedId && selectedId === optionId) return { region, school, optionId };
      if (selectedSlug && selectedSlug === school.slug) return { region, school, optionId };
      if (selectedHref && selectedHref.includes(`/${school.slug}`)) return { region, school, optionId };
      if (!selectedId && !selectedSlug && schoolMatchesTarget(school, targetTerms)) return { region, school, optionId };
    }
  }

  return null;
}

function buildSelectedUniversity(selection = {}) {
  const selected = findSelectedSchool(selection);
  if (!selected) {
    const targetUniversity = cleanValue(selection.targetUniversity);
    if (!targetUniversity) return null;

    return {
      id: cleanValue(selection.targetUniversityId),
      code: cleanValue(selection.targetUniversityCode),
      displayName: targetUniversity,
      region: cleanValue(selection.targetUniversityRegion),
      area: cleanValue(selection.targetUniversityArea),
      schoolType: cleanValue(selection.targetUniversitySchoolType),
      slug: cleanValue(selection.targetUniversitySlug),
      href: cleanValue(selection.targetUniversityHref),
      source: 'manual-input',
    };
  }

  return {
    id: selected.optionId,
    code: selected.school.code,
    displayName: getSchoolDisplayName(selected.school),
    region: selected.region.region,
    area: selected.school.area,
    schoolType: selected.school.schoolType,
    slug: selected.school.slug,
    href: getPeExamSchoolTrackHref(selected.region.region, 'early', selected.school.slug),
    earlyHref: getPeExamSchoolTrackHref(selected.region.region, 'early', selected.school.slug),
    regularHref: getPeExamSchoolTrackHref(selected.region.region, 'regular', selected.school.slug),
    source: selected.school.source,
  };
}

function schoolMatchesTarget(school, targetTerms) {
  if (!targetTerms.length) return false;

  const schoolTokens = getSchoolSearchTokens(school);
  return targetTerms.some((term) =>
    schoolTokens.some((token) => token.includes(term) || term.includes(token)),
  );
}

function getUnitSearchTexts(unit) {
  if (!unit) return [];
  if (typeof unit === 'string') return [unit];

  if (typeof unit === 'object') {
    return Object.values(unit).flatMap((value) => {
      if (Array.isArray(value)) return value.map(cleanValue);
      return [cleanValue(value)];
    });
  }

  return [cleanValue(unit)];
}

function getAdmissionSearchTexts(admission) {
  return uniqueItems(
    [
      admission.admissionName,
      admission.admissionType,
      admission.unit,
      admission.unitSummary,
      admission.gradeSummary,
      ...(admission.units || []).flatMap(getUnitSearchTexts),
    ],
    24,
  );
}

function departmentMatchesTarget(school, targetTerms) {
  if (!targetTerms.length) return false;

  const admissions = [...(school.earlyAdmissions || []), ...(school.regularAdmissions || [])];
  const admissionTexts = admissions.flatMap(getAdmissionSearchTexts);

  return admissionTexts.some((text) => {
    const normalized = normalizeSearchText(text);
    return normalized && targetTerms.some((term) => normalized.includes(term) || term.includes(normalized));
  });
}

function getTrackKeysForRequest(track) {
  if (track === '수시') return ['early'];
  if (track === '정시') return ['regular'];
  return peExamAdmissionTracks.map((item) => item.key);
}

function getTrackLabel(trackKey) {
  return peExamAdmissionTracks.find((item) => item.key === trackKey)?.label || trackKey;
}

function getTrackAdmissions(school, trackKey) {
  return trackKey === 'early' ? school.earlyAdmissions || [] : school.regularAdmissions || [];
}

function formatRegularResultRow(row) {
  const unit = cleanValue(row.unit || row.title || row.group || '모집단위');
  const metrics = [];

  if (row.percentileAverage70) metrics.push(`70% 평균백분위 ${row.percentileAverage70}`);
  if (row.englishGrade70) metrics.push(`영어 ${row.englishGrade70}등급`);
  if (row.convertedScore70) metrics.push(`환산점수 ${row.convertedScore70}`);
  if (row.note) metrics.push(row.note);

  return metrics.length ? `${unit}: ${metrics.join(', ')}` : '';
}

function summarizeUniversityTrack(school, trackKey) {
  const admissions = getTrackAdmissions(school, trackKey);
  const practicalItems = uniqueItems(
    admissions.flatMap((admission) => [
      ...(admission.practicalTasks || []),
      ...(admission.practicalCriteriaItems || []),
    ]),
    4,
  );

  if (trackKey === 'regular') {
    const resultItems = uniqueItems(
      (school.regularSelectionDetail?.resultRows || []).map(formatRegularResultRow),
      3,
    );

    return {
      admissionCount: admissions.length,
      practicalItems,
      resultItems,
      resultLabel: '정시 등급컷·평균등급',
      summary:
        admissions.length > 0
          ? `정시 전형 ${admissions.length}건과 ADIGA 등급컷·평균등급 ${resultItems.length}건을 연결했습니다.`
          : '정시 전형 행은 아직 연결되지 않았습니다. 대학 입학처 모집요강 확인이 필요합니다.',
    };
  }

  const resultItems = uniqueItems(
    admissions.flatMap((admission) => [
      admission.gradeSummary,
      admission.minimumCriteriaSummary,
    ]),
    3,
  );

  return {
    admissionCount: admissions.length,
    practicalItems,
    resultItems,
    resultLabel: '수시 등급컷·평균등급 확인',
    summary:
      admissions.length > 0
        ? `수시 전형 ${admissions.length}건에서 학생부·최저·실기와 등급 확인 항목을 추렸습니다.`
        : '수시 전형 행은 아직 연결되지 않았습니다. KUSF 또는 대학 모집요강 확인이 필요합니다.',
  };
}

function buildUniversityMatches(request) {
  const universityTerms = splitTargetTerms(request.targetUniversity);
  const departmentTerms = splitTargetTerms(request.targetDepartment);
  const trackKeys = getTrackKeysForRequest(request.admissionTrack);
  const matches = [];
  const selected = findSelectedSchool(request);

  if (selected) {
    for (const trackKey of trackKeys) {
      const trackSummary = summarizeUniversityTrack(selected.school, trackKey);

      matches.push({
        schoolName: getSchoolDisplayName(selected.school),
        region: selected.region.region,
        trackKey,
        trackLabel: getTrackLabel(trackKey),
        href: getPeExamSchoolTrackHref(selected.region.region, trackKey, selected.school.slug),
        ...trackSummary,
      });
    }

    return matches;
  }

  if (!universityTerms.length && !departmentTerms.length) return matches;

  for (const region of peExamRegionDetails) {
    for (const school of region.universities) {
      const matchesSchool = schoolMatchesTarget(school, universityTerms);
      const matchesDepartment = !universityTerms.length && departmentMatchesTarget(school, departmentTerms);

      if (!matchesSchool && !matchesDepartment) continue;

      for (const trackKey of trackKeys) {
        const trackSummary = summarizeUniversityTrack(school, trackKey);

        matches.push({
          schoolName: getSchoolDisplayName(school),
          region: region.region,
          trackKey,
          trackLabel: getTrackLabel(trackKey),
          href: getPeExamSchoolTrackHref(region.region, trackKey, school.slug),
          ...trackSummary,
        });

        if (matches.length >= 8) return matches;
      }
    }
  }

  return matches;
}

function getGradeDirection(request) {
  const schoolGradeNumber = firstNumber(request.schoolGrade);
  const mockNumbers = extractNumbers(request.mockExam);
  const hasMock = mockNumbers.length > 0;

  if (request.admissionTrack === '수시') {
    if (schoolGradeNumber && schoolGradeNumber <= 2.5) {
      return '수시는 학생부 경쟁력이 있는 편입니다. 실기 배점이 큰 대학과 수능최저 유무를 함께 좁혀봅니다.';
    }

    if (schoolGradeNumber && schoolGradeNumber <= 4) {
      return '수시는 학생부와 실기 균형을 함께 봐야 합니다. 전형별 실기 반영률과 수능최저 부담을 나누어 확인합니다.';
    }

    return '수시 준비생은 내신 평균, 비교과, 수능최저 가능성을 먼저 정리해야 합니다. 희망 대학별 학생부 반영 방식 확인이 우선입니다.';
  }

  if (request.admissionTrack === '정시') {
    if (hasMock && mockNumbers.every((score) => score <= 3)) {
      return '정시는 수능 기반 후보군을 넓게 볼 수 있습니다. 실기 반영률이 높은 대학과 수능 반영 영역 조합을 함께 비교합니다.';
    }

    if (hasMock) {
      return '정시는 수능 보완과 실기 득점 전략을 같이 잡아야 합니다. 반영 영역 수가 적거나 실기 비중이 높은 대학을 우선 비교합니다.';
    }

    return '정시 준비생은 모의고사 등급과 실기 기록을 함께 입력하면 후보 대학을 더 정확히 좁힐 수 있습니다.';
  }

  if (schoolGradeNumber || hasMock) {
    return '수시와 정시 중 한쪽을 확정하기보다, 학생부와 모의고사 중 더 강한 축을 기준으로 전형을 나누어 비교합니다.';
  }

  return '성적 입력이 부족합니다. 내신 평균과 최근 모의고사 등급을 추가하면 수시·정시 우선순위를 더 뚜렷하게 정리할 수 있습니다.';
}

function getPracticalDirection(request) {
  const records = request.practicalRecords;

  if (!records) {
    return '실기 기록이 아직 없어 대학별 종목 기준과 현재 기록의 차이를 계산하기 어렵습니다. 제멀, 왕복달리기, 메디신볼처럼 종목별 기록을 나누어 적어주세요.';
  }

  const jumpRecord = includesAny(records, ['제멀', '제자리멀리', '멀리뛰기'])
    ? firstNumber(records.match(/(?:제멀|제자리멀리뛰기|멀리뛰기)[^\d]*(\d+(?:\.\d+)?)/i)?.[1] || '')
    : undefined;
  const shuttleRecord = includesAny(records, ['10m', '왕복'])
    ? firstNumber(records.match(/(?:10m|왕복)[^\d]*(\d+(?:\.\d+)?)/i)?.[1] || '')
    : undefined;
  const medBallRecord = includesAny(records, ['메디신', 'medicine'])
    ? firstNumber(records.match(/(?:메디신볼|메디신|medicine)[^\d]*(\d+(?:\.\d+)?)/i)?.[1] || '')
    : undefined;

  const comments = [];

  if (jumpRecord) {
    if (jumpRecord >= 270) comments.push('제자리멀리뛰기는 강점으로 활용할 수 있는 기록입니다.');
    else if (jumpRecord >= 240) comments.push('제자리멀리뛰기는 지원 대학 기준표와 비교해 보완 폭을 정해야 합니다.');
    else comments.push('제자리멀리뛰기는 우선 보완 종목으로 잡는 편이 좋습니다.');
  }

  if (shuttleRecord) {
    if (shuttleRecord <= 8.3) comments.push('10m 왕복달리기는 좋은 출발점입니다.');
    else if (shuttleRecord <= 8.9) comments.push('10m 왕복달리기는 스타트와 전환 동작을 중점 보완합니다.');
    else comments.push('10m 왕복달리기는 감점 폭이 커질 수 있어 우선순위를 높입니다.');
  }

  if (medBallRecord) {
    if (medBallRecord >= 10) comments.push('메디신볼은 강점 종목 후보입니다.');
    else comments.push('메디신볼은 상체 파워와 던지는 각도 교정이 필요합니다.');
  }

  if (comments.length) return comments.join(' ');

  return '실기 기록은 입력되었습니다. 대학별 상세 페이지의 종목 기준표와 비교해 강점 종목, 보완 종목, 위험 종목으로 나누어 봅니다.';
}

function getTargetDirection(request, universityMatches = []) {
  if (!request.targetUniversity && !request.targetDepartment) {
    return '희망 대학이 비어 있습니다. 지역별 대학 목록에서 수시/정시 후보군을 3단계로 나누어 적어두면 상담 정확도가 올라갑니다.';
  }

  const target = [request.targetUniversity, request.targetDepartment].filter(Boolean).join(' ');
  if (universityMatches.length) {
    return `${target} 기준으로 연결 가능한 대학 상세 자료를 찾았습니다. 아래 카드에서 수시·정시별 실기 종목과 등급컷·평균등급 확인 항목을 먼저 비교합니다.`;
  }

  return `${target} 기준으로 전형방법, 실기 종목, 등급컷·평균등급 또는 전년도 입결을 먼저 확인합니다. 같은 대학도 수시와 정시의 판단 기준이 다르므로 상세 페이지를 각각 비교합니다.`;
}

function getConditionDirection(request) {
  if (request.injuryNote) {
    return '부상·컨디션 메모가 있어 기록 향상 계획보다 회복 가능 범위와 무리 없는 종목 선택을 먼저 확인합니다.';
  }

  if (request.trainingContext) {
    return '운동 가능 시간이 입력되었습니다. 남은 기간 안에서 기록 상승 폭이 큰 종목부터 훈련 우선순위를 정합니다.';
  }

  return '운동 가능 시간과 컨디션 정보가 부족합니다. 주당 훈련 가능 횟수와 통증 여부를 추가하면 계획을 더 현실적으로 잡을 수 있습니다.';
}

function summarizeInput(value, fallback, maxLength = 120) {
  const text = cleanValue(value).replace(/\s+/g, ' ');
  if (!text) return fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function buildProfileSummary(request, universityMatches = []) {
  const target = [request.targetUniversity, request.targetDepartment].filter(Boolean).join(' · ');
  const gradeContext = [request.schoolGrade, request.mockExam].filter(Boolean).join(' / ');
  const trainingContext = [request.trainingContext, request.injuryNote].filter(Boolean).join(' / ');

  return [
    {
      label: '준비 구분',
      value: `${request.gradeLevel || '학년 미입력'} · ${request.admissionTrack || '공통'}`,
    },
    {
      label: '희망 대학',
      value: summarizeInput(target, '희망 대학 미입력'),
    },
    {
      label: '성적 입력',
      value: summarizeInput(gradeContext, '내신 또는 모의고사 입력 필요'),
    },
    {
      label: '실기 기록',
      value: summarizeInput(request.practicalRecords, '종목별 현재 기록 입력 필요'),
    },
    {
      label: '훈련 조건',
      value: summarizeInput(trainingContext, '운동 가능 시간과 컨디션 입력 필요'),
    },
    {
      label: '연결 자료',
      value: universityMatches.length
        ? `희망 대학 상세 자료 ${universityMatches.length}개 연결`
        : '희망 대학명과 학과를 더 구체화하면 대학 상세 자료를 연결합니다.',
    },
  ];
}

function buildDirectionGuide(request) {
  const trackLabel = request.admissionTrack && request.admissionTrack !== '공통' ? request.admissionTrack : '수시·정시';
  const universityMatches = buildUniversityMatches(request);

  return {
    title: `${trackLabel} 준비 방향 가이드`,
    summary:
      '입력한 성적, 실기 기록, 희망 대학을 기준으로 지금 먼저 확인할 항목을 정리했습니다. 이 가이드는 합격 가능성을 단정하지 않으며, 실제 AI 정밀 상담 도입 전에는 상담 준비용 방향 가이드로 사용합니다.',
    cards: [
      {
        label: '01',
        title: '성적 방향',
        text: getGradeDirection(request),
      },
      {
        label: '02',
        title: '실기 방향',
        text: getPracticalDirection(request),
      },
      {
        label: '03',
        title: '희망 대학 확인',
        text: getTargetDirection(request, universityMatches),
      },
      {
        label: '04',
        title: '훈련·컨디션',
        text: getConditionDirection(request),
      },
    ],
    profileSummary: buildProfileSummary(request, universityMatches),
    universityMatches,
    nextSteps: [
      universityMatches.length
        ? '아래 연결된 대학 상세 페이지에서 같은 대학의 수시·정시 기준을 각각 확인합니다.'
        : '희망 대학을 1순위·대안·안전 후보로 나누어 다시 입력합니다.',
      '대학별 상세 페이지에서 같은 전형의 실기 종목과 등급컷·평균등급 확인 항목을 확인합니다.',
      '현재 기록과 기준 기록의 차이가 큰 종목을 우선 보완합니다.',
      '상담 신청 시 이 입력 내용을 기준으로 최종 지원 방향을 점검하되, 합격 여부를 보장하지 않습니다.',
    ],
  };
}

function buildConsultationSummary(request, guidance) {
  return {
    title: guidance.title,
    summary: guidance.summary,
    target: {
      university: request.targetUniversity,
      department: request.targetDepartment,
      admissionTrack: request.admissionTrack,
      selectedUniversity: request.selectedUniversity,
    },
    profileSummary: guidance.profileSummary || [],
    cards: guidance.cards || [],
    universityMatches: guidance.universityMatches || [],
    nextSteps: guidance.nextSteps || [],
    aiStatus: request.aiStatus,
    generatedAt: new Date().toISOString(),
  };
}

function buildConversationRecord(request, guidance) {
  return {
    recordType: 'peExamAiConsult',
    source: request.source,
    futureAiReady: true,
    student: {
      username: request.username,
      memberName: request.memberName,
      role: request.role,
      gradeLevel: request.gradeLevel,
    },
    target: {
      admissionTrack: request.admissionTrack,
      university: request.targetUniversity,
      department: request.targetDepartment,
      selectedUniversity: request.selectedUniversity,
    },
    academic: {
      schoolGrade: request.schoolGrade,
      mockExam: request.mockExam,
    },
    performance: {
      practicalRecords: request.practicalRecords,
      trainingContext: request.trainingContext,
      injuryNote: request.injuryNote,
    },
    questionFocus: request.questionFocus,
    conversationTurns: [
      {
        role: 'student',
        label: '사전 입력',
        content: [
          request.questionFocus && `상담 목표: ${request.questionFocus}`,
          request.schoolGrade && `내신: ${request.schoolGrade}`,
          request.mockExam && `모의고사/수능: ${request.mockExam}`,
          request.practicalRecords && `실기 기록: ${request.practicalRecords}`,
          request.trainingContext && `운동 조건: ${request.trainingContext}`,
          request.injuryNote && `부상/컨디션: ${request.injuryNote}`,
        ].filter(Boolean).join('\n'),
      },
      {
        role: 'assistant',
        label: '방향 가이드',
        content: [guidance.summary, ...(guidance.cards || []).map((card) => `${card.title}: ${card.text}`)]
          .filter(Boolean)
          .join('\n'),
      },
    ],
    guidance,
    generatedAt: new Date().toISOString(),
  };
}

async function readPayload(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return request.json().catch(() => ({}));
  }

  const formData = await request.formData();
  const payload = {};

  for (const key of new Set(formData.keys())) {
    payload[key] = cleanValue(formData.get(key));
  }

  return payload;
}

function buildRequest(payload = {}, session) {
  const selectedUniversity = buildSelectedUniversity(payload);
  const targetUniversity = cleanLimitedValue(payload.targetUniversity, 160) || selectedUniversity?.displayName || '';
  const practicalRecords = cleanLimitedValue(payload.practicalRecords, 1000);
  const questionFocus = cleanLimitedValue(payload.questionFocus, 1000);

  if (!targetUniversity && !practicalRecords && !questionFocus) {
    const error = new Error('희망 대학, 실기 기록, 상담 목표 중 하나 이상은 입력해주세요.');
    error.status = 400;
    throw error;
  }

  return {
    username: session.sub,
    memberName: session.name,
    role: session.role,
    gradeLevel: cleanLimitedValue(payload.gradeLevel, 40),
    admissionTrack: cleanLimitedValue(payload.admissionTrack, 40) || '공통',
    targetUniversity,
    targetUniversityId: selectedUniversity?.id || cleanLimitedValue(payload.targetUniversityId, 160),
    targetUniversityCode: selectedUniversity?.code || cleanLimitedValue(payload.targetUniversityCode, 40),
    targetUniversityRegion: selectedUniversity?.region || cleanLimitedValue(payload.targetUniversityRegion, 40),
    targetUniversityArea: selectedUniversity?.area || cleanLimitedValue(payload.targetUniversityArea, 80),
    targetUniversitySchoolType: selectedUniversity?.schoolType || cleanLimitedValue(payload.targetUniversitySchoolType, 40),
    targetUniversitySlug: selectedUniversity?.slug || cleanLimitedValue(payload.targetUniversitySlug, 180),
    targetUniversityHref: selectedUniversity?.href || cleanLimitedValue(payload.targetUniversityHref, 240),
    selectedUniversity,
    targetDepartment: cleanLimitedValue(payload.targetDepartment, 160),
    schoolGrade: cleanLimitedValue(payload.schoolGrade, 500),
    mockExam: cleanLimitedValue(payload.mockExam, 500),
    practicalRecords,
    trainingContext: cleanLimitedValue(payload.trainingContext, 1000),
    injuryNote: cleanLimitedValue(payload.injuryNote, 1000),
    questionFocus,
    aiStatus: '방향 가이드 생성',
    source: 'pe-exam-ai-consult',
  };
}

export async function POST(request) {
  const jsonMode = wantsJson(request);
  const sizeCheck = checkRequestBodySize(request, REQUEST_SIZE_LIMITS.medium);
  if (!sizeCheck.ok) return buildRequestTooLargeResponse(sizeCheck.maxBytes);

  const cookieStore = await cookies();
  const session = await verifyAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!session) {
    if (jsonMode) return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    return redirectToLogin(request);
  }

  try {
    const retryAfterSeconds = await checkSharedRequestRateLimit({
      request,
      scope: 'pe-exam-ai-consult-submit',
      identifier: session.sub,
      limit: AI_CONSULT_POST_LIMIT,
      ipLimit: AI_CONSULT_POST_IP_LIMIT,
      windowMs: AI_CONSULT_POST_WINDOW_MS,
    });
    if (retryAfterSeconds) return buildRateLimitResponse(retryAfterSeconds);

    const payload = await readPayload(request);
    const consultRequest = buildRequest(payload, session);
    const guidance = buildDirectionGuide(consultRequest);
    const consultationSummary = buildConsultationSummary(consultRequest, guidance);
    const conversationRecord = buildConversationRecord(consultRequest, guidance);

    if (!isDatabaseConfigured()) {
      if (jsonMode) {
        return NextResponse.json(
          {
            ok: false,
            error: 'DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.',
            guidance,
            setupRequired: true,
          },
        );
      }

      return redirectTo(request, 'setup');
    }

    const result = await savePeExamAiConsultRequest({
      ...consultRequest,
      guidance,
      consultationSummary,
      conversationRecord,
    });
    const backup = await backupPeExamAiConsultToGoogleDrive({
      ...consultRequest,
      id: result.request?.id || result.record?.id,
      guidance,
      consultationSummary,
      conversationRecord,
      databaseAction: result.action,
      savedAt: new Date().toISOString(),
    });

    if (jsonMode) return NextResponse.json({ ok: true, guidance, backup, ...result });

    return redirectTo(request, 'success');
  } catch (error) {
    if (jsonMode) {
      return NextResponse.json(
        { ok: false, error: error?.message || 'AI 상담 사전 입력 저장 중 오류가 발생했습니다.' },
        { status: error?.status || 500 },
      );
    }

    return redirectTo(request, error?.status === 400 ? 'invalid' : 'error');
  }
}

export async function GET(request) {
  const cookieStore = await cookies();
  const session = await verifyAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!session) return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });

  const retryAfterSeconds = await checkSharedRequestRateLimit({
    request,
    scope: 'pe-exam-ai-consult-list',
    identifier: session.sub,
    limit: AI_CONSULT_GET_LIMIT,
    ipLimit: AI_CONSULT_GET_IP_LIMIT,
    windowMs: AI_CONSULT_GET_WINDOW_MS,
  });
  if (retryAfterSeconds) return buildRateLimitResponse(retryAfterSeconds);

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      setupRequired: true,
      error: 'DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.',
      requests: [],
    });
  }

  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || 30);
    const staffRoles = new Set(['owner', 'admin', 'trainer']);
    const requestedUsername = cleanValue(url.searchParams.get('username'));
    const username = staffRoles.has(session.role) ? requestedUsername : session.sub;
    const requests = await listPeExamAiConsultRequests({ limit, username });

    return NextResponse.json({ ok: true, requests, count: requests.length });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'AI 상담 준비 내역 조회 중 오류가 발생했습니다.', requests: [] },
      { status: 500 },
    );
  }
}
