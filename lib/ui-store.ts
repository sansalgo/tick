import { create } from "zustand"

interface UiState {
  selectedTaskId: string | null
  setSelectedTaskId: (id: string | null) => void

  githubSha: string | null
  setGithubSha: (sha: string | null) => void

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

  githubSha: null,
  setGithubSha: (sha) => set({ githubSha: sha }),

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
