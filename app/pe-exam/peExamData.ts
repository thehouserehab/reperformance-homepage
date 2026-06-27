type CatalogTuple = readonly [area: string, schoolType: string, name: string];

import { kusfAdmissionSnapshot } from "./kusfAdmissionData";
import { kusfAdmissionDetailSnapshot } from "./kusfAdmissionDetailData";
import { adigaRegularAdmissionSnapshot } from "./adigaRegularAdmissionData";
import { adigaRegularSelectionSnapshot } from "./adigaRegularSelectionData";

const catalogTuples = [
  ["경남", "4년제", "가야대학교"],
  ["경기", "4년제", "가천대학교"],
  ["강원", "4년제", "가톨릭관동대학교"],
  ["경기", "4년제", "강남대학교"],
  ["충북", "2,3년제", "강동대학교"],
  ["강원", "2,3년제", "강릉영동대학교"],
  ["강원", "4년제", "강원대학교"],
  ["강원", "4년제", "강원대학교 제2캠퍼스"],
  ["강원", "2,3년제", "강원도립대학교"],
  ["충북", "4년제", "건국대학교 글로컬캠퍼스"],
  ["충남", "4년제", "건양대학교"],
  ["경기", "4년제", "경기대학교"],
  ["경남", "4년제", "경남대학교"],
  ["경남", "2,3년제", "경남도립거창대학"],
  ["부산", "2,3년제", "경남정보대학교"],
  ["경기", "4년제", "경동대학교"],
  ["경기", "2,3년제", "경민대학교"],
  ["경북", "2,3년제", "경북과학대학교"],
  ["대구", "4년제", "경북대학교"],
  ["경북", "4년제", "경북대학교 상주캠퍼스"],
  ["경남", "4년제", "경상국립대학교"],
  ["부산", "4년제", "경성대학교"],
  ["경북", "4년제", "경운대학교"],
  ["인천", "2,3년제", "경인여자대학교"],
  ["경북", "4년제", "경일대학교"],
  ["경기", "4년제", "경희대학교 국제캠퍼스"],
  ["대구", "4년제", "계명대학교"],
  ["대구", "2,3년제", "계명문화대학교"],
  ["전남", "2,3년제", "고구려대학교"],
  ["세종", "4년제", "고려대학교 세종캠퍼스"],
  ["부산", "4년제", "고신대학교"],
  ["전남", "2,3년제", "광양보건대학교"],
  ["광주", "4년제", "광주대학교"],
  ["광주", "2,3년제", "광주보건대학교"],
  ["광주", "4년제", "광주여자대학교"],
  ["경북", "2,3년제", "구미대학교"],
  ["강원", "4년제", "국립강릉원주대학교"],
  ["경북", "4년제", "국립경국대학교"],
  ["충남", "4년제", "국립공주대학교"],
  ["전북", "4년제", "국립군산대학교"],
  ["전남", "4년제", "국립목포대학교"],
  ["전남", "4년제", "국립목포해양대학교"],
  ["부산", "4년제", "국립부경대학교"],
  ["전남", "4년제", "국립순천대학교"],
  ["경남", "4년제", "국립창원대학교"],
  ["충북", "4년제", "국립한국교통대학교"],
  ["부산", "4년제", "국립한국해양대학교"],
  ["서울", "4년제", "국민대학교"],
  ["경기", "2,3년제", "국제대학교"],
  ["전북", "2,3년제", "군장대학교"],
  ["충북", "4년제", "극동대학교"],
  ["경북", "4년제", "김천대학교"],
  ["경기", "2,3년제", "김포대학교"],
  ["충남", "4년제", "나사렛대학교"],
  ["광주", "4년제", "남부대학교"],
  ["충남", "4년제", "남서울대학교"],
  ["경기", "4년제", "단국대학교"],
  ["충남", "4년제", "단국대학교 천안캠퍼스"],
  ["경북", "2,3년제", "대경대학교"],
  ["경북", "4년제", "대구가톨릭대학교"],
  ["대구", "2,3년제", "대구공업대학교"],
  ["대구", "2,3년제", "대구과학대학교"],
  ["경북", "4년제", "대구대학교"],
  ["대구", "2,3년제", "대구보건대학교"],
  ["경북", "4년제", "대구한의대학교"],
  ["대전", "2,3년제", "대덕대학교"],
  ["경기", "2,3년제", "대림대학교"],
  ["충북", "2,3년제", "대원대학교"],
  ["대전", "2,3년제", "대전과학기술대학교"],
  ["대전", "4년제", "대전대학교"],
  ["대전", "2,3년제", "대전보건대학교"],
  ["경기", "4년제", "대진대학교"],
  ["광주", "2,3년제", "동강대학교"],
  ["서울", "4년제", "동국대학교"],
  ["경북", "4년제", "동국대학교 WISE캠퍼스"],
  ["서울", "4년제", "동덕여자대학교"],
  ["부산", "4년제", "동명대학교"],
  ["부산", "4년제", "동서대학교"],
  ["경기", "2,3년제", "동서울대학교"],
  ["전남", "4년제", "동신대학교"],
  ["부산", "4년제", "동아대학교"],
  ["경북", "4년제", "동양대학교"],
  ["경남", "2,3년제", "동원과학기술대학교"],
  ["경기", "2,3년제", "동원대학교"],
  ["부산", "2,3년제", "동의과학대학교"],
  ["부산", "4년제", "동의대학교"],
  ["경기", "2,3년제", "두원공과대학교"],
  ["경남", "2,3년제", "마산대학교"],
  ["서울", "2,3년제", "명지전문대학"],
  ["대전", "4년제", "목원대학교"],
  ["전남", "2,3년제", "목포과학대학교"],
  ["경북", "2,3년제", "문경대학교"],
  ["대전", "4년제", "배재대학교"],
  ["충남", "4년제", "백석대학교"],
  ["충남", "2,3년제", "백석문화대학교"],
  ["부산", "2,3년제", "부산경상대학교"],
  ["부산", "2,3년제", "부산과학기술대학교"],
  ["부산", "4년제", "부산대학교"],
  ["부산", "2,3년제", "부산보건대학교"],
  ["부산", "2,3년제", "부산여자대학교"],
  ["부산", "2,3년제", "부산예술대학교"],
  ["부산", "4년제", "부산외국어대학교"],
  ["경기", "2,3년제", "부천대학교"],
  ["서울", "4년제", "삼육대학교"],
  ["서울", "4년제", "상명대학교"],
  ["충남", "4년제", "상명대학교 천안캠퍼스"],
  ["강원", "4년제", "상지대학교"],
  ["서울", "4년제", "서울과학기술대학교"],
  ["서울", "4년제", "서울기독대학교"],
  ["서울", "4년제", "서울대학교"],
  ["서울", "4년제", "서울시립대학교"],
  ["서울", "4년제", "서울여자대학교"],
  ["충북", "4년제", "서원대학교"],
  ["서울", "2,3년제", "서일대학교"],
  ["충남", "4년제", "선문대학교"],
  ["경기", "4년제", "성결대학교"],
  ["경기", "4년제", "성균관대학교 수원캠퍼스"],
  ["서울", "4년제", "성신여자대학교"],
  ["강원", "2,3년제", "세경대학교"],
  ["충북", "4년제", "세명대학교"],
  ["전남", "4년제", "세한대학교"],
  ["강원", "2,3년제", "송곡대학교"],
  ["광주", "4년제", "송원대학교"],
  ["대구", "2,3년제", "수성대학교"],
  ["경기", "2,3년제", "수원과학대학교"],
  ["경기", "4년제", "수원대학교"],
  ["경기", "2,3년제", "수원여자대학교"],
  ["서울", "4년제", "숙명여자대학교"],
  ["충남", "4년제", "순천향대학교"],
  ["경북", "4년제", "신경주대학교"],
  ["경기", "2,3년제", "신구대학교"],
  ["부산", "4년제", "신라대학교"],
  ["충남", "2,3년제", "신성대학교"],
  ["경기", "2,3년제", "신안산대학교"],
  ["경기", "4년제", "신한대학교"],
  ["경북", "2,3년제", "안동과학대학교"],
  ["경기", "2,3년제", "안산대학교"],
  ["인천", "4년제", "안양대학교"],
  ["경기", "2,3년제", "여주대학교"],
  ["경기", "2,3년제", "연성대학교"],
  ["강원", "4년제", "연세대학교 미래캠퍼스"],
  ["경북", "4년제", "영남대학교"],
  ["대구", "2,3년제", "영남이공대학교"],
  ["부산", "4년제", "영산대학교"],
  ["경남", "4년제", "영산대학교 양산캠퍼스"],
  ["대구", "2,3년제", "영진전문대학교"],
  ["전북", "4년제", "예원예술대학교"],
  ["경기", "2,3년제", "오산대학교"],
  ["경기", "4년제", "용인대학교"],
  ["경기", "2,3년제", "용인예술과학대학교"],
  ["전북", "4년제", "우석대학교"],
  ["충북", "4년제", "우석대학교 진천캠퍼스"],
  ["대전", "4년제", "우송대학교"],
  ["울산", "2,3년제", "울산과학대학교"],
  ["울산", "4년제", "울산대학교"],
  ["전북", "4년제", "원광대학교"],
  ["경북", "4년제", "위덕대학교"],
  ["충북", "4년제", "유원대학교"],
  ["서울", "4년제", "이화여자대학교"],
  ["경남", "4년제", "인제대학교"],
  ["인천", "4년제", "인천대학교"],
  ["인천", "2,3년제", "인천재능대학교"],
  ["인천", "2,3년제", "인하공업전문대학"],
  ["인천", "4년제", "인하대학교"],
  ["경기", "2,3년제", "장안대학교"],
  ["전남", "2,3년제", "전남과학대학교"],
  ["광주", "4년제", "전남대학교"],
  ["전남", "4년제", "전남대학교 여수캠퍼스"],
  ["전북", "2,3년제", "전주기전대학"],
  ["전북", "4년제", "전주대학교"],
  ["전북", "2,3년제", "전주비전대학교"],
  ["제주", "2,3년제", "제주관광대학교"],
  ["제주", "4년제", "제주국제대학교"],
  ["제주", "4년제", "제주대학교"],
  ["제주", "2,3년제", "제주한라대학교"],
  ["광주", "4년제", "조선대학교"],
  ["광주", "2,3년제", "조선이공대학교"],
  ["충남", "4년제", "중부대학교"],
  ["서울", "4년제", "중앙대학교"],
  ["충북", "4년제", "중원대학교"],
  ["전남", "2,3년제", "청암대학교"],
  ["충남", "4년제", "청운대학교"],
  ["충북", "4년제", "청주대학교"],
  ["울산", "2,3년제", "춘해보건대학교"],
  ["대전", "4년제", "충남대학교"],
  ["충북", "2,3년제", "충북보건과학대학교"],
  ["충북", "2,3년제", "충청대학교"],
  ["경기", "4년제", "칼빈대학교"],
  ["경기", "4년제", "한경국립대학교"],
  ["강원", "2,3년제", "한국골프과학기술대학교"],
  ["충북", "4년제", "한국교원대학교"],
  ["서울", "4년제", "한국외국어대학교"],
  ["서울", "4년제", "한국체육대학교"],
  ["대전", "4년제", "한남대학교"],
  ["강원", "4년제", "한라대학교"],
  ["강원", "4년제", "한림대학교"],
  ["강원", "2,3년제", "한림성심대학교"],
  ["충남", "4년제", "한서대학교"],
  ["경기", "4년제", "한신대학교"],
  ["서울", "4년제", "한양대학교"],
  ["경기", "4년제", "한양대학교 ERICA캠퍼스"],
  ["서울", "2,3년제", "한양여자대학교"],
  ["전북", "4년제", "한일장신대학교"],
  ["광주", "4년제", "호남대학교"],
  ["충남", "4년제", "호서대학교"],
  ["전북", "4년제", "호원대학교"],
  ["경기", "4년제", "화성의과학대학교"],
] as const satisfies readonly CatalogTuple[];

