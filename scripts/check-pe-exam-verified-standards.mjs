import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const dataPath = path.join(root, 'app/pe-exam/peExamVerifiedStandards.ts');
const source = fs.readFileSync(dataPath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: dataPath,
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const { verifiedPracticalStandards, verifiedPracticalEventOptions } = await import(moduleUrl);

assert.ok(Array.isArray(verifiedPracticalStandards));
assert.ok(verifiedPracticalStandards.length >= 40, 'verified official-standard coverage unexpectedly shrank');
assert.ok(Array.isArray(verifiedPracticalEventOptions));

const allowedOfficialHosts = new Set(['www.knsu.ac.kr', 'ipsi.yongin.ac.kr']);
const allowedTracks = new Set(['early', 'regular']);
const allowedSexes = new Set(['male', 'female', 'all']);
const allowedUnits = new Set(['cm', 'm', 'sec', 'reps']);
const allowedOperators = new Set(['gte', 'lte', 'lt']);
const exactKeys = new Set();

for (const standard of verifiedPracticalStandards) {
  const key = [
    standard.universityCode,
    standard.track,
    standard.admissionYear,
    standard.department,
    standard.eventId,
    standard.sex,
  ].join('|');

  assert.ok(!exactKeys.has(key), `duplicate verified standard: ${key}`);
  exactKeys.add(key);
  assert.match(standard.universityCode, /^\d{7}$/);
  assert.ok(allowedTracks.has(standard.track));
  assert.ok(Number.isInteger(standard.admissionYear) && standard.admissionYear >= 2026);
  assert.ok(standard.department.trim().length >= 2);
  assert.ok(standard.admissionName.trim().length >= 2);
  assert.ok(Number.isFinite(standard.practicalWeightPercent) && standard.practicalWeightPercent > 0);
  assert.ok(standard.eventId.trim().length >= 4);
  assert.ok(standard.eventName.trim().length >= 2);
  assert.ok(standard.protocol.trim().length >= 8);
  assert.ok(allowedSexes.has(standard.sex));
  assert.ok(allowedUnits.has(standard.unit));
  assert.ok(allowedOperators.has(standard.operator));
  assert.ok(Number.isFinite(standard.fullScoreThreshold) && standard.fullScoreThreshold > 0);
  assert.ok(Number.isFinite(standard.fullScorePoints) && standard.fullScorePoints > 0);
  assert.ok(standard.sourceTitle.includes(`${standard.admissionYear}학년도`));
  assert.ok(allowedOfficialHosts.has(new URL(standard.sourceUrl).host));
  assert.ok(String(standard.sourcePage).trim());
  assert.match(standard.sourcePublishedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(standard.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
}

const knsuStandards = verifiedPracticalStandards.filter((item) => item.universityCode === '0000032');
const yonginStandards = verifiedPracticalStandards.filter((item) => item.universityCode === '0000156');
assert.ok(knsuStandards.some((item) => item.eventId === 'knsu-10m-shuttle-40m'));
assert.ok(yonginStandards.some((item) => item.eventId === 'yongin-10m-repeat-80m'));
assert.ok(!knsuStandards.some((item) => item.eventId === 'yongin-10m-repeat-80m'));
assert.ok(!yonginStandards.some((item) => item.eventId === 'knsu-10m-shuttle-40m'));
assert.ok(knsuStandards.some((item) => item.eventId === 'standing-long-jump'));
assert.ok(yonginStandards.some((item) => item.eventId === 'standing-long-jump'));

const clientSource = fs.readFileSync(path.join(root, 'app/pe-exam/PeExamHomeSearchClient.jsx'), 'utf8');
const hubSource = fs.readFileSync(path.join(root, 'app/pe-exam/page.tsx'), 'utf8');
const detailSource = fs.readFileSync(
  path.join(root, 'app/pe-exam/universities/[region]/[track]/[school]/page.tsx'),
  'utf8',
);
const departmentSource = fs.readFileSync(
  path.join(root, 'app/pe-exam/universities/[region]/[track]/[school]/departments/[department]/page.tsx'),
  'utf8',
);
const departmentClientSource = fs.readFileSync(
  path.join(root, 'app/pe-exam/PeExamDepartmentClient.jsx'),
  'utf8',
);
assert.ok(clientSource.includes('성별과 측정 방식이 일치하는 공식 만점표만 계산에 사용합니다.'));
assert.ok(clientSource.includes('getStandardComparison'));
assert.ok(clientSource.includes('recordComparisonActive'));
assert.ok(clientSource.includes('getAcademicComparison'));
assert.ok(clientSource.includes('내 수능 평균 백분위'));
assert.ok(clientSource.includes('내 영어 등급'));
assert.ok(clientSource.includes('70% 값은 합격선이나 합격 확률이 아니며'));
assert.ok(!clientSource.includes('gradeOptions'));
assert.ok(!clientSource.includes('currentRecord'));
assert.ok(hubSource.includes('regularResultReferences'));
assert.ok(hubSource.includes('percentileAverage70'));
assert.ok(hubSource.includes('englishGrade70'));
assert.ok(detailSource.includes('getVerifiedPracticalStandards'));
assert.ok(detailSource.includes('모집단위를 선택해 필요한 정보만 확인하세요'));
assert.ok(departmentSource.includes('getVerifiedPracticalStandards'));
assert.ok(departmentClientSource.includes('공식 실기 만점 기준'));
assert.ok(departmentClientSource.includes('이 수치는 합격 확률이나 합격 판정이 아닙니다.'));

console.log(
  `RePERFORMANCE verified practical standards passed: ${verifiedPracticalStandards.length} rows, ${verifiedPracticalEventOptions.length} protocols.`,
);
