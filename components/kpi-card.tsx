'use client'

import { useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { RealtimeDot } from './realtime-dot'
import { animateCounter } from '@/lib/animations'
import { formatBRL } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string
  numericValue?: number
  formatType?: 'currency' | 'integer'
  sublabel?: string
  trend?: { value: string; positive: boolean }
  variant?: 'default' | 'warning' | 'danger'
  live?: boolean
  icon?: LucideIcon
  highlight?: boolean
}

const VARIANT_COLOR: Record<NonNullable<KpiCardProps['variant']>, string> = {
  default: 'var(--text-primary)',
  warning: 'var(--warning)',
  danger:  'var(--danger)',
}

const FORMAT_FNS = {
  currency: formatBRL,
  integer:  (v: number) => String(Math.round(v)),
}

export function KpiCard({
  label, value, numericValue, formatType = 'currency', sublabel, trend,
  variant = 'default', live, icon: Icon, highlight,
}: KpiCardProps) {
  const valueColor = highlight ? 'var(--danger)' : VARIANT_COLOR[variant]
  const valueRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!valueRef.current || typeof numericValue !== 'number') return
    const el = valueRef.current
    const fmt = FORMAT_FNS[formatType]
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        animateCounter(el, numericValue, fmt)
        observer.disconnect()
      }
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [numericValue, formatType])

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 transition-all duration-200"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: highlight ? '1px solid rgba(196,30,32,0.4)' : '1px solid var(--border-subtle)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.borderColor = highlight ? 'rgba(196,30,32,0.7)' : 'var(--border-default)'
        el.style.backgroundColor = 'var(--bg-elevated)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.borderColor = highlight ? 'rgba(196,30,32,0.4)' : 'var(--border-subtle)'
        el.style.backgroundColor = 'var(--bg-surface)'
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" style={{ color: highlight ? 'var(--danger)' : 'var(--text-tertiary)' }} />}
          {live && <RealtimeDot status="connected" />}
        </div>
      </div>

      <div>
        <p
          className="font-mono text-3xl font-semibold tracking-tight"
          style={{ color: valueColor }}
        >
          <span ref={valueRef}>{value}</span>
        </p>
        {trend && (
          <p
            className="text-xs mt-1 font-medium"
            style={{ color: trend.positive ? 'var(--success)' : 'var(--danger)' }}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </p>
        )}
        {sublabel && (
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {sublabel}
          </p>
        )}
      </div>
    </div>
  )
}
