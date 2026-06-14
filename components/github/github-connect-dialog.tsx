"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { checkGithubRepo, createGithubRepo, putGithubSync } from "@/lib/github"
import { githubRepoNameSchema, type GithubRepoName } from "@/lib/schemas"
import { selectAppData, useAppStore } from "@/lib/store"
import { useUiStore } from "@/lib/ui-store"

export function GithubConnectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const setGithubConnection = useAppStore((state) => state.setGithubConnection)
  const markSynced = useAppStore((state) => state.markSynced)
  const setGithubSha = useUiStore((state) => state.setGithubSha)

  const form = useForm<GithubRepoName>({
    resolver: zodResolver(githubRepoNameSchema),
    defaultValues: { name: "tick-data" },
  })

  useEffect(() => {
    if (open) form.reset({ name: "tick-data" })
  }, [open, form])

  async function onSubmit(values: GithubRepoName) {
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

      const appData = selectAppData(useAppStore.getState())
      const result = await putGithubSync(appData)
      setGithubSha(result.sha)
      markSynced(result.updatedAt)

      toast.success(`Connected to ${owner}/${repo}`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect to GitHub")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect a GitHub repository</DialogTitle>
          <DialogDescription>
            Tick will create a new private repository to store your tasks. It becomes the
            primary place your data is saved and synced from.
          </DialogDescription>
        </DialogHeader>
        <form id="github-connect-form" onSubmit={form.handleSubmit(onSubmit)}>
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
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="github-connect-form" disabled={submitting}>
            {submitting ? "Connecting..." : "Create repository"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
