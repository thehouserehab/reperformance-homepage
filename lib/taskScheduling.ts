import type { AppTask } from "./types";

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

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
