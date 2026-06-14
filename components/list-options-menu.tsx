"use client"

import { DotsThreeVerticalIcon, SortAscendingIcon, SortDescendingIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { SortBy, SortConfig, SortDirection } from "@/lib/schemas"

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
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="List options">
          <DotsThreeVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {sortConfig.direction === "asc" ? <SortAscendingIcon /> : <SortDescendingIcon />}
            Sort
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
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
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sortConfig.direction}
              onValueChange={(value) =>
                onSortChange({ ...sortConfig, direction: value as SortDirection })
              }
            >
              <DropdownMenuRadioItem value="asc">
                <SortAscendingIcon /> Ascending
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">
                <SortDescendingIcon /> Descending
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
