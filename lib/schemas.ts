import { z } from "zod"

export const idSchema = z.string().min(1)

export const isoDateStringSchema = z.string()

export const repeatUnitSchema = z.enum(["days", "weeks", "months", "years"])

export const repeatRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.enum(["daily", "weekdays", "weekly", "monthly", "yearly"]),
  }),
  z.object({
    type: z.literal("custom"),
    interval: z.number().int().min(1),
    unit: repeatUnitSchema,
  }),
])

export const stepSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  completed: z.boolean(),
})

export const taskSchema = z.object({
  id: idSchema,
  listId: idSchema,
  title: z.string().min(1),
  notes: z.string(),
  completed: z.boolean(),
  important: z.boolean(),
  myDay: isoDateStringSchema.nullable(),
  dueDate: isoDateStringSchema.nullable(),
  reminder: isoDateStringSchema.nullable(),
  repeat: repeatRuleSchema.nullable(),
  steps: z.array(stepSchema),
  createdAt: isoDateStringSchema,
  completedAt: isoDateStringSchema.nullable(),
  order: z.number(),
})

export const sortBySchema = z.enum(["importance", "dueDate", "myDay", "alphabetical", "createdAt"])
export const sortDirectionSchema = z.enum(["asc", "desc"])

export const sortConfigSchema = z.object({
  by: sortBySchema,
  direction: sortDirectionSchema,
})

export const listGroupSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  collapsed: z.boolean(),
  createdAt: isoDateStringSchema,
})

export const taskListSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  emoji: z.string().optional(),
  color: z.string().optional(),
  isSystem: z.boolean(),
  createdAt: isoDateStringSchema,
  sort: sortConfigSchema,
  groupId: idSchema.optional(),
})

export const smartListKeySchema = z.enum(["tasks", "myDay", "important", "planned"])

export const settingsSchema = z.object({
  themeAccent: z.string(),
  backgroundPresetId: z.string(),
  smartListSort: z.record(smartListKeySchema, sortConfigSchema),
})

export const appDataSchema = z.object({
  version: z.literal(1),
  lists: z.array(taskListSchema),
  tasks: z.array(taskSchema),
  settings: settingsSchema,
  groups: z.array(listGroupSchema).default([]),
  updatedAt: isoDateStringSchema,
})

export const githubRepoNameSchema = z.object({
  name: z
    .string()
    .min(1, "Repository name is required")
    .max(100, "Repository name is too long")
    .regex(/^[a-zA-Z0-9._-]+$/, "Use only letters, numbers, dots, hyphens, and underscores"),
})

export type ListGroup = z.infer<typeof listGroupSchema>
export type RepeatUnit = z.infer<typeof repeatUnitSchema>
export type RepeatRule = z.infer<typeof repeatRuleSchema>
export type Step = z.infer<typeof stepSchema>
export type Task = z.infer<typeof taskSchema>
export type SortBy = z.infer<typeof sortBySchema>
export type SortDirection = z.infer<typeof sortDirectionSchema>
export type SortConfig = z.infer<typeof sortConfigSchema>
export type TaskList = z.infer<typeof taskListSchema>
export type SmartListKey = z.infer<typeof smartListKeySchema>
export type Settings = z.infer<typeof settingsSchema>
export type AppData = z.infer<typeof appDataSchema>
export type GithubRepoName = z.infer<typeof githubRepoNameSchema>
