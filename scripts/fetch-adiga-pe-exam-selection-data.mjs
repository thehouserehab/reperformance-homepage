import fs from "node:fs/promises";
import path from "node:path";

const REGULAR_DATA_FILE = path.resolve("app/pe-exam/adigaRegularAdmissionData.ts");
const OUT_FILE = path.resolve("app/pe-exam/adigaRegularSelectionData.ts");
const SELECTION_AJAX_URL = "https://www.adiga.kr/uct/acd/ade/criteriaAndResultItemNewAjax.do";
const SELECTION_PAGE_URL = "https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do";
const SOURCE_URL = "https://www.adiga.kr/ucp/uvt/uni/univView.do?menuId=PCUVTINF2000";
const SCHOOL_YEAR = "2027";
const RESULT_YEAR = String(Number(SCHOOL_YEAR) - 1);
const SELECTION_UP_CODE = "40";
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
    .replace(/&quot;/g, "\"")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForMatch(value) {
  return cleanText(value)
    .replace(/\([^)]*\)/g, "")
    .replace(/[\s·ㆍ/,-]/g, "")
    .toLowerCase();
}

function readSnapshot(source) {
  const start = source.indexOf("{");
  const end = source.lastIndexOf(" as const");

  if (start === -1 || end === -1) {
    throw new Error("Unable to parse ADIGA regular admission snapshot JSON payload.");
  }

  return JSON.parse(source.slice(start, end));
}

function createSelectionUrl(universityCode) {
  const params = new URLSearchParams({
    menuId: "PCUVTINF2000",
    searchSyr: SCHOOL_YEAR,
    unvCd: universityCode,
  });

  return `${SELECTION_PAGE_URL}?${params.toString()}`;
}

function getTargetUnitNames(university) {
  return [
    ...new Set(
      university.admissions
        .flatMap((admission) => admission.units.map((unit) => unit.name))
        .map(cleanText)
        .filter(Boolean),
    ),
  ];
}

function isPeRelatedText(value) {
  const text = normalizeForMatch(value);
  return PE_UNIT_KEYWORDS.some((keyword) => text.includes(normalizeForMatch(keyword)));
}

function isTargetUnitRow(row, targetUnits) {
  const rowText = normalizeForMatch(row.join(" "));
  if (isPeRelatedText(rowText)) return true;

  return targetUnits.some((unit) => {
    const normalizedUnit = normalizeForMatch(unit);
    return normalizedUnit && (rowText.includes(normalizedUnit) || normalizedUnit.includes(rowText));
  });
}

function normalizeMetric(value, options = {}) {
  const { zeroIsEmpty = true } = options;
  const text = cleanText(value).replace(/\.0$/, "");
  if (!text || text === "-") return "";
  if (zeroIsEmpty && /^(0|0\.0+)$/.test(cleanText(value))) return "";
  return text;
}