const regionMap: Record<string, string> = {
  서울: "수도권",
  경기: "수도권",
  인천: "수도권",
  강원: "강원·제주권",
  제주: "강원·제주권",
  충북: "충청권",
  충남: "충청권",
  대전: "충청권",
  세종: "충청권",
  전북: "전라권",
  전남: "전라권",
  광주: "전라권",
  경북: "경상권",
  경남: "경상권",
  대구: "경상권",
  부산: "경상권",
  울산: "경상권",
};

export const admissionTimeline2026 = [
  {
    period: "2026.07.06 - 07.10",
    title: "재외국민·외국인 특별전형 원서접수",
    text: "일부 대학은 수시보다 먼저 특별전형 접수를 진행합니다. 해당 학생은 대학별 모집요강을 별도로 확인합니다.",
  },
  {
    period: "2026.09.07 - 09.11",
    title: "수시 원서접수",
    text: "대학별로 3일 이상 접수합니다. 체육계열은 실기고사 일정과 제출 서류를 함께 확인해야 합니다.",
  },
  {
    period: "2026.09.12 - 12.17",
    title: "수시 전형기간",
    text: "학생부, 면접, 실기고사, 서류평가가 대학별 일정에 따라 진행됩니다.",
  },
  {
    period: "2026.11.19",
    title: "2027학년도 대학수학능력시험",
    text: "정시 지원자는 수능 성적과 실기 반영 비율을 함께 확인합니다. 성적 통지는 2026.12.11 예정입니다.",
  },
  {
    period: "2026.12.18 - 12.30",
    title: "수시 합격·등록·충원 흐름",
    text: "수시 합격자 발표, 등록, 미등록 충원 일정이 이어집니다. 복수 합격자는 등록 기준을 반드시 확인합니다.",
  },
  {
    period: "2027.01.04 - 01.07",
    title: "정시 원서접수",
    text: "가·나·다군 지원 조합, 수능 반영 영역, 실기 종목과 배점을 함께 확인합니다.",
  },
] as const;

