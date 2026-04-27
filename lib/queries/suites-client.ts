'use client'

import { createClient } from '@/lib/supabase/client'
import type {
  AlertaPendente,
  SuiteDetalhes,
  StayHistorico,
  ConsumoItem,
} from '@/types/dashboard'

export async function getAlertasPendentesClient(): Promise<AlertaPendente[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('v_alertas_pendentes')
    .select('*')
  if (error) return []
  return (data ?? []) as AlertaPendente[]
}

interface StayRow {
  id: string
  opened_at: string
  closed_at: string | null
  type: string | null
  price: number | null
  extra_value: number | null
  pre_pernoite_value: number | null
  payment_status: string | null
  payment_method: string | null
  void_approved_by: string | null
  void_reason: string | null
  expected_checkout_at: string | null
  opened_profile: { name: string } | { name: string }[] | null
  closed_profile: { name: string } | { name: string }[] | null
}

interface MovRow {
  id: string
  quantity: number | null
  reason: string | null
  created_at: string
  inventory: { name: string } | { name: string }[] | null
}

function unwrapName(rel: { name: string } | { name: string }[] | null): string | null {
  if (!rel) return null
  return Array.isArray(rel) ? rel[0]?.name ?? null : rel.name
}

export async function getSuiteDetalhesClient(
  suiteId: string,
  currentStayId: string | null,
): Promise<SuiteDetalhes> {
  const supabase = createClient()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const startISO = startOfDay.toISOString()

  // Stays do dia (qualquer aberta ou fechada hoje nesta suíte).
  const { data: staysData } = await supabase
    .from('stays')
    .select(
      `id, opened_at, closed_at, type, price, extra_value, pre_pernoite_value,
       payment_status, payment_method, void_approved_by, void_reason, expected_checkout_at,
       opened_profile:profiles!opened_by(name),
       closed_profile:profiles!closed_by(name)`,
    )
    .eq('suite_id', suiteId)
    .gte('opened_at', startISO)
    .order('opened_at', { ascending: false })

  const staysHoje: StayHistorico[] = ((staysData ?? []) as StayRow[]).map((s) => ({
    id: s.id,
    opened_at: s.opened_at,
    closed_at: s.closed_at,
    type: s.type,
    price: s.price,
    extra_value: s.extra_value,
    pre_pernoite_value: s.pre_pernoite_value,
    payment_status: s.payment_status,
    payment_method: s.payment_method,
    void_approved_by: s.void_approved_by,
    void_reason: s.void_reason,
    expected_checkout_at: s.expected_checkout_at,
    opened_by_name: unwrapName(s.opened_profile),
    closed_by_name: unwrapName(s.closed_profile),
  }))

  // Receita confirmada hoje desta suíte (price + extra + pré-pernoite).
  const receitaHoje = staysHoje
    .filter((s) => s.payment_status === 'confirmed' && !s.void_approved_by)
    .reduce(
      (sum, s) =>
        sum +
        (Number(s.price) || 0) +
        (Number(s.extra_value) || 0) +
        (Number(s.pre_pernoite_value) || 0),
      0,
    )

  // Consumo da stay atual (frigobar/cardápio).
  let consumo: ConsumoItem[] = []
  let expectedCheckoutAt: string | null = null

  if (currentStayId) {
    const { data: movsData } = await supabase
      .from('inventory_movements')
      .select('id, quantity, reason, created_at, inventory(name)')
      .eq('stay_id', currentStayId)
      .eq('status', 'active')
      .lt('quantity', 0)
      .order('created_at', { ascending: false })

    consumo = ((movsData ?? []) as MovRow[]).map((m) => ({
      id: m.id,
      nome: unwrapName(m.inventory) ?? '—',
      quantidade: Math.abs(Number(m.quantity) || 0),
      reason: m.reason,
      created_at: m.created_at,
    }))

    expectedCheckoutAt =
      staysHoje.find((s) => s.id === currentStayId)?.expected_checkout_at ?? null
  }

  return { staysHoje, consumo, receitaHoje, expectedCheckoutAt }
}
