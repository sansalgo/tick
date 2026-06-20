"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  DragStartEvent,
  Modifier,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"

import { GitSyncActions } from "@/components/github/git-sync-actions"
import { GithubStatus } from "@/components/github/github-status"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
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
import { cn } from "@/lib/utils"

// ─── DnD helpers ──────────────────────────────────────────────────────────────

const ZONE_UNGROUPED = "zone:ungrouped"
const mkListId = (id: string) => `l:${id}`
const mkGroupId = (id: string) => `g:${id}`

type ActiveDrag = { type: "list" | "group"; id: string } | null
type DropIndicator = { overId: string; position: "before" | "after" } | null

function reorderById(ids: string[], activeId: string, overId: string, pos: "before" | "after"): string[] {
  const result = ids.filter((id) => id !== activeId)
  const idx = result.indexOf(overId)
  if (idx === -1) return ids
  result.splice(pos === "before" ? idx : idx + 1, 0, activeId)
  return result
}

// Keeps the DragOverlay inside the viewport — prevents horizontal scrollbar from appearing
function clampAxis(t: number, pos: number, bound: number, dim: number) {
  const next = pos + t
  if (next < 0) return t - next
  if (next + dim > bound) return bound - pos - dim
  return t
}

const restrictToWindow: Modifier = ({ draggingNodeRect, transform, windowRect }) => {
  if (!draggingNodeRect || !windowRect) return transform
  return {
    ...transform,
    x: clampAxis(transform.x, draggingNodeRect.left, windowRect.width, draggingNodeRect.width),
    y: clampAxis(transform.y, draggingNodeRect.top, windowRect.height, draggingNodeRect.height),
  }
}

