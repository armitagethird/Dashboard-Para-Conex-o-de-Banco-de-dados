'use client'

import type { ConnectionStatus } from './connection-status-provider'

interface RealtimeDotProps {
  status: ConnectionStatus
  latencyMs?: number | null
}

const COLOR: Record<ConnectionStatus, string> = {
  online:  'var(--status-livre)',
  slow:    '#F59E0B',
  offline: 'var(--red-400)',
}

const LABEL: Record<ConnectionStatus, string> = {
  online:  'Conectado',
  slow:    'Conexão ruim',
  offline: 'Offline',
}

export function RealtimeDot({ status, latencyMs }: RealtimeDotProps) {
  const color = COLOR[status]
  const label = LABEL[status]
  const shouldPulse = status === 'online' || status === 'slow'
  const pulseDuration = status === 'slow' ? '3s' : '2s'

  const title =
    status === 'offline'
      ? 'Sem conexão com o servidor'
      : latencyMs != null
        ? `Latência ${Math.round(latencyMs)}ms`
        : undefined

  return (
    <div className="flex items-center gap-1.5" title={title}>
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{
          backgroundColor: color,
          animation: shouldPulse
            ? `realtimePulse ${pulseDuration} ease-in-out infinite`
            : 'none',
        }}
      />
      <span
        className="font-mono text-[10px] uppercase tracking-widest"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  )
}
