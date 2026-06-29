# RePERFORMANCE Homepage v5

Next.js App Router 기반 RePERFORMANCE 홈페이지 코드입니다.

## 반영 내용
- 텍스트 기반 RePERFORMANCE 로고 적용
- 공통 Header/Footer/상담 CTA 컴포넌트 적용
- 현재 페이지 활성화 네비게이션 표시
- 서비스 상세 페이지 추가
  - /services/senior-rehab
  - /services/athlete-reconditioning
  - /services/pain-care
- 시스템 상세 페이지 추가
  - /system/online-survey
  - /system/movement-assessment
  - /system/opt-program
- 시스템 페이지 CTA 버튼 깨짐 방지
- 네이버 지도 링크 반영
- 코치 페이지 철학 강조 디자인 적용

## GitHub 업로드 구조
압축 해제 후 아래 파일과 폴더가 GitHub 저장소 최상단에 오도록 업로드하세요.

```
app
public
package.json
next.config.js
tsconfig.json
README.md
```

Vercel Output Directory는 비워두세요.

## v6 업데이트

- `/admin` 대표 운영관리 페이지 추가
- Google Drive 운영문서 폴더 연결
- 매출관리, 상담응답, 문서DB, 할일 캘린더, Google Drive, ChatGPT 운영분석 바로가기 구성
- 실제 민감정보는 홈페이지에 노출하지 않고 Google Workspace 권한으로 관리하는 방식

현재 `/admin`의 주요 버튼은 Google Drive 운영문서 폴더로 연결됩니다. 추후 Google Sheets 직접 링크를 받으면 버튼별로 개별 파일/시트 링크로 교체하면 됩니다.

## 운영 문서

- 고객 데이터와 로그인/회원가입 운영 모델: `docs/RP_CUSTOMER_DATA_AUTH_MODEL.md`
- PostgreSQL 전환 가이드: `docs/RP_MANAGED_POSTGRES_SETUP.md`
- 계정/권한 설정: `docs/RP_ADMIN_AUTH_SETUP.md`
- 상담 신청 저장 설정: `docs/RP_SERVICE_APPLICATION_SETUP.md`
