import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { BottomNav } from '@/components/bottom-nav'
import { ConnectionStatusProvider } from '@/components/connection-status-provider'
import type { DashboardUser } from '@/types/dashboard'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') {
    redirect('/login?error=unauthorized')
  }

  const dashboardUser: DashboardUser = {
    id: user.id,
    name: profile.name as string,
    role: profile.role as DashboardUser['role'],
    email: user.email ?? '',
  }

  return (
    <ConnectionStatusProvider>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>
        <Sidebar user={dashboardUser} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto pb-24">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </ConnectionStatusProvider>
  )
}