function parseCells(rowHtml) {
  return [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
    .map((cell) => cleanText(cell[1]))
    .filter(Boolean);
}

function isResultRow(cells) {
  if (cells.length < 5) return false;
  if (/구분|모집단위|최초|이월|최종|백분위|환산점수/.test(cells[0])) return false;
  if (!cells[1] || cells[1].includes("모집단위")) return false;
  return cells[0].includes("정시") || cells[0].includes("군") || /\([가-다]\)/.test(cells[0]);
}

function readPercentileGroup(cells, start, size) {
  if (size < 3) {
    return {
      average: "",
      koreanHistoryGrade: "",
      englishGrade: "",
    };
  }

  const averageOffset = size >= 11 ? 8 : size - 3;

  return {
    average: normalizeMetric(cells[start + averageOffset]),
    koreanHistoryGrade: normalizeMetric(cells[start + size - 2]),
    englishGrade: normalizeMetric(cells[start + size - 1]),
  };
}

function parseResultRows(html, targetUnits) {
  const rows = [];
  const blocks = html.split(/<div class="tbAdmRes">/).slice(1);

  for (const block of blocks) {
    const title = cleanText((block.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i) || [])[1]);
    const tableRows = [...block.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => parseCells(match[1]));

    for (const cells of tableRows) {
      if (!isResultRow(cells) || !isTargetUnitRow(cells, targetUnits)) continue;

      const note = cells.find((cell) => cell.includes("미제출 사유")) || "";
      const scoreGroupSize = Math.floor(Math.max(0, cells.length - 9) / 2);
      const percentile50 = readPercentileGroup(cells, 9, scoreGroupSize);
      const percentile70 = readPercentileGroup(cells, 9 + scoreGroupSize, scoreGroupSize);
      const row = {
        title,
        group: cells[0] || "",
        unit: cells[1] || "",
        quotaInitial: normalizeMetric(cells[2], { zeroIsEmpty: false }),
        quotaCarryover: normalizeMetric(cells[3], { zeroIsEmpty: false }),
        quotaFinal: normalizeMetric(cells[4], { zeroIsEmpty: false }),
        competitionRate: normalizeMetric(cells[5]),
        additionalPasses: normalizeMetric(cells[6], { zeroIsEmpty: false }),
        convertedScore50: normalizeMetric(cells[7]),
        convertedScore70: normalizeMetric(cells[8]),
        percentileAverage50: percentile50.average,
        koreanHistoryGrade50: percentile50.koreanHistoryGrade,
        englishGrade50: percentile50.englishGrade,
        percentileAverage70: percentile70.average,
        koreanHistoryGrade70: percentile70.koreanHistoryGrade,
        englishGrade70: percentile70.englishGrade,
        note,
      };

      rows.push(row);
    }
  }

  return rows;
}

function trimSnippet(value, maxLength = 150) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function snippetAround(text, needle, radius = 95) {
  const index = text.indexOf(needle);
  if (index === -1) return "";

  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + needle.length + radius);
  return trimSnippet(text.slice(start, end));
}

function extractRegularCriteriaText(html) {
  const start = html.indexOf('id="con_41"');
  if (start === -1) return "";

  const nextAccordion = html.indexOf('<li class="accordionItem"', start + 1);
  const scriptStart = html.indexOf("<script>", start + 1);
  const endCandidates = [nextAccordion, scriptStart].filter((index) => index > start);
  const end = endCandidates.length ? Math.min(...endCandidates) : Math.min(html.length, start + 30000);

  return cleanText(html.slice(start, end));
}

function extractCriteriaHighlights(html, targetUnits) {
  const text = extractRegularCriteriaText(html);
  if (!text) return [];

  const unitHighlights = targetUnits
    .map((unit) => snippetAround(text, unit))
    .filter(Boolean);
  const patterns = [
    /수능성적 산출방법.{0,160}/,
    /성적 반영 방법\s*:\s*.{1,120}/,
    /영어\s*\/\s*한국사.{0,130}/,
    /백분위.{0,130}/,
  ];
  const highlights = [...unitHighlights];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) highlights.push(trimSnippet(match[0]));
  }

  return [...new Set(highlights)].slice(0, 4);
}

function buildResultHighlight(row) {
  if (row.note) return `${row.unit}: ${row.note}`;

  const parts = [
    row.group,
    row.quotaFinal ? `최종 ${row.quotaFinal}명` : "",
    row.competitionRate ? `경쟁률 ${row.competitionRate}:1` : "",
    row.percentileAverage70
      ? `70% 평균백분위 ${row.percentileAverage70}`
      : row.percentileAverage50
        ? `50% 평균백분위 ${row.percentileAverage50}`
        : "",
    row.englishGrade70 ? `영어 ${row.englishGrade70}등급` : row.englishGrade50 ? `영어 ${row.englishGrade50}등급` : "",
  ].filter(Boolean);

  return `${row.unit}: ${parts.join(", ")}`;
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

async function fetchSelectionAjax(university) {
  const body = new URLSearchParams({
    searchSyr: SCHOOL_YEAR,
    unvCd: university.code,
    tsrdCmphSlcnArtclUpCd: SELECTION_UP_CODE,
    compUnvCd: "",
  });

  return fetchText(SELECTION_AJAX_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
    },
    body,
  });
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

