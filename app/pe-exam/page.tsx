import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/SiteChrome";
import {
  admissionTimeline2026,
  adigaRegularAdmissionMeta,
  adigaRegularSelectionMeta,
  catalogMeta,
  faqItems,
  getPeExamSchoolTrackHref,
  kusfAdmissionDetailMeta,
  kusfAdmissionMeta,
  peExamRegionDetails,
  sourceLinks,
} from "./peExamData";
import PeExamHomeSearchClient from "./PeExamHomeSearchClient";
import styles from "./PeExamHub.module.css";

export const metadata: Metadata = {
  title: "체대입시 정보 허브 | RePERFORMANCE",
  description:
    "2026년 대입 흐름, 전국 체육관련학과 대학 목록, 수시·정시 준비 기준, FAQ와 로그인 회원용 AI 입시 상담 방향 가이드를 확인하는 RePERFORMANCE 체대입시 정보 허브입니다.",
};

const hubLinks = [
  { href: "#start-guide", label: "처음 시작" },
  { href: "#university-search", label: "대학검색" },
  { href: "#universities", label: "지역별 대학" },
  { href: "#timeline", label: "2026 흐름" },
  { href: "#training-management", label: "실기관리" },
  { href: "#ai-consult", label: "상담준비" },
  { href: "/pe-exam/faq", label: "FAQ" },
] as const;

const resourceCards = [
  {
    label: "01",
    title: "전형 일정",
    text: "2026년 안에서 수시, 수능, 정시가 어떤 순서로 이어지는지 먼저 확인합니다.",
  },
  {
    label: "02",
    title: "지역별 대학",
    text: "전국 체육관련학과 대학을 권역별로 훑고, 상세 페이지에서 대학별 전형을 이어서 봅니다.",
  },
  {
    label: "03",
    title: "수시·정시 관점",
    text: "같은 대학도 수시 준비생과 정시 준비생이 확인해야 하는 항목을 따로 정리합니다.",
  },
  {
    label: "04",
    title: "FAQ와 질문",
    text: "자주 묻는 질문은 전용 페이지에서 보고, 로그인 회원은 직접 질문을 남길 수 있습니다.",
  },
] as const;

const universityScopeCards = [
  {
    title: "지역별 규모",
    text: "권역별 대학 수, KUSF 수시 전형 수, ADIGA 정시 전형 수를 먼저 비교합니다.",
  },
  {
    title: "상세 페이지 구성",
    text: "지역별 전형 선택 페이지에서 먼저 수시/정시를 고른 뒤, 선택한 전형 전용 페이지에서 이어서 봅니다.",
  },
  {
    title: "공식자료 기준",
    text: "실기 종목별 기록표와 전년도 입결 세부값은 대학별 모집요강 및 공식 포털 확인을 우선합니다.",
  },
] as const;

const aiFields = [
  "내신·수능 성적",
  "실기 종목별 현재 기록",
  "희망 대학·학과",
  "운동 가능 시간",
  "부상·컨디션 메모",
  "상담에서 정리한 목표",
] as const;

const roadmapSteps = [
  ["01", "모집요강 확인", "대학별 모집단위, 전형명, 반영 비율, 실기 종목을 먼저 봅니다."],
  ["02", "현재 위치 정리", "성적, 실기 기록, 가능한 운동 시간, 몸 상태를 한 번에 정리합니다."],
  ["03", "수시·정시 분리", "수시와 정시는 확인해야 할 기준이 달라 준비 경로를 따로 봅니다."],
  ["04", "상담으로 연결", "공개자료만으로 부족한 부분은 상담에서 개인별 방향으로 정리합니다."],
] as const;

const startFlowItems = [
  ["01", "대학정보 확인", "지역, 전형, 실기 종목, 공식 확인 링크를 먼저 봅니다."],
  ["02", "현재 상태 정리", "성적, 실기 기록, 남은 기간, 운동 가능 시간을 정리합니다."],
  ["03", "실기 능력 향상", "종목별 기록 변화와 약점 종목을 훈련 계획에 반영합니다."],
  ["04", "상담·관리 연결", "공개자료에서 끝내지 않고 상담 후 필요한 관리 흐름으로 이어갑니다."],
] as const;

