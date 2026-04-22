import { getAuditLog, getAuditUsers } from '@/lib/queries/audit'
import { AuditClientView } from './audit-client-view'

interface AuditContentProps {
  searchParams: Record<string, string | string[] | undefined>
}

function sp(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = params[key]
  if (Array.isArray(v)) return v[0]
  return v
}

export async function AuditContent({ searchParams }: AuditContentProps) {
  const page = Math.max(0, parseInt(sp(searchParams, 'page') ?? '0', 10))
  const pageSize = 50

  const filters = {
    userId:    sp(searchParams, 'userId'),
    operation: sp(searchParams, 'operation'),
    tableName: sp(searchParams, 'table'),
    dateFrom:  sp(searchParams, 'from'),
    dateTo:    sp(searchParams, 'to'),
    page,
    pageSize,
  }

  const [{ entries, count }, users] = await Promise.all([
    getAuditLog(filters),
    getAuditUsers(),
  ])

  const voids    = entries.filter((e) => e.operation === 'VOID').length
  const logins   = entries.filter((e) => e.operation === 'LOGIN').length
  const criticos = entries.filter((e) => ['VOID', 'DELETE'].includes(e.operation)).length

  return (
    <AuditClientView
      entries={entries}
      total={count}
      page={page}
      pageSize={pageSize}
      users={users}
      stats={{ total: count, voids, logins, criticos }}
      currentFilters={filters}
    />
  )
}
