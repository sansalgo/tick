"use client"

import { toast } from "sonner"

import { GitConflictError, gitFetch, gitPush } from "@/lib/github"
import { selectAppData, useAppStore } from "@/lib/store"
import { useUiStore } from "@/lib/ui-store"

// ─── Error classification ─────────────────────────────────────────────────────

function classifyError(error: unknown): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You're offline. Your changes are saved locally."
  }
  if (error instanceof Error) {
    if (error.message.includes("401")) return "GitHub session expired. Please reconnect."
    if (error.message.includes("404")) return "Repository not found."
    if (error.message.includes("403")) return "Permission denied. Check your GitHub token."
    return error.message
  }
  return "An unexpected error occurred."
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGitSync() {
  const github = useAppStore((state) => state.github)
  const setGitStatus = useAppStore((state) => state.setGitStatus)
  const markPushed = useAppStore((state) => state.markPushed)
  const setHasRemoteChanges = useAppStore((state) => state.setHasRemoteChanges)
  const setRemoteCommitSha = useAppStore((state) => state.setRemoteCommitSha)
  const hydrateFromRemote = useAppStore((state) => state.hydrateFromRemote)

  const pendingCommit = useUiStore((state) => state.pendingCommit)
  const setPendingCommit = useUiStore((state) => state.setPendingCommit)
  const clearPendingCommit = useUiStore((state) => state.clearPendingCommit)
  const conflictInfo = useUiStore((state) => state.conflictInfo)
  const setConflictInfo = useUiStore((state) => state.setConflictInfo)
  const clearConflictInfo = useUiStore((state) => state.clearConflictInfo)
  const setCommittedSnapshot = useUiStore((state) => state.setCommittedSnapshot)

  // ── commit ─────────────────────────────────────────────────────────────────
  // Snapshot the current local state as a pending commit.
  // Pure local operation — no network required.
  function commit() {
    const state = useAppStore.getState()
    const data = selectAppData(state)
    setPendingCommit(data)
    // Advance the dirty-detection baseline so further edits are detected correctly
    setCommittedSnapshot({
      lists: state.lists,
      tasks: state.tasks,
      groups: state.groups,
      settings: state.settings,
    })
    setGitStatus("committed")
  }

  // ── push ───────────────────────────────────────────────────────────────────
  // Upload the pending commit to GitHub as a real git commit.
  async function push() {
    const { gitStatus, remoteCommitSha } = useAppStore.getState().github
    if (gitStatus === "pushing" || gitStatus === "pulling") return

    const data = useUiStore.getState().pendingCommit
    if (!data) return

    setGitStatus("pushing")
    try {
      const message = new Date().toISOString()
      const result = await gitPush(data, message, remoteCommitSha)
      setRemoteCommitSha(result.commitSha)
      clearPendingCommit()
      markPushed(new Date().toISOString())
    } catch (error) {
      if (error instanceof GitConflictError && error.remoteData) {
        setConflictInfo({
          localData: data,
          remoteData: error.remoteData,
          remoteCommitSha: error.remoteCommitSha,
        })
        setGitStatus("conflict")
        return
      }
      const msg = classifyError(error)
      setGitStatus("error", msg)
      toast.error(msg)
    }
  }

  // ── pull ───────────────────────────────────────────────────────────────────
  // Fetch the latest remote state. Merges cleanly if no local changes exist,
  // otherwise enters conflict resolution.
  async function pull() {
    const { gitStatus } = useAppStore.getState().github
    if (gitStatus === "pushing" || gitStatus === "pulling") return

    // Capture whether there are local changes BEFORE changing status to "pulling"
    const localPending = useUiStore.getState().pendingCommit
    const hasLocalChanges = gitStatus === "uncommitted" || gitStatus === "committed" || !!localPending

    setGitStatus("pulling")
    try {
      const remote = await gitFetch()

      if (!remote.exists) {
        if (remote.commitSha) setRemoteCommitSha(remote.commitSha)
        setHasRemoteChanges(false)
        setGitStatus("clean")
        return
      }

      if (!hasLocalChanges) {
        // Clean pull — apply remote data directly
        hydrateFromRemote(remote.data)
        const state = useAppStore.getState()
        setCommittedSnapshot({
          lists: state.lists,
          tasks: state.tasks,
          groups: state.groups,
          settings: state.settings,
        })
        setRemoteCommitSha(remote.commitSha)
        setHasRemoteChanges(false)
        setGitStatus("clean")
        return
      }

      // Local changes exist — compare content
      const localData = localPending ?? selectAppData(useAppStore.getState())
      const localJson = stableJson(localData)
      const remoteJson = stableJson(remote.data)

      if (localJson === remoteJson) {
        // Content is identical — just sync the commit SHA
        setRemoteCommitSha(remote.commitSha)
        setHasRemoteChanges(false)
        // Restore to the status we had before pulling
        setGitStatus(localPending ? "committed" : "uncommitted")
        return
      }

      // Real conflict — let user decide
      setConflictInfo({
        localData,
        remoteData: remote.data,
        remoteCommitSha: remote.commitSha,
      })
      setGitStatus("conflict")
    } catch (error) {
      const msg = classifyError(error)
      setGitStatus("error", msg)
      toast.error(msg)
    }
  }

  // ── acceptIncoming ─────────────────────────────────────────────────────────
  // Discard local changes, adopt the remote state as the new baseline.
  function acceptIncoming() {
    if (!conflictInfo) return
    hydrateFromRemote(conflictInfo.remoteData)
    const state = useAppStore.getState()
    setCommittedSnapshot({
      lists: state.lists,
      tasks: state.tasks,
      groups: state.groups,
      settings: state.settings,
    })
    setRemoteCommitSha(conflictInfo.remoteCommitSha)
    clearPendingCommit()
    clearConflictInfo()
    setHasRemoteChanges(false)
    setGitStatus("clean")
  }

  // ── acceptCurrent ──────────────────────────────────────────────────────────
  // Keep local data and push it on top of the remote HEAD.
  // Uses the remote commit SHA as parent → always a valid fast-forward.
  async function acceptCurrent() {
    if (!conflictInfo) return
    setGitStatus("pushing")
    try {
      const message = new Date().toISOString()
      const result = await gitPush(conflictInfo.localData, message, conflictInfo.remoteCommitSha)
      setRemoteCommitSha(result.commitSha)
      clearPendingCommit()
      clearConflictInfo()
      const state = useAppStore.getState()
      setCommittedSnapshot({
        lists: state.lists,
        tasks: state.tasks,
        groups: state.groups,
        settings: state.settings,
      })
      markPushed(new Date().toISOString())
    } catch (error) {
      const msg = classifyError(error)
      setGitStatus("error", msg)
      toast.error(msg)
    }
  }

  // ── cancelConflict ─────────────────────────────────────────────────────────
  function cancelConflict() {
    clearConflictInfo()
    const hasPending = !!useUiStore.getState().pendingCommit
    setGitStatus(hasPending ? "committed" : "uncommitted")
  }

  // ── retry ──────────────────────────────────────────────────────────────────
  // Re-run the last failed operation based on current state.
  function retry() {
    const hasPending = !!useUiStore.getState().pendingCommit
    if (hasPending) {
      void push()
    } else {
      void pull()
    }
  }

  // ── dismissError ───────────────────────────────────────────────────────────
  // Clear error and return to the most accurate non-error status.
  function dismissError() {
    const hasPending = !!useUiStore.getState().pendingCommit
    const snapshot = useUiStore.getState().committedSnapshot
    const state = useAppStore.getState()

    let status: ReturnType<typeof useAppStore.getState>["github"]["gitStatus"] = "clean"
    if (hasPending) {
      status = "committed"
    } else if (snapshot) {
      const isDirty =
        state.lists !== snapshot.lists ||
        state.tasks !== snapshot.tasks ||
        state.groups !== snapshot.groups ||
        state.settings !== snapshot.settings
      if (isDirty) status = "uncommitted"
    }
    setGitStatus(status)
  }

  return {
    gitStatus: github.gitStatus,
    hasRemoteChanges: github.hasRemoteChanges,
    lastPushedAt: github.lastPushedAt,
    lastError: github.lastError,
    pendingCommit,
    conflictInfo,
    commit,
    push,
    pull,
    acceptIncoming,
    acceptCurrent,
    cancelConflict,
    retry,
    dismissError,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stableJson(data: { lists: unknown; tasks: unknown; groups: unknown; settings: unknown }): string {
  return JSON.stringify({
    lists: data.lists,
    tasks: data.tasks,
    groups: data.groups,
    settings: data.settings,
  })
}
