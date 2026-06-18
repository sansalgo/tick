"use client"

import { formatDistanceToNow } from "date-fns"
import {
  ArrowClockwiseIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  GitCommitIcon,
  GitMergeIcon,
  SpinnerIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { useGitSync } from "@/hooks/use-git-sync"
import { useAppStore } from "@/lib/store"
import type { AppData, Task, TaskList } from "@/lib/schemas"

// ─── Diff utility ─────────────────────────────────────────────────────────────

interface DiffResult {
  tasks: { added: Task[]; removed: Task[]; modified: Task[] }
  lists: { added: TaskList[]; removed: TaskList[]; modified: TaskList[] }
}

function computeDiff(local: AppData, remote: AppData): DiffResult {
  const localTaskMap = new Map(local.tasks.map((t) => [t.id, t]))
  const remoteTaskMap = new Map(remote.tasks.map((t) => [t.id, t]))

  return {
    tasks: {
      added: remote.tasks.filter((t) => !localTaskMap.has(t.id)),
      removed: local.tasks.filter((t) => !remoteTaskMap.has(t.id)),
      modified: remote.tasks.filter((t) => {
        const l = localTaskMap.get(t.id)
        return l && JSON.stringify(l) !== JSON.stringify(t)
      }),
    },
    lists: {
      added: remote.lists.filter((l) => !new Map(local.lists.map((x) => [x.id, x])).has(l.id)),
      removed: local.lists.filter((l) => !new Map(remote.lists.map((x) => [x.id, x])).has(l.id)),
      modified: remote.lists.filter((l) => {
        const x = new Map(local.lists.map((x) => [x.id, x])).get(l.id)
        return x && JSON.stringify(x) !== JSON.stringify(l)
      }),
    },
  }
}

// ─── Diff preview ─────────────────────────────────────────────────────────────

function DiffPreview({ local, remote }: { local: AppData; remote: AppData }) {
  const diff = computeDiff(local, remote)
  const hasTaskChanges =
    diff.tasks.added.length + diff.tasks.removed.length + diff.tasks.modified.length > 0
  const hasListChanges =
    diff.lists.added.length + diff.lists.removed.length + diff.lists.modified.length > 0

  if (!hasTaskChanges && !hasListChanges) return null

  return (
    <div className="rounded-md border bg-muted/40 p-2 text-xs space-y-1.5 max-h-44 overflow-y-auto">
      {hasTaskChanges && (
        <div className="space-y-0.5">
          <p className="font-medium text-muted-foreground flex gap-1.5">
            Tasks
            {diff.tasks.added.length > 0 && (
              <span className="text-green-600 dark:text-green-400">+{diff.tasks.added.length}</span>
            )}
            {diff.tasks.modified.length > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400">~{diff.tasks.modified.length}</span>
            )}
            {diff.tasks.removed.length > 0 && (
              <span className="text-destructive">-{diff.tasks.removed.length}</span>
            )}
          </p>
          {diff.tasks.added.map((t) => (
            <p key={t.id} className="truncate text-green-600 dark:text-green-400 pl-1">
              + {t.title}
            </p>
          ))}
          {diff.tasks.modified.map((t) => (
            <p key={t.id} className="truncate text-yellow-600 dark:text-yellow-400 pl-1">
              ~ {t.title}
            </p>
          ))}
          {diff.tasks.removed.map((t) => (
            <p key={t.id} className="truncate text-destructive pl-1">
              - {t.title}
            </p>
          ))}
        </div>
      )}
      {hasListChanges && (
        <div className="space-y-0.5">
          <p className="font-medium text-muted-foreground flex gap-1.5">
            Lists
            {diff.lists.added.length > 0 && (
              <span className="text-green-600 dark:text-green-400">+{diff.lists.added.length}</span>
            )}
            {diff.lists.modified.length > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400">~{diff.lists.modified.length}</span>
            )}
            {diff.lists.removed.length > 0 && (
              <span className="text-destructive">-{diff.lists.removed.length}</span>
            )}
          </p>
          {diff.lists.added.map((l) => (
            <p key={l.id} className="truncate text-green-600 dark:text-green-400 pl-1">
              + {l.name}
            </p>
          ))}
          {diff.lists.modified.map((l) => (
            <p key={l.id} className="truncate text-yellow-600 dark:text-yellow-400 pl-1">
              ~ {l.name}
            </p>
          ))}
          {diff.lists.removed.map((l) => (
            <p key={l.id} className="truncate text-destructive pl-1">
              - {l.name}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GitSyncActions() {
  const connected = useAppStore((state) => state.github.connected)
  const {
    gitStatus,
    hasRemoteChanges,
    lastPushedAt,
    lastError,
    conflictInfo,
    commit,
    push,
    pull,
    acceptIncoming,
    acceptCurrent,
    cancelConflict,
    retry,
    dismissError,
  } = useGitSync()

  if (!connected) return null

  const isPushing = gitStatus === "pushing"
  const isPulling = gitStatus === "pulling"
  const busy = isPushing || isPulling

  // ── Conflict resolution ──────────────────────────────────────────────────
  if (gitStatus === "conflict" && conflictInfo) {
    return (
      <div className="space-y-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
          <GitMergeIcon className="shrink-0" weight="bold" />
          <span>Merge conflict</span>
        </div>
        <DiffPreview local={conflictInfo.localData} remote={conflictInfo.remoteData} />
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start gap-2 text-xs h-8"
            onClick={acceptIncoming}
          >
            <ArrowDownIcon className="shrink-0" />
            Accept Incoming
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start gap-2 text-xs h-8"
            onClick={acceptCurrent}
          >
            <ArrowUpIcon className="shrink-0" />
            Accept Current
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start gap-2 text-xs h-8 text-muted-foreground"
            onClick={cancelConflict}
          >
            <XIcon className="shrink-0" />
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (gitStatus === "error" && lastError) {
    return (
      <div className="px-1 space-y-1">
        <div className="flex items-start gap-1.5 text-xs text-destructive">
          <WarningIcon className="shrink-0 mt-0.5" weight="bold" />
          <span className="wrap-break-word min-w-0">{lastError}</span>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 text-xs h-7"
            onClick={retry}
          >
            <ArrowClockwiseIcon className="shrink-0" />
            Retry
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 gap-1.5 text-xs h-7 text-muted-foreground"
            onClick={dismissError}
          >
            Dismiss
          </Button>
        </div>
      </div>
    )
  }

  // ── Normal workflow buttons ──────────────────────────────────────────────
  const showCommit = gitStatus === "uncommitted"
  const showPush = gitStatus === "committed" || isPushing
  const showPull = hasRemoteChanges || isPulling

  // ── Up to date indicator ─────────────────────────────────────────────────
  if (!showCommit && !showPush && !showPull && gitStatus === "clean" && lastPushedAt) {
    return (
      <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <CheckCircleIcon className="shrink-0" />
        <span>
          Pushed{" "}
          {formatDistanceToNow(new Date(lastPushedAt), { addSuffix: true })}
        </span>
      </div>
    )
  }

  if (!showCommit && !showPush && !showPull) return null

  return (
    <div className="flex flex-col gap-1 px-1">
      {showCommit && (
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={commit}
        >
          <GitCommitIcon className="shrink-0" />
          Commit
        </Button>
      )}
      {showPush && (
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={push}
          disabled={busy}
        >
          {isPushing ? (
            <SpinnerIcon className="shrink-0 animate-spin" />
          ) : (
            <ArrowUpIcon className="shrink-0" />
          )}
          {isPushing ? "Pushing…" : "Push"}
        </Button>
      )}
      {showPull && (
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={pull}
          disabled={busy}
        >
          {isPulling ? (
            <SpinnerIcon className="shrink-0 animate-spin" />
          ) : (
            <ArrowDownIcon className="shrink-0" />
          )}
          {isPulling ? "Pulling…" : "Pull"}
        </Button>
      )}
    </div>
  )
}