// ─── AppSidebar ───────────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [renamingListId, setRenamingListId] = useState<string | null>(null)
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)

  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null)
  // Refs avoid stale-closure bugs in the drag move/end handlers
  const activeDragRef = useRef<ActiveDrag>(null)
  const dropIndicatorRef = useRef<DropIndicator>(null)
  const dragStartYRef = useRef(0)

  const lists = useAppStore((s) => s.lists)
  const tasks = useAppStore((s) => s.tasks)
  const groups = useAppStore((s) => s.groups)
  const github = useAppStore((s) => s.github)
  const addList = useAppStore((s) => s.addList)
  const addGroup = useAppStore((s) => s.addGroup)
  const moveListToGroup = useAppStore((s) => s.moveListToGroup)
  const reorderLists = useAppStore((s) => s.reorderLists)
  const reorderGroups = useAppStore((s) => s.reorderGroups)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const smartListCounts: Record<SmartListKey, number> = {
    tasks: selectAllTasks(tasks).filter((t) => !t.completed).length,
    myDay: selectMyDayTasks(tasks).filter((t) => !t.completed).length,
    important: selectImportantTasks(tasks).filter((t) => !t.completed).length,
    planned: selectPlannedTasks(tasks).filter((t) => !t.completed).length,
  }

  const customLists = lists.filter((l) => l.id !== DEFAULT_LIST_ID)
  const ungroupedLists = customLists.filter((l) => !l.groupId)

  function listTaskCount(id: string) {
    return tasks.filter((t) => t.listId === id && !t.completed).length
  }

  function handleSearchSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const q = search.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  function handleAddGroup() {
    setRenamingGroupId(addGroup("Untitled group"))
  }

  function handleAddList(groupId?: string) {
    const id = addList("Untitled list", groupId ? { groupId } : undefined)
    setRenamingListId(id)
    router.push(`/lists/${id}`)
  }

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as { type: "list" | "group"; id: string }
    const drag: ActiveDrag = { type: data.type, id: data.id }
    setActiveDrag(drag)
    activeDragRef.current = drag
    dragStartYRef.current = (e.activatorEvent as PointerEvent).clientY
  }

  function syncIndicator(indicator: DropIndicator) {
    setDropIndicator(indicator)
    dropIndicatorRef.current = indicator
  }

  function handleDragMove(e: DragMoveEvent) {
    const { over, delta } = e
    if (!over) { syncIndicator(null); return }

    const overId = over.id as string
    const dragType = activeDragRef.current?.type

    // When a list is dragged over a group header it will be added to the group —
    // no positional indicator needed in that case.
    if (overId === ZONE_UNGROUPED || (dragType === "list" && overId.startsWith("g:"))) {
      syncIndicator(null)
      return
    }

    const currentY = dragStartYRef.current + delta.y
    const midY = over.rect.top + over.rect.height / 2
    syncIndicator({ overId, position: currentY < midY ? "before" : "after" })
  }

  function handleDragEnd(e: DragEndEvent) {
    const drag = activeDragRef.current
    const indicator = dropIndicatorRef.current
    setActiveDrag(null)
    activeDragRef.current = null
    syncIndicator(null)
    if (!e.over || !drag) return

    const overId = e.over.id as string

    if (drag.type === "group") {
      if (!overId.startsWith("g:")) return
      const targetGroupId = overId.slice(2)
      if (drag.id === targetGroupId) return
      reorderGroups(
        reorderById(groups.map((g) => g.id), drag.id, targetGroupId, indicator?.position ?? "after"),
      )
      return
    }

    // List drag
    if (overId === ZONE_UNGROUPED) {
      moveListToGroup(drag.id, null)
      return
    }
    if (overId.startsWith("g:")) {
      moveListToGroup(drag.id, overId.slice(2))
      return
    }
    if (overId.startsWith("l:")) {
      const targetListId = overId.slice(2)
      if (drag.id === targetListId) return
      const targetList = customLists.find((l) => l.id === targetListId)
      const draggedList = customLists.find((l) => l.id === drag.id)
      const newGroupId = targetList?.groupId ?? null
      const pos = indicator?.position ?? "after"
      reorderLists(reorderById(customLists.map((l) => l.id), drag.id, targetListId, pos))
      if (newGroupId !== (draggedList?.groupId ?? null)) {
        moveListToGroup(drag.id, newGroupId)
      }
    }
  }

  const isDraggingGroupedList =
    activeDrag?.type === "list" &&
    (customLists.find((l) => l.id === activeDrag.id)?.groupId != null)

  const overlayList = activeDrag?.type === "list" ? lists.find((l) => l.id === activeDrag.id) : null
  const overlayGroup = activeDrag?.type === "group" ? groups.find((g) => g.id === activeDrag.id) : null

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

      {/* overflow-x-hidden fixes the SidebarContent's default overflow-auto
          which allowed the DragOverlay to trigger a horizontal scrollbar */}
      <SidebarContent className="overflow-x-hidden">
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
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
            >
              <ListsSectionZone isDragging={isDraggingGroupedList}>
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
                      onStartRename={() => setRenamingListId(list.id)}
                      dropIndicator={dropIndicator}
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
                      onStartListRename={(id) => setRenamingListId(id)}
                      autoFocusRename={renamingGroupId === group.id}
                      onGroupRenameComplete={() => setRenamingGroupId(null)}
                      onAddList={() => handleAddList(group.id)}
                      dropIndicator={dropIndicator}
                      activeDragType={activeDrag?.type ?? null}
                    />
                  ))}

                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => handleAddList()}>
                      <PlusIcon />
                      <span>New list</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </ListsSectionZone>

              <DragOverlay modifiers={[restrictToWindow]} dropAnimation={null}>
                {overlayList && (
                  <div className="flex items-center gap-2 rounded bg-popover px-2 py-1.5 text-xs shadow-lg ring-1 ring-foreground/10">
                    {overlayList.emoji ? (
                      <span>{overlayList.emoji}</span>
                    ) : (
                      <ListBulletsIcon className="size-4" />
                    )}
                    <span>{overlayList.name}</span>
                  </div>
                )}
                {overlayGroup && (
                  <div className="flex items-center gap-2 rounded bg-popover px-2 py-1.5 text-xs shadow-lg ring-1 ring-foreground/10">
                    <SquaresFourIcon className="size-4" />
                    <span>{overlayGroup.name}</span>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
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

// ─── ListsSectionZone ─────────────────────────────────────────────────────────
// The entire lists area is a single droppable zone. When a grouped list is
// dragged anywhere here (and not onto a specific item), it gets ungrouped.
// pointerWithin collision detection ensures specific list/group items take
// priority over this zone when the pointer is directly over them.

function ListsSectionZone({ isDragging, children }: { isDragging: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: ZONE_UNGROUPED })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg transition-colors duration-150",
        isDragging && "bg-muted/20",
        isDragging && isOver && "bg-primary/5",
      )}
    >
      {children}
    </div>
  )
}

