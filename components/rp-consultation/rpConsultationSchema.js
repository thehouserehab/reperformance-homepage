export const RP_PHASES = [
  { id: 'phase1', label: 'OPT Phase 1', clientLabel: '움직임 안정화 단계', desc: '통증이나 불편감을 줄이면서 기본 정렬과 움직임 조절을 회복합니다.' },
  { id: 'phase2', label: 'OPT Phase 2', clientLabel: '기본 근력·지구력 단계', desc: '안정적인 자세를 유지하면서 기본 근력과 운동 지속 능력을 높입니다.' },
  { id: 'phase3', label: 'OPT Phase 3', clientLabel: '근육 발달 단계', desc: '목표 부위의 근육량과 운동 수행 능력을 체계적으로 향상합니다.' },
  { id: 'phase4', label: 'OPT Phase 4', clientLabel: '최대 근력 향상 단계', desc: '충분한 기초 움직임을 바탕으로 높은 수준의 힘 발휘 능력을 만듭니다.' },
  { id: 'phase5', label: 'OPT Phase 5', clientLabel: '퍼포먼스 향상 단계', desc: '스피드, 파워, 점프, 방향전환 등 실제 수행 능력을 강화합니다.' },
];

export const MEMBER_TYPES = ['일반회원', '재활회원', '시니어', '선수/학생', '체대입시생'];

export const VISIT_PURPOSES = [
  '통증 관리',
  '재활 후 운동 복귀',
  '자세/체형 개선',
  '근력 향상',
  '체력 향상',
  '선수 퍼포먼스 향상',
  '체중 감량',
  '운동 습관 형성',
  '체대입시/실기 준비',
  '기타',
];

export const PE_EXAM_EVENTS = [
  '제자리멀리뛰기',
  '윗몸일으키기',
  '왕복달리기',
  '10m 왕복달리기',
  '배근력',
  '좌전굴',
  '메디신볼던지기',
  '농구',
  '축구',
  '기타',
];

export const PE_EXAM_CONSULTATION_TOPICS = [
  '희망 대학',
  '목표 학과',
  '내신/수능',
  '실기 반영 비율',
  '지원 가능 대학',
  '원서 전략',
  '부상 관리',
];

export const PAIN_AREAS = ['목', '어깨', '팔꿈치', '손목', '허리', '고관절', '무릎', '발목', '발', '전신 피로', '기타'];

export const PROGRAMS = [
  '1회 체험/초기 상담',
  '재활 트레이닝 4회',
  '재활 트레이닝 8회',
  '재활 트레이닝 12회',
  '퍼포먼스 트레이닝 4회',
  '퍼포먼스 트레이닝 8회',
  '퍼포먼스 트레이닝 12회',
  '일반 PT 4회',
  '일반 PT 8회',
  '일반 PT 12회',
  '체대입시 실기 트레이닝 4회',
  '체대입시 실기 트레이닝 8회',
  '체대입시 실기 트레이닝 12회',
];

export const NEXT_ACTIONS = [
  '초기 평가 예약',
  '계약서/가격표 안내',
  '추가 PAR-Q 설문 발송',
  '의료진 확인 후 재상담',
  '프로그램 초안 생성',
  '체대입시 목표 대학 분석',
  '체대입시 실기 기록 측정',
  '체대입시 상담 일정 조율',
  '팔로업 연락',
  '상담 종료',
];

export const CONSULTATION_RESULTS = [
  '등록 완료',
  '등록 대기',
  '초기 평가 예정',
  '추가 설문 필요',
  '의료 확인 후 재상담',
  '보류',
  '상담 종료',
];

export const SAMPLE_CLIENTS = [
  {
    id: 'DEMO-CLIENT-001',
    name: '데모 고객 A',
    phone: '000-0000-0000',
    birth: '2000-01-01',
    gender: '미기재',
    route: '데모',
    status: '상담 전',
    parqStatus: '추가 확인 필요',
    parqYesItems: ['데모 항목: 운동 전 추가 확인이 필요한 상태'],
    goal: '상담 전 데모 목표를 정리합니다.',
    purpose: ['상담 준비', '운동 관리'],
    painAreas: ['데모 부위'],
    painScore: 4,
    concern: '운영 화면 확인을 위한 데모 메모입니다.',
  },
  {
    id: 'DEMO-CLIENT-002',
    name: '데모 고객 B',
    phone: '000-0000-0000',
    birth: '2000-01-01',
    gender: '미기재',
    route: '데모',
    status: '상담 전',
    parqStatus: '정상',
    parqYesItems: [],
    goal: '상담 전 데모 운동 목표를 정리합니다.',
    purpose: ['기록 확인', '실기 향상'],
    painAreas: [],
    painScore: 0,
    concern: '운영 화면 확인을 위한 데모 메모입니다.',
  },
];
