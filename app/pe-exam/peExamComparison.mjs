function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function isFullScoreMet(standard, value) {
  if (standard.operator === "gte") return value >= standard.fullScoreThreshold;
  if (standard.operator === "lte") return value <= standard.fullScoreThreshold;
  return value < standard.fullScoreThreshold;
}

function getAttainment(standard, value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (standard.operator === "gte") return value / standard.fullScoreThreshold;
  return standard.fullScoreThreshold / value;
}

function getStandardComparison(card, record, applicantSex, trackFilter, department) {
  const value = Number(record.value);
  if (!applicantSex || !record.eventId || !Number.isFinite(value) || value <= 0) return null;

  const standards = (card.verifiedStandards || [])
    .filter((standard) => standard.eventId === record.eventId)
    .filter((standard) => standard.sex === applicantSex || standard.sex === "all")
    .filter((standard) => trackFilter === "all" || standard.track === trackFilter)
    .filter((standard) => standard.department === department)
    .map((standard) => ({
      standard,
      value,
      met: isFullScoreMet(standard, value),
      attainment: getAttainment(standard, value),
    }))
    .sort((a, b) => Number(b.met) - Number(a.met) || b.attainment - a.attainment);

  return standards[0] || null;
}

export function getCardPracticalComparison(card, records, applicantSex, trackFilter) {
  const enteredRecords = records.filter((record) => Number(record.value) > 0);
  if (!applicantSex || !enteredRecords.length) return null;

  const departments = Array.from(new Set(
    (card.verifiedStandards || [])
      .filter((standard) => standard.sex === applicantSex || standard.sex === "all")
      .filter((standard) => trackFilter === "all" || standard.track === trackFilter)
      .map((standard) => standard.department)
      .filter(Boolean),
  ));

  const departmentComparisons = departments
    .map((department) => {
      const matches = enteredRecords
        .map((record) => ({
          record,
          comparison: getStandardComparison(card, record, applicantSex, trackFilter, department),
        }))
        .filter((item) => item.comparison);

      if (!matches.length) return null;

      const metCount = matches.filter((item) => item.comparison.met).length;
      const averageAttainment =
        matches.reduce((sum, item) => sum + Math.min(item.comparison.attainment, 1.25), 0) / matches.length;
      const weights = matches
        .map((item) => Number(item.comparison.standard.practicalWeightPercent))
        .filter(Number.isFinite);

      return {
        department,
        enteredCount: enteredRecords.length,
        coveredCount: matches.length,
        metCount,
        averageAttainment,
        averagePracticalWeightPercent: weights.length
          ? weights.reduce((sum, value) => sum + value, 0) / weights.length
          : null,
        matches,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (
      b.coveredCount - a.coveredCount
      || b.metCount - a.metCount
      || b.averageAttainment - a.averageAttainment
      || a.department.localeCompare(b.department, "ko")
    ));

  return departmentComparisons[0] || null;
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getDirectionalCloseness(gap, favorableRange, unfavorableRange) {
  const range = gap >= 0 ? favorableRange : unfavorableRange;
  return clamp(1 - Math.abs(gap) / range);
}

function getAcademicScore(comparison) {
  if (!comparison) return null;

  const scores = [
    comparison.percentileGap === null
      ? null
      : getDirectionalCloseness(comparison.percentileGap, 30, 15),
    comparison.englishGap === null
      ? null
      : getDirectionalCloseness(comparison.englishGap, 4, 2),
  ].filter((value) => value !== null);

  return average(scores);
}

function getPracticalScore(comparison) {
  if (!comparison || !Number.isFinite(comparison.averageAttainment)) return null;
  return clamp(comparison.averageAttainment);
}

function getComparisonLabel(index, hasPartialEvidence) {
  if (hasPartialEvidence && index >= 70) return "자료 보완 후 우선 비교";
  if (index >= 85) return "우선 비교 대상";
  if (index >= 70) return "상세 조건 확인";
  if (index >= 55) return "보완 조건 함께 검토";
  return "보완 우선순위 확인";
}

export function createApplicantComparison({
  academicComparison = null,
  practicalComparison = null,
  academicRequested = false,
  practicalRequested = false,
}) {
  const academicScore = getAcademicScore(academicComparison);
  const practicalScore = getPracticalScore(practicalComparison);
  const requestedCount = Number(academicRequested) + Number(practicalRequested);
  const availableCount = Number(academicScore !== null) + Number(practicalScore !== null);

  if (!requestedCount || !availableCount) return null;

  let rawScore;
  let academicWeight = academicScore === null ? 0 : 1;
  let practicalWeight = practicalScore === null ? 0 : 1;
  if (academicScore !== null && practicalScore !== null) {
    const officialPracticalWeight = Number(practicalComparison.averagePracticalWeightPercent);
    practicalWeight = Number.isFinite(officialPracticalWeight)
      ? clamp(officialPracticalWeight / 100)
      : 0.4;
    academicWeight = 1 - practicalWeight;
    rawScore = academicScore * academicWeight + practicalScore * practicalWeight;
  } else {
    rawScore = academicScore ?? practicalScore;
  }

  const evidenceCoverage = availableCount / requestedCount;
  const rankScore = rawScore * (0.75 + evidenceCoverage * 0.25);
  const index = Math.round(clamp(rankScore) * 100);
  const hasPartialEvidence = availableCount < requestedCount;

  return {
    academicIndex: academicScore === null ? null : Math.round(academicScore * 100),
    academicWeightPercent: Math.round(academicWeight * 100),
    availableCount,
    evidenceCoverage,
    hasPartialEvidence,
    index,
    label: getComparisonLabel(index, hasPartialEvidence),
    practicalIndex: practicalScore === null ? null : Math.round(practicalScore * 100),
    practicalWeightPercent: Math.round(practicalWeight * 100),
    rankScore,
    requestedCount,
  };
}
