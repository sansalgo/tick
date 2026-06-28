"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { MagnifyingGlass } from "@phosphor-icons/react"

import { TaskListSkeleton } from "@/components/task-list-skeleton"
import { TaskListView } from "@/components/task-list-view"
import type { SortConfig } from "@/lib/schemas"
import { useAppStore } from "@/lib/store"

function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q")?.trim() ?? ""
  const queryLower = query.toLowerCase()
  const [sortConfig, setSortConfig] = useState<SortConfig>({ by: "createdAt", direction: "desc" })

  const hasHydrated = useAppStore((state) => state.hasHydrated)
  const allTasks = useAppStore((state) => state.tasks)
  const tasks = useMemo(
    () => (queryLower ? allTasks.filter((t) => t.title.toLowerCase().includes(queryLower)) : []),
    [allTasks, queryLower],
  )
  const lists = useAppStore((state) => state.lists)
  const listsById = new Map(lists.map((list) => [list.id, list]))

  if (!hasHydrated) {
    return <TaskListSkeleton />
  }

  return (
    <TaskListView
      icon={MagnifyingGlass}
      title={query ? `Results for "${query}"` : "Search"}
      tasks={tasks}
      sortConfig={sortConfig}
      onSortChange={setSortConfig}
      emptyTitle={query ? "No matching tasks" : "Search your tasks"}
      emptyDescription={
        query ? "Try a different search term." : "Type in the search box to find tasks across all your lists."
      }
      lists={lists}
      listsById={listsById}
    />
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResults />
    </Suspense>
  )
}
