"use client"

import { SortAscendingIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { SortBy, SortConfig } from "@/lib/schemas"

const SORT_BY_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "importance", label: "Importance" },
  { value: "dueDate", label: "Due date" },
  { value: "myDay", label: "Added to My Day" },
  { value: "alphabetical", label: "Alphabetically" },
  { value: "createdAt", label: "Creation date" },
]

interface ListOptionsMenuProps {
  sortConfig: SortConfig
  onSortChange: (sort: SortConfig) => void
}

export function ListOptionsMenu({ sortConfig, onSortChange }: ListOptionsMenuProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Sort options">
              <SortAscendingIcon />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Sort options</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortConfig.by}
          onValueChange={(value) => onSortChange({ ...sortConfig, by: value as SortBy })}
        >
          {SORT_BY_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
