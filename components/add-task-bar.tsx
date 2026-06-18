"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { format, startOfDay } from "date-fns"
import { z } from "zod"
import {
  BellIcon,
  CalendarBlankIcon,
  ArrowClockwiseIcon,
  CircleIcon,
  PlusIcon,
  XIcon,
  ListChecksIcon,
  ListBulletsIcon,
  CheckIcon,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DEFAULT_LIST_ID } from "@/lib/constants"
import { isoDateStringSchema, repeatRuleSchema, type RepeatRule, type TaskList } from "@/lib/schemas"
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

function ListPickerButton({
  lists,
  selectedListId,
  onSelect,
}: {
  lists: TaskList[]
  selectedListId: string
  onSelect: (listId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedList = lists.find((l) => l.id === selectedListId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <InputGroupButton variant="outline" className="shrink-0 gap-1.5">
          {selectedListId === DEFAULT_LIST_ID ? (
            <ListChecksIcon />
          ) : selectedList?.emoji ? (
            <span className="text-xs leading-none">{selectedList.emoji}</span>
          ) : (
            <ListBulletsIcon />
          )}
          {selectedList?.name ?? "Tasks"}
        </InputGroupButton>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        {lists.map((list) => (
          <button
            key={list.id}
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              onSelect(list.id)
              setOpen(false)
            }}
          >
            {list.id === DEFAULT_LIST_ID ? (
              <ListChecksIcon className="size-4 shrink-0" />
            ) : list.emoji ? (
              <span className="size-4 text-center leading-none">{list.emoji}</span>
            ) : (
              <ListBulletsIcon className="size-4 shrink-0" />
            )}
            <span className="flex-1 truncate text-left">{list.name}</span>
            {list.id === selectedListId && <CheckIcon className="size-4 shrink-0 text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

interface AddTaskBarProps {
  listId: string
  taskDefaults?: Partial<Pick<NewTaskInput, "myDay" | "dueDate" | "reminder" | "repeat">>
  markImportant?: boolean
  lists?: TaskList[]
  showQuickDueDate?: boolean
  placeholder?: string
  className?: string
}

export function AddTaskBar({
  listId,
  taskDefaults,
  markImportant,
  lists,
  showQuickDueDate,
  placeholder = "Add a task",
  className,
}: AddTaskBarProps) {
  const [focused, setFocused] = useState(false)
  const [selectedListId, setSelectedListId] = useState(listId)
  const addTask = useAppStore((state) => state.addTask)
  const toggleTaskImportant = useAppStore((state) => state.toggleTaskImportant)

  const defaultDueDate = showQuickDueDate
    ? (taskDefaults?.dueDate ?? startOfDay(new Date()).toISOString())
    : (taskDefaults?.dueDate ?? null)

  const form = useForm<AddTaskValues>({
    resolver: zodResolver(addTaskSchema),
    defaultValues: {
      title: "",
      dueDate: defaultDueDate,
      reminder: taskDefaults?.reminder ?? null,
      repeat: taskDefaults?.repeat ?? null,
    },
  })

  function onSubmit(values: AddTaskValues) {
    const id = addTask({
      listId: selectedListId,
      title: values.title.trim(),
      myDay: taskDefaults?.myDay ?? null,
      dueDate: values.dueDate,
      reminder: values.reminder,
      repeat: values.repeat,
    })
    if (markImportant) toggleTaskImportant(id)
    form.reset({
      title: "",
      dueDate: defaultDueDate,
      reminder: taskDefaults?.reminder ?? null,
      repeat: taskDefaults?.repeat ?? null,
    })
    setFocused(false)
  }

  function handleCancel() {
    form.reset({
      title: "",
      dueDate: defaultDueDate,
      reminder: taskDefaults?.reminder ?? null,
      repeat: taskDefaults?.repeat ?? null,
    })
    setFocused(false)
  }

  const title = form.watch("title")
  const isTyping = focused && title.trim().length > 0

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      onBlur={(e) => {
        // Collapse to default state when focus leaves the form with no text typed
        if (!e.currentTarget.contains(e.relatedTarget as Node) && !title.trim()) {
          setFocused(false)
        }
      }}
      className={className}
    >
      <InputGroup className="h-11 rounded-xl border border-border/50 bg-card/80 shadow-sm backdrop-blur-sm">
        <InputGroupAddon align="inline-start" className="pl-3">
          {focused ? (
            <CircleIcon className="size-4 shrink-0 text-muted-foreground/50" />
          ) : (
            <PlusIcon className="size-4 shrink-0 text-muted-foreground/70" />
          )}
        </InputGroupAddon>

        <InputGroupInput
          placeholder={focused ? placeholder : "Add task"}
          className="text-sm"
          {...form.register("title")}
          onFocus={() => setFocused(true)}
        />

        <InputGroupAddon align="inline-end" className="gap-1 pr-2">
          {/* All actions only visible in typing state (stage 3) */}
          {isTyping && (
            <>
              {showQuickDueDate ? (
                <Controller
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <DueDatePicker value={field.value} onChange={field.onChange}>
                      <InputGroupButton variant={field.value ? "secondary" : "outline"} className="shrink-0">
                        <CalendarBlankIcon />
                        {field.value ? format(new Date(field.value), "MMM d") : "Today"}
                      </InputGroupButton>
                    </DueDatePicker>
                  )}
                />
              ) : (
                <Controller
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <DueDatePicker value={field.value} onChange={field.onChange}>
                      <InputGroupButton
                        variant={field.value ? "secondary" : "ghost"}
                        size="icon-sm"
                        aria-label="Set due date"
                      >
                        <CalendarBlankIcon />
                      </InputGroupButton>
                    </DueDatePicker>
                  )}
                />
              )}

              <Controller
                control={form.control}
                name="reminder"
                render={({ field }) => (
                  <ReminderPicker value={field.value} onChange={field.onChange}>
                    <InputGroupButton
                      variant={field.value ? "secondary" : "ghost"}
                      size="icon-sm"
                      aria-label="Set reminder"
                    >
                      <BellIcon />
                    </InputGroupButton>
                  </ReminderPicker>
                )}
              />

              <Controller
                control={form.control}
                name="repeat"
                render={({ field }) => (
                  <RepeatPicker value={field.value} onChange={field.onChange}>
                    <InputGroupButton
                      variant={field.value ? "secondary" : "ghost"}
                      size="icon-sm"
                      aria-label="Set repeat"
                    >
                      <ArrowClockwiseIcon />
                    </InputGroupButton>
                  </RepeatPicker>
                )}
              />

              {lists && (
                <ListPickerButton
                  lists={lists}
                  selectedListId={selectedListId}
                  onSelect={setSelectedListId}
                />
              )}

              <InputGroupButton
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleCancel}
                aria-label="Cancel"
              >
                <XIcon />
              </InputGroupButton>
              <InputGroupButton type="submit" variant="default" size="sm">
                Add
              </InputGroupButton>
            </>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
