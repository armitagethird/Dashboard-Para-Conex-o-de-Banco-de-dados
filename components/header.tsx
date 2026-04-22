'use client'

import { useState, useEffect } from 'react'
import { Menu, Bell } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { RealtimeDot } from './realtime-dot'

interface HeaderProps {
  pageTitle: string
  alertCount?: number
  realtimeStatus?: 'connected' | 'disconnected' | 'connecting'
  onMenuToggle?: () => void
}

export function Header({
  pageTitle,
  alertCount = 0,
  realtimeStatus = 'connecting',
  onMenuToggle,
}: HeaderProps) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    function tick() {
      setClock(format(new Date(), "dd MMM HH:mm:ss", { locale: ptBR }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      className="flex items-center justify-between px-4 lg:px-6 h-15 shrink-0"
      style={{
        height: '60px',
        backgroundColor: 'var(--bg-base)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onClick={() => {
            onMenuToggle?.()
            window.dispatchEvent(new Event('toggle-mobile-sidebar'))
          }}
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1
          className="text-base font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {pageTitle}
        </h1>
      </div>

      {/* Center */}
      <div className="hidden sm:flex">
        <RealtimeDot status={realtimeStatus} />
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {alertCount > 0 && (
          <div className="relative">
            <Bell className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <span
              className="absolute -top-1.5 -right-1.5 min-w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center px-1 text-white"
              style={{ backgroundColor: 'var(--red-400)' }}
            >
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          </div>
        )}
        <span
          className="font-mono text-xs hidden md:block"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {clock}
        </span>
      </div>
    </header>
  )
}
