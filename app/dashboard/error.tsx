'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // error logging via observability service
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 min-h-[400px]">
      <AlertTriangle className="w-8 h-8" style={{ color: 'var(--danger)' }} />
      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
        Erro ao carregar dados
      </p>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Verifique sua conexão ou tente novamente.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm rounded-lg transition-colors"
        style={{
          border: '1px solid var(--border-default)',
          color: 'var(--text-primary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        Tentar novamente
      </button>
    </div>
  )
}
