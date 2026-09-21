import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { UserMenu } from '@/features/auth'
import { Outlet, createFileRoute } from '@tanstack/react-router'

const AppLayout = () => (
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <AppHeader actions={<UserMenu />} />
      {/* SidebarInset is already the <main> landmark, so this is only the page's padding box. */}
      <div className='flex flex-1 flex-col gap-6 p-6'>
        <Outlet />
      </div>
    </SidebarInset>
  </SidebarProvider>
)

export const Route = createFileRoute('/_app')({
  component: AppLayout
})
