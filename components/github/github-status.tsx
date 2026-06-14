"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  CloudCheckIcon,
  CloudSlashIcon,
  CloudWarningIcon,
  GithubLogoIcon,
  SpinnerIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { logoutGithub } from "@/lib/github"
import { useAppStore } from "@/lib/store"

export function GithubStatus() {
  const github = useAppStore((state) => state.github)
  const disconnectGithub = useAppStore((state) => state.disconnectGithub)
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await logoutGithub()
    } catch {
      // Cookies may already be cleared server-side; proceed with local disconnect.
    } finally {
      disconnectGithub()
      setDisconnecting(false)
      toast.success("Disconnected from GitHub")
    }
  }

  if (!github.connected) {
    return (
      <Button variant="outline" size="sm" className="w-full justify-start gap-2" asChild>
        <a href="/api/github/login">
          <GithubLogoIcon />
          Connect GitHub
        </a>
      </Button>
    )
  }

  const statusContent = {
    idle: { icon: <CloudCheckIcon />, label: "Up to date" },
    syncing: { icon: <SpinnerIcon className="animate-spin" />, label: "Syncing..." },
    synced: { icon: <CloudCheckIcon />, label: "Synced" },
    error: {
      icon: <CloudWarningIcon className="text-destructive" />,
      label: github.lastError ?? "Sync error",
    },
  }[github.syncStatus]

  return (
    <div className="flex items-center gap-2 px-1 text-xs">
      <GithubLogoIcon className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        {github.owner}/{github.repo}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="shrink-0">{statusContent.icon}</span>
        </TooltipTrigger>
        <TooltipContent>{statusContent.label}</TooltipContent>
      </Tooltip>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleDisconnect}
        disabled={disconnecting}
        title="Disconnect GitHub"
      >
        <CloudSlashIcon />
      </Button>
    </div>
  )
}
