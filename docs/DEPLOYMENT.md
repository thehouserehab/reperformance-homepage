# 배포

## 기준

- GitHub 저장소: `thehouserehab/reperformance-homepage`
- 배포 브랜치: `main`
- Vercel 프로젝트: `reperformance-homepage`
- Vercel 프로젝트 ID: `prj_VOlVshBafX9Njmw5ZzgVDc9b2syC`
- 공식 도메인: `reperformance.the-house-exercise.com`
- 기본 도메인: `reperformance-homepage.vercel.app`

두 공개 도메인은 하나의 Vercel 프로젝트와 동일한 Production 배포를 사용합니다. 같은 저장소를 별도 Vercel 프로젝트로 다시 연결하지 않습니다.

## 로컬 연결

새 PC나 새 작업 폴더에서는 저장소를 아래 프로젝트에 명시적으로 연결합니다.

```powershell
vercel link --yes --project reperformance-homepage --scope thehouserehab-9727s-projects
```

생성되는 `.vercel/`은 로컬 연결 정보이므로 Git에 커밋하지 않습니다.

## 배포 순서

```powershell
npm.cmd run ops:campaign:check -- --build --typecheck
git diff --check
git push origin HEAD:main
npm.cmd run ops:public:check
```

배포 직후 두 공개 도메인이 같은 Git 커밋을 제공하는지 확인합니다. `/services`, `/pe-exam`, `/apply`, `/login`과 주요 보호 API가 핵심 점검 대상입니다.

## 프로젝트 통합 이력

2026-07-17에 중복 Vercel 프로젝트를 정리했습니다. 공식 도메인을 보유하던 프로젝트를 `reperformance-homepage`로 이름 변경하고 기본 도메인도 이 프로젝트로 이동한 뒤, 도메인이 없어진 중복 프로젝트를 삭제했습니다.

환경변수, Firewall, Cron과 데이터베이스 설정은 앞으로 이 단일 프로젝트에서만 관리합니다. 현재 Production에는 PostgreSQL URL이 확인되지 않았으므로 DB 기반 상담 전환·예약 기능을 운영하기 전에 별도 설정과 마이그레이션 검증이 필요합니다.
