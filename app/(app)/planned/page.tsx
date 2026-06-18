"use client"

import { useShallow } from "zustand/react/shallow"

import { TaskListSkeleton } from "@/components/task-list-skeleton"
import { TaskListView } from "@/components/task-list-view"
import { DEFAULT_LIST_ID } from "@/lib/constants"
import { SMART_LIST_DEFS } from "@/lib/smart-lists"
import { selectPlannedTasks, useAppStore } from "@/lib/store"

const SMART_LIST = SMART_LIST_DEFS.find((def) => def.key === "planned")!

export default function PlannedPage() {
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  const tasks = useAppStore(useShallow((state) => selectPlannedTasks(state.tasks)))
  const sortConfig = useAppStore((state) => state.settings.smartListSort.planned)
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
      onSortChange={(sort) => setSmartListSort("planned", sort)}
      defaultSort={{ by: "dueDate", direction: "asc" }}
      emptyTitle="Nothing planned yet"
      emptyDescription="Tasks with a due date will show up here."
      addTaskBar={{ listId: DEFAULT_LIST_ID, showQuickDueDate: true, lists, placeholder: "Add a planned task" }}
      lists={lists}
      listsById={listsById}
    />
  )
}
