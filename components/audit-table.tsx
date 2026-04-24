'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus,
  Pencil,
  Ban,
  LogIn,
  LogOut,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getInitials, getAvatarColor, formatRelative } from '@/lib/utils'
import type { AuditLogEntry } from '@/types/dashboard'

interface AuditTableProps {
  entries: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}

const OPERATION_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  INSERT: { icon: Plus,    color: 'var(--success)' },
  UPDATE: { icon: Pencil,  color: 'var(--warning)' },
  VOID:   { icon: Ban,     color: 'var(--danger)'  },
  LOGIN:  { icon: LogIn,   color: 'var(--info)'    },
  LOGOUT: { icon: LogOut,  color: 'var(--text-tertiary)' },
  DELETE: { icon: Trash2,  color: 'var(--danger)'  },
}

const TABLE_BADGE: Record<string, { bg: string; color: string }> = {
  stays:     { bg: 'rgba(240,230,208,0.08)', color: 'var(--text-primary)' },
  audit_log: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' },
  inventory: { bg: 'rgba(245,158,11,0.1)',   color: 'var(--warning)' },
  shifts:    { bg: 'rgba(59,130,246,0.1)',   color: 'var(--info)' },
}

function tableBadgeStyle(table: string) {
  return TABLE_BADGE[table] ?? { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)' }
}

export function exportarCSV(entries: AuditLogEntry[]) {
  const headers = ['Data/Hora', 'Funcionário', 'Operação', 'Tabela', 'ID Registro']
  const rows = entries.map((e) => [
    format(new Date(e.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
    e.profiles?.name ?? 'Sistema',
    e.operation,
    e.table_name,
    e.record_id ?? '',
  ])
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `audit-log-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

interface DetailSheetProps {
  entry: AuditLogEntry | null
  open: boolean
  onClose: () => void
}

function DetailSheet({ entry, open, onClose }: DetailSheetProps) {
  if (!entry) return null
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        <SheetHeader>
          <SheetTitle style={{ color: 'var(--text-primary)' }}>
            Detalhes da operação
          </SheetTitle>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {entry.operation} · {entry.table_name} ·{' '}
            {format(new Date(entry.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {entry.old_data && (
            <div>
              <p
                className="text-xs font-medium uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Antes
              </p>
              <pre
                className="rounded-lg p-3 text-xs overflow-auto max-h-64"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {JSON.stringify(entry.old_data, null, 2)}
              </pre>
            </div>
          )}
          {entry.new_data && (
            <div>
              <p
                className="text-xs font-medium uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Depois
              </p>
              <pre
                className="rounded-lg p-3 text-xs overflow-auto max-h-64"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {JSON.stringify(entry.new_data, null, 2)}
              </pre>
            </div>
          )}
          {entry.metadata && (
            <div>
              <p
                className="text-xs font-medium uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Metadata
              </p>
              <pre
                className="rounded-lg p-3 text-xs overflow-auto max-h-48"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function AuditTable({ entries, total, page, pageSize, onPageChange }: AuditTableProps) {
  const [detail, setDetail] = useState<AuditLogEntry | null>(null)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <TooltipProvider>
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-overlay)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                {['Data/Hora', 'Funcionário', 'Operação', 'Tabela', 'Detalhes', 'Ações'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                const opCfg = OPERATION_CONFIG[entry.operation] ?? OPERATION_CONFIG['UPDATE']!
                const OpIcon = opCfg.icon
                const isVoid = entry.operation === 'VOID'
                const badge = tableBadgeStyle(entry.table_name)
                const summary = entry.new_data
                  ? JSON.stringify(entry.new_data).slice(0, 60)
                  : entry.old_data
                    ? JSON.stringify(entry.old_data).slice(0, 60)
                    : '—'

                return (
                  <tr
                    key={entry.id}
                    className="audit-row"
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isVoid ? 'rgba(196,30,32,0.06)' : undefined,
                      borderLeft: isVoid ? '3px solid #C41E20' : undefined,
                      ['--audit-row-index' as string]: idx,
                    }}
                  >
                    {/* Data/Hora */}
                    <td className="px-4 py-3">
                      <Tooltip>
                        <TooltipTrigger>
                          <span
                            className="font-mono text-xs cursor-default"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {formatRelative(entry.created_at)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          style={{
                            backgroundColor: 'var(--bg-overlay)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TooltipContent>
                      </Tooltip>
                    </td>

                    {/* Funcionário */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {entry.profiles?.name ? (
                          <>
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: getAvatarColor(entry.profiles.name) }}
                            >
                              {getInitials(entry.profiles.name)}
                            </div>
                            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                              {entry.profiles.name}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            Sistema
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Operação */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <OpIcon
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: opCfg.color }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: opCfg.color }}
                        >
                          {entry.operation}
                        </span>
                      </div>
                    </td>

                    {/* Tabela */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {entry.table_name}
                      </span>
                    </td>

                    {/* Detalhes */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <span
                        className="font-mono text-xs truncate block"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {summary}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      <button
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
                        style={{
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                        onClick={() => setDetail(entry)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
                      >
                        <Eye className="w-3 h-3" />
                        Ver mais
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {entries.length === 0 && (
          <div
            className="py-10 text-center text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Nenhum registro encontrado.
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {total} registros · página {page + 1} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="p-1.5 rounded transition-colors disabled:opacity-40"
                style={{ color: 'var(--text-secondary)' }}
                disabled={page === 0}
                onClick={() => onPageChange(page - 1)}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 rounded transition-colors disabled:opacity-40"
                style={{ color: 'var(--text-secondary)' }}
                disabled={page >= totalPages - 1}
                onClick={() => onPageChange(page + 1)}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <DetailSheet
        entry={detail}
        open={detail !== null}
        onClose={() => setDetail(null)}
      />
    </TooltipProvider>
  )
}
