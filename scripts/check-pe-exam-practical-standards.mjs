import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const detailPage = read('app/pe-exam/universities/[region]/[track]/[school]/page.tsx');
const detailSnapshot = read('app/pe-exam/kusfAdmissionDetailData.ts');
const homeSearch = read('app/pe-exam/PeExamHomeSearchClient.jsx');
const homePage = read('app/pe-exam/page.tsx');

assert.ok(detailPage.includes('isVerifiedScoringStandard'));
assert.ok(detailPage.includes('normalizedItem.includes(normalizedEvent)'));
assert.ok(detailPage.includes('공식 모집요강 기록표 확인'));
assert.ok(detailPage.includes('종목과 같은 문맥에서 확인된 수치만 표시합니다.'));
assert.ok(!detailPage.includes('item.length > task.length'));
assert.ok(!detailPage.includes('기록 기준 상세'));

assert.ok(
  detailSnapshot.includes('20m왕복달리기(150점)')
    && detailSnapshot.includes('제자리멀리뛰기(150점)')
    && detailSnapshot.includes('윗몸일으키기(100점)'),
  'known KUSF quantitative practical-point evidence must remain in the source snapshot',
);
assert.ok(detailSnapshot.includes('detailUrl'));

assert.ok(homeSearch.includes('합격 여부를 자동 판정하지 않습니다.'));
assert.ok(homeSearch.includes('공식 만점표만 계산에 사용합니다.'));
assert.ok(!homeSearch.includes('getGradeFilterFromText'));
assert.ok(!homeSearch.includes('applyConditionSearch'));
assert.ok(!homeSearch.includes('currentRecord'));
assert.ok(homePage.includes('한국체육대학교: ["한체대", "한국체대", "KNSU"]'));
assert.ok(homePage.includes('{ value: "제자리멀리뛰기", label: "제자리멀리뛰기" }'));

console.log('RePERFORMANCE PE exam practical-standard safety checks passed.');
