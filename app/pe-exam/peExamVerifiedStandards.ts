export type PeExamAdmissionTrack = "early" | "regular";
export type PeExamApplicantSex = "male" | "female" | "all";
export type PeExamRecordUnit = "cm" | "m" | "sec" | "reps";
export type PeExamThresholdOperator = "gte" | "lte" | "lt";

export type VerifiedPracticalStandard = {
  readonly universityCode: string;
  readonly universityName: string;
  readonly track: PeExamAdmissionTrack;
  readonly admissionYear: number;
  readonly admissionName: string;
  readonly department: string;
  readonly practicalWeightPercent: number;
  readonly eventId: string;
  readonly eventName: string;
  readonly protocol: string;
  readonly sex: PeExamApplicantSex;
  readonly unit: PeExamRecordUnit;
  readonly operator: PeExamThresholdOperator;
  readonly fullScoreThreshold: number;
  readonly fullScorePoints: number;
  readonly equipment?: string;
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly sourcePage: string;
  readonly sourcePublishedAt: string;
  readonly verifiedAt: string;
};

const KNSU_SOURCE = {
  sourceTitle: "한국체육대학교 2027학년도 수시모집요강",
  sourceUrl:
    "https://www.knsu.ac.kr/cms/etcResourceDown.do?key=%24cms%24NIOQygqgTADFDsBnAroglgOgA4BMBmQA&site=%24cms%24JYBwzsQ",
  sourcePage: "30-34",
  sourcePublishedAt: "2026-06-30",
  verifiedAt: "2026-07-19",
} as const;

const YONGIN_SOURCE = {
  sourceTitle: "용인대학교 2026학년도 정시 신입생 모집요강",
  sourceUrl: "https://ipsi.yongin.ac.kr/ipsi/guide/jungsi/mo_jungsi_20250901_1651.pdf",
  sourcePage: "9, 13, 20-22",
  sourcePublishedAt: "2025-09-01",
  verifiedAt: "2026-07-19",
} as const;

type StandardSeed = Pick<
  VerifiedPracticalStandard,
  | "universityCode"
  | "universityName"
  | "track"
  | "admissionYear"
  | "admissionName"
  | "department"
  | "practicalWeightPercent"
  | "eventId"
  | "eventName"
  | "protocol"
  | "unit"
  | "operator"
  | "fullScorePoints"
> & {
  readonly male: number;
  readonly female: number;
  readonly maleEquipment?: string;
  readonly femaleEquipment?: string;
  readonly source: Pick<
    VerifiedPracticalStandard,
    "sourceTitle" | "sourceUrl" | "sourcePage" | "sourcePublishedAt" | "verifiedAt"
  >;
};

function makeSexStandards(seed: StandardSeed): readonly VerifiedPracticalStandard[] {
  return ([
    ["male", seed.male, seed.maleEquipment],
    ["female", seed.female, seed.femaleEquipment],
  ] as const).map(([sex, fullScoreThreshold, equipment]) => ({
    universityCode: seed.universityCode,
    universityName: seed.universityName,
    track: seed.track,
    admissionYear: seed.admissionYear,
    admissionName: seed.admissionName,
    department: seed.department,
    practicalWeightPercent: seed.practicalWeightPercent,
    eventId: seed.eventId,
    eventName: seed.eventName,
    protocol: seed.protocol,
    sex,
    unit: seed.unit,
    operator: seed.operator,
    fullScoreThreshold,
    fullScorePoints: seed.fullScorePoints,
    ...(equipment ? { equipment } : {}),
    ...seed.source,
  }));
}

const knsuDepartmentWeights = [
  ["스포츠청소년지도학과", 15],
  ["스포츠산업학과", 20],
  ["운동건강관리학과", 30],
  ["노인체육복지학과", 20],
] as const;

const knsuCommonStandards = knsuDepartmentWeights.flatMap(([department, practicalWeightPercent]) => [
  ...makeSexStandards({
    universityCode: "0000032",
    universityName: "한국체육대학교",
    track: "early",
    admissionYear: 2027,
    admissionName: "교과성적우수자전형",
    department,
    practicalWeightPercent,
    eventId: "knsu-10m-shuttle-40m",
    eventName: "10m 왕복달리기",
    protocol: "10m 구간을 두 차례 왕복하는 총 40m 방식 · 1회 측정",
    unit: "sec",
    operator: "lte",
    male: 8.27,
    female: 9.19,
    fullScorePoints: 38,
    source: KNSU_SOURCE,
  }),
  ...makeSexStandards({
    universityCode: "0000032",
    universityName: "한국체육대학교",
    track: "early",
    admissionYear: 2027,
    admissionName: "교과성적우수자전형",
    department,
    practicalWeightPercent,
    eventId: "standing-long-jump",
    eventName: "제자리멀리뛰기",
    protocol: "양발 도약 · 2회 중 상위 기록",
    unit: "cm",
    operator: "gte",
    male: 284,
    female: 231,
    fullScorePoints: 38,
    source: KNSU_SOURCE,
  }),
  ...makeSexStandards({
    universityCode: "0000032",
    universityName: "한국체육대학교",
    track: "early",
    admissionYear: 2027,
    admissionName: "교과성적우수자전형",
    department,
    practicalWeightPercent,
    eventId: "medicine-ball-overhead",
    eventName: "메디신볼던지기",
    protocol: "선 자세 오버헤드 드로우 · 2회 중 상위 기록",
    unit: "m",
    operator: "gte",
    male: 12.4,
    female: 10,
    maleEquipment: "3kg 메디신볼",
    femaleEquipment: "2kg 메디신볼",
    fullScorePoints: 38,
    source: KNSU_SOURCE,
  }),
]);

