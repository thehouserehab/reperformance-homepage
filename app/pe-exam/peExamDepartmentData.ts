import type { VerifiedPracticalStandard } from "./peExamVerifiedStandards";

export type PeExamDepartmentProfile = {
  readonly universityCode: string;
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly studyAreas: readonly string[];
  readonly careers: readonly string[];
  readonly credentials: readonly string[];
  readonly officialUrl: string;
  readonly officialLabel: string;
};

const profiles = [
  {
    universityCode: "0000032",
    slug: "sport-youth-guidance",
    name: "스포츠청소년지도학과",
    summary: "스포츠 지도와 청소년 활동 지도를 함께 배우며 현장형 스포츠청소년지도자를 준비하는 학과입니다.",
    studyAreas: ["청소년지도학", "체육학 이론", "전공 스포츠 실기", "현장 연계 프로그램"],
    careers: ["청소년수련시설 지도자", "학교·지역 스포츠 지도자", "생활스포츠지도사", "청소년 활동 기획·운영"],
    credentials: ["청소년지도사", "생활스포츠지도사", "종목별 스포츠 지도 관련 자격"],
    officialUrl: "https://www.knsu.ac.kr/youth/intro/intro.do",
    officialLabel: "한국체육대학교 스포츠청소년지도학과",
  },
  {
    universityCode: "0000032",
    slug: "sport-industry",
    name: "스포츠산업학과",
    summary: "스포츠과학과 산업공학을 융합해 스포츠 비즈니스와 현장 운영을 이끌 인재를 양성하는 학과입니다.",
    studyAreas: ["스포츠경영", "스포츠마케팅", "스포츠데이터분석", "스포츠시설·이벤트 운영"],
    careers: ["스포츠마케터", "스포츠구단·경기단체 운영", "스포츠이벤트 기획", "스포츠데이터 분석", "스포츠시설 관리"],
    credentials: ["스포츠경영관리사", "생활스포츠지도사", "데이터·마케팅 관련 자격"],
    officialUrl: "https://www.knsu.ac.kr/ipsi/info/leisure-sport.do",
    officialLabel: "한국체육대학교 스포츠산업학과",
  },
  {
    universityCode: "0000032",
    slug: "exercise-health-management",
    name: "운동건강관리학과",
    summary: "스포츠의학과 운동과학을 바탕으로 안전한 운동 처방과 건강 증진을 지원하는 운동과학자를 준비합니다.",
    studyAreas: ["스포츠의학", "운동생리학", "트레이닝방법론", "운동처방", "스포츠영양"],
    careers: ["건강운동관리사", "운동처방·운동재활 분야", "선수트레이너", "스포츠과학 연구·교육", "건강관리 프로그램 운영"],
    credentials: ["건강운동관리사", "생활스포츠지도사", "선수트레이너 관련 자격"],
    officialUrl: "https://www.knsu.ac.kr/health/intro/intro.do",
    officialLabel: "한국체육대학교 운동건강관리학과",
  },
  {
    universityCode: "0000032",
    slug: "healthy-aging-sport-welfare",
    name: "노인체육복지학과",
    summary: "노인 건강을 위한 체육과 사회복지 실천을 함께 배우는 융합형 노인체육복지 전문가 과정입니다.",
    studyAreas: ["노인체육", "운동과 노화", "사회복지 실천", "항노화 운동", "노인 여가 지도"],
    careers: ["노인스포츠지도사", "사회복지기관 체육 담당", "복지관·요양기관 프로그램 운영", "노인체육 정책·연구"],
    credentials: ["노인스포츠지도사", "생활스포츠지도사", "사회복지사 1·2급", "스포츠경영관리사"],
    officialUrl: "https://www.knsu.ac.kr/healthyaging/intro/greetings.do",
    officialLabel: "한국체육대학교 노인체육복지학과",
  },
  {
    universityCode: "0000032",
    slug: "adapted-physical-education",
    name: "특수체육교육과",
    summary: "장애인의 신체활동과 사회 참여를 돕는 특수체육교사와 장애인스포츠 지도자를 양성합니다.",
    studyAreas: ["특수교육", "특수체육 지도", "장애인스포츠", "통합체육", "교직"],
    careers: ["특수학교·특수학급 교사", "중등 체육교사", "장애인스포츠지도사", "장애인체육 행정·연구", "복지기관 체육 지도"],
    credentials: ["특수학교 정교사 2급", "중등학교 정교사 2급(복수전공 요건 충족 시)", "장애인스포츠지도사"],
    officialUrl: "https://www.knsu.ac.kr/ape/intro/career-guide.do",
    officialLabel: "한국체육대학교 특수체육교육과",
  },
  {
    universityCode: "0000156",
    slug: "sports-leisure",
    name: "스포츠레저학과",
    summary: "스포츠과학과 여가학을 바탕으로 스포츠·레저 현장을 기획하고 지도할 전문 인재를 준비합니다.",
    studyAreas: ["스포츠과학", "여가학", "레저 프로그램", "스포츠 실기 지도", "이벤트 기획"],
    careers: ["생활체육 담당 공무원", "레저 이벤트 기획·관리", "치료 레크리에이션 지도", "스포츠레저 실기 지도"],
    credentials: ["생활스포츠지도사", "레크리에이션 관련 자격", "종목별 지도자 자격"],
    officialUrl: "https://www.yongin.ac.kr/cmn/wvtex/nibr/colDept/COL_DEPT_00000000017/colDeptMain.do",
    officialLabel: "용인대학교 스포츠레저학과",
  },
  {
    universityCode: "0000156",
    slug: "physical-education",
    name: "체육학과",
    summary: "인간의 움직임과 스포츠 현장을 과학적으로 연구하며 이론과 실기 지도 역량을 함께 기르는 학과입니다.",
    studyAreas: ["스포츠과학", "운동처방", "경기력 향상", "스포츠 지도", "체육 행정"],
    careers: ["트레이너", "생활스포츠지도사", "스포츠과학 연구원", "운동처방·건강관리", "경기 감독·코치", "체육 행정"],
    credentials: ["생활스포츠지도사", "전문스포츠지도사", "건강·운동 관련 자격"],
    officialUrl: "https://www.yongin.ac.kr/cmn/m/wvtex/nibr/colDept/COL_DEPT_00000000013/colDeptMain.do",
    officialLabel: "용인대학교 체육학과",
  },
  {
    universityCode: "0000156",
    slug: "adapted-physical-education",
    name: "특수체육교육과",
    summary: "특수교육 대상자의 개별 욕구에 맞는 체육 교육을 설계하는 특수체육교사와 장애인스포츠 지도자를 준비합니다.",
    studyAreas: ["특수교육", "특수체육", "장애인스포츠", "운동발달", "교직"],
    careers: ["특수학교 교사", "사회복지기관 체육 지도", "특수체육 교실 운영", "장애인체육 시설·단체"],
    credentials: ["특수학교 정교사 2급", "장애인스포츠지도사", "생활스포츠지도사"],
    officialUrl: "https://www.yongin.ac.kr/cmn/wvtex/nibr/colDept/COL_DEPT_00000000015/colDeptMain.do",
    officialLabel: "용인대학교 특수체육교육과",
  },
] as const satisfies readonly PeExamDepartmentProfile[];

