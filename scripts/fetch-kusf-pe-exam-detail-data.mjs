import fs from "node:fs/promises";
import path from "node:path";

const KUSF_DATA_FILE = path.resolve("app/pe-exam/kusfAdmissionData.ts");
const OUT_FILE = path.resolve("app/pe-exam/kusfAdmissionDetailData.ts");
const BASE_URL = "https://info.kusf.or.kr";
const SOURCE_URL =
  "https://info.kusf.or.kr/kusf/portal/bbs/kusfeipetcselctninf/selectEntEtcSelctnList.do";
const SCHOOL_YEAR = "2026";
const CONCURRENCY = 6;
const LIMIT = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || "0");
const DRY_RUN = process.argv.includes("--dry-run");

const PRACTICAL_KEYWORDS = [
  "실기",
  "종목",
  "기록",
  "만점",
  "배점",
  "달리기",
  "멀리뛰기",
  "던지기",
  "윗몸",
  "왕복",
  "배근력",
  "좌전굴",
  "농구",
  "레이업",
  "메디신볼",
  "턱걸이",
  "사이드스텝",
  "지그재그",
  "수영",
  "태권도",
  "유도",
  "검도",
  "골프",
  "축구",
  "배구",
  "차기",
  "품새",
  "겨루기",
  "검사",
  "근력",
];

function readSnapshot(source) {
  const start = source.indexOf("{");
  const end = source.lastIndexOf(" as const");

  if (start === -1 || end === -1) {
    throw new Error("Unable to parse KUSF snapshot JSON payload.");
  }

  return JSON.parse(source.slice(start, end));
}

