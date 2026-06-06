export type PeExamDetailKind = "record" | "weekly" | "schedule" | "guides" | "simulation";

export type PeExamDetailPage = {
  slug: string;
  label: string;
  title: string;
  description: string;
  focusTitle: string;
  focusItems: string[];
  flowTitle: string;
  flowItems: string[];
  checklistTitle: string;
  checklistItems: string[];
  kind?: PeExamDetailKind;
};

export const peExamSchedule = [
  {
    month: "2026.09",
    range: "09.07 ~ 09.11",
    label: "원서접수",
    title: "수시 원서접수",
    note: "목표 대학별 전형과 실기 일정을 함께 점검합니다.",
    tone: "application",
  },
  {
    month: "2026.09-12",
    range: "09.12 ~ 12.17",
    label: "수시 전형",
    title: "수시 실기·면접 전형",
    note: "대학별 실기 방식에 맞춰 실전 루틴을 조정합니다.",
    tone: "exam",
  },
  {
    month: "2026.11",
    range: "11.19",
    label: "수능",
    title: "2027학년도 수능",
    note: "수능 이후 정시 지원 가능성과 컨디션을 다시 정리합니다.",
    tone: "exam",
  },
  {
    month: "2027.01",
    range: "01.04 ~ 01.07",
    label: "원서접수",
    title: "정시 원서접수",
    note: "가군, 나군, 다군 조합과 실기 일정을 확정합니다.",
    tone: "application",
  },
  {
    month: "2027.01-02",
    range: "01.11 ~ 02.01",
    label: "정시 전형",
    title: "정시 실기 전형",
    note: "전형 당일 순서, 휴식, 긴장도, 실수 대처까지 시뮬레이션합니다.",
    tone: "decision",
  },
] as const;

export const peExamRecords = [
  { event: "제자리멀리뛰기", current: "235cm", goal: "255cm", focus: "폭발력·착지 안정" },
  { event: "10m 왕복달리기", current: "10.8초", goal: "10.2초", focus: "감속·방향전환" },
  { event: "윗몸일으키기", current: "48회", goal: "58회", focus: "코어 지속력" },
  { event: "좌전굴", current: "17cm", goal: "22cm", focus: "햄스트링·골반 가동성" },
];

export const peExamWeeklyLoop = [
  { day: "MON", title: "기록 측정과 약점 분석", text: "종목별 현재 기록을 확인하고 이번 주 목표 기록을 정합니다." },
  { day: "WED", title: "기술 보정과 체력 블록", text: "점프, 착지, 방향전환, 코어, 하체 근력을 목적별로 훈련합니다." },
  { day: "FRI", title: "실전 루틴과 컨디션 체크", text: "실기 순서, 휴식, 긴장도, 통증 여부를 전형 당일 기준으로 점검합니다." },
  { day: "SUN", title: "전략 리포트 정리", text: "기록 변화, 회복 상태, 목표 대학 전략을 학생과 보호자에게 공유합니다." },
];

export const peExamGuideLinks = [
  { name: "대입정보포털 어디가", focus: "대학별 전형, 모집요강, 입시결과 통합 확인", href: "https://www.adiga.kr/" },
  { name: "전북대학교", focus: "체육교육과, 스포츠과학과 관련 전형 확인", href: "https://enter.jbnu.ac.kr/mainIntro/intro.do" },
  { name: "전주대학교", focus: "운동처방, 생활체육, 경기지도 관련 모집요강 확인", href: "https://iphak.jj.ac.kr/" },
  { name: "한국체육대학교", focus: "체육계열 특화 대학, 실기종목과 전형별 모집요강 확인", href: "https://www.knsu.ac.kr/ipsi" },
  { name: "경희대학교", focus: "체육대학 모집요강과 실기 반영 방식 확인", href: "https://iphak.khu.ac.kr/main.do" },
  { name: "용인대학교", focus: "무도, 체육, 경호, 스포츠 관련 전형 확인", href: "https://ipsi.yongin.ac.kr/" },
];