export const sourceLinks = [
  {
    label: "한국대학교육협의회",
    href: "https://www.kcue.or.kr/news/sub02/sub01.php?at=view&idx=2764653",
    text: "2027학년도 대입전형 시행계획 발표 자료",
  },
  {
    label: "대입정보포털 어디가",
    href: "https://www.adiga.kr/man/inf/mainView.do",
    text: "대학·학과·전형 검색과 모집요강 확인",
  },
  {
    label: "KUSF 체육특기자대입포털",
    href: "https://info.kusf.or.kr/kusf/portal/bbs/kusfeipetcselctninf/selectEntEtcSelctnList.do",
    text: "체육관련학과 대학 목록과 종목별 대입 정보 확인",
  },
  {
    label: "EBSi 대입정보",
    href: "https://www.ebsi.co.kr/ebs/ent/enta/retrieveUnivEntOperPnt.ebs",
    text: "학년도별 시행계획과 수시·정시 자료 확인",
  },
] as const;

export const universityCatalog = catalogTuples.map(([area, schoolType, name], index) => ({
  id: `${area}-${name}-${index}`,
  area,
  schoolType,
  name,
  region: regionMap[area] || "기타",
}));

export const catalogMeta = {
  count: universityCatalog.length,
  source: "KUSF 체육특기자대입포털 2026학년도 체육관련학과 대학 목록 기준",
  note: "대학별 실기 종목, 기록 기준, 등급·입결은 매년 모집요강에서 바뀔 수 있어 공식 모집요강 확인을 우선합니다.",
};

