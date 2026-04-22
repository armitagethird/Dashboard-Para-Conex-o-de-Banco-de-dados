'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
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

export function ReportDrawer({ report, open, onClose }: ReportDrawerProps) {
  if (!report) return null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto flex flex-col p-0"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <SheetHeader
          className="px-6 py-5 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            {report.anomalies_found ? (
              <div
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}
              >
                <AlertTriangle className="w-3 h-3" />
                {report.anomalias_count} ponto{report.anomalias_count !== 1 ? 's' : ''} de atenção
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
            <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
              {formatDate(report.created_at, "dd/MM/yyyy 'às' HH:mm")}
            </span>
          </div>
          <SheetTitle
            className="text-left font-medium text-base"
            style={{ color: 'var(--text-primary)' }}
          >
            {TIPO_LABEL[report.tipo]}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 px-6 pt-6 pb-8 overflow-y-auto">
          <ReportBody text={report.report_text} />
        </div>

        {report.metadata && (
          <div
            className="px-6 py-4 border-t text-xs font-mono shrink-0"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
          >
            {report.metadata.model} · {report.metadata.input_tokens}↑{' '}
            {report.metadata.output_tokens}↓ tokens · {report.metadata.duration_ms}ms
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
          return (
            <h3
              key={i}
              className="text-xs uppercase tracking-widest font-medium mt-6 mb-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {paragrafo.replace(/^#+\s*/, '').replace(/:$/, '')}
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
