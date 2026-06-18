"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CaretDownIcon,
  CaretRightIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SquaresFourIcon,
  TrashIcon,
} from "@phosphor-icons/react"

import { GitSyncActions } from "@/components/github/git-sync-actions"
import { GithubStatus } from "@/components/github/github-status"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
import { DEFAULT_LIST_ID } from "@/lib/constants"
import {
  selectAllTasks,
  selectImportantTasks,
  selectMyDayTasks,
  selectPlannedTasks,
  useAppStore,
} from "@/lib/store"
import type { ListGroup, SmartListKey, TaskList } from "@/lib/schemas"
import { SMART_LIST_DEFS } from "@/lib/smart-lists"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [renamingListId, setRenamingListId] = useState<string | null>(null)
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)

  const lists = useAppStore((state) => state.lists)
  const tasks = useAppStore((state) => state.tasks)
  const groups = useAppStore((state) => state.groups)
  const github = useAppStore((state) => state.github)
  const addList = useAppStore((state) => state.addList)
  const addGroup = useAppStore((state) => state.addGroup)

  const smartListCounts: Record<SmartListKey, number> = {
    tasks: selectAllTasks(tasks).filter((t) => !t.completed).length,
    myDay: selectMyDayTasks(tasks).filter((t) => !t.completed).length,
    important: selectImportantTasks(tasks).filter((t) => !t.completed).length,
    planned: selectPlannedTasks(tasks).filter((t) => !t.completed).length,
  }

  const customLists = lists.filter((list) => list.id !== DEFAULT_LIST_ID)
  const ungroupedLists = customLists.filter((l) => !l.groupId)

  function listTaskCount(listId: string) {
    return tasks.filter((t) => t.listId === listId && !t.completed).length
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = search.trim()
    if (query) router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  function handleAddGroup() {
    const id = addGroup("Untitled group")
    setRenamingGroupId(id)
  }

  function handleAddList(groupId?: string) {
    const id = addList("Untitled list", groupId ? { groupId } : undefined)
    setRenamingListId(id)
    router.push(`/lists/${id}`)
  }

  return (
    <Sidebar>
      <SidebarHeader className="gap-3 p-3">
        {github.connected && github.login && (
          <div className="flex items-center gap-2 px-1">
            <Avatar size="sm">
              <AvatarFallback>{github.login[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate text-xs font-medium">{github.login}</span>
          </div>
        )}
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <SidebarInput
              placeholder="Search"
              className="pl-7"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          <SidebarGroupAction onClick={handleAddGroup} aria-label="New group" title="New group">
            <SquaresFourIcon />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {ungroupedLists.map((list) => (
                <ListItem
                  key={list.id}
                  list={list}
                  isActive={pathname === `/lists/${list.id}`}
                  count={listTaskCount(list.id)}
                  groups={groups}
                  isRenaming={renamingListId === list.id}
                  onRenameComplete={() => setRenamingListId(null)}
                />
              ))}

              {groups.map((group) => (
                <GroupItem
                  key={group.id}
                  group={group}
                  lists={customLists.filter((l) => l.groupId === group.id)}
                  pathname={pathname}
                  listTaskCount={listTaskCount}
                  allGroups={groups}
                  renamingListId={renamingListId}
                  onListRenameComplete={() => setRenamingListId(null)}
                  autoFocusRename={renamingGroupId === group.id}
                  onGroupRenameComplete={() => setRenamingGroupId(null)}
                  onAddList={() => handleAddList(group.id)}
                />
              ))}

              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => handleAddList()}>
                  <PlusIcon />
                  <span>New list</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <GitSyncActions />
        <GithubStatus />
      </SidebarFooter>
    </Sidebar>
  )
}

// ─── ListItem ────────────────────────────────────────────────────────────────

interface ListItemProps {
  list: TaskList
  isActive: boolean
  count: number
  groups: ListGroup[]
  indent?: boolean
  isRenaming?: boolean
  onRenameComplete?: () => void
}

function ListItem({ list, isActive, count, groups, indent, isRenaming, onRenameComplete }: ListItemProps) {
  const renameList = useAppStore((state) => state.renameList)
  const moveListToGroup = useAppStore((state) => state.moveListToGroup)
  const deleteList = useAppStore((state) => state.deleteList)

  const [renameValue, setRenameValue] = useState(list.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming) {
      setRenameValue(list.name)
      // Wait for render then select all
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [isRenaming, list.name])

  function commitRename() {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== list.name) renameList(list.id, trimmed)
    onRenameComplete?.()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); commitRename() }
    if (e.key === "Escape") { onRenameComplete?.() }
  }

  const icon = list.emoji ? <span>{list.emoji}</span> : <ListBulletsIcon />
  const indentClass = indent ? "pl-6" : undefined

  if (isRenaming) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton isActive={isActive} className={indentClass}>
          {icon}
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
          />
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive} className={indentClass}>
            <Link href={`/lists/${list.id}`}>
              {icon}
              <span>{list.name}</span>
            </Link>
          </SidebarMenuButton>
          {count > 0 && <SidebarMenuBadge>{count}</SidebarMenuBadge>}
        </SidebarMenuItem>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {groups.length > 0 && (
          <>
            {groups.map((g) => (
              <ContextMenuItem
                key={g.id}
                onSelect={() => moveListToGroup(list.id, g.id)}
                disabled={list.groupId === g.id}
              >
                Move to "{g.name}"
              </ContextMenuItem>
            ))}
            {list.groupId && (
              <ContextMenuItem onSelect={() => moveListToGroup(list.id, null)}>
                Remove from group
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem variant="destructive" onSelect={() => deleteList(list.id)}>
          <TrashIcon /> Delete list
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ─── GroupItem ────────────────────────────────────────────────────────────────

interface GroupItemProps {
  group: ListGroup
  lists: TaskList[]
  pathname: string
  listTaskCount: (id: string) => number
  allGroups: ListGroup[]
  renamingListId: string | null
  onListRenameComplete: () => void
  autoFocusRename: boolean
  onGroupRenameComplete: () => void
  onAddList: () => void
}

function GroupItem({
  group,
  lists,
  pathname,
  listTaskCount,
  allGroups,
  renamingListId,
  onListRenameComplete,
  autoFocusRename,
  onGroupRenameComplete,
  onAddList,
}: GroupItemProps) {
  const renameGroup = useAppStore((state) => state.renameGroup)
  const deleteGroup = useAppStore((state) => state.deleteGroup)
  const toggleGroupCollapsed = useAppStore((state) => state.toggleGroupCollapsed)

  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(group.name)
  const inputRef = useRef<HTMLInputElement>(null)

  // Enter rename mode when the group is freshly created
  useEffect(() => {
    if (autoFocusRename) {
      setRenaming(true)
    }
  }, [autoFocusRename])

  useEffect(() => {
    if (renaming) {
      setRenameValue(group.name)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [renaming, group.name])

  function commitRename() {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== group.name) renameGroup(group.id, trimmed)
    setRenaming(false)
    onGroupRenameComplete()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); commitRename() }
    if (e.key === "Escape") { setRenaming(false); onGroupRenameComplete() }
  }

  function startRename() {
    setRenaming(true)
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => { if (!renaming) toggleGroupCollapsed(group.id) }}
            >
              <SquaresFourIcon />
              {renaming ? (
                <input
                  ref={inputRef}
                  className="flex-1 bg-transparent text-sm outline-none"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 truncate">{group.name}</span>
              )}
              {group.collapsed
                ? <CaretRightIcon className="ml-auto shrink-0" />
                : <CaretDownIcon className="ml-auto shrink-0" />}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onSelect={startRename}>Rename group</ContextMenuItem>
          <ContextMenuItem onSelect={onAddList}>
            <PlusIcon /> New list
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onSelect={() => deleteGroup(group.id)}>
            <TrashIcon /> Delete group
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {!group.collapsed && (
        <>
          {lists.map((list) => (
            <ListItem
              key={list.id}
              list={list}
              isActive={pathname === `/lists/${list.id}`}
              count={listTaskCount(list.id)}
              groups={allGroups}
              indent
              isRenaming={renamingListId === list.id}
              onRenameComplete={onListRenameComplete}
            />
          ))}
          {lists.length === 0 && (
            <SidebarMenuItem>
              <div className="py-1.5 pl-6 text-xs text-muted-foreground select-none">
                Drag here to add lists
              </div>
            </SidebarMenuItem>
          )}
        </>
      )}
    </>
  )
}
