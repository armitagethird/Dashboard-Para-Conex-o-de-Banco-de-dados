import { createClient } from '@/lib/supabase/server'
import type { TurnoAtivo } from '@/types/dashboard'

export async function getTurnosAtivos(): Promise<TurnoAtivo[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_turnos_ativos')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data ?? []) as TurnoAtivo[]
}
