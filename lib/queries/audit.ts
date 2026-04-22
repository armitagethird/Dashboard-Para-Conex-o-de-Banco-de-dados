import { createClient } from '@/lib/supabase/server'
import type { AuditLogEntry } from '@/types/dashboard'

export interface AuditFilters {
  userId?: string
  operation?: string
  tableName?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface AuditLogResult {
  entries: AuditLogEntry[]
  count: number
}

export async function getAuditLog({
  userId,
  operation,
  tableName,
  dateFrom,
  dateTo,
  page = 0,
  pageSize = 50,
}: AuditFilters): Promise<AuditLogResult> {
  const supabase = await createClient()
  let query = supabase
    .from('audit_log')
    .select('*, profiles(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (userId) query = query.eq('user_id', userId)
  if (operation) query = query.eq('operation', operation)
  if (tableName) query = query.eq('table_name', tableName)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo)

  const { data, error, count } = await query

  if (error) throw new Error(error.message)
  return { entries: (data ?? []) as AuditLogEntry[], count: count ?? 0 }
}

export async function getAuditUsers(): Promise<Array<{ id: string; name: string }>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('active', true)
    .order('name')
  return (data ?? []) as Array<{ id: string; name: string }>
}
