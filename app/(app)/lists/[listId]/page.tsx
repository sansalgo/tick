"use client"

import { use } from "react"
import { ListBullets, ListChecks } from "@phosphor-icons/react"
import { useShallow } from "zustand/react/shallow"

import { TaskListSkeleton } from "@/components/task-list-skeleton"
import { TaskListView } from "@/components/task-list-view"
import { DEFAULT_LIST_ID } from "@/lib/constants"
import { selectTasksForList, useAppStore } from "@/lib/store"

export default function ListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = use(params)

  const hasHydrated = useAppStore((state) => state.hasHydrated)
  const lists = useAppStore((state) => state.lists)
  const list = lists.find((l) => l.id === listId)
  const tasks = useAppStore(useShallow((state) => selectTasksForList(state.tasks, listId)))
  const updateListSort = useAppStore((state) => state.updateListSort)

  if (!hasHydrated) {
    return <TaskListSkeleton />
  }

  if (!list) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-muted-foreground">
        <p>This list doesn&apos;t exist anymore.</p>
      </div>
    )
  }

  return (
    <TaskListView
      icon={listId === DEFAULT_LIST_ID ? ListChecks : ListBullets}
      title={list.name}
      tasks={tasks}
      sortConfig={list.sort}
      onSortChange={(sort) => updateListSort(list.id, sort)}
      emptyTitle="No tasks yet"
      emptyDescription="Add a task to get started."
      addTaskBar={{ listId: list.id }}
      lists={lists}
    />
  )
}
