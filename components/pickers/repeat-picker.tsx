"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { ArrowClockwiseIcon } from "@phosphor-icons/react"

import { PickerFooter } from "@/components/pickers/picker-footer"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { RepeatRule } from "@/lib/schemas"

interface RepeatPickerProps {
  value: RepeatRule | null
  onChange: (value: RepeatRule | null) => void
  children: React.ReactNode
}

const PRESETS: { type: "daily" | "weekdays" | "weekly" | "monthly" | "yearly"; label: string }[] = [
  { type: "daily", label: "Daily" },
  { type: "weekdays", label: "Every weekday" },
  { type: "weekly", label: "Weekly" },
  { type: "monthly", label: "Monthly" },
  { type: "yearly", label: "Yearly" },
]

const customRepeatSchema = z.object({
  interval: z.number().int().min(1),
  unit: z.enum(["days", "weeks", "months", "years"]),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
})

type CustomRepeatValues = z.infer<typeof customRepeatSchema>

const WEEKDAYS = [
  { value: 0, label: "Su" },
  { value: 1, label: "Mo" },
  { value: 2, label: "Tu" },
  { value: 3, label: "We" },
  { value: 4, label: "Th" },
  { value: 5, label: "Fr" },
  { value: 6, label: "Sa" },
]

export function RepeatPicker({ value, onChange, children }: RepeatPickerProps) {
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(value?.type === "custom")

  const form = useForm<CustomRepeatValues>({
    resolver: zodResolver(customRepeatSchema),
    defaultValues: {
      interval: value?.type === "custom" ? value.interval : 1,
      unit: value?.type === "custom" ? value.unit : "weeks",
      weekdays: value?.type === "custom" ? (value.weekdays ?? []) : [],
    },
  })

  function apply(rule: RepeatRule | null) {
    onChange(rule)
    setOpen(false)
  }

  function onCustomSubmit(values: CustomRepeatValues) {
    apply({
      type: "custom",
      interval: values.interval,
      unit: values.unit,
      weekdays: values.unit === "weeks" && values.weekdays?.length ? values.weekdays : undefined,
    })
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setShowCustom(value?.type === "custom")
      form.reset({
        interval: value?.type === "custom" ? value.interval : 1,
        unit: value?.type === "custom" ? value.unit : "weeks",
        weekdays: value?.type === "custom" ? (value.weekdays ?? []) : [],
      })
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        {!showCustom ? (
          <div className="flex flex-col gap-0.5">
            {PRESETS.map((preset) => (
              <Button
                key={preset.type}
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start gap-2"
                onClick={() => apply({ type: preset.type })}
              >
                <ArrowClockwiseIcon /> {preset.label}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start gap-2"
              onClick={() => setShowCustom(true)}
            >
              <ArrowClockwiseIcon /> Custom
            </Button>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onCustomSubmit)}>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="repeat-interval">Repeat every</FieldLabel>
                <Input
                  id="repeat-interval"
                  type="number"
                  min={1}
                  className="w-16"
                  {...form.register("interval", { valueAsNumber: true })}
                />
                <Select
                  value={form.watch("unit")}
                  onValueChange={(unit) => form.setValue("unit", unit as CustomRepeatValues["unit"])}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Day(s)</SelectItem>
                    <SelectItem value="weeks">Week(s)</SelectItem>
                    <SelectItem value="months">Month(s)</SelectItem>
                    <SelectItem value="years">Year(s)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.watch("unit") === "weeks" && (
                <div className="flex flex-wrap gap-1">
                  {WEEKDAYS.map((day) => {
                    const selected = (form.watch("weekdays") ?? []).includes(day.value)
                    return (
                      <Button
                        key={day.value}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "secondary"}
                        className="size-9 px-0"
                        onClick={() => {
                          const current = form.getValues("weekdays") ?? []
                          form.setValue(
                            "weekdays",
                            selected ? current.filter((d) => d !== day.value) : [...current, day.value]
                          )
                        }}
                      >
                        {day.label}
                      </Button>
                    )
                  })}
                </div>
              )}
            </FieldGroup>
            <PickerFooter
              onCancel={() => setOpen(false)}
              onSave={() => form.handleSubmit(onCustomSubmit)()}
              onRemove={value ? () => apply(null) : undefined}
              removeLabel="Remove repeat"
            />
          </form>
        )}
      </PopoverContent>
    </Popover>
  )
}
