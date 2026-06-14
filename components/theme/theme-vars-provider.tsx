"use client"

import { useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { BACKGROUND_PRESETS, THEME_ACCENTS } from "@/lib/constants"

export function ThemeVarsProvider({ children }: { children: React.ReactNode }) {
  const themeAccent = useAppStore((state) => state.settings.themeAccent)
  const backgroundPresetId = useAppStore((state) => state.settings.backgroundPresetId)

  useEffect(() => {
    const accent = THEME_ACCENTS.find((a) => a.id === themeAccent)
    document.documentElement.style.setProperty(
      "--accent-custom",
      accent?.value ?? THEME_ACCENTS[0].value
    )
  }, [themeAccent])

  useEffect(() => {
    const preset = BACKGROUND_PRESETS.find((b) => b.id === backgroundPresetId)
    if (preset?.gradient) {
      document.documentElement.style.setProperty("--list-background", preset.gradient)
    } else {
      document.documentElement.style.removeProperty("--list-background")
    }
  }, [backgroundPresetId])

  return <>{children}</>
}
