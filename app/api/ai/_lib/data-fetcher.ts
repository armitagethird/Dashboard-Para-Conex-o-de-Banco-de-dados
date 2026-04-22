import { createClient } from '@supabase/supabase-js'
import type {
  ReportData,
  TurnoData,
  SuiteUsada,
  ItemEstoque,
  FuncionarioContagem,
  SituacaoAtual,
  SuiteEmUso,
} from '@/types/ai-reports'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Variáveis de ambiente Supabase não configuradas')

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface StayRow {
  id: string
  status: string
  payment_status: string
  valor_total: number | null
  forma_pagamento: string | null
  suite_id: string
  suites: { numero: string; tipo: string }[] | null
}

interface SuiteRow {
  id: string
  status: string
}

interface ShiftRow {
  id: string
  started_at: string
  ended_at: string | null
  expected_cash: number | null
  reported_cash: number | null
  difference: number | null
  status: string
  profiles: { name: string }[] | null
}

interface InventoryRow {
  name: string
  quantity: number
  min_quantity: number
}

interface AuditRow {
  id: string
  operation: string
  user_id: string | null
  profiles: { name: string }[] | null
}

interface OpenStayRow {
  id: string
  opened_at: string
  tipo_periodo: string | null
  forma_pagamento: string | null
  valor_total: number | null
  suites: { numero: string; tipo: string }[] | null
}

