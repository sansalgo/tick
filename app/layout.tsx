import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeVarsProvider } from "@/components/theme/theme-vars-provider"
import { GithubSyncProvider } from "@/components/github/github-sync-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { DisableContextMenu } from "@/components/disable-context-menu"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const geistMono = Geist_Mono({subsets:['latin'],variable:'--font-mono'})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontSans.variable, "font-mono", geistMono.variable)}
    >
      <body>
        <DisableContextMenu />
        <ThemeProvider>
          <ThemeVarsProvider>
            <TooltipProvider delayDuration={500}>
              <GithubSyncProvider>{children}</GithubSyncProvider>
              <Toaster />
            </TooltipProvider>
          </ThemeVarsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
