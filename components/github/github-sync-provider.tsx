"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { GithubConnectDialog } from "@/components/github/github-connect-dialog"
import { getGithubStatus, getGithubSync, putGithubSync } from "@/lib/github"
import { selectAppData, useAppStore } from "@/lib/store"
import { useUiStore } from "@/lib/ui-store"

const SYNC_DEBOUNCE_MS = 2500

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

export function GithubSyncProvider({ children }: { children: React.ReactNode }) {
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)

  const hasHydrated = useAppStore((state) => state.hasHydrated)
  const connected = useAppStore((state) => state.github.connected)
  const disconnectGithub = useAppStore((state) => state.disconnectGithub)
  const hydrateFromRemote = useAppStore((state) => state.hydrateFromRemote)
  const setSyncStatus = useAppStore((state) => state.setSyncStatus)
  const markSynced = useAppStore((state) => state.markSynced)
  const setGithubSha = useUiStore((state) => state.setGithubSha)

  const initializedRef = useRef(false)

  useEffect(() => {
    if (!hasHydrated || initializedRef.current || !connected) return
    initializedRef.current = true

    let cancelled = false
    void (async () => {
      try {
        const status = await getGithubStatus()
        if (!status.connected || !status.owner || !status.repo) {
          if (!cancelled) disconnectGithub()
          return
        }

        const sync = await getGithubSync()
        if (cancelled) return

        if (sync.exists && sync.data) {
          hydrateFromRemote(sync.data)
        }
        if (sync.sha) setGithubSha(sync.sha)
        setSyncStatus("synced")
      } catch (error) {
        if (!cancelled) {
          setSyncStatus("error", error instanceof Error ? error.message : "Failed to sync")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hasHydrated, connected, disconnectGithub, hydrateFromRemote, setGithubSha, setSyncStatus])

  useEffect(() => {
    if (!hasHydrated || !connected) return

    let timeout: ReturnType<typeof setTimeout> | null = null

    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (
        state.lists === prevState.lists &&
        state.tasks === prevState.tasks &&
        state.settings === prevState.settings
      ) {
        return
      }

      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        void (async () => {
          setSyncStatus("syncing")
          try {
            const data = selectAppData(useAppStore.getState())
            const result = await putGithubSync(data, useUiStore.getState().githubSha)
            setGithubSha(result.sha)
            markSynced(result.updatedAt)
          } catch (error) {
            setSyncStatus("error", error instanceof Error ? error.message : "Failed to sync")
            toast.error("Failed to sync with GitHub")
          }
        })()
      }, SYNC_DEBOUNCE_MS)
    })

    return () => {
      if (timeout) clearTimeout(timeout)
      unsubscribe()
    }
  }, [hasHydrated, connected, markSynced, setGithubSha, setSyncStatus])

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
