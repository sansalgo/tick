"use client"

import {
  ArrowUpRightIcon,
  CheckIcon,
  DotsThreeVerticalIcon,
  TrashIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditableText } from "@/components/editable-text"
import type { Step } from "@/lib/schemas"

interface StepRowProps {
  step: Step
  onToggle: () => void
  onRename: (title: string) => void
  onPromote: () => void
  onDelete: () => void
}

export function StepRow({ step, onToggle, onRename, onPromote, onDelete }: StepRowProps) {
  return (
    <div className="group flex items-center gap-2">
      <Checkbox checked={step.completed} onCheckedChange={onToggle} className="size-4 rounded-full" />
      <EditableText
        value={step.title}
        onSave={onRename}
        strikethrough={step.completed}
        className="flex-1 text-sm"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="Step options"
          >
            <DotsThreeVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={onToggle}>
            <CheckIcon /> {step.completed ? "Mark as not completed" : "Mark as completed"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onPromote}>
            <ArrowUpRightIcon /> Promote to task
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <TrashIcon /> Delete step
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
