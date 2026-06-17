import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { isToday } from "date-fns"
import { generateId } from "@/lib/id"
import { APP_STORAGE_KEY, DEFAULT_LIST_ID } from "@/lib/constants"
import type { AppData, ListGroup, RepeatRule, Settings, SmartListKey, SortConfig, Task, TaskList } from "@/lib/schemas"

export type SyncStatus = "idle" | "syncing" | "synced" | "error"

export interface GithubState {
  connected: boolean
  login: string | null
  owner: string | null
  repo: string | null
  syncStatus: SyncStatus
  lastSyncedAt: string | null
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
  settings: Settings
  github: GithubState
  hasHydrated: boolean

  setHasHydrated: (value: boolean) => void

  addList: (name: string, opts?: { emoji?: string; color?: string; groupId?: string }) => string
  renameList: (id: string, name: string) => void
  deleteList: (id: string) => void
  updateListSort: (id: string, sort: SortConfig) => void
  moveListToGroup: (listId: string, groupId: string | null) => void

  addGroup: (name: string) => string
  renameGroup: (id: string, name: string) => void
  deleteGroup: (id: string) => void
  toggleGroupCollapsed: (id: string) => void

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
  setSyncStatus: (status: SyncStatus, error?: string | null) => void
  markSynced: (timestamp: string) => void
}

type PersistedAppState = Pick<AppState, "lists" | "tasks" | "groups" | "settings"> & {
  github: Pick<GithubState, "connected" | "login" | "owner" | "repo">
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
  syncStatus: "idle",
  lastSyncedAt: null,
  lastError: null,
})

export const useAppStore = create<AppState>()(
  persist<AppState, [], [], PersistedAppState>(
    (set) => ({
      lists: createDefaultLists(),
      tasks: [],
      groups: [],
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
        set((state) => ({ lists: [...state.lists, newList] }))
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
        })),
      updateListSort: (id, sort) =>
        set((state) => ({
          lists: state.lists.map((l) => (l.id === id ? { ...l, sort } : l)),
        })),
      moveListToGroup: (listId, groupId) =>
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === listId ? { ...l, groupId: groupId ?? undefined } : l
          ),
        })),

      addGroup: (name) => {
        const id = generateId()
        const newGroup: ListGroup = {
          id,
          name,
          collapsed: false,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ groups: [...state.groups, newGroup] }))
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
        })),
      toggleGroupCollapsed: (id) =>
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)),
        })),

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
        set(() => ({
          lists: data.lists,
          tasks: data.tasks,
          groups: data.groups ?? [],
          settings: data.settings,
        })),
      setSyncStatus: (status, error) =>
        set((state) => ({
          github: { ...state.github, syncStatus: status, lastError: error ?? null },
        })),
      markSynced: (timestamp) =>
        set((state) => ({
          github: { ...state.github, syncStatus: "synced", lastSyncedAt: timestamp, lastError: null },
        })),
    }),
    {
      name: APP_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lists: state.lists,
        tasks: state.tasks,
        groups: state.groups,
        settings: state.settings,
        github: {
          connected: state.github.connected,
          login: state.github.login,
          owner: state.github.owner,
          repo: state.github.repo,
        },
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedAppState | undefined
        if (!persisted) return currentState
        return {
          ...currentState,
          lists: persisted.lists ?? currentState.lists,
          tasks: persisted.tasks ?? currentState.tasks,
          groups: persisted.groups ?? currentState.groups,
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
  settings: state.settings,
  updatedAt: new Date().toISOString(),
})