const knsuSpecialEducationStandards = [
  ...makeSexStandards({
    universityCode: "0000032",
    universityName: "한국체육대학교",
    track: "early",
    admissionYear: 2027,
    admissionName: "교과성적우수자전형",
    department: "특수체육교육과",
    practicalWeightPercent: 30,
    eventId: "knsu-10m-shuttle-40m",
    eventName: "10m 왕복달리기",
    protocol: "10m 구간을 두 차례 왕복하는 총 40m 방식 · 1회 측정",
    unit: "sec",
    operator: "lte",
    male: 8.27,
    female: 9.19,
    fullScorePoints: 38,
    source: KNSU_SOURCE,
  }),
  ...makeSexStandards({
    universityCode: "0000032",
    universityName: "한국체육대학교",
    track: "early",
    admissionYear: 2027,
    admissionName: "교과성적우수자전형",
    department: "특수체육교육과",
    practicalWeightPercent: 30,
    eventId: "medicine-ball-overhead",
    eventName: "메디신볼던지기",
    protocol: "선 자세 오버헤드 드로우 · 2회 중 상위 기록",
    unit: "m",
    operator: "gte",
    male: 12.4,
    female: 10,
    maleEquipment: "3kg 메디신볼",
    femaleEquipment: "2kg 메디신볼",
    fullScorePoints: 38,
    source: KNSU_SOURCE,
  }),
  {
    universityCode: "0000032",
    universityName: "한국체육대학교",
    track: "early",
    admissionYear: 2027,
    admissionName: "교과성적우수자전형",
    department: "특수체육교육과",
    practicalWeightPercent: 30,
    eventId: "volleyball-blady-25s",
    eventName: "배구 블라디테스트",
    protocol: "벽면 표시선 안 유효 토스 · 25초간 1회 측정",
    sex: "all",
    unit: "reps",
    operator: "gte",
    fullScoreThreshold: 30,
    fullScorePoints: 38,
    ...KNSU_SOURCE,
  },
] as const;

const yonginDepartments = [
  ["스포츠레저학과", 300, 250, 19.4, 21.6],
  ["체육학과", 295, 245, 19.9, 22.1],
  ["특수체육교육과", 284, 231, 20.3, 22.5],
] as const;

const yonginStandards = yonginDepartments.flatMap(
  ([department, maleJump, femaleJump, maleRun, femaleRun]) => [
    ...makeSexStandards({
      universityCode: "0000156",
      universityName: "용인대학교",
      track: "regular",
      admissionYear: 2026,
      admissionName: "일반학생 전형",
      department,
      practicalWeightPercent: 30,
      eventId: "standing-long-jump",
      eventName: "제자리멀리뛰기",
      protocol: "자동 측정 · 2회 중 최고 기록",
      unit: "cm",
      operator: "gte",
      male: maleJump,
      female: femaleJump,
      fullScorePoints: 75,
      source: YONGIN_SOURCE,
    }),
    ...makeSexStandards({
      universityCode: "0000156",
      universityName: "용인대학교",
      track: "regular",
      admissionYear: 2026,
      admissionName: "일반학생 전형",
      department,
      practicalWeightPercent: 30,
      eventId: "yongin-10m-repeat-80m",
      eventName: "10m 반복달리기",
      protocol: "10m 반환점을 반복해 총 80m 주행 · 1회 측정",
      unit: "sec",
      operator: "lt",
      male: maleRun,
      female: femaleRun,
      fullScorePoints: 75,
      source: YONGIN_SOURCE,
    }),
  ],
);

export const verifiedPracticalStandards: readonly VerifiedPracticalStandard[] = [
  ...knsuCommonStandards,
  ...knsuSpecialEducationStandards,
  ...yonginStandards,
];

export const verifiedPracticalEventOptions = Array.from(
  new Map(
    verifiedPracticalStandards.map((standard) => [
      standard.eventId,
      {
        value: standard.eventId,
        label: `${standard.eventName} · ${standard.protocol.split(" · ")[0]}`,
        eventName: standard.eventName,
        unit: standard.unit,
      },
    ]),
  ).values(),
);

export type VerifiedPracticalDepartmentGroup = {
  readonly department: string;
  readonly practicalWeightPercent: number;
  readonly events: readonly (readonly VerifiedPracticalStandard[])[];
};

export function groupVerifiedStandardsByDepartment(
  standards: readonly VerifiedPracticalStandard[],
): readonly VerifiedPracticalDepartmentGroup[] {
  const departmentMap = new Map<string, Map<string, VerifiedPracticalStandard[]>>();

  standards.forEach((standard) => {
    const eventMap = departmentMap.get(standard.department) || new Map<string, VerifiedPracticalStandard[]>();
    const eventStandards = eventMap.get(standard.eventId) || [];
    eventMap.set(standard.eventId, [...eventStandards, standard]);
    departmentMap.set(standard.department, eventMap);
  });

  return [...departmentMap.entries()].map(([department, eventMap]) => ({
    department,
    practicalWeightPercent: [...eventMap.values()][0]?.[0]?.practicalWeightPercent || 0,
    events: [...eventMap.values()],
  }));
}

export function getVerifiedPracticalStandards(
  universityCode: string,
  track?: PeExamAdmissionTrack,
): readonly VerifiedPracticalStandard[] {
  return verifiedPracticalStandards.filter(
    (standard) =>
      standard.universityCode === universityCode && (!track || standard.track === track),
  );
}

export function formatVerifiedThreshold(standard: VerifiedPracticalStandard) {
  const operatorLabel = standard.operator === "gte" ? "이상" : standard.operator === "lte" ? "이하" : "미만";
  const unitLabel = standard.unit === "reps" ? "회" : standard.unit === "sec" ? "초" : standard.unit;
  return `${standard.fullScoreThreshold}${unitLabel} ${operatorLabel}`;
}
