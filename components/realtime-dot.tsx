'use client'

type Status = 'connected' | 'disconnected' | 'connecting'

interface RealtimeDotProps {
  status: Status
}

export function RealtimeDot({ status }: RealtimeDotProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{
          backgroundColor:
            status === 'connected' ? 'var(--status-livre)' : 'var(--text-tertiary)',
          animation:
            status === 'connected'
              ? 'realtimePulse 2s ease-in-out infinite'
              : 'none',
        }}
      />
      <span
        className="font-mono text-[10px] uppercase tracking-widest"
        style={{
          color:
            status === 'connected'
              ? 'var(--status-livre)'
              : 'var(--text-tertiary)',
        }}
      >
        {status === 'connected'
          ? 'Ao vivo'
          : status === 'connecting'
            ? 'Conectando'
            : 'Offline'}
      </span>
    </div>
  )
}
