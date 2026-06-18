"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { GithubConnectDialog } from "@/components/github/github-connect-dialog"
import { getGithubStatus, gitFetch } from "@/lib/github"
import { useAppStore } from "@/lib/store"
import { useUiStore } from "@/lib/ui-store"

// ─── OAuth redirect handler ───────────────────────────────────────────────────

function OAuthRedirectListener({ onConnected }: { onConnected: () => void }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("gh_connected") !== "1") return
    onConnected()
    const params = new URLSearchParams(searchParams)
    params.delete("gh_connected")
    const query = params.toString()
    router.replace(query ? `${window.location.pathname}?${query}` : window.location.pathname)
  }, [searchParams, router, onConnected])

  return null
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GithubSyncProvider({ children }: { children: React.ReactNode }) {
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)

  const hasHydrated = useAppStore((state) => state.hasHydrated)
  const connected = useAppStore((state) => state.github.connected)
  const disconnectGithub = useAppStore((state) => state.disconnectGithub)
  const hydrateFromRemote = useAppStore((state) => state.hydrateFromRemote)
  const setRemoteCommitSha = useAppStore((state) => state.setRemoteCommitSha)
  const setGitStatus = useAppStore((state) => state.setGitStatus)
  const setHasRemoteChanges = useAppStore((state) => state.setHasRemoteChanges)
  const setCommittedSnapshot = useUiStore((state) => state.setCommittedSnapshot)

  const initializedRef = useRef(false)

  // ── Initialization ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasHydrated || initializedRef.current || !connected) return
    initializedRef.current = true

    let cancelled = false
    void (async () => {
      try {
        // Validate token & repo still exist
        const status = await getGithubStatus()
        if (cancelled) return
        if (!status.connected || !status.owner || !status.repo) {
          disconnectGithub()
          return
        }

        // Fetch current remote state
        const remote = await gitFetch()
        if (cancelled) return

        const storedSha = useAppStore.getState().github.remoteCommitSha
        const current = useAppStore.getState()

        if (!storedSha) {
          // ── First ever connection ─────────────────────────────────────────
          // No local baseline yet; hydrate from remote and set clean.
          if (remote.exists) {
            hydrateFromRemote(remote.data)
          }
          if (remote.commitSha) setRemoteCommitSha(remote.commitSha)
          const afterHydrate = useAppStore.getState()
          setCommittedSnapshot({
            lists: afterHydrate.lists,
            tasks: afterHydrate.tasks,
            groups: afterHydrate.groups,
            settings: afterHydrate.settings,
          })
          setGitStatus("clean")
          return
        }

        if (remote.commitSha && remote.commitSha !== storedSha) {
          // ── Remote has advanced since last push/pull ───────────────────────
          // Don't auto-apply. Let the user Pull consciously.
          setHasRemoteChanges(true)
          setCommittedSnapshot({
            lists: current.lists,
            tasks: current.tasks,
            groups: current.groups,
            settings: current.settings,
          })
          setGitStatus("clean")
          return
        }

        // ── SHA matches — check for local uncommitted changes ──────────────
        // This detects changes the user made before a reload without committing.
        if (remote.exists) {
          const localJson = stableJson(current)
          const remoteJson = stableJson(remote.data)
          if (localJson !== remoteJson) {
            // Local state diverges from what's on GitHub → uncommitted changes
            setCommittedSnapshot({
              lists: remote.data.lists,
              tasks: remote.data.tasks,
              groups: remote.data.groups,
              settings: remote.data.settings,
            })
            setGitStatus("uncommitted")
            return
          }
        }

        // Everything is in sync
        setCommittedSnapshot({
          lists: current.lists,
          tasks: current.tasks,
          groups: current.groups,
          settings: current.settings,
        })
        setGitStatus("clean")
      } catch (error) {
        if (!cancelled) {
          setGitStatus("error", error instanceof Error ? error.message : "Failed to connect to GitHub")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hasHydrated, connected, disconnectGithub, hydrateFromRemote, setRemoteCommitSha, setGitStatus, setHasRemoteChanges, setCommittedSnapshot])

  // ── Dirty detection ────────────────────────────────────────────────────────
  // O(1) reference-equality check against the committed snapshot.
  // Fires whenever store data changes, except during active network operations.
  useEffect(() => {
    if (!hasHydrated || !connected) return

    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (
        state.lists === prevState.lists &&
        state.tasks === prevState.tasks &&
        state.groups === prevState.groups &&
        state.settings === prevState.settings
      ) {
        return
      }

      // Skip during active operations or while resolving a conflict
      const { gitStatus } = useAppStore.getState().github
      if (gitStatus === "pushing" || gitStatus === "pulling" || gitStatus === "conflict") return

      const snapshot = useUiStore.getState().committedSnapshot
      if (!snapshot) return

      const isDirty = stableJson(state) !== stableJson(snapshot)
      if (isDirty) {
        useAppStore.getState().setGitStatus("uncommitted")
      } else if (gitStatus === "uncommitted") {
        useAppStore.getState().setGitStatus("clean")
      }
    })

    return () => unsubscribe()
  }, [hasHydrated, connected])

  // ── Unload guard ───────────────────────────────────────────────────────────
  // Warn before closing the tab when there are uncommitted or unpushed changes.
  const gitStatus = useAppStore((state) => state.github.gitStatus)
  useEffect(() => {
    if (gitStatus !== "uncommitted" && gitStatus !== "committed") return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [gitStatus])

  return (
    <>
      <Suspense fallback={null}>
        <OAuthRedirectListener onConnected={() => setConnectDialogOpen(true)} />
      </Suspense>
      <GithubConnectDialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen} />
      {children}
    </>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stableJson(data: { lists: unknown; tasks: unknown; groups: unknown; settings: unknown }): string {
  return JSON.stringify({ lists: data.lists, tasks: data.tasks, groups: data.groups, settings: data.settings })
}
