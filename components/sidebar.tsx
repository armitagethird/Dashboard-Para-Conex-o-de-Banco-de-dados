'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { LogOut, MapPin, Phone } from 'lucide-react'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { DashboardUser } from '@/types/dashboard'

const MOTEL_ADDRESS = 'Rua Celso Magalhães 02, Felipinho, São Luís — MA'
const MOTEL_PHONE = '(98) 98862-1245'

interface SidebarProps {
  user: DashboardUser
}

export function Sidebar({ user }: SidebarProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handler() { setIsOpen((o) => !o) }
    window.addEventListener('toggle-mobile-sidebar', handler)
    return () => window.removeEventListener('toggle-mobile-sidebar', handler)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = getInitials(user.name)
  const avatarColor = getAvatarColor(user.name)

  const content = (
    <>
      {/* Logo */}
      <div className="px-6 py-6 shrink-0">
        <h2
          className="text-xl font-bold tracking-widest uppercase font-mono"
          style={{ color: 'var(--red-400)' }}
        >
          PARAÍSO MOTEL
        </h2>
        <p
          className="text-xs uppercase tracking-widest mt-0.5"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Dashboard
        </p>
      </div>

      <div
        className="mx-6 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      />

      {/* Logo mark */}
      <div className="flex-1 flex items-center justify-center py-6">
        <div
          className="relative w-36 h-36 rounded-full overflow-hidden"
          style={{
            boxShadow: '0 0 0 2px rgba(196,30,32,0.25), 0 8px 32px rgba(0,0,0,0.45)',
          }}
        >
          <Image
            src="/logo.webp"
            alt="Paraíso Motel"
            fill
            sizes="144px"
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Motel info */}
      <div
        className="mx-6 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      />
      <div className="px-5 py-4 shrink-0 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <MapPin
            className="w-3.5 h-3.5 mt-0.5 shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <p
            className="text-xs leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {MOTEL_ADDRESS}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Phone
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <p
            className="text-xs font-mono"
            style={{ color: 'var(--text-secondary)' }}
          >
            {MOTEL_PHONE}
          </p>
        </div>
      </div>

      {/* User */}
      <div
        className="px-4 py-4 shrink-0"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {user.name}
            </p>
            <p
              className="text-xs truncate uppercase tracking-widest"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Dono
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-widest transition-colors duration-150'
          )}
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
            e.currentTarget.style.color = 'var(--danger)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden lg:flex flex-col h-full w-60 shrink-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {content}
      </aside>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className="fixed top-0 left-0 bottom-0 z-50 flex flex-col w-72 lg:hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(.16,1,.3,1)',
          paddingBottom: '96px',
        }}
      >
        {content}
      </aside>
    </>
  )
}
