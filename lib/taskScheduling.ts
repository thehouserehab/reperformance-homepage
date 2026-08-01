import type { AppTask } from "./types";

const weekdayFormatter = new Intl.DateTimeFormat("ko-KR", { weekday: "short" });

export function sortTasks(tasks: AppTask[]) {
  return [...tasks].sort((a, b) => {
    const byDate = a.scheduledDate.localeCompare(b.scheduledDate);
    if (byDate !== 0) return byDate;
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });
}

export function getTasksForDate(tasks: AppTask[], date: string) {
  return sortTasks(tasks.filter((task) => task.scheduledDate === date));
}

export function getUpcomingTasks(tasks: AppTask[], date: string, days = 7) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const endKey = toDateKey(end);

  return sortTasks(
    tasks.filter((task) => task.scheduledDate > date && task.scheduledDate <= endKey)
  );
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatShortTaskDate(date: string) {
  const [, month, day] = date.split("-").map(Number);
  const weekday = weekdayFormatter.format(new Date(`${date}T00:00:00`));
  return `${month}.${day} ${weekday}`;
}