export const regionFilters = ["전체", "수도권", "강원·제주권", "충청권", "전라권", "경상권"] as const;

export type PeExamRegionName = Exclude<(typeof regionFilters)[number], "전체">;

export const peExamRegionSlugs = {
  수도권: "capital",
  "강원·제주권": "gangwon-jeju",
  충청권: "chungcheong",
  전라권: "jeolla",
  경상권: "gyeongsang",
} as const satisfies Record<PeExamRegionName, string>;

export const peExamRegionNames = Object.keys(peExamRegionSlugs) as PeExamRegionName[];

export function getPeExamRegionHref(region: PeExamRegionName) {
  return `/pe-exam/universities/${peExamRegionSlugs[region]}`;
}

export const peExamAdmissionTracks = [
  {
    key: "early",
    label: "수시",
    studentLabel: "수시 준비생",
    sourceLabel: "KUSF 수시",
    sourceDescription: "2026학년도 수시 일반전형 기준",
  },
  {
    key: "regular",
    label: "정시",
    studentLabel: "정시 준비생",
    sourceLabel: "ADIGA 정시",
    sourceDescription: "2027학년도 정시 예체능계열 기준",
  },
] as const;

export type PeExamAdmissionTrackKey = (typeof peExamAdmissionTracks)[number]["key"];

export function getPeExamAdmissionTrackBySlug(slug: string) {
  return peExamAdmissionTracks.find((track) => track.key === slug);
}

export function getPeExamRegionTrackHref(region: PeExamRegionName, track: PeExamAdmissionTrackKey) {
  return `${getPeExamRegionHref(region)}/${track}`;
}

export function getPeExamRegionNameBySlug(slug: string) {
  return peExamRegionNames.find((region) => peExamRegionSlugs[region] === slug);
}

const regionOverviewCopy: Record<PeExamRegionName, string> = {
  수도권: "서울, 경기, 인천권 대학을 묶어 이동 거리와 지원 조합을 함께 보기 좋은 권역입니다.",
  "강원·제주권": "강원과 제주 지역 대학을 한 화면에서 확인해 지역 이동, 실기 일정, 모집군을 비교합니다.",
  충청권: "충북, 충남, 대전, 세종 대학을 묶어 수도권 인접 지원과 지역 거점 대학을 함께 봅니다.",
  전라권: "전북, 전남, 광주권 대학의 체육계열 모집 흐름과 수시·정시 확인 지점을 정리합니다.",
  경상권: "경북, 경남, 대구, 부산, 울산권 대학을 넓게 묶어 지역별 선택지를 빠르게 훑습니다.",
};

function uniqueItems(items: readonly string[]) {
  return [...new Set(items)].filter(Boolean);
}

function normalizeSchoolName(value: string) {
  return value.replace(/\s+/g, "").replace(/본교$/g, "");
}

function getSchoolDisplayName(school: { readonly name: string; readonly campus?: string }) {
  return `${school.name}${school.campus ? ` ${school.campus}` : ""}`;
}

function hasMatchingDetailSchool(
  catalogSchool: (typeof universityCatalog)[number],
  detailSchools: readonly { readonly area: string; readonly name: string; readonly campus?: string }[],
) {
  const catalogName = normalizeSchoolName(catalogSchool.name);

  return detailSchools.some((school) => {
    if (school.area !== catalogSchool.area) return false;

    const detailName = normalizeSchoolName(getSchoolDisplayName(school));
    return detailName === catalogName || detailName.includes(catalogName) || catalogName.includes(detailName);
  });
}

export const universityRegionGroups = peExamRegionNames.map((region) => ({
  region,
  universities: universityCatalog.filter((item) => item.region === region),
}));

function getPracticalSummary(elementSummary: string) {
  const practicalMatch = elementSummary.match(/실기\s*:\s*\d+/);
  if (practicalMatch) return `실기 반영 확인: ${practicalMatch[0]}`;
  if (elementSummary.includes("실기")) return `실기 반영 포함: ${elementSummary}`;
  return "KUSF 요약 기준 실기 반영 항목 없음";
}

function getGradeSummary(elementSummary: string) {
  const studentRecordMatch = elementSummary.match(/학생부\s*:\s*\d+/);
  const csatMatch = elementSummary.match(/수능\s*:\s*\d+/);
  const documentMatch = elementSummary.match(/서류\s*:\s*\d+/);
  const parts = [studentRecordMatch?.[0], csatMatch?.[0], documentMatch?.[0]].filter(Boolean);

  if (parts.length) return `${parts.join(", ")} 기준으로 내신·수능·서류 위치 확인`;
  return "등급·입결은 대학별 입결 자료와 모집요강에서 별도 확인";
}

