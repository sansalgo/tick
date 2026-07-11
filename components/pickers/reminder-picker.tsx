"use client"

import { useState } from "react"
import { addDays, addHours, format, nextMonday, setHours, setMinutes, startOfDay } from "date-fns"
import { BellIcon, CalendarBlankIcon, CalendarCheckIcon, ClockIcon, SunHorizonIcon } from "@phosphor-icons/react"

import { PickerFooter } from "@/components/pickers/picker-footer"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ReminderPickerProps {
  value: string | null
  onChange: (value: string | null) => void
  children: React.ReactNode
}

function withTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number)
  return setMinutes(setHours(date, hours), minutes)
}

export function ReminderPicker({ value, onChange, children }: ReminderPickerProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"options" | "date">(value ? "date" : "options")
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined)
  const [time, setTime] = useState(value ? format(new Date(value), "HH:mm") : "09:00")

  function apply(next: Date | null) {
    onChange(next ? next.toISOString() : null)
    setOpen(false)
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      const current = value ? new Date(value) : undefined
      setDate(current)
      setTime(current ? format(current, "HH:mm") : "09:00")
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
              onClick={() => apply(addHours(new Date(), 1))}
            >
              <SunHorizonIcon /> Later today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start gap-2"
              onClick={() => apply(withTime(addDays(startOfDay(new Date()), 1), "09:00"))}
            >
              <CalendarBlankIcon /> Tomorrow
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start gap-2"
              onClick={() => apply(withTime(startOfDay(nextMonday(new Date())), "09:00"))}
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
              <ClockIcon /> Pick a date & time
            </Button>
          </div>
        ) : (
          <>
            <Calendar mode="single" selected={date} onSelect={setDate} className="p-0" />
            <div className="flex items-center gap-2 px-2 pb-1">
              <BellIcon className="size-4 text-muted-foreground" />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-8 flex-1" />
            </div>
            <PickerFooter
              onCancel={() => setOpen(false)}
              onSave={() => apply(date ? withTime(date, time) : null)}
              onRemove={value ? () => apply(null) : undefined}
              removeLabel="Remove reminder"
            />
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
