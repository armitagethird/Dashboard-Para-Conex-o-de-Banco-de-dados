'use client'

import { createClient } from '@/lib/supabase/client'
import type { AlertaPendente } from '@/types/dashboard'

export async function getAlertasPendentesClient(): Promise<AlertaPendente[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('v_alertas_pendentes')
    .select('*')
  if (error) return []
  return (data ?? []) as AlertaPendente[]
}
