import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/SiteChrome";
import {
  admissionTimeline2026,
  adigaRegularAdmissionMeta,
  adigaRegularSelectionMeta,
  catalogMeta,
  getPeExamSchoolTrackHref,
  kusfAdmissionDetailMeta,
  kusfAdmissionMeta,
  peExamRegionDetails,
  sourceLinks,
} from "./peExamData";
import PeExamHomeSearchClient from "./PeExamHomeSearchClient";
import {
  getVerifiedPracticalStandards,
  verifiedPracticalEventOptions,
} from "./peExamVerifiedStandards";
import styles from "./PeExamHub.module.css";

export const metadata: Metadata = {
  title: "체대입시 정보 허브 | RePERFORMANCE",
  description:
    "2026년 대입 흐름, 전국 체육 관련 학과 대학 목록, 수시·정시 준비 기준, FAQ와 로그인 회원용 AI 입시 상담 방향 가이드를 확인하는 RePERFORMANCE 체대입시 정보 허브입니다.",
};

const hubLinks = [
  { href: "#university-search", label: "대학 찾기" },
  { href: "#training-management", label: "실기 관리" },
  { href: "#guide-index", label: "일정·지역" },
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
    text: "전국 체육 관련 학과 대학을 권역별로 훑고, 상세 페이지에서 대학별 전형을 이어서 봅니다.",
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
    title: "공식 자료 기준",
    text: "실기 종목별 기록표와 전년도 입결 세부값은 대학별 모집요강 및 공식 포털 확인을 우선합니다.",
  },
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

const commonUniversityAliases: Record<string, string[]> = {
  한국체육대학교: ["한체대", "한국체대", "KNSU"],
  서울대학교: ["서울대"],
  연세대학교: ["연세대"],
  고려대학교: ["고려대"],
  성균관대학교: ["성균관대", "성대"],
  한양대학교: ["한양대"],
  경희대학교: ["경희대"],
  중앙대학교: ["중앙대"],
  건국대학교: ["건국대"],
  동국대학교: ["동국대"],
  국민대학교: ["국민대"],
  단국대학교: ["단국대"],
  세종대학교: ["세종대"],
  용인대학교: ["용인대"],
  명지대학교: ["명지대"],
  경기대학교: ["경기대"],
  가천대학교: ["가천대"],
  인하대학교: ["인하대"],
  인천대학교: ["인천대"],
  강원대학교: ["강원대"],
  경북대학교: ["경북대"],
  경상국립대학교: ["경상대", "경상국립대"],
  공주대학교: ["공주대"],
  부산대학교: ["부산대"],
  부경대학교: ["부경대"],
  전남대학교: ["전남대"],
  전북대학교: ["전북대", "JBNU"],
  제주대학교: ["제주대"],
  충남대학교: ["충남대"],
  충북대학교: ["충북대"],
  조선대학교: ["조선대"],
  원광대학교: ["원광대"],
};

function getGeneratedSchoolAliases(name: string) {
  const aliases = new Set<string>();
  const cleanName = name.replace(/\s*본교$/, "").trim();
  const shortenedName = cleanName.replace(/대학교/g, "대").replace(/대학$/g, "대");

  if (shortenedName !== cleanName) aliases.add(shortenedName);
  if (cleanName.startsWith("국립")) {
    aliases.add(cleanName.replace(/^국립/, ""));
    aliases.add(shortenedName.replace(/^국립/, ""));
  }
  if (cleanName.includes("캠퍼스")) aliases.add(shortenedName.replace(/캠퍼스/g, "").trim());

  for (const [officialName, commonAliases] of Object.entries(commonUniversityAliases)) {
    if (cleanName.includes(officialName) || officialName.includes(cleanName)) {
      commonAliases.forEach((alias) => aliases.add(alias));
    }
  }

  return [...aliases].filter(Boolean);
}

