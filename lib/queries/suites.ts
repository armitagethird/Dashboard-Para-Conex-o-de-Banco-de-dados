import { createClient } from '@/lib/supabase/server'
import type { SuiteLive, AlertaPendente } from '@/types/dashboard'

export async function getSuitesLive(): Promise<SuiteLive[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_suites_live')
    .select('*')
    .order('numero')
  if (error) throw error

  // Dedupe por suite.id mantendo sempre a stay mais recente (maior opened_at).
  const byId = new Map<string, SuiteLive>()
  for (const row of (data ?? []) as SuiteLive[]) {
    const existing = byId.get(row.id)
    if (!existing) {
      byId.set(row.id, row)
      continue
    }
    const existingTime = existing.opened_at ? new Date(existing.opened_at).getTime() : 0
    const rowTime = row.opened_at ? new Date(row.opened_at).getTime() : 0
    if (rowTime > existingTime) byId.set(row.id, row)
  }
  return Array.from(byId.values()).sort((a, b) => a.numero - b.numero)
}

export async function getAlertasPendentes(): Promise<AlertaPendente[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_alertas_pendentes')
    .select('*')
  if (error) throw error
  return (data ?? []) as AlertaPendente[]
}
