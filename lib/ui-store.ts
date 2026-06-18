import { create } from "zustand"
import type { AppData, ListGroup, Settings, Task, TaskList } from "@/lib/schemas"

export interface CommittedSnapshot {
  lists: TaskList[]
  tasks: Task[]
  groups: ListGroup[]
  settings: Settings
}

export interface ConflictInfo {
  localData: AppData
  remoteData: AppData
  remoteCommitSha: string
}

interface UiState {
  selectedTaskId: string | null
  setSelectedTaskId: (id: string | null) => void

  pendingCommit: AppData | null
  setPendingCommit: (data: AppData) => void
  clearPendingCommit: () => void

  conflictInfo: ConflictInfo | null
  setConflictInfo: (info: ConflictInfo) => void
  clearConflictInfo: () => void

  committedSnapshot: CommittedSnapshot | null
  setCommittedSnapshot: (snapshot: CommittedSnapshot) => void

  selectionMode: boolean
  selectedTaskIds: string[]
  enterSelectionMode: (id: string) => void
  toggleTaskSelected: (id: string) => void
  selectAllTasks: (ids: string[]) => void
  exitSelectionMode: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  pendingCommit: null,
  setPendingCommit: (data) => set({ pendingCommit: data }),
  clearPendingCommit: () => set({ pendingCommit: null }),

  conflictInfo: null,
  setConflictInfo: (info) => set({ conflictInfo: info }),
  clearConflictInfo: () => set({ conflictInfo: null }),

  committedSnapshot: null,
  setCommittedSnapshot: (snapshot) => set({ committedSnapshot: snapshot }),

  selectionMode: false,
  selectedTaskIds: [],
  enterSelectionMode: (id) => set({ selectionMode: true, selectedTaskIds: [id] }),
  toggleTaskSelected: (id) =>
    set((state) => {
      const selectedTaskIds = state.selectedTaskIds.includes(id)
        ? state.selectedTaskIds.filter((taskId) => taskId !== id)
        : [...state.selectedTaskIds, id]
      return { selectedTaskIds, selectionMode: selectedTaskIds.length > 0 }
    }),
  selectAllTasks: (ids) => set({ selectionMode: true, selectedTaskIds: ids }),
  exitSelectionMode: () => set({ selectionMode: false, selectedTaskIds: [] }),
}))
