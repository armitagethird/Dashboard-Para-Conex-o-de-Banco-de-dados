import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ReportTipo } from '@/types/ai-reports'

const HORARIO_BRT: Record<ReportTipo, { hour: number; minute: number }> = {
  diario: { hour: 8, minute: 0 },
  semanal: { hour: 9, minute: 0 },
  mensal: { hour: 10, minute: 0 },
}

export function getNextAutoRun(tipo: ReportTipo, now: Date = new Date()): Date {
  const { hour, minute } = HORARIO_BRT[tipo]

  if (tipo === 'diario') {
    const next = new Date(now)
    next.setHours(hour, minute, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    return next
  }

  if (tipo === 'semanal') {
    const next = new Date(now)
    const day = next.getDay()
    const diasAteSegunda = (1 - day + 7) % 7
    next.setDate(next.getDate() + diasAteSegunda)
    next.setHours(hour, minute, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 7)
    return next
  }

  const next = new Date(now.getFullYear(), now.getMonth(), 1, hour, minute, 0, 0)
  if (next <= now) {
    next.setMonth(next.getMonth() + 1)
  }
  return next
}

export function formatNextAutoRun(tipo: ReportTipo, now: Date = new Date()): string {
  const next = getNextAutoRun(tipo, now)
  const isToday = next.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const isTomorrow = next.toDateString() === tomorrow.toDateString()

  const hora = format(next, 'HH:mm')

  if (isToday) return `Hoje às ${hora}`
  if (isTomorrow) return `Amanhã às ${hora}`

  if (tipo === 'semanal') {
    return `Segunda, ${format(next, 'dd/MM')} às ${hora}`
  }
  if (tipo === 'mensal') {
    const mes = format(next, 'MMMM', { locale: ptBR })
    return `Dia 1 de ${mes} às ${hora}`
  }

  return `${format(next, 'dd/MM')} às ${hora}`
}
