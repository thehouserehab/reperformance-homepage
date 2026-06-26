import fs from "node:fs/promises";
import path from "node:path";

const KUSF_DATA_FILE = path.resolve("app/pe-exam/kusfAdmissionData.ts");
const OUT_FILE = path.resolve("app/pe-exam/adigaRegularAdmissionData.ts");
const SOURCE_URL = "https://www.adiga.kr/ucp/uvt/uni/univRecruitAjax.do";
const SUBJECT_POPUP_URL = "https://www.adiga.kr/ucp/uvt/uni/univRecruitSubjectPopup.do";
const DETAIL_PAGE_URL = "https://www.adiga.kr/ucp/uvt/uni/univDetailRecruit.do";
const SCHOOL_YEAR = "2027";
const RECRUITMENT_TRACK_CODE = "30";
const ARTS_PE_CATEGORY_CODE = "C";
const PE_UNIT_KEYWORDS = [
  "체육",
  "스포츠",
  "운동",
  "건강운동",
  "운동건강",
  "레저",
  "태권",
  "무도",
  "경호",
  "경기",
  "골프",
  "해양스포츠",
  "스키",
  "유도",
  "축구",
  "농구",
  "야구",
  "수영",
  "육상",
  "테니스",
  "무예",
  "레크리에이션",
  "시큐리티",
];

function cleanText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#40;/g, "(")
    .replace(/&#41;/g, ")")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function readAttribute(tag, name) {
  return (String(tag).match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i")) || [])[1] || "";
}

function parseCells(rowHtml) {
  return [...rowHtml.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)].map((cell) => ({
    id: readAttribute(cell[1], "data-id"),
    value: readAttribute(cell[1], "data-value"),
    text: cleanText(cell[2]),
  }));
}

function parseAdmissionRows(html) {
  return [...html.matchAll(/<tr>[\s\S]*?<\/tr>/g)]
    .map((match) => {
      const cells = parseCells(match[0]);
      if (cells.length < 4 || !cells[0].text.includes("예체능")) return null;

      return {
        category: cells[0].text,
        categoryCode: cells[0].value,
        admissionType: cells[1].text,
        admissionTypeCode: cells[1].value,
        admissionName: cells[2].text,
        admissionCode: cells[2].value,
        method: cells[3].text,
        rowId: cells[3].value,
        units: [],
      };
    })
    .filter(Boolean);
}

function parseUnits(html) {
  const listMatch = html.match(/<ul class="univList">([\s\S]*?)<\/ul>/);
  if (!listMatch) return [];

  return [...listMatch[1].matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map((match) => {
      const raw = match[1];
      const quota = (raw.match(/\(([^)]*명)\)/) || [])[1] || "";
      const name = cleanText(raw.replace(/<span[\s\S]*?<\/span>/gi, ""));

      return {
        name,
        quota,
      };
    })
    .filter((unit) => unit.name || unit.quota);
}

function isPeRelatedText(value) {
  const text = String(value || "").replace(/\s+/g, "");
  return PE_UNIT_KEYWORDS.some((keyword) => text.includes(keyword));
}

function hasPositiveQuota(unit) {
  const number = Number(String(unit.quota || "").match(/\d+/)?.[0] || "0");
  return number > 0;
}

async function fetchText(url, options = {}, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "user-agent": "Mozilla/5.0",
          ...(options.headers || {}),
        },
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
      }
    }
  }

  throw lastError;
}

async function fetchRegularAdmissions(university) {
  const body = new URLSearchParams({
    "pagination.currentPage": "1",
    "pagination.cntPerPage": "500",
    searchSyr: SCHOOL_YEAR,
    unvCd: university.code,
    rcmtMmntCd: RECRUITMENT_TRACK_CODE,
    aftCd: ARTS_PE_CATEGORY_CODE,
  });
  const html = await fetchText(SOURCE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
    },
    body,
  });

  return parseAdmissionRows(html);
}

