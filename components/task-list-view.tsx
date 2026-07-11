"use client"

import { useEffect, useRef, useState } from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  DotsThreeVerticalIcon,
  ListBulletsIcon,
  ListChecksIcon,
  StarIcon,
  TrashIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react"

import { AddTaskBar } from "@/components/add-task-bar"
import { ListOptionsMenu } from "@/components/list-options-menu"
import { TaskRow } from "@/components/task-row"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DEFAULT_LIST_ID } from "@/lib/constants"
import type { SortBy, SortConfig, Task, TaskList } from "@/lib/schemas"
import { sortTasks } from "@/lib/sort"
import { useAppStore, type NewTaskInput } from "@/lib/store"
import { useUiStore } from "@/lib/ui-store"

const DEFAULT_SORT: SortConfig = { by: "createdAt", direction: "asc" }

// Matches TaskRow's rendered height (px-4 py-2.5 + size-5 checkbox) so filler
// rows line up with real rows and the border-b lines stay evenly spaced.
const FILLER_ROW_HEIGHT = 44
// Matches the "pb-4" on the scroll content wrapper, so filler rows stop short
// of that padding instead of overflowing it and forcing a scrollbar.
const FILLER_AREA_PADDING = 16

const SORT_LABELS: Record<SortBy, string> = {
  importance: "by importance",
  dueDate: "by due date",
  myDay: "by My Day",
  alphabetical: "alphabetically",
  createdAt: "by creation date",
}

interface AddTaskBarConfig {
  listId: string
  taskDefaults?: Partial<Pick<NewTaskInput, "myDay" | "dueDate" | "reminder" | "repeat">>
  markImportant?: boolean
  lists?: TaskList[]
  showQuickDueDate?: boolean
  placeholder?: string
}

interface TaskListViewProps {
  icon: Icon
  title: string
  subtitle?: string
  tasks: Task[]
  sortConfig: SortConfig
  onSortChange: (sort: SortConfig) => void
  defaultSort?: SortConfig
  emptyTitle: string
  emptyDescription?: string
  emptyRows?: boolean
  addTaskBar?: AddTaskBarConfig
  lists?: TaskList[]
  listsById?: Map<string, TaskList>
}

