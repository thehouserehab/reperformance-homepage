# RePERFORMANCE Homepage v6 상담모드 Add-on 설치 안내

이 ZIP은 `reperformance-homepage-v6` 기존 프로젝트에 추가할 수 있도록 만든 **추가 파일 패키지**입니다. 전체 프로젝트를 새로 만드는 방식이 아니라, 기존 프로젝트에 필요한 컴포넌트와 라우트만 추가하는 구조입니다.

## 1. 포함 파일

```txt
components/rp-consultation/RPConsultationMode.jsx
components/rp-consultation/RPConsultationMode.module.css
components/rp-consultation/rpConsultationSchema.js
app/admin/consultation/page.jsx
pages/admin/consultation.jsx
docs/RP_CONSULTATION_INSTALL.md
```

## 2. 설치 방법

### App Router 사용 프로젝트인 경우
기존 프로젝트 루트에 아래 폴더를 그대로 복사합니다.

```txt
components/rp-consultation/
app/admin/consultation/page.jsx
```

실행 후 접속:

```txt
/admin/consultation
```

### Pages Router 사용 프로젝트인 경우
기존 프로젝트 루트에 아래 폴더를 그대로 복사합니다.

```txt
components/rp-consultation/
pages/admin/consultation.jsx
```

실행 후 접속:

```txt
/admin/consultation
```

> 둘 다 사용 중이면 `app/admin/consultation/page.jsx`만 쓰는 것을 권장합니다.

## 3. 현재 저장 방식

현재 버전은 기존 DB를 건드리지 않도록 `localStorage`에 임시 저장합니다.

실제 운영에서 저장 연동을 붙일 위치는 다음 함수입니다.

```jsx
function saveRecord() {
  // TODO: Google Sheets / Notion / Supabase 저장 함수로 교체
}
```

파일 위치:

```txt
components/rp-consultation/RPConsultationMode.jsx
```

## 4. 기존 회원 DB와 연결하는 방법

기존 프로젝트에서 회원 데이터를 이미 불러오고 있다면 아래처럼 `clients` prop으로 넘기면 됩니다.

```jsx
<RPConsultationMode clients={clientsFromYourDB} />
```

필요한 회원 데이터 형태:

```js
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
  concern: '스쿼트와 계단 내려가기에서 불편감이 있다.'
}
```

## 5. 저장 연동 확장 지점

`onSave` prop을 넘기면 저장 시 외부 저장 함수를 호출할 수 있습니다.

```jsx
<RPConsultationMode
  clients={clients}
  onSave={async (payload) => {
    await fetch('/api/consultations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }}
/>
```

## 6. 기능 요약

- 고객 화면 / 코치 입력 화면 2분할
- 회원 선택
- PAR-Q 결과 확인
- 목표 / 통증 / 방문 목적 입력
- OPT Phase 선택
- 추천 프로그램 선택
- 상담 결과 / 다음 액션 선택
- 코치 내부용 AI 상담 요약 생성
- JSON 내보내기
- localStorage 임시 저장

## 7. 다음 개발 단계

1. Google Sheets 저장 API 연결
2. Notion 회원 페이지 생성 연동
3. 기존 관리자페이지의 회원 목록과 연결
4. 상담 완료 시 초기 평가 페이지 자동 생성
5. 상담 완료 시 프로그램 초안 페이지 자동 생성
