import { AppSidebar } from "@/components/app-sidebar"
import { TaskDetailSheet } from "@/components/task-detail-sheet"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="min-h-0 p-4">
        <div data-no-print className="absolute top-2 left-2 z-10 md:hidden">
          <SidebarTrigger />
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </SidebarInset>
      <TaskDetailSheet />
    </SidebarProvider>
  )
}
