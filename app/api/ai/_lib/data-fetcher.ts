import { createClient } from '@supabase/supabase-js'
import type {
  ReportData,
  TurnoData,
  SuiteUsada,
  ItemEstoque,
  FuncionarioContagem,
  ItemVendido,
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
  closed_at: string | null
  void_approved_by: string | null
  payment_status: string
  price: number | null
  payment_method: string | null
  suite_id: string
  suites: { number: number; type: string }[] | null
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
  type: string | null
  payment_method: string | null
  price: number | null
  suites: { number: number; type: string }[] | null
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
          'id, closed_at, void_approved_by, payment_status, price, payment_method, suite_id, suites(number, type)'
        )
        .gte('opened_at', start)
        .lte('opened_at', end),
      sb.from('v_suites_live').select('id, status'),
      sb
        .from('shifts')
        .select(
          'id, started_at, ended_at, expected_cash, reported_cash, difference, status, profiles(name)'
        )
        .gte('started_at', start)
        .lte('started_at', end),
      sb
        .from('inventory_movements')
        .select('id, inventory_id, quantidade, tipo, inventory(name)')
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
  // Na nova schema a tabela stays não tem coluna "status".
  // Derivamos o estado a partir de closed_at + void_approved_by:
  //   voided    = void_approved_by IS NOT NULL
  //   concluído = closed_at IS NOT NULL AND void_approved_by IS NULL
  //   aberto    = closed_at IS NULL     AND void_approved_by IS NULL
  const stays = (staysRes.data ?? []) as StayRow[]
  const voidados = stays.filter((s) => s.void_approved_by != null)
  const concluidos = stays.filter((s) => s.closed_at != null && s.void_approved_by == null)
  const confirmados = concluidos.filter((s) => s.payment_status === 'confirmed')

  const receitaConfirmada = confirmados.reduce(
    (sum, s) => sum + (Number(s.price) || 0),
    0
  )
  const receitaPendente = stays
    .filter((s) => s.payment_status === 'pending')
    .reduce((sum, s) => sum + (Number(s.price) || 0), 0)

  const distPag: Record<string, number> = {}
  for (const s of concluidos) {
    const fp = s.payment_method ?? 'pendente'
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
        numero: suite?.number != null ? String(suite.number) : id,
        tipo: suite?.type ?? '—',
        atendimentos: 0,
      }
    }
    suiteMap[id]!.atendimentos++
  }
  const suitesMaisUsadas: SuiteUsada[] = Object.values(suiteMap)
    .sort((a, b) => b.atendimentos - a.atendimentos)
    .slice(0, 3)

  // ── Suítes totais e ocupação atual ─────────────────────────────────────────
  // Lemos da view v_suites_live (status em inglês: free/occupied/cleaning/maintenance)
  const suitesAll = (suitesRes.data ?? []) as SuiteRow[]
  // Dedupe (a view pode retornar duplicatas se houver stays fantasmas)
  const suitesUniqueIds = new Set(suitesAll.map((s) => s.id))
  const suitesTotais = suitesUniqueIds.size
  const suitesOcupadas = new Set(
    suitesAll.filter((s) => s.status === 'occupied').map((s) => s.id)
  ).size

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

  // ── Itens mais vendidos (frigobar/cardápio) ────────────────────────────────
  interface MovRow {
    id: string
    inventory_id: string | null
    quantidade?: number | null
    tipo?: string | null
    inventory?: { name: string }[] | { name: string } | null
  }
  const movsRaw = (movsRes.data ?? []) as unknown as MovRow[]
  const vendasMap: Record<string, number> = {}
  for (const m of movsRaw) {
    if (m.tipo && m.tipo !== 'saida' && m.tipo !== 'venda') continue
    const inv = Array.isArray(m.inventory) ? m.inventory[0] : m.inventory
    const nome = inv?.name
    if (!nome) continue
    const qtd = typeof m.quantidade === 'number' ? m.quantidade : 1
    vendasMap[nome] = (vendasMap[nome] ?? 0) + qtd
  }
  const itensMaisVendidos: ItemVendido[] = Object.entries(vendasMap)
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5)

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
  // "aberta" = closed_at IS NULL AND void_approved_by IS NULL
  const { data: staysAbertasRaw } = await sb
    .from('stays')
    .select('id, opened_at, type, payment_method, price, suites(number, type)')
    .is('closed_at', null)
    .is('void_approved_by', null)
    .order('opened_at', { ascending: true })

  const agora = Date.now()
  const staysAbertas = (staysAbertasRaw ?? []) as OpenStayRow[]

  const suitesEmUso: SuiteEmUso[] = staysAbertas.map((s) => {
    const suite = s.suites?.[0]
    const minutosAberta = Math.floor((agora - new Date(s.opened_at).getTime()) / 60000)
    // stays.type guarda o período (3h, 6h, 12h, pernoite). Normalizamos:
    const tipoPeriodo: 'hora' | 'pernoite' =
      s.type === 'pernoite' ? 'pernoite' : 'hora'
    return {
      numero: suite?.number != null ? String(suite.number) : '?',
      tipo: suite?.type ?? '—',
      minutosAberta,
      tipoPeriodo,
      formaPagamento: s.payment_method,
      valorEsperado: s.price,
    }
  })

  const receitaEmAberto = staysAbertas.reduce(
    (sum, s) => sum + (Number(s.price) || 0),
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
    itensMaisVendidos,
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
