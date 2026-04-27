'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { AtendimentosComparativoEntry } from '@/lib/queries/atendimentos-mensal'

interface Props {
  dados: AtendimentosComparativoEntry[]
  mesAtualLabel: string
  mesAnteriorLabel: string
}

interface TooltipPayloadItem {
  dataKey: string
  value: number | null
  color: string
}

function CustomTooltip({
  active,
  payload,
  label,
  mesAtualLabel,
  mesAnteriorLabel,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: number
  mesAtualLabel: string
  mesAnteriorLabel: string
}) {
  if (!active || !payload?.length) return null

  const atual = payload.find((p) => p.dataKey === 'mesAtual')?.value
  const anterior = payload.find((p) => p.dataKey === 'mesAnterior')?.value
  const diff =
    atual != null && anterior != null ? atual - anterior : null
  const diffSign = diff != null && diff > 0 ? '+' : ''

  return (
    <div
      className="rounded-lg px-3 py-2.5 text-xs min-w-[160px]"
      style={{
        backgroundColor: 'var(--bg-overlay)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-primary)',
      }}
    >
      <p
        className="font-medium mb-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        Dia {label}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-0.5 rounded-full"
              style={{ background: '#C41E20' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>
              {mesAtualLabel}
            </span>
          </span>
          <span className="font-mono font-semibold">
            {atual != null ? atual : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-0.5 border-t border-dashed"
              style={{ borderColor: 'var(--text-tertiary)' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>
              {mesAnteriorLabel}
            </span>
          </span>
          <span
            className="font-mono"
            style={{ color: 'var(--text-secondary)' }}
          >
            {anterior != null ? anterior : '—'}
          </span>
        </div>
        {diff != null && (
          <div
            className="flex items-center justify-between gap-3 pt-1.5 mt-1.5"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <span style={{ color: 'var(--text-tertiary)' }}>Diferença</span>
            <span
              className="font-mono font-semibold"
              style={{
                color:
                  diff > 0
                    ? 'var(--success)'
                    : diff < 0
                      ? 'var(--danger)'
                      : 'var(--text-secondary)',
              }}
            >
              {diffSign}
              {diff}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AtendimentosComparativoChartInner({
  dados,
  mesAtualLabel,
  mesAnteriorLabel,
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="0"
          vertical={false}
          stroke="rgba(255,255,255,0.06)"
        />
        <XAxis
          dataKey="dia"
          tick={{
            fontSize: 10,
            fill: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}
          axisLine={false}
          tickLine={false}
          interval={2}
        />
        <YAxis
          tick={{
            fontSize: 10,
            fill: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}
          axisLine={false}
          tickLine={false}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          content={
            <CustomTooltip
              mesAtualLabel={mesAtualLabel}
              mesAnteriorLabel={mesAnteriorLabel}
            />
          }
          cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="mesAnterior"
          stroke="var(--text-tertiary)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="mesAtual"
          stroke="#C41E20"
          strokeWidth={2.5}
          dot={false}
          activeDot={{
            r: 5,
            fill: '#C41E20',
            stroke: 'var(--bg-base)',
            strokeWidth: 2,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