export async function fetchDataForPeriod(
  periodStart: Date,
  periodEnd: Date
): Promise<ReportData> {
  const sb = adminClient()
  const start = periodStart.toISOString()
  const end = periodEnd.toISOString()

  const [staysRes, suitesRes, turnosRes, movsRes, inventarioRes, auditRes] =
    await Promise.all([
      sb
        .from('stays')
        .select(
          'id, status, payment_status, valor_total, forma_pagamento, suite_id, suites(numero, tipo)'
        )
        .gte('opened_at', start)
        .lte('opened_at', end),
      sb.from('suites').select('id, status'),
      sb
        .from('shifts')
        .select(
          'id, started_at, ended_at, expected_cash, reported_cash, difference, status, profiles(name)'
        )
        .gte('started_at', start)
        .lte('started_at', end),
      sb
        .from('inventory_movements')
        .select('id')
        .gte('created_at', start)
        .lte('created_at', end),
      sb.from('inventory').select('name, quantity, min_quantity').eq('active', true),
      sb
        .from('audit_log')
        .select('id, operation, user_id, profiles(name)')
        .gte('created_at', start)
        .lte('created_at', end),
    ])

  // ── Stays ─────────────────────────────────────────────────────────────────
  const stays = (staysRes.data ?? []) as StayRow[]
  const concluidos = stays.filter((s) => s.status === 'closed')
  const voidados = stays.filter((s) => s.status === 'voided')
  const confirmados = concluidos.filter((s) => s.payment_status === 'confirmed')

  const receitaConfirmada = confirmados.reduce(
    (sum, s) => sum + (Number(s.valor_total) || 0),
    0
  )
  const receitaPendente = stays
    .filter((s) => s.payment_status === 'pending')
    .reduce((sum, s) => sum + (Number(s.valor_total) || 0), 0)

  const distPag: Record<string, number> = {}
  for (const s of concluidos) {
    const fp = s.forma_pagamento ?? 'pendente'
    distPag[fp] = (distPag[fp] ?? 0) + 1
  }

  const ticketMedio =
    confirmados.length > 0 ? receitaConfirmada / confirmados.length : 0

  // ── Suítes mais usadas ─────────────────────────────────────────────────────
  const suiteMap: Record<string, SuiteUsada> = {}
  for (const s of stays) {
    const id = s.suite_id
    const suite = s.suites?.[0]
    if (!suiteMap[id]) {
      suiteMap[id] = {
        numero: suite?.numero ?? id,
        tipo: suite?.tipo ?? '—',
        atendimentos: 0,
      }
    }
    suiteMap[id]!.atendimentos++
  }
  const suitesMaisUsadas: SuiteUsada[] = Object.values(suiteMap)
    .sort((a, b) => b.atendimentos - a.atendimentos)
    .slice(0, 3)

  // ── Suítes totais e ocupação atual ─────────────────────────────────────────
  const suitesAll = (suitesRes.data ?? []) as SuiteRow[]
  const suitesTotais = suitesAll.length
  const suitesOcupadas = suitesAll.filter((s) => s.status === 'ocupada').length

  // ── Turnos ─────────────────────────────────────────────────────────────────
  const turnosRaw = (turnosRes.data ?? []) as ShiftRow[]
  const turnos: TurnoData[] = turnosRaw.map((t) => ({
    funcionario: t.profiles?.[0]?.name ?? 'Desconhecido',
    inicio: t.started_at,
    fim: t.ended_at,
    expectedCash: t.expected_cash,
    reportedCash: t.reported_cash,
    diferenca: t.difference,
    status: t.status as 'open' | 'closed',
  }))

  const turnosComDivergencia = turnos.filter(
    (t) => t.diferenca !== null && Math.abs(t.diferenca) > 0
  ).length
  const turnosAbertos = turnos.filter((t) => t.status === 'open').length

  // ── Estoque ────────────────────────────────────────────────────────────────
  const inventario = (inventarioRes.data ?? []) as InventoryRow[]
  const itensAbaixoMinimo: ItemEstoque[] = inventario
    .filter((i) => i.quantity <= i.min_quantity)
    .map((i) => ({
      nome: i.name,
      qtdAtual: i.quantity,
      minimo: i.min_quantity,
    }))

  // ── Audit log ──────────────────────────────────────────────────────────────
  const auditData = (auditRes.data ?? []) as AuditRow[]
  const totalEventosAudit = auditData.length

  const voidsMap: Record<string, number> = {}
  for (const a of auditData.filter((a) => a.operation === 'VOID')) {
    const nome = a.profiles?.[0]?.name ?? 'Desconhecido'
    voidsMap[nome] = (voidsMap[nome] ?? 0) + 1
  }
  const voidsPorFuncionario: FuncionarioContagem[] = Object.entries(voidsMap)
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)

  const cancelamentosExcessivos = voidsPorFuncionario.some((v) => v.quantidade >= 3)

  // ── Situação atual — suítes em uso AGORA (independente do período) ────────────
  const { data: staysAbertasRaw } = await sb
    .from('stays')
    .select('id, opened_at, tipo_periodo, forma_pagamento, valor_total, suites(numero, tipo)')
    .eq('status', 'open')
    .order('opened_at', { ascending: true })

  const agora = Date.now()
  const staysAbertas = (staysAbertasRaw ?? []) as OpenStayRow[]

  const suitesEmUso: SuiteEmUso[] = staysAbertas.map((s) => {
    const suite = s.suites?.[0]
    const minutosAberta = Math.floor((agora - new Date(s.opened_at).getTime()) / 60000)
    return {
      numero: suite?.numero ?? '?',
      tipo: suite?.tipo ?? '—',
      minutosAberta,
      tipoPeriodo: (s.tipo_periodo ?? 'hora') as 'hora' | 'pernoite',
      formaPagamento: s.forma_pagamento,
      valorEsperado: s.valor_total,
    }
  })

  const receitaEmAberto = staysAbertas.reduce(
    (sum, s) => sum + (Number(s.valor_total) || 0),
    0
  )

  const situacaoAtual: SituacaoAtual = {
    suitesEmUso,
    totalEmUso: suitesEmUso.length,
    receitaEmAberto,
    temStaysAbertas: suitesEmUso.length > 0,
  }

  return {
    totalAtendimentos: stays.length,
    atendimentosConcluidos: concluidos.length,
    atendimentosVoidados: voidados.length,
    receitaConfirmada,
    receitaPendente,
    ticketMedio,
    distribuicaoPagamento: distPag,
    turnos,
    turnosComDivergencia,
    turnosAbertos,
    suitesTotais,
    suitesOcupadas,
    taxaOcupacao:
      suitesTotais > 0 ? Math.round((suitesOcupadas / suitesTotais) * 100) : 0,
    suitesMaisUsadas,
    movimentacoesEstoque: movsRes.data?.length ?? 0,
    itensAbaixoMinimo,
    totalEventosAudit,
    voidsPorFuncionario,
    cancelamentosExcessivos,
    situacaoAtual,
    periodStart: start,
    periodEnd: end,
  }
}

export function getPeriodDiario(referenceDate: Date): { start: Date; end: Date } {
  const start = new Date(referenceDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(referenceDate)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function getPeriodSemanal(): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - 7)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

export function getPeriodMensal(): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date(end.getFullYear(), end.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}