const trainingPreviewCards = [
  {
    title: "실기 기록 추적",
    text: "제자리멀리뛰기, 왕복달리기, 윗몸일으키기처럼 종목별 현재 기록과 변화 흐름을 봅니다.",
  },
  {
    title: "향상 우선순위",
    text: "점수로 이어지는 종목과 부상 위험이 큰 종목을 분리해 훈련 우선순위를 정합니다.",
  },
  {
    title: "코치 피드백",
    text: "기록 숫자만 보지 않고 자세, 컨디션, 반복 훈련에서 막히는 원인을 함께 확인합니다.",
  },
  {
    title: "상담 후 관리",
    text: "공개 홈페이지가 아닌 상담 이후 흐름에서 학생별 기록과 훈련 방향을 관리합니다.",
  },
] as const;

const trainingPreviewRows = [
  ["제자리멀리뛰기", "현재 기록", "목표 기록", "동작 피드백"],
  ["10m 왕복달리기", "출발 반응", "전환 속도", "주차별 변화"],
  ["윗몸일으키기", "반복 횟수", "감점 요인", "보완 루틴"],
] as const;

const aiGuardrails = [
  "합격 여부를 판정하지 않습니다.",
  "공식 입시 결과를 예측하지 않습니다.",
  "상담 전 질문과 확인 순서를 정리합니다.",
] as const;

const starterGuideCards = [
  {
    label: "STEP 1",
    title: "조건을 먼저 좁히기",
    text: "지역, 수시·정시, 등급대, 포함·제외할 실기 종목을 고르면 긴 목록을 훨씬 짧게 볼 수 있습니다.",
  },
  {
    label: "STEP 2",
    title: "대학 상세로 이동",
    text: "검색 결과 카드는 요약만 보여주고, 실제 전형·입결·실기 기준은 대학별 하위 페이지에서 확인합니다.",
  },
  {
    label: "STEP 3",
    title: "공식 자료로 최종 확인",
    text: "기록 기준과 등급 숫자는 대학별 공식 모집요강과 입시결과표가 최종 기준입니다.",
  },
] as const;

const gradeBandLabels = {
  "grade-1-2": "1~2등급대",
  "grade-3": "3등급대",
  "grade-4": "4등급대",
  "grade-5-plus": "5등급 이하",
} as const;

function getSchoolDisplayName(school: (typeof peExamRegionDetails)[number]["universities"][number]) {
  return `${school.name}${school.campus ? ` ${school.campus}` : ""}`;
}

function uniqueItems(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function compactPracticalItem(item: string) {
  return item
    .replace(/\([^)]*\)/g, "")
    .replace(/\s*[:：].*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getGradeBand(value: number) {
  if (value <= 2.49) return "grade-1-2";
  if (value <= 3.49) return "grade-3";
  if (value <= 4.49) return "grade-4";
  return "grade-5-plus";
}

function extractGradeBands(texts: string[]) {
  const bands = new Set<string>();

  for (const text of texts) {
    for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*등급/g)) {
      const value = Number(match[1]);
      if (Number.isFinite(value) && value >= 1 && value <= 9) bands.add(getGradeBand(value));
    }
  }

  return [...bands];
}

function getSchoolSearchKeywords(school: (typeof peExamRegionDetails)[number]["universities"][number]) {
  if (!("searchKeywords" in school) || !Array.isArray(school.searchKeywords)) return [];
  return school.searchKeywords;
}

