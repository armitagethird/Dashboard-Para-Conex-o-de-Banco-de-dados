'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Download } from 'lucide-react'
import { AuditTable, exportarCSV } from '@/components/audit-table'
import type { AuditLogEntry } from '@/types/dashboard'

interface Stats {
  total: number
  voids: number
  logins: number
  criticos: number
}

interface AuditClientViewProps {
  entries: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
  users: Array<{ id: string; name: string }>
  stats: Stats
  currentFilters: {
    userId?: string
    operation?: string
    tableName?: string
    dateFrom?: string
    dateTo?: string
  }
}

const OPERATIONS = ['INSERT', 'UPDATE', 'VOID', 'LOGIN', 'LOGOUT', 'DELETE']
const TABLES = ['stays', 'audit_log', 'inventory', 'shifts', 'suites', 'profiles']

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col gap-1"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: accent && value > 0 ? '1px solid rgba(196,30,32,0.3)' : '1px solid var(--border-subtle)',
      }}
    >
      <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <span
        className="font-mono text-2xl font-semibold"
        style={{ color: accent && value > 0 ? 'var(--danger)' : 'var(--text-primary)' }}
      >
        {value}
      </span>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
  borderRadius: '8px',
  padding: '0 12px',
  height: '40px',
  fontSize: '13px',
  outline: 'none',
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  ...selectStyle,
  padding: '0 12px',
  height: '40px',
}

export function AuditClientView({
  entries,
  total,
  page,
  pageSize,
  users,
  stats,
  currentFilters,
}: AuditClientViewProps) {
  const router = useRouter()
  const pathname = usePathname()

  function pushParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = {
      userId:    currentFilters.userId,
      operation: currentFilters.operation,
      table:     currentFilters.tableName,
      from:      currentFilters.dateFrom,
      to:        currentFilters.dateTo,
      ...updates,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams()
    if (currentFilters.userId)    params.set('userId',    currentFilters.userId)
    if (currentFilters.operation) params.set('operation', currentFilters.operation)
    if (currentFilters.tableName) params.set('table',     currentFilters.tableName)
    if (currentFilters.dateFrom)  params.set('from',      currentFilters.dateFrom)
    if (currentFilters.dateTo)    params.set('to',        currentFilters.dateTo)
    if (newPage > 0) params.set('page', String(newPage))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          style={selectStyle}
          value={currentFilters.userId ?? ''}
          onChange={(e) => pushParams({ userId: e.target.value || undefined })}
        >
          <option value="">Todos os funcionários</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select
          style={selectStyle}
          value={currentFilters.operation ?? ''}
          onChange={(e) => pushParams({ operation: e.target.value || undefined })}
        >
          <option value="">Todas as operações</option>
          {OPERATIONS.map((op) => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>

        <select
          style={selectStyle}
          value={currentFilters.tableName ?? ''}
          onChange={(e) => pushParams({ table: e.target.value || undefined })}
        >
          <option value="">Todas as tabelas</option>
          {TABLES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <input
          type="date"
          style={inputStyle}
          value={currentFilters.dateFrom ? currentFilters.dateFrom.slice(0, 10) : ''}
          onChange={(e) => pushParams({ from: e.target.value ? e.target.value + 'T00:00:00Z' : undefined })}
          placeholder="Data início"
        />

        <input
          type="date"
          style={inputStyle}
          value={currentFilters.dateTo ? currentFilters.dateTo.slice(0, 10) : ''}
          onChange={(e) => pushParams({ to: e.target.value ? e.target.value + 'T23:59:59Z' : undefined })}
          placeholder="Data fim"
        />

        <button
          className="flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-medium transition-colors ml-auto"
          style={{
            backgroundColor: 'rgba(196,30,32,0.12)',
            border: '1px solid rgba(196,30,32,0.3)',
            color: 'var(--red-300)',
          }}
          onClick={() => exportarCSV(entries)}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(196,30,32,0.2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(196,30,32,0.12)' }}
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total no período" value={stats.total} />
        <StatCard label="Voids" value={stats.voids} accent />
        <StatCard label="Logins" value={stats.logins} />
        <StatCard label="Críticos" value={stats.criticos} accent />
      </div>

      {/* Tabela */}
      <AuditTable
        entries={entries}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