async function fetchUniversitySelection(university) {
  const targetUnits = getTargetUnitNames(university);
  const selectionUrl = createSelectionUrl(university.code);
  const [selectionHtml, resultHtml] = await Promise.all([fetchText(selectionUrl), fetchSelectionAjax(university)]);
  const resultRows = parseResultRows(resultHtml, targetUnits).slice(0, 8);
  const criteriaHighlights = extractCriteriaHighlights(selectionHtml, targetUnits);

  return {
    code: university.code,
    area: university.area,
    schoolType: university.schoolType,
    name: university.name,
    campus: university.campus,
    track: "정시",
    source: "대입정보포털 어디가 평가기준·입시결과",
    selectionUrl,
    targetUnits,
    hasCriteria: criteriaHighlights.length > 0,
    hasResultTable: resultRows.length > 0,
    resultRows,
    resultHighlights: resultRows.map(buildResultHighlight).slice(0, 4),
    criteriaHighlights,
  };
}

function createOutput(data) {
  const payload = JSON.stringify(data, null, 2);

  return `// Generated by scripts/fetch-adiga-pe-exam-selection-data.mjs.\n` +
    `// Source: 대입정보포털 어디가 평가기준·입시결과, ${SCHOOL_YEAR}학년도 정시 수능위주전형.\n` +
    `// Do not edit by hand unless the official source is unavailable and the change is documented.\n\n` +
    `export const adigaRegularSelectionSnapshot = ${payload} as const;\n`;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const codeArg = process.argv.find((arg) => arg.startsWith("--code="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
  const code = codeArg ? codeArg.split("=")[1] : "";
  const regularSnapshot = readSnapshot(await fs.readFile(REGULAR_DATA_FILE, "utf8"));
  let universities = regularSnapshot.universities.filter((university) => university.admissions.length > 0);

  if (code) universities = universities.filter((university) => university.code === code);
  if (limit) universities = universities.slice(0, limit);

  const selections = await mapWithConcurrency(universities, 4, async (university, index) => {
    const selection = await fetchUniversitySelection(university);
    console.log(
      `[${index + 1}/${universities.length}] ${selection.name}: results ${selection.resultRows.length}, criteria ${selection.criteriaHighlights.length}`,
    );
    return selection;
  });

  const data = {
    schoolYear: SCHOOL_YEAR,
    resultYear: RESULT_YEAR,
    recruitmentTrack: "정시",
    sourceName: "대입정보포털 어디가 평가기준·입시결과",
    sourceUrl: SOURCE_URL,
    generatedAt: new Date().toISOString(),
    coverageNote:
      "대입정보포털 어디가 평가기준·입시결과 페이지에서 제공하는 2027학년도 정시 수능위주전형 평가기준과 2026학년도 전형 결과 표 중 체육 관련 모집단위를 요약했습니다. 표 원문은 대학별 ADIGA 공식 탭에서 반드시 재확인해야 합니다.",
    universities: selections,
  };

  if (dryRun) {
    console.log(JSON.stringify(data.universities.slice(0, 2), null, 2));
    return;
  }

  await fs.writeFile(OUT_FILE, createOutput(data), "utf8");

  const schoolsWithResults = selections.filter((item) => item.hasResultTable).length;
  const resultRowCount = selections.reduce((sum, item) => sum + item.resultRows.length, 0);
  const schoolsWithCriteria = selections.filter((item) => item.hasCriteria).length;

  console.log(`Wrote ${OUT_FILE}`);
  console.log(
    `${selections.length} universities, ${schoolsWithResults} with PE result rows, ${resultRowCount} result rows, ${schoolsWithCriteria} with criteria highlights`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