const universitySearchCards = peExamRegionDetails
  .flatMap((region) =>
    region.universities.map((school) => {
      const name = getSchoolDisplayName(school);
      const searchKeywords = getSchoolSearchKeywords(school);
      const earlyPracticalItems = school.earlyAdmissions.flatMap((admission) => [
        ...admission.practicalTasks,
        ...admission.practicalCriteriaItems,
      ]);
      const regularPracticalItems = school.regularAdmissions.flatMap((admission) => [
        ...admission.practicalTasks,
        ...admission.practicalCriteriaItems,
      ]);
      const practicalFilterItems = uniqueItems(
        [...school.earlyAdmissions.flatMap((admission) => admission.practicalTasks), ...school.regularAdmissions.flatMap((admission) => admission.practicalTasks)]
          .map(compactPracticalItem),
      ).slice(0, 12);
      const practicalPreview = uniqueItems([...earlyPracticalItems, ...regularPracticalItems]).slice(0, 3);
      const earlyGradeCount = school.earlyAdmissions.filter((admission) => admission.hasGradeDetail).length;
      const regularResultCount = school.regularSelectionDetail?.resultRows.length || 0;
      const gradeTexts = [
        ...school.earlyAdmissions.flatMap((admission) => [
          admission.gradeSummary,
          admission.minimumCriteriaSummary,
          admission.elementSummary,
        ]),
        ...school.regularAdmissions.flatMap((admission) => [
          admission.gradeSummary,
          admission.method,
          admission.unitSummary,
        ]),
        ...(school.regularSelectionDetail?.resultRows || []).flatMap((row) => [
          row.note,
          row.englishGrade70 ? `${row.englishGrade70}등급` : "",
        ]),
        ...(school.regularSelectionDetail?.resultHighlights || []),
      ];
      const gradeBands = extractGradeBands(gradeTexts);
      const gradePreview = gradeBands.length
        ? gradeBands.map((band) => gradeBandLabels[band as keyof typeof gradeBandLabels]).join(" · ")
        : "공식 확인";
      const practicalCount = school.earlyAdmissions.filter(
        (admission) =>
          admission.hasPracticalDetail ||
          admission.practicalTasks.length > 0 ||
          admission.practicalCriteriaItems.length > 0,
      ).length + school.regularAdmissions.filter(
        (admission) =>
          admission.practicalTasks.length > 0 ||
          admission.practicalCriteriaItems.length > 0 ||
          admission.method.includes("실기"),
      ).length;

      return {
        key: `${region.slug}-${school.slug}`,
        name,
        meta: `${school.area} · ${school.schoolType}`,
        regionLabel: region.region,
        regionSlug: region.slug,
        earlyHref: getPeExamSchoolTrackHref(region.region, "early", school.slug),
        regularHref: getPeExamSchoolTrackHref(region.region, "regular", school.slug),
        preview: practicalPreview.length ? practicalPreview.join(" · ") : "대학별 상세 페이지에서 전형과 공식 확인 지점을 봅니다.",
        stats: [
          { label: "수시", value: `${school.earlyAdmissions.length}개` },
          { label: "정시", value: `${school.regularAdmissions.length}개` },
          { label: "실기", value: practicalCount ? `${practicalCount}개` : "확인" },
          { label: "등급·입결", value: gradePreview },
        ],
        practicalItems: practicalFilterItems,
        gradeBands,
        searchText: [
          name,
          school.name,
          school.campus || "",
          school.area,
          school.schoolType,
          region.region,
          searchKeywords.join(" "),
          practicalPreview.join(" "),
          practicalFilterItems.join(" "),
          gradePreview,
        ].join(" "),
        flags: {
          early: school.earlyAdmissions.length > 0,
          regular: school.regularAdmissions.length > 0,
          practical: practicalCount > 0,
          result: earlyGradeCount + regularResultCount > 0,
        },
      };
    }),
  )
  .sort((a, b) => {
    const bScore = Number(b.flags.early) + Number(b.flags.regular) + Number(b.flags.practical) + Number(b.flags.result);
    const aScore = Number(a.flags.early) + Number(a.flags.regular) + Number(a.flags.practical) + Number(a.flags.result);
    return bScore - aScore || a.name.localeCompare(b.name, "ko");
  });

const universitySearchRegionOptions = peExamRegionDetails.map((region) => ({
  value: region.slug,
  label: region.region,
  text: region.areas.join(" · "),
}));

const practicalSearchOptions = uniqueItems(
  universitySearchCards.flatMap((card) => card.practicalItems),
)
  .sort((a, b) => a.localeCompare(b, "ko"))
  .slice(0, 40)
  .map((item) => ({
    value: item,
    label: item,
  }));

