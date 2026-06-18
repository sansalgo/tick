"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CaretLeft } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  checkGithubRepo,
  createGithubRepo,
  gitFetch,
  gitPush,
  listGithubRepos,
  selectGithubRepo,
  type GithubRepoInfo,
} from "@/lib/github"
import { githubRepoNameSchema, type GithubRepoName } from "@/lib/schemas"
import { selectAppData, useAppStore } from "@/lib/store"
import { useUiStore } from "@/lib/ui-store"

type DialogView = "loading" | "select" | "create"

export function GithubConnectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [view, setView] = useState<DialogView>("loading")
  const [existingRepos, setExistingRepos] = useState<GithubRepoInfo[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [connectingRepo, setConnectingRepo] = useState<string | null>(null)

  const setGithubConnection = useAppStore((state) => state.setGithubConnection)
  const markPushed = useAppStore((state) => state.markPushed)
  const setRemoteCommitSha = useAppStore((state) => state.setRemoteCommitSha)
  const setGitStatus = useAppStore((state) => state.setGitStatus)
  const hydrateFromRemote = useAppStore((state) => state.hydrateFromRemote)
  const setCommittedSnapshot = useUiStore((state) => state.setCommittedSnapshot)

  const form = useForm<GithubRepoName>({
    resolver: zodResolver(githubRepoNameSchema),
    defaultValues: { name: "tick-data" },
  })

  useEffect(() => {
    if (!open) return
    setView("loading")
    setExistingRepos([])
    setConnectingRepo(null)
    setSubmitting(false)
    form.reset({ name: "tick-data" })

    listGithubRepos()
      .then(({ repos }) => {
        if (repos.length > 0) {
          setExistingRepos(repos)
          setView("select")
        } else {
          setView("create")
        }
      })
      .catch(() => setView("create"))
  }, [open, form])

  async function onConnectExisting(repo: GithubRepoInfo) {
    const repoKey = `${repo.owner}/${repo.repo}`
    setConnectingRepo(repoKey)
    try {
      await selectGithubRepo(repo.owner, repo.repo)
      setGithubConnection({ login: repo.owner, owner: repo.owner, repo: repo.repo })

      const remote = await gitFetch()
      if (remote.exists) {
        hydrateFromRemote(remote.data)
      }
      if (remote.commitSha) setRemoteCommitSha(remote.commitSha)

      const state = useAppStore.getState()
      setCommittedSnapshot({
        lists: state.lists,
        tasks: state.tasks,
        groups: state.groups,
        settings: state.settings,
      })
      setGitStatus("clean")

      toast.success(`Connected to ${repoKey}`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect to repository")
      setConnectingRepo(null)
    }
  }

  async function onCreateNew(values: GithubRepoName) {
    setSubmitting(true)
    try {
      const { exists } = await checkGithubRepo(values.name)
      if (exists) {
        form.setError("name", {
          message: "A repository with this name already exists on your account",
        })
        return
      }

      const { owner, repo } = await createGithubRepo(values.name)
      setGithubConnection({ login: owner, owner, repo })

      const state = useAppStore.getState()
      const appData = selectAppData(state)
      const result = await gitPush(appData, new Date().toISOString(), null)

      setRemoteCommitSha(result.commitSha)
      markPushed(new Date().toISOString())
      setCommittedSnapshot({
        lists: state.lists,
        tasks: state.tasks,
        groups: state.groups,
        settings: state.settings,
      })

      toast.success(`Connected to ${owner}/${repo}`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect to GitHub")
    } finally {
      setSubmitting(false)
    }
  }

  const canGoBack = existingRepos.length > 0
  const busy = submitting || connectingRepo !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {view === "loading" && (
          <>
            <DialogHeader>
              <DialogTitle>Connect a repository</DialogTitle>
              <DialogDescription>Checking for existing Tick repositories…</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            </div>
          </>
        )}

        {view === "select" && (
          <>
            <DialogHeader>
              <DialogTitle>Connect a repository</DialogTitle>
              <DialogDescription>
                Select an existing Tick repository to reconnect, or create a new one.
              </DialogDescription>
            </DialogHeader>
            <div className="divide-y rounded-md border">
              {existingRepos.map((r) => {
                const key = `${r.owner}/${r.repo}`
                return (
                  <div key={key} className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm font-medium">{key}</span>
                    <Button
                      size="sm"
                      onClick={() => onConnectExisting(r)}
                      disabled={busy}
                    >
                      {connectingRepo === key ? "Connecting…" : "Connect"}
                    </Button>
                  </div>
                )
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => setView("create")} disabled={busy}>
                Create new repository
              </Button>
            </DialogFooter>
          </>
        )}

        {view === "create" && (
          <>
            <DialogHeader>
              <DialogTitle>
                {canGoBack ? "Create a new repository" : "Connect a GitHub repository"}
              </DialogTitle>
              <DialogDescription>
                Tick will create a new private repository to store your tasks. It becomes the
                primary place your data is saved and synced from.
              </DialogDescription>
            </DialogHeader>
            <form id="github-connect-form" onSubmit={form.handleSubmit(onCreateNew)}>
              <FieldGroup>
                <Field data-invalid={!!form.formState.errors.name}>
                  <FieldLabel htmlFor="github-repo-name">Repository name</FieldLabel>
                  <Input
                    id="github-repo-name"
                    autoFocus
                    aria-invalid={!!form.formState.errors.name}
                    {...form.register("name")}
                  />
                  <FieldDescription>Must be a new repository name on your GitHub account.</FieldDescription>
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>
              </FieldGroup>
            </form>
            <DialogFooter>
              {canGoBack && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setView("select")}
                  disabled={submitting}
                  className="mr-auto gap-1"
                >
                  <CaretLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" form="github-connect-form" disabled={submitting}>
                {submitting ? "Creating…" : "Create repository"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