// ─── ListItem ─────────────────────────────────────────────────────────────────

interface ListItemProps {
  list: TaskList
  isActive: boolean
  count: number
  groups: ListGroup[]
  indent?: boolean
  isRenaming?: boolean
  onRenameComplete?: () => void
  onStartRename?: () => void
  dropIndicator: DropIndicator
}

function ListItem({
  list,
  isActive,
  count,
  groups,
  indent,
  isRenaming,
  onRenameComplete,
  onStartRename,
  dropIndicator,
}: ListItemProps) {
  const renameList = useAppStore((s) => s.renameList)
  const moveListToGroup = useAppStore((s) => s.moveListToGroup)
  const deleteList = useAppStore((s) => s.deleteList)
  const duplicateList = useAppStore((s) => s.duplicateList)

  const [renameValue, setRenameValue] = useState(list.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const dndId = mkListId(list.id)
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: dndId,
    data: { type: "list" as const, id: list.id },
    disabled: !!isRenaming,
  })
  const { setNodeRef: setDropRef } = useDroppable({ id: dndId })
  const setRef = useCallback(
    (el: HTMLElement | null) => { setDragRef(el); setDropRef(el) },
    [setDragRef, setDropRef],
  )

  const indicator = dropIndicator?.overId === dndId ? dropIndicator : null

  useEffect(() => {
    if (isRenaming) {
      setRenameValue(list.name)
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 150)
    }
  }, [isRenaming, list.name])

  function commitRename() {
    const t = renameValue.trim()
    if (t && t !== list.name) renameList(list.id, t)
    onRenameComplete?.()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); commitRename() }
    if (e.key === "Escape") onRenameComplete?.()
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
        {/* SidebarMenuItem already has position:relative */}
        <SidebarMenuItem>
          {indicator?.position === "before" && (
            <div className="pointer-events-none absolute inset-x-2 -top-px z-10 h-0.5 rounded-full bg-primary" />
          )}
          <SidebarMenuButton
            asChild
            isActive={isActive}
            className={cn(indentClass, isDragging && "opacity-40")}
            ref={setRef}
            style={{ touchAction: "none" }}
            {...listeners}
            {...attributes}
          >
            <Link href={`/lists/${list.id}`}>
              {icon}
              <span>{list.name}</span>
            </Link>
          </SidebarMenuButton>
          {count > 0 && <SidebarMenuBadge>{count}</SidebarMenuBadge>}
          {indicator?.position === "after" && (
            <div className="pointer-events-none absolute inset-x-2 -bottom-px z-10 h-0.5 rounded-full bg-primary" />
          )}
        </SidebarMenuItem>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={onStartRename}>Rename list</ContextMenuItem>
        {groups.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>Move list to</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {groups.map((g) => (
                <ContextMenuItem
                  key={g.id}
                  onSelect={() => moveListToGroup(list.id, g.id)}
                  disabled={list.groupId === g.id}
                >
                  {g.name}
                </ContextMenuItem>
              ))}
              {list.groupId && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem onSelect={() => moveListToGroup(list.id, null)}>
                    Remove from group
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuItem onSelect={() => duplicateList(list.id)}>Duplicate list</ContextMenuItem>
        <ContextMenuSeparator />
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
  onStartListRename: (id: string) => void
  autoFocusRename: boolean
  onGroupRenameComplete: () => void
  onAddList: () => void
  dropIndicator: DropIndicator
  activeDragType: "list" | "group" | null
}

function GroupItem({
  group,
  lists,
  pathname,
  listTaskCount,
  allGroups,
  renamingListId,
  onListRenameComplete,
  onStartListRename,
  autoFocusRename,
  onGroupRenameComplete,
  onAddList,
  dropIndicator,
  activeDragType,
}: GroupItemProps) {
  const renameGroup = useAppStore((s) => s.renameGroup)
  const deleteGroup = useAppStore((s) => s.deleteGroup)
  const ungroupLists = useAppStore((s) => s.ungroupLists)
  const toggleGroupCollapsed = useAppStore((s) => s.toggleGroupCollapsed)

  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(group.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const dndId = mkGroupId(group.id)
  const { attributes, listeners, setNodeRef: setDragRef, isDragging: isGroupDragging } = useDraggable({
    id: dndId,
    data: { type: "group" as const, id: group.id },
    disabled: renaming,
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: dndId })
  const setRef = useCallback(
    (el: HTMLElement | null) => { setDragRef(el); setDropRef(el) },
    [setDragRef, setDropRef],
  )

  const indicator = dropIndicator?.overId === dndId ? dropIndicator : null
  // Highlight header when a list (not a group) is dragged over it
  const showAddHighlight = activeDragType === "list" && isOver && !isGroupDragging

  useEffect(() => {
    if (autoFocusRename) setRenaming(true)
  }, [autoFocusRename])

  useEffect(() => {
    if (renaming) {
      setRenameValue(group.name)
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 150)
    }
  }, [renaming, group.name])

  function commitRename() {
    const t = renameValue.trim()
    if (t && t !== group.name) renameGroup(group.id, t)
    setRenaming(false)
    onGroupRenameComplete()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); commitRename() }
    if (e.key === "Escape") { setRenaming(false); onGroupRenameComplete() }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuItem>
            {indicator?.position === "before" && (
              <div className="pointer-events-none absolute inset-x-2 -top-px z-10 h-0.5 rounded-full bg-primary" />
            )}
            <SidebarMenuButton
              ref={setRef}
              style={{ touchAction: "none" }}
              onClick={() => { if (!renaming) toggleGroupCollapsed(group.id) }}
              className={cn(
                isGroupDragging && "opacity-40",
                showAddHighlight && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
              {...listeners}
              {...attributes}
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
              {group.collapsed ? (
                <CaretRightIcon className="ml-auto shrink-0" />
              ) : (
                <CaretDownIcon className="ml-auto shrink-0" />
              )}
            </SidebarMenuButton>
            {indicator?.position === "after" && (
              <div className="pointer-events-none absolute inset-x-2 -bottom-px z-10 h-0.5 rounded-full bg-primary" />
            )}
          </SidebarMenuItem>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onSelect={() => setRenaming(true)}>Rename group</ContextMenuItem>
          <ContextMenuItem onSelect={onAddList}>
            <PlusIcon /> New list
          </ContextMenuItem>
          <ContextMenuSeparator />
          {lists.length > 0 ? (
            <ContextMenuItem onSelect={() => ungroupLists(group.id)}>Ungroup lists</ContextMenuItem>
          ) : (
            <ContextMenuItem variant="destructive" onSelect={() => deleteGroup(group.id)}>
              <TrashIcon /> Delete group
            </ContextMenuItem>
          )}
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
              onStartRename={() => onStartListRename(list.id)}
              dropIndicator={dropIndicator}
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
