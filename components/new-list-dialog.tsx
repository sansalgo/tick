"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/lib/store"

const newListSchema = z.object({
  name: z.string().min(1, "List name is required").max(100, "Name is too long"),
})

type NewListFormValues = z.infer<typeof newListSchema>

export function NewListDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const addList = useAppStore((state) => state.addList)
  const router = useRouter()

  const form = useForm<NewListFormValues>({
    resolver: zodResolver(newListSchema),
    defaultValues: { name: "" },
  })

  function onSubmit(values: NewListFormValues) {
    const name = values.name.trim()
    const id = addList(name)
    toast.success(`List "${name}" created`)
    form.reset()
    setOpen(false)
    router.push(`/lists/${id}`)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (!value) form.reset()
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New list</DialogTitle>
          <DialogDescription>Give your new list a name.</DialogDescription>
        </DialogHeader>
        <form id="new-list-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="new-list-name">Name</FieldLabel>
              <Input
                id="new-list-name"
                autoFocus
                placeholder="e.g. Groceries"
                aria-invalid={!!form.formState.errors.name}
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="new-list-form">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
