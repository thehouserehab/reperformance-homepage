export const RP_PHASES = [
  { id: 'phase1', label: 'OPT Phase 1', clientLabel: '움직임 안정화 단계', desc: '통증이나 불편감을 줄이면서 기본 정렬과 움직임 조절을 회복합니다.' },
  { id: 'phase2', label: 'OPT Phase 2', clientLabel: '기본 근력·지구력 단계', desc: '안정적인 자세를 유지하면서 기본 근력과 운동 지속 능력을 높입니다.' },
  { id: 'phase3', label: 'OPT Phase 3', clientLabel: '근육 발달 단계', desc: '목표 부위의 근육량과 운동 수행 능력을 체계적으로 향상합니다.' },
  { id: 'phase4', label: 'OPT Phase 4', clientLabel: '최대 근력 향상 단계', desc: '충분한 기초 움직임을 바탕으로 높은 수준의 힘 발휘 능력을 만듭니다.' },
  { id: 'phase5', label: 'OPT Phase 5', clientLabel: '퍼포먼스 향상 단계', desc: '스피드, 파워, 점프, 방향전환 등 실제 수행 능력을 강화합니다.' },
];

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
];

export const NEXT_ACTIONS = [
  '초기 평가 예약',
  '계약서/가격표 안내',
  '추가 PAR-Q 설문 발송',
  '의료진 확인 후 재상담',
  '프로그램 초안 생성',
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
    id: 'RP-2026-001',
    name: '김민수',
    phone: '010-0000-0000',
    birth: '2001-03-18',
    gender: '남',
    route: '인스타그램',
    status: '상담 전',
    parqStatus: '추가 확인 필요',
    parqYesItems: ['6번: 운동으로 악화될 수 있는 뼈·관절·근육 문제'],
    goal: '무릎 부담 없이 하체 운동을 다시 시작하고 싶다.',
    purpose: ['통증 관리', '근력 향상'],
    painAreas: ['무릎'],
    painScore: 4,
    concern: '스쿼트와 계단 내려가기에서 불편감이 있다.',
  },
  {
    id: 'RP-2026-002',
    name: '이지훈',
    phone: '010-1111-1111',
    birth: '1996-11-02',
    gender: '남',
    route: '블로그',
    status: '상담 전',
    parqStatus: '정상',
    parqYesItems: [],
    goal: '체력과 근력을 같이 올리고 싶다.',
    purpose: ['근력 향상', '체력 향상'],
    painAreas: [],
    painScore: 0,
    concern: '운동 루틴을 혼자 유지하기 어렵다.',
  },
];
