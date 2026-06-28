"use client"

import { useRef } from "react"
import { addDays, format, isPast, isToday, startOfDay } from "date-fns"
import {
  ArrowClockwiseIcon,
  BellIcon,
  CalendarBlankIcon,
  CalendarPlusIcon,
  ListBulletsIcon,
  ListChecksIcon,
  ListIcon,
  StarIcon,
  SunIcon,
  TrashIcon,
} from "@phosphor-icons/react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"
import { DEFAULT_LIST_ID } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Task, TaskList } from "@/lib/schemas"
import { useAppStore } from "@/lib/store"
import { useUiStore } from "@/lib/ui-store"

interface TaskRowProps {
  task: Task
  list?: TaskList
  lists?: TaskList[]
}

const LONG_PRESS_MS = 500

export function TaskRow({ task, list, lists }: TaskRowProps) {
  const isMobile = useIsMobile()

  const toggleTaskCompleted = useAppStore((state) => state.toggleTaskCompleted)
  const toggleTaskImportant = useAppStore((state) => state.toggleTaskImportant)
  const toggleTaskMyDay = useAppStore((state) => state.toggleTaskMyDay)
  const setTaskDueDate = useAppStore((state) => state.setTaskDueDate)
  const moveTaskToList = useAppStore((state) => state.moveTaskToList)
  const deleteTask = useAppStore((state) => state.deleteTask)

  const setSelectedTaskId = useUiStore((state) => state.setSelectedTaskId)
  const selectionMode = useUiStore((state) => state.selectionMode)
  const selectedTaskIds = useUiStore((state) => state.selectedTaskIds)
  const enterSelectionMode = useUiStore((state) => state.enterSelectionMode)
  const toggleTaskSelected = useUiStore((state) => state.toggleTaskSelected)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  const isSelected = selectedTaskIds.includes(task.id)
  const isMyDay = task.myDay !== null && isToday(new Date(task.myDay))

  const completedSteps = task.steps.filter((s) => s.completed).length
  const dueDate = task.dueDate ? new Date(task.dueDate) : null
  const overdue = !!dueDate && !task.completed && isPast(dueDate) && !isToday(dueDate)
  const hasMeta = !!dueDate || !!task.reminder || !!task.repeat || task.steps.length > 0 || !!list

  function clearLongPressTimer() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (!isMobile || event.pointerType !== "touch") return
    longPressTriggered.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      enterSelectionMode(task.id)
    }, LONG_PRESS_MS)
  }

  function handleRowClick() {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    if (selectionMode) {
      toggleTaskSelected(task.id)
    } else {
      setSelectedTaskId(task.id)
    }
  }

  const moveTargets = lists?.filter((l) => l.id !== task.listId) ?? []

  const row = (
    <div
      className={cn(
        "group flex items-start gap-3 border-b px-4 py-2.5 last:border-b-0 hover:bg-muted/50",
        isSelected && "bg-accent"
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPressTimer}
      onPointerMove={clearLongPressTimer}
      onPointerLeave={clearLongPressTimer}
      onPointerCancel={clearLongPressTimer}
    >
      <Checkbox
        checked={selectionMode ? isSelected : task.completed}
        onCheckedChange={() =>
          selectionMode ? toggleTaskSelected(task.id) : toggleTaskCompleted(task.id)
        }
        className="mt-0.5 size-5 rounded-full"
        aria-label={
          selectionMode
            ? isSelected
              ? "Deselect task"
              : "Select task"
            : task.completed
              ? "Mark as not completed"
              : "Mark as completed"
        }
      />
      <button
        type="button"
        onClick={handleRowClick}
        className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
      >
        <span className={cn("text-sm", task.completed && "text-muted-foreground line-through")}>
          {task.title}
        </span>
        {hasMeta && (
          <div className="flex flex-wrap items-center gap-1.5">
            {dueDate && (
              <Badge
                variant={overdue ? "destructive" : isToday(dueDate) ? "secondary" : "outline"}
                className="gap-1"
              >
                <CalendarBlankIcon /> {format(dueDate, "MMM d")}
              </Badge>
            )}
            {task.reminder && (
              <Badge variant="outline" className="gap-1">
                <BellIcon />
              </Badge>
            )}
            {task.repeat && (
              <Badge variant="outline" className="gap-1">
                <ArrowClockwiseIcon />
              </Badge>
            )}
            {task.steps.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <ListChecksIcon /> {completedSteps}/{task.steps.length}
              </Badge>
            )}
            {list && <Badge variant="outline">{list.name}</Badge>}
          </div>
        )}
      </button>
      {!selectionMode && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={task.important}
              onPressedChange={() => toggleTaskImportant(task.id)}
              size="sm"
              aria-label={task.important ? "Remove from Important" : "Mark as Important"}
              className="shrink-0 text-muted-foreground data-[state=on]:text-primary"
            >
              <StarIcon weight={task.important ? "fill" : "regular"} />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>{task.important ? "Remove from Important" : "Mark as Important"}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )

  if (isMobile) {
    return row
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={() => toggleTaskMyDay(task.id)}>
          <SunIcon /> {isMyDay ? "Remove from My Day" : "Add to My Day"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => toggleTaskImportant(task.id)}>
          <StarIcon weight={task.important ? "fill" : "regular"} />
          {task.important ? "Remove importance" : "Mark as important"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => toggleTaskCompleted(task.id)}>
          <ListChecksIcon /> {task.completed ? "Mark as not completed" : "Mark as completed"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => setTaskDueDate(task.id, startOfDay(new Date()).toISOString())}>
          <CalendarBlankIcon /> Due today
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => setTaskDueDate(task.id, startOfDay(addDays(new Date(), 1)).toISOString())}
        >
          <CalendarPlusIcon /> Due tomorrow
        </ContextMenuItem>
        {moveTargets.length > 0 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <ListIcon /> Move task to
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {moveTargets.map((target) => (
                  <ContextMenuItem key={target.id} onSelect={() => moveTaskToList(task.id, target.id)}>
                    {target.id === DEFAULT_LIST_ID ? (
                      <ListChecksIcon />
                    ) : target.emoji ? (
                      <span>{target.emoji}</span>
                    ) : (
                      <ListBulletsIcon />
                    )}
                    {target.name}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => deleteTask(task.id)}>
          <TrashIcon /> Delete task
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
