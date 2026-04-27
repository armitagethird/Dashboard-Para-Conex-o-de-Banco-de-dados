'use client'

import dynamic from 'next/dynamic'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type {
  AtendimentosComparativo,
  MesOpcao,
} from '@/lib/queries/atendimentos-mensal'

const AtendimentosComparativoChartInner = dynamic(
  () => import('./atendimentos-comparativo-chart-inner'),
  {
    ssr: false,
    loading: () => <div className="skeleton" style={{ height: 240 }} />,
  }
)

interface Props {
  data: AtendimentosComparativo
  opcoesMeses: MesOpcao[]
}

const selectStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
  borderRadius: '8px',
  padding: '0 28px 0 12px',
  height: '36px',
  fontSize: '13px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A8997F' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  width: '100%',
}

export function AtendimentosComparativoChart({ data, opcoesMeses }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const {
    dados,
    totalAtual,
    totalAnterior,
    deltaPercent,
    diasDecorridos,
    diasNoMes,
    mesAtualLabel,
    mesAnteriorLabel,
    baseYear,
    baseMonth,
    compareYear,
    compareMonth,
    baseIsCurrent,
  } = data

  const isPositivo = deltaPercent > 0
  const isNegativo = deltaPercent < 0
  const deltaColor = isPositivo
    ? 'var(--success)'
    : isNegativo
      ? 'var(--danger)'
      : 'var(--text-secondary)'
  const DeltaIcon = isPositivo ? TrendingUp : isNegativo ? TrendingDown : Minus
  const deltaSign = isPositivo ? '+' : ''

  function update(field: 'base' | 'compare', value: string) {
    const [year, month] = value.split('-').map(Number)
    if (!year || !month) return
    const params = new URLSearchParams(searchParams.toString())
    params.set(`${field}_year`, String(year))
    params.set(`${field}_month`, String(month))
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const baseValue = `${baseYear}-${baseMonth}`
  const compareValue = `${compareYear}-${compareMonth}`

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: 'var(--text-secondary)' }}
          >
            Atendimentos · Comparativo mensal
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
              {totalAtual}
            </span>{' '}
            em {mesAtualLabel} ·{' '}
            <span className="font-mono">{totalAnterior}</span> em{' '}
            {mesAnteriorLabel}
            {baseIsCurrent && (
              <>
                {' '}
                · dia <span className="font-mono">{diasDecorridos}</span> de{' '}
                <span className="font-mono">{diasNoMes}</span>
              </>
            )}
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-sm shrink-0"
          style={{
            color: deltaColor,
            background: isPositivo
              ? 'rgba(34,197,94,0.10)'
              : isNegativo
                ? 'rgba(239,68,68,0.10)'
                : 'rgba(168,153,127,0.10)',
            border: `1px solid ${deltaColor}33`,
          }}
        >
          <DeltaIcon className="w-3.5 h-3.5" />
          {deltaSign}
          {deltaPercent}%
        </div>
      </div>

      <div
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-5"
        style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 150ms' }}
      >
        <div className="min-w-0">
          <label
            className="text-[10px] font-medium uppercase tracking-widest block mb-1.5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Mês base
          </label>
          <select
            style={selectStyle}
            value={baseValue}
            onChange={(e) => update('base', e.target.value)}
            disabled={isPending}
            aria-label="Mês base"
          >
            {opcoesMeses.map((m) => (
              <option key={`b-${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <span
          className="text-xs font-medium px-1 mt-5"
          style={{ color: 'var(--text-tertiary)' }}
        >
          vs
        </span>
        <div className="min-w-0">
          <label
            className="text-[10px] font-medium uppercase tracking-widest block mb-1.5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Comparado com
          </label>
          <select
            style={selectStyle}
            value={compareValue}
            onChange={(e) => update('compare', e.target.value)}
            disabled={isPending}
            aria-label="Mês comparado"
          >
            {opcoesMeses.map((m) => (
              <option key={`c-${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <AtendimentosComparativoChartInner
        dados={dados}
        mesAtualLabel={mesAtualLabel}
        mesAnteriorLabel={mesAnteriorLabel}
      />
    </div>
  )
}
