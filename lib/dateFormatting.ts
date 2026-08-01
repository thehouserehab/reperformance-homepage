function parseKoreanIso(iso: string) {
  const matched = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!matched) return null;
  return {
    year: Number(matched[1]),
    month: Number(matched[2]),
    day: Number(matched[3]),
    hour: Number(matched[4]),
    minute: Number(matched[5]),
  };
}

export function formatKoreanScheduleDateTime(iso: string) {
  const value = parseKoreanIso(iso);
  if (!value) return "시간 확인 필요";
  const period = value.hour < 12 ? "오전" : "오후";
  const hour = value.hour % 12 || 12;
  return `${value.month}월 ${value.day}일 ${period} ${hour}:${String(value.minute).padStart(2, "0")}`;
}

export function formatKoreanScheduleTime(iso: string) {
  const value = parseKoreanIso(iso);
  if (!value) return "시간 미정";
  const period = value.hour < 12 ? "오전" : "오후";
  const hour = value.hour % 12 || 12;
  return `${period} ${hour}:${String(value.minute).padStart(2, "0")}`;
}

export function formatKoreanMessageTime(iso: string) {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return "시간 확인 필요";

  const koreanTime = new Date(timestamp + 9 * 60 * 60 * 1000);
  const month = koreanTime.getUTCMonth() + 1;
  const day = koreanTime.getUTCDate();
  const hour24 = koreanTime.getUTCHours();
  const minute = koreanTime.getUTCMinutes();
  const period = hour24 < 12 ? "오전" : "오후";
  const hour = hour24 % 12 || 12;

  return `${month}월 ${day}일 ${period} ${hour}:${String(minute).padStart(2, "0")}`;
}
