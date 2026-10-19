import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import ts from "typescript";

// A deliberately narrow release gate: no environment, network, or database access.
const root = process.cwd();
const baseline = "6f7c91826901013cf23ef3f4cf74f7a3f4045e1e";
const allowedFiles = new Set([
  "app/pe-exam/page.tsx",
  "app/pe-exam/PeExamHomeSearchClient.jsx",
  "app/pe-exam/PeExamHomeDesign.module.css",
  "scripts/check-pe-exam-search-design.mjs",
  "scripts/check-rp-public-production.mjs",
  "scripts/check-pe-exam-verified-standards.mjs",
]);

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
}

const changedFiles = new Set([
  ...git("diff", "--name-only", "-z", baseline, "--").split("\0").filter(Boolean),
  ...git("ls-files", "--others", "--exclude-standard", "-z").split("\0").filter(Boolean),
]);
function assertDesignScope(files) {
  for (const file of files) {
    assert.ok(allowedFiles.has(file), `Design release cannot change ${file}`);
  }
}
assertDesignScope(changedFiles);
assert.ok(changedFiles.size >= 3, "The gate must inspect a real search-design change");

const productionCheckFile = "scripts/check-rp-public-production.mjs";
const productionCheck = read(productionCheckFile);
const baselineProductionCheck = git("show", `${baseline}:${productionCheckFile}`).replace(/\r\n/g, "\n");
function replacePePageExpectation(source) {
  const pattern = /(?<=path: "\/pe-exam",\n\s*label: "PE exam hub",\n)\s*expectedTexts: \[[^\n]+\],\n\s*requiredHrefs: \[[^\n]+\],/;
  assert.equal((source.match(new RegExp(pattern.source, "g")) || []).length, 1);
  return source.replace(pattern, "<PE_PAGE_PRESENTATION_EXPECTATIONS>");
}
assert.equal(
  replacePePageExpectation(productionCheck),
  replacePePageExpectation(baselineProductionCheck),
  "Public production checks may change only the PE page copy/link expectations, never API/security/other routes",
);
const standardsCheckFile = "scripts/check-pe-exam-verified-standards.mjs";
const baselineStandardsCheck = git("show", `${baseline}:${standardsCheckFile}`).replace(/\r\n/g, "\n");
const oldStandardAssertion = "assert.ok(clientSource.includes('getStandardComparison'));";
const newStandardAssertion = [
  "const comparisonSource = fs.readFileSync(path.join(root, 'app/pe-exam/peExamComparison.mjs'), 'utf8');",
  "assert.ok(clientSource.includes('getCardPracticalComparison(card, records, applicantSex, trackFilter)'));",
  "assert.ok(comparisonSource.includes('function getStandardComparison(card, record, applicantSex, trackFilter, department)'));",
  "assert.ok(comparisonSource.includes('comparison: getStandardComparison(card, record, applicantSex, trackFilter, department)'));",
].join("\n");
assert.equal(baselineStandardsCheck.split(oldStandardAssertion).length, 2);
assert.equal(read(standardsCheckFile), baselineStandardsCheck.replace(oldStandardAssertion, newStandardAssertion),
  "The existing standards check may only correct its obsolete helper-location assertion");
console.log(`PASS: ${changedFiles.size} release files stay inside the design-only boundary`);

const homeFile = "app/pe-exam/page.tsx";
const clientFile = "app/pe-exam/PeExamHomeSearchClient.jsx";
const home = read(homeFile);
const client = read(clientFile);
const SearchClientMarker = Symbol("SearchClient");
const jsxRuntime = {
  Fragment: Symbol("Fragment"),
  jsx: (type, props) => ({ type, props: props || {} }),
  jsxs: (type, props) => ({ type, props: props || {} }),
};
const states = [];
const refs = [];
let stateCursor = 0;
let refCursor = 0;
const hooks = {
  useState(initial) {
    const index = stateCursor++;
    if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
    return [states[index], (next) => {
      states[index] = typeof next === "function" ? next(states[index]) : next;
    }];
  },
  useMemo: (factory) => factory(),
  useRef(initial) {
    const index = refCursor++;
    refs[index] ??= { current: initial };
    return refs[index];
  },
};
const moduleCache = new Map();

