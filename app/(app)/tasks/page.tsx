"use client"

import { TaskListSkeleton } from "@/components/task-list-skeleton"
import { TaskListView } from "@/components/task-list-view"
import { DEFAULT_LIST_ID } from "@/lib/constants"
import { SMART_LIST_DEFS } from "@/lib/smart-lists"
import { selectAllTasks, useAppStore } from "@/lib/store"

const SMART_LIST = SMART_LIST_DEFS.find((def) => def.key === "tasks")!

export default function TasksPage() {
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  const tasks = useAppStore((state) => selectAllTasks(state.tasks))
  const sortConfig = useAppStore((state) => state.settings.smartListSort.tasks)
  const setSmartListSort = useAppStore((state) => state.setSmartListSort)
  const lists = useAppStore((state) => state.lists)
  const listsById = new Map(lists.map((list) => [list.id, list]))

  if (!hasHydrated) {
    return <TaskListSkeleton />
  }

  return (
    <TaskListView
      icon={SMART_LIST.icon}
      title={SMART_LIST.label}
      tasks={tasks}
      sortConfig={sortConfig}
      onSortChange={(sort) => setSmartListSort("tasks", sort)}
      emptyTitle="No tasks yet"
      emptyDescription="Add a task to get started."
      addTaskBar={{ listId: DEFAULT_LIST_ID }}
      lists={lists}
      listsById={listsById}
    />
  )
}
