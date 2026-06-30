import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const sourceFiles = [
  {
    file: "app/pe-exam/kusfAdmissionData.ts",
    exportName: "kusfAdmissionSnapshot",
    label: "KUSF 수시",
    getSchools: (snapshot) => snapshot.universities,
  },
  {
    file: "app/pe-exam/kusfAdmissionDetailData.ts",
    exportName: "kusfAdmissionDetailSnapshot",
    label: "KUSF 상세",
    getSchools: (snapshot) =>
      snapshot.admissions.map((admission) => ({
        code: admission.universityCode,
        area: admission.area,
        schoolType: admission.schoolType,
        name: admission.universityName,
        campus: "",
      })),
  },
  {
    file: "app/pe-exam/adigaRegularAdmissionData.ts",
    exportName: "adigaRegularAdmissionSnapshot",
    label: "ADIGA 정시",
    getSchools: (snapshot) => snapshot.universities,
  },
  {
    file: "app/pe-exam/adigaRegularSelectionData.ts",
    exportName: "adigaRegularSelectionSnapshot",
    label: "ADIGA 입결",
    getSchools: (snapshot) => snapshot.universities,
  },
];

const schoolNameAliases = {
  "건국대학교(글로컬)": "건국대학교글로컬캠퍼스",
  건국대학교글로컬: "건국대학교글로컬캠퍼스",
  "고려대학교(세종)": "고려대학교세종캠퍼스",
  고려대학교세종: "고려대학교세종캠퍼스",
  단국대학교: "단국대학교천안캠퍼스",
  "동국대학교(WISE)": "동국대학교WISE캠퍼스",
  동국대학교WISE: "동국대학교WISE캠퍼스",
  상명대학교: "상명대학교천안캠퍼스",
  영산대학교: "영산대학교양산캠퍼스",
  "연세대학교(미래)": "연세대학교미래캠퍼스",
  연세대학교미래: "연세대학교미래캠퍼스",
  우석대학교: "우석대학교진천캠퍼스",
  전남대학교: "전남대학교여수캠퍼스",
  "한양대학교(ERICA)": "한양대학교ERICA캠퍼스",
  한양대학교ERICA: "한양대학교ERICA캠퍼스",
};

function readText(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function parseExportedJson(file, exportName) {
  const text = readText(file);
  const match = text.match(new RegExp(`export const ${exportName} = ([\\s\\S]*?) as const;`));
  if (!match) throw new Error(`Could not find ${exportName} in ${file}`);
  return JSON.parse(match[1]);
}

function parseCatalogTuples() {
  const text = readText("app/pe-exam/peExamData.ts");
  const match = text.match(/const catalogTuples = \[([\s\S]*?)\] as const/);
  if (!match) throw new Error("Could not find catalogTuples in app/pe-exam/peExamData.ts");

  return [...match[1].matchAll(/\["([^"]+)", "([^"]+)", "([^"]+)"\]/g)].map((row, index) => ({
    area: row[1],
    schoolType: row[2],
    name: row[3],
    code: `catalog-${index}`,
  }));
}

function parseManualSupplementalUniversities() {
  const text = readText("app/pe-exam/peExamData.ts");
  const match = text.match(/const manualSupplementalUniversities = \[([\s\S]*?)\n\] as const;/);
  if (!match) return [];

  return [...match[1].matchAll(/code:\s*"([^"]+)"[\s\S]*?area:\s*"([^"]+)"[\s\S]*?schoolType:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"/g)].map(
    (row) => ({
      code: row[1],
      area: row[2],
      schoolType: row[3],
      name: row[4],
    }),
  );
}

function normalizeSchoolName(value) {
  const compact = String(value || "")
    .replace(/\s+/g, "")
    .replace(/본교$/g, "")
    .replace(/[（）]/g, (char) => (char === "（" ? "(" : ")"));

  return schoolNameAliases[compact] || compact.replace(/[()]/g, "");
}

function schoolKey(school) {
  return `${school.area}:${normalizeSchoolName(school.name)}`;
}

function displaySchool(school) {
  return `${school.area} / ${school.schoolType || "학제 확인"} / ${school.name}${school.campus ? ` ${school.campus}` : ""}`;
}

const catalog = parseCatalogTuples();
const manualSupplemental = parseManualSupplementalUniversities();
const catalogByKey = new Map(catalog.map((school) => [schoolKey(school), school]));
const sourceByKey = new Map();
const aliasMatches = [];

for (const sourceFile of sourceFiles) {
  const snapshot = parseExportedJson(sourceFile.file, sourceFile.exportName);
  for (const rawSchool of sourceFile.getSchools(snapshot)) {
    const school = {
      code: rawSchool.code || rawSchool.universityCode || "",
      area: rawSchool.area || "",
      schoolType: rawSchool.schoolType || "",
      name: rawSchool.name || rawSchool.universityName || "",
      campus: rawSchool.campus || "",
    };
    if (!school.area || !school.name) continue;

    const key = schoolKey(school);
    const existing = sourceByKey.get(key);
    if (existing) {
      existing.files.add(sourceFile.label);
      existing.codes.add(school.code);
      continue;
    }

    sourceByKey.set(key, {
      ...school,
      files: new Set([sourceFile.label]),
      codes: new Set([school.code]),
    });

    const catalogSchool = catalogByKey.get(key);
    if (catalogSchool && catalogSchool.name !== school.name) {
      aliasMatches.push({
        source: displaySchool(school),
        catalog: displaySchool(catalogSchool),
      });
    }
  }
}

const missingFromCatalog = [...sourceByKey.values()]
  .filter((school) => !catalogByKey.has(schoolKey(school)))
  .map((school) => ({
    name: school.name,
    area: school.area,
    schoolType: school.schoolType,
    files: [...school.files].join(", "),
    codes: [...school.codes].filter(Boolean).join(", "),
  }))
  .sort((a, b) => a.area.localeCompare(b.area, "ko") || a.name.localeCompare(b.name, "ko"));

const manualCatalogMisses = manualSupplemental.filter((school) => !catalogByKey.has(schoolKey(school)));

console.log("PE exam university coverage audit");
console.log(`- catalogTuples: ${catalog.length} schools`);
console.log(`- source snapshots: ${sourceByKey.size} unique schools after alias normalization`);
console.log(`- manual supplemental: ${manualSupplemental.length ? manualSupplemental.map(displaySchool).join(", ") : "none"}`);
console.log(`- alias matches: ${aliasMatches.length}`);

for (const match of aliasMatches) {
  console.log(`  alias: ${match.source} -> ${match.catalog}`);
}

if (missingFromCatalog.length) {
  console.log("\nUnresolved source schools missing from catalogTuples:");
  for (const school of missingFromCatalog) {
    console.log(`- ${school.area} / ${school.schoolType} / ${school.name} (${school.files}${school.codes ? `, ${school.codes}` : ""})`);
  }
}

if (manualCatalogMisses.length) {
  console.log("\nManual supplemental schools missing from catalogTuples:");
  for (const school of manualCatalogMisses) {
    console.log(`- ${displaySchool(school)} (${school.code})`);
  }
}

if (!missingFromCatalog.length && !manualCatalogMisses.length) {
  console.log("\nOK: no unresolved missing source schools, and manual supplemental schools are in catalogTuples.");
}

if (missingFromCatalog.length || manualCatalogMisses.length) {
  process.exitCode = 1;
}