function loadLocalModule(relativeFile) {
  const absoluteFile = path.resolve(root, relativeFile);
  assert.ok(absoluteFile.startsWith(`${path.join(root, "app", "pe-exam")}${path.sep}`));
  if (moduleCache.has(absoluteFile)) return moduleCache.get(absoluteFile).exports;
  const module = { exports: {} };
  moduleCache.set(absoluteFile, module);
  const originalSource = fs.readFileSync(absoluteFile, "utf8");
  const source = absoluteFile === path.join(root, clientFile)
    ? `${originalSource}\nexport { getSearchTokens, getCardTrackMatch };`
    : originalSource;
  const output = ts.transpileModule(source, {
    fileName: absoluteFile.endsWith(".mjs") ? `${absoluteFile}.ts` : absoluteFile,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const requireLocal = (specifier) => {
    if (specifier === "react/jsx-runtime") return jsxRuntime;
    if (specifier === "react") return hooks;
    if (specifier === "next/link") return { __esModule: true, default: "a" };
    if (specifier === "next/navigation") return { notFound: () => { throw new Error("notFound"); } };
    if (specifier.endsWith("/_components/SiteChrome")) return { PageShell: "main" };
    if (specifier.endsWith(".module.css")) {
      const css = fs.readFileSync(path.resolve(path.dirname(absoluteFile), specifier), "utf8");
      const names = [...css.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((match) => [match[1], match[1]]);
      return { __esModule: true, default: Object.fromEntries(names) };
    }
    if (specifier.endsWith("/PeExamHomeSearchClient") && absoluteFile === path.join(root, homeFile)) {
      return { __esModule: true, default: SearchClientMarker };
    }
    if (specifier.endsWith("/PeExamDepartmentClient")) return { __esModule: true, default: "DepartmentClient" };
    assert.ok(specifier.startsWith("."), `Unexpected dependency: ${specifier}`);
    const candidate = path.resolve(path.dirname(absoluteFile), specifier);
    const resolved = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.jsx`, `${candidate}.mjs`]
      .find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
    assert.ok(resolved, `Cannot resolve ${specifier}`);
    return loadLocalModule(path.relative(root, resolved));
  };
  // Only the local module loader and basic language globals are available.
  vm.runInNewContext(output, { module, exports: module.exports, require: requireLocal }, {
    filename: absoluteFile,
    timeout: 10000,
  });
  return module.exports;
}

function allNodes(tree, parents = []) {
  if (Array.isArray(tree)) return tree.flatMap((child) => allNodes(child, parents));
  if (!tree || typeof tree !== "object" || !("type" in tree)) return [];
  return [{ node: tree, parents }, ...allNodes(tree.props.children, [...parents, tree])];
}

function textContent(tree) {
  if (Array.isArray(tree)) return tree.map(textContent).join("");
  if (tree === null || tree === undefined || typeof tree === "boolean") return "";
  if (typeof tree === "object") return textContent(tree.props?.children);
  return String(tree);
}

const homeTree = loadLocalModule(homeFile).default();
const homeNodes = allNodes(homeTree);
const heading = homeNodes.filter(({ node }) => node.type === "h1");
assert.equal(heading.length, 1, "The page must expose one primary task heading");
assert.equal(textContent(heading[0].node), "대학·학과 찾기");
const searchElement = homeNodes.find(({ node }) => node.type === SearchClientMarker)?.node;
assert.ok(searchElement, "The real server page must supply the client search data");
for (const href of ["/pe-exam/faq", "/pe-exam/ai-consult", "/apply?service=pe-exam"]) {
  assert.ok(homeNodes.some(({ node }) => node.type === "a" && node.props.href === href), `Existing public destination must remain: ${href}`);
}
const cards = searchElement.props.cards;
assert.ok(Array.isArray(cards) && cards.length >= 180, "Existing university coverage must remain");
const Client = loadLocalModule(clientFile).default;
function renderClient() {
  stateCursor = 0;
  refCursor = 0;
  return Client(searchElement.props);
}
let tree = renderClient();
let nodes = allNodes(tree);
const forms = nodes.filter(({ node }) => node.type === "form" && node.props.role === "search");
assert.equal(forms.length, 1, "Search must use one native search form");
assert.equal(typeof forms[0].node.props.onSubmit, "function");
assert.equal(forms[0].node.props.action, undefined, "Search must not submit inputs to a server");
assert.ok(!/\b(?:fetch|sendBeacon)\s*\(|localStorage|sessionStorage|XMLHttpRequest/.test(client), "Design must not introduce input transport or persistence");

function selectByLabel(label, entries = nodes) {
  const match = entries.find(({ node }) => node.type === "label" && textContent(node).startsWith(label));
  assert.ok(match, `Missing ${label} label`);
  const select = allNodes(match.node).find(({ node }) => node.type === "select")?.node;
  assert.ok(select, `Missing native ${label} select`);
  assert.ok(!match.parents.some((parent) => parent.type === "details" || parent.props.hidden), `${label} must be initially visible`);
  return select;
}
selectByLabel("지역");
selectByLabel("전형");
assert.ok(nodes.some(({ node }) => node.type === "details" && !node.props.open), "Optional comparison/filter controls must start collapsed");
console.log("PASS: single task heading, native search form, visible region/track, collapsed optional controls");

function inputQuery(value) {
  const input = nodes.find(({ node }) => node.type === "input" && node.props.type === "search")?.node;
  assert.ok(input, "The native search input must exist");
  assert.equal(input.props.enterKeyHint, "search");
  assert.equal(input.props.name, undefined, "Queries must not enter a fallback GET URL");
  input.props.onChange({ target: { value } });
  tree = renderClient();
  nodes = allNodes(tree);
}

function resultCards() {
  return nodes.filter(({ node }) => node.type === "article" && node.props.className === "homeSearchCard");
}

assert.equal(resultCards().length, 0, "An empty search must not render the whole university catalog");
inputQuery("용인대 체육학과");
assert.equal(resultCards().length, 1, "Compound school alias + department search must identify one university");
assert.match(resultCards()[0].node.props["aria-label"], /용인대학교/);
assert.match(textContent(resultCards()[0].node), /체육학과/);
assert.ok(allNodes(resultCards()[0].node).some(({ node }) =>
  node.type === "a" && /\/regular\/[^/]+\/departments\/physical-education$/.test(node.props.href)),
"A single real matching department must link directly to its regular department page");
const input = nodes.find(({ node }) => node.type === "input" && node.props.type === "search").node;
let focusCount = 0;
resultCards()[0].node.props.ref.current = { focus: () => { focusCount += 1; } };
const submit = () => {
  let prevented = false;
  nodes.find(({ node }) => node.type === "form").node.props.onSubmit({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true, "Enter must not send the search form to a server");
};
input.props.onCompositionStart();
submit();
assert.equal(focusCount, 0, "Korean IME confirmation must not move focus out of the input");
input.props.onCompositionEnd();
for (const nativeEvent of [{ isComposing: true }, { isComposing: false, keyCode: 229 }]) {
  let keyPrevented = false;
  input.props.onKeyDown({ key: "Enter", nativeEvent, preventDefault: () => { keyPrevented = true; } });
  assert.equal(keyPrevented, true, "Native IME signals must prevent premature Enter submission");
}
submit();
assert.equal(focusCount, 1, "An explicit completed search should focus the first result");

const yongin = cards.find((card) => card.name.includes("용인대학교"));
const otherRegion = searchElement.props.regionOptions.find((region) => region.value !== yongin.regionSlug);
selectByLabel("지역").props.onChange({ target: { value: otherRegion.value } });
tree = renderClient();
nodes = allNodes(tree);
assert.equal(resultCards().length, 0, "Region and query must combine, not override each other");
selectByLabel("지역").props.onChange({ target: { value: "all" } });
tree = renderClient();
nodes = allNodes(tree);
selectByLabel("전형").props.onChange({ target: { value: "regular" } });
tree = renderClient();
nodes = allNodes(tree);
for (const { node } of resultCards().flatMap(({ node }) => allNodes(node))) {
  if (node.type === "a") assert.ok(node.props.href.includes("/regular/"), "Track filter must constrain every result link");
}
inputQuery("존재하지않는대학zztest");
assert.equal(resultCards().length, 0, "No match must remain empty");
const resetButton = nodes.find(({ node }) => node.type === "button" && textContent(node) === "필터 초기화")?.node;
assert.ok(resetButton, "No-result search needs a visible recovery action");
resetButton.props.onClick();
tree = renderClient();
nodes = allNodes(tree);
assert.equal(selectByLabel("지역").props.value, "all");
assert.equal(selectByLabel("전형").props.value, "all");
assert.equal(nodes.find(({ node }) => node.type === "input" && node.props.type === "search").node.props.value, "");
assert.equal(resultCards().length, 0);
selectByLabel("지역").props.onChange({ target: { value: yongin.regionSlug } });
tree = renderClient();
nodes = allNodes(tree);
assert.equal(resultCards().length, 4, "A region-only selection must start browsing with bounded results");
const moreButton = nodes.find(({ node }) => node.type === "button" && textContent(node).startsWith("검색 결과 더 보기"))?.node;
assert.ok(moreButton);
moreButton.props.onClick();
tree = renderClient();
nodes = allNodes(tree);
assert.equal(resultCards().length, 8, "Pagination should reveal another four results");
nodes.find(({ node }) => node.type === "button" && textContent(node) === "처음 4개만 보기").node.props.onClick();
tree = renderClient();
nodes = allNodes(tree);
assert.equal(resultCards().length, 4);
console.log("PASS: compound search, real department result, IME/explicit submit, filters, no-result reset, bounded pagination");

const { getCardTrackMatch, getSearchTokens } = loadLocalModule(clientFile);
assert.deepEqual(Array.from(getSearchTokens("  ＫＮＳＵ　 체육학과  ")), ["knsu", "체육학과"]);
const departmentRouteFile = "app/pe-exam/universities/[region]/[track]/[school]/departments/[department]/page.tsx";
const generatedParams = loadLocalModule(departmentRouteFile).generateStaticParams();
const generatedDepartmentHrefs = new Set(generatedParams.map(({ region, track, school, department }) =>
  `/pe-exam/universities/${region}/${track}/${school}/departments/${department}`));
const cardDepartmentHrefs = new Set();
for (const card of cards) {
  for (const track of ["early", "regular"]) {
    const schoolHref = track === "early" ? card.earlyHref : card.regularHref;
    assert.match(schoolHref, /^\/pe-exam\/universities\/[^/]+\/(?:early|regular)\/[^/]+$/);
    const schoolOnly = getCardTrackMatch(card, track, card.name);
    assert.equal(schoolOnly.direct, false, "A school-only query must not infer a department");
    assert.equal(schoolOnly.href, schoolHref);
    for (const link of card.departmentLinks?.[track] || []) {
      cardDepartmentHrefs.add(link.href);
      assert.ok(generatedDepartmentHrefs.has(link.href), `Direct result has no generated department route: ${link.href}`);
      const fixture = { ...card, departmentNames: { [track]: [link.name] } };
      const match = getCardTrackMatch(fixture, track, `${card.name} ${link.name}`);
      assert.equal(match.direct, true);
      assert.equal(match.href, link.href);
      for (const unsafeHref of ["https://example.invalid/", "/pe-exam/universities/other/regular/wrong/departments/fake", `${schoolHref}/departments/../../apply`, `${link.href}?private=1`]) {
        const unsafeCard = { ...fixture, departmentLinks: { [track]: [{ name: link.name, href: unsafeHref }] } };
        const safeMatch = getCardTrackMatch(unsafeCard, track, `${card.name} ${link.name}`);
        assert.equal(safeMatch.direct, false, "Untrusted, wrong-school, traversal, and query-string links must fall back");
        assert.equal(safeMatch.href, schoolHref);
      }
    }
  }
}
assert.ok(generatedDepartmentHrefs.size > 0);
assert.deepEqual([...cardDepartmentHrefs].sort(), [...generatedDepartmentHrefs].sort(), "Every advertised department link must exactly match the existing generated route catalog");
console.log(`PASS: ${cards.length} school cards and ${cardDepartmentHrefs.size} actual department paths; unsafe paths rejected`);

const normalize = (value) => String(value || "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
let trackSpecificCases = 0;
for (const card of cards) {
  for (const track of ["early", "regular"]) {
    const otherTrack = track === "early" ? "regular" : "early";
    for (const department of card.departmentNames?.[track] || []) {
      if (!/학과|학부|전공/.test(department)) continue;
      const token = normalize(department);
      if ((card.departmentNames?.[otherTrack] || []).some((name) => normalize(name).includes(token))) continue;
      if ((card.practicalItems || []).some((name) => normalize(name).includes(token))) continue;
      const query = `${card.name} ${department}`;
      assert.equal(getCardTrackMatch(card, track, query).matchesQuery, true);
      assert.equal(getCardTrackMatch(card, otherTrack, query).matchesQuery, false,
        `Department search must not leak across tracks: ${card.name} ${department}`);
      trackSpecificCases += 1;
    }
  }
}
assert.ok(trackSpecificCases >= 20, "Exercise real track-specific department names, not only synthetic fixtures");
const gachon = cards.find((card) => card.name.includes("가천대학교")
  && Object.values(card.departmentNames).flat().some((name) => normalize(name).includes("운동재활")));
assert.ok(gachon);
for (const track of ["early", "regular"]) {
  const match = getCardTrackMatch(gachon, track, "가천대 운동재활");
  const expectedNames = [...new Set(gachon.departmentNames[track])].filter((name) => normalize(name).includes("운동재활"));
  assert.deepEqual(Array.from(match.names), expectedNames);
  assert.equal(match.matchesQuery, expectedNames.length > 0);
  assert.equal(match.direct, false, "A department without a generated detail page must retain its school detail link");
  assert.equal(match.href, track === "early" ? gachon.earlyHref : gachon.regularHref);
}
console.log(`PASS: ${trackSpecificCases} real track-specific department cases and Gachon non-generated detail fallback`);

// Synthetic inputs only: do not combine a department search with a school-wide
// comparison, which can legitimately select a different department's evidence.
states.length = 0;
refs.length = 0;
tree = renderClient();
nodes = allNodes(tree);
function fieldByLabel(label, type) {
  const wrapper = nodes.find(({ node }) => node.type === "label" && textContent(node).startsWith(label))?.node;
  assert.ok(wrapper, `Missing comparison input label: ${label}`);
  const field = allNodes(wrapper).find(({ node }) => node.type === type)?.node;
  assert.ok(field);
  return field;
}
function updateField(label, type, value) {
  fieldByLabel(label, type).props.onChange({ target: { value } });
  tree = renderClient();
  nodes = allNodes(tree);
}
inputQuery("한체대 스포츠산업학과");
updateField("전형", "select", "regular");
updateField("비교 성별", "select", "male");
updateField("현재 기록", "input", "250");
updateField("내 수능 평균 백분위", "input", "72.5");
assert.equal(resultCards().length, 1);
assert.match(resultCards()[0].node.props["aria-label"], /한국체육대학교/);
assert.equal(nodes.filter(({ node }) => node.props["aria-label"] === "입력 자료 상담 비교 결과").length, 0,
  "A department query must never show a school-wide score from another department");
assert.ok(!nodes.some(({ node }) => node.type === "summary" && textContent(node).includes("공식 비교 근거")),
  "School-wide academic/practical comparison evidence must also be suppressed during department search");
assert.equal(fieldByLabel("현재 기록", "input").props.value, "250");
assert.equal(fieldByLabel("내 수능 평균 백분위", "input").props.value, "72.5");
const clearQueryButton = nodes.find(({ node }) => node.type === "button" && textContent(node) === "검색어만 지우고 비교 재개")?.node;
assert.ok(clearQueryButton, "Comparison must offer an explicit clear-query-only recovery");
clearQueryButton.props.onClick();
tree = renderClient();
nodes = allNodes(tree);
assert.equal(nodes.find(({ node }) => node.type === "input" && node.props.type === "search").node.props.value, "");
assert.equal(fieldByLabel("현재 기록", "input").props.value, "250");
assert.equal(fieldByLabel("내 수능 평균 백분위", "input").props.value, "72.5");
assert.equal(fieldByLabel("비교 성별", "select").props.value, "male");
assert.equal(fieldByLabel("전형", "select").props.value, "regular");
assert.ok(nodes.some(({ node }) => node.props["aria-label"] === "입력 자료 상담 비교 결과"),
  "Clearing only the query must restore the established comparison using preserved inputs");
inputQuery("한체대 스포츠산업학과");
assert.equal(nodes.filter(({ node }) => node.props["aria-label"] === "입력 자료 상담 비교 결과").length, 0);
console.log("PASS: synthetic KNSU department search cannot show another department's comparison; clear-query resumes preserved inputs");

function functionText(source, name) {
  const ast = ts.createSourceFile("client.jsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  const declaration = ast.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
  assert.ok(declaration, `Missing established comparison helper: ${name}`);
  return declaration.getText(ast).replace(/\r\n/g, "\n");
}
const baselineClient = git("show", `${baseline}:${clientFile}`);
for (const name of ["normalizePracticalKey", "getCardPracticalKeys", "getRecordUnit", "formatThreshold", "formatRecordGap", "parseNumericInput", "getAcademicComparison", "getAcademicComparisonLabel", "formatSignedGap"]) {
  assert.equal(functionText(client, name), functionText(baselineClient, name), `Existing ${name} logic must not change in a design release`);
}
for (const guardrail of ["합격 여부를 자동 판정하지 않습니다.", "성별과 측정 방식이 일치하는 공식 만점표만 계산에 사용합니다.", "70% 값은 합격선이나 합격 확률이 아니며", "입력 기록은 브라우저 안에서만 비교하며 서버에 전송하거나 저장하지 않습니다."]) {
  assert.ok(client.includes(guardrail), `Established safety guidance must remain: ${guardrail}`);
}
console.log("PASS: nine established comparison helpers and privacy/admissions guardrails unchanged");

const css = read("app/pe-exam/PeExamHomeDesign.module.css");
const mobileStart = css.indexOf("@media (max-width: 760px)");
const narrowStart = css.indexOf("@media (max-width: 360px)");
assert.ok(mobileStart > 0 && narrowStart > mobileStart, "Tablet/mobile and narrow-phone layouts must be explicit");
const desktopCss = css.slice(0, mobileStart);
const mobileCss = css.slice(mobileStart, narrowStart);
const narrowCss = css.slice(narrowStart);
function declaration(section, selector, property) {
  const blocks = [...section.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const matches = blocks.filter(([, selectors]) => selectors.trim().split(",").map((part) => part.trim()).includes(selector));
  const propertyPattern = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`);
  const values = matches.map(([, , body]) => body.match(propertyPattern)?.[1].trim()).filter(Boolean);
  assert.ok(values.length, `Missing CSS ${selector} ${property}`);
  return values.at(-1);
}
assert.equal(declaration(desktopCss, ".basicFilters", "grid-template-columns"), "repeat(2, minmax(0, 1fr))");
assert.equal(declaration(mobileCss, ".homeSearchCard", "grid-template-columns"), "1fr");
assert.equal(declaration(mobileCss, ".trackRow", "grid-template-columns"), "30px minmax(0, 1fr)");
assert.equal(declaration(mobileCss, ".searchInputWrap input", "font-size"), "16px");
assert.equal(declaration(mobileCss, ".homeSearchSelectLabel select", "font-size"), "16px");
for (const [section, selector, property] of [
  [desktopCss, ".searchForm > button", "min-height"],
  [desktopCss, ".advancedDisclosure > summary", "min-height"],
  [desktopCss, ".searchExamples button", "min-height"],
  [mobileCss, ".searchForm > button", "min-height"],
  [mobileCss, ".homeSearchSelectLabel select", "min-height"],
  [mobileCss, ".trackRow a", "min-height"],
]) {
  assert.ok(parseFloat(declaration(section, selector, property)) >= 44, `Touch target must be at least 44px: ${selector}`);
}
assert.equal(declaration(narrowCss, ".homeSearchAcademicGroup", "grid-template-columns"), "1fr");
assert.match(css, /:focus-visible[^{]*\{[^}]*outline: 3px/);
assert.ok(css.includes("prefers-reduced-motion: reduce"));
assert.ok(!/url\(|@import\b|position:\s*fixed/.test(css), "The design must not add remote decoration or an obstructive fixed layer");
function luminance(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  return hex.slice(1).match(/../g).map((pair) => parseInt(pair, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}
for (const selector of [".searchInputWrap input::placeholder", ".trackRow small", ".sourceNotice", ".hero p:last-child", ".homeSearchEmpty p"]) {
  const contrast = 1.05 / (luminance(declaration(desktopCss, selector, "color")) + 0.05);
  assert.ok(contrast >= 4.5, `${selector} text contrast is ${contrast.toFixed(3)}, below 4.5:1`);
}
const buttonContrast = 1.05 / (luminance(declaration(desktopCss, ".searchForm > button", "background")) + 0.05);
assert.ok(buttonContrast >= 4.5);
console.log("PASS: responsive stacking, six 44px touch targets, 16px inputs, focus/reduced motion and six text contrast checks");

for (const forbidden of ["app/api/rp/applications/route.js", "app/_components/SiteChrome.tsx", "app/pe-exam/peExamData.ts", "app/pe-exam/peExamComparison.mjs", "app/pe-exam/PeExamHub.module.css", "app/services/pe-exam/page.tsx", "package.json", "vercel.json", ".env.local"]) {
  assert.throws(() => assertDesignScope([...changedFiles, forbidden]), /Design release cannot change/);
}
assert.notEqual(replacePePageExpectation(productionCheck.replace('path: "/services",', 'path: "/changed",')), replacePePageExpectation(baselineProductionCheck));
console.log("PASS: boundary negative fixtures reject data/API/common/auth/config expansion");
