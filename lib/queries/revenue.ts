import { createClient } from '@/lib/supabase/server'
import type { ReceitaItem } from '@/types/dashboard'

// Lê stays diretamente para garantir que extra_value (cobrado pelo kiosk em
// overtime de pernoite e horas extras de estadia) seja somado ao price.
// A view v_receita_hoje pode existir no Supabase, mas não é confiável
// enquanto o SQL dela não for atualizado.
export async function getReceitaHoje(): Promise<ReceitaItem[]> {
  const supabase = await createClient()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('stays')
    .select('payment_method, price, extra_value, payment_status, void_approved_by, closed_at')
    .eq('payment_status', 'confirmed')
    .is('void_approved_by', null)
    .gte('closed_at', startOfDay.toISOString())
  if (error) throw error

  const map: Record<string, ReceitaItem> = {}
  for (const row of data ?? []) {
    const method = (row.payment_method ?? 'unknown') as string
    const valor = (Number(row.price) || 0) + (Number(row.extra_value) || 0)
    const bucket = map[method] ?? { payment_method: method, quantidade: 0, total: 0 }
    bucket.quantidade += 1
    bucket.total += valor
    map[method] = bucket
  }
  return Object.values(map).sort((a, b) => b.total - a.total)
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
    .select('closed_at, price, extra_value, payment_status')
    .eq('payment_status', 'confirmed')
    .gte('closed_at', startOfDay.toISOString())
    .order('closed_at')
  if (error) return []

  const map: Record<string, number> = {}
  for (let h = 0; h < 24; h++) {
    map[String(h).padStart(2, '0') + ':00'] = 0
  }

  for (const row of data ?? []) {
    if (!row.closed_at) continue
    const valor = (Number(row.price) || 0) + (Number(row.extra_value) || 0)
    if (valor === 0) continue
    const hora = new Date(row.closed_at).getHours()
    const key = String(hora).padStart(2, '0') + ':00'
    map[key] = (map[key] ?? 0) + valor
  }

  return Object.entries(map).map(([hora, receita]) => ({ hora, receita }))
}