export default function PeExamPage() {
  const faqPreview = faqItems.slice(0, 4);

  return (
    <PageShell>
      <nav className={styles.hubNav} aria-label="체대입시 정보 메뉴">
        <div className={`container ${styles.hubNavInner}`}>
          {hubLinks.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className="eyebrow light-text">PE EXAM SERVICE FLOW</p>
            <h1>대학정보 확인에서 실기 향상 관리까지 이어집니다.</h1>
            <p>
              전국 체육관련학과 대학 정보를 먼저 확인하고, 현재 성적과 실기 기록을 정리한 뒤
              상담과 훈련관리로 연결하는 체대입시 준비 흐름입니다.
            </p>
            <div className={styles.heroActions}>
              <Link className="button primary" href="#university-search">
                대학 정보 검색
              </Link>
              <Link className="button secondary" href="/apply?service=pe-exam">
                체대입시 상담 신청
              </Link>
            </div>
            <dl className={styles.heroStats} aria-label="체대입시 허브 주요 데이터">
              <div>
                <dt>전국 목록</dt>
                <dd>{catalogMeta.count}개</dd>
              </div>
              <div>
                <dt>수시 전형</dt>
                <dd>{kusfAdmissionMeta.admissionCount}개</dd>
              </div>
              <div>
                <dt>정시 전형</dt>
                <dd>{adigaRegularAdmissionMeta.admissionCount}개</dd>
              </div>
            </dl>
          </div>

          <aside className={styles.heroPanel} aria-label="체대입시 준비 흐름">
            {startFlowItems.map(([number, title, text]) => (
              <article key={number}>
                <strong>{number}</strong>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </aside>
        </div>
      </section>

      <section className={styles.starterGuideSection} id="start-guide" aria-label="체대입시 첫 방문자 가이드">
        <div className={`container ${styles.starterGuideInner}`}>
          <div className={styles.starterGuideLead}>
            <p className="eyebrow">START GUIDE</p>
            <h2>처음 왔다면 세 가지만 먼저 고르세요.</h2>
            <p>
              모든 자료를 한 번에 읽으려 하지 않아도 됩니다. 목표 지역, 수시·정시,
              현재 실기 종목을 기준으로 후보를 줄이면 다음 행동이 명확해집니다.
            </p>
          </div>
          <div className={styles.starterGuideCards}>
            {starterGuideCards.map((card) => (
              <article key={card.label}>
                <span>{card.label}</span>
                <strong>{card.title}</strong>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.searchSection}`} id="university-search">
        <div className="container">
          <div className={styles.searchSectionHead}>
            <div>
              <p className="eyebrow">UNIVERSITY SEARCH</p>
              <h2>학교명을 검색하고 수시·정시 상세 페이지로 바로 이동합니다.</h2>
            </div>
            <p>
              첫 화면에서 대학을 먼저 찾고, 선택한 전형 페이지에서 등급·입결, 실기 종목,
              기록 기준, 공식 확인 링크를 이어서 봅니다.
            </p>
          </div>
          <PeExamHomeSearchClient
            cards={universitySearchCards}
            practicalOptions={practicalSearchOptions}
            regionOptions={universitySearchRegionOptions}
          />
        </div>
      </section>

      <section className={`section ${styles.resourcesSection}`} id="resources">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">PUBLIC RESOURCES</p>
            <h2>공개자료는 네 가지 흐름으로 구성했습니다.</h2>
            <p>
              홈페이지는 학생 개인 기록을 받는 관리 시스템이 아니라, 입시 자료를 먼저 확인하고
              상담으로 넘어가기 위한 허브입니다.
            </p>
          </div>

          <div className={styles.resourceGrid}>
            {resourceCards.map((card) => (
              <article className={styles.resourceCard} key={card.title}>
                <span>{card.label}</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.timelineSection}`} id="timeline">
        <div className={`container ${styles.timelineLayout}`}>
          <div className={styles.timelineIntro}>
            <p className="eyebrow light-text">2026 ADMISSION FLOW</p>
            <h2>2026년 전체 흐름은 수시, 수능, 정시 순서로 봅니다.</h2>
            <p>
              아래 일정은 2027학년도 대입전형의 2026년 진행 흐름입니다. 체육계열 실기고사와
              세부 제출 일정은 대학별 모집요강에서 다시 확인해야 합니다.
            </p>
          </div>

          <ol className={styles.timelineCards}>
            {admissionTimeline2026.map((item, index) => (
              <li key={item.period}>
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <div>
                  <span>{item.period}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className={styles.sourcePanel}>
            <h3>공식 확인 경로</h3>
            <div className={styles.sourceGrid}>
              {sourceLinks.map((source) => (
                <a href={source.href} key={source.href} rel="noopener noreferrer" target="_blank">
                  <strong>{source.label}</strong>
                  <span>{source.text}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`section ${styles.universitySection}`} id="universities">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">UNIVERSITY GUIDE</p>
            <h2>지역별 대학은 전체 현황을 먼저 보고, 상세 정보는 지역 페이지에서 이어집니다.</h2>
            <p>
              {catalogMeta.source}입니다. 메인에서는 권역별 대학 수와 제공 정보의 범위만 정리하고,
              대학별 수시·정시 전형과 실기·등급 확인 지점은 하위 페이지에서 편하게 둘러볼 수 있게 구성했습니다.
            </p>
          </div>

          <div className={styles.catalogStats} aria-label="체육관련학과 대학 목록 요약">
            <article>
              <span>목록 기준</span>
              <strong>{catalogMeta.count}건</strong>
              <p>전국 체육관련학과 대학</p>
            </article>
            <article>
              <span>KUSF 수시</span>
              <strong>{kusfAdmissionMeta.admissionCount}개</strong>
              <p>수시 일반전형 요약</p>
            </article>
            <article>
              <span>ADIGA 정시</span>
              <strong>{adigaRegularAdmissionMeta.admissionCount}개</strong>
              <p>정시 예체능 전형방법</p>
            </article>
            <article>
              <span>KUSF 상세</span>
              <strong>{kusfAdmissionDetailMeta.practicalDetailCount}개</strong>
              <p>수시 실기 과제 상세 보유</p>
            </article>
          </div>

          <div className={styles.filterPills} aria-label="지역별 수시 정시 선택 페이지 바로가기">
            <a href="#universities">전체</a>
            {peExamRegionDetails.map((region) => (
              <Link href={region.href} key={region.slug}>
                {region.region}
              </Link>
            ))}
          </div>

          <div className={styles.kusfDataPanel}>
            <div className={styles.kusfDataHead}>
              <div>
                <p className="eyebrow">OFFICIAL DATA SNAPSHOT</p>
                <h3>수시는 KUSF, 정시는 ADIGA 기준으로 대학별 전형을 연결했습니다.</h3>
                <p>
                  {kusfAdmissionMeta.sourceName}에서 가져온 {kusfAdmissionMeta.universityCount}개 대학,
                  {kusfAdmissionMeta.universitiesWithAdmissions}개 대학의 {kusfAdmissionMeta.admissionCount}개
                  수시 전형과 {adigaRegularAdmissionMeta.sourceName}에서 가져온{" "}
                  {adigaRegularAdmissionMeta.universitiesWithAdmissions}개 대학의{" "}
                  {adigaRegularAdmissionMeta.admissionCount}개 정시 전형방법입니다. 여기에{" "}
                  {kusfAdmissionDetailMeta.sourceName}에서 수시 실기 상세{" "}
                  {kusfAdmissionDetailMeta.practicalDetailCount}개, 학생부·등급 기준{" "}
                  {kusfAdmissionDetailMeta.gradeDetailCount}개를 추가로 연결했습니다.
                </p>
              </div>
              <div className={styles.dataSourceLinks}>
                <a href={kusfAdmissionMeta.sourceUrl} rel="noopener noreferrer" target="_blank">
                  KUSF 수시 확인
                </a>
                <a href={adigaRegularAdmissionMeta.sourceUrl} rel="noopener noreferrer" target="_blank">
                  ADIGA 정시 확인
                </a>
              </div>
            </div>

            <div className={styles.coverageGrid} aria-label="체대입시 공식자료 연결 범위">
              <article>
                <span>전국 목록</span>
                <strong>{catalogMeta.count}개 대학</strong>
                <p>권역별 대학 수를 먼저 보고, 지역 페이지에서 수시·정시 준비 경로를 선택합니다.</p>
              </article>
              <article>
                <span>수시 자료</span>
                <strong>{kusfAdmissionMeta.admissionCount}개 전형</strong>
                <p>
                  {kusfAdmissionMeta.universitiesWithAdmissions}개 대학의 일반전형과 실기 상세{" "}
                  {kusfAdmissionDetailMeta.practicalDetailCount}개를 연결했습니다.
                </p>
              </article>
              <article>
                <span>정시 자료</span>
                <strong>{adigaRegularAdmissionMeta.admissionCount}개 전형방법</strong>
                <p>
                  {adigaRegularAdmissionMeta.unitCount}개 모집단위와 {adigaRegularSelectionMeta.resultYear}학년도
                  입시결과 {adigaRegularSelectionMeta.resultRowCount}개 행을 함께 확인합니다.
                </p>
              </article>
              <article className={styles.coverageCaution}>
                <span>별도 확인</span>
                <strong>수시 평균등급·등급컷</strong>
                <p>
                  KUSF 상세 자료는 학생부 반영방법과 최저 기준 중심입니다. 모든 대학의 숫자형 평균등급·등급컷은
                  대학별 상세 페이지에서 공식 모집요강 확인 항목으로 분리했습니다.
                </p>
              </article>
            </div>

            <ul className={styles.coverageFootnotes} aria-label="하위 페이지 확인 방식">
              <li>수시생은 지역 선택 후 수시 페이지에서 실기 종목, 학생부 기준, 모집단위별 확인 링크를 봅니다.</li>
              <li>정시생은 지역 선택 후 정시 페이지에서 전형방법, 모집단위, ADIGA 평가기준·입시결과를 봅니다.</li>
              <li>기록 기준과 등급 숫자는 대학별 공식 모집요강과 입시결과표가 최종 기준입니다.</li>
            </ul>
          </div>

          <div className={styles.universityScopeGrid} aria-label="지역별 대학 섹션에서 볼 수 있는 정보">
            {universityScopeCards.map((card) => (
              <article key={card.title}>
                <strong>{card.title}</strong>
                <p>{card.text}</p>
              </article>
            ))}
          </div>

          <div className={styles.regionOverviewGrid}>
            {peExamRegionDetails.map((region) => (
              <article className={styles.regionOverviewCard} key={region.slug}>
                <div className={styles.regionOverviewHeader}>
                  <span>{region.areas.join(" · ")}</span>
                  <h3>{region.region}</h3>
                </div>
                <p>{region.summary}</p>
                <dl className={styles.regionOverviewStats}>
                  <div>
                    <dt>목록 대학</dt>
                    <dd>{region.catalogCount}개</dd>
                  </div>
                  <div>
                    <dt>수시 전형</dt>
                    <dd>{region.earlyAdmissionCount}개</dd>
                  </div>
                  <div>
                    <dt>정시 전형</dt>
                    <dd>{region.regularAdmissionCount}개</dd>
                  </div>
                  <div>
                    <dt>실기 상세</dt>
                    <dd>{region.practicalDetailCount}개</dd>
                  </div>
                </dl>
                <Link className={styles.regionOverviewLink} href={region.href}>
                  수시·정시 선택
                </Link>
              </article>
            ))}
          </div>

          <div className={styles.catalogNotice}>
            <strong>전국 목록 사용 기준</strong>
            <p>{catalogMeta.note}</p>
          </div>
        </div>
      </section>

      <section className={`section ${styles.roadmapSection}`} id="roadmap">
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">PREPARATION ROADMAP</p>
            <h2>자료 확인 뒤에는 개인별 준비 방향을 분리합니다.</h2>
            <p>
              공개자료는 출발점입니다. 실제 준비 방향은 현재 기록, 학업 상황, 남은 기간,
              희망 대학을 놓고 상담에서 정리합니다.
            </p>
          </div>

          <ol className={styles.roadmapList}>
            {roadmapSteps.map(([number, title, text]) => (
              <li key={number}>
                <strong>{number}</strong>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`section ${styles.trainingManagementSection}`} id="training-management">
        <div className={`container ${styles.trainingManagementLayout}`}>
          <div className={styles.trainingManagementLead}>
            <p className="eyebrow">TRAINING MANAGEMENT</p>
            <h2>RePERFORMANCE의 차이는 자료 확인 이후의 실기 관리입니다.</h2>
            <p>
              대학정보는 출발점입니다. 실제 합격 가능성을 높이는 과정은 현재 기록을 정확히 보고,
              종목별 약점을 훈련으로 바꾸며, 코치 피드백을 계속 누적하는 데 있습니다.
            </p>
            <Link className="button dark" href="/apply?service=pe-exam">
              기록 상담 신청하기
            </Link>
          </div>

          <div className={styles.trainingPreviewPanel} aria-label="실기 관리 프리뷰">
            <div className={styles.trainingPreviewHeader}>
              <span>관리 개념 미리보기</span>
              <strong>공개 페이지에서는 예시만 보여줍니다.</strong>
            </div>
            <div className={styles.trainingPreviewRows}>
              {trainingPreviewRows.map(([event, current, goal, feedback]) => (
                <div key={event}>
                  <strong>{event}</strong>
                  <span>{current}</span>
                  <span>{goal}</span>
                  <span>{feedback}</span>
                </div>
              ))}
            </div>
            <p>
              학생별 실제 기록, 수업 피드백, 세부 훈련 메모는 상담 이후 필요한 경우에만 별도 관리 흐름으로 안내합니다.
            </p>
          </div>
        </div>

        <div className={`container ${styles.trainingCardGrid}`}>
          {trainingPreviewCards.map((card) => (
            <article key={card.title}>
              <strong>{card.title}</strong>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`section ${styles.faqPreviewSection}`}>
        <div className={`container ${styles.faqPreviewLayout}`}>
          <div>
            <p className="eyebrow">FAQ</p>
            <h2>자주 묻는 질문은 전용 페이지에서 이어집니다.</h2>
            <p>
              기존 FAQ는 유지하되, 질문을 더 남기고 싶은 회원은 로그인 후 FAQ 페이지에서
              직접 질문을 보낼 수 있습니다.
            </p>
            <Link className="button secondary" href="/pe-exam/faq">
              FAQ 전체 보기
            </Link>
          </div>

          <div className={styles.faqList}>
            {faqPreview.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.aiSection}`} id="ai-consult">
        <div className={`container ${styles.aiLayout}`}>
          <div>
            <p className="eyebrow light-text">CONSULTATION PREP</p>
            <h2>AI 입시 상담은 합격 예측이 아니라 상담 준비를 돕는 기능입니다.</h2>
            <p>
              도입 예정인 AI 기능은 목표 대학, 현재 기록, 질문 목록, 확인해야 할 자료를 정리하는 보조 도구입니다.
              합격 여부를 판정하거나 공식 입시 결과를 대신 예측하는 방식으로 운영하지 않습니다.
            </p>
          </div>

          <aside className={styles.aiPanel} aria-label="AI 입시 상담 예정 입력 항목">
            <strong>도입 예정 입력 항목</strong>
            <div>
              {aiFields.map((field) => (
                <span key={field}>{field}</span>
              ))}
            </div>
            <ul className={styles.aiGuardrailList}>
              {aiGuardrails.map((guardrail) => (
                <li key={guardrail}>{guardrail}</li>
              ))}
            </ul>
            <Link className="button primary" href="/pe-exam/ai-consult">
              AI 상담 방향 가이드
            </Link>
          </aside>
        </div>
      </section>

      <section className={`section ${styles.consultSection}`}>
        <div className={`container ${styles.consultInner}`}>
          <div>
            <p className="eyebrow light-text">NEXT STEP</p>
            <h2>자료를 확인했다면 개인 준비 방향은 상담에서 정리합니다.</h2>
            <p>
              희망 대학, 현재 기록, 가능한 운동 시간, 몸 상태를 바탕으로 체대입시 운동·입시
              상담을 진행합니다. 상담 이후 필요한 학생에게 내부 관리 방식을 별도로 안내합니다.
            </p>
          </div>
          <Link className="button primary" href="/apply?service=pe-exam">
            체대입시 상담 신청
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
