"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { format } from "date-fns"
import { z } from "zod"
import {
  BellIcon,
  CalendarBlankIcon,
  ArrowClockwiseIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react"

import { DueDatePicker } from "@/components/pickers/due-date-picker"
import { ReminderPicker } from "@/components/pickers/reminder-picker"
import { RepeatPicker } from "@/components/pickers/repeat-picker"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { isoDateStringSchema, repeatRuleSchema, type RepeatRule } from "@/lib/schemas"
import { useAppStore, type NewTaskInput } from "@/lib/store"

const addTaskSchema = z.object({
  title: z.string().min(1),
  dueDate: isoDateStringSchema.nullable(),
  reminder: isoDateStringSchema.nullable(),
  repeat: repeatRuleSchema.nullable(),
})

type AddTaskValues = z.infer<typeof addTaskSchema>

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

interface AddTaskBarProps {
  listId: string
  taskDefaults?: Partial<Pick<NewTaskInput, "myDay" | "dueDate" | "reminder" | "repeat">>
  markImportant?: boolean
  className?: string
}

export function AddTaskBar({ listId, taskDefaults, markImportant, className }: AddTaskBarProps) {
  const [expanded, setExpanded] = useState(false)
  const addTask = useAppStore((state) => state.addTask)
  const toggleTaskImportant = useAppStore((state) => state.toggleTaskImportant)

  const form = useForm<AddTaskValues>({
    resolver: zodResolver(addTaskSchema),
    defaultValues: {
      title: "",
      dueDate: taskDefaults?.dueDate ?? null,
      reminder: taskDefaults?.reminder ?? null,
      repeat: taskDefaults?.repeat ?? null,
    },
  })

  function onSubmit(values: AddTaskValues) {
    const id = addTask({
      listId,
      title: values.title.trim(),
      myDay: taskDefaults?.myDay ?? null,
      dueDate: values.dueDate,
      reminder: values.reminder,
      repeat: values.repeat,
    })
    if (markImportant) toggleTaskImportant(id)
    form.reset({
      title: "",
      dueDate: taskDefaults?.dueDate ?? null,
      reminder: taskDefaults?.reminder ?? null,
      repeat: taskDefaults?.repeat ?? null,
    })
  }

  function handleCancel() {
    form.reset({
      title: "",
      dueDate: taskDefaults?.dueDate ?? null,
      reminder: taskDefaults?.reminder ?? null,
      repeat: taskDefaults?.repeat ?? null,
    })
    setExpanded(false)
  }

  const title = form.watch("title")

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={className}
    >
      <InputGroup className="h-auto flex-col items-stretch rounded-lg">
        <InputGroupAddon align="block-start" className="pt-2">
          <PlusIcon className="text-primary" />
          <InputGroupInput
            placeholder="Add a task"
            {...form.register("title")}
            onFocus={() => setExpanded(true)}
          />
        </InputGroupAddon>
        {expanded && (
          <InputGroupAddon align="block-end" className="flex-wrap gap-1.5 pb-2">
            <Controller
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <DueDatePicker value={field.value} onChange={field.onChange}>
                  <InputGroupButton variant={field.value ? "secondary" : "outline"}>
                    <CalendarBlankIcon />
                    {field.value ? format(new Date(field.value), "MMM d") : "Due date"}
                  </InputGroupButton>
                </DueDatePicker>
              )}
            />
            <Controller
              control={form.control}
              name="reminder"
              render={({ field }) => (
                <ReminderPicker value={field.value} onChange={field.onChange}>
                  <InputGroupButton variant={field.value ? "secondary" : "outline"}>
                    <BellIcon />
                    {field.value ? format(new Date(field.value), "MMM d, h:mm a") : "Remind me"}
                  </InputGroupButton>
                </ReminderPicker>
              )}
            />
            <Controller
              control={form.control}
              name="repeat"
              render={({ field }) => (
                <RepeatPicker value={field.value} onChange={field.onChange}>
                  <InputGroupButton variant={field.value ? "secondary" : "outline"}>
                    <ArrowClockwiseIcon />
                    {repeatLabel(field.value)}
                  </InputGroupButton>
                </RepeatPicker>
              )}
            />

            <div className="ml-auto flex items-center gap-1.5">
              <InputGroupButton type="button" variant="ghost" size="icon-sm" onClick={handleCancel}>
                <XIcon />
              </InputGroupButton>
              <InputGroupButton type="submit" variant="default" size="sm" disabled={!title.trim()}>
                Add
              </InputGroupButton>
            </div>
          </InputGroupAddon>
        )}
      </InputGroup>
    </form>
  )
}
