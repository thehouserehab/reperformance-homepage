# RePERFORMANCE Homepage

RePERFORMANCE의 공개 홈페이지, 체대입시 정보 허브, 상담 신청, 로그인, 관리자용 상담·고객관리 기능을 제공하는 Next.js App Router 프로젝트입니다.

## 기준 구조

- `app/`: 공개 페이지, 관리자 페이지, API 라우트
- `components/`: 여러 페이지에서 공유하는 기능 컴포넌트
- `lib/`: 인증, 데이터베이스, 보안, 전환 추적 등 서버 도메인 로직
- `database/migrations/`: PostgreSQL 스키마 변경 이력
- `scripts/`: 배포 전 점검, 데이터 감사, 운영 자동화
- `integrations/`: 선택적 외부 서비스의 단일 기준 소스
- `docs/`: 운영·보안·데이터 문서
- `public/`: 홈페이지에서 직접 제공하는 이미지와 정적 자산

PostgreSQL이 고객·계정·상담 전 상태의 기본 저장소입니다. Google Drive/Sheets 경로는 명시적으로 활성화한 경우에만 백업 또는 전환기 fallback으로 사용합니다. 계약·결제 원본은 Google Workspace, 실제 일정은 Calendar, 상담 이후 운동·회원관리는 NORE에서 관리하며 홈페이지는 NORE API를 호출하지 않습니다.

## 로컬 실행

```powershell
npm.cmd install
npm.cmd run dev
```

기본 주소는 `http://localhost:3000`입니다. 환경변수 설명은 [.env.example](.env.example), 운영 문서 인덱스는 [docs/README.md](docs/README.md)를 참고합니다.

## 검증

일반 코드 변경은 다음 명령으로 확인합니다.

```powershell
npm.cmd run typecheck
npm.cmd run build
git diff --check
```

배포 전 전체 운영 점검은 다음 명령을 사용합니다.

```powershell
npm.cmd run ops:campaign:check -- --build --typecheck
```

배포 후 공개 도메인 점검은 다음 명령을 사용합니다.

```powershell
npm.cmd run ops:public:check
```

## 배포 기준

- Git 기준 브랜치: `main`
- 공식 도메인: `https://reperformance.the-house-exercise.com`
- Vercel 기본 도메인: `https://reperformance-homepage.vercel.app`
- 작업 기준 경로: `E:\CodexProjects\reperformance-homepage`

세부 절차와 현재 Vercel 프로젝트 정리 기준은 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)에 기록합니다.