function getSchoolSearchKeywords(school: (typeof peExamRegionDetails)[number]["universities"][number]) {
  const manualKeywords =
    "searchKeywords" in school && Array.isArray(school.searchKeywords) ? school.searchKeywords : [];
  const displayName = getSchoolDisplayName(school);

  return uniqueItems([
    ...manualKeywords,
    ...getGeneratedSchoolAliases(displayName),
    ...getGeneratedSchoolAliases(school.name),
  ]);
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
        universityCode: school.code,
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
        aliases: searchKeywords,
        verifiedStandards: getVerifiedPracticalStandards(school.code),
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

const practicalSearchOptions = [
  { value: "제자리멀리뛰기", label: "제자리멀리뛰기" },
  { value: "10m 왕복달리기", label: "10m 왕복달리기" },
  { value: "20m 왕복달리기", label: "20m 왕복달리기" },
  { value: "윗몸일으키기", label: "윗몸일으키기" },
  { value: "좌전굴", label: "좌전굴·윗몸앞으로굽히기" },
  { value: "배근력", label: "배근력" },
  { value: "메디신볼던지기", label: "메디신볼던지기" },
  { value: "핸드볼공던지기", label: "핸드볼공던지기" },
  { value: "제자리높이뛰기", label: "제자리높이뛰기" },
  { value: "Z런", label: "Z런·지그재그런" },
  { value: "100m 달리기", label: "100m 달리기" },
  { value: "80m 달리기", label: "80m 달리기" },
  { value: "농구", label: "농구·레이업" },
  { value: "배구", label: "배구" },
  { value: "축구", label: "축구" },
  { value: "체조", label: "체조" },
  { value: "태권도", label: "태권도" },
] as const;

export default function PeExamPage() {
  return (
    <PageShell>
      <nav className={styles.hubNav} aria-label="체대입시 정보 메뉴">
        <div className={`container ${styles.hubNavInner}`}>
          <span className={styles.hubNavLabel}>QUICK INDEX</span>
          {hubLinks.map((link, index) => (
            <Link href={link.href} key={link.href}>
              <span className={styles.hubNavIndex}>{String(index + 1).padStart(2, "0")}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className="eyebrow light-text">PE EXAM, MADE CLEAR</p>
            <h1>찾고, 비교하고,<br />기록을 올립니다.</h1>
            <p>
              대학 정보 확인에서 실기 향상 관리까지. 필요한 정보부터 짧게 보고
              현재 기록을 실제 훈련 계획으로 연결합니다.
            </p>
            <div className={styles.heroActions}>
              <Link className="button primary" href="#university-search">
                <span>대학 정보 검색</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link className="button secondary" href="/apply?service=pe-exam">
                <span>체대입시 상담 신청</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <aside className={styles.heroDecision} aria-label="체대입시 시작 선택">
            <span>START WITH ONE</span>
            <Link href="#university-search">
              <strong>학교를 알고 있어요.</strong>
              <small>대학명 검색으로 바로 시작</small>
              <em aria-hidden="true">→</em>
            </Link>
            <Link href="#university-search">
              <strong>조건부터 정리할게요.</strong>
              <small>지역·전형·실기 기준으로 탐색</small>
              <em aria-hidden="true">→</em>
            </Link>
          </aside>
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
            recordOptions={verifiedPracticalEventOptions}
            regionOptions={universitySearchRegionOptions}
          />
        </div>
      </section>

      <section className={`section ${styles.trainingManagementSection}`} id="training-management">
        <div className={`container ${styles.trainingCompactLayout}`}>
          <div className={styles.trainingManagementLead}>
            <p className="eyebrow">TRAINING MANAGEMENT</p>
            <h2>정보를 찾았다면,<br />기록을 올릴 차례입니다.</h2>
            <p>
              실기 기록 추적, 종목별 우선순위, 코치 피드백을 한 흐름으로 연결합니다.
            </p>
            <Link className="button dark" href="/apply?service=pe-exam">
              기록 상담 신청하기
            </Link>
          </div>

          <div className={styles.trainingCompactSteps} aria-label="실기 관리 흐름">
            {trainingPreviewCards.slice(0, 3).map((card, index) => (
              <article key={card.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{card.title}</strong>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.resourcesSection}`} id="resources">
        <div className="container">
          <details className={styles.resourceDisclosure}>
            <summary>
              <span>
                <small>PUBLIC RESOURCES</small>
                <strong>입시 정보 허브에서 제공하는 자료 범위</strong>
              </span>
              <em>펼쳐보기</em>
            </summary>
            <p className={styles.resourceDisclosureIntro}>
              홈페이지는 학생 개인 기록을 받는 관리 시스템이 아니라, 입시 자료를 먼저 확인하고
              상담으로 넘어가기 위한 공개 허브입니다.
            </p>
            <div className={styles.resourceGrid}>
              {resourceCards.map((card) => (
                <article className={styles.resourceCard} key={card.title}>
                  <span>{card.label}</span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
          </details>
        </div>
      </section>

      <details className={`${styles.guideDisclosure} ${styles.timelineSection}`} id="guide-index">
        <summary>
          <span><small>2026 ADMISSION FLOW</small><strong>2026 일정과 공식 확인 경로</strong></span>
          <em>필요할 때 펼쳐보기</em>
        </summary>
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
      </details>

      <details className={`${styles.guideDisclosure} ${styles.universitySection}`} id="universities">
        <summary>
          <span><small>REGIONAL UNIVERSITY GUIDE</small><strong>지역별 대학과 공식 자료 범위</strong></span>
          <em>권역을 고를 때 펼쳐보기</em>
        </summary>
        <div className="container">
          <div className={styles.sectionHead}>
            <p className="eyebrow">UNIVERSITY GUIDE</p>
            <h2>지역별 대학은 전체 현황을 먼저 보고, 상세 정보는 지역 페이지에서 이어집니다.</h2>
            <p>
              {catalogMeta.source}입니다. 메인에서는 권역별 대학 수와 제공 정보의 범위만 정리하고,
              대학별 수시·정시 전형과 실기·등급 확인 지점은 하위 페이지에서 편하게 둘러볼 수 있게 구성했습니다.
            </p>
          </div>

          <div className={styles.catalogStats} aria-label="체육 관련 학과 대학 목록 요약">
            <article>
              <span>목록 기준</span>
              <strong>{catalogMeta.count}건</strong>
              <p>전국 체육 관련 학과 대학</p>
            </article>
            <article>
              <span>KUSF 수시</span>
              <strong>{kusfAdmissionMeta.admissionCount}개</strong>
              <p>수시 일반 전형 요약</p>
            </article>
            <article>
              <span>ADIGA 정시</span>
              <strong>{adigaRegularAdmissionMeta.admissionCount}개</strong>
              <p>정시 예체능 전형 방법</p>
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

          <details className={styles.kusfDataDisclosure}>
            <summary>
              <span>
                <strong>공식 자료 연결 범위</strong>
                <small>KUSF 수시, ADIGA 정시, 실기·학생부 자료의 적용 범위를 확인합니다.</small>
              </span>
              <span className={styles.disclosureAction} aria-hidden="true">펼쳐 보기</span>
            </summary>
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
                  {adigaRegularAdmissionMeta.admissionCount}개 정시 전형 방법입니다. 여기에{" "}
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

            <div className={styles.coverageGrid} aria-label="체대입시 공식 자료 연결 범위">
              <article>
                <span>전국 목록</span>
                <strong>{catalogMeta.count}개 대학</strong>
                <p>권역별 대학 수를 먼저 보고, 지역 페이지에서 수시·정시 준비 경로를 선택합니다.</p>
              </article>
              <article>
                <span>수시 자료</span>
                <strong>{kusfAdmissionMeta.admissionCount}개 전형</strong>
                <p>
                  {kusfAdmissionMeta.universitiesWithAdmissions}개 대학의 일반 전형과 실기 상세{" "}
                  {kusfAdmissionDetailMeta.practicalDetailCount}개를 연결했습니다.
                </p>
              </article>
              <article>
                <span>정시 자료</span>
                <strong>{adigaRegularAdmissionMeta.admissionCount}개 전형 방법</strong>
                <p>
                  {adigaRegularAdmissionMeta.unitCount}개 모집단위와 {adigaRegularSelectionMeta.resultYear}학년도
                  입시 결과 {adigaRegularSelectionMeta.resultRowCount}개 행을 함께 확인합니다.
                </p>
              </article>
              <article className={styles.coverageCaution}>
                <span>별도 확인</span>
                <strong>수시 평균 등급·등급컷</strong>
                <p>
                  KUSF 상세 자료는 학생부 반영 방법과 최저 기준 중심입니다. 모든 대학의 숫자형 평균 등급·등급컷은
                  대학별 상세 페이지에서 공식 모집요강 확인 항목으로 분리했습니다.
                </p>
              </article>
            </div>

            <ul className={styles.coverageFootnotes} aria-label="하위 페이지 확인 방식">
              <li>수시생은 지역 선택 후 수시 페이지에서 실기 종목, 학생부 기준, 모집단위별 확인 링크를 봅니다.</li>
              <li>정시생은 지역 선택 후 정시 페이지에서 전형 방법, 모집단위, ADIGA 평가 기준·입시 결과를 봅니다.</li>
              <li>기록 기준과 등급 숫자는 대학별 공식 모집요강과 입시 결과표가 최종 기준입니다.</li>
            </ul>
            </div>
          </details>

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
      </details>

      <section className={styles.peActionIndex} aria-label="체대입시 다음 경로">
        <div className="container">
          <div>
            <p className="eyebrow">CHOOSE THE NEXT STEP</p>
            <h2>더 읽기보다, 다음 행동을 고르세요.</h2>
          </div>
          <nav>
            <Link href="/pe-exam/faq">
              <span>01</span><strong>FAQ 확인</strong><small>자주 묻는 질문만 짧게</small><em>→</em>
            </Link>
            <Link href="/pe-exam/ai-consult">
              <span>02</span><strong>AI 상담 준비</strong><small>합격 예측이 아니라 상담 준비</small><em>→</em>
            </Link>
            <Link href="/apply?service=pe-exam">
              <span>03</span><strong>코치 상담 신청</strong><small>현재 기록과 훈련 방향 연결</small><em>→</em>
            </Link>
          </nav>
          <p className={styles.peActionGuardrail}>
            AI는 합격 여부를 판정하거나 공식 입시 결과를 예측하지 않으며 실제 코치 상담을 준비하는 보조 자료로만 사용합니다.
          </p>
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
