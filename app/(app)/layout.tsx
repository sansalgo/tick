import { AppSidebar } from "@/components/app-sidebar"
import { TaskDetailSheet } from "@/components/task-detail-sheet"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div data-no-print className="absolute top-2 left-2 z-10 md:hidden">
          <SidebarTrigger />
        </div>
        {children}
      </SidebarInset>
      <TaskDetailSheet />
    </SidebarProvider>
  )
}
