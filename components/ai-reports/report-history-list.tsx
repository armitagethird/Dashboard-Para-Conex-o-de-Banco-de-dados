'use client'

import { useEffect, useState } from 'react'
import { Bot, Hand, ChevronDown, AlertTriangle, CheckCircle } from 'lucide-react'
import { getReportHistory } from '@/lib/queries/ai-reports-client'
import { formatDate } from '@/lib/utils'
import type { AiReport, ReportTipo } from '@/types/ai-reports'

type Filter = 'todos' | 'auto' | 'manual'

interface ReportHistoryListProps {
  tipo: ReportTipo
  currentId: string
  onSelect: (report: AiReport) => void
}

const FILTER_LABELS: Record<Filter, string> = {
  todos: 'Todos',
  auto: 'Automáticos',
  manual: 'Manuais',
}

export function ReportHistoryList({ tipo, currentId, onSelect }: ReportHistoryListProps) {
  const [history, setHistory] = useState<AiReport[] | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState<Filter>('todos')

  useEffect(() => {
    let cancelled = false
    getReportHistory(tipo, 30).then((data) => {
      if (cancelled) return
      setHistory(data)
    })
    return () => {
      cancelled = true
    }
  }, [tipo])

  if (history === null) return null
  if (history.length <= 1) return null

  const filtered = history.filter((r) => {
    if (filter === 'auto') return !r.gerado_manualmente
    if (filter === 'manual') return r.gerado_manualmente
    return true
  })

  return (
    <div
      className="border-b shrink-0"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-6 py-3 flex items-center justify-between transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <span className="text-[10px] uppercase tracking-widest font-medium">
          Histórico ({history.length})
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {expanded && (
        <div className="px-6 pb-4 space-y-3">
          {/* Filter pills */}
          <div className="flex items-center gap-2">
            {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => {
              const active = filter === f
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full transition-colors"
                  style={{
                    color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    background: active ? 'var(--bg-elevated)' : 'transparent',
                    border: `1px solid ${active ? 'var(--border-default)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {FILTER_LABELS[f]}
                </button>
              )
            })}
          </div>

          {/* List */}
          <div className="max-h-[260px] overflow-y-auto space-y-1">
            {filtered.length === 0 && (
              <p className="text-xs py-3 text-center" style={{ color: 'var(--text-tertiary)' }}>
                Nenhum relatório {filter === 'auto' ? 'automático' : 'manual'} encontrado.
              </p>
            )}
            {filtered.map((r) => (
              <HistoryItem
                key={r.id}
                report={r}
                current={r.id === currentId}
                onSelect={() => onSelect(r)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function HistoryItem({
  report,
  current,
  onSelect,
}: {
  report: AiReport
  current: boolean
  onSelect: () => void
}) {
  const isManual = report.gerado_manualmente
  const Icon = isManual ? Hand : Bot
  const badgeColor = isManual ? '#F59E0B' : '#3B82F6'
  const badgeBg = isManual ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)'
  const badgeLabel = isManual ? 'Manual' : 'Automático'

  return (
    <button
      onClick={onSelect}
      disabled={current}
      className="w-full text-left rounded-lg p-3 transition-colors flex items-start gap-3 disabled:cursor-default"
      style={{
        background: current ? 'var(--bg-elevated)' : 'transparent',
        border: `1px solid ${current ? 'var(--border-default)' : 'var(--border-subtle)'}`,
      }}
      onMouseEnter={(e) => {
        if (current) return
        e.currentTarget.style.background = 'var(--bg-elevated)'
      }}
      onMouseLeave={(e) => {
        if (current) return
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
            style={{ color: badgeColor, background: badgeBg }}
          >
            <Icon className="w-2.5 h-2.5" />
            {badgeLabel}
          </span>
          {report.anomalies_found ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
              style={{ color: '#EF4444', background: 'rgba(239,68,68,0.12)' }}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              {report.anomalias_count}
            </span>
          ) : (
            <span style={{ color: '#22C55E' }}>
              <CheckCircle className="w-3 h-3" />
            </span>
          )}
          {current && (
            <span
              className="text-[9px] uppercase tracking-widest font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              em exibição
            </span>
          )}
        </div>
        <p
          className="font-mono text-[11px] leading-tight"
          style={{ color: 'var(--text-secondary)' }}
        >
          Gerado em {formatDate(report.created_at, "dd/MM/yyyy 'às' HH:mm")}
        </p>
        <p
          className="font-mono text-[10px] leading-tight"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Período: {formatDate(report.period_start, 'dd/MM')}
          {report.period_start !== report.period_end
            ? ` – ${formatDate(report.period_end, 'dd/MM')}`
            : ''}
        </p>
      </div>
    </button>
  )
}
