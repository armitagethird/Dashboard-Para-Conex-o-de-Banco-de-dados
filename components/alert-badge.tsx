'use client'

interface AlertBadgeProps {
  count: number
}

export function AlertBadge({ count }: AlertBadgeProps) {
  if (count === 0) return null

  return (
    <span
      className="inline-flex items-center justify-center min-w-5 h-5 rounded-full text-[10px] font-bold text-white px-1"
      style={{ backgroundColor: 'var(--red-400)' }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
