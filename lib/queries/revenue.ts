import { createClient } from '@/lib/supabase/server'
import type { ReceitaItem } from '@/types/dashboard'

export async function getReceitaHoje(): Promise<ReceitaItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_receita_hoje')
    .select('*')
  if (error) throw error
  return (data ?? []) as ReceitaItem[]
}

export interface ReceitaHoraEntry {
  hora: string
  receita: number
}

export async function getReceitaPorHora(): Promise<ReceitaHoraEntry[]> {
  const supabase = await createClient()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('stays')
    .select('closed_at, price, payment_status')
    .eq('payment_status', 'confirmed')
    .gte('closed_at', startOfDay.toISOString())
    .order('closed_at')
  if (error) return []

  const map: Record<string, number> = {}
  for (let h = 0; h < 24; h++) {
    map[String(h).padStart(2, '0') + ':00'] = 0
  }

  for (const row of data ?? []) {
    if (!row.closed_at || row.price == null) continue
    const hora = new Date(row.closed_at).getHours()
    const key = String(hora).padStart(2, '0') + ':00'
    map[key] = (map[key] ?? 0) + Number(row.price)
  }

  return Object.entries(map).map(([hora, receita]) => ({ hora, receita }))
}
