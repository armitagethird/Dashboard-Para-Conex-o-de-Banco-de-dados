import { createClient } from '@/lib/supabase/server'
import type { SuiteLive, AlertaPendente } from '@/types/dashboard'

export async function getSuitesLive(): Promise<SuiteLive[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_suites_live')
    .select('*')
    .order('numero')
  if (error) throw error
  const seen = new Set<string>()
  return (data ?? []).filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  }) as SuiteLive[]
}

export async function getAlertasPendentes(): Promise<AlertaPendente[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_alertas_pendentes')
    .select('*')
  if (error) throw error
  return (data ?? []) as AlertaPendente[]
}
