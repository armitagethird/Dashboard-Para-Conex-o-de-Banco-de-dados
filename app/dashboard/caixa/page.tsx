import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getReceitaHoje, getReceitaPorHora } from '@/lib/queries/revenue'
import { getTurnosAtivos } from '@/lib/queries/shifts'
import { getAlertasPendentes } from '@/lib/queries/suites'
import { KpiCard } from '@/components/kpi-card'
import { RevenueChart } from '@/components/revenue-chart'
import { ShiftTable } from '@/components/shift-table'
import { Header } from '@/components/header'
import { LiveRefresher } from '@/components/live-refresher'
import { formatBRL } from '@/lib/utils'
import LoadingCaixa from './loading'

export const metadata: Metadata = {
  title: 'Caixa · Paraíso Motel',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const METHOD_LABEL: Record<string, string> = {
  cash:  'Dinheiro',
  card:  'Cartão',
  pix:   'Pix',
}

async function CaixaContent() {
  const [receitaItems, receitaHora, turnos, alertas] = await Promise.all([
    getReceitaHoje(),
    getReceitaPorHora(),
    getTurnosAtivos(),
    getAlertasPendentes(),
  ])

  const totalReceita = receitaItems.reduce((sum, r) => sum + r.total, 0)
  const totalAtendimentos = receitaItems.reduce((sum, r) => sum + r.quantidade, 0)

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Receita de hoje"
          value={formatBRL(totalReceita)}
          sublabel={`${totalAtendimentos} atendimentos confirmados`}
          live
        />
        <KpiCard
          label="Atendimentos de hoje"
          value={String(totalAtendimentos)}
          sublabel="Confirmados no dia"
        />
        {/* Breakdown por método */}
        <div
          className="rounded-xl p-5 col-span-2 lg:col-span-1"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
            Por método
          </p>
          <div className="space-y-1.5">
            {receitaItems.map((r) => (
              <div key={r.payment_method} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {METHOD_LABEL[r.payment_method] ?? r.payment_method}
                </span>
                <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatBRL(r.total)}
                </span>
              </div>
            ))}
            {receitaItems.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sem dados hoje</p>
            )}
          </div>
        </div>
        <KpiCard
          label="Alertas Ativos"
          value={String(alertas.length)}
          sublabel="Requerem atenção"
          variant={alertas.length > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Gráfico */}
      <RevenueChart data={receitaHora} />

      {/* Tabela de turnos */}
      <div>
        <p
          className="text-xs font-medium uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-secondary)' }}
        >
          Turnos em andamento
        </p>
        <ShiftTable turnos={turnos} />
      </div>
    </div>
  )
}

export default function CaixaPage() {
  return (
    <div className="flex flex-col h-full">
      <Header pageTitle="Caixa & Turnos" />
      <LiveRefresher channelName="caixa-live" tables={['stays', 'shifts']} />
      <Suspense fallback={<LoadingCaixa />}>
        <CaixaContent />
      </Suspense>
    </div>
  )
}
