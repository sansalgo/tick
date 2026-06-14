import { CalendarBlank, HouseIcon, Star, Sun } from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"
import type { SmartListKey } from "@/lib/schemas"

export const DEFAULT_LIST_ID = "tasks"

export const GITHUB_DATA_PATH = "tick-data.json"

export const APP_STORAGE_KEY = "tick-app-storage"

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

export interface ThemeAccent {
  id: string
  label: string
  value: string
}

export const THEME_ACCENTS: ThemeAccent[] = [
  { id: "blue", label: "Blue", value: "oklch(0.55 0.18 255)" },
  { id: "purple", label: "Purple", value: "oklch(0.5 0.2 295)" },
  { id: "red", label: "Red", value: "oklch(0.55 0.22 25)" },
  { id: "pink", label: "Pink", value: "oklch(0.6 0.2 0)" },
  { id: "orange", label: "Orange", value: "oklch(0.65 0.18 45)" },
  { id: "yellow", label: "Yellow", value: "oklch(0.8 0.16 95)" },
  { id: "green", label: "Green", value: "oklch(0.6 0.15 145)" },
  { id: "teal", label: "Teal", value: "oklch(0.6 0.1 195)" },
]

export interface BackgroundPreset {
  id: string
  label: string
  gradient: string | null
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: "default", label: "Default", gradient: null },
  {
    id: "sunrise",
    label: "Sunrise",
    gradient: "linear-gradient(135deg, oklch(0.85 0.12 60), oklch(0.7 0.18 25))",
  },
  {
    id: "ocean",
    label: "Ocean",
    gradient: "linear-gradient(135deg, oklch(0.75 0.1 220), oklch(0.45 0.15 255))",
  },
  {
    id: "forest",
    label: "Forest",
    gradient: "linear-gradient(135deg, oklch(0.75 0.15 145), oklch(0.4 0.1 165))",
  },
  {
    id: "dusk",
    label: "Dusk",
    gradient: "linear-gradient(135deg, oklch(0.55 0.18 300), oklch(0.35 0.12 270))",
  },
  {
    id: "blossom",
    label: "Blossom",
    gradient: "linear-gradient(135deg, oklch(0.85 0.1 350), oklch(0.65 0.18 320))",
  },
  {
    id: "slate",
    label: "Slate",
    gradient: "linear-gradient(135deg, oklch(0.7 0.02 250), oklch(0.4 0.02 250))",
  },
]
