'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ReceitaHoraEntry } from '@/lib/queries/revenue'

interface RevenueChartInnerProps {
  data: ReceitaHoraEntry[]
}

function formatBRLShort(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`
  return `R$ ${value.toFixed(0)}`
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{
        backgroundColor: 'var(--bg-overlay)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-primary)',
      }}
    >
      <p style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="font-mono font-semibold mt-0.5">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}
      </p>
    </div>
  )
}

export default function RevenueChartInner({ data }: RevenueChartInnerProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#C41E20" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#C41E20" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="0"
          vertical={false}
          stroke="rgba(255,255,255,0.06)"
        />
        <XAxis
          dataKey="hora"
          tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          interval={3}
        />
        <YAxis
          tickFormatter={formatBRLShort}
          tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="receita"
          stroke="#C41E20"
          strokeWidth={2}
          fill="url(#revenueGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