function summarizeKusfGradeDetail(
  detail: (typeof kusfAdmissionDetailSnapshot.admissions)[number] | undefined,
  elementSummary: string,
) {
  if (!detail?.hasGradeDetail) return getGradeSummary(elementSummary);

  const source = `${detail.gradeSummary} ${detail.minimumCriteriaSummary}`;
  const parts = [
    source.includes("석차등급") ? "학생부 석차등급" : "",
    source.includes("석차백분율") || source.includes("백분율") ? "석차백분율 환산" : "",
    source.includes("검정고시") ? "검정고시 비교내신" : "",
    source.includes("수능") || source.includes("최저") ? "수능최저 확인" : "",
  ].filter(Boolean);

  if (parts.length) return `KUSF 상세 기준: ${parts.slice(0, 4).join(", ")}`;
  return "KUSF 상세 기준 학생부 반영방법 확인";
}

function summarizeMinimumCriteria(detail: (typeof kusfAdmissionDetailSnapshot.admissions)[number] | undefined) {
  const text = detail?.minimumCriteriaSummary || "";
  if (!text) return "";
  if (text.includes("최저학력기준 없음")) return "수능 최저학력기준 없음";

  const detailMatch = text.match(/세부내용\s*\/\s*([^/]{1,90})/);
  if (detailMatch?.[1]) return detailMatch[1].trim();

  const gradeMatch = text.match(/[^/]{0,30}등급[^/]{0,40}/);
  if (gradeMatch?.[0]) return gradeMatch[0].trim();

  return "KUSF 상세 기준 수능최저 확인";
}

function summarizePracticalDetail(
  detail: (typeof kusfAdmissionDetailSnapshot.admissions)[number] | undefined,
  elementSummary: string,
) {
  if (!detail?.practicalSummary) return getPracticalSummary(elementSummary);

  return `KUSF 상세 기준: ${detail.practicalSummary}`;
}

function createKusfDetailKey(
  school: (typeof kusfAdmissionSnapshot.universities)[number],
  admission: (typeof kusfAdmissionSnapshot.universities)[number]["admissions"][number],
) {
  return [
    school.code,
    admission.detailParams.recruitmentCode,
    admission.detailParams.selectionGroupCode,
    admission.detailParams.recruitmentUnitCode,
    admission.detailParams.recruitmentUnitSerial,
    admission.admissionName,
  ].join(":");
}

function getRegularPracticalSummary(method: string) {
  const practicalMatch = method.match(/실기\s*:\s*\d+/);
  if (practicalMatch) return `ADIGA 정시 전형방법 기준 ${practicalMatch[0]} 반영`;
  if (method.includes("실기")) return `실기 반영 포함: ${method}`;
  return "ADIGA 정시 전형방법 기준 실기 반영 항목 없음";
}

function getRegularGradeSummary(
  method: string,
  selectionDetail?: (typeof adigaRegularSelectionSnapshot.universities)[number],
) {
  if (selectionDetail?.resultHighlights[0]) return `ADIGA 입시결과 요약: ${selectionDetail.resultHighlights[0]}`;
  if (selectionDetail?.criteriaHighlights[0]) return `ADIGA 평가기준 요약: ${selectionDetail.criteriaHighlights[0]}`;

  const studentRecordMatch = method.match(/학생부\s*:\s*\d+/);
  const csatMatch = method.match(/수능\s*:\s*\d+/);
  const documentMatch = method.match(/서류\s*:\s*\d+/);
  const interviewMatch = method.match(/면접\s*:\s*\d+/);
  const parts = [studentRecordMatch?.[0], csatMatch?.[0], documentMatch?.[0], interviewMatch?.[0]].filter(Boolean);

  if (parts.length) return `${parts.join(", ")} 기준으로 수능·학생부·서류 위치 확인`;
  return "전년도 입결 세부값은 ADIGA 평가기준·입시결과 탭과 대학 모집요강에서 확인";
}

function getUnitSummary(units: readonly { readonly name: string; readonly quota: string }[]) {
  if (!units.length) return "모집단위는 ADIGA 세부 팝업 또는 대학 모집요강 확인";

  const preview = units.slice(0, 3).map((unit) => `${unit.name}${unit.quota ? ` ${unit.quota}` : ""}`);
  const suffix = units.length > preview.length ? ` 외 ${units.length - preview.length}개` : "";

  return `${preview.join(", ")}${suffix}`;
}

export const kusfAdmissionMeta = {
  schoolYear: kusfAdmissionSnapshot.schoolYear,
  recruitmentTrack: kusfAdmissionSnapshot.recruitmentTrack,
  sourceName: kusfAdmissionSnapshot.sourceName,
  sourceUrl: kusfAdmissionSnapshot.sourceUrl,
  generatedAt: kusfAdmissionSnapshot.generatedAt,
  coverageNote: kusfAdmissionSnapshot.coverageNote,
  universityCount: kusfAdmissionSnapshot.universities.length,
  universitiesWithAdmissions: kusfAdmissionSnapshot.universities.filter((item) => item.admissions.length > 0).length,
  admissionCount: kusfAdmissionSnapshot.universities.reduce((sum, item) => sum + item.admissions.length, 0),
};

