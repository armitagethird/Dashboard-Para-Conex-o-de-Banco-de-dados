'use client'

import { useMemo, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AlertTriangle, Bot, CheckCircle, Hand, List } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ReportHistoryList } from './report-history-list'
import type { AiReport, ReportTipo } from '@/types/ai-reports'

const TIPO_LABEL: Record<ReportTipo, string> = {
  diario: 'Relatório Diário',
  semanal: 'Relatório Semanal',
  mensal: 'Relatório Mensal',
}

interface ReportDrawerProps {
  report: AiReport | null
  open: boolean
  onClose: () => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function extractHeadings(text: string): string[] {
  return text
    .split('\n')
    .filter((l) => l.trim().startsWith('##'))
    .map((l) => l.replace(/^#+\s*/, '').replace(/:$/, '').trim())
}

export function ReportDrawer({ report: propReport, open, onClose }: ReportDrawerProps) {
  const [displayed, setDisplayed] = useState<AiReport | null>(propReport)

  const headings = useMemo(
    () => (displayed ? extractHeadings(displayed.report_text) : []),
    [displayed]
  )

  if (!displayed) return null

  const isMensal = displayed.tipo === 'mensal'
  const hasIndex = isMensal && headings.length >= 3
  const widthClass = isMensal ? 'sm:max-w-2xl' : 'sm:max-w-xl'
  const isManual = displayed.gerado_manualmente
  const OriginIcon = isManual ? Hand : Bot
  const originColor = isManual ? '#F59E0B' : '#3B82F6'
  const originBg = isManual ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)'
  const originLabel = isManual ? 'Manual' : 'Automático'

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="right"
        className={`w-full ${widthClass} overflow-y-auto flex flex-col p-0`}
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <SheetHeader
          className="px-6 py-5 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ color: originColor, background: originBg }}
            >
              <OriginIcon className="w-3 h-3" />
              {originLabel}
            </span>
            {displayed.anomalies_found ? (
              <div
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}
              >
                <AlertTriangle className="w-3 h-3" />
                {displayed.anomalias_count} ponto{displayed.anomalias_count !== 1 ? 's' : ''} de atenção
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                style={{ color: '#22C55E', background: 'rgba(34,197,94,0.1)' }}
              >
                <CheckCircle className="w-3 h-3" />
                Tudo em ordem
              </div>
            )}
          </div>
          <SheetTitle
            className="text-left font-medium text-base"
            style={{ color: 'var(--text-primary)' }}
          >
            {TIPO_LABEL[displayed.tipo]}
          </SheetTitle>
          <div className="mt-1.5 space-y-0.5">
            <p className="font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              Gerado em {formatDate(displayed.created_at, "dd/MM/yyyy 'às' HH:mm")}
            </p>
            <p className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Período analisado: {formatDate(displayed.period_start, 'dd/MM/yyyy')}
              {displayed.period_start.slice(0, 10) !== displayed.period_end.slice(0, 10)
                ? ` – ${formatDate(displayed.period_end, 'dd/MM/yyyy')}`
                : ''}
            </p>
          </div>
        </SheetHeader>

        <ReportHistoryList
          tipo={displayed.tipo}
          currentId={displayed.id}
          onSelect={(r) => setDisplayed(r)}
        />

        {hasIndex && (
          <div
            className="px-6 py-3 border-b shrink-0"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <List className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              <span
                className="text-[10px] uppercase tracking-widest font-medium"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Seções
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {headings.map((h) => {
                const id = slugify(h)
                return (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="text-xs px-2.5 py-1 rounded-full transition-colors"
                    style={{
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)'
                      e.currentTarget.style.borderColor = 'var(--border-default)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)'
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    }}
                  >
                    {h}
                  </a>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex-1 px-6 pt-6 pb-8 overflow-y-auto">
          <ReportBody text={displayed.report_text} />
        </div>

        {displayed.metadata && (
          <div
            className="px-6 py-4 border-t text-xs font-mono shrink-0"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
          >
            {displayed.metadata.model} · {displayed.metadata.input_tokens}↑{' '}
            {displayed.metadata.output_tokens}↓ tokens · {displayed.metadata.duration_ms}ms
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function ReportBody({ text }: { text: string }) {
  const paragrafos = text.split('\n').filter((l) => l.trim().length > 0)

  return (
    <div className="space-y-4">
      {paragrafos.map((paragrafo, i) => {
        const isAlerta =
          paragrafo.includes('⚠') ||
          paragrafo.toLowerCase().includes('atenção') ||
          paragrafo.toLowerCase().includes('preocupante') ||
          paragrafo.toLowerCase().includes('suspeito')

        const isTitulo =
          paragrafo.startsWith('##') ||
          (paragrafo.length < 70 &&
            paragrafo.endsWith(':') &&
            !paragrafo.includes('R$'))

        if (isTitulo) {
          const clean = paragrafo.replace(/^#+\s*/, '').replace(/:$/, '').trim()
          const id = slugify(clean)
          return (
            <h3
              key={i}
              id={id}
              className="text-xs uppercase tracking-widest font-medium mt-6 mb-2 scroll-mt-20"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {clean}
            </h3>
          )
        }

        if (isAlerta) {
          return (
            <p
              key={i}
              className="text-sm leading-relaxed p-3 rounded-lg border-l-[3px]"
              style={{
                color: 'var(--text-primary)',
                background: 'rgba(239,68,68,0.06)',
                borderLeftColor: '#EF4444',
              }}
            >
              {paragrafo}
            </p>
          )
        }

        return (
          <p
            key={i}
            className="text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {paragrafo}
          </p>
        )
      })}
    </div>
  )
}