export function TaskListView({
  icon: HeaderIcon,
  title,
  subtitle,
  tasks,
  sortConfig,
  onSortChange,
  defaultSort = DEFAULT_SORT,
  emptyTitle,
  emptyDescription,
  emptyRows = false,
  addTaskBar,
  lists,
  listsById,
}: TaskListViewProps) {
  const [completedOpen, setCompletedOpen] = useState(false)
  const [fillerAreaHeight, setFillerAreaHeight] = useState(0)
  const [usedContentHeight, setUsedContentHeight] = useState(0)
  const fillerAreaRef = useRef<HTMLDivElement>(null)
  const usedContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!emptyRows) return
    const areaNode = fillerAreaRef.current
    const contentNode = usedContentRef.current
    if (!areaNode || !contentNode) return
    const areaObserver = new ResizeObserver((entries) => {
      setFillerAreaHeight(entries[0].contentRect.height)
    })
    const contentObserver = new ResizeObserver((entries) => {
      setUsedContentHeight(entries[0].contentRect.height)
    })
    areaObserver.observe(areaNode)
    contentObserver.observe(contentNode)
    return () => {
      areaObserver.disconnect()
      contentObserver.disconnect()
    }
  }, [emptyRows])

  const selectionMode = useUiStore((state) => state.selectionMode)
  const selectedTaskIds = useUiStore((state) => state.selectedTaskIds)
  const exitSelectionMode = useUiStore((state) => state.exitSelectionMode)
  const selectAllTaskIds = useUiStore((state) => state.selectAllTasks)
  const setTasksImportant = useAppStore((state) => state.setTasksImportant)
  const setTasksCompleted = useAppStore((state) => state.setTasksCompleted)
  const moveTasksToList = useAppStore((state) => state.moveTasksToList)
  const deleteTasks = useAppStore((state) => state.deleteTasks)

  const activeTasks = sortTasks(tasks.filter((t) => !t.completed), sortConfig)
  const completedTasks = sortTasks(tasks.filter((t) => t.completed), sortConfig)
  const allTaskIds = [...activeTasks, ...completedTasks].map((t) => t.id)

  const fillerRowCount = emptyRows
    ? Math.max(
        0,
        Math.floor((fillerAreaHeight - FILLER_AREA_PADDING - usedContentHeight) / FILLER_ROW_HEIGHT)
      )
    : 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 px-6 pt-12 pb-4 md:pt-6">
        {selectionMode ? (
          <SelectionToolbar
            count={selectedTaskIds.length}
            lists={lists ?? []}
            onClose={exitSelectionMode}
            onSelectAll={() => selectAllTaskIds(allTaskIds)}
            onMarkImportant={() => {
              setTasksImportant(selectedTaskIds, true)
              exitSelectionMode()
            }}
            onMarkCompleted={() => {
              setTasksCompleted(selectedTaskIds, true)
              exitSelectionMode()
            }}
            onMoveTo={(listId) => {
              moveTasksToList(selectedTaskIds, listId)
              exitSelectionMode()
            }}
            onDelete={() => {
              deleteTasks(selectedTaskIds)
              exitSelectionMode()
            }}
          />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <HeaderIcon className="size-7 text-primary" weight="duotone" />
              <div>
                <h1 className="text-2xl font-semibold">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            <ListOptionsMenu sortConfig={sortConfig} onSortChange={onSortChange} />
          </>
        )}
      </div>

      {(sortConfig.by !== defaultSort.by || sortConfig.direction !== defaultSort.direction) && (
        <SortIndicator
          sortConfig={sortConfig}
          onToggleDirection={() =>
            onSortChange({ ...sortConfig, direction: sortConfig.direction === "asc" ? "desc" : "asc" })
          }
          onClear={() => onSortChange(defaultSort)}
        />
      )}

      <div ref={fillerAreaRef} className="min-h-0 flex-1">
        <ScrollArea
          data-print-area
          className="size-full"
          style={{ backgroundImage: "var(--list-background, none)" }}
        >
          <div className="pb-4">
            {!emptyRows && activeTasks.length === 0 && completedTasks.length === 0 ? (
              <Empty className="py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HeaderIcon weight="duotone" />
                  </EmptyMedia>
                  <EmptyTitle>{emptyTitle}</EmptyTitle>
                  {emptyDescription && <EmptyDescription>{emptyDescription}</EmptyDescription>}
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col">
                <div ref={usedContentRef} className="flex flex-col">
                  {activeTasks.map((task) => (
                    <TaskRow key={task.id} task={task} list={listsById?.get(task.listId)} lists={lists} />
                  ))}

                  {completedTasks.length > 0 && (
                    <Collapsible open={completedOpen} onOpenChange={setCompletedOpen} className="mt-2">
                      <CollapsibleTrigger
                        data-no-print
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                      >
                        {completedOpen ? <CaretDownIcon /> : <CaretRightIcon />}
                        Completed ({completedTasks.length})
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {completedTasks.map((task) => (
                          <TaskRow key={task.id} task={task} list={listsById?.get(task.listId)} lists={lists} />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>

                {emptyRows &&
                  Array.from({ length: fillerRowCount }).map((_, i) => (
                    <div key={`filler-${i}`} className="h-11 border-b px-4" />
                  ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {addTaskBar && (
        <div className="relative shrink-0 px-4 pb-4 pt-1" data-no-print>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-full h-12 bg-linear-to-b from-transparent to-background"
          />
          <AddTaskBar
            listId={addTaskBar.listId}
            taskDefaults={addTaskBar.taskDefaults}
            markImportant={addTaskBar.markImportant}
            lists={addTaskBar.lists}
            showQuickDueDate={addTaskBar.showQuickDueDate}
            placeholder={addTaskBar.placeholder}
          />
        </div>
      )}
    </div>
  )
}

interface SortIndicatorProps {
  sortConfig: SortConfig
  onToggleDirection: () => void
  onClear: () => void
}

function SortIndicator({ sortConfig, onToggleDirection, onClear }: SortIndicatorProps) {
  return (
    <div className="flex items-center gap-1 px-4 pb-2">
      <button
        type="button"
        onClick={onToggleDirection}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {sortConfig.direction === "asc" ? (
          <ArrowUpIcon className="size-3" />
        ) : (
          <ArrowDownIcon className="size-3" />
        )}
        Sorted {SORT_LABELS[sortConfig.by]}
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear sort"
            className="flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <XIcon className="size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Clear sort</TooltipContent>
      </Tooltip>
    </div>
  )
}

interface SelectionToolbarProps {
  count: number
  lists: TaskList[]
  onClose: () => void
  onSelectAll: () => void
  onMarkImportant: () => void
  onMarkCompleted: () => void
  onMoveTo: (listId: string) => void
  onDelete: () => void
}

function SelectionToolbar({
  count,
  lists,
  onClose,
  onSelectAll,
  onMarkImportant,
  onMarkCompleted,
  onMoveTo,
  onDelete,
}: SelectionToolbarProps) {
  return (
    <div className="flex w-full items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label="Cancel selection" onClick={onClose}>
            <XIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Cancel selection</TooltipContent>
      </Tooltip>
      <span className="text-lg font-semibold">{count}</span>
      <div className="ml-auto">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Selection actions">
                  <DotsThreeVerticalIcon />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>More actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={onSelectAll}>
              <CheckIcon /> Select all
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onMarkImportant}>
              <StarIcon /> Mark as important
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onMarkCompleted}>
              <CheckIcon /> Mark as completed
            </DropdownMenuItem>
            {lists.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ListBulletsIcon /> Move
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {lists.map((list) => (
                    <DropdownMenuItem key={list.id} onSelect={() => onMoveTo(list.id)}>
                      {list.id === DEFAULT_LIST_ID ? (
                        <ListChecksIcon />
                      ) : list.emoji ? (
                        <span>{list.emoji}</span>
                      ) : (
                        <ListBulletsIcon />
                      )}
                      {list.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <TrashIcon /> Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