export const kusfAdmissionDetailMeta = {
  schoolYear: kusfAdmissionDetailSnapshot.schoolYear,
  recruitmentTrack: kusfAdmissionDetailSnapshot.recruitmentTrack,
  sourceName: kusfAdmissionDetailSnapshot.sourceName,
  sourceUrl: kusfAdmissionDetailSnapshot.sourceUrl,
  generatedAt: kusfAdmissionDetailSnapshot.generatedAt,
  coverageNote: kusfAdmissionDetailSnapshot.coverageNote,
  admissionCount: kusfAdmissionDetailSnapshot.admissions.length,
  practicalDetailCount: kusfAdmissionDetailSnapshot.admissions.filter((item) => item.hasPracticalDetail).length,
  gradeDetailCount: kusfAdmissionDetailSnapshot.admissions.filter((item) => item.hasGradeDetail).length,
};

export const adigaRegularAdmissionMeta = {
  schoolYear: adigaRegularAdmissionSnapshot.schoolYear,
  recruitmentTrack: adigaRegularAdmissionSnapshot.recruitmentTrack,
  sourceName: adigaRegularAdmissionSnapshot.sourceName,
  sourceUrl: adigaRegularAdmissionSnapshot.sourceUrl,
  generatedAt: adigaRegularAdmissionSnapshot.generatedAt,
  coverageNote: adigaRegularAdmissionSnapshot.coverageNote,
  universityCount: adigaRegularAdmissionSnapshot.universities.length,
  universitiesWithAdmissions: adigaRegularAdmissionSnapshot.universities.filter((item) => item.admissions.length > 0)
    .length,
  admissionCount: adigaRegularAdmissionSnapshot.universities.reduce((sum, item) => sum + item.admissions.length, 0),
  unitCount: adigaRegularAdmissionSnapshot.universities.reduce(
    (sum, item) => sum + item.admissions.reduce((admissionSum, admission) => admissionSum + admission.units.length, 0),
    0,
  ),
};

export const adigaRegularSelectionMeta = {
  schoolYear: adigaRegularSelectionSnapshot.schoolYear,
  resultYear: adigaRegularSelectionSnapshot.resultYear,
  recruitmentTrack: adigaRegularSelectionSnapshot.recruitmentTrack,
  sourceName: adigaRegularSelectionSnapshot.sourceName,
  sourceUrl: adigaRegularSelectionSnapshot.sourceUrl,
  generatedAt: adigaRegularSelectionSnapshot.generatedAt,
  coverageNote: adigaRegularSelectionSnapshot.coverageNote,
  universityCount: adigaRegularSelectionSnapshot.universities.length,
  universitiesWithResults: adigaRegularSelectionSnapshot.universities.filter((item) => item.hasResultTable).length,
  universitiesWithCriteria: adigaRegularSelectionSnapshot.universities.filter((item) => item.hasCriteria).length,
  resultRowCount: adigaRegularSelectionSnapshot.universities.reduce(
    (sum, item) => sum + item.resultRows.length,
    0,
  ),
};

const regularAdmissionsByCode: ReadonlyMap<
  string,
  (typeof adigaRegularAdmissionSnapshot.universities)[number]
> = new Map(adigaRegularAdmissionSnapshot.universities.map((school) => [school.code, school]));
const regularSelectionsByCode: ReadonlyMap<
  string,
  (typeof adigaRegularSelectionSnapshot.universities)[number]
> = new Map(
  adigaRegularSelectionSnapshot.universities.map((school) => [school.code, school]),
);
const kusfAdmissionDetailsByKey: ReadonlyMap<
  string,
  (typeof kusfAdmissionDetailSnapshot.admissions)[number]
> = new Map(kusfAdmissionDetailSnapshot.admissions.map((detail) => [detail.key, detail]));

export const kusfRegionAdmissionGroups = peExamRegionNames.map((region) => ({
    region,
    universities: kusfAdmissionSnapshot.universities
      .filter((school) => (regionMap[school.area] || "기타") === region)
      .map((school) => {
        const regularSchool = regularAdmissionsByCode.get(school.code);
        const regularSelection = regularSelectionsByCode.get(school.code);

        return {
          ...school,
          region,
          earlyAdmissions: school.admissions.map((admission) => {
            const detail = kusfAdmissionDetailsByKey.get(createKusfDetailKey(school, admission));

            return {
              ...admission,
              practicalSummary: summarizePracticalDetail(detail, admission.elementSummary),
              practicalTasks: detail?.practicalTasks || [],
              gradeSummary: summarizeKusfGradeDetail(detail, admission.elementSummary),
              minimumCriteriaSummary: summarizeMinimumCriteria(detail),
              detailUrl: detail?.detailUrl || "",
              hasPracticalDetail: Boolean(detail?.hasPracticalDetail),
              hasGradeDetail: Boolean(detail?.hasGradeDetail),
            };
          }),
          regularAdmissions: (regularSchool?.admissions || []).map((admission) => ({
            ...admission,
            unitSummary: getUnitSummary(admission.units),
            practicalSummary: getRegularPracticalSummary(admission.method),
            gradeSummary: getRegularGradeSummary(admission.method, regularSelection),
            hasResultDetail: Boolean(regularSelection?.hasResultTable),
            hasCriteriaDetail: Boolean(regularSelection?.hasCriteria),
          })),
          regularDetailUrl: regularSelection?.selectionUrl || regularSchool?.detailUrl || "",
          regularSelectionDetail: regularSelection
            ? {
                selectionUrl: regularSelection.selectionUrl,
                resultRows: regularSelection.resultRows.map((row) => ({ ...row })),
                resultHighlights: [...regularSelection.resultHighlights],
                criteriaHighlights: [...regularSelection.criteriaHighlights],
                hasResultTable: regularSelection.hasResultTable,
                hasCriteria: regularSelection.hasCriteria,
              }
            : undefined,
          regularGuide: {
            title: "정시 준비생",
            text:
              regularSchool && regularSchool.admissions.length > 0 && regularSelection?.hasResultTable
                ? "ADIGA 대학 모집인원 기준 정시 전형방법에 평가기준·입시결과 탭의 체육 관련 전년도 결과를 함께 연결했습니다. 표 원문은 대학별 ADIGA 공식 탭에서 다시 확인합니다."
                : regularSchool && regularSchool.admissions.length > 0
                  ? "ADIGA 대학 모집인원 기준 정시 예체능계열 전형방법입니다. 실기 종목별 기록표와 전년도 입결 세부값은 대학별 모집요강 및 ADIGA 평가기준·입시결과 탭에서 이어서 검수합니다."
                : "ADIGA 정시 예체능계열 모집인원 표에 전형 행이 없습니다. 정시 모집요강 또는 대학 입학처 공지를 직접 확인합니다.",
          },
        };
      }),
  }));

