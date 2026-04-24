'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, Wrench } from 'lucide-react'
import { flashCard } from '@/lib/animations'
import { useTempoDecorrido } from '@/lib/hooks/use-tempo-decorrido'
import type { SuiteLive, SuiteStatus } from '@/types/dashboard'

interface SuiteCardProps {
  suite: SuiteLive
  onClick?: () => void
}

const STATUS_CONFIG: Record<
  SuiteStatus,
  {
    label: string
    borderColor: string
    dotColor: string
    badgeBg: string
    badgeColor: string
    pulse: boolean
  }
> = {
  free: {
    label: 'LIVRE',
    borderColor: '#22C55E',
    dotColor: '#22C55E',
    badgeBg: 'rgba(34,197,94,0.1)',
    badgeColor: '#22C55E',
    pulse: false,
  },
  occupied: {
    label: 'OCUPADA',
    borderColor: '#C41E20',
    dotColor: '#C41E20',
    badgeBg: 'rgba(196,30,32,0.12)',
    badgeColor: '#D63B3D',
    pulse: true,
  },
  cleaning: {
    label: 'LIMPEZA',
    borderColor: '#F59E0B',
    dotColor: '#F59E0B',
    badgeBg: 'rgba(245,158,11,0.1)',
    badgeColor: '#F59E0B',
    pulse: false,
  },
  maintenance: {
    label: 'MANUTENÇÃO',
    borderColor: '#6366F1',
    dotColor: '#6366F1',
    badgeBg: 'rgba(99,102,241,0.1)',
    badgeColor: '#6366F1',
    pulse: false,
  },
}

function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', (e.clientX - rect.left) + 'px')
  e.currentTarget.style.setProperty('--my', (e.clientY - rect.top) + 'px')
}

export function SuiteCard({ suite, onClick }: SuiteCardProps) {
  const tempo = useTempoDecorrido(
    suite.status === 'occupied' ? suite.opened_at : undefined
  )
  const prevStatusRef = useRef(suite.status)
  const cardRef = useRef<HTMLDivElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!onClick) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  useEffect(() => {
    if (prevStatusRef.current !== suite.status) {
      if (cardRef.current) flashCard(cardRef.current)
      prevStatusRef.current = suite.status
    }
  }, [suite.status])

  const cfg = STATUS_CONFIG[suite.status]
  const isOvertime =
    suite.status === 'occupied' &&
    suite.minutos_ocupada != null &&
    suite.minutos_ocupada > 240

  const paymentLabel = suite.payment_method
    ? suite.payment_method.charAt(0).toUpperCase() + suite.payment_method.slice(1)
    : null

  const precoPernoite = suite.precos?.pernoite

  return (
    <div
      ref={cardRef}
      className={`rounded-xl p-4 flex flex-col gap-2 transition-all duration-200 ${onClick ? 'hover:scale-[1.02] cursor-pointer focus:outline-none focus-visible:ring-2' : 'hover:scale-[1.01]'}`}
      style={{
        backgroundColor: isOvertime ? 'rgba(196,30,32,0.08)' : 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `4px solid ${cfg.borderColor}`,
        position: 'relative',
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Ver detalhes da suíte ${suite.numero}` : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p
            className="font-mono text-lg font-bold leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            Suíte {String(suite.numero).padStart(2, '0')}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {suite.tipo}
          </p>
        </div>
        {suite.status === 'maintenance' && (
          <Wrench className="w-4 h-4 shrink-0" style={{ color: cfg.dotColor }} />
        )}
        {isOvertime && (
          <AlertTriangle
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--warning)' }}
            aria-label="Suíte ocupada há mais de 4 horas"
          />
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            backgroundColor: cfg.dotColor,
            animation: cfg.pulse ? 'realtimePulse 1.5s ease-in-out infinite' : 'none',
          }}
        />
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeColor }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Occupied details */}
      {suite.status === 'occupied' && (
        <div className="space-y-1 pt-1">
          {suite.funcionario_nome && (
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              {suite.funcionario_nome}
            </p>
          )}
          {tempo && (
            <p
              className="font-mono text-sm font-semibold"
              style={{ color: isOvertime ? 'var(--warning)' : 'var(--text-primary)' }}
            >
              {tempo}
            </p>
          )}
          {paymentLabel && (
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {paymentLabel}
            </p>
          )}
        </div>
      )}

      {/* Free details — mostra preços disponíveis */}
      {suite.status === 'free' && suite.precos && (
        <div className="pt-1 space-y-0.5">
          {Object.entries(suite.precos)
            .filter(([, v]) => v != null)
            .map(([k, v]) => (
              <p key={k} className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {k === 'pernoite' ? 'Pernoite' : k}: R$ {(v as number).toFixed(2).replace('.', ',')}
              </p>
            ))}
        </div>
      )}

      {/* Cleaning/maintenance — mostra tempo no status atual */}
      {(suite.status === 'cleaning' || suite.status === 'maintenance') &&
        suite.minutos_no_status_atual > 0 && (
          <p className="text-xs pt-1 font-mono" style={{ color: 'var(--text-tertiary)' }}>
            {Math.floor(suite.minutos_no_status_atual / 60) > 0
              ? `${Math.floor(suite.minutos_no_status_atual / 60)}h ${suite.minutos_no_status_atual % 60}min`
              : `${suite.minutos_no_status_atual}min`}
          </p>
        )}

      {/* Fallback pernoite for occupied (informativo) */}
      {suite.status === 'occupied' && precoPernoite != null && (
        <p className="text-[10px] font-mono" style={{ color: 'var(--text-disabled)' }}>
          Pernoite: R$ {precoPernoite.toFixed(2).replace('.', ',')}
        </p>
      )}
    </div>
  )
}
