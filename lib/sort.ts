import { compareAsc } from "date-fns"
import type { SortConfig, Task } from "@/lib/schemas"

function compareTasks(a: Task, b: Task, by: SortConfig["by"]): number {
  switch (by) {
    case "importance":
      return Number(b.important) - Number(a.important)
    case "dueDate": {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return compareAsc(new Date(a.dueDate), new Date(b.dueDate))
    }
    case "myDay":
      return Number(b.myDay !== null) - Number(a.myDay !== null)
    case "alphabetical":
      return a.title.localeCompare(b.title)
    case "createdAt":
      return compareAsc(new Date(a.createdAt), new Date(b.createdAt))
  }
}

export function sortTasks(tasks: Task[], sortConfig: SortConfig): Task[] {
  const sorted = [...tasks].sort((a, b) => a.order - b.order)
  sorted.sort((a, b) => compareTasks(a, b, sortConfig.by))
  if (sortConfig.direction === "desc") sorted.reverse()
  return sorted
}