export const peExamRegionDetails = kusfRegionAdmissionGroups.map((group) => {
  const catalogGroup = universityRegionGroups.find((item) => item.region === group.region);
  const catalogUniversities = catalogGroup?.universities || [];
  const catalogOnlyUniversities = catalogUniversities
    .filter((school) => !hasMatchingDetailSchool(school, group.universities))
    .map((school) => ({
      code: school.id,
      area: school.area,
      schoolType: school.schoolType,
      name: school.name,
      campus: "",
      track: "",
      source: catalogMeta.source,
      region: group.region,
      admissions: [],
      earlyAdmissions: [],
      regularAdmissions: [],
      regularDetailUrl: "",
      regularSelectionDetail: undefined,
      regularGuide: {
        title: "정시 준비생",
        text: "ADIGA 정시 예체능계열 모집인원 표에 연결된 전형 행이 없습니다. 정시 모집요강 또는 대학 입학처 공지를 직접 확인합니다.",
      },
    }));
  const universities = [...group.universities, ...catalogOnlyUniversities];
  const earlyAdmissionCount = group.universities.reduce((sum, school) => sum + school.earlyAdmissions.length, 0);
  const regularAdmissionCount = group.universities.reduce((sum, school) => sum + school.regularAdmissions.length, 0);
  const practicalDetailCount = group.universities.reduce(
    (sum, school) => sum + school.earlyAdmissions.filter((admission) => admission.hasPracticalDetail).length,
    0,
  );
  const gradeDetailCount = group.universities.reduce(
    (sum, school) => sum + school.earlyAdmissions.filter((admission) => admission.hasGradeDetail).length,
    0,
  );
  const regularUnitCount = group.universities.reduce(
    (sum, school) =>
      sum +
      school.regularAdmissions.reduce(
        (admissionSum, admission) => admissionSum + admission.units.length,
        0,
      ),
    0,
  );

  return {
    ...group,
    universities,
    slug: peExamRegionSlugs[group.region],
    href: getPeExamRegionHref(group.region),
    summary: regionOverviewCopy[group.region],
    areas: uniqueItems([...catalogUniversities.map((school) => school.area), ...group.universities.map((school) => school.area)]),
    catalogCount: catalogUniversities.length,
    universityCount: universities.length,
    earlyAdmissionCount,
    regularAdmissionCount,
    practicalDetailCount,
    gradeDetailCount,
    regularUnitCount,
  };
});

const practicalGuide = "대학별 모집요강에서 실기 종목, 기록 기준, 배점, 결시·실격 기준을 확인";
const gradeGuide = "전년도 입결, 학생부·수능 반영 방식, 실기 반영 비율을 함께 확인";