function cleanText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/<\/(p|div|tr|li|h4|pre|table)>/gi, " / ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#40;/g, "(")
    .replace(/&#41;/g, ")")
    .replace(/<[^>]+>/g, " ")
    .replace(/행 추가\s+행 삭제\s+저장/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSections(html) {
  const sections = [];
  const blockRe =
    /<div class="list_top">\s*<h4>([\s\S]*?)<\/h4>[\s\S]*?(?=<div class="list_top">|<\/div>\s*<!--\s*list_wrap\s*-->|$)/g;

  for (const match of html.matchAll(blockRe)) {
    const heading = cleanText(match[1]);
    const text = cleanText(match[0]).replace(new RegExp(`^${escapeRegExp(heading)}\\s*`), "").trim();
    sections.push({ heading, text });
  }

  return sections;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findSection(sections, heading) {
  return sections.find((section) => section.heading.includes(heading))?.text || "";
}

function clipText(text, keywords, maxLength = 240) {
  const normalized = normalizeSummaryText(text);
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;

  const index = keywords
    .map((keyword) => normalized.indexOf(keyword))
    .filter((item) => item >= 0)
    .sort((a, b) => a - b)[0];

  if (index === undefined) {
    return `${normalized.slice(0, maxLength - 1).trim()}…`;
  }

  const start = Math.max(0, index - 50);
  const end = Math.min(normalized.length, start + maxLength);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < normalized.length ? "…" : "";

  return `${prefix}${normalized.slice(start, end).trim()}${suffix}`;
}

function normalizeSummaryText(text) {
  return cleanText(text)
    .replace(new RegExp(`기준년도\\s*:\\s*${SCHOOL_YEAR}\\s*학년도`, "g"), " ")
    .replace(/전형일정\s+전형일정/g, "전형일정")
    .replace(/전형 요소별 반영비율\s+전형 요소별 반영비율/g, "전형 요소별 반영비율")
    .replace(/학생부 학년별\/요소별 반영비율\s+학생부 학년별\/요소별 반영비율/g, "학생부 학년별/요소별 반영비율")
    .replace(/학생부 교과성적 반영방법\s+학생부 교과성적 반영방법/g, "학생부 교과성적 반영방법")
    .replace(/학생부 없는 자 교과성적 반영방법\s+학생부 없는 자 교과성적 반영방법/g, "학생부 없는 자 교과성적 반영방법")
    .replace(/최저학력기준\s+최저학력기준/g, "최저학력기준")
    .replace(/실기\s+실기/g, "실기")
    .replace(/\s*\/\s*\/+/g, " / ")
    .replace(/^\s*(?:\/\s*)+/, "")
    .replace(/(?:\s*\/)+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPracticalTasks(text) {
  const normalized = cleanText(text);
  const pieces = normalized
    .split(/[,;·ㆍ/]|(?:\s+-\s+)/)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length >= 2 && piece.length <= 48)
    .filter((piece) => PRACTICAL_KEYWORDS.some((keyword) => piece.includes(keyword)))
    .map((piece) => piece.replace(/^실기\s*(유형 및 과제|과제|종목)?\s*/g, "").trim())
    .filter((piece) => !["출제형식", "유형 및 과제 출제형식"].includes(piece))
    .filter((piece) => PRACTICAL_KEYWORDS.some((keyword) => piece.includes(keyword)))
    .filter(Boolean);

  return [...new Set(pieces)].slice(0, 8);
}

function summarizeGradeText(studentRecordText, minimumText) {
  const source = `${studentRecordText} ${minimumText}`;
  const parts = [
    source.includes("석차등급") ? "학생부 석차등급" : "",
    source.includes("석차백분율") || source.includes("백분율") ? "석차백분율 환산" : "",
    source.includes("검정고시") ? "검정고시 비교내신" : "",
    source.includes("수능") || source.includes("최저") ? "수능최저 확인" : "",
  ].filter(Boolean);

  if (parts.length) return parts.slice(0, 4).join(", ");
  if (source.trim()) return "학생부 반영방법 확인";
  return "";
}

function summarizeMinimumText(text) {
  const normalized = normalizeSummaryText(text);
  if (!normalized) return "";
  if (normalized.includes("최저학력기준 없음")) return "수능 최저학력기준 없음";

  const detailMatch = normalized.match(/세부내용\s*\/\s*([^/]{1,80})/);
  if (detailMatch?.[1]) return detailMatch[1].trim();

  const gradeMatch = normalized.match(/[^/]{0,24}등급[^/]{0,32}/);
  if (gradeMatch?.[0]) return gradeMatch[0].trim();

  return "KUSF 상세 기준 수능최저 확인";
}

function createDetailKey(university, admission) {
  const params = admission.detailParams;

  return [
    university.code,
    params.recruitmentCode,
    params.selectionGroupCode,
    params.recruitmentUnitCode,
    params.recruitmentUnitSerial,
    admission.admissionName,
  ].join(":");
}

function createDetailUrl(admission) {
  const params = admission.detailParams;
  const path =
    params.schoolClassCode === "01"
      ? "/kusf/portal/bbs/kusfeipentSelctn/selectEntSelctnTecView.do"
      : "/kusf/portal/bbs/kusfeipentSelctn/selectEntSelctnGnrView.do";
  const query = new URLSearchParams({
    sch_year: params.schoolYear,
    univ_cd: params.universityCode,
    rcrr_cd: params.recruitmentCode,
    selctn_grp_cd: params.selectionGroupCode,
    rcu_cd: params.recruitmentUnitCode,
    rcu_sn: params.recruitmentUnitSerial,
    game_at: "N",
  });

  return `${BASE_URL}${path}?${query.toString()}`;
}

function createTabEndpoints(admission) {
  const prefix = admission.detailParams.schoolClassCode === "01" ? "Tec" : "Gnr";

  return {
    schedule: `${BASE_URL}/kusf/portal/univ/kusfeipentSelctn/tabview/select${prefix}SelScheMthView.do`,
    criteria: `${BASE_URL}/kusf/portal/univ/kusfeipentSelctn/tabview/select${prefix}SlfctrView.do`,
  };
}

function createTabBody(admission) {
  const params = admission.detailParams;

  return new URLSearchParams({
    sch_year: params.schoolYear || SCHOOL_YEAR,
    univ_cd: params.universityCode,
    rcrr_cd: params.recruitmentCode,
    selctn_grp_cd: params.selectionGroupCode,
    rcu_cd: params.recruitmentUnitCode,
    rcu_sn: params.recruitmentUnitSerial,
    sers_cd: "C",
  });
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
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }

  throw lastError;
}

async function fetchAdmissionDetail(university, admission) {
  const endpoints = createTabEndpoints(admission);
  const body = createTabBody(admission);
  const options = {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
    },
    body,
  };
  const [scheduleHtml, criteriaHtml] = await Promise.all([
    fetchText(endpoints.schedule, options),
    fetchText(endpoints.criteria, options),
  ]);
  const scheduleSections = extractSections(scheduleHtml);
  const criteriaSections = extractSections(criteriaHtml);
  const minimumSection = findSection(scheduleSections, "최저학력기준");
  const practicalSection = findSection(criteriaSections, "실기");
  const studentRecordSection = [
    findSection(criteriaSections, "학생부 학년별/요소별 반영비율"),
    findSection(criteriaSections, "학생부 교과성적 반영방법"),
    findSection(criteriaSections, "학생부 없는 자 교과성적 반영방법"),
  ]
    .filter(Boolean)
    .join(" / ");

  return {
    key: createDetailKey(university, admission),
    universityCode: university.code,
    universityName: university.name,
    area: university.area,
    schoolType: university.schoolType,
    unit: admission.unit,
    admissionName: admission.admissionName,
    admissionType: admission.admissionType,
    quota: admission.quota,
    detailUrl: createDetailUrl(admission),
    practicalSummary: clipText(practicalSection, PRACTICAL_KEYWORDS, 180),
    practicalTasks: extractPracticalTasks(practicalSection),
    gradeSummary: summarizeGradeText(studentRecordSection, minimumSection),
    minimumCriteriaSummary: summarizeMinimumText(minimumSection),
    hasPracticalDetail: practicalSection.length > 0,
    hasGradeDetail: studentRecordSection.length > 0 || minimumSection.length > 0,
  };
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

function createOutput(data) {
  const payload = JSON.stringify(data, null, 2);

  return `// Generated by scripts/fetch-kusf-pe-exam-detail-data.mjs.\n` +
    `// Source: KUSF 체육관련학과 대입전형 상세 탭, ${SCHOOL_YEAR}학년도 수시 일반전형.\n` +
    `// Do not edit by hand unless the official source is unavailable and the change is documented.\n\n` +
    `export const kusfAdmissionDetailSnapshot = ${payload} as const;\n`;
}

async function main() {
  const kusfSnapshot = readSnapshot(await fs.readFile(KUSF_DATA_FILE, "utf8"));
  const allAdmissions = kusfSnapshot.universities.flatMap((university) =>
    university.admissions.map((admission) => ({ university, admission })),
  );
  const targets = LIMIT > 0 ? allAdmissions.slice(0, LIMIT) : allAdmissions;

  const details = await mapWithConcurrency(targets, CONCURRENCY, async ({ university, admission }, index) => {
    const detail = await fetchAdmissionDetail(university, admission);
    if ((index + 1) % 100 === 0 || index + 1 === targets.length) {
      console.log(`Fetched ${index + 1}/${targets.length}`);
    }
    return detail;
  });

  const data = {
    schoolYear: SCHOOL_YEAR,
    recruitmentTrack: "수시",
    sourceName: "KUSF 체육관련학과 대입전형 상세",
    sourceUrl: SOURCE_URL,
    generatedAt: new Date().toISOString(),
    coverageNote:
      "KUSF 체육관련학과 대입전형 상세 탭에서 제공하는 2026학년도 수시 일반전형의 전형일정, 전형요소, 실기 과제, 학생부 등급 산출 관련 요약입니다. 종목별 만점 기록표는 대학별 모집요강 PDF에서 추가 확인이 필요할 수 있습니다.",
    admissions: details,
  };

  if (DRY_RUN) {
    console.log(JSON.stringify(data.admissions.slice(0, 3), null, 2));
  } else {
    await fs.writeFile(OUT_FILE, createOutput(data), "utf8");
    console.log(`Wrote ${OUT_FILE}`);
  }

  const practicalCount = details.filter((item) => item.hasPracticalDetail).length;
  const gradeCount = details.filter((item) => item.hasGradeDetail).length;
  console.log(
    `${details.length} admission detail rows, ${practicalCount} with practical details, ${gradeCount} with grade details`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
