'use client'

import dynamic from 'next/dynamic'
import type { ReceitaHoraEntry } from '@/lib/queries/revenue'

const RevenueChartInner = dynamic(() => import('./revenue-chart-inner'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 200 }} />,
})

interface RevenueChartProps {
  data: ReceitaHoraEntry[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <p
        className="text-xs font-medium uppercase tracking-widest mb-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        Receita por hora — hoje
      </p>
      <RevenueChartInner data={data} />
    </div>
  )
}
