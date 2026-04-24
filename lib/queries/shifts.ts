import { createClient } from '@/lib/supabase/server'
import type { TurnoAtivo } from '@/types/dashboard'

export async function getTurnosAtivos(): Promise<TurnoAtivo[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_turnos_ativos')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(60)
  if (error) throw error

  const seen = new Set<string>()
  return (data ?? []).filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  }) as TurnoAtivo[]
}
