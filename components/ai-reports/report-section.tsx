'use client'

import { useState, useTransition } from 'react'
import { BrainCircuit } from 'lucide-react'
import { toast } from 'sonner'
import { ReportCard } from './report-card'
import { ReportDrawer } from './report-drawer'
import { GenerateButton } from './generate-button'
import type { AiReport, ReportTipo, GenerateResponse } from '@/types/ai-reports'

interface ReportSectionProps {
  reports: {
    diario: AiReport | null
    semanal: AiReport | null
    mensal: AiReport | null
  }
}

const TIPOS: { tipo: ReportTipo; label: string; descricao: string }[] = [
  { tipo: 'diario', label: 'Diário', descricao: 'Resumo do dia anterior' },
  { tipo: 'semanal', label: 'Semanal', descricao: 'Últimos 7 dias' },
  { tipo: 'mensal', label: 'Mensal', descricao: 'Mês atual' },
]

export function ReportSection({ reports: initialReports }: ReportSectionProps) {
  const [reports, setReports] = useState(initialReports)
  const [selected, setSelected] = useState<AiReport | null>(null)
  const [generating, setGenerating] = useState<ReportTipo | null>(null)
  const [cooldownError, setCooldownError] = useState<Record<ReportTipo, string | null>>({
    diario: null,
    semanal: null,
    mensal: null,
  })
  const [, startTransition] = useTransition()

  async function handleGenerate(tipo: ReportTipo) {
    setGenerating(tipo)
    setCooldownError((prev) => ({ ...prev, [tipo]: null }))
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, manual: true }),
      })
      const responseData = (await res.json()) as GenerateResponse
      if (res.status === 429 && responseData.cooldown_remaining_minutes) {
        setCooldownError((prev) => ({
          ...prev,
          [tipo]: `Disponível em ${responseData.cooldown_remaining_minutes} min`,
        }))
        return
      }
      if (responseData.success && responseData.report) {
        const report = responseData.report
        startTransition(() => {
          setReports((prev) => ({ ...prev, [tipo]: report }))
        })
        toast.success('Relatório gerado com sucesso!')
      } else {
        toast.error(responseData.error ?? 'Erro ao gerar relatório')
      }
    } catch {
      toast.error('Falha de conexão ao gerar relatório')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(196,30,32,0.12)' }}
          >
            <BrainCircuit className="w-4 h-4" style={{ color: '#C41E20' }} />
          </div>
          <div>
            <h1 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
              Inteligência Artificial
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Análise automática gerada pelo Gemini
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIPOS.map(({ tipo, label, descricao }) => (
          <div key={tipo} className="flex flex-col gap-3">
            <ReportCard
              report={reports[tipo]}
              tipo={tipo}
              label={label}
              descricao={descricao}
              onClick={() => {
                const r = reports[tipo]
                if (r) setSelected(r)
              }}
            />
            <GenerateButton
              tipo={tipo}
              label={label}
              isLoading={generating === tipo}
              hasReport={!!reports[tipo]}
              cooldownMessage={cooldownError[tipo]}
              onGenerate={() => handleGenerate(tipo)}
            />
          </div>
        ))}
      </div>

      <ReportDrawer
        report={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
