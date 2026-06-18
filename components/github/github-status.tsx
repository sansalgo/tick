"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CloudSlashIcon, GithubLogoIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
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

  return (
    <div className="flex items-center gap-2 px-1 text-xs">
      <GithubLogoIcon className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        {github.owner}/{github.repo}
      </span>
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