export const peExamDetailPages: PeExamDetailPage[] = [
  {
    slug: "admission-map",
    label: "ADMISSION MAP",
    title: "목표 대학 역산 전략",
    description: "희망 대학을 기준으로 내신, 수능, 실기 반영비율을 비교해 지금 무엇을 우선해야 하는지 정리합니다.",
    focusTitle: "전략에서 확인하는 것",
    focusItems: ["목표 대학군 분류", "수시·정시 가능성 비교", "내신·수능·실기 반영비율", "이번 달 우선순위"],
    flowTitle: "상담 흐름",
    flowItems: ["현재 성적과 실기 기록 확인", "목표 대학 후보 정리", "상향·적정·안정 구간 분리", "주간 훈련 목표와 연결"],
    checklistTitle: "학생이 알게 되는 것",
    checklistItems: ["내가 노려볼 수 있는 대학", "지금 올려야 하는 실기 종목", "원서 전까지 필요한 기록 변화", "학부모와 공유할 지원 방향"],
  },
  {
    slug: "record-board",
    label: "RECORD BOARD",
    title: "종목별 실기 기록 관리",
    description: "현재 기록과 목표 기록을 한 화면에서 비교하고, 약점 동작과 주간 변화까지 관리합니다.",
    focusTitle: "기록판에서 확인하는 것",
    focusItems: ["종목별 현재 기록", "목표 대학 기준 기록", "기록 상승 폭", "약점 동작과 보완 포인트"],
    flowTitle: "측정 흐름",
    flowItems: ["기초 기록 측정", "목표 기록 설정", "주간 변화 기록", "다음 훈련 블록 조정"],
    checklistTitle: "기록 관리 기준",
    checklistItems: ["숫자로 보이는 변화", "종목별 우선순위", "기록이 막히는 원인", "실전 전형에서 필요한 안정성"],
    kind: "record",
  },
  {
    slug: "training-block",
    label: "TRAINING BLOCK",
    title: "주간 훈련 블록",
    description: "기초 체력, 종목 기술, 파워, 스피드, 회복을 주 단위로 배치해 무작정 반복하지 않게 만듭니다.",
    focusTitle: "훈련 블록 구성",
    focusItems: ["기초 체력", "종목별 기술", "파워·스피드", "회복과 컨디션"],
    flowTitle: "주간 운영 방식",
    flowItems: ["월요일 기록 분석", "주중 기술 보정", "금요일 실전 루틴", "주말 리포트 정리"],
    checklistTitle: "훈련에서 관리하는 기준",
    checklistItems: ["기록 향상 가능성", "피로 누적 여부", "부상 위험 동작", "시험 당일 수행력"],
    kind: "weekly",
  },
  {
    slug: "condition-guard",
    label: "CONDITION GUARD",
    title: "부상·컨디션 관리",
    description: "발목, 무릎, 허리, 어깨 상태를 기록하고 실기 기록 향상과 부상 예방을 동시에 관리합니다.",
    focusTitle: "컨디션에서 확인하는 것",
    focusItems: ["통증 부위와 강도", "훈련 후 피로도", "관절 가동성", "회복 루틴 수행 여부"],
    flowTitle: "관리 흐름",
    flowItems: ["통증·피로 체크", "위험 동작 분리", "훈련 강도 조정", "회복 루틴 적용"],
    checklistTitle: "부상 예방 기준",
    checklistItems: ["통증을 참는 훈련 금지", "기록보다 먼저 확인할 움직임", "실기 전 회복 스케줄", "시험 당일 컨디션 유지"],
  },
  {
    slug: "parent-report",
    label: "PARENT REPORT",
    title: "학부모 공유 리포트",
    description: "이번 주 기록, 훈련 내용, 다음 목표, 지원 전략 변화를 정리해 학생과 보호자가 같은 방향을 보게 합니다.",
    focusTitle: "리포트에 담기는 내용",
    focusItems: ["기록 변화", "훈련 목표", "컨디션 메모", "지원 전략 변화"],
    flowTitle: "공유 흐름",
    flowItems: ["기록표 업데이트", "훈련 내용 요약", "다음 목표 설정", "보호자 공유"],
    checklistTitle: "보호자가 확인할 수 있는 것",
    checklistItems: ["준비 과정의 진행도", "학생의 몸 상태", "실기 종목별 우선순위", "원서와 전형 일정"],
  },
  {
    slug: "final-simulation",
    label: "FINAL SIMULATION",
    title: "실전 시뮬레이션",
    description: "대학별 실기 방식에 맞춰 순서, 휴식, 긴장도, 실수 대처까지 실제 전형 당일처럼 점검합니다.",
    focusTitle: "시뮬레이션에서 확인하는 것",
    focusItems: ["대학별 측정 순서", "종목 사이 휴식", "실수 후 대처", "긴장도와 호흡"],
    flowTitle: "실전 준비 흐름",
    flowItems: ["대학별 전형 방식 확인", "실전 순서대로 수행", "기록과 컨디션 동시 체크", "전형 당일 루틴 확정"],
    checklistTitle: "마지막 점검 기준",
    checklistItems: ["전형 당일 행동 계획", "준비물과 이동 동선", "종목별 리듬", "실수했을 때 회복 전략"],
    kind: "simulation",
  },
  {
    slug: "admission-calendar",
    label: "ADMISSION SCHEDULE",
    title: "체대입시 일정 캘린더",
    description: "수시, 수능, 정시, 실기 전형의 큰 흐름을 먼저 잡고 대학별 세부 일정을 관리표에 추가합니다.",
    focusTitle: "일정에서 확인하는 것",
    focusItems: ["수시 원서접수", "수시 실기 전형", "수능 이후 전략 조정", "정시 원서접수와 실기"],
    flowTitle: "일정 관리 방식",
    flowItems: ["큰 전형 일정 확인", "목표 대학별 세부 일정 추가", "훈련 강도 조정", "전형 당일 루틴 확정"],
    checklistTitle: "놓치지 않아야 할 것",
    checklistItems: ["원서접수 기간", "대학별 실기 날짜", "수능 이후 전략 변경", "가군·나군·다군 조합"],
    kind: "schedule",
  },
  {
    slug: "university-guides",
    label: "UNIVERSITY GUIDE",
    title: "대학별 모집요강 링크",
    description: "목표 대학의 공식 모집요강을 바로 확인하고, 실기종목과 반영비율을 상담·훈련에 연결합니다.",
    focusTitle: "모집요강에서 확인하는 것",
    focusItems: ["지원 자격", "실기 종목", "반영비율", "전형 일정"],
    flowTitle: "자료 활용 방식",
    flowItems: ["공식 모집요강 확인", "학생 목표 대학과 연결", "기록표에 기준 추가", "훈련 우선순위 조정"],
    checklistTitle: "자료 확인 원칙",
    checklistItems: ["공식 자료 우선", "대학별 PDF 재확인", "변경 공지 확인", "상담 기록표 업데이트"],
    kind: "guides",
  },
];

export function getPeExamDetailPage(slug: string) {
  return peExamDetailPages.find((page) => page.slug === slug);
}
