"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ListBulletsIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SquaresFourIcon,
  UserIcon,
} from "@phosphor-icons/react"

import { GithubStatus } from "@/components/github/github-status"
import { NewListDialog } from "@/components/new-list-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DEFAULT_LIST_ID, SMART_LIST_DEFS } from "@/lib/constants"
import {
  selectAllTasks,
  selectImportantTasks,
  selectMyDayTasks,
  selectPlannedTasks,
  useAppStore,
} from "@/lib/store"
import type { SmartListKey } from "@/lib/schemas"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [search, setSearch] = useState("")

  const lists = useAppStore((state) => state.lists)
  const tasks = useAppStore((state) => state.tasks)
  const github = useAppStore((state) => state.github)

  const smartListCounts: Record<SmartListKey, number> = {
    tasks: selectAllTasks(tasks).filter((t) => !t.completed).length,
    myDay: selectMyDayTasks(tasks).filter((t) => !t.completed).length,
    important: selectImportantTasks(tasks).filter((t) => !t.completed).length,
    planned: selectPlannedTasks(tasks).filter((t) => !t.completed).length,
  }

  const customLists = lists.filter((list) => list.id !== DEFAULT_LIST_ID)

  function listTaskCount(listId: string) {
    return tasks.filter((t) => t.listId === listId && !t.completed).length
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = search.trim()
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="gap-3 p-3">
        <div className="flex items-center gap-2 px-1">
          <Avatar size="sm">
            <AvatarFallback>
              {github.connected && github.login ? (
                github.login[0]?.toUpperCase()
              ) : (
                <UserIcon />
              )}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs font-medium">
            {github.connected && github.login ? github.login : "My tasks"}
          </span>
        </div>
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <SidebarInput
              placeholder="Search"
              className="pl-7"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </form>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {SMART_LIST_DEFS.map((def) => {
                const Icon = def.icon
                const count = smartListCounts[def.key]
                return (
                  <SidebarMenuItem key={def.key}>
                    <SidebarMenuButton asChild isActive={pathname === def.path}>
                      <Link href={def.path}>
                        <Icon />
                        <span>{def.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {count > 0 && <SidebarMenuBadge>{count}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Lists</SidebarGroupLabel>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarGroupAction disabled aria-label="Group lists">
                <SquaresFourIcon />
              </SidebarGroupAction>
            </TooltipTrigger>
            <TooltipContent side="right">Group lists (coming soon)</TooltipContent>
          </Tooltip>
          <SidebarGroupContent>
            <SidebarMenu>
              {customLists.map((list) => (
                <SidebarMenuItem key={list.id}>
                  <SidebarMenuButton asChild isActive={pathname === `/lists/${list.id}`}>
                    <Link href={`/lists/${list.id}`}>
                      {list.emoji ? <span>{list.emoji}</span> : <ListBulletsIcon />}
                      <span>{list.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  {listTaskCount(list.id) > 0 && (
                    <SidebarMenuBadge>{listTaskCount(list.id)}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <NewListDialog>
                  <SidebarMenuButton>
                    <PlusIcon />
                    <span>New list</span>
                  </SidebarMenuButton>
                </NewListDialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <GithubStatus />
      </SidebarFooter>
    </Sidebar>
  )
}
