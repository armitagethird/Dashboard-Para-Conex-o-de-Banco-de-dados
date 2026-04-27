'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  Clock,
  CreditCard,
  History,
  Moon,
  Package,
  Receipt,
  TrendingUp,
  User,
  Wrench,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useCobranca } from '@/lib/hooks/use-cobranca'
import { useTempoDecorrido } from '@/lib/hooks/use-tempo-decorrido'
import { formatPaymentMethod } from '@/lib/payment-methods'
import { formatBRL, formatDate, formatRelative } from '@/lib/utils'
import { formatTempoRestante, type Cobranca } from '@/lib/billing'
import { getSuiteDetalhesClient } from '@/lib/queries/suites-client'
import type {
  SuiteLive,
  SuiteStatus,
  AlertaPendente,
  AlertaSeveridade,
  SuiteDetalhes,
  StayHistorico,
} from '@/types/dashboard'

interface SuiteDetailSheetProps {
  suite: SuiteLive | null
  alertas: AlertaPendente[]
  open: boolean
  onClose: () => void
}

const STATUS_CONFIG: Record<SuiteStatus, { label: string; color: string; bg: string }> = {
  free:        { label: 'LIVRE',       color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  occupied:    { label: 'OCUPADA',     color: '#C41E20', bg: 'rgba(196,30,32,0.12)' },
  cleaning:    { label: 'LIMPEZA',     color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  maintenance: { label: 'MANUTENÇÃO',  color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
}

const SEVERITY_STYLE: Record<AlertaSeveridade, { color: string; bg: string; label: string }> = {
  critica: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Crítica' },
  alta:    { color: '#F97316', bg: 'rgba(249,115,22,0.12)', label: 'Alta' },
  media:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Média' },
  baixa:   { color: '#64748B', bg: 'rgba(100,116,139,0.12)', label: 'Baixa' },
}

const PRECO_LABEL: Record<string, string> = {
  '3h':      '3 horas',
  '6h':      '6 horas',
  '12h':     '12 horas',
  pernoite:  'Pernoite',
}

const PRECO_ORDER = ['3h', '6h', '12h', 'pernoite']

export function SuiteDetailSheet({ suite, alertas, open, onClose }: SuiteDetailSheetProps) {
  if (!suite) return null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto flex flex-col p-0"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <SuiteDetailBody suite={suite} alertas={alertas} />
      </SheetContent>
    </Sheet>
  )
}

function SuiteDetailBody({ suite, alertas }: { suite: SuiteLive; alertas: AlertaPendente[] }) {
  const cfg = STATUS_CONFIG[suite.status]
  const isOvertime =
    suite.status === 'occupied' &&
    suite.minutos_ocupada != null &&
    suite.minutos_ocupada > 240

  const tempoOcupada = useTempoDecorrido(
    suite.status === 'occupied' ? suite.opened_at : undefined
  )
  const cobranca = useCobranca(suite)

  const hasAnyPreco = PRECO_ORDER.some((k) => suite.precos?.[k] != null)

  // Detalhes adicionais (atendimentos do dia, consumo, receita, checkout previsto).
  const [detalhes, setDetalhes] = useState<SuiteDetalhes | null>(null)
  const [loadingDetalhes, setLoadingDetalhes] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingDetalhes(true)
    getSuiteDetalhesClient(suite.id, suite.stay_id ?? null)
      .then((d) => {
        if (!cancelled) {
          setDetalhes(d)
          setLoadingDetalhes(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingDetalhes(false)
      })
    return () => {
      cancelled = true
    }
  }, [suite.id, suite.stay_id])

  const voidsHoje = detalhes?.staysHoje.filter((s) => s.void_approved_by) ?? []
  const atendimentosValidos = detalhes?.staysHoje.filter((s) => !s.void_approved_by) ?? []

  return (
    <>
      {/* Header */}
      <SheetHeader
        className="px-6 py-5 border-b shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1.5"
            style={{ color: cfg.color, background: cfg.bg }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: cfg.color }}
            />
            {cfg.label}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {suite.tipo}
          </span>
        </div>
        <SheetTitle
          className="text-left font-mono text-2xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          Suíte {String(suite.numero).padStart(2, '0')}
        </SheetTitle>
      </SheetHeader>

      <div className="flex-1 px-6 py-6 space-y-6">
        {/* Stats do dia + checkout previsto */}
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            icon={<TrendingUp className="w-4 h-4" />}
            label="Receita hoje"
            value={
              loadingDetalhes
                ? '…'
                : formatBRL(detalhes?.receitaHoje ?? 0)
            }
            valueColor={
              !loadingDetalhes && (detalhes?.receitaHoje ?? 0) > 0
                ? '#22C55E'
                : undefined
            }
          />
          <StatTile
            icon={<History className="w-4 h-4" />}
            label="Atendimentos hoje"
            value={
              loadingDetalhes
                ? '…'
                : String(atendimentosValidos.length)
            }
            sub={
              voidsHoje.length > 0
                ? `+${voidsHoje.length} void${voidsHoje.length > 1 ? 's' : ''}`
                : undefined
            }
            subColor="#EF4444"
          />
        </div>

        {/* Próximo checkout previsto */}
        {suite.status === 'occupied' && detalhes?.expectedCheckoutAt && (
          <CheckoutPrevisto isoDate={detalhes.expectedCheckoutAt} />
        )}

        {/* Alerta: isOvertime */}
        {isOvertime && (
          <div
            className="rounded-lg p-4 flex gap-3"
            style={{
              background: 'rgba(196,30,32,0.08)',
              borderLeft: '3px solid #C41E20',
            }}
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#C41E20' }} />
            <div className="space-y-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Ocupada há {tempoOcupada} — acima do limite de 4 horas
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Verifique se o hóspede ainda está na suíte ou se o check-out não foi registrado
                no sistema.
              </p>
            </div>
          </div>
        )}

        {/* Alertas vindos da view */}
        {alertas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Alertas relacionados
            </p>
            {alertas.map((a, i) => {
              const sev = SEVERITY_STYLE[a.severidade]
              return (
                <div
                  key={`${a.tipo}-${i}`}
                  className="rounded-lg p-3 flex items-start gap-3"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: `1px solid ${sev.color}40`,
                  }}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: sev.color }} />
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
                        style={{ color: sev.color, background: sev.bg }}
                      >
                        {sev.label}
                      </span>
                      <span className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {formatRelative(a.gerado_em)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                      {a.descricao}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Sessão em andamento */}
        {suite.status === 'occupied' && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Sessão em andamento
            </p>
            <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--bg-elevated)' }}>
              {suite.funcionario_nome && (
                <InfoRow
                  icon={<User className="w-4 h-4" />}
                  label="Funcionário"
                  value={suite.funcionario_nome}
                />
              )}
              {suite.opened_at && (
                <InfoRow
                  icon={<Clock className="w-4 h-4" />}
                  label="Aberta em"
                  value={formatDate(suite.opened_at, "dd/MM 'às' HH:mm")}
                />
              )}
              {tempoOcupada && (
                <InfoRow
                  icon={<Clock className="w-4 h-4" />}
                  label="Tempo decorrido"
                  value={tempoOcupada}
                  valueColor={isOvertime ? '#C41E20' : undefined}
                  valueFont="mono"
                />
              )}
              {suite.payment_method && (
                <InfoRow
                  icon={<CreditCard className="w-4 h-4" />}
                  label="Pagamento"
                  value={formatPaymentMethod(suite.payment_method)}
                />
              )}
            </div>

            {cobranca && <CobrancaBlock cobranca={cobranca} />}
          </div>
        )}

        {/* Limpeza / Manutenção — tempo no status */}
        {(suite.status === 'cleaning' || suite.status === 'maintenance') && suite.minutos_no_status_atual > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Tempo no status atual
            </p>
            <div className="rounded-lg p-4 flex items-center gap-3" style={{ background: 'var(--bg-elevated)' }}>
              {suite.status === 'maintenance' ? (
                <Wrench className="w-4 h-4" style={{ color: cfg.color }} />
              ) : (
                <Clock className="w-4 h-4" style={{ color: cfg.color }} />
              )}
              <p className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {formatMinutos(suite.minutos_no_status_atual)}
              </p>
            </div>
          </div>
        )}

        {/* Consumo (frigobar/cardápio) — somente da stay atual */}
        {detalhes && detalhes.consumo.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Consumo (frigobar)
            </p>
            <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-elevated)' }}>
              {detalhes.consumo.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <Package className="w-4 h-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.nome}
                  </span>
                  <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    ×{item.quantidade}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atendimentos do dia (timeline) */}
        {atendimentosValidos.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Atendimentos de hoje
            </p>
            <div className="space-y-2">
              {atendimentosValidos.map((s) => (
                <StayHistoricoRow key={s.id} stay={s} isCurrent={s.id === suite.stay_id} />
              ))}
            </div>
          </div>
        )}

        {/* Voids do dia */}
        {voidsHoje.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Cancelamentos (void) hoje
            </p>
            <div className="space-y-2">
              {voidsHoje.map((s) => (
                <VoidRow key={s.id} stay={s} />
              ))}
            </div>
          </div>
        )}

        {/* Tabela de preços */}
        {hasAnyPreco && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Tabela de preços
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PRECO_ORDER.map((k) => {
                const v = suite.precos?.[k]
                const disponivel = v != null
                return (
                  <div
                    key={k}
                    className="rounded-lg p-3"
                    style={{
                      background: 'var(--bg-elevated)',
                      opacity: disponivel ? 1 : 0.4,
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                      {PRECO_LABEL[k] ?? k}
                    </p>
                    <p className="font-mono text-sm font-semibold mt-1" style={{ color: disponivel ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      {disponivel ? formatBRL(v) : '—'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function InfoRow({
  icon,
  label,
  value,
  valueColor,
  valueFont,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueColor?: string
  valueFont?: 'mono'
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span
        className={`text-sm font-medium ${valueFont === 'mono' ? 'font-mono' : ''}`}
        style={{ color: valueColor ?? 'var(--text-primary)' }}
      >
        {value}
      </span>
    </div>
  )
}

function formatMinutos(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

function CobrancaBlock({ cobranca }: { cobranca: Cobranca }) {
  const isPernoite = cobranca.isPernoite
  const p = cobranca.pernoite
  const horas = cobranca.horista?.horasExtras ?? 0

  // Banner de status (quando pernoite)
  let banner: { color: string; bg: string; titulo: string; sub?: string } | null = null
  if (isPernoite && p) {
    if (p.fase === 'pre') {
      banner = {
        color: '#F59E0B',
        bg: 'rgba(245,158,11,0.10)',
        titulo: 'Pré-pernoite · adicional em andamento',
        sub: `${p.horasPreMidnight}h iniciada(s) antes da meia-noite × R$15`,
      }
    } else if (p.fase === 'expirando') {
      banner = {
        color: '#C41E20',
        bg: 'rgba(196,30,32,0.10)',
        titulo: `Checkout em ${formatTempoRestante(p.msAteCheckout)}`,
        sub: `Pernoite ativo · checkout fixo às 06:00`,
      }
    } else if (p.fase === 'ativo') {
      banner = {
        color: '#22C55E',
        bg: 'rgba(34,197,94,0.10)',
        titulo: 'Pernoite ativo',
        sub: `Checkout às 06:00 · ${formatTempoRestante(p.msAteCheckout)} restantes`,
      }
    } else {
      banner = {
        color: '#C41E20',
        bg: 'rgba(196,30,32,0.10)',
        titulo: 'Pernoite em overtime',
        sub:
          p.horasOvertime > 0
            ? `${p.horasOvertime}h iniciada(s) após 06:00 × R$15`
            : 'Hóspede passou do checkout fixo das 06:00',
      }
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-tertiary)' }}>
        Cobrança em tempo real
      </p>

      {banner && (
        <div
          className="rounded-lg p-3 flex gap-3"
          style={{ background: banner.bg, borderLeft: `3px solid ${banner.color}` }}
        >
          <Moon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: banner.color }} />
          <div className="space-y-0.5">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {banner.titulo}
            </p>
            {banner.sub && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {banner.sub}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--bg-elevated)' }}>
        <InfoRow
          icon={<Receipt className="w-4 h-4" />}
          label="Preço base"
          value={formatBRL(cobranca.precoBase)}
          valueFont="mono"
        />
        {!isPernoite && (
          <InfoRow
            icon={<Clock className="w-4 h-4" />}
            label={horas > 0 ? `Adicional (${horas}h × R$15)` : 'Adicional'}
            value={formatBRL(cobranca.adicional)}
            valueFont="mono"
          />
        )}
        {isPernoite && p && p.horasPreMidnight > 0 && (
          <InfoRow
            icon={<Clock className="w-4 h-4" />}
            label={`Pré-pernoite (${p.horasPreMidnight}h × R$15)`}
            value={formatBRL(p.valorPreMidnight)}
            valueFont="mono"
          />
        )}
        {isPernoite && p && p.horasOvertime > 0 && (
          <InfoRow
            icon={<Clock className="w-4 h-4" />}
            label={`Pós-checkout (${p.horasOvertime}h × R$15)`}
            value={formatBRL(p.valorOvertime)}
            valueFont="mono"
          />
        )}
        {isPernoite && p && p.horasPreMidnight === 0 && p.horasOvertime === 0 && (
          <InfoRow
            icon={<Clock className="w-4 h-4" />}
            label="Adicional pernoite"
            value={formatBRL(cobranca.adicional)}
            valueFont="mono"
          />
        )}
        <div
          className="pt-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Total atual
          </span>
          <span className="font-mono text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatBRL(cobranca.total)}
          </span>
        </div>
      </div>
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
  valueColor,
  sub,
  subColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueColor?: string
  sub?: string
  subColor?: string
}) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)' }}>
      <div className="flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
        {icon}
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <p
        className="font-mono text-base font-bold mt-1"
        style={{ color: valueColor ?? 'var(--text-primary)' }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px] mt-0.5" style={{ color: subColor ?? 'var(--text-tertiary)' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function CheckoutPrevisto({ isoDate }: { isoDate: string }) {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const target = new Date(isoDate).getTime()
  const diff = target - now
  const passou = diff <= 0
  const restante = Math.abs(diff)
  const restanteLabel = passou
    ? `há ${formatTempoRestante(restante)}`
    : `em ${formatTempoRestante(restante)}`

  return (
    <div
      className="rounded-lg p-4 flex items-start gap-3"
      style={{
        background: passou ? 'rgba(196,30,32,0.08)' : 'var(--bg-elevated)',
        borderLeft: passou ? '3px solid #C41E20' : undefined,
      }}
    >
      <Clock
        className="w-4 h-4 shrink-0 mt-0.5"
        style={{ color: passou ? '#C41E20' : 'var(--text-tertiary)' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
          Checkout previsto
        </p>
        <p className="font-mono text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
          {formatDate(isoDate, "dd/MM 'às' HH:mm")}
        </p>
        <p
          className="text-[11px] font-mono mt-0.5"
          style={{ color: passou ? '#C41E20' : 'var(--text-secondary)' }}
        >
          {restanteLabel}
        </p>
      </div>
    </div>
  )
}

function totalStay(s: StayHistorico): number {
  return (
    (Number(s.price) || 0) +
    (Number(s.extra_value) || 0) +
    (Number(s.pre_pernoite_value) || 0)
  )
}

function StayHistoricoRow({ stay, isCurrent }: { stay: StayHistorico; isCurrent: boolean }) {
  const aberta = stay.closed_at == null
  const total = totalStay(stay)
  const horario = formatDate(stay.opened_at, 'HH:mm')
  const horarioFim = stay.closed_at ? formatDate(stay.closed_at, 'HH:mm') : null

  let statusColor = 'var(--text-tertiary)'
  let statusLabel = 'Concluída'
  if (aberta) {
    statusColor = '#C41E20'
    statusLabel = 'Em andamento'
  } else if (stay.payment_status === 'pending') {
    statusColor = '#F59E0B'
    statusLabel = 'Pagamento pendente'
  }

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: 'var(--bg-elevated)',
        borderLeft: isCurrent ? '3px solid #C41E20' : '3px solid transparent',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {horario}
            {horarioFim ? ` → ${horarioFim}` : ''}
          </span>
          {stay.type && (
            <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
              {stay.type}
            </span>
          )}
        </div>
        <span className="font-mono text-sm font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>
          {formatBRL(total)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="flex items-center gap-2 text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
          {stay.opened_by_name && (
            <span className="flex items-center gap-1 truncate">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">{stay.opened_by_name}</span>
            </span>
          )}
          {stay.payment_method && (
            <span className="flex items-center gap-1 shrink-0">
              <CreditCard className="w-3 h-3" />
              {formatPaymentMethod(stay.payment_method)}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium uppercase tracking-widest shrink-0" style={{ color: statusColor }}>
          {statusLabel}
        </span>
      </div>
    </div>
  )
}

function VoidRow({ stay }: { stay: StayHistorico }) {
  const total = totalStay(stay)
  const horario = formatDate(stay.opened_at, "HH:mm")
  return (
    <div
      className="rounded-lg p-3 space-y-1"
      style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Ban className="w-4 h-4 shrink-0" style={{ color: '#EF4444' }} />
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {horario}
          </span>
          {stay.type && (
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
              {stay.type}
            </span>
          )}
        </div>
        <span className="font-mono text-sm font-bold shrink-0" style={{ color: '#EF4444' }}>
          −{formatBRL(total)}
        </span>
      </div>
      {stay.void_reason && (
        <p className="text-xs leading-relaxed pl-6" style={{ color: 'var(--text-secondary)' }}>
          {stay.void_reason}
        </p>
      )}
    </div>
  )
}
