import { CalendarBlank, HouseIcon, Star, Sun } from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"

import type { SmartListKey } from "@/lib/schemas"

export interface SmartListDef {
  key: SmartListKey
  path: string
  label: string
  icon: Icon
}

export const SMART_LIST_DEFS: SmartListDef[] = [
  { key: "myDay", path: "/my-day", label: "My Day", icon: Sun },
  { key: "important", path: "/important", label: "Important", icon: Star },
  { key: "planned", path: "/planned", label: "Planned", icon: CalendarBlank },
  { key: "tasks", path: "/tasks", label: "Tasks", icon: HouseIcon },
]
