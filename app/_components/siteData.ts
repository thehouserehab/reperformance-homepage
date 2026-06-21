export const site = {
  name: "RePERFORMANCE",
  tagline: "ELITE REHAB & TRAINING",
  description: "Rehab to Performance. 재활에서 움직임, 그리고 다시 퍼포먼스까지.",
  phone: "010-2418-8400",
  phoneHref: "tel:01024188400",
  instagram: "@reperformance_trainer",
  instagramHref: "https://www.instagram.com/reperformance_trainer",
  serviceApplyHref: "/apply",
  norePortalHref: "https://noreapp.com",
  naverMapHref: "https://naver.me/5BwnMHha",
  ownerWorkspaceHref: "https://drive.google.com/drive/folders/1X_bDnaAW89nuKdj5dZ48sMwkfvamqogy",
  chatGptHref: "https://chatgpt.com/",
  address: "전북 전주시 완산구 서신동 773-2, 2층",
  addressDetail: "서신동 중심 상권 2층에 위치합니다.",
  parking: "건물 주변 및 인근 주차 가능",
  hours: "08:00 ~ 22:00",
};

export const serviceItems = [
  {
    number: "01",
    label: "Senior Rehab",
    title: "시니어 재활 트레이닝",
    href: "/services/senior-rehab",
    applyHref: "/apply?service=senior-rehab",
    applicationValue: "senior-rehab",
    memberType: "시니어",
    target: "부모님 세대, 보행·계단·허리·무릎·어깨 불편감",
    message: "아픈 몸을 참는 일상에서, 다시 편하게 움직이는 일상으로.",
    description:
      "현재 통증과 불편한 동작을 확인하고, 가능한 범위에서 움직임과 근력을 다시 쌓는 과정입니다. 걷기, 계단, 균형, 하체 안정성, 어깨 움직임, 허리 부담 감소에 집중합니다.",
    bullets: ["통증 및 생활 동작 체크", "관절 가동성 운동", "균형 및 보행 안정성 훈련", "하체 근력 회복", "집에서 할 수 있는 동작 제공"],
  },
  {
    number: "02",
    label: "Athlete Reconditioning",
    title: "선수·학생 리컨디셔닝",
    href: "/services/athlete-reconditioning",
    applyHref: "/apply?service=athlete-reconditioning",
    applicationValue: "athlete-reconditioning",
    memberType: "선수/학생",
    target: "복귀 준비 선수, 유소년 선수, 취미·동호회 선수",
    message: "재활에서 복귀까지, 다시 경기장으로 돌아가기 위한 과정.",
    description:
      "부상 이후 남아 있는 불안정성, 근력 저하, 움직임 제한, 체력 저하를 확인하고 다시 훈련과 경기로 복귀할 수 있도록 단계적으로 준비합니다.",
    bullets: ["통증 및 부상 이력 확인", "가동성 및 움직임 평가", "착지·감속 패턴 훈련", "근력 회복 및 컨디셔닝", "재부상 방지 루틴 제공"],
  },
  {
    number: "03",
    label: "Pain Care",
    title: "일반인 통증 케어 & 근력 회복",
    href: "/services/pain-care",
    applyHref: "/apply?service=pain-care",
    applicationValue: "pain-care",
    memberType: "일반회원",
    target: "어깨·허리·무릎 불편감, 운동 초보, 체력 저하",
    message: "통증을 참고 버티는 운동이 아니라, 몸에 맞게 조절하는 운동.",
    description:
      "현재 몸 상태와 움직임을 확인하고, 무리 없는 범위에서 운동을 시작합니다. 통증 관리, 근력 회복, 체력 향상을 함께 목표로 합니다.",
    bullets: ["통증 부위 및 불편 동작 체크", "자세 및 움직임 확인", "가동성·안정성 운동", "기초 근력 운동", "생활 속 운동 습관 안내"],
  },
  {
    number: "04",
    label: "PE Exam",
    title: "체대입시 운동 + 입시상담",
    href: "/services/pe-exam",
    applyHref: "/apply?service=pe-exam",
    applicationValue: "pe-exam",
    memberType: "체대입시생",
    target: "체대입시 준비생, 실기 기록 향상, 목표 대학·학과 상담이 필요한 학생",
    message: "실기 준비와 입시 정보를 상담 전부터 한 흐름으로 안내합니다.",
    description:
      "대학별 정보와 실기 종목, 준비 기준을 먼저 안내하고 상담 방향을 연결합니다. 학생별 기록과 일정은 상담 후 NORE에서 관리합니다.",
    bullets: ["대학별 정보와 전형 일정 확인", "실기 종목별 준비 기준 안내", "공식 모집요강 확인 방법", "준비 로드맵 안내", "체대입시 상담 신청"],
  },
];

export const systemItems = [
  {
    number: "01",
    title: "온라인 설문",
    href: "/system/online-survey",
    summary: "운동 목표, 통증·불편감, 주의사항 확인",
  },
  {
    number: "02",
    title: "움직임 평가",
    href: "/system/movement-assessment",
    summary: "어깨, 골반, 중심축, 하체 정렬 확인",
  },
  {
    number: "03",
    title: "OPT 기반 프로그램",
    href: "/system/opt-program",
    summary: "Warm-up부터 Cool-down까지 목적 맞춤 설계",
  },
];
