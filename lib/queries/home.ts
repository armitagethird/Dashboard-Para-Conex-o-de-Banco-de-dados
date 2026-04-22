import { createClient } from '@/lib/supabase/server'
import type { AlertaPendente } from '@/types/dashboard'

export interface HomeData {
  suiteCounts: { free: number; occupied: number; cleaning: number; maintenance: number }
  receitaHoje: number
  turnosAbertos: number
  alertas: AlertaPendente[]
  auditRecente: {
    id: string
    operation: string
    table_name: string
    created_at: string
    profiles: { name: string } | { name: string }[] | null
  }[]
}

export async function getHomeData(): Promise<HomeData> {
  const supabase = await createClient()

  const [suitesRes, alertasRes, turnosRes, auditRes, receitaRes] = await Promise.all([
    supabase.from('v_suites_live').select('status'),
    supabase.from('v_alertas_pendentes').select('*'),
    supabase.from('v_turnos_ativos').select('id'),
    supabase
      .from('audit_log')
      .select('id, operation, table_name, created_at, profiles(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('stays')
      .select('valor_total')
      .eq('payment_status', 'confirmed')
      .gte('opened_at', new Date().toISOString().split('T')[0] ?? ''),
  ])

  const suites = suitesRes.data ?? []
  return {
    suiteCounts: {
      free:        suites.filter((s) => s.status === 'free').length,
      occupied:    suites.filter((s) => s.status === 'occupied').length,
      cleaning:    suites.filter((s) => s.status === 'cleaning').length,
      maintenance: suites.filter((s) => s.status === 'maintenance').length,
    },
    receitaHoje: (receitaRes.data ?? []).reduce((sum, r) => sum + (r.valor_total ?? 0), 0),
    turnosAbertos: turnosRes.data?.length ?? 0,
    alertas: (alertasRes.data ?? []) as AlertaPendente[],
    auditRecente: (auditRes.data ?? []) as HomeData['auditRecente'],
  }
}