function normalizeDepartmentName(value: string) {
  return value.replace(/[\s·ㆍ,()\[\]{}]/g, "").toLowerCase();
}

export const peExamDepartmentProfiles: readonly PeExamDepartmentProfile[] = profiles;

export function getPeExamDepartmentProfile(universityCode: string, slug: string) {
  return profiles.find((profile) => profile.universityCode === universityCode && profile.slug === slug);
}

export function getPeExamDepartmentProfileByName(universityCode: string, name: string) {
  const normalizedName = normalizeDepartmentName(name);
  return profiles.find(
    (profile) =>
      profile.universityCode === universityCode &&
      normalizeDepartmentName(profile.name) === normalizedName,
  );
}

export function admissionTextMatchesDepartment(value: string, departmentName: string) {
  const normalizedValue = normalizeDepartmentName(value);
  const normalizedDepartment = normalizeDepartmentName(departmentName);
  if (!normalizedValue || !normalizedDepartment) return false;
  return normalizedValue.includes(normalizedDepartment) || normalizedDepartment.includes(normalizedValue);
}

export function getPeExamDepartmentHref(
  regionSlug: string,
  track: VerifiedPracticalStandard["track"],
  schoolSlug: string,
  departmentSlug: string,
) {
  return `/pe-exam/universities/${regionSlug}/${track}/${schoolSlug}/departments/${departmentSlug}`;
}
