"use client"

import { format } from "date-fns"
import { useShallow } from "zustand/react/shallow"

import { TaskListSkeleton } from "@/components/task-list-skeleton"
import { TaskListView } from "@/components/task-list-view"
import { DEFAULT_LIST_ID } from "@/lib/constants"
import { SMART_LIST_DEFS } from "@/lib/smart-lists"
import { selectMyDayTasks, useAppStore } from "@/lib/store"

const SMART_LIST = SMART_LIST_DEFS.find((def) => def.key === "myDay")!

export default function MyDayPage() {
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  const tasks = useAppStore(useShallow((state) => selectMyDayTasks(state.tasks)))
  const sortConfig = useAppStore((state) => state.settings.smartListSort.myDay)
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
      subtitle={format(new Date(), "EEEE, MMMM d")}
      tasks={tasks}
      sortConfig={sortConfig}
      onSortChange={(sort) => setSmartListSort("myDay", sort)}
      emptyTitle="Focus on what's important today"
      emptyDescription="Add tasks to My Day to plan what you want to get done."
      addTaskBar={{ listId: DEFAULT_LIST_ID, taskDefaults: { myDay: new Date().toISOString() }, lists, placeholder: "Add a task to My Day" }}
      lists={lists}
      listsById={listsById}
    />
  )
}
