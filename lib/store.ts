import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { isToday } from "date-fns"
import { generateId } from "@/lib/id"
import { APP_STORAGE_KEY, DEFAULT_LIST_ID } from "@/lib/constants"
import type { AppData, ListGroup, RepeatRule, Settings, SmartListKey, SortConfig, Task, TaskList } from "@/lib/schemas"

export type GitSyncStatus =
  | "clean"
  | "uncommitted"
  | "committed"
  | "pushing"
  | "pulling"
  | "conflict"
  | "error"

export interface GithubState {
  connected: boolean
  login: string | null
  owner: string | null
  repo: string | null
  remoteCommitSha: string | null  // persisted; last known remote HEAD commit SHA
  gitStatus: GitSyncStatus
  hasRemoteChanges: boolean
  lastPushedAt: string | null
  lastError: string | null
}

export interface NewTaskInput {
  listId: string
  title: string
  myDay?: string | null
  dueDate?: string | null
  reminder?: string | null
  repeat?: RepeatRule | null
}

interface AppState {
  lists: TaskList[]
  tasks: Task[]
  groups: ListGroup[]
  sidebarOrder: string[]
  settings: Settings
  github: GithubState
  hasHydrated: boolean

  setHasHydrated: (value: boolean) => void

  addList: (name: string, opts?: { emoji?: string; color?: string; groupId?: string }) => string
  renameList: (id: string, name: string) => void
  deleteList: (id: string) => void
  duplicateList: (id: string) => string
  updateListSort: (id: string, sort: SortConfig) => void
  moveListToGroup: (listId: string, groupId: string | null) => void
  reorderLists: (ids: string[]) => void

  addGroup: (name: string) => string
  renameGroup: (id: string, name: string) => void
  deleteGroup: (id: string) => void
  ungroupLists: (groupId: string) => void
  toggleGroupCollapsed: (id: string) => void
  reorderSidebar: (order: string[]) => void

  addTask: (input: NewTaskInput) => string
  updateTask: (id: string, patch: Partial<Task>) => void
  toggleTaskCompleted: (id: string) => void
  toggleTaskImportant: (id: string) => void
  toggleTaskMyDay: (id: string) => void
  setTaskDueDate: (id: string, date: string | null) => void
  setTaskReminder: (id: string, date: string | null) => void
  setTaskRepeat: (id: string, repeat: RepeatRule | null) => void
  deleteTask: (id: string) => void
  moveTaskToList: (id: string, listId: string) => void

  setTasksImportant: (ids: string[], important: boolean) => void
  setTasksCompleted: (ids: string[], completed: boolean) => void
  moveTasksToList: (ids: string[], listId: string) => void
  deleteTasks: (ids: string[]) => void

  addStep: (taskId: string, title: string) => void
  toggleStep: (taskId: string, stepId: string) => void
  deleteStep: (taskId: string, stepId: string) => void

  setThemeAccent: (id: string) => void
  setBackgroundPreset: (id: string) => void
  setSmartListSort: (key: SmartListKey, sort: SortConfig) => void

  setGithubConnection: (info: { login: string; owner: string; repo: string }) => void
  disconnectGithub: () => void
  hydrateFromRemote: (data: AppData) => void
  setRemoteCommitSha: (sha: string | null) => void
  setGitStatus: (status: GitSyncStatus, error?: string | null) => void
  markPushed: (timestamp: string) => void
  setHasRemoteChanges: (value: boolean) => void
}

type PersistedAppState = Pick<AppState, "lists" | "tasks" | "groups" | "sidebarOrder" | "settings"> & {
  github: Pick<GithubState, "connected" | "login" | "owner" | "repo" | "remoteCommitSha">
}

function deriveSidebarOrder(lists: TaskList[], groups: ListGroup[]): string[] {
  return [
    ...lists.filter((l) => !l.isSystem && !l.groupId).map((l) => `l:${l.id}`),
    ...groups.map((g) => `g:${g.id}`),
  ]
}

const createDefaultSettings = (): Settings => ({
  themeAccent: "blue",
  backgroundPresetId: "default",
  smartListSort: {
    tasks: { by: "createdAt", direction: "asc" },
    myDay: { by: "createdAt", direction: "asc" },
    important: { by: "createdAt", direction: "asc" },
    planned: { by: "dueDate", direction: "asc" },
  },
})

const createDefaultLists = (): TaskList[] => [
  {
    id: DEFAULT_LIST_ID,
    name: "Tasks",
    isSystem: true,
    createdAt: new Date().toISOString(),
    sort: { by: "createdAt", direction: "asc" },
  },
]

const createDefaultGithub = (): GithubState => ({
  connected: false,
  login: null,
  owner: null,
  repo: null,
  remoteCommitSha: null,
  gitStatus: "clean",
  hasRemoteChanges: false,
  lastPushedAt: null,
  lastError: null,
})

