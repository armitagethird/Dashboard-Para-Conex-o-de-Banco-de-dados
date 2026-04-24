'use client'

import { AlertTriangle, Bot, CheckCircle, ChevronRight, Clock, Hand, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelative } from '@/lib/utils'
import { formatNextAutoRun } from '@/lib/ai-reports-schedule'
import type { AiReport, ReportTipo } from '@/types/ai-reports'

const TIPO_STYLE: Record<ReportTipo, { cor: string; bg: string; bordaAtiva: string }> = {
  diario: { cor: '#3B82F6', bg: 'rgba(59,130,246,0.08)', bordaAtiva: 'rgba(59,130,246,0.4)' },
  semanal: { cor: '#F59E0B', bg: 'rgba(245,158,11,0.08)', bordaAtiva: 'rgba(245,158,11,0.4)' },
  mensal: { cor: '#22C55E', bg: 'rgba(34,197,94,0.08)', bordaAtiva: 'rgba(34,197,94,0.4)' },
}

interface ReportCardProps {
  report: AiReport | null
  tipo: ReportTipo
  label: string
  descricao: string
  onClick: () => void
}

export function ReportCard({ report, tipo, label, descricao, onClick }: ReportCardProps) {
  const style = TIPO_STYLE[tipo]
  const hasAnomaly = report?.anomalies_found ?? false

  const proximaAuto = formatNextAutoRun(tipo)

  if (!report) {
    return (
      <div
        className="rounded-xl p-5 border flex flex-col gap-3 min-h-[160px] justify-between"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] uppercase tracking-widest font-medium px-2 py-1 rounded-full"
            style={{ color: style.cor, background: style.bg }}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
          <Clock className="w-4 h-4 shrink-0" />
          <p className="text-xs leading-relaxed">
            {descricao}. Gerado automaticamente.
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 text-[10px] font-mono"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <CalendarClock className="w-3 h-3 shrink-0" />
          Próxima atualização: {proximaAuto}
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl p-5 border transition-all duration-200 group',
        'flex flex-col gap-3 min-h-[160px] justify-between',
        hasAnomaly && 'ring-1 ring-red-500/30'
      )}
      style={{
        background: hasAnomaly ? 'rgba(196,30,32,0.06)' : 'var(--bg-surface)',
        borderColor: hasAnomaly ? 'rgba(196,30,32,0.35)' : 'var(--border-subtle)',
      }}
      onMouseEnter={(e) => {
        if (!hasAnomaly) {
          e.currentTarget.style.borderColor = style.bordaAtiva
          e.currentTarget.style.background = 'var(--bg-elevated)'
        }
      }}
      onMouseLeave={(e) => {
        if (!hasAnomaly) {
          e.currentTarget.style.borderColor = 'var(--border-subtle)'
          e.currentTarget.style.background = 'var(--bg-surface)'
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] uppercase tracking-widest font-medium px-2 py-1 rounded-full"
            style={{ color: style.cor, background: style.bg }}
          >
            {label}
          </span>
          {hasAnomaly ? (
            <span
              className="text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1"
              style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}
            >
              <AlertTriangle className="w-3 h-3" />
              {report.anomalias_count} alerta{report.anomalias_count !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="flex items-center gap-1" style={{ color: '#22C55E' }}>
              <CheckCircle className="w-3 h-3" />
              <span className="text-[10px]">OK</span>
            </span>
          )}
        </div>
        <ChevronRight
          className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{ color: 'var(--text-tertiary)' }}
        />
      </div>

      <p
        className="text-sm leading-relaxed line-clamp-3 flex-1"
        style={{ color: hasAnomaly ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      >
        {report.resumo}
      </p>

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          {formatRelative(report.created_at)}
        </span>
        <span
          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{
            color: report.gerado_manualmente ? '#F59E0B' : '#3B82F6',
            background: report.gerado_manualmente
              ? 'rgba(245,158,11,0.12)'
              : 'rgba(59,130,246,0.12)',
          }}
        >
          {report.gerado_manualmente ? <Hand className="w-2.5 h-2.5" /> : <Bot className="w-2.5 h-2.5" />}
          {report.gerado_manualmente ? 'Manual' : 'Automático'}
        </span>
      </div>

      <div
        className="flex items-center gap-1.5 text-[10px] font-mono pt-1"
        style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-subtle)' }}
      >
        <CalendarClock className="w-3 h-3 shrink-0" />
        Próxima atualização automática: {proximaAuto}
      </div>
    </button>
  )
}
