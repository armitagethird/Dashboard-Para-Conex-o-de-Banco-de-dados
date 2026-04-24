'use client'

import { createClient } from '@/lib/supabase/client'
import type { AiReport, ReportTipo } from '@/types/ai-reports'

export async function getReportHistory(
  tipo: ReportTipo,
  limit = 30
): Promise<AiReport[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('tipo', tipo)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []) as AiReport[]
}