export const useAppStore = create<AppState>()(
  persist<AppState, [], [], PersistedAppState>(
    (set) => ({
      lists: createDefaultLists(),
      tasks: [],
      groups: [],
      sidebarOrder: [],
      settings: createDefaultSettings(),
      github: createDefaultGithub(),
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      addList: (name, opts) => {
        const id = generateId()
        const newList: TaskList = {
          id,
          name,
          emoji: opts?.emoji,
          color: opts?.color,
          isSystem: false,
          createdAt: new Date().toISOString(),
          sort: { by: "createdAt", direction: "asc" },
          groupId: opts?.groupId,
        }
        set((state) => ({
          lists: [...state.lists, newList],
          sidebarOrder: opts?.groupId ? state.sidebarOrder : [...state.sidebarOrder, `l:${id}`],
        }))
        return id
      },
      renameList: (id, name) =>
        set((state) => ({
          lists: state.lists.map((l) => (l.id === id ? { ...l, name } : l)),
        })),
      deleteList: (id) =>
        set((state) => ({
          lists: state.lists.filter((l) => l.id !== id),
          tasks: state.tasks.filter((t) => t.listId !== id),
          sidebarOrder: state.sidebarOrder.filter((x) => x !== `l:${id}`),
        })),
      duplicateList: (id) => {
        const newId = generateId()
        set((state) => {
          const src = state.lists.find((l) => l.id === id)
          if (!src) return {}
          const copy: TaskList = {
            ...src,
            id: newId,
            name: `${src.name} (copy)`,
            createdAt: new Date().toISOString(),
          }
          return {
            lists: [...state.lists, copy],
            sidebarOrder: src.groupId ? state.sidebarOrder : [...state.sidebarOrder, `l:${newId}`],
          }
        })
        return newId
      },
      updateListSort: (id, sort) =>
        set((state) => ({
          lists: state.lists.map((l) => (l.id === id ? { ...l, sort } : l)),
        })),
      moveListToGroup: (listId, groupId) =>
        set((state) => {
          let sidebarOrder = state.sidebarOrder
          if (groupId === null) {
            if (!sidebarOrder.includes(`l:${listId}`)) {
              sidebarOrder = [...sidebarOrder, `l:${listId}`]
            }
          } else {
            sidebarOrder = sidebarOrder.filter((x) => x !== `l:${listId}`)
          }
          return {
            lists: state.lists.map((l) =>
              l.id === listId ? { ...l, groupId: groupId ?? undefined } : l
            ),
            sidebarOrder,
          }
        }),
      reorderLists: (ids) =>
        set((state) => {
          const idSet = new Set(ids)
          const system = state.lists.filter((l) => l.isSystem)
          const ordered = ids.flatMap((id) => {
            const l = state.lists.find((x) => x.id === id)
            return l ? [l] : []
          })
          const rest = state.lists.filter((l) => !l.isSystem && !idSet.has(l.id))
          return { lists: [...system, ...ordered, ...rest] }
        }),

      addGroup: (name) => {
        const id = generateId()
        const newGroup: ListGroup = {
          id,
          name,
          collapsed: false,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          groups: [...state.groups, newGroup],
          sidebarOrder: [...state.sidebarOrder, `g:${id}`],
        }))
        return id
      },
      renameGroup: (id, name) =>
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, name } : g)),
        })),
      deleteGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
          lists: state.lists.map((l) => (l.groupId === id ? { ...l, groupId: undefined } : l)),
          sidebarOrder: state.sidebarOrder.filter((x) => x !== `g:${id}`),
        })),
      ungroupLists: (groupId) =>
        set((state) => {
          const ungroupedIds = state.lists
            .filter((l) => l.groupId === groupId)
            .map((l) => `l:${l.id}`)
          const groupIdx = state.sidebarOrder.indexOf(`g:${groupId}`)
          const newOrder = state.sidebarOrder.filter((x) => x !== `g:${groupId}`)
          if (groupIdx >= 0) newOrder.splice(groupIdx, 0, ...ungroupedIds)
          else newOrder.push(...ungroupedIds)
          return {
            groups: state.groups.filter((g) => g.id !== groupId),
            lists: state.lists.map((l) => (l.groupId === groupId ? { ...l, groupId: undefined } : l)),
            sidebarOrder: newOrder,
          }
        }),
      toggleGroupCollapsed: (id) =>
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)),
        })),
      reorderSidebar: (order) => set({ sidebarOrder: order }),

      addTask: (input) => {
        const id = generateId()
        const newTask: Task = {
          id,
          listId: input.listId,
          title: input.title,
          notes: "",
          completed: false,
          important: false,
          myDay: input.myDay ?? null,
          dueDate: input.dueDate ?? null,
          reminder: input.reminder ?? null,
          repeat: input.repeat ?? null,
          steps: [],
          createdAt: new Date().toISOString(),
          completedAt: null,
          order: Date.now(),
        }
        set((state) => ({ tasks: [...state.tasks, newTask] }))
        return id
      },
      updateTask: (id, patch) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      toggleTaskCompleted: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed: !t.completed,
                  completedAt: !t.completed ? new Date().toISOString() : null,
                }
              : t
          ),
        })),
      toggleTaskImportant: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, important: !t.important } : t)),
        })),
      toggleTaskMyDay: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  myDay: t.myDay && isToday(new Date(t.myDay)) ? null : new Date().toISOString(),
                }
              : t
          ),
        })),
      setTaskDueDate: (id, date) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, dueDate: date } : t)),
        })),
      setTaskReminder: (id, date) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, reminder: date } : t)),
        })),
      setTaskRepeat: (id, repeat) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, repeat } : t)),
        })),
      deleteTask: (id) =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
      moveTaskToList: (id, listId) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, listId } : t)),
        })),

      setTasksImportant: (ids, important) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (ids.includes(t.id) ? { ...t, important } : t)),
        })),
      setTasksCompleted: (ids, completed) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            ids.includes(t.id)
              ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null }
              : t
          ),
        })),
      moveTasksToList: (ids, listId) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (ids.includes(t.id) ? { ...t, listId } : t)),
        })),
      deleteTasks: (ids) =>
        set((state) => ({ tasks: state.tasks.filter((t) => !ids.includes(t.id)) })),

      addStep: (taskId, title) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, steps: [...t.steps, { id: generateId(), title, completed: false }] }
              : t
          ),
        })),
      toggleStep: (taskId, stepId) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  steps: t.steps.map((s) => (s.id === stepId ? { ...s, completed: !s.completed } : s)),
                }
              : t
          ),
        })),
      deleteStep: (taskId, stepId) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, steps: t.steps.filter((s) => s.id !== stepId) } : t
          ),
        })),

      setThemeAccent: (id) =>
        set((state) => ({ settings: { ...state.settings, themeAccent: id } })),
      setBackgroundPreset: (id) =>
        set((state) => ({ settings: { ...state.settings, backgroundPresetId: id } })),
      setSmartListSort: (key, sort) =>
        set((state) => ({
          settings: {
            ...state.settings,
            smartListSort: { ...state.settings.smartListSort, [key]: sort },
          },
        })),

      setGithubConnection: (info) =>
        set((state) => ({
          github: { ...state.github, connected: true, ...info },
        })),
      disconnectGithub: () => set(() => ({ github: createDefaultGithub() })),
      hydrateFromRemote: (data) =>
        set(() => {
          const groups = data.groups ?? []
          return {
            lists: data.lists,
            tasks: data.tasks,
            groups,
            sidebarOrder: data.sidebarOrder ?? deriveSidebarOrder(data.lists, groups),
            settings: data.settings,
          }
        }),
      setRemoteCommitSha: (sha) =>
        set((state) => ({
          github: { ...state.github, remoteCommitSha: sha },
        })),
      setGitStatus: (status, error) =>
        set((state) => ({
          github: { ...state.github, gitStatus: status, lastError: error ?? null },
        })),
      markPushed: (timestamp) =>
        set((state) => ({
          github: {
            ...state.github,
            gitStatus: "clean",
            hasRemoteChanges: false,
            lastPushedAt: timestamp,
            lastError: null,
          },
        })),
      setHasRemoteChanges: (value) =>
        set((state) => ({
          github: { ...state.github, hasRemoteChanges: value },
        })),
    }),
    {
      name: APP_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lists: state.lists,
        tasks: state.tasks,
        groups: state.groups,
        sidebarOrder: state.sidebarOrder,
        settings: state.settings,
        github: {
          connected: state.github.connected,
          login: state.github.login,
          owner: state.github.owner,
          repo: state.github.repo,
          remoteCommitSha: state.github.remoteCommitSha,
        },
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedAppState | undefined
        if (!persisted) return currentState
        const lists = persisted.lists ?? currentState.lists
        const groups = persisted.groups ?? currentState.groups
        return {
          ...currentState,
          lists,
          tasks: persisted.tasks ?? currentState.tasks,
          groups,
          sidebarOrder: persisted.sidebarOrder ?? deriveSidebarOrder(lists, groups),
          settings: persisted.settings
            ? {
                ...currentState.settings,
                ...persisted.settings,
                smartListSort: {
                  ...currentState.settings.smartListSort,
                  ...persisted.settings.smartListSort,
                },
              }
            : currentState.settings,
          github: { ...currentState.github, ...persisted.github },
        }
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

export const selectAllTasks = (tasks: Task[]): Task[] => tasks

export const selectTasksForList = (tasks: Task[], listId: string): Task[] =>
  tasks.filter((t) => t.listId === listId)

export const selectMyDayTasks = (tasks: Task[]): Task[] =>
  tasks.filter((t) => t.myDay !== null && isToday(new Date(t.myDay)))

export const selectImportantTasks = (tasks: Task[]): Task[] =>
  tasks.filter((t) => t.important)

export const selectPlannedTasks = (tasks: Task[]): Task[] =>
  tasks.filter((t) => t.dueDate !== null)

export const selectDefaultList = (state: AppState): TaskList | undefined =>
  state.lists.find((l) => l.id === DEFAULT_LIST_ID)

export const selectAppData = (state: AppState): AppData => ({
  version: 1,
  lists: state.lists,
  tasks: state.tasks,
  groups: state.groups,
  sidebarOrder: state.sidebarOrder,
  settings: state.settings,
  updatedAt: new Date().toISOString(),
})
