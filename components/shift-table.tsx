'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatBRL, getInitials, getAvatarColor } from '@/lib/utils'
import type { TurnoAtivo } from '@/types/dashboard'

interface ShiftTableProps {
  turnos: TurnoAtivo[]
}

const ROLE_LABEL: Record<string, string> = {
  receptionist: 'Recepcionista',
  manager:      'Gerente',
  owner:        'Dono',
}

function formatDt(dt: string) {
  return format(new Date(dt), 'dd/MM HH:mm', { locale: ptBR })
}

export function ShiftTable({ turnos }: ShiftTableProps) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--bg-overlay)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {['Funcionário', 'Início', 'Atend.', 'Receita do Turno', 'Role'].map((h) => (
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
            {turnos.map((t) => (
              <tr
                key={t.id}
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                {/* Funcionário */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: getAvatarColor(t.funcionario) }}
                    >
                      {getInitials(t.funcionario)}
                    </div>
                    <span style={{ color: 'var(--text-primary)' }}>{t.funcionario}</span>
                  </div>
                </td>
                {/* Início */}
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {formatDt(t.started_at)}
                </td>
                {/* Atendimentos */}
                <td className="px-4 py-3 font-mono text-xs text-center" style={{ color: 'var(--text-primary)' }}>
                  {t.stays_no_turno}
                </td>
                {/* Receita */}
                <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatBRL(t.caixa_parcial)}
                </td>
                {/* Role */}
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-widest"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {ROLE_LABEL[t.role] ?? t.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {turnos.length === 0 && (
        <div className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Nenhum turno encontrado.
        </div>
      )}
    </div>
  )
}