export const featuredUniversityRows = [
  {
    region: "수도권",
    name: "서울대학교",
    department: "체육교육과",
    href: "https://admission.snu.ac.kr/",
    early: {
      title: "수시 준비생",
      admissions: ["학생부종합 전형 여부 확인", "서류·면접·수능최저 확인", "모집요강 변경 공지 확인"],
      practicals: practicalGuide,
      grade: gradeGuide,
    },
    regular: {
      title: "정시 준비생",
      admissions: ["수능위주 전형 확인", "모집군과 모집인원 확인", "면접·실기 반영 여부 확인"],
      practicals: practicalGuide,
      grade: "수능 백분위·표준점수 반영식과 전년도 합격선 확인",
    },
  },
  {
    region: "수도권",
    name: "한국체육대학교",
    department: "체육계열 특화 대학",
    href: "https://www.knsu.ac.kr/ipsi",
    early: {
      title: "수시 준비생",
      admissions: ["전공별 모집단위 확인", "실기·서류·면접 반영 확인", "종목별 지원 자격 확인"],
      practicals: practicalGuide,
      grade: gradeGuide,
    },
    regular: {
      title: "정시 준비생",
      admissions: ["가·나·다군 모집단위 확인", "수능 영역별 반영비율 확인", "실기 배점 확인"],
      practicals: practicalGuide,
      grade: "수능 환산점수와 실기 배점의 실제 영향도를 함께 확인",
    },
  },
  {
    region: "수도권",
    name: "용인대학교",
    department: "무도·체육·경호·스포츠 계열",
    href: "https://ipsi.yongin.ac.kr/",
    early: {
      title: "수시 준비생",
      admissions: ["계열별 전형 구분 확인", "실기·면접 반영 확인", "종목 특성에 따른 준비 항목 확인"],
      practicals: practicalGuide,
      grade: gradeGuide,
    },
    regular: {
      title: "정시 준비생",
      admissions: ["모집군과 학과별 인원 확인", "수능·실기 반영비율 확인", "전년도 충원 흐름 확인"],
      practicals: practicalGuide,
      grade: "수능 성적과 실기 기록을 같이 놓고 지원 가능성을 확인",
    },
  },
  {
    region: "전라권",
    name: "전북대학교",
    department: "체육교육과·스포츠과학과 등",
    href: "https://enter.jbnu.ac.kr/mainIntro/intro.do",
    early: {
      title: "수시 준비생",
      admissions: ["학생부교과·종합 전형 확인", "실기/실적 전형 여부 확인", "전형별 제출 서류 확인"],
      practicals: practicalGuide,
      grade: gradeGuide,
    },
    regular: {
      title: "정시 준비생",
      admissions: ["모집군 확인", "수능 영역별 반영비율 확인", "실기고사 일정 확인"],
      practicals: practicalGuide,
      grade: "전년도 입결과 실기 배점 비중을 함께 확인",
    },
  },
  {
    region: "전라권",
    name: "전주대학교",
    department: "운동처방·생활체육·경기지도 계열",
    href: "https://iphak.jj.ac.kr/",
    early: {
      title: "수시 준비생",
      admissions: ["학과별 지원 자격 확인", "학생부·실기 반영 확인", "면접 여부 확인"],
      practicals: practicalGuide,
      grade: gradeGuide,
    },
    regular: {
      title: "정시 준비생",
      admissions: ["수능 반영 영역 확인", "학과별 실기 배점 확인", "등록·충원 흐름 확인"],
      practicals: practicalGuide,
      grade: "정시 환산점수와 실기 목표 기록을 함께 확인",
    },
  },
  {
    region: "경상권",
    name: "부산대학교",
    department: "체육교육과·스포츠과학 계열",
    href: "https://go.pusan.ac.kr/",
    early: {
      title: "수시 준비생",
      admissions: ["학생부 중심 전형 확인", "면접·실기 반영 확인", "수능최저 여부 확인"],
      practicals: practicalGuide,
      grade: gradeGuide,
    },
    regular: {
      title: "정시 준비생",
      admissions: ["모집군 확인", "수능 반영 방식 확인", "실기 종목·기록 기준 확인"],
      practicals: practicalGuide,
      grade: "전년도 합격선과 실기 만점 기준을 함께 확인",
    },
  },
] as const;

export const faqItems = [
  [
    "언제부터 준비해야 하나요?",
    "현재 학년과 목표 전형에 따라 준비 순서는 달라집니다. 먼저 모집요강과 실기 구성을 확인하고 상담에서 준비 방향을 정리합니다.",
  ],
  [
    "현재 기록이 낮아도 상담할 수 있나요?",
    "가능합니다. 홈페이지에서는 기록을 입력하지 않으며, 상담 때 필요한 기준과 준비 방향을 함께 확인합니다.",
  ],
  [
    "공부와 운동은 어떻게 병행하나요?",
    "학업 일정과 운동 가능한 시간을 상담에서 확인해 무리하지 않는 준비 흐름을 안내합니다.",
  ],
  [
    "주 몇 회 훈련이 적당한가요?",
    "준비 단계, 남은 기간, 회복 상태에 따라 달라집니다. 무조건 많이 하는 것보다 기록 변화와 컨디션을 함께 봅니다.",
  ],
  [
    "불편한 움직임이 있어도 준비할 수 있나요?",
    "상담에서 현재 움직임과 주의사항을 확인하고 무리하지 않는 범위의 준비 방향을 안내합니다.",
  ],
  [
    "상담 전에 무엇을 준비하면 좋나요?",
    "희망 대학, 지원 전형, 실기 종목, 현재 기록, 가능한 운동 시간을 정리해 주세요.",
  ],
  [
    "학생별 기록을 홈페이지에 입력하나요?",
    "아닙니다. 학생별 목표, 실기 기록, 수업 기록, 상담 메모는 상담 후 NORE에서 관리합니다.",
  ],
  [
    "NORE에서는 무엇을 확인하나요?",
    "학생별 운동 이력, 컨디션, 목표, 세션 기록, 피드백, 메시지 소통을 상담 후 안내받은 방식으로 확인합니다.",
  ],
] as const;
