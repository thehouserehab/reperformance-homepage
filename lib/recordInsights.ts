import type { RecordDirection, StudentRecordEntry, StudentRecordItem } from "./types";

export const RECORD_SPARKLINE_MAX_POINTS = 5;

export type RecordInsight = {
  isPersonalBest: boolean;
  deltaLabel: string | null;
  sparklineValues: number[];
};

export function resolveRecordDirection(item: Pick<StudentRecordItem, "pbDirection"> | undefined): RecordDirection {
  return item?.pbDirection === "lower" ? "lower" : "higher";
}

function formatMagnitude(magnitude: number) {
  if (Number.isInteger(magnitude)) return String(magnitude);
  return magnitude
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

/**
 * Computes lightweight, locally-derived "achievement" signals for a single record entry:
 * whether it is the personal best for its item, how it compares with the immediately
 * preceding entry for the same item, and a short recent-history sparkline. Everything here
 * is deterministic arithmetic over already-stored records -- no network call, no model.
 */
export function computeRecordInsight(
  record: StudentRecordEntry,
  historyForItem: StudentRecordEntry[],
  direction: RecordDirection
): RecordInsight {
  const chronological = [...historyForItem]
    .filter((entry) => entry.itemId === record.itemId)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id));

  const numericEntries = chronological
    .map((entry) => ({ entry, numeric: Number(entry.value) }))
    .filter((row) => Number.isFinite(row.numeric));

  const currentIndex = numericEntries.findIndex((row) => row.entry.id === record.id);
  const currentNumeric = Number(record.value);

  let isPersonalBest = false;
  if (Number.isFinite(currentNumeric) && numericEntries.length > 0) {
    const best = numericEntries.reduce((bestSoFar, row) => {
      if (direction === "higher") return row.numeric > bestSoFar ? row.numeric : bestSoFar;
      return row.numeric < bestSoFar ? row.numeric : bestSoFar;
    }, numericEntries[0].numeric);
    isPersonalBest = currentNumeric === best;
  }

  let deltaLabel: string | null = null;
  if (currentIndex === 0) {
    deltaLabel = "첫 기록이에요";
  } else if (currentIndex > 0) {
    const previous = numericEntries[currentIndex - 1];
    if (Number.isFinite(currentNumeric) && Number.isFinite(previous.numeric)) {
      const delta = currentNumeric - previous.numeric;
      if (delta === 0) {
        deltaLabel = "직전 기록과 동일해요";
      } else {
        const improved = direction === "higher" ? delta > 0 : delta < 0;
        const magnitudeLabel = formatMagnitude(Math.abs(delta));
        deltaLabel = `직전 기록보다 ${magnitudeLabel}${record.unit} ${improved ? "좋아졌어요" : "낮아졌어요"}`;
      }
    }
  }

  const sparklineStart = currentIndex >= 0
    ? Math.max(0, currentIndex - (RECORD_SPARKLINE_MAX_POINTS - 1))
    : Math.max(0, numericEntries.length - RECORD_SPARKLINE_MAX_POINTS);
  const sparklineEnd = currentIndex >= 0 ? currentIndex + 1 : numericEntries.length;
  const sparklineValues = numericEntries.slice(sparklineStart, sparklineEnd).map((row) => row.numeric);

  return { isPersonalBest, deltaLabel, sparklineValues };
}
