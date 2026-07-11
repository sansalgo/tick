"use client"

import { useState } from "react"
import { addDays, nextMonday, startOfDay } from "date-fns"
import { CalendarBlankIcon, CalendarCheckIcon, CalendarDotIcon, SunIcon } from "@phosphor-icons/react"

import { PickerFooter } from "@/components/pickers/picker-footer"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DueDatePickerProps {
  value: string | null
  onChange: (value: string | null) => void
  children: React.ReactNode
}

export function DueDatePicker({ value, onChange, children }: DueDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"options" | "date">(value ? "date" : "options")
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined)

  function apply(next: Date | null) {
    onChange(next ? startOfDay(next).toISOString() : null)
    setOpen(false)
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      setDate(value ? new Date(value) : undefined)
      setStep(value ? "date" : "options")
    }
    setOpen(next)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto" align="start">
        {step === "options" ? (
          <div className="flex flex-col gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start gap-2"
              onClick={() => apply(new Date())}
            >
              <SunIcon /> Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start gap-2"
              onClick={() => apply(addDays(new Date(), 1))}
            >
              <CalendarBlankIcon /> Tomorrow
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start gap-2"
              onClick={() => apply(nextMonday(new Date()))}
            >
              <CalendarCheckIcon /> Next week
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start gap-2"
              onClick={() => setStep("date")}
            >
              <CalendarDotIcon /> Pick a date
            </Button>
          </div>
        ) : (
          <>
            <Calendar mode="single" selected={date} onSelect={setDate} className="p-0" />
            <PickerFooter
              onCancel={() => setOpen(false)}
              onSave={() => apply(date ?? null)}
              onRemove={value ? () => apply(null) : undefined}
              removeLabel="Remove due date"
            />
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