async function fetchUnits(university, admission) {
  const body = new URLSearchParams({
    searchSyr: SCHOOL_YEAR,
    unvCd: university.code,
    aftCd: admission.categoryCode,
    rcmtMmntCd: admission.admissionTypeCode,
    slcnGroupCd: admission.admissionCode,
    ruSn: admission.rowId,
  });
  const html = await fetchText(SUBJECT_POPUP_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
    },
    body,
  });

  return parseUnits(html);
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

function readKusfSnapshot(source) {
  const start = source.indexOf("{");
  const end = source.lastIndexOf(" as const");

  if (start === -1 || end === -1) {
    throw new Error("Unable to parse KUSF snapshot JSON payload.");
  }

  return JSON.parse(source.slice(start, end));
}

function createDetailUrl(universityCode) {
  const params = new URLSearchParams({
    menuId: "PCUVTINF2000",
    searchSyr: SCHOOL_YEAR,
    unvCd: universityCode,
  });

  return `${DETAIL_PAGE_URL}?${params.toString()}`;
}

function createOutput(data) {
  const payload = JSON.stringify(data, null, 2);

  return `// Generated by scripts/fetch-adiga-pe-exam-regular-data.mjs.\n` +
    `// Source: 대입정보포털 어디가 대학 모집인원, ${SCHOOL_YEAR}학년도 정시 예체능계열.\n` +
    `// Do not edit by hand unless the official source is unavailable and the change is documented.\n\n` +
    `export const adigaRegularAdmissionSnapshot = ${payload} as const;\n`;
}

async function main() {
  const kusfSnapshot = readKusfSnapshot(await fs.readFile(KUSF_DATA_FILE, "utf8"));

  const universities = await mapWithConcurrency(kusfSnapshot.universities, 5, async (university) => {
    const admissions = await fetchRegularAdmissions(university);
    const admissionsWithUnits = await mapWithConcurrency(admissions, 8, async (admission) => ({
      ...admission,
      units: await fetchUnits(university, admission),
    }));
    const peAdmissions = admissionsWithUnits
      .map((admission) => ({
        ...admission,
        units: admission.units.filter((unit) => isPeRelatedText(unit.name) && hasPositiveQuota(unit)),
      }))
      .filter(
        (admission) =>
          admission.units.length > 0 ||
          isPeRelatedText(admission.admissionName) ||
          isPeRelatedText(admission.admissionType),
      );

    return {
      code: university.code,
      area: university.area,
      schoolType: university.schoolType,
      name: university.name,
      campus: university.campus,
      track: "정시",
      source: "대입정보포털 어디가 대학 모집인원",
      detailUrl: createDetailUrl(university.code),
      admissions: peAdmissions,
    };
  });

  const data = {
    schoolYear: SCHOOL_YEAR,
    recruitmentTrack: "정시",
    sourceName: "대입정보포털 어디가 대학 모집인원",
    sourceUrl: "https://www.adiga.kr/ucp/uvt/uni/univView.do?menuId=PCUVTINF2000",
    generatedAt: new Date().toISOString(),
    coverageNote:
      "대입정보포털 어디가 대학 모집인원 페이지에서 제공하는 2027학년도 정시 예체능계열 전형방법 중 체육 관련 모집단위로 필터링한 요약입니다. 실기 종목별 기록 기준과 전년도 입결 세부값은 대학별 모집요강 및 ADIGA 평가기준·입시결과 탭으로 별도 검수해야 합니다.",
    universities,
  };

  await fs.writeFile(OUT_FILE, createOutput(data), "utf8");

  const schoolsWithAdmissions = universities.filter((item) => item.admissions.length > 0).length;
  const admissionCount = universities.reduce((sum, item) => sum + item.admissions.length, 0);
  const unitCount = universities.reduce(
    (sum, item) => sum + item.admissions.reduce((admissionSum, admission) => admissionSum + admission.units.length, 0),
    0,
  );

  console.log(`Wrote ${OUT_FILE}`);
  console.log(`${universities.length} universities, ${schoolsWithAdmissions} with regular admissions, ${admissionCount} admission rows, ${unitCount} unit rows`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
