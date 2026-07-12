"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { format, isPast, isToday } from "date-fns"
import { z } from "zod"
import {
  ArrowClockwiseIcon,
  BellIcon,
  CalendarBlankIcon,
  PlusIcon,
  StarIcon,
  SunIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react"

import { DueDatePicker } from "@/components/pickers/due-date-picker"
import { EditableText } from "@/components/editable-text"
import { ReminderPicker } from "@/components/pickers/reminder-picker"
import { RepeatPicker } from "@/components/pickers/repeat-picker"
import { StepRow } from "@/components/step-row"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { RepeatRule, Task } from "@/lib/schemas"
import { useAppStore } from "@/lib/store"
import { useUiStore } from "@/lib/ui-store"
import { cn } from "@/lib/utils"

const detailSchema = z.object({
  notes: z.string(),
})

type DetailValues = z.infer<typeof detailSchema>

function repeatLabel(rule: RepeatRule | null): string {
  if (!rule) return "Repeat"
  switch (rule.type) {
    case "daily":
      return "Daily"
    case "weekdays":
      return "Weekdays"
    case "weekly":
      return "Weekly"
    case "monthly":
      return "Monthly"
    case "yearly":
      return "Yearly"
    case "custom":
      return `Every ${rule.interval} ${rule.unit}`
  }
}

export function TaskDetailSheet() {
  const selectedTaskId = useUiStore((state) => state.selectedTaskId)
  const setSelectedTaskId = useUiStore((state) => state.setSelectedTaskId)
  const task = useAppStore((state) => state.tasks.find((t) => t.id === selectedTaskId))

  return (
    <Sheet
      open={!!task}
      onOpenChange={(open) => {
        if (!open) setSelectedTaskId(null)
      }}
    >
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
        {task && <TaskDetailContent key={task.id} task={task} onClose={() => setSelectedTaskId(null)} />}
      </SheetContent>
    </Sheet>
  )
}

function TaskDetailContent({ task, onClose }: { task: Task; onClose: () => void }) {
  const updateTask = useAppStore((state) => state.updateTask)
  const toggleTaskCompleted = useAppStore((state) => state.toggleTaskCompleted)
  const toggleTaskImportant = useAppStore((state) => state.toggleTaskImportant)
  const toggleTaskMyDay = useAppStore((state) => state.toggleTaskMyDay)
  const setTaskDueDate = useAppStore((state) => state.setTaskDueDate)
  const setTaskReminder = useAppStore((state) => state.setTaskReminder)
  const setTaskRepeat = useAppStore((state) => state.setTaskRepeat)
  const deleteTask = useAppStore((state) => state.deleteTask)
  const addStep = useAppStore((state) => state.addStep)
  const updateStep = useAppStore((state) => state.updateStep)
  const toggleStep = useAppStore((state) => state.toggleStep)
  const deleteStep = useAppStore((state) => state.deleteStep)
  const promoteStepToTask = useAppStore((state) => state.promoteStepToTask)

  const [newStep, setNewStep] = useState("")

  const form = useForm<DetailValues>({
    resolver: zodResolver(detailSchema),
    defaultValues: { notes: task.notes },
  })

  function save(values: DetailValues) {
    updateTask(task.id, { notes: values.notes })
  }

  function saveTitle(title: string) {
    updateTask(task.id, { title })
  }

  function handleAddStep(e: React.FormEvent) {
    e.preventDefault()
    const title = newStep.trim()
    if (!title) return
    addStep(task.id, title)
    setNewStep("")
  }

  function handleDelete() {
    deleteTask(task.id)
    onClose()
  }

  const isMyDay = task.myDay !== null && isToday(new Date(task.myDay))
  const dueDate = task.dueDate ? new Date(task.dueDate) : null
  const overdue = !!dueDate && !task.completed && isPast(dueDate) && !isToday(dueDate)

  return (
    <>
      <SheetHeader className="border-b pb-3">
        <div className="flex items-start gap-3 pr-7 pt-2">
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => toggleTaskCompleted(task.id)}
            className="mt-1.5 size-5 rounded-full"
            aria-label={task.completed ? "Mark as not completed" : "Mark as completed"}
          />
          <EditableText
            value={task.title}
            onSave={saveTitle}
            multiline
            strikethrough={task.completed}
            className="flex-1 py-1 text-base font-medium"
          />
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
        </div>
        <SheetTitle className="sr-only">Task details</SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-1">
          {task.steps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              onToggle={() => toggleStep(task.id, step.id)}
              onRename={(title) => updateStep(task.id, step.id, title)}
              onPromote={() => promoteStepToTask(task.id, step.id)}
              onDelete={() => deleteStep(task.id, step.id)}
            />
          ))}
          <form onSubmit={handleAddStep} className="flex items-center gap-2 pt-1">
            <PlusIcon className="size-4 text-muted-foreground" />
            <Input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              placeholder="Add a step"
              className="h-8 flex-1 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </form>
        </div>

        <div className="mt-4 flex flex-col gap-1 border-t pt-3">
          <button
            type="button"
            onClick={() => toggleTaskMyDay(task.id)}
            className="flex w-full items-center justify-between gap-2 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <SunIcon className="size-4 text-muted-foreground" />
              {isMyDay ? "Added to My Day" : "Add to My Day"}
            </span>
            {isMyDay && <span className="text-muted-foreground">Remove</span>}
          </button>

          <div className="flex items-center gap-1">
            <DueDatePicker value={task.dueDate} onChange={(value) => setTaskDueDate(task.id, value)}>
              <button
                type="button"
                className={cn(
                  "flex flex-1 items-center gap-2 py-2 text-left text-sm",
                  task.dueDate ? (overdue ? "text-destructive" : "text-primary") : "text-muted-foreground"
                )}
              >
                <CalendarBlankIcon className="size-4" />
                {task.dueDate ? `Due ${format(dueDate!, "EEE, MMM d")}` : "Due date"}
              </button>
            </DueDatePicker>
            {task.dueDate && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setTaskDueDate(task.id, null)}
                aria-label="Remove due date"
              >
                <XIcon />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <ReminderPicker value={task.reminder} onChange={(value) => setTaskReminder(task.id, value)}>
              {task.reminder ? (
                <button type="button" className="flex flex-1 flex-col items-start py-2 text-left text-sm text-primary">
                  <span className="flex items-center gap-2">
                    <BellIcon className="size-4" />
                    Remind me at {format(new Date(task.reminder), "h:mm a")}
                  </span>
                  <span className="pl-6 text-xs text-muted-foreground">
                    {format(new Date(task.reminder), "EEE, MMM d")}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 py-2 text-left text-sm text-muted-foreground"
                >
                  <BellIcon className="size-4" />
                  Remind me
                </button>
              )}
            </ReminderPicker>
            {task.reminder && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setTaskReminder(task.id, null)}
                aria-label="Remove reminder"
              >
                <XIcon />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <RepeatPicker value={task.repeat} onChange={(value) => setTaskRepeat(task.id, value)}>
              <button
                type="button"
                className={cn(
                  "flex flex-1 items-center gap-2 py-2 text-left text-sm",
                  task.repeat ? "text-primary" : "text-muted-foreground"
                )}
              >
                <ArrowClockwiseIcon className="size-4" />
                {repeatLabel(task.repeat)}
              </button>
            </RepeatPicker>
            {task.repeat && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setTaskRepeat(task.id, null)}
                aria-label="Remove repeat"
              >
                <XIcon />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 border-t pt-3">
          <Textarea
            {...form.register("notes")}
            onBlur={form.handleSubmit(save)}
            placeholder="Add notes"
            className="min-h-24 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <SheetFooter className="border-t">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Created {format(new Date(task.createdAt), "MMM d, yyyy")}
          </span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={handleDelete} className="text-destructive">
            <TrashIcon />
          </Button>
        </div>
      </SheetFooter>
    </>
  )
}
