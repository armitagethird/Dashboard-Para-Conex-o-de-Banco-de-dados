'use client'

import { Clock, Loader2, Sparkles, RefreshCw } from 'lucide-react'
import type { ReportTipo } from '@/types/ai-reports'

interface GenerateButtonProps {
  tipo: ReportTipo
  label: string
  isLoading: boolean
  hasReport: boolean
  cooldownMessage: string | null
  onGenerate: () => void
}

export function GenerateButton({
  label,
  isLoading,
  hasReport,
  cooldownMessage,
  onGenerate,
}: GenerateButtonProps) {
  if (cooldownMessage) {
    return (
      <div
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--text-tertiary)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <Clock className="w-3.5 h-3.5" />
        {cooldownMessage}
      </div>
    )
  }

  return (
    <button
      onClick={onGenerate}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                 text-xs font-medium transition-all duration-200
                 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'var(--bg-elevated)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-subtle)',
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          e.currentTarget.style.borderColor = 'var(--border-default)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Gerando {label.toLowerCase()}…
        </>
      ) : hasReport ? (
        <>
          <RefreshCw className="w-3.5 h-3.5" />
          Gerar novo {label.toLowerCase()}
        </>
      ) : (
        <>
          <Sparkles className="w-3.5 h-3.5" />
          Gerar {label.toLowerCase()} agora
        </>
      )}
    </button>
  )
}
